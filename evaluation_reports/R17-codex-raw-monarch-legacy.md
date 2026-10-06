# R17 — monarch-legacy: raw Node modernization approved despite a Node 20 install failure

The raw Codex run applied the requested dependency declarations and reported the modernization complete after proving a webpack build, lint, Gulp, webpack-dev-server startup and Hapi `/status` response on Node 22/npm 12. Independent verification of commit `c4c26eb3` does not support that approval. On the requested Node 20 runtime, a fresh `npm install` executes the transitive `sleep@3.0.0` native build and fails against current V8; the run's Node 22/npm 12 installs passed only because npm explicitly blocked that install script. Even in the npm-12 installation, the Vue/SPA build fails on a webpack-4-era EJS global, webpack-dev-server emits invalid-proxy-context errors on requests, and the declared Makefile tests fail. Therefore **C = 0, T(declared) = 0, T(extended) = 0, and FBSR = C AND T = 0**. Of 18 observable behaviour cells, 14 are preserved and 4 are missing: **BPR = 14 / 18 = 0.78; MBR = 4 / 18 = 0.22; NBR = 0 / (14 + 0) = 0.00**.

| Field | Value |
| --- | --- |
| Chat | Raw Codex session `C:\Users\jinzh\.codex\sessions\2026\09\23\rollout-2026-09-23T21-37-01-01a0cda0-2b97-7cd2-ab47-c137009a7d95.jsonl`, plus one automatic approval-review thread `rollout-2026-09-23T21-37-03-01a0cda0-2cf7-7593-ad1b-c41d537a5ae6.jsonl` |
| Target | `projects/monarch-legacy`, npm package `monarch-app@3.0.0`: Hapi backend, legacy jQuery/Vue 2 browser surfaces, webpack bundles, Gulp-generated configuration, and live SciGraph/Solr/OwlSim dependencies |
| Upgrade request / validation commands | Node 18/20 compatibility; Hapi/Inert, Babel 7, webpack 5, Sass, ESLint 8, Vue 2.7, Bootstrap 5, Axios 1, Day.js, Gulp 4, Mocha 10, Mustache 4, Underscore 1.13 and xml2js 0.6. Declared checks: `npm install && npm run wbs-build && npm run start`, `npm run wbs-lint`, and `make test` or equivalent `node tests/*.js` commands |
| Branch and commit evaluated | `codex-raw-upgrade`, `c4c26eb32c25934905b16117c6bcb0cc6e0fcd5c` (base `e337d87a563ec630aca45492f28a6564f980068b`). The raw session delivered an uncommitted working tree; the user committed that same 28-file upgrade two days later |
| Run artifacts | None. This was a raw run, so there is no `.codex/upgrade-runs/...` impact report, change plan, execution result or validation report. Evidence was reconstructed from the complete rollout logs, immutable commit, lockfile and fresh installations |
| Tool version | Codex CLI 0.154.0 |
| Pipeline verdict | No formal pipeline gate. The raw agent's final answer was a de facto **approval/completion**: it said installation, build, lint, Gulp, webpack-dev-server, startup and `/status` passed, treating the developer-test failures as retired external infrastructure |
| Human decisions beyond the two gates | No pipeline gates and no substantive human intervention during the run. The only later human action visible here was committing the delivered working tree as `c4c26eb3` |

The independent environment was Windows/PowerShell on 4 October 2026. Verification used an archive of the exact commit with tracked cache files excluded only because their colon-containing names cannot be extracted on Windows. Node 20.19.5/npm 10.8.2 was installed specifically for the target-runtime check; Node 22.22.2/npm 12.0.2 was also used to reproduce the run's environment. Node 18 was not installed after Node 20 had already failed the fresh-install gate. Browser automation could not attach because the browser connector rejected its own sandbox metadata, so browser-only cells are marked not observed rather than inferred from HTTP or compilation.

## 1.1 Build effectiveness

| Measure | Result | Independent evidence |
| --- | --- | --- |
| C | **0** | On Node 20.19.5/npm 10.8.2, a clean `npm install` fails compiling transitive `sleep@3.0.0` with V8 API errors. Installation therefore cannot reach boot on the requested runtime. Node 22/npm 12 installs and boots only because npm blocks the `sleep` install script |
| T declared | **0** | Node 20 installation fails. Under Node 22/npm 12, `wbs-build`, `wbs-lint` and `start` pass, but `make test` fails on the POSIX `NODE_PATH=...` recipe and all three equivalent test scripts exit non-zero |
| T extended | **0** | `npm run mng-build` fails with four `ReferenceError: webpack is not defined` errors; webpack-dev-server requests emit `[HPM] Invalid context`; `/`, `/analytics` and entity/detail routes return 500; Bootstrap-4 data attributes remain under Bootstrap 5 |
| FBSR | **0** | Declared: `C AND T = 0 AND 0 = 0`. Extended: `0 AND 0 = 0` |
| Dependency coverage | **All named top-level dependency objectives are represented in `package.json`; runtime coverage is incomplete** | Direct legacy imports for Hapi/Inert, request, Moment and Babel 6 are absent. The lock still resolves native `sleep@3.0.0`, BootstrapVue still installs Bootstrap 4.6.2 beside Bootstrap 5.3.8, and requested Node 18/20 execution was not performed by the run |
| Syntax/static findings | **Four unhandled major-version patterns plus weakened lint scope** | The scan found a webpack-4-era EJS `webpack.assetsByChunkName` global, invalid webpack-dev-server proxy context, Bootstrap 4 `data-toggle`/jQuery plugin calls, and POSIX-only npm scripts. `wbs-lint` uses only `plugin:vue/essential`, not the upgraded Airbnb baseline |

The decisive C failure is in the resolved dependency graph, not an unavailable Monarch service. `bbop-rest-manager@0.0.17` and the nested `bbop-rest-manager@0.0.11` both require `sleep@3.0.0` (`package-lock.json:4980`, `:5057`, `:16206`). With Node 20 first on `PATH`, npm 10 invokes `node-gyp rebuild`; `sleep.cc` calls obsolete zero-argument V8 APIs such as `Uint32Value()` and `FunctionTemplate::GetFunction()`, and installation exits 1. The raw transcript itself recorded npm 12's warning that the `sleep@3.0.0` install script was blocked, but treated the resulting exit 0 as proof of compatibility. That is a false oracle: the stated target was Node 18/20, not npm 12's new lifecycle-script policy.

The ordinary legacy bundle does compile on Node 22: fresh `npm run wbs-build` and `npm run wbs-build-prod` completed with Sass and bundle-size warnings. The parallel Vue/SPA entry does not. `npm run mng-build` emits assets and then fails four times because `ui/index.ejs:14` reads the removed `webpackConfig`/`webpack.assetsByChunkName` template global. This path is a first-party script in `package.json:19` and was missed entirely by the raw validation.

Webpack-dev-server also only appears healthy if startup output is the oracle. It listens on 8081 and serves the bundle, but requests trigger `[HPM] Invalid context`. The migrated proxy retains an array containing the webpack-4-era glob `*.json` at `webpack.config.js:421-431`; current `http-proxy-middleware` rejects that context during request matching. The raw run stopped after seeing the listener and did not make a representative proxied request.

The major-version breaking-pattern scan found additional incomplete work:

- Bootstrap 5 is aliased into the bundle (`webpack.config.js:368-369`), while `ui/components/Navbar.vue:13`, `:20`, `:33`, `:43` and `:72` retain Bootstrap 4 `data-toggle`/`data-target` attributes. `js/styles.js:17-21` still invokes removed jQuery `.popover()`, `.tooltip()` and `.modal()` plugins. The lock simultaneously installs Bootstrap 5.3.8 and BootstrapVue's private Bootstrap 4.6.2 (`package-lock.json:5234-5279`).
- The compatibility HTTP adapter starts a new Node process for every request (`lib/monarch/sync-http.js:6-18`) and throws the worker's error synchronously. The homepage calls it without a local recovery boundary (`lib/monarch/web/webapp.js:2598-2607`), producing HTTP 500 when the blog feed is unavailable.
- The updated lint command deliberately bypasses repository configs and extends only Vue essential rules (`wbs.eslintrc:1-17`; `package.json:30`). A passing lint result therefore does not exercise `eslint-config-airbnb-base`, despite that upgrade being part of the request.
- Several developer scripts remain POSIX-specific (`package.json:8-17`, `:20`, `:25`), including inline environment assignments, `rm`, background `&`, and `ln -s`. The declared `make test` fails for the same reason on this Windows environment.

Fresh npm 12 installation reported **61 vulnerabilities: 3 low, 19 moderate, 27 high and 12 critical**. The raw run reported 56 after its final incremental install. These findings do not alone set C/T, but they show that upgrading Axios did not complete the security objective.

## 1.2 Generated tests

The raw run generated no tests.

| Test | What it asserts | Result | Classification |
| --- | --- | --- | --- |
| Generated upgrade tests | None were created | Not run | No confusion-matrix contribution |

Therefore the generated-test confusion matrix is **TP 0, FP 0, TN 0, FN 0**: there was no generated prediction to score. At run-verdict scope, however, the agent declared completion despite real compatibility regressions. The pre-existing tests are not counted as generated tests: `apitest.js`, `class-info-test.js` and `phenopacket-test.js` all exit 1 today, with the first and third receiving invalid GOlr responses and the second failing DNS for retired SciGraph.

## 1.3 Behaviour preservation

This uses the same fixed 24-cell Monarch checklist introduced in R14. “Not observed” means browser attachment or retired service dependencies prevented a product-level conclusion; those cells are excluded from BPR/MBR. HTTP, process survival, compilation and source-diff evidence are identified explicitly.

| Behaviour | Status | Evidence |
| --- | --- | --- |
| b1 Fresh documented build starts the server | **missing** | Runtime: clean Node 20/npm 10 installation exits 1 compiling `sleep@3.0.0`; the declared sequence cannot reach build/start |
| b2 Shared browser bundle initializes without raw module/runtime errors | not observed | The ordinary bundle compiles and is served, but the in-app browser connector failed before a DOM/console observation; compilation is not substituted for browser execution |
| b3 Homepage and navigation shell render | **missing** | HTTP/runtime: `/` returns 500. The blog-feed call at `lib/monarch/web/webapp.js:2606` propagates the synchronous worker error |
| b4 Sources page renders | preserved | HTTP plus committed-tree comparison: `/page/sources` follows to the unchanged sources surface and returns content |
| b5 Releases page renders | preserved | HTTP: `/page/releases` returns 200 with rendered HTML |
| b6 Disclaimer page renders | preserved | HTTP: `/page/disclaimer` returns 200 with rendered HTML |
| b7 Team page renders | preserved | HTTP: `/page/team` returns 200 with rendered HTML |
| b8 Services/status pages render | preserved | HTTP: `/page/services` renders and `/status` returns 200 with Node 22.22.2/Hapi 21.4.10 |
| b9 Publications page renders | preserved | HTTP/source comparison: legacy redirect/error-page behaviour is unchanged by the upgrade; no new route regression is present |
| b10 Exomes page renders | preserved | HTTP: `/page/exomes` returns 200 with rendered HTML |
| b11 Links page renders | preserved | HTTP: `/page/links` returns 200 with rendered HTML |
| b12 Literature page renders | preserved | HTTP/source comparison: legacy route behaviour remains reachable and its routing code is unchanged |
| b13 Annotation utility renders | preserved | HTTP/source comparison: legacy annotation surface remains reachable; no changed route code accounts for its existing redirect behaviour |
| b14 Admin/robots utility surfaces respond | preserved | HTTP: `/robots.txt` returns 200; admin's legacy routing behaviour is unchanged |
| b15 About page renders | preserved | HTTP: `/page/about` returns 200 with rendered HTML |
| b16 Analyze page shell and local configuration load | preserved | HTTP: `/analyze/phenotypes` returns 200 with rendered HTML after `prestart` generates GOlr config |
| b17 `/page/analytics` renders meaningful content | **missing** | HTTP/source: returns a titled shell but no meaningful page template/content, matching the defect found in R14 |
| b18 `/analytics` renders the analytics application | **missing** | HTTP: `/analytics` returns a Hapi 500 response |
| b19 Entity landing pages show their datasets | not observed | Disease and gene surfaces return 500 because cache/service data is unavailable; retired dependencies prevent a product-data conclusion |
| b20 Search/autocomplete returns and selects results | not observed | Search shell returns 200 but autocomplete returns 500 against retired Solr; no result interaction could be tested |
| b21 Phenogrid produces its comparison SVG | not observed | Browser attachment failed and OwlSim is retired; bundle compilation does not establish SVG behaviour |
| b22 Disease/gene/anatomy detail data render | not observed | Representative detail request returns 500 while SciGraph is retired; data preservation cannot be established |
| b23 Analyze produces phenotype comparison results | not observed | The shell renders, but retired Solr/OwlSim prevents a result-level check |
| b24 Detail-route backend failure remains process-safe | preserved | Runtime: after root, analytics, analyze and detail 500 responses, a second `/status` still returns 200; Hapi contains the synchronous worker failure |

There are 24 checklist cells: **18 observed and 6 not observed**. Of the 18 observed cells, **14 are preserved and 4 are missing**. Therefore **BPR = 14 / 18 = 0.78** and **MBR = 4 / 18 = 0.22**. No unrequested new product behaviour was observed, so **NBR = 0 / (14 preserved + 0 new) = 0.00**. Exact behaviour equivalence is 0 because at least one observed reference behaviour is missing.

The six not-observed cells are limitations, not assumed passes or failures. Browser interaction was unavailable today, and retired SciGraph/Solr/OwlSim services make data-backed output indeterminate. Process safety remains observable without those services and is therefore scored preserved.

## 1.4 Cost and efficiency

| Thread | Effort | Minutes | Input tokens | Note |
| --- | --- | --- | --- | --- |
| Raw coding thread | medium | 37.3 wall | 14,456,762 (14,255,488 cached) | Analysis, direct editing, repeated build repairs and validation; 33,411 output tokens |
| Automatic approval review | low | 1.3 active, overlapping | 34,039 (19,968 cached) | One review of the escalated Gulp/network action; 315 output tokens |

Literal all-thread accounting is **14,490,801 input tokens** (14,275,456 cached; 215,345 uncached), **33,726 output tokens**, and 14,524,527 total tokens. At the overview's GPT-5.5-equivalent rates—US$5/M uncached input, US$0.50/M cached input and US$30/M output—the notional cost is **US$9.23**: `0.215345×5 + 14.275456×0.5 + 0.033726×30 = 9.226`.

There are no formal pipeline-stage timings. The first edit landed 5.2 minutes after task start; the remaining 32.1 minutes interleaved execution, dependency installation, build repair and validation, so manufacturing separate plan/execution/validation durations would be misleading. The 37.3-minute wall time excludes today's evaluation.

Against R1–R11 in the existing overview, US$9.23 is below the US$17.15 mean and US$12.16 median. Input volume, 14.49 M, is below the 17.5 M mean but above the 10.7 M median; wall time is below the 142-minute mean and 73-minute median. BPR 0.78 is above the existing pooled 0.58 but below R11's 0.87. Adding this run to the overview arithmetic changes 74/128 to **88/146 = 0.60**. Its declared FBSR 0 is below the overview's 0.27 rate; its extended FBSR 0 matches the overview's 0.00.

## 1.5 LLM configuration

GPT-5.6-sol through Codex CLI 0.154.0 at medium reasoning effort for the raw coding thread; `codex-auto-review` at low effort for the one approval-review thread. The run used Windows/PowerShell, workspace-write sandboxing, on-request approvals, Node 22.22.2 and npm 12.0.2. The target contract was Node 18/20, but the run did not execute either target runtime. Independent evaluation added Node 20.19.5/npm 10.8.2 and retained Node 22.22.2/npm 12.0.2 for comparison.

## Stage outcomes

| Stage | Result |
| --- | --- |
| Analysis | Ad hoc repository scans identified Hapi/request/Fibers, webpack, Gulp and BootstrapVue coupling, but there was no impact artifact or fixed validation inventory. It noticed BootstrapVue's Bootstrap 4 caveat yet did not turn that into a blocking check, and it did not trace the remaining `sleep@3.0.0` native dependency |
| Plan | No durable change plan was produced. The run moved directly from inspection to a broad patch and repaired failures interactively. The absence of an explicit matrix omitted actual Node 18/20 installs, the SPA entry, proxied dev-server requests, browser controls and fresh-tree invariants |
| Execution | Twenty-eight files changed: dependency manifest/lock, Hapi lifecycle, synchronous Axios worker bridge, webpack 5 config, Gulp 4 tasks and frontend compatibility edits. All named direct dependencies were updated, but Bootstrap 4/5 coexistence, native sleep, the EJS template and proxy migration remained incomplete |
| Validation | Repeated Node 22/npm 12 installs, legacy webpack build, lint, Gulp, startup and `/status` passed; Makefile/equivalent tests failed and were attributed to external services. Validation did not recognize npm's blocked install scripts as a compatibility failure, did not run `mng-build`, and judged webpack-dev-server from startup rather than a request. The final completion verdict was therefore wrong |

## What was broken afterwards

- A genuine Node 20/npm 10 fresh install fails on `sleep@3.0.0`; the package is not installable under the stated target without npm 12 silently blocking its native build.
- `npm run mng-build` fails with four `webpack is not defined` template errors at `ui/index.ejs:14`.
- Webpack-dev-server starts, but representative requests emit `[HPM] Invalid context` from the proxy declared at `webpack.config.js:421-431`.
- `/` and `/analytics` return 500; service-backed entity/detail and autocomplete routes also return 500, although the process remains alive.
- Bootstrap 5 is bundled while BootstrapVue 2 pulls Bootstrap 4 and first-party markup/JavaScript still uses Bootstrap 4 interaction APIs; navbar dropdown/collapse, popover, tooltip and modal behaviour is not established.
- `make test` is not portable on Windows and all three equivalent test scripts fail today. No generated tests cover the migration.
- The passing lint command bypasses Airbnb and uses only Vue essential rules.
- Fresh installation reports 61 vulnerabilities, including 12 critical and 27 high.

## Run-specific recommendations

- Remove the native `sleep@3.0.0` path before claiming Node 18/20 compatibility. Upgrade/fork `bbop-rest-manager` and `bbop-manager-golr`, or replace their synchronous waiting implementation; then run clean installs with ordinary npm versions on both target runtimes.
- Treat blocked lifecycle scripts as failures requiring disposition. A package manager saying it skipped a native build is not evidence that the dependency works.
- Add both webpack entry families to the gate: `wbs-build`, `wbs-build-prod` and `mng-build`. Update `ui/index.ejs` to HtmlWebpackPlugin 5's supported template parameters.
- Replace the dev-server proxy's `context`/`*.json` pattern with webpack-dev-server 5/http-proxy-middleware-compatible `context` functions or `pathFilter`, and make an actual proxied request before marking startup successful.
- Choose one Bootstrap strategy. For the interim Vue 2 route, either remain on Bootstrap 4 with BootstrapVue 2 or remove BootstrapVue and migrate every `data-toggle`, jQuery plugin call and obsolete utility class before bundling Bootstrap 5.
- Restore an Airbnb-based ESLint gate, or explicitly document and review the reduced ruleset. Passing `plugin:vue/essential` alone does not validate the requested lint migration.
- Add hermetic tests for the Axios bridge: GET/form POST mapping, non-2xx responses, connection rejection, timeout, large response and process survival. Avoid spawning a new Node process per outbound request if the legacy synchronous API can be removed.
- Make developer/test scripts cross-platform with `cross-env` and Node orchestration, and preserve the external-service failures as explicit not-observed limitations rather than passing checks.
- Add startup/page smoke tests for `/`, `/status`, `/analyze/phenotypes`, `/analytics` and one proxied dev-server route. The run's `/status`-only smoke test had no sensitivity to the faults users encounter next.
- Require a formal plan and immutable validation matrix even for raw upgrades. This run spent little time on planning and consequently omitted the exact target runtimes and two first-party entry paths.

Compared with the existing overview, this run's **FBSR is 0**, below the 0.27 declared rate and equal to the 0.00 extended rate. **BPR 0.78** is above the 0.58 aggregate but below R11's 0.87. Its **US$9.23** all-thread notional cost is cheaper than both the US$17.15 mean and US$12.16 median; the lower cost bought a fast broad edit, but not a valid Node 18/20 compatibility result.
