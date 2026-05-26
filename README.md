# Legacy Upgrade System

Multi-agent legacy upgrade pipeline built on Claude Code. Runs entirely inside the Claude Code CLI or VS Code extension — no separate Python process needed.

## Prerequisites

- [Claude Code CLI](https://claude.ai/code) or Claude Code VS Code extension
- Node.js 22 (for `npx gitnexus`)
- Optional: Python 3.10+ only if you run `mem0-mcp-server` instead of the hosted Mem0 MCP
- Optional: GitNexus 1.3.11 global install (`npm install -g gitnexus@1.3.11`) if you prefer not to use `npx`

## Setup

1. Configure MCP servers (recommended: VS Code / extension):
   - Copy `.mcp.example.json` to `.mcp.json`.
   - Set `mcpServers.gitnexus.env.PATH_TO_REPO` to the absolute path of the target repo.
   - Set `mcpServers.mem0.headers.Authorization` to `Token <your_mem0_token>`.
   - `.mcp.json` is gitignored.

   If you use the Claude Code CLI, register the same MCP servers.

2. Provide `PATH_TO_REPO` to the orchestrator:
   - Set it in `.claude/settings.json` under `env`, or in your shell environment before launching Claude Code.
   - If it is not set, `/upgrade` will prompt for it.

3. Index the target repository with GitNexus:
   ```bash
   npx gitnexus analyze <PATH_TO_REPO>
   ```

4. (Optional) Review tool permissions in `.claude/settings.json`.

## Run

Open Claude Code in this directory and run:

```
/upgrade
```

If `PATH_TO_REPO` is not set, the orchestrator will prompt you for it.

The orchestrator will ask you what upgrade to perform, then guide you through three stages with human-in-the-loop approval gates:

1. **Analysis** — GitNexus scans the repository and produces an impact report
2. **Planning** — Claude designs ordered file changes with rollback procedures
3. **Execution** — Claude applies changes in batches, validating after each batch

## Enforcement and fallback

Mem0 and GitNexus are required by default. If either system is unavailable, the orchestrator will warn and ask whether to proceed without it. Proceeding without Mem0 skips memory recall/storage. Proceeding without GitNexus forces a fallback analysis with reduced confidence.

## Skills

| Skill | Description |
|-------|-------------|
| `/upgrade` | Full 3-stage pipeline (only user-facing command) |

The analyze/plan/execute stages are internal skills invoked automatically by `/upgrade`.
