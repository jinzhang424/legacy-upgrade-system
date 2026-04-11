# Skill: controlled-change-executor

Stage: upgrade_execution
Objective: Apply approved changes incrementally with strong guardrails.

## Inputs
- Approved plan and checkpoints
- Current code and environment state

## Steps
1. Apply one approved step at a time.
2. Run targeted validation immediately after each step.
3. Pause on unexpected behavior and request human input.

## Expected Output
- Step execution log
- Validation evidence and risk updates

## Human Escalation Triggers
- High-risk step requested without explicit approval.
- Behavior diverges from baseline checks.
