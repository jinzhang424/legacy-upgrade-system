# Legacy Upgrade System

Multi-agent legacy upgrade pipeline built on Claude Code. Runs entirely inside the Claude Code CLI or VS Code extension — no separate Python process needed.

## Prerequisites

- [Claude Code CLI](https://claude.ai/code) or Claude Code VS Code extension
- Node.js 22 (for `npx gitnexus`)
- Python 3.10+ (only for the Mem0 MCP server binary)
- GitNexus 1.3.11: `npm install -g gitnexus@1.3.11`

## Setup

1. Install the Mem0 MCP server binary:
   ```bash
   pip install -r requirements.txt
   ```

2. Index the target repository with GitNexus:
   ```bash
   npx gitnexus analyze /path/to/your/repo
   ```

3. Configure the project — edit `.claude/settings.json` (create from the template below if it doesn't exist):
   ```json
   {
     "mcpServers": {
       "gitnexus": { "type": "stdio", "command": "npx", "args": ["-y", "gitnexus", "mcp"] },
       "mem0": {
         "type": "stdio",
         "command": "mem0-mcp-server",
         "env": { "MEM0_API_KEY": "your-mem0-api-key" }
       }
     },
     "env": {
       "PATH_TO_REPO": "/absolute/path/to/target/repo"
     },
     "permissions": {
       "allow": ["Bash(npx gitnexus*)", "Bash(git*)", "Read(*)", "Write(*)", "Edit(*)"]
     }
   }
   ```

   > `.claude/settings.json` is gitignored — it contains your API keys.

## Run

Open Claude Code in this directory and run:

```
/upgrade
```

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
