# Legacy Upgrade Skill Packs

This folder contains stage-specific skills loaded by the prototype upgrade agent.

## Folder layout

- repository_analysis
- upgrade_planning
- upgrade_execution

## Suggested authoring loop

1. Pick a stage and target task.
2. Load the skill through the load_skill tool.
3. Run evaluate_skill_trial with expected signals.
4. Refine the skill and re-test.

## Notes

- These files are intentionally lightweight starter scaffolds.
- Human escalation triggers should be explicit in every skill.
