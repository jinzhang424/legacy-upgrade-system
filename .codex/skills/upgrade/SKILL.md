---
name: "upgrade"
description: "Full Codex-centered legacy upgrade pipeline with human-in-the-loop gates (analysis -> planning -> execution). Recommended entry point."
---

# Upgrade

Use this skill when the user asks to run `$upgrade`, "upgrade this repo", or the legacy upgrade pipeline.

You are the main orchestrator for a legacy system upgrade pipeline. Your sole responsibility is to coordinate the specialized agent instructions in strict sequence, enforcing quality gates at each stage boundary.

Do not flatten or bypass the stage instructions.

- `references/orchestrator.md` - full pipeline orchestration (the only reference doc you read in full)
- `references/briefs/*.md` - compact runtime briefs, inlined verbatim into each stage sub-agent's spawn prompt
- `references/{analyze,plan,test,execute}.md` - human appendices behind the briefs; **not** loaded by agents at runtime
- `references/validator.md` - output validation agent
- `scripts/` - deterministic helpers: validate-upgrade-artifact.js, fix-upgrade-artifact.js, repo-status.js, run-gate.js, boot-smoke.js
- `schemas/upgrade-config.schema.json` - per-repo validation contract (`<repo>/upgrade.config.json`) driving install/boot/smoke gates

## Command Template

Read `references/orchestrator.md` from this skill directory, then follow it exactly. When spawning a stage sub-agent, inline the matching brief from `references/briefs/` into the spawn prompt — do not instruct sub-agents to read files from `references/` or `schemas/`.

Preserve the Mem0 and GitNexus preflight checks, user-approved fallback behavior, and human approval gates defined in the orchestrator. Mem0 usage is exactly two calls per run, both by the orchestrator.


