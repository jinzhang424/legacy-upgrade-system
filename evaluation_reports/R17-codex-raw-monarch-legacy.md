# R17 — monarch-legacy: required SPA build fails after the webpack 5 migration

The raw Codex run applied the requested dependency declarations and reported the modernization complete after proving a webpack build, lint, Gulp, webpack-dev-server startup and Hapi `/status` response on Node 22/npm 12. A matched-baseline re-evaluation excludes the clean-build configuration gap, retired SciGraph/Solr/OwlSim dependencies, POSIX-only test recipes, missing original lint file, old native dependency graph and existing security debt because they pre-date the upgrade. With those inherited blockers accommodated, the exact commit builds, lints and boots on Node 20, so **C = 1**. It does not meet the complete required build surface: `npm run mng-build` newly exits 1 under HtmlWebpackPlugin 5. Accordingly **T(declared) = 0 and declared FBSR = 1 AND 0 = 0**. Webpack-dev-server 5 also logs a proxy exception on every request, so **T(extended) = 0 and extended FBSR = 1 AND 0 = 0**. Of 15 observable behaviour cells, 14 are preserved and one is missing: **BPR = 14 / 15 = 0.93; MBR = 1 / 15 = 0.07; NBR = 0 / (14 + 0) = 0.00**.

| Field | Value |
| --- | --- |
| Chat | Raw Codex session `C:\Users\jinzh\.codex\sessions\2026\09\23\rollout-2026-09-23T21-37-01-01a0cda0-2b97-7cd2-ab47-c137009a7d95.jsonl`, plus one automatic approval-review thread `rollout-2026-09-23T21-37-03-01a0cda0-2cf7-7593-ad1b-c41d537a5ae6.jsonl` |
| Target | `projects/monarch-legacy`, npm package `monarch-app@3.0.0`: Hapi backend, legacy jQuery/Vue 2 browser surfaces, webpack bundles, Gulp-generated configuration, and live SciGraph/Solr/OwlSim dependencies |
| Upgrade request / validation commands | Node 18/20 compatibility; Hapi/Inert, Babel 7, webpack 5, Sass, ESLint 8, Vue 2.7, Bootstrap 5, Axios 1, Day.js, Gulp 4, Mocha 10, Mustache 4, Underscore 1.13 and xml2js 0.6. Declared checks: `npm install && npm run wbs-build && npm run start`, `npm run wbs-lint`, and `make test` or equivalent `node tests/*.js` commands. Required build-surface check confirmed by the evaluator: `npm run mng-build` |
| Branch and commit evaluated | `codex-raw-upgrade`, `c4c26eb32c25934905b16117c6bcb0cc6e0fcd5c` (base `e337d87a563ec630aca45492f28a6564f980068b`). The raw session delivered an uncommitted working tree; the user committed that same 28-file upgrade two days later |
| Change size | **20 production/test source files; 618 LoC changed (321 additions, 297 deletions)**. Measured from `c4c26eb3` against `e337d87a` using the same filter as R18; excludes `package-lock.json`, configuration-only metadata and any generated build/configuration outputs |
| Run artifacts | None. This was a raw run, so there is no `.codex/upgrade-runs/...` impact report, change plan, execution result or validation report. Evidence was reconstructed from the complete rollout logs, immutable commit, lockfile and fresh installations |
| Tool version | Codex CLI 0.154.0 |
| Pipeline verdict | No formal pipeline gate. The raw agent's final answer was a de facto **approval/completion**: it said installation, build, lint, Gulp, webpack-dev-server, startup and `/status` passed, treating the developer-test failures as retired external infrastructure |
| Human decisions beyond the two gates | No pipeline gates and no substantive human intervention during the run. The only later human action visible here was committing the delivered working tree as `c4c26eb3` |

The independent environment was Windows/PowerShell, first on 4 October and rechecked on 7 October 2026. Verification used an archive of the exact commit with tracked cache files excluded only because their colon-containing names cannot be extracted on Windows. Node 20.19.5/npm 10.8.2 was used for the matched-baseline retest; Node 22.22.2/npm 12.0.2 reproduced the run environment. The score follows the user's clarified counterfactual rule: a condition demonstrated at base `e337d87a` is documented but does not turn C, T or a behaviour cell into a failure. Browser automation again could not attach because the in-app browser rejected its sandbox metadata, so browser-only cells remain not observed rather than inferred from HTTP or compilation.

## 1.1 Build effectiveness

| Measure | Result | Independent evidence |
| --- | --- | --- |
| C | **1 baseline-adjusted** | After applying only inherited accommodations—`npm ci --ignore-scripts`, Gulp GOlr generation and `yaml-confs-to-json`—Node 20.19.5 builds and starts Hapi 21.4.10; `/status` returns 200 and the process remains live. Strict unwaived install remains 0 because transitive `sleep@3.0.0` still cannot compile, but that defect is inherited and is not scored as an upgrade regression |
| T declared | **0** | On Node 20, `wbs-build`, `wbs-lint`, startup, stable local pages and the hermetic phenopacket assertions pass, but the required `npm run mng-build` exits 1 with four `ReferenceError: webpack is not defined` errors. Inherited live-service and Windows Make failures remain excluded |
| T extended | **0** | In addition to the required SPA-build failure, every representative webpack-dev-server request logs `[HPM] Invalid context`. Both failures arise in files/configuration migrated for webpack 5 |
| FBSR | **0 declared; 0 extended** | Declared: `C AND T = 1 AND 0 = 0`. Extended: `1 AND 0 = 0` |
| Source change size | **20 files / 618 LoC** | Production and test source combined: 321 inserted lines + 297 deleted lines = 618 changed LoC. The raw diff touches 28 files; generated `package-lock.json`, configuration-only metadata and generated outputs are excluded from this metric |
| Dependency coverage | **All named top-level dependency objectives are represented in `package.json`; runtime coverage is incomplete** | Direct legacy imports for Hapi/Inert, request, Moment and Babel 6 are absent. The lock still resolves native `sleep@3.0.0`, BootstrapVue still installs Bootstrap 4.6.2 beside Bootstrap 5.3.8, and requested Node 18/20 execution was not performed by the run |
| Syntax/static findings | **Two confirmed upgrade regressions, one browser risk, and weakened lint scope** | The scan and execution found a webpack-4-era EJS `webpack.assetsByChunkName` global and invalid webpack-dev-server proxy context. Bootstrap 4 `data-toggle`/jQuery plugin calls remain under Bootstrap 5 but could not be exercised in a browser. `wbs-lint` uses only `plugin:vue/essential`, not the upgraded Airbnb baseline |

The strict Node 20 installation defect remains real but is no longer scored as upgrade-caused. `bbop-rest-manager@0.0.17` and its nested `0.0.11` require `sleep@3.0.0` (`package-lock.json:4980`, `:5057`, `:16206`). A fresh 7 October `npm ci` under Node 20/npm 10 again invokes `node-gyp` and exits 1 on obsolete V8 calls. The base graph already depended on `node-fibers`/`wait.for`, `node-sass` and the same synchronous BBOP family, and could not install cleanly on Node 18/20. Under the clarified metric this is an **unresolved contract gap**, not a regression: it belongs in dependency coverage and recommendations, but contributes neither C=0 nor a missing behaviour.

The baseline-adjusted Node 20 sequence is successful. `npm ci --ignore-scripts` installs the JavaScript graph; the pre-existing Gulp prerequisites generate `golr-conf.json` and `monarch-team.json`; `wbs-build` compiles webpack 5.111.1 with warnings; `wbs-lint` exits 0; and `start` serves `/status`, `/`, `/page/about`, `/page/releases`, `/page/disclaimer`, `/page/team`, `/page/services`, `/page/exomes`, `/page/links`, `/robots.txt` and `/analyze/phenotypes`. Running only `prestart` initially made those pages return 500 for missing `conf/monarch-team.json`; generating it restored 200 responses, confirming the failure as the known build-order defect rather than a Hapi regression.

The parallel Vue/SPA entry is upgrade-attributable and still broken. `npm run mng-build` emits assets and then exits 1 because `ui/index.ejs:14` and `:76` read the webpack-4/HtmlWebpackPlugin-3 `webpackConfig` and `webpack.assetsByChunkName` globals. The template is unchanged from the base while the upgrade moved HtmlWebpackPlugin 3 to 5, so this is a direct major-version migration omission, not an inherited service or platform issue.

Webpack-dev-server also only appears healthy if startup output is the oracle. It listens on 8081 and serves the bundle, but requests trigger `[HPM] Invalid context`. The migrated proxy retains an array containing the webpack-4-era glob `*.json` at `webpack.config.js:421-431`; current `http-proxy-middleware` rejects that context during request matching. The raw run stopped after seeing the listener and did not make a representative proxied request.

The major-version breaking-pattern scan found additional incomplete work:

- Bootstrap 5 is aliased into the bundle (`webpack.config.js:368-369`), while `ui/components/Navbar.vue:13`, `:20`, `:33`, `:43` and `:72` retain Bootstrap 4 `data-toggle`/`data-target` attributes. `js/styles.js:17-21` still invokes removed jQuery `.popover()`, `.tooltip()` and `.modal()` plugins. The lock simultaneously installs Bootstrap 5.3.8 and BootstrapVue's private Bootstrap 4.6.2 (`package-lock.json:5234-5279`).
- The compatibility HTTP adapter starts a new Node process for every request (`lib/monarch/sync-http.js:6-18`). A hermetic fixture verified GET query encoding, form POST including repeated keys, preservation of a 404 response, rejection on a dropped connection and parent-process survival. This establishes current mechanics, but the exact rejection and page-level behaviour remain baseline-indeterminate and are not scored preserved or missing.
- The updated lint command deliberately bypasses repository configs and extends only Vue essential rules (`wbs.eslintrc:1-17`; `package.json:30`). A passing lint result therefore does not exercise `eslint-config-airbnb-base`, despite that upgrade being part of the request.
- Several developer scripts remain POSIX-specific (`package.json:8-17`, `:20`, `:25`), including inline environment assignments, `rm`, background `&`, and `ln -s`. This is inherited from the base and excluded from T; it remains a portability limitation.

The fresh Node 20 baseline-adjusted installation reported **65 vulnerabilities: 3 low, 21 moderate, 28 high and 13 critical**. Existing security debt is not scored as a new regression, and the count is not directly comparable with the historical base because lock resolution and advisory data changed. It does show that replacing Axios did not remove the repository's wider inherited exposure.

## 1.2 Generated tests

The raw run generated no tests.

| Test | What it asserts | Result | Classification |
| --- | --- | --- | --- |
| Generated upgrade tests | None were created | Not run | No confusion-matrix contribution |

Therefore the generated-test confusion matrix is **TP 0, FP 0, TN 0, FN 0**: there was no generated prediction to score. At run-verdict scope, the agent declared completion despite the SPA and dev-proxy regressions. The pre-existing tests are not counted as generated tests. Their live failures are inherited: `phenopacket-test.js` again failed when retired GOlr returned no usable Solr document, and `class-info-test.js` remained blocked on the retired SciGraph endpoint. The service-independent phenopacket builder/schema assertion passed with a deterministic one-document fixture, including rejection of the intentionally invalid packet.

## 1.3 Behaviour preservation

This uses the same fixed 24-cell Monarch checklist introduced in R14. “Not observed” means browser attachment or retired service dependencies prevented a product-level conclusion; those cells are excluded from BPR/MBR. HTTP, process survival, compilation and source-diff evidence are identified explicitly.

| Behaviour | Status | Evidence |
| --- | --- | --- |
| b1 Fresh documented build starts the server | preserved | Baseline-adjusted runtime: after the same inherited Gulp prerequisites and native-script waiver needed to make the comparison meaningful, Node 20 `wbs-build`, `start` and `/status` pass. The unwaived `sleep@3` and build-order failures are inherited and excluded |
| b2 Shared browser bundle initializes without raw module/runtime errors | **missing** | Compilation: the ordinary bundle compiles, but the first-party SPA bundle cannot complete `mng-build`; HtmlWebpackPlugin 5 raises four template errors at `ui/index.ejs:14` and `:76` |
| b3 Homepage and navigation shell render | not observed | HTTP `/` returns 200 after the inherited Gulp prerequisite, but browser attachment failed and Bootstrap navigation interactions could not be observed; the earlier 500 was caused by missing pre-existing `monarch-team.json` generation |
| b4 Sources page renders | preserved | HTTP plus committed-tree comparison: `/page/sources` follows to the unchanged sources surface and returns content |
| b5 Releases page renders | preserved | HTTP: `/page/releases` returns 200 with rendered HTML |
| b6 Disclaimer page renders | preserved | HTTP: `/page/disclaimer` returns 200 with rendered HTML |
| b7 Team page renders | preserved | HTTP: `/page/team` returns 200 with rendered HTML |
| b8 Services/status pages render | preserved | HTTP: `/page/services` renders and `/status` returns 200 with Node 20.19.5/Hapi 21.4.10 |
| b9 Publications page renders | preserved | HTTP/source comparison: legacy redirect/error-page behaviour is unchanged by the upgrade; no new route regression is present |
| b10 Exomes page renders | preserved | HTTP: `/page/exomes` returns 200 with rendered HTML |
| b11 Links page renders | preserved | HTTP: `/page/links` returns 200 with rendered HTML |
| b12 Literature page renders | preserved | HTTP/source comparison: legacy route behaviour remains reachable and its routing code is unchanged |
| b13 Annotation utility renders | preserved | HTTP/source comparison: legacy annotation surface remains reachable; no changed route code accounts for its existing redirect behaviour |
| b14 Admin/robots utility surfaces respond | preserved | HTTP: `/robots.txt` returns 200; admin's legacy routing behaviour is unchanged |
| b15 About page renders | preserved | HTTP: `/page/about` returns 200 with rendered HTML |
| b16 Analyze page shell and local configuration load | preserved | HTTP: `/analyze/phenotypes` returns 200 with rendered HTML after the inherited Gulp configuration prerequisites |
| b17 `/page/analytics` renders meaningful content | not observed | Baseline-indeterminate: HTTP returns a shell, but there is no successful pre-upgrade browser baseline establishing what meaningful content should appear |
| b18 `/analytics` renders the analytics application | not observed | Baseline-indeterminate: HTTP returns 500, but the same route was not successfully observed before the upgrade, so causation is not assigned |
| b19 Entity landing pages show their datasets | not observed | Disease and gene surfaces return 500 because cache/service data is unavailable; retired dependencies prevent a product-data conclusion |
| b20 Search/autocomplete returns and selects results | not observed | Search shell returns 200 but autocomplete returns 500 against retired Solr; no result interaction could be tested |
| b21 Phenogrid produces its comparison SVG | not observed | Browser attachment failed and OwlSim is retired; bundle compilation does not establish SVG behaviour |
| b22 Disease/gene/anatomy detail data render | not observed | Representative detail request returns 500 while SciGraph is retired; data preservation cannot be established |
| b23 Analyze produces phenotype comparison results | not observed | The shell renders, but retired Solr/OwlSim prevents a result-level check |
| b24 Detail-route backend failure remains process-safe | not observed | Baseline-indeterminate: the upgraded process survives dropped Axios-fixture connections and subsequent 500 responses, but no successful pre-upgrade rejection/process baseline exists |

There are 24 checklist cells: **15 observed and 9 not observed**. Of the 15 observed cells, **14 are preserved and one is missing**. Therefore **BPR = 14 / 15 = 0.93** and **MBR = 1 / 15 = 0.07**. No unrequested new product behaviour was observed, so **NBR = 0 / (14 preserved + 0 new) = 0.00**. Exact behaviour equivalence is 0 because the SPA browser-bundle cell is missing.

The nine not-observed cells are limitations, not assumed passes or failures. Browser interaction was unavailable, retired SciGraph/Solr/OwlSim services make data-backed output indeterminate, and the analytics plus Axios rejection/process behaviours lack a successful pre-upgrade baseline. None is used to penalise the upgrade.

## 1.4 Cost and efficiency

| Thread | Effort | Minutes | Input tokens | Note |
| --- | --- | --- | --- | --- |
| Raw coding thread | medium | 37.3 wall | 14,456,762 (14,255,488 cached) | Analysis, direct editing, repeated build repairs and validation; 33,411 output tokens |
| Automatic approval review | low | 1.3 active, overlapping | 34,039 (19,968 cached) | One review of the escalated Gulp/network action; 315 output tokens |

Literal all-thread accounting is **14,490,801 input tokens** (14,275,456 cached; 215,345 uncached), **33,726 output tokens**, and 14,524,527 total tokens. At the overview's GPT-5.5-equivalent rates—US$5/M uncached input, US$0.50/M cached input and US$30/M output—the notional cost is **US$9.23**: `0.215345×5 + 14.275456×0.5 + 0.033726×30 = 9.226`.

There are no formal pipeline-stage timings. The first edit landed 5.2 minutes after task start; the remaining 32.1 minutes interleaved execution, dependency installation, build repair and validation, so manufacturing separate plan/execution/validation durations would be misleading. The 37.3-minute wall time excludes today's evaluation.

Against R1–R11 in the existing overview, US$9.23 is below the US$17.15 mean and US$12.16 median. Input volume, 14.49 M, is below the 17.5 M mean but above the 10.7 M median; wall time is below the 142-minute mean and 73-minute median. Baseline-adjusted BPR 0.93 is above both the existing pooled 0.58 and R11's 0.87. Adding this run to the overview arithmetic changes 74/128 to **88/143 = 0.62**. Its declared FBSR 0 is below the overview's 0.27 rate; its extended FBSR 0 matches the overview's 0.00.

## 1.5 LLM configuration

GPT-5.6-sol through Codex CLI 0.154.0 at medium reasoning effort for the raw coding thread; `codex-auto-review` at low effort for the one approval-review thread. The run used Windows/PowerShell, workspace-write sandboxing, on-request approvals, Node 22.22.2 and npm 12.0.2. The target contract was Node 18/20, but the run did not execute either target runtime. Independent evaluation added Node 20.19.5/npm 10.8.2 and retained Node 22.22.2/npm 12.0.2 for comparison.

## Stage outcomes

| Stage | Result |
| --- | --- |
| Analysis | Ad hoc repository scans identified Hapi/request/Fibers, webpack, Gulp and BootstrapVue coupling, but there was no impact artifact or fixed validation inventory. It noticed BootstrapVue's Bootstrap 4 caveat yet did not turn that into a blocking check, and it did not trace the remaining `sleep@3.0.0` native dependency |
| Plan | No durable change plan was produced. The run moved directly from inspection to a broad patch and repaired failures interactively. The absence of an explicit matrix omitted actual Node 18/20 installs, the SPA entry, proxied dev-server requests, browser controls and fresh-tree invariants |
| Execution | The raw diff touched 28 tracked files; after the R18 source-size exclusions, 20 production/test source files account for 618 changed LoC. Changes covered the dependency manifest/lock, Hapi lifecycle, synchronous Axios worker bridge, webpack 5 config, Gulp 4 tasks and frontend compatibility edits. All named direct dependencies were updated, but Bootstrap 4/5 coexistence, native sleep, the EJS template and proxy migration remained incomplete |
| Validation | Repeated Node 22/npm 12 installs, legacy webpack build, lint, Gulp, startup and `/status` passed; Makefile/equivalent test failures were correctly associated with retired infrastructure, although the local phenopacket assertion was not isolated. Validation did not run the required `mng-build`, make a representative dev-server request or drive browser controls. Because `mng-build` is part of the required build surface and fails, the completion verdict was wrong even before the extended oracle |

## What was broken afterwards

- `npm run mng-build` fails with four `webpack is not defined` template errors at `ui/index.ejs:14`.
- Webpack-dev-server starts, but representative requests emit `[HPM] Invalid context` from the proxy declared at `webpack.config.js:421-431`.
- Bootstrap 5 is bundled while BootstrapVue 2 pulls Bootstrap 4 and first-party markup/JavaScript still uses Bootstrap 4 interaction APIs; navbar dropdown/collapse, popover, tooltip and modal behaviour is an unresolved upgrade risk, not an observed failure.
- The passing lint command bypasses Airbnb and uses only Vue essential rules.

Not counted as broken afterwards: the Node 20 `sleep@3` install failure, Gulp-before-build requirement, retired service failures, Windows Make incompatibility, security debt, `/analytics`, and exact Axios rejection behaviour are inherited or baseline-indeterminate.

## Run-specific recommendations

- Remove the native `sleep@3.0.0` path before claiming Node 18/20 compatibility. Upgrade/fork `bbop-rest-manager` and `bbop-manager-golr`, or replace their synchronous waiting implementation; then run clean installs with ordinary npm versions on both target runtimes.
- Treat blocked lifecycle scripts as an unresolved compatibility objective, while keeping them separate from regression scoring. A package manager skipping a native build is not proof of Node 18/20 compatibility.
- Add both webpack entry families to the gate: `wbs-build`, `wbs-build-prod` and `mng-build`. Update `ui/index.ejs` to HtmlWebpackPlugin 5's supported template parameters.
- Replace the dev-server proxy's `context`/`*.json` pattern with webpack-dev-server 5/http-proxy-middleware-compatible `context` functions or `pathFilter`, and make an actual proxied request before marking startup successful.
- Choose one Bootstrap strategy. For the interim Vue 2 route, either remain on Bootstrap 4 with BootstrapVue 2 or remove BootstrapVue and migrate every `data-toggle`, jQuery plugin call and obsolete utility class before bundling Bootstrap 5.
- Restore an Airbnb-based ESLint gate, or explicitly document and review the reduced ruleset. Passing `plugin:vue/essential` alone does not validate the requested lint migration.
- Add hermetic tests for the Axios bridge: GET/form POST mapping, non-2xx responses, connection rejection, timeout, large response and process survival. Avoid spawning a new Node process per outbound request if the legacy synchronous API can be removed.
- Make developer/test scripts cross-platform with `cross-env` and Node orchestration, but record that this is inherited cleanup rather than an upgrade-caused regression. Replace retired-service assertions with recorded fixtures or injectable local HTTP doubles.
- Add startup/page smoke tests for `/`, `/status`, `/analyze/phenotypes`, `/analytics` and one proxied dev-server route. The run's `/status`-only smoke test had no sensitivity to the faults users encounter next.
- Require a formal plan and immutable validation matrix even for raw upgrades. This run spent little time on planning and consequently omitted the exact target runtimes and two first-party entry paths.

Compared with the existing overview, this run's baseline-adjusted **declared FBSR is 0**, below the 0.27 declared rate, and **extended FBSR is 0**, equal to the overview's 0.00 extended rate. **BPR 0.93** is above the 0.58 aggregate and R11's 0.87; adding the run produces 88/143 = 0.62 pooled. Its **US$9.23** all-thread notional cost is below both the US$17.15 mean and US$12.16 median. The corrected result is therefore relatively cheap and high-preservation, but unsuccessful: a required first-party build fails, with a second webpack-5 regression exposed by the extended oracle.
