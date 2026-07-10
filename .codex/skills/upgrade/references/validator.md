---
description: Optional semantic validator guidance for progressive upgrade artifacts.
---
Routine validation is deterministic and must run before any LLM review. The orchestrator's gate is a single merged call that validates, auto-repairs safe mechanical violations in place, re-validates, and writes the final report:

```text
node .codex/skills/upgrade/scripts/fix-upgrade-artifact.js <agent_type> <artifact_path> --out <report_path>
```

Its stdout JSON lists `applied` (repairs made), `still_failing`, and `decision`; exit 0 means approved, exit 1 means failures remain. A missing artifact file yields a single critical `MISSING` criterion ("Artifact file exists") in `still_failing` — the orchestrator halts on that outcome (sub-agent never wrote its artifact) instead of retrying; an unreadable/corrupt file yields `PARSE` the same way.

Sub-agent self-validation (before returning) uses the plain validator, which never mutates the artifact:

```text
node .codex/skills/upgrade/scripts/validate-upgrade-artifact.js <agent_type> <artifact_path> --out <report_path>
```

With `--out`, the full report JSON is written to `<report_path>` and stdout is a single compact line (`decision`, `confidence_score`, `report_path`, plus a `failed` list on rejection). Without `--out`, the full report prints to stdout (legacy form). Exit codes: 0 approved, 1 rejected, 2 usage error.

Supported `agent_type` values:

- `analyze`
- `plan`
- `test-plan`
- `execute`
- `test-result`

The deterministic validator checks required fields, enum values, sequence uniqueness, count consistency, result consistency, and `artifact_coverage.confidence = "sufficient"`. Each agent_type's structural contract is declared by its file under `schemas/` (`analyze` → `impact-report.schema.json`, `plan` → `change-plan.schema.json`, `test-plan` → `test-plan.schema.json`, `execute` → `validation-result.schema.json`, `test-result` → `test-result.schema.json`); the validator hard-codes the same contract for speed, and the schema-consistency sweep in `scripts/validate-upgrade-artifact.test.js` fails if the two ever drift (every schema-required field or enum must be flagged by a validator criterion). When `artifact_coverage.file_context_refs` is present, semantic review should use those digests instead of requesting source excerpts.

Use this file only for optional semantic review after deterministic validation. A semantic review prompt may include:

- The artifact summary JSON.
- Mandatory high-signal slices.
- Deterministic validator findings.
- Relevant file-context digests.
- The upgrade description and repo path.

Do not pass full artifacts to a semantic validator unless deterministic validation passed and a specific semantic concern cannot be reviewed from summaries and slices.

Semantic review should answer only:

```json
{
  "agent_type": "analyze | plan | execute | test-plan | test-result",
  "semantic_decision": "approved | rejected",
  "concerns": ["string"],
  "recommendations": ["string"]
}
```

If semantic review rejects an artifact, retry with only the semantic concerns, deterministic findings, artifact path, and loaded slice names.
