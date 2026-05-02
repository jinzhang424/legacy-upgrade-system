---
description: Run upgrade execution only — applies an approved ChangePlan in batches with validation after each. Normally invoked by /upgrade; run standalone if you already have an approved ChangePlan.
---
Read the full executor instructions from `.claude/skills/execute.md` using the `Read` tool, then follow them.

Before starting: if `PATH_TO_REPO` is not set in the environment, ask the user for the absolute path to the repository. Ask the user to paste the ChangePlan JSON produced by `/plan`, and confirm which branch to apply changes on (or create a new one).
