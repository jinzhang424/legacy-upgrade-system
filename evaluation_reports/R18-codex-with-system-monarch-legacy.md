# R14 — monarch-legacy: broad Node modernization, approved without a reproducible boot

The pipeline completed a substantial Node/Hapi/webpack migration and ultimately approved commit `8de30399` at confidence 0.75 after narrowing validation to local/static evidence. Independent reconciliation with the full session shows that approval was wrong under the user's original contract. The exact declared fresh sequence, `npm install && npm run wbs-build && npm run start`, does not boot because `wbs-build` creates `webpack-assets.json` but not the required generated `conf/golr-conf.json`; the validator had run `gulp build` separately and therefore masked the defect. Two of the three Makefile-equivalent developer tests also fail, and the later 36-page sweep finds blank/error pages plus service-backed routes that terminate Node on rejected Axios calls. Therefore **C = 0, T(declared) = 0, T(extended) = 0, and FBSR = C AND T = 0**. Of 20 observable behaviour cells, 16 are preserved and 4 are missing: **BPR = 16 / 20 = 0.80; MBR = 4 / 20 = 0.20; NBR = 0 / (16 + 0) = 0.00**.

| Field | Value |
| --- | --- |
| Chat | Raw orchestrator session `C:\Users\jinzh\.codex\sessions\2026\09\16\rollout-2026-09-16T17-20-04-01a0a8a8-65c1-7292-a4c8-b8cc86927437.jsonl`, with seven pipeline sub-agent threads and nine automatic approval-review side threads |
| Target | `projects/monarch-legacy`, npm package `monarch-app@3.0.0`: Hapi backend plus jQuery/Vue 2 browser application, webpack bundle, Gulp-generated configuration, and live SciGraph/Solr/OwlSim dependencies |
| Upgrade request / validation commands | Node 18/20 compatibility; Hapi/Inert, Babel 7, webpack 5, Sass, ESLint 8, Vue 2.7, Bootstrap 5, Axios 1, Day.js, Gulp 4, Mocha 10, Mustache 4, Underscore 1.13 and xml2js 0.6. Declared checks: `npm install && npm run wbs-build && npm run start`, `npm run wbs-lint`, and `make test` or the equivalent `node tests/*.js` commands |
| Branch and commit evaluated | `upgrade/node-18-20-dependency-upgrade`, `8de30399` (base `e337d87a`). The branch/ref was later removed from the current repository, but the commit, commands and outputs are fully identified in the session |
| Run artifacts | `.codex/upgrade-runs/monarch-legacy/20260916-172334-upgrade/{impact-report,change-plan,execution-result,validation-report}.json`; the earlier rejected report was preserved as `validation-report.pre-infra-scope-rejected.json`. The run directory was later removed, but full artifact snapshots and final handoffs remain embedded in the rollout logs |
| Tool version | Codex CLI 0.154.0; upgrade-system commit `5acacf4ae770a74b1875cc66cd3ac84311072175` |
| Pipeline verdict | **Approved**, confidence 0.75, after the user authorized excluding all retired-service-backed tests/pages/flows. Earlier validations correctly rejected at confidence 0.0919 and after the Phenogrid repair |
| Human decisions beyond the two gates | Seven substantive interventions: restore/ignore GitNexus-damaged worktree state; continue beyond the executor repair cap; prescribe webpack core-module fallbacks; resume the overnight startup pass; authorize the Phenogrid repair cycle; resume validation after quota interruption; narrow the final gate to local/static evidence |

The evidence base is the actual execution performed during the upgrade: clean dependency installations, repeated builds and startups, every declared command or its Makefile equivalent, real-browser validation, and the subsequent 36-URL page-family sweep. Retired SciGraph/Solr/OwlSim behaviour is marked not observed where the unavailable service prevents a product-level conclusion; it is not silently counted as either preserved or missing.

## 1.1 Build effectiveness

| Measure | Result | Independent evidence |
| --- | --- | --- |
| C | **0** | Installation and webpack compilation pass, but after generated outputs are cleaned, the declared `wbs-build` → `start` sequence exits with `ENOENT conf/golr-conf.json`. Boot succeeds only after the undeclared extra `gulp build`; this violates the operational definition “install + boot succeeds with no crash” |
| T declared | **0** | `wbs-lint` passes; `phenopacket-test.js` passes 1/1; `apitest.js` fails 0/4 and `class-info-test.js` fails 0/1; the declared startup sequence fails. Thus not all user-declared checks pass |
| T extended | **0** | The 36-page sweep finds two broken analytics routes, five entity landing pages showing internal errors, and four detail-route families that terminate Node after DNS/Axios rejection |
| FBSR | **0** | Declared: `C AND T = 0 AND 0 = 0`. Extended: `0 AND 0 = 0` |
| Dependency coverage | **36/36 planned dependency transitions applied/content-verified** | The final plan records 36 direct transitions, including all user-requested replacements and coupled webpack/Bootstrap additions/removals; exact Phenogrid 1.3.11 was locked after repair |
| Syntax/static findings | Major-version syntax/config migrations are largely complete, but two cross-step runtime defects remain | Twenty-one final content checks passed. Old Hapi imports/lifecycle, Babel 6 names, `request`, `wait.for`, Moment, Gulp dependency arrays, `node-sass`, BootstrapVue registration and Phenogrid `noParse` were removed or migrated. The scan missed the build-artifact dependency and incomplete rejected-promise propagation |

The headline regression is deterministic. `package.json:32` defined `wbs-build` as clean plus webpack only. Gulp owns `conf/golr-conf.json` generation (`gulpfile.js:183`, composed into `build` at `gulpfile.js:216`), while the launcher unconditionally names and reads it (`lib/monarch/web/webapp_launcher.js:34` and `:52`). The server also reads `webpack-assets.json` unconditionally (`lib/monarch/web/webapp.js:66`). Validation passed because its amended plan ran both `npm run wbs-build` and `npx gulp build`; that is not the sequence the user declared. After validation cleanup, `npm run start` reproduced the missing-file failure immediately. A later uncommitted repair added Gulp to the build contract and proved build/start, but it is not part of `8de30399` and cannot rescue C for the evaluated commit.

The second regression is incomplete async error propagation. The migration replaced synchronous `request`/`wait.for` calls with Axios promises, and the validator repaired several missed `await` sites. Nevertheless, service rejection still escapes route handling. The observed crash originates in `bbop.monarch.Engine.fetchUrlWithExchangeObject` (`lib/monarch/api.js:3205`) and propagates through `getGraphNodeByID` (`lib/monarch/api.js:3805`) as `AxiosError: ENOTFOUND`. Phenotype, variant, genotype and model detail requests terminate the process before a response; disease/gene/anatomy may first render an error boundary and then terminate the server. Retired DNS triggers the path, but an unavailable dependency must not crash the application process.

The major-version breaking-pattern scan produced mixed results:

- Hapi 16 callback/connection patterns were migrated to `@hapi/hapi` 21 promises; an unbound `this.start()` defect was found and repaired to `app.start()`.
- Webpack 5 incompatibilities were repaired: Node core fallbacks, imports-loader syntax, mixed CommonJS/ESM entries, Phenogrid `noParse`, D3 global initialization and the Hapi static route.
- Gulp 3 dependency arrays, `safeLoad`, `new Buffer`, POSIX `mkdir -p`, and `gulp-download` were replaced.
- BootstrapVue 2 was removed at the planned Vue components and replaced with native Bootstrap 5 markup.
- `request`, `wait.for`, Moment and Babel 6 names were absent in final content checks.
- The scan did not establish full rejected-promise closure across every route, and no check asserted that `wbs-build` emits every file required by `start`.

The install also reported 73 transitive audit findings: 3 low, 25 moderate, 31 high and 14 critical. These do not by themselves define C/T, but they materially weaken the security goal of the modernization.

## 1.2 Generated tests

The generator created `tests/node18-upgrade.test.js`. The final suite had seven passing cases:

| Test | What it asserts | Result | Classification |
| --- | --- | --- | --- |
| Hapi/Inert initialization | Hapi 21 server/plugin setup can initialize locally | Pass | True negative for this narrow boundary |
| Async GET wrapper | A wrapped GET handler awaits and returns its payload | Pass | True negative for the exercised fixture |
| Async POST wrapper | A wrapped POST handler awaits and preserves form handling | Pass | True negative for the exercised fixture |
| Axios GET mapping | Axios status/body map into Monarch's exchange-object shape | Pass | True negative for successful loopback GET |
| Axios form POST | URL-encoded POST content type/body are preserved | Pass | True negative for successful loopback POST |
| Non-2xx mapping | A local non-2xx response remains an explicit exchange object | Pass | True negative for HTTP error responses |
| GOlr/SciGraph fixture traversal | GOlr response construction and one real wrapper chain work against loopback fixtures | Pass | True negative for the selected call chain |
| Generated suite as upgrade oracle | Implies the Hapi/Axios migration and startup contract are safe | Pass despite missing build artifact and process-terminating rejection paths | **False negative** |

At assertion scope, seven local contracts pass and are legitimate true negatives. At run/oracle scope, a genuine regression exists and the generated suite predicts no regression: **TP 0, FP 0, TN 0, FN 1**. The suite has useful unit-level signal but no recall for the defects users hit immediately afterward. It needed one test that deletes generated outputs, runs the declared build/start sequence, and another that forces a rejected service request through every route-family wrapper while asserting the server stays alive.

## 1.3 Behaviour preservation

This target was not previously represented in the overview. The fixed checklist below uses one cell per independently observable page/runtime family, matching the tv-radio/Conifer granularity. “Not observed” means the retired service prevented a product-level comparison; those cells are excluded from BPR/MBR.

| Behaviour | Status | Evidence |
| --- | --- | --- |
| b1 Fresh documented build starts the server | **missing** | Runtime: after cleanup, `npm install`, `npm run wbs-build`, `npm run start` fails on missing `conf/golr-conf.json` |
| b2 Shared browser bundle initializes without raw `require`/D3 errors | preserved | Browser: post-repair `/page/about`, `/page/phenogrid`, root and sources no longer show the Phenogrid/D3 initializer failure |
| b3 Homepage and navigation shell render | preserved | Browser: `/` renders; Twitter 429 is non-fatal third-party behaviour |
| b4 Sources page renders | preserved | Browser: `/about/sources` passes two validator runs with zero console errors |
| b5 Releases page renders | preserved | Browser sweep: rendered successfully |
| b6 Disclaimer page renders | preserved | Browser sweep: rendered successfully |
| b7 Team page renders | preserved | Browser sweep: rendered successfully |
| b8 Services/status pages render | preserved | Browser sweep: `/services`, `/services/status`, `/status` static/status surfaces respond |
| b9 Publications page renders | preserved | Browser sweep: rendered successfully |
| b10 Exomes page renders | preserved | Browser sweep: rendered successfully |
| b11 Links page renders | preserved | Browser sweep: rendered successfully |
| b12 Literature page renders | preserved | Browser sweep: rendered successfully |
| b13 Annotation utility renders | preserved | Browser sweep: annotation page rendered successfully |
| b14 Admin/robots utility surfaces respond | preserved | Browser/HTTP sweep: admin introspection and robots surfaces respond |
| b15 About page renders | preserved | Browser: application content renders; blocked external iframe is separately identified |
| b16 Analyze page shell and local configuration load | preserved | Browser: `/analyze/phenotypes` reloads without console errors after `/phenogrid_config.js` Hapi repair |
| b17 `/page/analytics` renders meaningful content | **missing** | Browser: HTTP 200 with an empty body |
| b18 `/analytics` renders the analytics application | **missing** | Browser: Page Not Found plus initializer errors |
| b19 Entity landing pages show their datasets | not observed | Disease/phenotype/gene/model/genotype landing pages show internal errors while required legacy services are retired |
| b20 Search/autocomplete returns and selects results | not observed | Search shell renders but Solr no longer resolves; no valid result interaction can be evaluated |
| b21 Phenogrid produces its comparison SVG | not observed | Packaged demo loads, but its hardcoded retired beta OwlSim endpoint returns the modern site/CORS failure |
| b22 Disease/gene/anatomy detail data render | not observed | SciGraph is retired; observed error pages cannot establish data-behaviour preservation |
| b23 Analyze produces phenotype comparison results | not observed | Solr/OwlSim prerequisites are retired; only the local shell/configuration was observable |
| b24 Detail-route backend failure remains process-safe | **missing** | Runtime/browser: phenotype, variant, genotype and model requests terminate Node; disease/gene/anatomy can trigger delayed termination |

There are 24 checklist cells: 20 observed and 4 not observed. Of the 20 observed cells, 16 are preserved and 4 are missing. Therefore **BPR = 16 / 20 = 0.80** and **MBR = 4 / 20 = 0.20**. No unrequested new product behaviour was observed, so **NBR = 0 / (16 preserved + 0 new) = 0.00**. Exact behaviour equivalence is 0 because at least one observed reference behaviour is missing.

The four not-observed service-backed cells are limitations, not assumed passes or failures. The process-safety cell is scored missing because it is directly observable even without service data: dependency failure may produce an error response, but it must not terminate the server.

## 1.4 Cost and efficiency

| Thread | Effort | Minutes | Input tokens | Note |
| --- | --- | --- | --- | --- |
| Orchestrator | medium | 1,752 wall; 179.5 active | 24,856,949 (23,948,544 cached) | Includes gates, repair coordination and overnight/user waits through final approval |
| Repository analysis | medium | 6.3 active | 926,523 (843,520 cached) | 37 affected files, 20 high risk; GitNexus had zero indexed symbols |
| Planning | medium | 41.4 active | 14,486,652 (13,855,872 cached) | Initial plan plus lint, offline-test, launcher, Phenogrid and validation-scope revisions |
| Test generation | medium | 2.1 active | 416,392 (375,680 cached) | One generated file, expanded to seven cases |
| Execution | medium | 64.4 active | 31,168,742 (30,582,400 cached) | Multiple continuations, repairs and one amended commit |
| Initial final validation | medium | 22.5 active | 8,789,383 (8,611,840 cached) | Rejected after three browser repair rounds |
| Post-repair validation | medium | 35.6 active | 13,466,339 (12,976,256 cached) | Repaired D3/static route; rejected on retired services |
| Infrastructure-scoped validation | medium | 15.5 active | 4,790,927 (4,677,632 cached) | Approved unchanged `8de30399` at 0.75 |
| Automatic approval reviews (9 side threads) | low | 4.9 active | 4,586,068 (3,486,976 cached) | Safety/approval-review threads, reported separately from the overview-comparable agent total |

Pipeline-agent total: **98,901,907 input tokens** (95,871,744 cached; 3,030,163 uncached), 314,774 output tokens, and about **367.3 active agent-minutes** over 1,752 wall minutes. At the overview's GPT-5.5-equivalent rates—US$5/M uncached input, US$0.50/M cached input, US$30/M output—the comparable notional cost is **US$72.53**: `3.030163×5 + 95.871744×0.5 + 0.314774×30`.

Literal all-thread accounting including the nine automatic review threads is **103,487,975 input tokens** (99,358,720 cached; 4,129,255 uncached), 322,184 output tokens and **US$79.99**: `4.129255×5 + 99.358720×0.5 + 0.322184×30`. The comparable US$72.53 figure is used against the overview because its per-run tables count orchestrator and stage agents, not automatic approval-review side threads.

Available stage timing is: analysis 6.3 minutes; planning/revisions 41.4; test generation 2.1; execution 64.4; initial validation 22.5; post-repair validation 35.6; scoped validation 15.5; orchestrator active work 179.5. The 29.2-hour wall span includes overnight pauses, approval waits and a quota interruption.

Against R1–R11 in the existing overview, this is the most expensive pipeline run: US$72.53 exceeds R11's US$52.71 and the prior US$17.15 mean/US$12.16 median. Its 98.9 M agent input tokens exceed R11's 65.0 M. Its BPR 0.80 is above the existing aggregate 0.58 but below R11's 0.87. Adding it to the pooled behaviour arithmetic changes 74/128 to **90/148 = 0.61**. Its declared and extended FBSR are both 0: below the overview's 0.27 declared rate and equal to the overview's 0 extended rate.

## 1.5 LLM configuration

GPT-5.6-sol through Codex CLI 0.154.0, medium reasoning effort for the orchestrator and all seven pipeline agents; `codex-auto-review` low effort for nine approval-review threads. Windows 11/PowerShell workspace, Node v22.22.2 for the observed local runs, npm lockfile v3, real-browser Playwright validation, and GitNexus preflight with zero indexed files/symbols. The target contract was Node 18/20 and CI was changed to that matrix, but the local execution evidence is Node 22 rather than an actual dual Node 18/20 run.

## Stage outcomes

| Stage | Result |
| --- | --- |
| Analysis | Found 37 affected files, 20 high risk and 31 dependency nodes. Correctly identified Hapi lifecycle, request→Axios async propagation, webpack 5, Gulp 4 and BootstrapVue/Bootstrap 5 risks. GitNexus supplied no graph coverage; the analysis used committed-tree searches. It did not identify the generated-config/start coupling as a required build invariant |
| Plan | Grew from 20 to 24 ordered files and 36 dependency transitions. Added build/lint/Gulp, seven hermetic cases, startup, pages/flows and external probes; then repeatedly weakened/changed the oracle around retired infrastructure. The final plan ran `gulp build` separately, masking the declared build/start defect |
| Execution | Initial webpack failed after three repairs; user-authorized continuations fixed Node fallbacks, imports-loader, lint configuration, Gulp 4 issues and Hapi startup. Hermetic tests passed and commit `4bb61d33` was created. Phenogrid repair later pinned 1.3.11, removed `noParse`, deleted stale generation config and amended through `19db7923` |
| Validation | Initial validation correctly rejected browser bundle failures. Post-repair validation fixed D3 initialization and `/phenogrid_config.js`, amending to `8de30399`, then correctly rejected retired-service failures. A third pass excluded those paths and approved at 0.75. Immediately afterward, cleanup exposed the missing generated startup artifacts; the later 36-page sweep exposed process crashes and broken local routes |

## What was broken afterwards

- A clean user-declared `npm install && npm run wbs-build && npm run start` fails because `conf/golr-conf.json` is absent; `webpack-assets.json` is a second required generated input when webpack has not run.
- `/page/analytics` is blank and `/analytics` is a not-found page with initializer errors.
- Phenotype, variant, genotype and model detail requests can terminate Node on `ENOTFOUND`; disease/gene/anatomy can also cause delayed process termination after rendering an error boundary.
- Entity landing pages render internal errors; search has no results; Phenogrid has no SVG. These product functions are unavailable because their SciGraph/Solr/OwlSim infrastructure is retired, so their preservation cannot be established.
- `apitest.js` fails 0/4 and `class-info-test.js` fails 0/1; only the local phenopacket test passes.
- Installation retains 73 audit findings, including 14 critical and 31 high transitive vulnerabilities.
- ESLint passes only under a compatibility baseline with 468 warnings; this is a successful tool migration, not evidence of a clean lint baseline.

## Run-specific recommendations

- Make the declared build contract authoritative: `wbs-build` must generate both Gulp configuration outputs and webpack assets, and a generated test must delete those files before exercising build→start.
- Add a process-survival oracle for every page-family route. Force SciGraph/Solr/OwlSim connection rejection and assert a bounded 5xx/error page while a second static request still succeeds.
- Treat user-declared commands as immutable gates. Supplemental `gulp build` may diagnose or prepare the app, but cannot be inserted silently between `wbs-build` and `start` when scoring T.
- Do not turn unavailable legacy services into passes. Keep service-backed behaviours “not observed,” while separately scoring local resilience failures such as unhandled rejection/process exit.
- Run the exact three Makefile-equivalent commands and report their raw outcomes. Hermetic replacements are valuable compatibility tests but do not make the existing suite pass.
- Add a resolved-dependency security gate or explicit disposition for the 14 critical and 31 high audit findings; upgrading Axios alone did not complete the requested CVE remediation.
- Test on actual Node 18 and Node 20, not only Node 22, because native/runtime differences are part of the stated target.
- Preserve full artifact snapshots after approval. This run's artifact directory was later removed, forcing reconstruction from rollout logs and weakening auditability.
- Calibrate approval against the original contract: an approved static route is insufficient when the documented fresh start fails and representative user routes can terminate the process.

Compared with the existing overview, this run's **FBSR is 0**, matching the corpus's extended outcome and falling below its 0.27 declared rate. **BPR 0.80** is substantially better than the 0.58 aggregate but below R11's 0.87. At **US$72.53 overview-comparable cost** (US$79.99 including automatic review threads), it is the most expensive pipeline run in the corpus while still failing both declared and extended acceptance.
