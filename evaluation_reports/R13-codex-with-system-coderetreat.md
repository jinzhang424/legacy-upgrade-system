# R18 — coderetreat: complete toolchain upgrade, incomplete validation contract

The pipeline upgraded all 12 independent Gradle roots (22 build scripts), the complete five-project Racing Car tree, and the Gilded Rose TypeScript toolchain. The exact upgrade commit installs, compiles, and boots its only runnable entry task on Java 21 and Node 22. It nevertheless approved a run without executing the two npm workflows the user originally required, substituting Jest discovery and a Mocha dry run. Fresh independent execution on 4 October 2026 finds `npm run test:jest` failing an unchanged placeholder assertion and `npm run test:mocha` failing with `No test files found`. Thus **C = 1, T(declared) = 0, T(extended) = 0, and FBSR = 0**. No production source changed; 16 observed behaviour cells are preserved and one GUI cell is not observed, so BPR is 1.00. Including the orchestrator, five stage agents, and four automatic guardian-review threads, the run consumed 29.6M input tokens at a notional cost of US$24.89.

| Field | Value |
| --- | --- |
| Chat | Full orchestrator log `C:\Users\jinzh\.codex\sessions\2026\09\24\rollout-2026-09-24T21-58-30-01a0d2da-320f-7a50-ad4e-460974b9c92f.jsonl`, plus five stage-agent and four guardian-review logs linked by session ID; no matching `refactored_chats` export was present |
| Target | `projects/coderetreat` |
| Upgrade request / validation commands | Gradle 8.10.2, Java 21 runtime/source compatibility 17, the specified Java dependencies, Node 22 and TypeScript dependencies, and every kata's complete module tree; specifically `npm install && npm run test:jest`, `npm run test:mocha`, then the build/test workflow for every kata |
| Branch and commit evaluated | `upgrade/modernize-java21-node22-gradle8102`, upgrade commit `736a30251cb7bcbbfa50b85e07aa03c7cd2c7d3f`, base `03473638b07f5cebd74ecb49134223222139c3ec` |
| Run artifacts | `.codex/upgrade-runs/coderetreat/20260924-215856-upgrade/{impact-report,change-plan,execution-result,validation-report}.json` |
| Tool version | Codex CLI 0.154.0; upgrade skill at `5acacf4ae770a74b1875cc66cd3ac84311072175` |
| Pipeline verdict | **Approved**, confidence 0.90, final commit `736a302`; 39/39 content checks passed, 17/19 command records passed and two were skipped (no startup or generated tests), with no validator repair |
| Human decisions beyond the two gates | Six: authorize the first plan revision; approve the Dijkstra package revision; clarify that intentional red assertions need not be repaired; approve the compilation-only Java plan; approve non-asserting Jest/Mocha validation; continue after the usage-limit pause |

The target repository is checked out on the named upgrade branch today. Its current branch HEAD is `515627f` (`random new images`), one commit after the pipeline's recorded output; that later commit adds agent material, generated JS/tests, coverage data, and ChartSmart received images. All results below come from a fresh export of the exact artifact commit `736a302`, not the later branch content. The independent environment was Java 21.0.12.1, Node 22.22.2, and npm 12.0.2. There is no service or datastore in scope. Trivia's `runGameRunner` is the only explicit runnable Gradle task found and completed successfully.

## 1.1 Build effectiveness

| Measure | Result | Independent evidence |
| --- | --- | --- |
| C | **1** | Fresh `npm install` completed; all 12 Gradle wrapper roots ran `clean classes testClasses` successfully, including all five Racing Car children; Trivia `runGameRunner` exited 0 |
| T declared | **0** | `npm run test:jest` exited 1 on the unchanged `fixme` expectation; `npm run test:mocha` exited 1 with `No test files found`. The later instruction not to repair starter assertions explains the Jest failure but does not turn either declared command into a pass, and does not excuse Mocha's discovery failure |
| T extended | **0** | Full Gradle `test --continue`: 2 roots passed and 10 failed. Nine failures are existing starter/red tests; ChartSmart's five ApprovalTests failed Windows 11 image comparisons. The original npm workflows also fail |
| FBSR | **0** | Declared: `C AND T = 1 AND 0 = 0`. Extended: `1 AND 0 = 0` |
| Dependency coverage | **All requested direct targets; 128/128 planned dependency changes and 75/75 planned files** | 12/12 wrapper properties select 8.10.2; all 22 `build.gradle` files declare source compatibility 17; requested Java and npm versions match |
| Syntax/static findings | Requested legacy patterns removed | No active `jcenter()`, `compile`, `testCompile`, malformed `1.10`, or `ts-jest/utils`; remaining `compile`/`testCompile` matches are comments. Rimraf scripts use `--glob` at `refactoring/gildedrose/js/package.json:6` and `:8` |

The upgrade changes themselves compile. Every independent settings tree was covered, including Dijkstra, Movie Rental, Bowling, Game of Life and String Calculator's included `java` projects, plus all Racing Car children. The exact diff contains 75 files and no `src/main` or `app` production file. Mockito 2-to-5, TypeScript 4-to-5, Jest/ts-jest 27-to-29, Mocha 9-to-10, rimraf 3-to-5, and Gradle major-version scans found no remaining removed configuration or old import pattern. Java production code does not directly import SLF4J, Guava, Mockito, or JUnit; test consumers compile against the new versions.

The regression in the validation contract is at `refactoring/gildedrose/js/package.json:9-13`. The final plan changed Java validation to `classes testClasses`, added `validate:jest` using `--listTests`, and added `validate:mocha` using `--dry-run`. These demonstrate compilation and tool loading, not the workflows named by the user. The real Jest spec still expects `fixme` at `refactoring/gildedrose/js/test/jest/gilded-rose.spec.ts:7` and receives `foo`. The real Mocha command remains only `nyc mocha` at `package.json:11`, so it does not discover `test/mocha/**/*.spec.ts`. The user's later clarification permits leaving intentional kata assertions red; it does not make `No test files found` a working Mocha workflow.

The Dijkstra compatibility edit is correctly limited to changing `package java.dijkstra` to `package dijkstra` at `algorithm/dijkstra/java/src/test/java/dijkstra/DijkstraAlgorithmTest.java:1`; the intentional failing assertion remains at line 19. `skipLibCheck: true` at `refactoring/gildedrose/js/tsconfig.json:6` makes TypeScript compile but suppresses declaration checking for every library rather than isolating the Jest/Mocha ambient-type conflict.

## 1.2 Generated tests

| Test | What it asserts | Result | Classification |
| --- | --- | --- | --- |
| Generated test files | None | No generated tests were produced or run | Not classifiable; no confusion-matrix contribution |
| `npm run validate:jest` (pipeline-added surrogate) | Jest config and ts-jest load and one spec is discoverable; no assertion executes | Passes while `npm run test:jest` fails | **False negative** at process-validation level; not a generated test |
| `npm run validate:mocha` (pipeline-added surrogate) | Mocha, ts-node, and tsconfig-paths dry-load the explicit TypeScript glob; no assertion executes | Passes while `npm run test:mocha` finds no tests | **False negative** at process-validation level; not a generated test |

Generated-test confusion matrix: TP 0, FP 0, TN 0, FN 0 because the stage generated no tests; accuracy, precision, recall, and F1 are undefined. If the two added validation surrogates are scored separately as predictions that their corresponding workflows work, their contribution is TP 0, FP 0, TN 0, **FN 2**. Their false negatives arise from replacing the declared commands with weaker commands, not from faulty generated assertions.

## 1.3 Behaviour preservation

The fixed checklist uses one cell per independently meaningful kata/application module, splitting Racing Car into its five children and treating the Java and TypeScript Gilded Rose implementations separately. Runtime evidence is preferred. Static preservation is used only where production source is byte-identical and the module compiles without directly exercising the upgraded library at runtime. ChartSmart is marked not observed because its image oracle fails and no same-environment base run is available.

| Behaviour | Status | Evidence |
| --- | --- | --- |
| b1 Dijkstra algorithm starter API/output remains unchanged | preserved | Static: production source byte-identical; Java 21 main/test compilation passes. The unrelated placeholder assertion remains red |
| b2 ChartSmart data/window/chart rendering remains equivalent | not observed | Runtime limitation: all five ApprovalTests loaded but failed approved-versus-received Windows 11 image comparisons at `ChartSmartTest.java:17,24,32,40,48`; without an equivalent base run the difference cannot be attributed or dismissed |
| b3 Gilded Rose Java preserves an ordinary item's name | preserved | Runtime: upgraded JUnit executes the existing spec and reports actual name `foo`; production source is byte-identical |
| b4 Gilded Rose TypeScript preserves an ordinary item's name | preserved | Runtime: Jest executes the spec and reports actual name `foo`; `app/gilded-rose.ts` is byte-identical |
| b5 Movie Rental statement behaviour remains valid | preserved | Runtime: its existing test passes |
| b6 Racing Car leaderboard ordering/ranking remains valid | preserved | Runtime: four existing leaderboard/race tests pass |
| b7 Racing Car telemetry diagnostics remain valid | preserved | Runtime: the existing telemetry test passes |
| b8 Racing Car text conversion behaviour remains unchanged | preserved | Static: production source byte-identical and compiles; two existing starter tests remain red, including one missing fixture |
| b9 Racing Car tire-pressure alarm behaviour remains valid | preserved | Runtime: the existing alarm test passes |
| b10 Racing Car ticket sequencing remains unchanged | preserved | Static: production source byte-identical; module compiles and has no test |
| b11 Tennis scoring remains valid across implementations | preserved | Runtime: all 99 parameterized tests pass |
| b12 Trivia game can start and finish a game | preserved | Runtime: `gradlew runGameRunner` exits 0 |
| b13 Bowling Game starter behaviour remains unchanged | preserved | Static: production source byte-identical and compiles; intentional sample assertion remains red |
| b14 Game of Life starter behaviour remains unchanged | preserved | Static: production source byte-identical and compiles; intentional sample assertion remains red |
| b15 Minesweeper starter behaviour remains unchanged | preserved | Static: production source byte-identical and compiles; placeholder assertion remains red |
| b16 RPG Combat starter behaviour remains unchanged | preserved | Static: production source byte-identical and compiles; dummy test remains red |
| b17 String Calculator starter behaviour remains unchanged | preserved | Static: production source byte-identical and compiles; intentional sample assertion remains red |

Observed 16, preserved 16: **BPR = 16 / 16 = 1.00**. Missing 0 of 16 observed: **MBR = 0 / 16 = 0.00**. One cell is not observed and is excluded. No new application behaviour was found: **NBR = 0 / (16 preserved + 0 new) = 0.00**. This high BPR is narrow rather than proof that every GUI effect is identical: the commit changes only build, wrapper, test configuration, one test package declaration, and the npm lockfile, while ChartSmart remains explicitly unclassified.

## 1.4 Cost and efficiency

| Thread | Effort | Minutes | Input tokens | Note |
| --- | --- | --- | --- | --- |
| Orchestrator | medium | 614 wall; about 112 active | 5,580,876 | Ten turns; wall time includes approval waits and about 469 minutes blocked by account quota |
| Repository analysis | medium | 5.5 | 1,032,189 | 93 affected files, 33 high risk; complete module-tree discovery |
| Analysis guardian | automatic / not recorded | 0.8 span | 109,003 | Automatic review thread; overlaps the analysis stage |
| Planning | medium | 97 span; about 23 active | 6,370,748 | Initial plan plus revisions after compatibility failures and user clarification |
| Planning guardian | automatic / not recorded | 89 span | 768,292 | Automatic review thread; overlaps planning and approval waiting |
| Test generation | medium | 0.8 | 172,109 | Produced no tests |
| Execution | medium | 557 span; about 58 active | 12,817,777 | Five attempts/continuations; span includes the quota pause |
| Execution guardian | automatic / not recorded | 548 span | 369,720 | Automatic review thread; overlaps execution and the quota pause |
| Final validation | medium | 13.6 | 1,950,164 | Approved at 0.90 using the weakened final plan |
| Validation guardian | automatic / not recorded | 11.5 span | 385,340 | Automatic review thread; overlaps validation |
| Total | — | **614 main-thread wall** | **29,556,218** | 28,345,728 cached; 1,210,490 uncached; output 155,475; reasoning 39,036 |

Notional cost is **US$24.89** using the overview's GPT-5.5-equivalent rates: `(1.210490M × US$5) + (28.345728M × US$0.50) + (0.155475M × US$30) = US$6.05 + US$14.17 + US$4.66 = US$24.89`. The cache share is 95.9%. The complete input count is 5.30 times the orchestrator thread's 5.58M, illustrating why the main-thread status line understates usage. Guardian spans overlap their corresponding stages and are not added to wall time.

Against the eleven runs in the overview, 29.6M input tokens exceed the 17.4M mean and 10.5M median. US$24.89 exceeds the existing US$17.15 mean and US$12.16 median and would be the second-highest cost, after R11's US$52.71 and above R8's US$22.91. The 614-minute wall time is more than four times the 142-minute mean and second only to R11's 784 minutes.

## 1.5 LLM configuration

The orchestrator and five stage agents used GPT-5.6-sol through Codex CLI 0.154.0 at medium effort on Windows 11. The four guardian-review logs do not record a model or effort in session metadata, so those fields cannot be verified; their token usage is nevertheless included. The upgrade-skill revision was `5acacf4`. GitNexus indexing supported discovery, supplemented by exact filesystem and manifest scans. Independent verification used Java 21.0.12.1, Node 22.22.2, npm 12.0.2, and Gradle 8.10.2 wrappers.

## Stage outcomes

| Stage | Result |
| --- | --- |
| Analysis | Correctly found 12 independent wrapper roots, all 22 build scripts, 93 affected files (33 high risk), 41 dependency-graph nodes, and 87 edges; it identified Gradle configuration removal, JCenter shutdown, rimraf glob semantics, ts-jest import removal, Mockito 5, and TypeScript/Mocha risks |
| Plan | Ended at 75 ordered files, 128 expected dependency changes, and 17 checks. After real tests failed, revisions replaced Java test execution with compilation and the two named npm workflows with discovery/dry-run surrogates |
| Execution | Attempt 1 exposed the illegal `java.dijkstra` package; attempt 2 reached the intentional Dijkstra failure; attempt 3 reached the Jest assertion. The final continuation passed 12 Gradle compilation checks, npm install, TypeScript compilation, and two non-asserting JS checks, then committed `736a302` |
| Validation | Rechecked 39 content rules and recorded 17 passed commands plus two skipped categories, made no repair, and approved at 0.90. It did not run either original npm command or any Gradle test method, so it missed both declared-workflow failures and the extended matrix |

## What was broken afterwards

- `npm run test:jest` exits 1: the unchanged starter expectation at `refactoring/gildedrose/js/test/jest/gilded-rose.spec.ts:7` expects `fixme`, while the application returns `foo`. This is not an upgrade-caused application regression, but the declared command does not pass.
- `npm run test:mocha` exits 1 before assertions with `No test files found`; `refactoring/gildedrose/js/package.json:11` neither registers TypeScript nor selects the repository's Mocha spec glob. This is a runnable-workflow defect, not an intentional red assertion.
- Full Gradle tests are not green: Movie Rental and Tennis pass; nine roots fail existing red/starter tests; ChartSmart is the tenth failing root with five Windows 11 image comparisons. The lack of production-source changes means these failures are not automatically upgrade regressions, but they contradict the original instruction to confirm every workflow passes.
- Fresh npm installation reports 42 audit findings (1 low, 4 moderate, 37 high), versus 16 mentioned by the pipeline's validation report; audit data is time-dependent, but neither result was dispositioned as part of the run.
- The Mocha dry run emits Node's `MODULE_TYPELESS_PACKAGE_JSON` warning, and every Gradle build reports deprecated features that will be incompatible with Gradle 9.

## Run-specific recommendations

- Preserve user commands verbatim as immutable acceptance checks. `--listTests`, `--dry-run`, and `testClasses` may be supplementary diagnostics, but they must not replace `test:jest`, `test:mocha`, or actual Gradle tests in the verdict.
- Distinguish a waived pre-existing assertion from a passing workflow. The user's clarification allows starter tests to remain red; it does not justify reporting their commands as passed or treating `No test files found` as compatibility evidence.
- Repair Mocha discovery independently of the placeholder assertion: register `ts-node`/`tsconfig-paths` and select `test/mocha/**/*.spec.ts`, then show that the declared command reaches its assertion.
- Run failing checks on the base under the same JDK, OS, and dependency conditions before attributing them. This is especially important for ChartSmart's five approved-versus-received images.
- Replace global `skipLibCheck` with separate Jest/Mocha TypeScript configurations or scoped `types` arrays so upgraded declaration packages remain checked.
- Report multiproject results at child level. Racing Car's leaderboard, telemetry, and alarm suites pass even though text converter makes the aggregate root fail.
- Include automatic guardian-review logs in usage accounting. In this run they add 1,632,355 input and 4,132 output tokens, raising notional cost by about US$2.92.
- Surface npm audit and Gradle deprecation output as non-blocking debt with explicit ownership rather than allowing it to disappear behind successful compile commands.

Compared with the overview, this run's declared and extended **FBSR are both 0**: below the existing declared rate of 0.27 and equal to the existing extended rate of 0. Its **BPR is 1.00**, above the previous best of 0.87; adding its 16 observed preserved cells would move the pooled BPR from `74/128 = 0.58` to `90/144 = 0.63`. Its **US$24.89** notional cost is above both existing central measures and would rank second-highest among the pipeline runs.
