# Skill: legacy-system-scout

Stage: repository_analysis
Objective: Build a clear architecture and coupling map for a legacy repository.

## Inputs
- Repository root and language stack
- Existing architecture docs (if any)

## Steps
1. Identify major modules and runtime boundaries.
2. Map entrypoints, data flows, and cross-module coupling.
3. Highlight unknown ownership areas and dead code candidates.

## Expected Output
- Architecture summary
- Coupling hotspots
- Open questions for domain experts

## Human Escalation Triggers
- Business-critical flow cannot be confidently traced.
- Legacy behavior appears contradictory across environments.
