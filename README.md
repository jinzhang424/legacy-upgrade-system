# Legacy Upgrade System

Codex-centered legacy upgrade pipeline for multi-stage repository migrations.

The project exposes one user-facing Codex skill: `upgrade`. It coordinates analysis, planning, small smoke/integration test generation, execution, one final validation/repair pass, and a post-validation browser console check, with human approval gates between the major stages.

## Prerequisites

- Codex CLI or Codex desktop
- Node.js 22, for `npx gitnexus`
- Optional: GitNexus global install if you prefer not to use `npx`

## Setup

1. Configure Codex:

   ```bash
   copy .codex\config.example.toml .codex\config.toml
   ```

2. Edit `.codex/config.toml`:

   - Set `PATH_TO_REPO` to the absolute path of the repository you want to upgrade.
   - Set the GitNexus MCP `PATH_TO_REPO` to the same value.

   To avoid filesystem approval friction in Codex Desktop, keep target repositories inside this workspace, for example:

   ```text
   projects\target-repo
   ```

   Then set both `PATH_TO_REPO` values to that repository's absolute path.

3. Make sure `PATH_TO_REPO` exists and points to a repository directory. The `$upgrade` preflight checks this before GitNexus and stops early if the path is missing.

4. Index the target repository with GitNexus:

   ```bash
   npx gitnexus analyze <PATH_TO_REPO>
   ```

   Run this once per repository, or again after large refactors.

## Run

Open Codex in this directory and invoke the repo-scoped skill:

```text
$upgrade
```

If `PATH_TO_REPO` is not configured, the skill will ask for it. If it is configured but the directory does not exist, the skill will ask you to move or clone the target repository under the workspace, such as `projects\<repo-name>`, and update `.codex/config.toml`.

## Pipeline

1. Analysis: maps affected files, dependency graph, risks, and exact line ranges for upgrade-relevant issues.
2. Planning: creates a line-aware change plan and writes `change-plan.json` with all validation metadata.
3. Test generation: creates a small set of smoke and integration tests, then records them in `change-plan.json`.
4. Execution: applies planned changes on an `upgrade/<slug>` branch and creates one final commit.
5. Final validation/repair: reads only `change-plan.json`, checks git diff alignment, runs build commands and tests, fixes plan-related build/test failures when possible, and amends the final upgrade commit.
6. Post-validation browser console check: if the upgrade is approved and serves a browser-facing page, asks you to open it, check the developer tools Console tab, and report any errors. Reported errors that are clearly related to the upgrade are repaired (up to 3 rounds) and amended into the same commit.

## Enforcement And Fallback

GitNexus is expected by default for line-aware analysis. If GitNexus is unavailable, the skill warns and asks whether to proceed without it. Proceeding without GitNexus uses filesystem analysis with reduced confidence.

## Project Layout

- `AGENTS.md`: Codex instructions loaded for this project.
- `.agents/skills/upgrade/SKILL.md`: the Codex `upgrade` skill.
- `.codex/config.example.toml`: sanitized local Codex configuration template.
- `.codex/config.toml`: local Codex configuration, ignored by Git.
- `.mcp.example.json`: optional MCP template for tools that still read MCP JSON directly.
