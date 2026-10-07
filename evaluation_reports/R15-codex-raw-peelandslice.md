# R15 — PeelAndSlice.Java: correct Java 21 edit, incomplete cross-platform proof

The direct Codex session made the requested two-file Java 17-to-21 upgrade correctly and preserved every behaviour observed in this small Maven project. Independent verification on 4 October 2026 resolved all dependencies into empty local repositories, built the base and upgraded trees, reproduced 4/4 passing tests in each under JDK 21, packaged the jar, and found major version 65 in all 17 production and test class files. No source or runtime dependency changed, and a Java 21 breaking-pattern scan found no incompatible use. However, the user's declared contract required the exact Maven build to pass on both Windows and Linux. Windows passed with no Maven flags; Linux was neither run during the session nor independently available today, and changing a GitHub Actions matrix without running it is not evidence that the workflow passed. Under the overview's binary definitions, **C = 1, T(declared) = 0, T(extended) = 0, and FBSR = 0**. The narrow observed behaviour set is fully preserved: **BPR = 1.00, MBR = 0, NBR = 0**. No product defect was found; the failed score is an incomplete validation contract and the result remains an uncommitted working-tree artifact.

| Field | Value |
| --- | --- |
| Chat | Codex session log `C:\Users\jinzh\.codex\sessions\2026\10\04\rollout-2026-10-04T07-57-45-01a10321-2147-7fc2-a46a-799f93c6007c.jsonl`; the upgrade is turn `01a10321-428b-7402-8265-3620ef5a3f56`; no exported `refactored_chats` file |
| Target | `projects/PeelAndSlice.Java`, a single-module Maven library/example project with no executable entry process or service |
| Upgrade request / validation commands | Java source/target 17 → `release 21`; pin `maven-compiler-plugin` 3.16.0; add `project.build.sourceEncoding=UTF-8`; CI matrix `['17']` → `['21']`. Required validation: `mvn -B clean verify --file pom.xml` on Linux and Windows with no extra flags, unchanged test pass/fail counts, class-file major version 65 |
| Branch and commit evaluated | Branch `upgrade/codex-raw`; base/HEAD `161e0cdd6a499d7989c1da4564c3788648643f97`; the evaluated upgrade is the uncommitted diff in `pom.xml` and `.github/workflows/test.yml`, so there is **no upgrade commit hash** |
| Change size | **2 tracked, non-generated files; 9 LoC changed (6 additions, 3 deletions)**. Includes the Maven and CI configuration edits that constitute the entire upgrade; excludes generated build output such as `target/`. No production or test source file changed |
| Run artifacts | No `$upgrade` artifacts. Evidence is the live two-file diff, build outputs, and the single-thread Codex session log. `.codex/upgrade-runs/PeelAndSlice.Java/20260925-093825-upgrade` belongs to a different run and was excluded |
| Tool version | Codex CLI 0.154.0 |
| Pipeline verdict | Not applicable: this was not a pipeline run. The agent reported the Windows build and bytecode checks as passing and explicitly said Linux was “delegated” to the updated workflow; that is not an observed Linux pass |
| Human decisions beyond the two gates | No analysis/plan gates existed and the user made no intervention during the upgrade. The later evaluation clarification only established that no pipeline artifacts should exist |

Independent verification used Maven 3.9.16, Oracle JDK 21.0.12.1 and JDK 17.0.10 on Windows 11. The base commit and upgraded working tree were expanded into separate scratch directories. Each was built under JDK 21 against its own initially empty Maven local repository; the upgraded working tree was also run with the exact no-extra-flags command in the real checkout. Docker was not running and WSL exposed only the internal `docker-desktop` distribution, so Linux execution was unavailable and is recorded as a limitation.

## 1.1 Build effectiveness

| Measure | Result | Independent evidence |
| --- | --- | --- |
| C | **1** | Fresh dependency resolution and `clean verify` completed; the jar was packaged. There is no runtime process to start, so install + compile + test + package is this target's boot equivalent |
| T declared | **0** | Windows exact command passed, 4/4 tests passed and bytecode was 65, but the required Linux run was not observed. “All user-declared checks pass” is therefore not established |
| T extended | **0** | Fresh isolated dependency resolution, base/upgrade comparison and static Java 21 scans found no fault, but extended T cannot pass while the declared Linux cell remains unobserved |
| FBSR | **0** | Declared: `C AND T = 1 AND 0 = 0`; extended: `1 AND 0 = 0` |
| Change size | **2 files / 9 LoC** | Non-generated tracked diff: 6 inserted lines + 3 deleted lines across `pom.xml` and `.github/workflows/test.yml`. `target/` and other generated build output are excluded; production/test source change size is 0 files / 0 LoC |
| Dependency coverage | **All 4 requested configuration changes; no library dependency changes** | `pom.xml:10`, `pom.xml:17`, `pom.xml:19`, `.github/workflows/test.yml:16`. The diff is 6 insertions/3 deletions over two files |
| Syntax/static findings | **No Java 21 incompatibility found** | All 11 production and 5 test sources compile with `release 21`; scan found no `jdk.internal`, `Unsafe`, SecurityManager, Nashorn, JAXB removal, reflective `newInstance`, `--add-opens`, stale `<source>/<target>`, or Java 17 CI entry. `FrameRate.java:4` imports `com.sun.net.httpserver.HttpContext`, but that is the supported exported `jdk.httpserver` API and compiles under `--release 21` |

The effective change is exact. `pom.xml:10` explicitly selects UTF-8, `pom.xml:17` pins compiler plugin 3.16.0, and `pom.xml:19` replaces the separate source/target pair with release 21. The CI matrix is Java 21 at `.github/workflows/test.yml:16`. No application source, test source, library dependency or Surefire version changed.

Fresh resolution matters here because the base's unpinned compiler plugin resolves today to 3.15.0, while the upgraded build resolves the requested 3.16.0. Both trees pass under JDK 21 with the same test result: 4 run, 0 failures, 0 errors, 0 skipped. The plugin change is a minor, not major, transition, and there is no changed runtime dependency for a library migration sweep. The only major boundary is JDK 17 to 21; the source scan and real compilation cover the usual removed/internal API patterns.

The encoding change is justified. Running the unmodified base under JDK 17 on this Windows host fails before tests because Maven uses Cp1252 and cannot decode the Cyrillic identifiers in `BadFruit.java`, `Fruit.java`, and `ОбщиеКонфигурация.java`. Running that same base under JDK 21 passes because JDK 18's UTF-8-by-default behaviour masks the missing property. The new property makes the contract explicit; it is not what causes the JDK 21 build alone to work.

All 17 emitted classes report major version 65: 12 production classes and 5 test classes. `git diff --check` passed. The GitHub workflow was not executed, and its build step is `mvn -B verify --file pom.xml`, not the user's exact `clean verify` command; neither fact is a Linux failure, but both prevent a claimed pass.

## 1.2 Generated tests

No tests were generated and none were requested.

| Test | What it asserts | Result | Classification |
| --- | --- | --- | --- |
| Generated tests | None | Not run | Not classifiable; no confusion-matrix contribution |

Generated-test confusion matrix contribution: TP 0, FP 0, TN 0, FN 0. The four executed tests are pre-existing developer tests. Two exercise EasyMock behaviour; `BadFruitTest.test()` and `SampleTest.test()` have empty bodies, so their green results are vacuous and should not be mistaken for domain coverage.

## 1.3 Behaviour preservation

This target has no UI, server, CLI entry point or datastore. To remain comparable with the earlier C04 evaluation of the same target, the fixed checklist uses its three existing executed test classes, packaging, and the shape of the CI workflow. Runtime evidence is distinguished from declaration/static evidence.

| Behaviour | Status | Evidence |
| --- | --- | --- |
| b1 `ExampleTests` mock return and void-call examples complete | preserved | Runtime: base and upgrade each ran 2 tests with 0 failures/errors; the return-value test asserts 6 and the void example completes without an unexpected invocation |
| b2 `BadFruitTest` continues to complete | preserved | Runtime: base and upgrade each ran 1 test with 0 failures/errors. Limitation: the test body is empty |
| b3 `SampleTest` continues to complete | preserved | Runtime: base and upgrade each ran 1 test with 0 failures/errors. Limitation: the test body is empty |
| b4 the project packages as `peel_and_slice-1.0-SNAPSHOT.jar` | preserved | Runtime/build: both fresh isolated builds and the exact working-tree command produced the jar |
| b5 CI remains a single-JDK Maven verification workflow | preserved | Static: the workflow structure and Maven step are unchanged; only matrix value 17 → 21 changed. The actual Linux workflow was not observed |

Observed 5, preserved 5: **BPR = 5 / 5 = 1.00; MBR = 0 / 5 = 0.00**. No unrequested behaviour was introduced: **NBR = 0 / (5 preserved + 0 new) = 0.00**. The requested ability to emit Java 21 bytecode is not counted as an unrequested new behaviour. Exact equivalence over this narrow checklist is 1.00, but the strength of that result is limited by two empty tests and the absence of any application entry process.

## 1.4 Cost and efficiency

| Thread | Effort | Minutes | Input tokens | Note |
| --- | --- | --- | --- | --- |
| Main Codex thread | medium | 2.27 wall | 186,956 total, 153,728 cached | Single upgrade turn; 33,228 uncached input, 2,468 output tokens including 619 reasoning tokens; no sub-agents or automatic review threads |
| Total |  | **2.27 wall** | **186,956** | One thread only |

Notional cost at the overview's GPT-5.5-equivalent rates is **US$0.32**: `0.033228 × $5 + 0.153728 × $0.50 + 0.002468 × $30 = $0.317`. This is an accounting comparison, not the user's subscription charge. Formal pipeline stage timings do not exist; the session log records 136.35 seconds from task start to completion, including inspection, edit, Maven execution and bytecode inspection.

Against R1–R11 in the overview, this is roughly 54 times cheaper than the US$17.15 mean, 38 times cheaper than the US$12.16 median, and 24 times cheaper than the cheapest listed run (R10, US$7.52). The comparison is not workload-normalized: this run changed two configuration files in a tiny project and had no orchestration or sub-agents.

## 1.5 LLM configuration

GPT-5.6-sol through Codex CLI 0.154.0, medium reasoning effort, Default collaboration mode, one thread, Windows 11/PowerShell. The upgrade used Oracle JDK 21.0.12.1 for the successful build and `javap` checks; Maven 3.9.16 initially reported the shell default JDK as 17.0.10, after which the agent selected the installed JDK 21 through `JAVA_HOME`. Network access was restricted in the Codex sandbox, although Maven dependency artifacts needed by the first run were already available; independent evaluation later performed successful fresh repository resolution.

## Stage outcomes

| Stage | Result |
| --- | --- |
| Analysis | No formal pipeline stage. The agent inspected `pom.xml`, the CI workflow and the dirty state. It correctly identified the four requested configuration edits but did not establish a pre-upgrade test baseline before cleaning the existing `target` directory |
| Plan | No formal plan or approval gate. The implicit two-file plan matched the request exactly and did not expand scope |
| Execution | Applied only the requested changes: UTF-8 property, compiler plugin 3.16.0, release 21, and CI Java 21. No source, dependency or unrelated tracked file changed |
| Validation | Exact Windows Maven command passed with 4/4 tests; all 17 class files were inspected as major 65; diff check passed. It did not run Linux or GitHub Actions, and therefore did not satisfy the complete declared cross-platform oracle |

## What was broken afterwards

- No product or test regression was found in the upgraded working tree.
- The Linux half of the acceptance contract remains unverified. Updating the matrix schedules Java 21 when CI next runs; it does not prove that a run occurred or passed.
- The upgrade is not committed. `HEAD` remains base commit `161e0cd`, with `pom.xml` and `.github/workflows/test.yml` modified in the working tree. The user did not ask for a commit, so this is not an unauthorized omission, but it prevents evaluation of an immutable “actual commit” and leaves the result vulnerable to checkout/reset/cleanup.
- The existing behavioural suite is weak: two of four tests have empty bodies, and `FrameRateTest` declares no tests. A green build provides little coverage of the production examples beyond compilation.

## Run-specific recommendations

- Run the exact `mvn -B clean verify --file pom.xml` command on an actual Linux JDK 21 runner before calling the declared contract complete; record the workflow run URL or raw log as evidence.
- Align the CI command with the declared oracle by adding `clean` if the requirement is intended to guard against stale output, rather than validating locally with `clean` and running only `verify` in CI.
- Commit the two-file result, or explicitly state that delivery is an uncommitted patch. This makes later evaluation and rollback operate on an immutable upgrade artifact.
- Preserve a baseline test-count record before the first `clean`. Here independent reconstruction recovered the 4/0/0/0 baseline under JDK 21, but the upgrade turn itself reported only the post-change count.
- Do not increase scope to repair the empty tests during this upgrade; instead, record their limited signal. Adding behavioural coverage would be a separate task, consistent with the user's instruction not to fix unrelated issues.

Compared with the existing overview, this run's **declared and extended FBSR are 0**, below the overview's 0.27 declared rate and equal to its 0 extended rate; unlike most failed runs, no regression was found—the score is caused solely by an unobserved required platform. Its **BPR of 1.00** exceeds the overview's 0.58 aggregate and R11's 0.87 best reported run, on a much narrower five-cell checklist. Its **US$0.32 notional cost** is far below every listed R-series run and the US$17.15 mean, reflecting the two-file task and absence of pipeline overhead rather than a like-for-like efficiency win.
