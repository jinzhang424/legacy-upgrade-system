# Legacy Upgrade System

Multi-agent legacy upgrade pipeline. Run `/upgrade` in Claude Code to start.

## Skills

| Skill | Role |
|-------|------|
| `/upgrade` | Orchestrator: runs the full 3-stage pipeline with human-in-the-loop gates |

The sub-agent skills (analyze/plan/execute) are internal and invoked automatically by
`/upgrade` via the Agent tool. Only `/upgrade` is exposed as a user command.

## Configuration

MCP server configuration lives in `.mcp.json` (gitignored). Use `.mcp.example.json` as a template:

- `mcpServers.gitnexus.env.PATH_TO_REPO` — absolute path to the target repository to upgrade
- `mcpServers.mem0.headers.Authorization` — Mem0 token for cross-session memory (format: `Token <your_mem0_token>`)

`.claude/settings.json` is tracked and only contains tool permissions. If you run the Claude Code CLI and want to avoid prompts, set `PATH_TO_REPO` in your shell or add it under `env` in `.claude/settings.json`.

## Pre-run requirement

The target repository must be indexed in GitNexus before running `/upgrade`:

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
- Claude Code CLI or VS Code extension
