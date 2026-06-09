# Legacy Upgrade System

Codex-centered multi-stage legacy upgrade pipeline. Ask Codex to use `$upgrade` to start.

## Skills

| Skill | Role |
|-------|------|
| `$upgrade` | Orchestrator: runs analysis, planning, test planning, execution, and test implementation with human-in-the-loop gates |

Only `$upgrade` is exposed as a user-facing Codex skill.

## Configuration

Codex configuration lives in `.codex/config.toml` (gitignored). Use `.codex/config.example.toml` as a template:

- `shell_environment_policy.set.PATH_TO_REPO` - absolute path to the target repository to upgrade
- `mcp_servers.gitnexus.env.PATH_TO_REPO` - same target repository path for GitNexus
- `mcp_servers.mem0.http_headers.Authorization` - Mem0 token for cross-session memory (format: `Token <your_mem0_token>`)

`.mcp.example.json` is kept only as an optional template for tools that read MCP JSON directly.

For Codex Desktop, prefer placing target repositories under this workspace, for example `projects/<repo-name>`, and set both `PATH_TO_REPO` values to that absolute path. The `$upgrade` startup preflight must verify that `PATH_TO_REPO` exists and is a directory before running Mem0 or GitNexus checks.

## Pre-run requirement

The target repository must be indexed in GitNexus before running `$upgrade`:

```bash
npx gitnexus analyze <PATH_TO_REPO>
```

Run this once per repository, or again after large refactors.

## Enforcement and fallback

By default, the pipeline requires both Mem0 and GitNexus. If either system is unavailable, the orchestrator will warn and ask whether to proceed without it. Proceeding without Mem0 skips memory recall/storage. Proceeding without GitNexus forces a fallback analysis with reduced confidence.

## MCP Tools Available

- **GitNexus**: `gitnexus_query`, `gitnexus_context`, `gitnexus_impact`, `gitnexus_cypher`
- **Mem0**: `mem0_add_memory`, `mem0_search_memories`, `mem0_get_memories`

## Prerequisites

- Node.js 22 (for `npx gitnexus`)
- Optional: Python 3.10+ only if you run `mem0-mcp-server`
- Codex CLI or Codex desktop
