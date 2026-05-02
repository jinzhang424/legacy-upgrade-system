---
description: Run upgrade planning only — takes an ImpactReport and produces an ordered ChangePlan. Normally invoked by /upgrade; run standalone if you already have an ImpactReport.
---
Read the full planner instructions from `.claude/skills/plan.md` using the `Read` tool, then follow them.

Before starting: if `PATH_TO_REPO` is not set in the environment, ask the user for the absolute path to the repository. Ask the user to paste the ImpactReport JSON produced by `/analyze`, and for the upgrade description and any constraints.
