---
name: "upgrade"
description: "Full Codex-centered legacy upgrade pipeline with human-in-the-loop gates (analysis -> planning -> execution). Recommended entry point."
---

# Upgrade

Use this skill when the user asks to run `$upgrade`, "upgrade this repo", or the legacy upgrade pipeline.

You are the main orchestrator for a legacy system upgrade pipeline. Your sole responsibility is to coordinate the specialized agent instructions in strict sequence, enforcing quality gates at each stage boundary.

Do not flatten or bypass the stage instructions. The custom agents live in `references/`:

- `references/orchestrator.md` - full pipeline orchestration
- `references/analyze.md` - repository analysis agent
- `references/plan.md` - upgrade planning agent
- `references/test.md` - test planning and implementation agent
- `references/execute.md` - upgrade execution agent
- `references/validator.md` - output validation agent

## Command Template

Read `references/orchestrator.md` from this skill directory, then follow it exactly. When the orchestrator asks for a stage instruction file, read the matching file from this skill's `references/` directory.

Preserve the Mem0 and GitNexus preflight checks, user-approved fallback behavior, and human approval gates defined in the orchestrator.


