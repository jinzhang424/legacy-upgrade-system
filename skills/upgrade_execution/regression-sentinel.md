# Skill: regression-sentinel

Stage: upgrade_execution
Objective: Detect behavior drift early and trigger safe intervention.

## Inputs
- Baseline behavior checklist
- Test and telemetry outputs

## Steps
1. Compare observed behavior with baseline thresholds.
2. Flag regressions by severity and blast radius.
3. Recommend continue, pause, or rollback.

## Expected Output
- Regression assessment report
- Immediate mitigation suggestions

## Human Escalation Triggers
- User-facing behavior differs from approved expectations.
- Reliability or security thresholds are violated.
