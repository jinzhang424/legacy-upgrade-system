from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional, TypedDict

from mcp import StdioServerParameters
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset

from .data import RESOLVED_REPO_PATH

COMMAND_TIMEOUT_SECONDS = 300
NPX_COMMAND = "npx.cmd" if sys.platform == "win32" else "npx"
MAX_FALLBACK_MATCHES = 100
FALLBACK_SKIP_DIRS = {
    ".git",
    ".gitnexus",
    ".venv",
    "venv",
    "node_modules",
    "bin",
    "obj",
    "target",
    "dist",
    "build",
}
FALLBACK_MAX_FILE_BYTES = 2 * 1024 * 1024


def _normalize_repo_relative_path(path: Path) -> str:
    return path.relative_to(RESOLVED_REPO_PATH).as_posix()


def _resolve_repo_file_path(file_path: str) -> tuple[Optional[Path], Optional[str]]:
    candidate = (file_path or "").strip().strip("\"'")
    if not candidate:
        return None, "file_path is required."

    raw = Path(candidate)
    resolved = raw.resolve(strict=False) if raw.is_absolute() else (RESOLVED_REPO_PATH / raw).resolve(strict=False)

    try:
        relative = resolved.relative_to(RESOLVED_REPO_PATH)
    except ValueError:
        return None, "file_path must be inside PATH_TO_REPO."

    if ".git" in relative.parts:
        return None, "Access to .git paths is not allowed."

    return resolved, None

class NpxResult(TypedDict, total=False):
    ok: bool
    exit_code: int
    stdout: str
    stderr: str
    error: str
    project_folder: str

# Runs an NPX command
def _run_npx(args: list[str], cwd: Path) -> NpxResult:
    """Run an npx command and return a normalised result dict."""
    try:
        completed = subprocess.run(
            [NPX_COMMAND, *args],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=COMMAND_TIMEOUT_SECONDS,
            check=False,
            shell=sys.platform == "win32",
        )
        return NpxResult(
            ok=completed.returncode == 0,
            exit_code=completed.returncode,
            stdout=completed.stdout,
            stderr=completed.stderr,
        )
    except FileNotFoundError:
        return NpxResult(ok=False, error=f"{NPX_COMMAND} was not found on PATH.")
    except subprocess.TimeoutExpired as exc:
        return NpxResult(
            ok=False,
            error=f"Command timed out after {COMMAND_TIMEOUT_SECONDS}s.",
            stdout=exc.stdout or "",
            stderr=exc.stderr or "",
        )

# Analyzes the repository with gitnexus
def gitnexus_analyze_repository(
    force: bool = False,
    embeddings: bool = False,
) -> str:
    """Build or refresh GitNexus index for PATH_TO_REPO."""
    resolved_folder = RESOLVED_REPO_PATH

    if not resolved_folder.exists() or not resolved_folder.is_dir():
        return json.dumps(NpxResult(
            ok=False,
            project_folder=str(resolved_folder),
            error="PATH_TO_REPO does not exist or is not a directory.",
        ), ensure_ascii=False)

    args = ["gitnexus", "analyze"]
    if force:
        args.append("--force")
    if embeddings:
        args.append("--embeddings")
    args.append(str(resolved_folder))

    result = _run_npx(args, cwd=resolved_folder)
    return json.dumps(
        NpxResult(project_folder=str(resolved_folder), **result),
        ensure_ascii=False,
    )


# Lets agent connect to the gitnexus MCP and exposes specific tools
gitnexus_analysis_mcp_toolset = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            command=NPX_COMMAND,
            args=["-y", "gitnexus", "mcp"],
        ),
        timeout=30.0,
    ),
    tool_filter=[
        "query", "context", "impact", "cypher",
    ],
    tool_name_prefix="gitnexus",
    use_mcp_resources=True,
)

def _parse_cypher_row(line: str) -> Optional[dict]:
    """
    Parse a single row from a GitNexus cypher response.
    GitNexus emits rows as either JSON objects or pipe-separated values.
    Returns None if the line cannot be parsed.
    """
    line = line.strip()
    if not line or line.startswith("#"):
        return None
    try:
        return json.loads(line)
    except json.JSONDecodeError:
        pass
    # Fallback: pipe-separated
    parts = [p.strip() for p in line.split("|")]
    if len(parts) >= 2:
        return dict(enumerate(parts))  # numeric keys as fallback
    return None


def _fallback_search_usages(query: str, repo_root: Path) -> list[dict]:
    """Fallback literal search when GitNexus query does not return parseable rows."""
    results: list[dict] = []
    needle = query.strip()
    if not needle:
        return results

    variants = {needle}
    trimmed = needle.rstrip(";")
    if trimmed:
        variants.add(trimmed)

    for file_path in repo_root.rglob("*"):
        if len(results) >= MAX_FALLBACK_MATCHES:
            break
        if not file_path.is_file():
            continue
        if any(part in FALLBACK_SKIP_DIRS for part in file_path.parts):
            continue
        try:
            if file_path.stat().st_size > FALLBACK_MAX_FILE_BYTES:
                continue
            text = file_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if not text:
            continue

        lines = text.splitlines()
        for idx, line in enumerate(lines, start=1):
            if any(v in line for v in variants):
                rel = file_path.relative_to(repo_root).as_posix()
                start = max(1, idx - 1)
                end = min(len(lines), idx + 1)
                snippet = "\n".join(lines[start - 1:end])[:500]
                results.append({
                    "file_path": rel,
                    "line_start": idx,
                    "line_end": idx,
                    "usage_type": "direct_usage",
                    "snippet": snippet,
                })
                if len(results) >= MAX_FALLBACK_MATCHES:
                    break
    return results

def gitnexus_get_dependency_graph() -> dict:
    """Return the full internal/external dependency graph for a repository.
 
    Issues a Cypher query against the GitNexus knowledge graph to retrieve
    all IMPORTS, CALLS, and DEPENDS_ON edges, then structures them into the
    nodes/edges schema expected by the analysis agent.
 
    Returns:
        {
            "nodes": [{"id": str, "version": str, "type": "internal"|"external"}],
            "edges": [{"from": str, "to": str, "relationship": str}],
        }
    """
 
    cypher = (
        "MATCH (a)-[r:IMPORTS|CALLS|DEPENDS_ON]->(b) "
        "RETURN a.name AS from_node, a.file AS from_file, "
        "type(r) AS rel, b.name AS to_node, b.file AS to_file, "
        "b.external AS is_external, b.version AS version "
        "LIMIT 1000"
    )
    resolved_repo = RESOLVED_REPO_PATH
    if not resolved_repo.exists() or not resolved_repo.is_dir():
        return {"error": "PATH_TO_REPO does not exist or is not a directory."}

    result = _run_npx(
        ["gitnexus", "cypher", "--repo", str(resolved_repo), cypher],
        cwd=resolved_repo,
    )
    if not result.get("ok"):
        return {"error": result.get("stderr")}

    raw = result.get("stdout", "")
 
    nodes: dict[str, dict] = {}
    edges: list[dict] = []
 
    for line in raw.splitlines():
        row = _parse_cypher_row(line)
        if row is None:
            continue
 
        from_id = str(row.get("from_node") or row.get("from_file") or "")
        to_id = str(row.get("to_node") or row.get("to_file") or "")
        if not from_id or not to_id:
            continue
 
        is_ext = bool(row.get("is_external"))
        rel = str(row.get("rel") or "DEPENDS_ON")
        version = str(row.get("version") or "")
 
        nodes.setdefault(from_id, {"id": from_id, "version": "", "type": "internal"})
        nodes.setdefault(to_id, {
            "id": to_id,
            "version": version,
            "type": "external" if is_ext else "internal",
        })
        edges.append({"from": from_id, "to": to_id, "relationship": rel})
 
    return {"nodes": list(nodes.values()), "edges": edges}

def gitnexus_search_usages(
    query: str = "",
    usage_types: Optional[list[str]] = None,
) -> dict:
    """Search all files in a repository for usages of a given symbol or pattern.
 
    Delegates to the GitNexus `query` MCP tool, which performs a hybrid
    semantic + graph search across all indexed files. Results are parsed from
    the tool's text output and optionally filtered by usage type.
 
    Args:
        query: Symbol name, class name, import path, or natural-language query.
        usage_types: Optional filter on returned usage type — one or more of
            'direct_usage', 'transitive_dependency', 'configuration'.
 
    Returns:
        {
            "results": [
                {
                    "file_path": str,
                    "line_start": int,
                    "line_end": int,
                    "usage_type": "direct_usage"|"transitive_dependency"|"configuration",
                    "snippet": str,   # up to 500 chars
                },
                ...
            ]
        }
    """
    if not query.strip():
        return {"error": "query is required.", "results": []}

    resolved_repo = RESOLVED_REPO_PATH
    if not resolved_repo.exists() or not resolved_repo.is_dir():
        return {"error": "PATH_TO_REPO does not exist or is not a directory.", "results": []}

    search_result = _run_npx(
        ["gitnexus", "query", "--repo", str(resolved_repo), query],
        cwd=resolved_repo,
    )
    if not search_result.get("ok"):
        return {
            "error": search_result.get("stderr") or search_result.get("error") or "gitnexus query failed",
            "results": [],
        }

    raw = search_result.get("stdout", "")
 
    results: list[dict] = []
    current: dict = {}
 
    def _flush() -> None:
        if current:
            results.append(dict(current))
            current.clear()
 
    for line in raw.splitlines():
        stripped = line.strip()
 
        if not stripped:
            _flush()
            continue
 
        # GitNexus query output format examples:
        #   File: src/auth/LoginService.java (lines 45-52)
        #   Type: direct_usage
        #   <snippet lines...>
        if stripped.lower().startswith("file:"):
            _flush()
            file_part = stripped[5:].strip()   # everything after "File:"
            file_path = file_part.split("(")[0].strip()
            line_start = line_end = 0
            m = re.search(r"lines?\s+(\d+)[-–](\d+)", file_part, re.IGNORECASE)
            if m:
                line_start, line_end = int(m.group(1)), int(m.group(2))
            current.update({
                "file_path": file_path,
                "line_start": line_start,
                "line_end": line_end,
                "usage_type": "direct_usage",
                "snippet": "",
            })
        elif stripped.lower().startswith("type:") and current:
            raw_type = stripped[5:].strip().lower().replace(" ", "_")
            # Normalise to one of the three canonical values
            if "config" in raw_type:
                current["usage_type"] = "configuration"
            elif "transitive" in raw_type or "indirect" in raw_type:
                current["usage_type"] = "transitive_dependency"
            else:
                current["usage_type"] = "direct_usage"
        elif current:
            existing = current.get("snippet", "")
            combined = (existing + "\n" + line).strip()
            current["snippet"] = combined[:500]
 
    _flush()

    if not results:
        results = _fallback_search_usages(query, resolved_repo)
 
    if usage_types:
        results = [r for r in results if r.get("usage_type") in usage_types]
 
    return {"results": results}


def gitnexus_read_file(
    file_path: str,
    start_line: int = 1,
    end_line: int = 0,
) -> dict:
    """Read file content from PATH_TO_REPO with optional 1-based line slicing."""
    resolved, path_error = _resolve_repo_file_path(file_path)
    if path_error:
        return {"ok": False, "error": path_error}

    assert resolved is not None
    if not resolved.exists() or not resolved.is_file():
        return {"ok": False, "error": "File does not exist.", "file_path": file_path}

    if start_line < 1:
        return {"ok": False, "error": "start_line must be >= 1.", "file_path": file_path}
    if end_line < 0:
        return {"ok": False, "error": "end_line must be >= 0.", "file_path": file_path}
    if end_line and end_line < start_line:
        return {"ok": False, "error": "end_line must be >= start_line.", "file_path": file_path}

    text = resolved.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    total_lines = len(lines)

    if total_lines == 0:
        return {
            "ok": True,
            "file_path": _normalize_repo_relative_path(resolved),
            "absolute_path": str(resolved),
            "content": "",
            "start_line": 1,
            "end_line": 0,
            "total_lines": 0,
        }

    effective_end = total_lines if end_line == 0 or end_line > total_lines else end_line
    if start_line > total_lines:
        return {
            "ok": False,
            "error": "start_line is beyond end of file.",
            "file_path": _normalize_repo_relative_path(resolved),
            "total_lines": total_lines,
        }

    content = "\n".join(lines[start_line - 1:effective_end])
    return {
        "ok": True,
        "file_path": _normalize_repo_relative_path(resolved),
        "absolute_path": str(resolved),
        "content": content,
        "start_line": start_line,
        "end_line": effective_end,
        "total_lines": total_lines,
    }


def gitnexus_write_file(
    file_path: str,
    content: str,
    create_dirs: bool = True,
) -> dict:
    """Write text content to a file inside PATH_TO_REPO."""
    resolved, path_error = _resolve_repo_file_path(file_path)
    if path_error:
        return {"ok": False, "error": path_error}

    assert resolved is not None
    parent = resolved.parent
    if not parent.exists():
        if not create_dirs:
            return {"ok": False, "error": "Parent directory does not exist.", "file_path": file_path}
        parent.mkdir(parents=True, exist_ok=True)

    if resolved.exists() and resolved.is_dir():
        return {"ok": False, "error": "Target path is a directory.", "file_path": file_path}

    text = content if isinstance(content, str) else str(content)
    resolved.write_text(text, encoding="utf-8")

    return {
        "ok": True,
        "file_path": _normalize_repo_relative_path(resolved),
        "absolute_path": str(resolved),
        "bytes_written": len(text.encode("utf-8")),
        "line_count": len(text.splitlines()),
    }