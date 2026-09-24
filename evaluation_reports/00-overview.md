# Legacy Upgrade Pipeline Evaluation

As of 2026-09-24. Combined view of the eleven per-run reports in this folder (R11, Conifer, added 24 Sep). Online copy (ten-run version): https://claude.ai/code/artifact/ab89e6e2-f20c-4d18-b147-f35dba010a07

## Summary of findings

Across eleven runs (nine on tv-radio, one on codemirror5, one on Conifer, 19 Jun to 21 Sep 2026) the pipeline never produced an upgrade that both runs and preserves the application's observable behaviour: FBSR is 0.27 against the checks each user asked for and 0 once the faults found straight afterwards, or by an independent oracle, are counted. R11 is the closest: it passed every declared check and preserved 27 of 31 behaviours.

| Metric | Value | Basis |
| --- | --- | --- |
| Compilation success rate (CSR) | 0.82 | 9 of 11 run outputs install and load; R1 and R6 crash before serving |
| Testing success rate (TSR) | 0.33 declared, 0 extended | 3 of 9 compiled runs passed the user's declared checks (R4, R5, R11); none survived the user's immediate manual checks or, for R11, the independent oracle |
| Full build success rate (FBSR) | 0.27 declared, 0 extended | R4, R5 and R11 on declared checks only |
| Generated-test accuracy / precision / recall / F1 | 0.40 / 1.00 / 0.40 / 0.57 literal; 0 / 0 / 0 / 0 on real detections | no generated test ever failed because of an actual regression |
| Exact behaviour equivalence rate (EBER) | 0 | every run lost at least one reference behaviour |
| Behaviour preservation rate (BPR) / missing (MBR) | 0.58 / 0.42 | 74 of 128 observed behaviour cells preserved; best run R11 at 0.87, best tv-radio run R9 at 0.75 |
| New behaviour rate (NBR) | 0.05 | 4 unrequested additions |
| Tokens per run | mean 17.5 M, median 10.7 M (94% cached) | all threads, from session logs |
| Notional cost per run | mean US$17.15, median US$12.16; total US$188.67 | GPT-5.5 list prices |
| Wall time per run | mean 142 min, median 73 min | main Codex thread, includes approval waits (R11: 784 min including a usage-limit lockout) |
| Dependency coverage | 49 of 51 entries bumped in every full-scope tv-radio run; R11: 74 of 103 frontend entries, all backend pins and base images | the two tv-radio holdouts have no newer release; R11 stopped React at 17 and react-router at 5 |

The headline conclusions:

- **Approval is not correctness.** The four approved runs (R1, R2, R4, R11) all shipped a frontend that cannot serve some pages correctly; the rejections of R3 and R5 were about agent files in the diff, not about the code. Confidence scores of 0.82 to 0.86 sat on broken builds.
- **Dependency bumping works; behavioural migration does not.** Every full-scope run updated 49 of 51 manifest entries, but five behavioural breaks that keep the call signature (Express 5 routes and query objects, uglify-js 3 input, async 3 queue callbacks, winston 3 with legacy logstash, influx 5) recurred run after run until the user listed them in the prompt for R9.
- **Generated tests added cost and no signal.** Ten runs, zero real detections, four failures caused by the tests' own wrong expectations or, in R11, a stale developer test that the validator made pass by changing application code.
- **The validator improved late.** Its Playwright and key-page checks caught real regressions in R8 and R9; before that it approved or rejected on diff hygiene.
- **True cost is 3 to 8 times the number in the transcripts.** The orchestrator's status line omits the sub-agent threads, and the execution sub-agent alone can use 13 M input tokens in one rerun.
- **Every run needed 1 to 4 human decisions beyond the two designed gates**, mostly for a dirty working tree and out-of-plan files, and three runs needed a further manual repair session afterwards.
- **Declared checks bound the verdict (R11).** With the most detailed prompt of any run, Conifer passed all declared pages, flows and service checks, yet an independent oracle run on both versions found the collection page crashing on the server (`react-tabs` 6 needs React 18; React stayed on 17), bookmark lists and the recording index broken by an unplanned transitive jump of redis-py from 2.10.6 to 6.1.1, 122 developer tests flipping from pass to fail in a suite the pipeline ran one file of, and an access-control check removed by the validator to satisfy a stale developer test. It was also the most expensive run: 65 M input tokens, US$52.71.

## Scope, evidence and method

Eleven `$upgrade` runs were evaluated: nine against tv-radio (a Node.js monorepo with 8 npm packages, Express 4, MongoDB 2, Solr 4.9 era), one against codemirror5 (build and test toolchain only) and one against Conifer (a Dockerised Python Bottle/pywb backend and React SSR frontend with Redis and Solr; see R11 for its own method, which ran the original and upgraded stacks side by side under one oracle script). Where the pipeline's own verdict and independent verification disagree, both are shown and labelled.

Evidence sources:

- The eleven transcripts in `refactored_chats/`, including the user's notes on stage timings, token counts and the faults found by hand after each run.
- The run artifacts under `.codex/upgrade-runs/`: impact report, change plan, execution result and validation report for each run.
- The upgrade branches in `projects/tv-radio` and `projects/codemirror5`. Every upgrade commit was located, diffed against the original source (`c094824`), scanned for known breaking patterns, syntax-checked, and booted (frontend and Admin API) after a fresh `npm install` per commit on 18 Sep 2026. For R11, `projects/conifer` at `40be3587` and the original `c406b480` were both built and run as full Docker stacks on 24 Sep 2026 and scored by the same browser/API oracle and by the repo's own pytest suite.
- The Codex session logs in `~/.codex/sessions`, which hold exact token usage, model and reasoning effort for the main thread and every sub-agent thread of each run.

How each framework metric was operationalised:

| Framework metric | Measured here as |
| --- | --- |
| Compilation success (C) | Node has no compile step. C = 1 when dependency install succeeds and every in-scope entry process (frontend `app.js`, Admin API `app.js`; for CodeMirror `npm run build`) loads all modules and registers all routes without exiting. Checked by booting each commit today. |
| Testing success (T) | tv-radio has no developer test suite, so the external oracle for a run is the set of acceptance checks the user asked for in that run (startup URLs, `chapman.js` CLI commands, browser pages and flows) plus faults the user hit manually straight after the run. T = 1 only when all of them pass. CodeMirror: `npm test`. Conifer: the user's declared checks (declared T), and an independent oracle plus the repo's 33-file pytest suite run on both versions (extended T). |
| Full build success (FBSR) | C and T both 1. |
| Generated-test quality | Instance = one run in which generated tests were executed (10 of 11). y = 1 when a genuine behavioural violation existed after the run; the prediction is whether the generated tests failed, and whether that failure pointed at the violation. |
| Behaviour preservation | A fixed set of thirteen observable tv-radio behaviours (section 6). Each cell is marked from a pipeline check, a user report, a deterministic static check, or today's boot. Unobserved cells are excluded from denominators. |
| Token consumption and cost | Tokens from the session logs, all threads of a run. Cost at the GPT-5.5 list prices quoted in the 19 Jun transcript: US$5 per million uncached input, US$0.50 per million cached input, US$30 per million output (reasoning tokens are output). The runs used a Codex subscription, so cost is notional. |
| Execution time | Wall-clock of the main Codex thread (this includes waiting at approval gates), plus agent-active time summed from the stage timings the user noted in the chats. |

Limits of today's verification: MongoDB, Solr and Memcached were not running, so only boot and route-level probes were possible; data-dependent behaviour comes from run-time evidence in the artifacts and chats. The original frontend could not be booted because its manifest pins `memcached` to an internal `git+ssh` URL that no longer resolves, so baseline behaviours are taken as working from the user's context.

## Run inventory

Nine tv-radio runs, one CodeMirror run and one Conifer run, 19 Jun to 21 Sep 2026. "Extra decisions" counts human interventions beyond the two standard approval gates (analysis, plan).

| Run | Date | Target and scope | Branch · commit evaluated | Checks the user asked for | Pipeline verdict | Extra decisions |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | 19 Jun | tv-radio, all 8 packages | upgrade/upgrade-any-outdated-dependencies-found · 82dd113 | none given | Approved, confidence 0.82, no repairs | 1 |
| R2 | 23 Jun | tv-radio frontend only (admin excluded by user) | upgrade/upgrade-outdated-dependencies-20260623 · 3874441 | `node app.js` in frontend | Approved, 0.86, 2 route repairs, 2 scope expansions | 3 |
| R3 | 26 Jun | tv-radio, all packages | upgrade/outdated-dependencies · 2fce97d | `npm install` and `node app.js` for frontend and Admin API | Rejected, 0.78, only because unplanned files were in the diff | 2 |
| R4 | 29 Jun | tv-radio, all packages | upgrade/upgrade-outdated-deps-20260629 · 5c55798 | Admin API on :8080, frontend on :8082 | Approved, 0.86, no repairs | 1 |
| R5 | 13 Jul | tv-radio, all packages | upgrade/upgrade-any-outdated-dependencies-found · 3a75d06 | Admin, frontend, `chapman.js index` | Rejected, 0.82, unplanned files; 1 scope expansion, 1 command-directory correction | 3 |
| R6 | 1 Aug | tv-radio, all packages plus Solr | upgrade/upgrade-outdated-dependencies-solr · no upgrade commit | Admin, frontend, 4 `chapman.js` commands | Execution failed three times on files outside the plan; abandoned | 3 |
| R7 | 2 Aug | as R6 | same branch · b3455d5 | as R6 | Rejected, 0.62: 49 malformed content checks, validator probe defect, unplanned files | 2 |
| R8 | 5 Aug | as R7 plus vendored Ember, jQuery and Socket.IO client | upgrade/dependency-modernization-solr · 44970c6 | Admin, frontend, 4 `chapman.js` commands, browser console | Rejected, 0.78: favicon 404s, unplanned files; validator repaired the client bundle | 4 |
| R9 | 10 Aug | as R8 plus explicit Express 5, async 3 and uglify-js sweeps, output-checked CLI, key pages and a search flow | upgrade/upgrade-any-outdated-dependencies-found · 9a60a71 | Admin, frontend, `/search/`, homepage search flow, 4 `chapman.js` commands with record checks | Rejected, 0.42: search page and flow broken, generated test failing, Solr live config unverified | 3 |
| R10 | 14 Sep | codemirror5 dev toolchain: rollup 1 to 4, puppeteer 1 to 25, plugin-buble, cm5-vim | upgrade/devdependency-toolchain-rollup-puppeteer · uncommitted working tree | `npm install`, `npm run build`, `npm test`, 5 demo pages | Execution failed: `npm test` has 5 assertion failures after 4 repair rounds; no commit | 3 |
| R11 | 21 Sep | Conifer full stack: 5 manifests, 5 Dockerfiles, 2 Compose files; repair 3 start-up failures at HEAD | upgrade/dependency-modernization · 40be3587 | `docker compose build`, 12-service `up`, SSR title, 4 key pages, 2 key flows, Redis and Solr live checks | Approved, 0.38, 11 repair groups; validation done by the orchestrator after the validator hit the usage limit | 3 |

Three further pipeline runs left artifacts and branches but no transcript (20 Jun, 22 Jun and 14 Jul; the 14 Jul run was approved at confidence 0.97) and are excluded from the metrics. Every tv-radio run started from a dirty working tree (agent instruction files), which forced a pre-upgrade commit in nine of ten runs and later caused most "unplanned files" rejections.

## Build effectiveness

CSR is 0.82 (9 of 11 runs produce processes that load), TSR is 0.33 against the checks each user asked for and 0 once the faults the user found immediately afterwards (or, for R11, the independent oracle) are included, so FBSR is 0.27 at best and 0 in practice. The pipeline itself approved four runs; all four shipped a frontend that cannot serve some of its pages correctly.

| Run | Pipeline verdict | C: install and boot (verified today) | T: user's declared checks | T: including faults found straight after | Dependency entries upgraded (of 51) |
| --- | --- | --- | --- | --- | --- |
| R1 | Approved 0.82 | 0. Frontend exits on load: `influx is not a function` (`metrics.js` untouched after influx 4 to 5); 6 bare `*` routes would also fail under Express 5. Admin API boots. | 0 (no checks declared; app cannot run) | 0 | 49 |
| R2 | Approved 0.86 | 1. Frontend loads; Admin untouched. | 1 (frontend `node app.js` passed) | 0: `uuid` removed from the manifest but still required by two content modules | 21 (frontend only, by user's choice) |
| R3 | Rejected 0.78 | 1 | 0: user reports the Admin API did not respond | 0 | 49 |
| R4 | Approved 0.86 | 1 | 1 (both URLs answered) | 0: `chapman.js index` fails; Admin title search throws | 49 |
| R5 | Rejected 0.82 | 1 | 1 (Admin, frontend, `chapman.js index` passed) | 0: Admin title search throws; geodata ingest broken | 49 |
| R6 | Failed, no commit | 0. Frontend exits on load: `winston.transports.Logstash is not a constructor` | 0 | 0 | 49 (uncommitted) |
| R7 | Rejected 0.62 | 1 | 0: validator's own startup checks failed (probe defect); user found 7 faults | 0 | 49 |
| R8 | Rejected 0.78 | 1 | 0: browser console errors | 0 | 49 |
| R9 | Rejected 0.42 | 1 | 0: `/search/` and the search flow render the error page | 0 | 49 |
| R10 | Failed, no commit | 1: `npm run build` regenerates all four outputs | 0: `npm test` has 5 failing assertions | 0 | 4 of 4 |
| R11 | Approved 0.38 | 1. Original and upgraded Docker stacks both run end to end today | 1 (all pages, flows and service checks pass, reproduced today) | 0: independent oracle finds the collection page returning 504 (SSR `useId` crash) and anonymous API collection creation newly allowed | 74 of 103 frontend; all backend and base images |
| Rate | 4 approved of 11 | CSR 9 of 11 = 0.82 | TSR 3 of 9 = 0.33; FBSR 0.27 | TSR 0; FBSR 0 | |

What "boot" proved today: every run commit was installed fresh and started. The Admin API served HTTP 200 on its root in all nine tv-radio commits. The frontend loaded its modules in eight of nine; it then waited for MongoDB (not running today), so route registration and page serving come from the pipeline's own runs and the user's checks. R1 and R6 crash before that point regardless of the database. CodeMirror's build passed in 6 s today; `npm test` reproduced the same five failures (`core_move_bidi` twice, `core_bidi_wrapped_selection`, `scroll_movedown_resize`, `scroll_movedown_hscroll_resize`) in 18 s.

The two runs that met their declared checks (R4, R5) did so because the declared checks were shallow: an HTTP 200 on `/` and, for R5, one CLI command against an empty index. Neither exercised the Admin search endpoint, the frontend search page, the client bundle or the geodata ingest, all of which were broken in both. The pipeline's approve/reject decision tracked diff hygiene rather than correctness: R3 and R5 were rejected only for agent instruction files in the diff, while R1, R2 and R4 were approved.

## Quality of LLM-generated tests

The generated tests detected none of the real regressions in any run. The only times they failed, the cause was a wrong expectation inside the test itself, and the validator then rewrote the test to pass.

| Run | Generated tests | Result when run | Real violation present after the run | Did a test failure point at it |
| --- | --- | --- | --- | --- |
| R1 | 1 smoke (`node --test`, checks manifest versions and `require` of modules) | passed | yes: frontend cannot load (`influx is not a function`), 6 bare-wildcard routes with Express 5 | no |
| R2 | 1 smoke, 1 integration (frontend) | passed | yes: `uuid` removed from the manifest but still required by 2 content modules | no |
| R3 | 1 smoke, 1 source-migration integration | passed | yes: Admin API did not respond for the user; `request.query.hasOwnProperty` calls under Express 5 | no |
| R4 | 1 smoke, 1 Mongo-backup integration | passed (integration needed 1 executor repair) | yes: `chapman.js index` fails; `hasOwnProperty` calls | no |
| R5 | 1 smoke | failed on stale version strings; validator rewrote the expectations | yes: `hasOwnProperty` calls; geodata ingest broken by async 3 | no (spurious failure) |
| R6 | 2 Solr tests written | never executed | not applicable | excluded |
| R7 | Solr smoke, Solr round-trip integration | passed | yes: client bundle emits filenames, `/search/` 404, `hasOwnProperty` crash, geodata 400, template crash | no |
| R8 | Socket.IO auth smoke, DirectDB fixture integration | passed | yes: client bundle (found by validator), `hasOwnProperty` crash, `/api//...` 404s, Socket.IO authorisation failure in the browser | no; the auth smoke test passed while the real handshake failed |
| R9 | 1 smoke, 1 Admin programmes integration | smoke failed on a csv version string; integration failed after 3 repairs on a missing mock | yes: `/search/` and the search flow render the error page | no (spurious failures) |
| R10 | 1 toolchain smoke (versions, build outputs, Vim demo) | fails today: expects the text `module.exports` in `runmode.node.js` | yes: `npm test` has 5 assertion failures | no (spurious failure) |
| R11 | none written; 2 existing developer tests recorded (frontend `TempUserTimer`, backend `test_colls_api.py`) | `test_colls_api.py` failed with 403 on anonymous collection creation; the orchestrator changed application access control until it passed | yes: collection page crashes on the server (504) | no: the 403 was the original's intended behaviour (the test was stale), and the "repair" introduced a new behaviour |

Confusion matrix over the ten executed runs, with the prediction taken literally as "the generated tests failed":

| | Violation present (y = 1) | No violation (y = 0) |
| --- | --- | --- |
| Tests failed (ŷ = 1) | TP = 4 (R5, R9, R10, R11) | FP = 0 |
| Tests passed (ŷ = 0) | FN = 6 | TN = 0 |

Accuracy 0.40, precision 1.00, recall 0.40, F1 0.57. These numbers flatter the tests: each of the four "true positives" failed for a reason unrelated to the actual regression, and the validator's response in R5, R9 and R11 was to edit the test (or, in R11, the application) until it passed. Scoring a failure as a detection only when it identifies a real broken behaviour gives TP = 0, FN = 10, FP = 4, so precision, recall and F1 are all 0. At behaviour level (section 6) recall is also 0: none of the broken behaviour cells was flagged by a generated test.

Why the tests miss: they assert manifest version strings, that modules can be required, and that mocked handlers return mocked data. None of them start the real server, hit a real route, or drive the CLI against the search index, which is where every regression surfaced.

## Behaviour preservation

No run is behaviourally equivalent to the original (EBER 0). Across the observed cells, 74 of 128 reference behaviours survived (BPR 0.58, MBR 0.42), and 4 unrequested behaviours were introduced (NBR 0.05). The best run, R11 on Conifer, preserved 27 of 31; among tv-radio runs, R9 preserved 9 of 12 observed behaviours, and R2 also scored 9 of 12 but only because it left 30 of 51 dependency entries untouched. The pooled figures mix three behaviour sets of different size (13, 2 and 31); without R11 the pooled BPR is 0.48.

Reference behaviours and how each cell was observed. P = preserved, M = missing, blank = not observed (excluded from denominators).

| Behaviour | Evidence type | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| b1 Frontend loads all modules | booted today; R6 from its startup log | M | P | P | P | P | M | P | P | P |
| b2 Frontend registers routes and serves `/` | pipeline startup checks and user reports; R1 by the Express 5 wildcard mechanism | M | P | P | P | P | M | P | P | P |
| b3 Frontend content modules resolve their dependencies | static: `require("uuid")` vs manifest | M | M | P | P | P | M | P | P | P |
| b4 Bare `/search/` route matches | route pattern per commit; R7 confirmed by user | M | M | P | P | P | M | M | P | P |
| b5 Search page renders without a template error | user reports and validator key-page check | | | | | | | M | M | M |
| b6 Client bundle `/libs/client.js` is valid JavaScript | `uglify.minify` call shape; R7 and R8 observed | M | M | M | M | M | M | M | P | P |
| b7 Admin title search handles query options | static `query.hasOwnProperty` with Express 5; R7 and R8 observed | M | P | M | M | M | M | M | M | P |
| b8 Admin API boots and serves `/` | booted today | P | P | P | P | P | P | P | P | P |
| b9 `chapman.js index` completes | pipeline and user; R1 to R3 inferred from R4's failure on identical code | M | P | M | M | P | | P | P | P |
| b10 `chapman.js geodata` ingest completes | static async 3 `q.drain =` in the ingester; R7, R8, R9 observed | M | P | M | M | M | M | M | M | P |
| b11 Frontend survives logging an error (winston-logstash) | booted today: crashes with `common.log is not a function` when the first error is logged | | P | M | M | M | | M | M | M |
| b12 Admin UI reaches its API without `/api//` 404s | user reports | | P | | | | | | M | M |
| b13 Socket.IO client authorises against the Admin API | user report | | P | | | | | | M | |
| Observed cells | | 9 | 12 | 10 | 10 | 10 | 8 | 11 | 13 | 12 |
| Preserved | | 1 | 9 | 5 | 5 | 6 | 1 | 4 | 6 | 9 |
| BPR per run | | 0.11 | 0.75 | 0.50 | 0.50 | 0.60 | 0.13 | 0.36 | 0.46 | 0.75 |

R2's admin-side cells are preserved by construction because the user excluded `tv-radio-admin` from that run; the admin packages are byte-identical to the original there. R10 (CodeMirror) has two observed behaviours: the build output is preserved, the test suite is not, so BPR 0.50. R11 (Conifer) has 31 behaviours observed on both the original and the upgraded stack by the same oracle script (pages in a real browser, the declared flows, a logged-in user and collection lifecycle, API access rules, live Redis and Solr config): 27 preserved; the collection page, bookmark-list creation, WARC indexing and the refusal of anonymous API collection creation are missing, so BPR 0.87 (details in R11).

Aggregate over all eleven runs: preserved 74, missing 54, observed 128. BPR = 74 / 128 = 0.58; MBR = 54 / 128 = 0.42; EBER = 0 / 11.

New behaviours (NBR): a root health response on the Admin API in API-only mode added by the executor in R4 and again in R6, extra record-count completion lines in the ingest commands added in R9, and anonymous sessions allowed to create collections through the Conifer API in R11 (the validator removed the access check to make a stale developer test pass). NBR = 4 / (74 + 4) = 0.05. The vendored Ember, jQuery and Socket.IO client replacements in R8 were requested and are not counted.

The missing behaviours cluster into five upgrade mechanisms the analysis never planned for: Express 5 route syntax and query objects (b2, b4, b7), uglify-js 3 input format (b6), async 3 queue callbacks (b10), winston 3 with a legacy logstash transport (b1 in R6, b11), and influx 5 in R1. All five are behavioural breaks that leave the call signature intact, which is exactly the class the impact analysis, driven by GitNexus symbol lookups and `require` scans, does not surface.

## Cost and efficiency

A run consumed a median of 10.5 million input tokens (94% served from cache) and 107 thousand output tokens, a notional US$12.16 at GPT-5.5 list prices, over a median 73 minutes of main-thread wall time. R11 is an outlier on every measure (65 M input tokens, US$52.71, 784 minutes of wall time including a three-hour usage-limit lockout), which is why the means rose far more than the medians. The token lines the user pasted into the transcripts cover only the orchestrator thread; the sub-agent threads add 2.6 to 8 times more.

| Run | Threads (main + sub-agents) | Input tokens | Cached share | Output tokens | Notional cost (US$) | Main-thread wall time (min) | Agent-active time (min, user's stage timings) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | 1 + 5 | 7,443,345 | 90.4% | 89,052 | 9.62 | 56 | 48 |
| R2 | 1 + 5 | 10,075,786 | 90.1% | 87,090 | 12.16 | 98 | 36 |
| R3 | 1 + 5 | 10,398,807 | 90.6% | 84,481 | 12.11 | 42 | 37 |
| R4 | 3 + 6 | 18,855,639 | 92.9% | 132,335 | 19.45 | 90 | 60 |
| R5 | 1 + 5 | 13,508,803 | 94.6% | 102,959 | 13.13 | 73 | 52 |
| R6 | 1 + 6 | 8,559,434 | 92.3% | 106,751 | 10.45 | 72 | 69 |
| R7 | 1 + 6 | 10,547,697 | 93.5% | 108,895 | 11.61 | 70 | 65 |
| R8 | 2 + 11 | 22,924,683 | 94.6% | 196,921 | 22.91 | 136 | not logged |
| R9 | 1 + 7 | 17,419,167 | 94.8% | 141,635 | 17.00 | 99 | 87 |
| R10 | 1 + 6 | 6,340,056 | 92.6% | 74,566 | 7.52 | 45 | 38 |
| R11 | 1 + 7 | 65,005,806 | 95.2% | 201,894 | 52.71 | 784 | 254 |
| Total | 14 + 69 | 191,079,223 | 93.8% | 1,326,579 | 188.67 | 1,565 | 746 (10 runs) |
| Mean | | 17,370,838 | | 120,598 | 17.15 | 142.3 | 74.6 (10 runs) |
| Median | | 10,547,697 | | 106,751 | 12.16 | 73 | 56 (10 runs) |

Notes on the table:

- Uncached input averaged 870,715 tokens per run over the first ten runs (median 813,873) and 1,077,521 over all eleven (R11 alone 3,145,582). Cost splits into US$59.27 uncached input, US$89.61 cached input and US$39.80 output across the eleven runs.
- R11's wall time (784 min) runs from 11:37 to 00:41 and includes roughly three hours in which the account's usage limit blocked the validator, plus the user's time at gates; its agent-active time from the user's stage timings is 254 min. R11's execution sub-agents consumed 27.5 M input tokens across three attempts, the most of any run.
- R3's main session was resumed days later, so its wall time is measured from the main thread's start to the validator thread's end. R4 and R8 include one and two aborted starts of a few minutes each; the aborted threads are counted in tokens but not in the wall time.
- The execution sub-agent is the dominant consumer: 3.6 M input tokens in R1, 13.1 M in R4's rerun, 8.4 M in R5, 14.3 M across R8's three attempts, 12.2 M across R9's four. The test-generation sub-agent cost 0.2 to 0.7 M input tokens per run.
- Main-thread wall time includes the minutes spent waiting for the user at approval gates, which is why it exceeds agent-active time in every run where both are known.

Manual follow-up after the pipeline stopped (Codex sessions the user ran to fix what the pipeline left broken) added 11.4 M input tokens, 57 thousand output tokens, US$10.52 and 50 minutes of agent time across R7, R8 and R9, on top of the user's own debugging time, which was not recorded.

## LLM configuration

All eleven runs used GPT-5.5 through OpenAI Codex at medium reasoning effort, except that the planner, executor and validator threads of R4 ran at high effort.

| Configuration | Reported value |
| --- | --- |
| Model | `gpt-5.5` via OpenAI Codex (CLI for R1 to R7, R10 and R11, desktop app for R8 and R9), from `~/.codex/config.toml` and every session log |
| Reasoning effort | `medium` in the global config and in 79 of 83 threads. R4's planning, execution (2 threads) and validation sub-agents ran at `high`. The unlogged 14 Jul run ran all sub-agents at `high`. |
| Temperature | not exposed by Codex; not recorded |
| Maximum output tokens | not configured; Codex default |
| Service tier | `default` (Codex subscription; the costs above are notional list prices) |
| Input tokens | total 191,079,223; mean 17,370,838; median 10,547,697 (cached: total 179,226,496; mean 16,293,318) |
| Output tokens | total 1,326,579; mean 120,598; median 106,751 (reasoning tokens included: total 218,316) |
| Total tokens | total 192,405,802; mean 17,491,437; median 10,656,592 |
| Monetary cost (notional) | total US$188.67; mean US$17.15; median US$12.16 per run |
| Execution time | main-thread wall: total 1,565 min; mean 142.3; median 73. Agent-active (10 runs): total 746 min; mean 74.6; median 56 |
| Runtime environment | Windows 11, Node v24.15.0, npm; Docker Engine 29 for R11; Codex sandbox `elevated`; GitNexus MCP available and indexed in every run; Playwright MCP (headless, isolated) from R8 onward |
| Tool version | `.codex/skills/upgrade` as committed in this repository: 88724bc (9 Jun) for R1; 36cbfad (23 Jun) for R2 to R4; 4a9a3b6 (29 Jun) for R5 to R7; ed7f591 (5 Aug, testing agent rework) for R8; f3d9af8 (7 Aug, Playwright checks) for R9; 5acacf4 (1 Sep, quantitative confidence score) for R10 and R11 |

## Component ablation

No controlled ablation exists in this data, so Table 2 of the framework cannot be filled. The ten runs are a longitudinal series in which the tool, the task scope and the user's inputs all changed together, so no pair of runs isolates one component. What the series does show about each component:

**Validation and repair.** The validator caught a real regression twice: the broken client bundle in R8 (through the Playwright console check, then repaired it) and the broken search page and search flow in R9 (through the key-page and key-flow checks). It also repaired Express 5 route syntax in R2. Against that, it approved R1, whose frontend cannot load, and R2, whose frontend requires a removed package; it rejected R3 and R5 only for unplanned agent files in the diff; and in R7 it produced 49 false content-check failures from malformed plan strings and failed both startup checks by probing after the bounded command had already killed the server. Without the validator, FBSR would be unchanged at 0; with it, two of the seven broken-but-committed builds were correctly flagged as broken. In R11 the validation stage (run by the orchestrator after the validator sub-agent hit the usage limit) found and repaired two real Swagger UI regressions behind HTTP 200s, but also edited application access control to satisfy a stale test and approved a build whose collection page crashes.

**Generated testing.** Zero real detections in nine runs (section 5). Removing the component would change no verdict and would save 0.2 to 0.7 M input tokens and 1 to 4 minutes per run.

**GitNexus retrieval.** Every impact report states GitNexus was available, and every one also states that line ranges came from `rg` or `Select-String` because the graph returned file-level hits without lines or did not index CommonJS `require` edges. The manual sessions found exported assignments and Handlebars helpers absent from the index and the `detect_changes` command missing from the CLI. The graph therefore contributed context but not the line-aware analysis the design assumes, so a without-GitNexus ablation is expected to show a small difference on this codebase.

A proper ablation would fix one tool version, reuse two tasks (tv-radio with R9's inputs; codemirror5 toolchain), run the four configurations at least three times each, and score every run with one oracle script that is independent of the pipeline: boot both servers, fetch `/`, `/search/`, `/libs/client.js`, the Admin title-search endpoint, and run the four `chapman.js` commands with record counts. Tokens, cost and time should come from the session logs across all threads, not from the orchestrator's status line.

## Per-run notes

**R1, 19 Jun (82dd113).** 67 files analysed, 28 changes planned, no user commands, so the validator ran only `npm install` across the 8 packages and one generated smoke test, then approved at 0.82 with no repairs. The frontend cannot load: influx was bumped 4 to 5 but `metrics.js` was not in the plan, and six routes still use the bare `*` syntax that Express 5 rejects. 49 of 51 dependency entries were bumped; `pace` and `optimist` have no newer version.

**R2, 23 Jun (3874441).** Frontend-only by the user's choice. Execution needed five repair rounds and two human-approved scope expansions to get past Express 5 wildcard routes, then the validator fixed two more route patterns and approved at 0.86. `uuid` was dropped from the manifest while two content modules still require it, and the client bundle and search route were left broken. The user noted the testing agent was poor.

**R3, 26 Jun (2fce97d).** Full scope with install and startup commands. Execution first halted because the plan listed generated tests without matching executor checks; the orchestrator's manual JSON patch landed in the wrong array before it was corrected. All checks then passed, yet the validator rejected the run for the agent files the user had asked to commit. The user found the Admin API unresponsive; it serves its root today.

**R4, 29 Jun (5c55798).** Both health URLs answered and the run was approved at 0.86 with no repairs; context reached 94%. The planner, executor and validator threads ran at high reasoning effort and the executor rerun alone consumed 13.1 M input tokens. `chapman.js index` failed afterwards, the Admin search endpoint throws, the client bundle and geodata ingest are broken.

**R5, 13 Jul (3a75d06).** Same branch as R1, reused. One scope expansion for `usage-monitoring.js`, one correction because the user gave the wrong directory for `chapman.js`, 13 executor repairs including the empty-index fix in `build.js` and `chapman.js`. Everything the user asked for passed; the validator rewrote the generated smoke test's version strings and rejected the run for unplanned files, including a formatting-only change to `Utilities/package.json`.

**R6, 1 Aug (no commit).** First Solr-inclusive run. Analysis found only 27 affected files (8 high risk), the smallest of any full-scope run, and execution then hit three files outside the plan in sequence: `express.static.mime.define` in the Admin `app.js`, the Influx 5 `writePoints` shape in `admin-usage.js`, and `winston.transports.Logstash` in the frontend logger. Each needed a human decision to widen the plan; the user stopped after the third. 69 minutes, US$10.45, nothing committed.

**R7, 2 Aug (b3455d5).** Analysis now found 114 files. Execution failed once on the `/media/access/*` route after three repairs, passed on retry with one scope expansion, and all four `chapman.js` commands and the generated Solr tests passed. The validator rejected on 49 content checks whose strings lacked the JSON colon and on startup probes it issued after its own bounded command had stopped the server. The user then spent a 28-minute manual session fixing the client bundle, the Windows symlink placeholders, the geodata IDs and async queue, the bare `/search/` route, the `hasOwnProperty` calls, a template helper and the homepage genre facet.

**R8, 5 Aug (44970c6).** Scope grew to vendored Ember, jQuery and Socket.IO client files. Execution used all three scope expansions and needed a fourth, then hung on `chapman.js index` until the plan was widened again; the run took 136 minutes and US$22.91, the most of any run. The validator's new Playwright check caught the broken client bundle and repaired it, then rejected on favicon 404s and unplanned files. The user still found the Admin search crash, the `/api//` 404s, a Socket.IO authorisation failure, the template error and the geodata 400.

**R9, 10 Aug (9a60a71).** The user's prompt now listed the Express 5, async 3 and uglify-js patterns explicitly and asked for output-checked CLI runs and a search flow. Analysis found 90 files, the plan set a scope-expansion budget of 8 and used 0, and all 17 executor checks passed. The validator caught the broken search page and search flow, could not make the generated integration test pass in three rounds, and rejected at 0.42. This is the best-preserving run (9 of 12 behaviours) and the only one where `hasOwnProperty` and the geodata ingest were fixed. Two manual sessions followed for the Windows symlinks, the Solr schema and the `/api//` URLs.

**R10, 14 Sep (uncommitted).** CodeMirror 5 toolchain. Analysis and planning were quick and accurate (4 files). Execution halted first on the same plan defect as R3 (generated test missing from executor checks), then migrated `rollup.config.js` and `test/run.js` correctly: the build passes today. `npm test` fails on five layout and bidi assertions under the Chromium that Puppeteer 25 ships, which the executor judged to be outside the toolchain plan. The generated smoke test itself fails on a wrong `module.exports` expectation. 45 minutes, US$7.52.

**R11, 21 Sep (40be3587).** Conifer, the broadest scope of any run: 390 affected files, 72 planned changes, 132 dependency changes, a scope-expansion budget of 12 that was fully used. Execution halted on the dirty tree, then failed homepage readiness until the orchestrator repaired the webpack configuration itself; the continuation committed. The validator sub-agent hit the account usage limit, so the orchestrator validated its own work: Playwright caught `/docs/api` broken twice (Node `Buffer`, then swagger-ui 5's React 18 render path) and it pinned swagger-ui 4.19.1; it also changed `get_user_or_raise()` so a stale developer test would pass. Approved at 0.38. Everything the user declared passes today, but an oracle run on both versions finds the collection page crashing on the server (`react-tabs` 6 needs React 18; React stayed on 17) and anonymous API collection creation newly allowed. 784 minutes wall, US$52.71.

## Recommendations for the tool

Ordered by expected effect on Full Build Success Rate. Each item names the runs that motivate it.

1. **Never approve without runtime evidence.** R1 was approved at 0.82 after an install check and a version-string smoke test; its frontend cannot load. Require at least one bounded start of every entry process the plan touches, inferred from manifests when the user gives no command, and make "no startup evidence" a hard reject.
2. **Move the known-break checklist into every analysis, not only when the user spells it out.** The Express 5 wildcard, `req.query.hasOwnProperty`, async 3 `drain`, uglify-js 3 `minify` and Influx 5 `writePoints` patterns account for most regressions in R1 to R8. Only R9, where the user listed them in the prompt, entered execution with them planned. The checklist now in `analyze.md` should be applied to every dependency that crosses a major version, and the analyzer should also flag files that call an upgraded package but were not planned (R1 left `metrics.js` untouched after bumping influx 4 to 5).
3. **Make generated tests exercise the real process.** Every generated test asserted version strings, `require` success or mocked handlers, and none failed for a real reason in nine runs. Replace them with a boot-and-probe test per entry point and a CLI run per user-supplied command; keep mocks out of the generated set.
4. **Fix the plan-artifact defects that cost whole runs.** Generated test commands missing from `executor_check_commands` (R3, R10); content checks written as `"async" "3.2.6"` without the colon (R7: 49 false failures; R9: 4); `min_record_count` on an empty datastore (R9); the validator's health probe issued after the bounded command had killed the server (R7); a `favicon.ico` 404 treated as a blocking console error (R8, R9). A schema check on `change-plan.json` before execution would catch the first three.
5. **Separate scope hygiene from correctness in the verdict.** R3 and R5 were rejected solely for agent instruction files that the user had told the pipeline to commit, while R1, R2 and R4 were approved with broken frontends. Report unplanned files as a warning, and decide approval on runtime and behaviour checks.
6. **Size the scope-expansion budget from the dependency jumps.** R6 died on three sequential out-of-plan files, each needing a human decision; R8 exhausted its budget of 3; R9 set 8 and used 0 because analysis had found the call sites. Derive the budget from the number of major-version bumps of frameworks (Express, async, Socket.IO, MongoDB driver) rather than a fixed 3.
7. **Persist executor state between retries.** R8's three execution attempts consumed 14.3 M input tokens and R9's four 12.2 M, largely re-reading the same files. A retry should resume from the recorded check results and diff, not restart the plan.
8. **Check environment prerequisites in preflight.** The Solr core running the default schema, Windows checkouts turning the admin `shared/*.js` symlinks into text files, and the unreachable internal `memcached` git URL each surfaced late and cost a manual session. A preflight that starts the services, fetches one page and diffs the live Solr schema against `Settings/Solr` would have reported all three before analysis.
9. **Clean the working tree before Stage 3.** Nine of ten runs stopped on the dirty-tree rule and then failed diff alignment because the forced pre-upgrade commit landed on the upgrade branch. Commit or stash the pre-existing changes on the base branch before creating the upgrade branch.
10. **Report all-thread usage.** The orchestrator's status line understates a run's tokens by 3 to 8 times (section 7). Sum the sub-agent threads into the final handoff so cost comparisons across runs and ablations are meaningful.
11. **Calibrate the confidence score against outcomes.** The three approved runs (0.82, 0.86, 0.86) all shipped a frontend that cannot serve pages; the rejected R3 (0.78) was closer to working. The quantitative score introduced on 1 Sep has not yet been exercised on tv-radio; rerunning R9's inputs under it would show whether it separates these cases.

## Appendix: verification methods and limitations

Everything below was run on 18 Sep 2026 on the same Windows machine as the original runs, Node v24.15.0.

| Check | How it was done | Where the evidence is |
| --- | --- | --- |
| Commit to run mapping | Commit hashes quoted in each transcript were resolved with `git cat-file` and `git branch --contains`; run artifact folder names (local time) were matched to transcripts and to session start times (UTC). | `projects/tv-radio` and `projects/codemirror5` history; `.codex/upgrade-runs/<repo>/<stamp>` |
| Dependency coverage | For each run commit, every `package.json` was compared with the original `c094824`; an entry counts as upgraded when its version string changed or the entry was removed. | Section 4 table |
| Breaking-pattern scan | `git grep` on each commit for bare `*` routes, `.query.hasOwnProperty(`, `require("uuid")`, `.drain = function`, `express.static.mime.define`, `transports.Logstash`, `writePoints(`, plus the shape of the `uglify.minify(` call and the `/search` route registrations; vendored and static libraries excluded. | Section 6 matrix |
| Mechanism confirmation | With the installed Express 5.2.1: `app.options("/public/viewer/*")` throws `Missing parameter name`, and `hasOwnProperty` on a null-prototype object throws `is not a function`. | Section 6 |
| Syntax check | `node --check` on every changed `.js` file in every run commit: 0 failures in 12 commits. | Section 4 |
| Boot matrix | For each run commit: detached checkout, `npm install` in Common, Admin API and frontend, `node app.js` for the frontend on :18082 and the Admin API on :18080 with a 40 s probe loop, then probes of `/search/`, `/libs/client.js`, `/shared/admin-common.js` and `/api//media-scan`; original branch and dependencies restored afterwards. | Section 4 and 6 |
| CodeMirror | `npm run build`, `npm test` and `node test/upgrade_toolchain_smoke.js` on the current working tree. | Section 4 |
| Run artifacts | The JSON files carry a UTF-8 byte-order mark; they were parsed after stripping it. Validation reports supplied decision, confidence, repairs, command and browser results; execution results supplied check outcomes, repair rounds and scope expansions. | `.codex/upgrade-runs` |
| Session accounting | Every `rollout-*.jsonl` since 19 Jun was read for `session_meta`, `turn_context` (model, effort) and the last `token_count` event; threads were assigned to runs by start time. Transcript token lines matched the main thread's cached-token counts exactly (R7, R8, R9), confirming they exclude sub-agents. | `~/.codex/sessions/2026/<mm>/<dd>` |

Limitations:

- MongoDB, Solr, Memcached and Logstash were not running, so today's boot could only prove module loading and, for the Admin API, HTTP serving. The frontend waits for MongoDB before it listens, so frontend route registration was not directly observed today; the Express 5 wildcard finding rests on the deterministic mechanism and on the pipeline's own startup failures in R2, R3, R5, R7 and R8.
- The original frontend could not be installed (internal `git+ssh` dependency), so baseline behaviour is assumed from the user's context rather than observed.
- Behaviour cells marked from static evidence (`hasOwnProperty`, async `drain`) describe a deterministic failure path but were not exercised at runtime in every run.
- Cost is a list-price estimate; the runs were billed through a subscription.
- One transcript (R8) has no stage timings (R10's were supplied by the user afterwards), and R3's main session duration is unusable because the session was resumed later.
- Three pipeline runs with artifacts but no transcript (20 Jun, 22 Jun, 14 Jul) were excluded; including the 14 Jul run, which was approved at 0.97 and whose branch later received manual fixes, would not change any conclusion.

The scan, boot-matrix and session-accounting scripts were written for this report and can be added to the repository if the evaluation is to be repeated.
