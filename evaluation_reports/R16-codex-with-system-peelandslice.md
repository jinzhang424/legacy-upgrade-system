# R16 — PeelAndSlice.Java pipeline: correct Java 21 commit, incomplete cross-platform proof

The `$upgrade` pipeline produced a correct, minimal two-file Java 21 commit and preserved every behaviour observed in this small Maven library. Independent verification on 4 October 2026 resolved the parent and upgraded commits into separate empty Maven repositories, built both under JDK 21, reproduced 4/4 passing tests, packaged the jar, and found major version 65 in all 17 emitted production and test class files. No runtime dependency changed, and a Java 21 removed/internal-API scan found no incompatible use. The user's declared contract, however, required the exact Maven build to pass on both Windows and Linux. Windows passed with no build flags; Linux was neither run by the pipeline nor independently available today, the branch is not on a remote, and the Ubuntu workflow runs `verify` rather than the user's exact `clean verify`. The pipeline nevertheless approved at confidence 1.0. Under the overview's binary definitions, **C = 1, T(declared) = 0, T(extended) = 0, and FBSR = 0**. The narrow observed behaviour set is fully preserved: **BPR = 1.00, MBR = 0, NBR = 0**. No product regression was found; the failed full-build score is an incomplete cross-platform proof.

| Field | Value |
| --- | --- |
| Chat | Main Codex session log `C:\Users\jinzh\.codex\sessions\2026\09\25\rollout-2026-09-25T09-37-53-01a0d55a-7f61-7af1-9e93-231d2e713e58.jsonl`; no exported `refactored_chats` file. Five stage-agent logs and four automatic approval-review logs are in the same session-date directory and are included in section 1.4 |
| Target | `projects/PeelAndSlice.Java`, a single-module Maven library/example project with no executable entry process, web surface, datastore or external service |
| Upgrade request / validation commands | Java source/target 17 → `release 21`; pin `maven-compiler-plugin` 3.16.0; add `project.build.sourceEncoding=UTF-8`; CI matrix `['17']` → `['21']`; preserve behaviour and existing test outcomes. Required validation: `mvn -B clean verify --file pom.xml` on Linux and Windows with no extra flags and the same test counts as before, plus class-file major version 65 |
| Branch and commit evaluated | `upgrade/java-21` at `3031e77536ebb321e064883a63b92c3e1f2c2575`; base `161e0cdd6a499d7989c1da4564c3788648643f97` on `main` |
| Change size | **2 substantive files; 9 LoC changed (6 additions, 3 deletions)**. Measured from `161e0cdd..3031e775`; includes `pom.xml` and `.github/workflows/test.yml`, which are the upgrade itself. Generated Maven build output under `target/` is excluded |
| Run artifacts | `.codex/upgrade-runs/PeelAndSlice.Java/20260925-093825-upgrade/`: `impact-report.json`, `change-plan.json`, `execution-result.json`, `validation-report.json` |
| Tool version | Upgrade skill `5acacf4a` at workspace commit `74401589`; Codex CLI 0.154.0 |
| Pipeline verdict | Approved, confidence 1.0, no repairs and no scope expansions. The validation report recommends running Ubuntu CI but does not let that acknowledged missing requirement block approval |
| Human decisions beyond the two gates | 1: after Stage 3 found a dirty `main` and an existing divergent `upgrade/java-21`, the user approved backing up the branch and stashing both user files and the GitNexus index before recreating the branch |

Independent verification used Maven 3.9.16 and Oracle JDK 21.0.12.1 on Windows 11. The base and upgraded commits were exported into separate scratch directories and built against separate initially empty Maven local repositories. The exact flag-free command was then repeated against the upgraded tree after fresh resolution. Docker Desktop's Linux engine was unavailable and WSL listed only a stopped `docker-desktop` distribution, so Linux execution could not be performed and is recorded as a limitation rather than a pass or a product failure.

## 1.1 Build effectiveness

| Measure | Result | Independent evidence |
| --- | --- | --- |
| C | **1** | Fresh dependency resolution and `clean verify` completed for commit `3031e77`; the jar was packaged. This library has no process to start, so resolve + compile + test + package is its boot equivalent |
| T declared | **0** | Windows exact command passed, the 4/0/0/0 test outcome matched the parent, and all classes were version 65. The required Linux run was not observed, so not all declared checks pass |
| T extended | **0** | Fresh isolated resolution, parent/upgrade comparison, all-class bytecode inspection, `jdeps --jdk-internals`, diff checking and Java 21 breaking-pattern scans found no additional fault. Extended T cannot pass while the declared Linux cell remains unobserved |
| FBSR | **0** | Declared: `C AND T = 1 AND 0 = 0`; extended: `1 AND 0 = 0` |
| Substantive change size | **2 files / 9 LoC** | 6 inserted lines + 3 deleted lines = 9 changed LoC: 7 lines in `pom.xml` and 2 in `.github/workflows/test.yml`. Generated Maven build output under `target/` is excluded; no production or test source file changed |
| Dependency/configuration coverage | **4 of 4 requested edits** | `pom.xml:10` adds UTF-8; `pom.xml:17` pins compiler plugin 3.16.0; `pom.xml:19` selects release 21; `.github/workflows/test.yml:16` selects JDK 21. The diff is 6 insertions and 3 deletions over two files |
| Syntax/static findings | **No Java 21 incompatibility found** | All 11 production and 5 test source files compile with `release 21`; 12 production and 5 test class files report major version 65. `jdeps --jdk-internals` is empty. Searches found no `jdk.internal`, `sun.misc.Unsafe`, SecurityManager, Nashorn, JAXB-removal, reflective `newInstance`, `--add-opens`, stale `<source>/<target>`, or Java 17 CI entry |

The implementation is exact. `pom.xml:10` declares UTF-8, `pom.xml:17` pins `maven-compiler-plugin` 3.16.0, and `pom.xml:19` replaces source/target 17 with release 21. `.github/workflows/test.yml:16` changes only the matrix value. No source, test, runtime dependency or Surefire setting changed, and `git diff --check` passed.

Fresh resolution matters because the unpinned parent resolves today to compiler plugin 3.15.0, while the upgrade resolves the requested 3.16.0. Both immutable trees pass under JDK 21 with identical results: 4 tests, 0 failures, 0 errors, 0 skipped. The parent emits Java 17 major version 61; the upgrade emits major 65 in every one of its 17 class files. The compiler-plugin move is a minor release, not a dependency-major migration, and no application dependency crossed a version boundary. The only major boundary is JDK 17 to 21; real compilation plus the removed/internal-API scan found no incompatibility. `FrameRate.java` imports `com.sun.net.httpserver.HttpContext`, but that is the supported exported `jdk.httpserver` API and compiled successfully under `--release 21`.

The pipeline accurately reported the Windows evidence. Its error was verdict logic: the approved plan explicitly says Linux is an unresolved gap unless the Ubuntu job is observed, yet validation approved without observing it. No remote branch contains `3031e77`, so the checked-in workflow cannot have run for this commit. Moreover, `.github/workflows/test.yml:32` runs `mvn -B verify --file pom.xml`, not the exact declared `mvn -B clean verify --file pom.xml`. Neither point proves a Linux defect; together they prevent a Linux pass from being claimed.

## 1.2 Generated tests

The test-generation stage correctly wrote no new tests and changed no existing test logic.

| Test | What it asserts | Result | Classification |
| --- | --- | --- | --- |
| Generated tests | None | Not run | Not classifiable; no confusion-matrix contribution |

Generated-test confusion-matrix contribution: **TP 0, FP 0, TN 0, FN 0**. The four executed tests are pre-existing developer tests. The two `ExampleTests` cases exercise an EasyMock return value and expected void invocation; `BadFruitTest.test()` and `SampleTest.test()` have empty bodies, and `FrameRateTest` declares no test. Their green result is useful as a stable baseline but weak evidence of domain behaviour.

## 1.3 Behaviour preservation

This target has no UI, server, CLI entry point or datastore. To match the granularity of the existing PeelAndSlice evaluations, the fixed checklist uses its executed test classes, packaging, and CI workflow shape. Runtime/build evidence is distinguished from static declaration evidence.

| Behaviour | Status | Evidence |
| --- | --- | --- |
| b1 `ExampleTests` mock return and void-call examples complete | preserved | Runtime: independent base and upgrade builds each ran 2 tests with 0 failures/errors; the return-value case asserts 6 and the void case completes without an unexpected invocation |
| b2 `BadFruitTest` continues to complete | preserved | Runtime: base and upgrade each ran 1 test with 0 failures/errors. Limitation: the test body is empty |
| b3 `SampleTest` continues to complete | preserved | Runtime: base and upgrade each ran 1 test with 0 failures/errors. Limitation: the test body is empty |
| b4 the project packages as `peel_and_slice-1.0-SNAPSHOT.jar` | preserved | Runtime/build: both fresh isolated builds and the exact upgraded-tree command produced the jar; the upgrade jar contains 12 production classes |
| b5 CI remains a single-JDK Maven verification workflow | preserved | Static: runner, cache, setup-java wiring and Maven step are unchanged; only matrix value 17 → 21 changed. The actual Linux job was not observed |

Observed 5, preserved 5: **BPR = 5 / 5 = 1.00; MBR = 0 / 5 = 0.00**. No unrequested behaviour was introduced: **NBR = 0 / (5 preserved + 0 new) = 0.00**. Java 21 bytecode is requested capability, not an unrequested new behaviour. Exact equivalence over this narrow checklist is 1.00, but two empty tests and the absent Linux execution sharply limit what that number proves.

## 1.4 Cost and efficiency

| Thread | Effort | Minutes | Input tokens | Note |
| --- | --- | --- | --- | --- |
| Orchestrator (main) | medium | 39.58 wall | 1,874,258 (1,789,184 cached) | Includes intake, two approval waits, dirty-tree intervention, branch/stash coordination and final handoff |
| Repository analysis | medium | 2.97 | 405,785 (364,544 cached) | Two affected files, one high risk; all Java sources scanned |
| Planning | medium | 2.39 | 175,514 (160,896 cached) | Two ordered changes and two executor commands; explicitly recorded Linux as unresolved without CI evidence |
| Test generation | medium | 0.61 | 110,444 (101,760 cached) | Generated no tests |
| Execution | medium | 3.08 | 446,998 (429,440 cached) | Parent baseline, Windows upgrade build, bytecode check and commit `3031e77` |
| Final validation | medium | 4.02 | 428,583 (390,016 cached) | Rebuilt parent and upgrade on Windows; approved despite Linux gap |
| Automatic approval reviews (4 side threads) | low | 6.66 active | 176,494 (92,672 cached) | Safety/approval-review threads, shown separately from overview-comparable pipeline-agent accounting |

Pipeline-agent total excluding automatic reviews: **3,441,582 input tokens** (3,235,840 cached; 205,742 uncached), 35,369 output tokens including 9,076 reasoning tokens. Notional cost at the overview's GPT-5.5-equivalent rates is **US$3.71**: `0.205742 × $5 + 3.235840 × $0.50 + 0.035369 × $30 = $3.708`. Main-thread wall time is 39.58 minutes; the five stage-agent spans sum to 13.07 minutes inside that interval.

Literal all-thread accounting including the four automatic reviews is **3,618,076 input tokens** (3,328,512 cached; 289,564 uncached), 36,658 output tokens, and **US$4.21**: `0.289564 × $5 + 3.328512 × $0.50 + 0.036658 × $30 = $4.212`. The 09:31 and 09:35 aborted user sessions created no artifact and are excluded, as are later direct-agent sessions that merely rediscovered and validated the already-created commit.

Against R1–R11 in the overview, the comparable US$3.71 cost is 4.6 times below the US$17.15 mean, 3.3 times below the US$12.16 median, and below the previous cheapest pipeline run, R10 at US$7.52. Its 3.44 M input tokens are about one fifth of the 17.37 M mean and one third of the 10.55 M median. Its 39.6-minute wall time is below the 142-minute mean and 73-minute median. This is not workload-normalized: the target has two configuration edits and no runtime service.

## 1.5 LLM configuration

GPT-5.6-sol through Codex CLI 0.154.0, medium effort for the orchestrator and all five stage agents; `codex-auto-review` at low effort for four automatic review threads. Windows 11/PowerShell workspace, Maven 3.9.16, Oracle JDK 21.0.12.1, GitNexus indexed at base `161e0cd` with 109 symbols and 207 relationships. Upgrade-skill version `5acacf4a`, workspace commit `74401589`. Independent verification used separate empty Maven repositories with temporary Maven Central access. Docker client 28.0.4 was present but its Linux engine was unavailable; WSL exposed only stopped `docker-desktop`, so no Linux runtime evidence was available.

## Stage outcomes

| Stage | Result |
| --- | --- |
| Analysis | Correctly narrowed impact to `pom.xml` and `.github/workflows/test.yml`: 2 affected files, 1 high risk, 10 dependency/platform nodes. It scanned all 11 main and 5 test sources, found no required source change or external service, and noted that the workflow covered Linux while local validation needed Windows |
| Plan | Two ordered changes, two planned files, three dependency/config transitions, two executor checks, two content checks and scope-expansion limit 2. It explicitly required positive major-version-65 evidence and a trustworthy parent baseline. It also explicitly said Linux remained unresolved unless Ubuntu CI was observed |
| Execution | After one human-approved dirty-tree intervention, backed up the prior branch, stashed user files and GitNexus metadata, recreated `upgrade/java-21`, generated no tests, captured the 4/0/0/0 parent baseline, applied only the two approved edits, passed Windows Maven and `javap`, and committed `3031e77` with no repair or scope expansion |
| Validation | Diff and content checks passed; Windows parent and upgrade builds both returned 4/0/0/0; `VideoMaker.class` reported 65; no repair. It approved at 1.0 despite never running Linux, contrary to the plan's stated unresolved-gap rule. Independent verification confirms every positive Windows/build claim but not the approval conclusion |

## What was broken afterwards

- **The Linux half of the declared acceptance contract was not verified.** The branch is not on a remote, Docker/WSL Linux was unavailable, and changing an Ubuntu workflow is not evidence that it ran.
- **The workflow does not execute the exact declared command.** It runs `mvn -B verify --file pom.xml`, omitting `clean`; this may still work, but it is not the user's specified Linux oracle.
- **The pipeline's confidence and verdict are miscalibrated.** The planner called missing Linux evidence an explicit unresolved gap, the validator repeated it as a recommendation, then assigned approval and confidence 1.0 anyway.
- **The preservation stashes were not restored at pipeline end.** The final message called the worktree clean while saying both stashes would remain untouched; they still exist today (`codex-upgrade-java-21-preserve-20260925-0950` and the GitNexus-index stash). The user's `.gitignore`, `.claude/`, `AGENTS.md` and `CLAUDE.md` work was preserved but hidden from the working tree rather than restored.
- No product, compilation or test regression was found in commit `3031e77`. The existing behavioural oracle remains weak: two of four tests have empty bodies and one test class has no tests.

## Run-specific recommendations

- Make an explicitly required platform a hard gate. If Linux cannot be run or observed, the decision must be rejected/incomplete regardless of otherwise perfect Windows evidence or confidence arithmetic.
- Run the exact declared command in CI. Here the workflow should use `mvn -B clean verify --file pom.xml`, and the report should capture a workflow run URL/log for commit `3031e77` before crediting Linux.
- Restore preservation stashes before declaring pipeline completion, or stop at a final human restoration gate. A clean status obtained by hiding user work in a stash is not a completed workspace handoff.
- Preserve the strong parts of this run: immutable parent baseline, exact two-file diff, fresh build, positive bytecode assertion and no speculative source edits. For Java release upgrades, extend the bytecode check to every emitted class as this evaluation did; it cost little and proved the test classes also target 21.
- Keep the weak existing tests as a stated limitation rather than rewriting them inside a toolchain upgrade. Adding meaningful `BadFruit`, `Sample` and `FrameRate` behaviour coverage should be a separate task.
- Add a validator invariant that recommendations cannot contradict the verdict: an unmet required success criterion must appear in `rejection_reasons`, not only in `recommendations`.

Compared with the existing overview, this run's **declared and extended FBSR are both 0**, below the overview's 0.27 declared rate and equal to its 0 extended rate. Its **BPR of 1.00** exceeds the overview's pooled 0.58 and R11's 0.87, on a much narrower five-cell checklist with no runtime service. Its **US$3.71 comparable cost** is far below the US$17.15 mean, US$12.16 median and every listed R1–R11 run; even literal all-thread cost including automatic reviews is only US$4.21. The outcome is therefore cheap and behaviourally clean, but not a full success under the user's own cross-platform acceptance rule.
