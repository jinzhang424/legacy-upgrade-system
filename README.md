# Legacy Upgrade System

Multi-agent legacy upgrade orchestrator with GitNexus analysis and Mem0 long-term memory via MCP.

## Prerequisites

- Python 3.10+
- Node.js 22 (required for `npx gitnexus ...` tooling)
- Google API key for the configured model provider
- Gitnexus 1.3.11

## Install

```bash
pip install -r requirements.txt
```

## Environment

Set these variables in `legacy_upgrade_system/.env` (or repo-root `.env`):

```env
GOOGLE_API_KEY=...
LEGACY_UPGRADE_MODEL=gemini-2.5-flash
PATH_TO_REPO=C:\path\to\target\repository
```

## Run

This has been the primary way I've been running it
```
adk run legacy_upgrade_system
```

You could also try this but I haven't really been using it recently
```bash
python -m legacy_upgrade_system.main
```

Optional GitNexus probe:

```bash
GITNEXUS_PROBE_QUERY="symbolOrSnippet" python -m legacy_upgrade_system.smoke_preflight
```