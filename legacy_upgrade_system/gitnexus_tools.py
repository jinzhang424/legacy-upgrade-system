from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import TypedDict

from mcp import StdioServerParameters
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
COMMAND_TIMEOUT_SECONDS = 300
MAX_OUTPUT_CHARS = 12000
NPX_COMMAND = "npx.cmd" if sys.platform == "win32" else "npx"


class NpxResult(TypedDict, total=False):
    ok: bool
    exit_code: int
    stdout: str
    stderr: str
    error: str
    project_folder: str


def _trim_text(value: str) -> str:
    value = value.strip()
    if len(value) <= MAX_OUTPUT_CHARS:
        return value
    return value[:MAX_OUTPUT_CHARS] + "\n...[truncated]"


def _resolve_project_folder(project_folder: str) -> Path:
    candidate = project_folder.strip().strip("\"'")
    path = Path(candidate)
    if path.is_absolute():
        return path.resolve(strict=False)
    return (WORKSPACE_ROOT / path).resolve(strict=False)


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
            stdout=_trim_text(completed.stdout),
            stderr=_trim_text(completed.stderr),
        )
    except FileNotFoundError:
        return NpxResult(ok=False, error=f"{NPX_COMMAND} was not found on PATH.")
    except subprocess.TimeoutExpired as exc:
        return NpxResult(
            ok=False,
            error=f"Command timed out after {COMMAND_TIMEOUT_SECONDS}s.",
            stdout=_trim_text(exc.stdout or ""),
            stderr=_trim_text(exc.stderr or ""),
        )


def gitnexus_analyze_repository(
    project_folder: str,
    force: bool = False,
    embeddings: bool = False,
) -> str:
    """Build or refresh GitNexus index for a project folder."""
    resolved_folder = _resolve_project_folder(project_folder)
    if not resolved_folder.exists() or not resolved_folder.is_dir():
        return json.dumps(NpxResult(
            ok=False,
            project_folder=str(resolved_folder),
            error="Project folder does not exist or is not a directory.",
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


gitnexus_orchestrator_mcp_toolset = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            command=NPX_COMMAND,
            args=["-y", "gitnexus", "mcp"],
        ),
        timeout=30.0,
    ),
    tool_filter=["list_repos"],
    tool_name_prefix="gitnexus",
    use_mcp_resources=True,
)


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