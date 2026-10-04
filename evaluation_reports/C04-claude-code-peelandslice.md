# Evaluation C4: direct Claude Code session, PeelAndSlice.Java, Java 17 → 21 (24–25 Sep 2026)

**Verdict: the work was done correctly and verified correctly, and then it vanished.** The user asked an interactive Claude Code agent (Sonnet 5, no orchestrator, no sub-agents, no GitNexus calls, no generated tests) to bump `projects/PeelAndSlice.Java` from Java 17 to 21: pin `maven-compiler-plugin` to 3.16.0, switch `source`/`target` to `release 21`, add `project.build.sourceEncoding=UTF-8`, and move the CI matrix from `['17']` to `['21']`. The agent made the three file edits, ran `mvn -B clean verify` twice (once with the fix, once against a stashed pre-upgrade baseline) under a JDK 21 toolchain, got **4/4 tests passing** both times, confirmed the compiled classes report major version **65**, and reported success. It never committed the change. Independent verification today (3 Oct 2026, same machine, same checkout) finds `git status` clean at the original base commit `161e0cd` with **none of the three edits present** — not in the working tree, not in a stash, not on any branch. The repository today is indistinguishable from before the session ever ran.

This is **not** a `$upgrade` pipeline run — there is no impact report, change plan, execution result or validation report for this session, because none of those stages exist for a direct Claude Code session. It belongs with [C01](C01-claude-code-tv-radio.md)–[C03](C03-claude-code-conifer.md) as an ablation point: ordinary agentic coding with no orchestrator and no durability guarantee, evaluated on a target two orders of magnitude smaller than Conifer or tv-radio. **At the moment the session ended: C = 1, T (declared, Windows only) = 1, FBSR = 1. As verified today: there is no artifact to boot, so the durable FBSR is 0.** That gap — not a logic error, not a missed edge case — is the finding this report exists to record.

| Field | Value |
| --- | --- |
| Chat | No `claude_refactored_chats/` export exists for this session; this report was produced inside the same live session rather than from an exported transcript |
| Session log | `C:\Users\jinzh\.claude\projects\C--Users-jinzh-P4P-legacy-upgrade-system-projects-PeelAndSlice-Java\9577f4f1-0817-4fab-a5df-c16c1f2f328c.jsonl`. Single thread, no sub-agents (0 `Agent` tool calls). The session log spans 24 Sep–3 Oct 2026 (83 API calls to date) because it was resumed across multiple days for unrelated follow-up questions; wall-clock elapsed time is therefore not a meaningful metric here (see 1.4) |
| Target as given | `projects/PeelAndSlice.Java` — a single-module Maven project (11 symbols per the project's GitNexus index), Cyrillic test-method identifiers, 3 test classes, no runtime service |
| Upgrade request / validation commands | Java source/target 17 → `release 21`; `maven-compiler-plugin` unpinned → `3.16.0`; add `project.build.sourceEncoding=UTF-8`; CI matrix in `.github/workflows/test.yml` `['17']` → `['21']`. Validation: `mvn -B clean verify --file pom.xml` passes on Linux and Windows with no extra flags, same test pass/fail counts as before, compiled classes report major version 65 |
| Branch and commit evaluated | `main`, base commit `161e0cd` (same commit the user's own `gitStatus` context block showed at session start). **No commit was ever made for this change**; see "What was broken afterwards" |
| Run artifacts | None in the `.codex/upgrade-runs/` sense — there is no orchestrator stage for a direct Claude Code session. The only artifacts are the session log above and the file edits themselves, which no longer exist on disk |
| Pipeline verdict | Not applicable — no validator, no confidence score. The agent's own closing message asserted success and was correct about the state of the repository *at that instant* |
| Human decisions beyond the two gates | One: the user supplied the upgrade spec in a single turn and did not intervene during execution. Two later turns asked about token usage and requested this report; neither touched the target repository |

Independent verification was performed on 3 Oct 2026 against the same local checkout, with JDK 17 (`C:\Program Files\Java\jdk-17`) and JDK 21.0.12.1 (`C:\Program Files\Java\jdk-21.0.12.1`) both installed. No service or datastore is in scope for this target.

## 1.1 Build effectiveness

| Measure | Result | Evidence |
| --- | --- | --- |
| C (as observed during the session) | **1** | `mvn -B clean verify --file pom.xml` with `JAVA_HOME` set to the JDK 21 install: `BUILD SUCCESS`, jar packaged, 4/4 tests passed |
| C (independently verified today) | **n/a — nothing to boot** | `git status` is clean at `161e0cd`; `pom.xml` and `.github/workflows/test.yml` contain none of the three edits. Rebuilding today's HEAD under JDK 21 also returns `BUILD SUCCESS` with 4/4 tests, but that is the **unmodified pre-upgrade project**, not the upgrade |
| T declared (Windows) | **1, at the time** | Compiled bytecode major version confirmed as **65** (`javap -verbose`) under the edited `pom.xml`; same 4/4 test pass count as the pre-upgrade baseline |
| T declared (Linux) | **not verified** | The session had no Linux environment available. This is a stated limitation, not a pass or a fail |
| T extended | **not applicable** | No independent oracle beyond the declared checks was run; the one extended check that *was* run (the baseline comparison, below) surfaced a misattribution rather than a new fault |
| FBSR (at session end) | **1** | `C AND T(declared, Windows) = 1 AND 1 = 1` |
| FBSR (today) | **0** | There is no committed or working-tree artifact corresponding to the upgrade; FBSR is undefined without one, scored 0 by convention rather than left blank |
| Dependency/config coverage | **3 of 3 requested edits made correctly** | `maven-compiler-plugin` pinned to `3.16.0`; `<source>17</source><target>17</target>` replaced with `<release>21</release>`; `project.build.sourceEncoding=UTF-8` added as a new `<properties>` block; `.github/workflows/test.yml` matrix changed `['17']` → `['21']`. All three file-level diffs were correct and minimal — no unrelated files touched, no dependency versions altered |

**The one factual correction this independent pass makes to the session's own reasoning.** During the session, the agent ran a baseline comparison: it stashed its changes, rebuilt the pre-upgrade `pom.xml` under `JAVA_HOME=jdk-17`, watched it fail with `illegal character`/`unmappable character` errors on the Cyrillic identifiers in `BadFruit.java` and `Fruit.java`, and concluded that `project.build.sourceEncoding=UTF-8` was "exactly the problem" the upgrade fixes. Re-running that same pre-upgrade `pom.xml` today under `JAVA_HOME=jdk-21` (`release` unset, still targeting 17 bytecode, **no** `sourceEncoding` property) **builds and passes cleanly**. The actual mechanism is **JEP 400** (default source-file charset changed from the platform default to UTF-8 starting in JDK 18): the encoding failure is a property of *which JDK runs javac*, not of the `pom.xml` at all. Pinning `project.build.sourceEncoding=UTF-8` is still good practice — it makes the build's encoding assumption explicit and portable to a future toolchain or a non-UTF-8 host locale — but it was not, on its own, what the session's own baseline test demonstrated. This is exactly the kind of claim this methodology asks to be independently re-checked rather than taken on the pipeline's (or the agent's) word.

## 1.2 Generated tests

No tests were generated, and none were requested — this is a toolchain-only upgrade with no application-behaviour change in scope. TP = FP = TN = FN = 0; not classifiable, no contribution to any confusion matrix.

## 1.3 Behaviour preservation

This target has no running service and no UI; the only observable behaviours are its three existing test classes, the packaging step, and the CI declaration. Each cell below is scored against the version of the repository that existed **immediately after the session's own edits**, since that is the only state in which the upgrade and the baseline can be compared side by side; it is explicitly not the state of the repository today (see 1.1).

| Behaviour | Status (at session end) | Evidence |
| --- | --- | --- |
| b1 `ExampleTests` (2 tests) continues to pass | preserved | `Tests run: 2, Failures: 0, Errors: 0` under both pre- and post-upgrade builds |
| b2 `BadFruitTest` (1 test) continues to pass | preserved | `Tests run: 1, Failures: 0, Errors: 0`, identical before/after |
| b3 `SampleTest` (1 test) continues to pass | preserved | `Tests run: 1, Failures: 0, Errors: 0`, identical before/after |
| b4 project still packages to a jar | preserved | `BUILD SUCCESS`, `peel_and_slice-1.0-SNAPSHOT.jar` produced both before and after |
| b5 CI now declares Java 21 as its only matrix entry | preserved (declaration only) | `.github/workflows/test.yml` diff confirmed; **the workflow was never actually executed on GitHub Actions**, so "CI passes on Linux" is inferred from the identical `mvn` command succeeding locally, not observed on the real CI runner |

Observed 5, preserved 5 at session end: **BPR = 5/5 = 1.00; MBR = 0/5 = 0.00; NBR = 0/(5+0) = 0.00.** This is a credible but very narrow result — it reflects a toolchain-only change to a project with no application logic in scope, verified on one OS, and not observed on the actual CI runner. As of today, this table describes a state that no longer exists on disk.

## 1.4 Cost and efficiency

Figures are summed directly from the session's own JSONL log (no sub-agents; single thread). Two boundaries are given because the session was resumed across multiple days for unrelated follow-up (token-usage questions, then this report), which makes raw wall-clock time across the whole log meaningless as a "how long did the upgrade take" figure.

| Boundary | API calls | Input (uncached) | Cache read | Cache write | Output (of which thinking) | Notional cost |
| --- | --- | --- | --- | --- | --- | --- |
| End of upgrade work (through the "Upgrade complete" message, 24 Sep 23:02 UTC) | 35 | 70 | 2,167,230 | 78,982 | 8,952 (823) | **≈US$0.84** |
| Through this report (includes the token-usage Q&A and this report's own research/writing, spanning to 3 Oct) | 83 | 166 | 8,170,109 | 461,555 | 59,013 (36,251) | **≈US$4.07** |

Pricing: Claude Sonnet 5 at Anthropic's published first-party rates — input $2/MTok, output $10/MTok, cache read $0.20/MTok (10% of base input), cache write $4/MTok (the 1-hour ephemeral tier this session's harness defaults to, i.e. 2× base input). No thread table is given because there is exactly one thread; `Thread = Main, Effort = unspecified (harness default), Share = 100%`.

Tool-call mix across the full log to date: `Bash` 25, `Read` 8, `Glob` 3, `Edit` 2, `Skill` 1, `Grep` 1 — 40 tool calls total, of which perhaps a dozen (2 edits, ~4 verification `Bash` calls, a handful of `Read`/`Glob`) correspond to the upgrade itself; the remainder is the later token-accounting and report-writing work folded into the same resumed session.

Against the corpus: this is far cheaper than any R- or C-series run in the overview (R1–R12 range US$7.52–US$62.28; C1–C3 range US$1.54–US$62.28), as expected for a target with 11 symbols and no runtime surface against targets with dozens of services and hundreds of files. It is not placed in the overview's cost table because it is not a comparable task size, only a comparable *harness configuration* (direct Claude Code, no orchestrator).

## 1.5 LLM configuration

| Configuration | Reported value |
| --- | --- |
| Model | `claude-sonnet-5`, single thread, no sub-agents |
| Harness | Claude Code, auto permission mode, no plan-mode excursion |
| Reasoning effort | Not explicitly set by the user for this task; harness default |
| Input tokens | 70 uncached + 2,167,230 cache read + 78,982 cache write (at session end); 166 + 8,170,109 + 461,555 through this report |
| Output tokens | 8,952 (823 thinking) at session end; 59,013 (36,251 thinking) through this report |
| Monetary cost | ≈US$0.84 upgrade-only; ≈US$4.07 through this report |
| Environment | Windows 11, local JDK 17 (`C:\Program Files\Java\jdk-17`) and JDK 21.0.12.1 both present; Maven resolved via `JAVA_HOME` override, not the `java` on `PATH`, which itself reported 21.0.12.1 but was not what the first build attempt actually used (see "What was broken afterwards") |
| GitNexus | The project's own `CLAUDE.md` mandates `gitnexus_impact`/`gitnexus_detect_changes` before and after any symbol edit. **Zero GitNexus MCP calls appear anywhere in the session log.** The agent explicitly reasoned, correctly, that a `pom.xml`/CI-only change touches no symbol and does not require impact analysis — but it never invoked `gitnexus_detect_changes()` before declaring the change complete, which the project's own policy also requires unconditionally pre-commit |

## Stage outcomes

| Stage | Result |
| --- | --- |
| Intake | Correctly scoped the four requested changes from the user's prompt; no clarification needed |
| Investigation | Read `pom.xml` and located `.github/workflows/test.yml` (one failed `Glob` against the wrong root before finding it one directory level down) |
| Execution | Two `Edit` calls, both minimal and correct: the `pom.xml` properties/plugin block and the single `java: ['17']` → `['21']` line |
| Self-validation | Ran the real build twice (post-upgrade, then a stashed pre-upgrade baseline), confirmed 4/4 tests and major version 65. The baseline comparison was run but its causal conclusion (sourceEncoding is "exactly" the fix) was not independently re-checked by the agent itself and turns out to be incomplete — see 1.1 |
| Commit | **Did not happen.** The agent never ran `git add`/`git commit`, and was never asked to |
| Persistence | **Failed.** By the time of this report, `git reflog` shows three `reset: moving to HEAD` events after branch checkouts unrelated to this session, and the working tree is clean at the original base commit. The uncommitted edits were silently discarded |

## What was broken afterwards

1. **The upgrade does not exist in the repository today.** `pom.xml` still reads `<source>17</source><target>17</target>` with an unpinned `maven-compiler-plugin` and no `sourceEncoding` property; `.github/workflows/test.yml` still declares `java: ['17']`. Anyone relying on this session's own closing summary ("Upgrade complete") would be wrong about the current state of the target.
2. **The change was never committed**, so it had no durability guarantee against *anything* — not a crash, not a `git clean`, not another process checking out a different branch in the same working directory. This project's `.git` history shows exactly such an event: an unrelated `$upgrade` pipeline run against this same repository on 25 Sep (branches `upgrade/java-21`, `upgrade/codex-raw`, commits `5781fb1`/`3031e77`/`c8bfd3c`/`6a62d27`, stashes named `codex-upgrade-java-21-*`) ended with the working tree reset to `main` at `161e0cd` — and this Claude Code session's uncommitted edits did not survive that.
3. **The session's own causal claim about the encoding fix was half right.** It correctly diagnosed and fixed the visible symptom (illegal-character compile errors under JDK 17 on Windows) but misattributed the fix to its own `pom.xml` change rather than to the JDK-21 toolchain switch that was running underneath it the whole time (JEP 400). The practical fix shipped is still correct and harmless; the stated reasoning for *why* it works is not fully accurate.
4. **Linux was never checked.** The user's own validation bar explicitly named both Linux and Windows; only Windows was exercised.
5. **The real GitHub Actions workflow was never triggered.** "CI passes" rests entirely on a local `mvn` invocation that approximates the workflow's single step, not on an observed Actions run.

## Run-specific recommendations

- **Commit before declaring a task done, even a two-file change.** A `git commit` costs one tool call and would have made this entire failure mode impossible; an uncommitted edit in a shared working directory has no protection against anything, including completely unrelated automation touching the same checkout.
- **Separate "the build passed" from "the task is durably finished."** The agent's closing summary was accurate about the former and silently assumed the latter. A one-line final check (`git status --short`) before the closing summary would have caught the risk even before the later loss occurred.
- **Re-run `gitnexus_detect_changes()` even for changes the agent believes are symbol-free.** The project's `CLAUDE.md` requires it unconditionally pre-commit; skipping it because "this clearly doesn't touch a symbol" is a reasonable judgement call that this project's own stated policy does not actually permit.
- **Treat a baseline A/B comparison as evidence about the symptom, not automatically about the mechanism.** The session had the data to notice JDK 21 alone fixed the encoding error — it had already set `JAVA_HOME` to JDK 21 for every build in the session — but didn't re-test the one cell (old `pom.xml`, new JDK) that would have isolated the variable.
- **If a task's own validation bar names two operating systems, say explicitly which one went unchecked**, rather than reporting both as passing. The session did flag this honestly in its closing message ("I didn't have a Linux box to test on"), which is the right instinct; the follow-through (actually running it under WSL/a container, since both were plausibly available) would have been better.
- **For small, low-risk targets like this one, the fixed cost of an evaluation report (≈US$3.23 here, nearly 4× the upgrade's own ≈US$0.84) is worth weighing against the task's size** before applying the full R-series/C-series methodology; a lighter-weight note may be more proportionate for single-digit-file changes with no runtime surface.

Compared with the three existing C-series ablation points, this run sits at the opposite end of the task-size spectrum: C1–C3 are full-stack, multi-service upgrades costing US$1.54–US$62.28 over 32–332 minutes; this is a two-file, two-dependency-declaration change costing ≈US$0.84 and, at session end, a clean 1.00 BPR with FBSR 1. The two families are not comparable on cost or BPR for that reason. What *is* comparable, and is the only finding worth carrying forward into the overview, is procedural: three of four C-series runs now on record (C01's and C03's dirty working trees, C02's clean-but-never-committed state, and this run's commit-then-lose-it sequence) show the same pattern — a direct Claude Code session that produces correct work and never gives that work a commit to survive on.

Evidence sources: the session's own JSONL log (`9577f4f1-0817-4fab-a5df-c16c1f2f328c.jsonl`); direct verification on 3 Oct 2026 via `git status`, `git log`, `git reflog`, `git stash list`, `git branch -a`, and two fresh `mvn -B clean verify --file pom.xml` runs under JDK 17 and JDK 21 respectively; `javap -verbose` against the session's own build output (no longer reproducible, taken from the transcript) for the major-version-65 claim; inspection of `.codex/upgrade-runs/PeelAndSlice.Java/20260925-093825-upgrade/` and the `upgrade/java-21` branch to establish that the repository's current clean state is the result of a separate, later pipeline run rather than anything this session did.
