---
description: Optional semantic validator guidance for progressive upgrade artifacts.
---
Routine validation is deterministic and must run before any LLM review:

```text
node .codex/skills/upgrade/scripts/validate-upgrade-artifact.js <agent_type> <artifact_path>
```

Supported `agent_type` values:

- `analyze`
- `plan`
- `test-plan`
- `execute`
- `test-result`

The deterministic validator checks required fields, enum values, sequence uniqueness, count consistency, result consistency, and `artifact_coverage.confidence = "sufficient"`. When `artifact_coverage.file_context_refs` is present, semantic review should use those digests instead of requesting source excerpts.

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
