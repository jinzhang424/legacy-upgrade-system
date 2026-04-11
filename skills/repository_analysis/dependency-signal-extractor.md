# Skill: dependency-signal-extractor

Stage: repository_analysis
Objective: Inventory dependencies and estimate upgrade risk signals.

## Inputs
- Dependency manifests and lockfiles
- Runtime and deployment constraints

## Steps
1. Enumerate first-party and third-party dependencies.
2. Flag deprecated, unsupported, or security-sensitive components.
3. Identify transitive dependency choke points.

## Expected Output
- Prioritized dependency risk list
- Candidate replacement or upgrade notes

## Human Escalation Triggers
- Multiple upgrade routes have conflicting tradeoffs.
- Security/compliance constraints are unclear.
