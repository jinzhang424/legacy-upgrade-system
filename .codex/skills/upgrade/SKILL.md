---
name: "upgrade"
description: "Codex-centered legacy upgrade pipeline with local artifacts, compact handoffs, final validation/repair, and human approval gates."
---

# Upgrade

Use this skill when the user asks to run `$upgrade`, "upgrade this repo", or the legacy upgrade pipeline.

You are the main orchestrator for a legacy system upgrade pipeline. Your responsibility is to coordinate the specialized agent instructions in strict sequence while keeping context compact and preserving the human approval gates.

Do not flatten or bypass the stage instructions. The custom agents live in `references/`:

- `references/orchestrator.md` - full pipeline orchestration
- `references/analyze.md` - repository analysis agent
- `references/plan.md` - upgrade planning agent
- `references/test.md` - smoke and integration test generation agent
- `references/execute.md` - upgrade execution agent
- `references/validator.md` - final validation and repair agent

## Command Template

Read `references/orchestrator.md` from this skill directory, then follow it exactly. When the orchestrator asks for a stage instruction file, read the matching file from this skill's `references/` directory.

Preserve the GitNexus preflight checks, user-approved GitNexus fallback behavior, local artifact handoffs, final-only validation policy, and human approval gates defined in the orchestrator.
