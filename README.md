# Legacy Upgrade System

Codex-centered legacy upgrade pipeline for multi-stage repository migrations.

The project exposes one user-facing Codex skill: `upgrade`. It coordinates analysis, planning, test planning, execution, validation, and generated tests with human approval gates between the major stages.

## Prerequisites

- Codex CLI or Codex desktop
- Node.js 22, for `npx gitnexus`
- Optional: Python 3.10+ only if you run a local Mem0 MCP server
- Optional: GitNexus global install if you prefer not to use `npx`

## Setup

1. Configure Codex:

   ```bash
   copy .codex\config.example.toml .codex\config.toml
   ```

2. Edit `.codex/config.toml`:

   - Set `PATH_TO_REPO` to the absolute path of the repository you want to upgrade.
   - Set the GitNexus MCP `PATH_TO_REPO` to the same value.
   - Set the Mem0 authorization header if you want cross-session memory.

   To avoid filesystem approval friction in Codex Desktop, keep target repositories inside this workspace, for example:

   ```text
   projects\target-repo
   ```

   Then set both `PATH_TO_REPO` values to that repository's absolute path.

3. Make sure `PATH_TO_REPO` exists and points to a repository directory. The `$upgrade` preflight checks this before Mem0 or GitNexus and stops early if the path is missing.

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

1. Analysis: maps affected files, dependency graph, breaking changes, risks, and coverage gaps.
2. Planning: creates an ordered change plan with rollback steps and validation criteria.
3. Test planning: designs tests before code is changed, so tests are based on intent rather than the final diff.
4. Execution: applies changes in validated batches on an `upgrade/<slug>` branch.
5. Test implementation: implements planned tests and supplementary coverage for uncovered diff hunks.

## Enforcement And Fallback

Mem0 and GitNexus are expected by default. If either system is unavailable, the skill warns and asks whether to proceed without it. Proceeding without Mem0 skips memory recall/storage. Proceeding without GitNexus uses filesystem analysis with reduced confidence.

## Project Layout

- `AGENTS.md`: Codex instructions loaded for this project.
- `.agents/skills/upgrade/SKILL.md`: the Codex `upgrade` skill.
- `.codex/config.example.toml`: sanitized local Codex configuration template.
- `.codex/config.toml`: local Codex configuration, ignored by Git.
- `.mcp.example.json`: optional MCP template for tools that still read MCP JSON directly.
