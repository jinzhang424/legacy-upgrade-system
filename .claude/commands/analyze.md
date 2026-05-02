---
description: Run repository analysis only — scans the target repo via GitNexus and produces an ImpactReport. Normally invoked by /upgrade; run standalone to inspect impact before committing to a plan.
---
Read the full analyzer instructions from `.claude/skills/analyze.md` using the `Read` tool, then follow them.

Before starting: if `PATH_TO_REPO` is not set in the environment, ask the user for the absolute path to the repository. If `upgrade_description` was not provided as an argument to this command, ask: "What upgrade do you want to analyse? (e.g. 'migrate from Spring Boot 2.x to 3.x')"
