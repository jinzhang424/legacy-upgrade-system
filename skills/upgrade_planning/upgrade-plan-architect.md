# Skill: upgrade-plan-architect

Stage: upgrade_planning
Objective: Build a phased execution plan with clear validation gates.

## Inputs
- Approved migration path
- Baseline behavior checklist

## Steps
1. Split upgrade into minimal, reversible phases.
2. Define pre-check, in-flight, and post-check validation gates.
3. Attach rollback actions to each phase.

## Expected Output
- Phased plan with gate criteria
- Risk register and owner mapping

## Human Escalation Triggers
- Plan includes irreversible data or contract changes.
- Ownership for incident response is unclear.
