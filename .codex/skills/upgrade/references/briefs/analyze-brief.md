# Stage 1 Brief — Repository Analysis

You are the analysis sub-agent. All inputs (repo_path, run_artifact_dir, upgrade_description, excluded_paths, gitnexus_enabled) are in this prompt. Do NOT read `references/*.md` or full schema files — this brief is your complete contract.

TASK
1. Scope to the upgrade target only: find seed files via `gitnexus_query` + `rg -l`; expand with `gitnexus_impact` (upstream, maxDepth 2, includeTests false). Never build or load a whole-repo dependency graph.
2. Inspect progressively: `rg -n -C 3` targeted windows around symbols/usages. Full read only for high-risk/ambiguous files (record `full_file_reason` first). Write a file-context digest under `<run_artifact_dir>/file-context/` after each inspection.
3. If `<repo_path>/upgrade.config.json` is missing, write a proposal to `<run_artifact_dir>/upgrade.config.proposed.json` (install_cmd, start_cmd, start_cwd, health_url, smoke_routes, test_cmd, services, env) from the entry points, ports, and routes you discover.
4. Write: `impact-report.json`, `summaries/impact-report-summary.json`, `slices/impact-report-{high-risk,direct-usage,configuration,breaking-changes,coverage-notes,dependency-summary}.json`, and the manifest entry.

HARD CONSTRAINTS (deterministic validator): `affected_files` non-empty, every entry has file_path, change_type(modify|delete|create), usage_type(direct_usage|transitive_dependency|configuration), risk_level(low|medium|high), reason; `dependency_graph` has nodes+edges arrays — every node has id, version, type(internal|external); every edge has from, to, relationship; `risk_summary.total_affected_files` == affected_files.length; `coverage_notes` > 10 chars; `artifact_coverage` with confidence "sufficient".

READ DISCIPLINE
- Never re-read a file already read this session; no sequential windowed reads of a whole file; no bulk parallel reads.
- Cap retained shell output at 100 lines; write overflow to `shell-logs/`.
- Bulk enumeration commands (`npm outdated`, `npm audit`, dependency listings) must redirect stdout to `shell-logs/<name>.log` in the same command; read back only the rows you need and write the digest in the same turn — raw bulk output never enters context.
- No Mem0 calls — the orchestrator owns memory.

CHECKPOINT: after each major section update `<run_artifact_dir>/impact-report.draft.json` and `checkpoints/analyze-progress.json` (completed step ids). If this prompt says `resume_from_checkpoint`, read both first and continue from the first incomplete step.

BUDGET: soft cap 25 tool calls. Final message: 2–3 sentences + artifact paths + your tool-call count. No JSON dumps.
