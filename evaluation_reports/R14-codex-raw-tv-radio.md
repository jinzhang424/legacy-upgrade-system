# R14 — tv-radio raw Codex: broad upgrade, incomplete behavioural validation

The raw Codex run upgraded all eight Node modules, the Solr 4-era configset and the compatible vendored admin libraries, then repaired three regressions reported by the user after it had declared completion. Fresh installation of the exact final commit succeeds and both entry processes boot, but the declared browser search flow was never executed, and today's independent run of the required CLI sequence fails because the manually managed Solr service is unavailable while `index`, `geodata` and `courses` still emit success/completion text. The final commit therefore scores **C = 1, T(declared) = 0, T(extended) = 0, and FBSR = 0**. Twelve of the fixed tv-radio checklist's thirteen behaviours are observed and preserved; one data-dependent search-rendering cell is not observed, giving BPR 1.00 over observed cells. This was not a staged `$upgrade` pipeline run: it has no four run artifacts, generated tests, gates, sub-agent threads, confidence score or pipeline verdict.

| Field | Value |
| --- | --- |
| Chat | Full raw Codex log `C:\Users\jinzh\.codex\sessions\2026\09\27\rollout-2026-09-27T12-53-29-01a0e023-5c5a-7912-adfc-ce1f7c54556b.jsonl`; no `refactored_chats` export is present |
| Target | `projects/tv-radio`, all eight npm modules, `tv-radio-admin/Settings/Solr`, and vendored admin assets; `Geodata-hub` explicitly excluded |
| Upgrade request / validation commands | Upgrade every dependency and relevant callsite; migrate Solr 4.9 to the latest compatible live-server line; sweep Express 5, async 3 and UglifyJS 3 patterns; boot Admin API and frontend; check the frontend homepage, `/search/`, homepage Search flow and browser console; then run in order: `node chapman.js resetindex --verbose`, `index --verbose`, `geodata --verbose`, `courses --verbose`, checking completion output and live record counts |
| Branch and commit evaluated | `upgrade/codex-raw`, `0c720b909fbfd563e90b061da1ee8f75b15296ae`; base `7516deb94e0b3460528b74bc9968410e06b6981e`. The work remained uncommitted at the end of the 27 September session and was committed by the user on 3 October |
| Run artifacts | None. No matching impact report, change plan, execution result or validation report exists. The only parent `.codex/upgrade-runs/tv-radio` files are two unrelated August GitNexus preflight side effects |
| Tool version | Codex CLI 0.154.0; no legacy upgrade skill or system prompts used |
| Pipeline verdict | None. The raw agent declared the task complete on 27 September, then continued repairing user-reported faults. No confidence score or independent validation gate exists |
| Human decisions beyond the two gates | No gates existed. Five user interventions were needed: two `continue` prompts and three post-completion defect reports (search/datetimepicker, scan/search, and UniSat scan state) |

Independent verification was performed on 4 October 2026 on the exact clean commit with Node 22.22.2 and npm 12.0.2. MongoDB was listening locally; Solr, InfluxDB and Memcached were not. The in-app browser had failed at host bootstrap during the run and Playwright was prohibited, so browser rendering and console behaviour remain explicit limitations rather than inferred passes.

## 1.1 Build effectiveness

| Measure | Result | Independent evidence |
| --- | --- | --- |
| C | **1** | Fresh `npm ci` succeeds in all eight modules. Exact `node app.js` starts the Admin API on 8080 and frontend on 8082 without exiting; Admin full-interface mode also serves `/` with 200. Frontend `/` returns 200 and the generated client bundle parses |
| T declared | **0** | The required browser Search click and console check were never performed. Today `/search/` reaches the repaired route but returns the application's 45-byte `ERROR !!!<id>` sentinel because Solr is unavailable; `resetindex` logs failure, `index` exits 0 despite commit failures, `geodata` emits thousands of add failures and was stopped, and `courses` exits 0 after hundreds of add failures |
| T extended | **0** | Immediately after the first completion claim, the user found `/search/` returning 404 and the admin datetimepicker throwing; the next check found the media scan stuck/false. Those defects were repaired in the final commit, but no real browser retest followed. The independent oracle additionally shows the CLI completion markers are false-success signals when Solr is down |
| FBSR | **0** | `C AND T(declared) = 1 AND 0 = 0`; extended FBSR is also `1 AND 0 = 0` |
| Dependency coverage | **50/51 original manifest entries changed or removed; 8/8 lockfiles added** | The unchanged entry is `pace` 0.0.4, for which npm reports no later release. As of today six manifest entries are behind registry latest: MongoDB in two modules and Nodemailer/Sharp by patch or minor releases, plus the documented major boundaries Archiver 7 to 8 and UUID 11 to 14. Seven vendored families were upgraded; Ember 1, typeahead and coupled plugins were documented as migration boundaries |
| Syntax/static findings | 166 application JavaScript files pass `node --check`; the generated client bundle parses; all three Solr XML files parse | Express scan finds no application bare wildcard, unnamed optional parameter or direct `request.query` prototype call; async scan finds no property-assigned queue lifecycle hook under Ingest; the sole Uglify call uses a source-content map. `git diff --check HEAD^ HEAD` has one whitespace warning in vendored `socket.io-4.8.4.js:2275` |

The dependency work is broad rather than cosmetic. Express 4 to 5, async 0.x to 3, MongoDB 2 to 7, Socket.IO 1 to 4, Nodemailer 1 to 10, Winston 1 to 3, Influx 4 to 5, UglifyJS 2 to 3, CSV 0 to 6, Archiver 0 to 7, Sharp 0.14 to 0.35 and UUID 2 to 11 all have corresponding source changes or documented boundaries. Runtime evidence today also confirms the Winston/Logstash path can log repeated external-service errors without crashing and a Socket.IO 4 client can authenticate and connect to the Admin server.

The run's first validation verdict was nevertheless wrong. Express 5's `/search/*splat` did not match the bare `/search/` URL and was only changed to `/search/{*splat}` after the user's report (`tv-radio-frontend/content/tv-radio/client-tv-radio.js:397`). The vendored datetimepicker was upgraded without its adapter: unsupported options and removed v3 methods threw in the browser until `compound-input.js:373,410,553,606` was migrated. The media scan retained MongoDB callback assumptions and an empty-stream ordering defect until its follow-up repair (`tv-radio-admin/Common/record-media-scan.js:135,191,447`). These were direct upgrade regressions behind earlier HTTP-200/startup evidence.

Today's search result is not attributed as a new regression because Solr is offline and no same-environment base run is available. It does expose a validation weakness: `performBasicTextSearch` ignores its `err` argument and renders `data || {}` (`client-tv-radio.js:146-148`), the `formatted-number` helper calls `number.toString()` without a guard (`handlebars-helpers.js:25-26`), and `_renderErrorPage` returns the `ERROR !!!` marker with HTTP 200 (`client-tv-radio.js:820-839`). A status-only probe therefore labels an application error as a successful page.

The CLI has the same oracle defect. Index batch and commit errors are logged but discarded before an unconditional completion callback (`tv-radio-admin/Search/build.js:70-108`); course-code add errors likewise call the queue callback without the error (`tv-radio-admin/Ingest/course-code-dataset.js:43-50`). `chapman.js:441-444` then prints that rebuilding completed. The 27 September run had a live Solr and independently queried non-zero counts—3 programmes, 141,365 cities, 250 countries, 51 states and 5,070 course codes—so those particular live operations have positive runtime evidence. Today proves the commands do not satisfy the user's “treat any failure as failure” contract when the service is unavailable.

The Solr files now declare `luceneMatchVersion` 10.3 in both configs and replace Trie fields with Point fields in `schema.xml`. XML well-formedness is verified, and the session recorded the running container as Solr 10.0.0/Lucene 10.3.2. The core is offline today, so loading the configset and querying its live schema cannot be independently repeated. Manual deployment/reload remains necessary because this repository contains no Docker or configset provisioning link to the manually managed container.

## 1.2 Generated tests

| Test | What it asserts | Result | Classification |
| --- | --- | --- | --- |
| Generated test files | None were produced or run | No generated tests exist in the target diff | Not classifiable; no confusion-matrix contribution |
| HTTP status probes (validation surrogate, not a generated test) | Admin/frontend roots, `/search/test`, assets and bundle return 200 | Passed during the run while bare `/search/` returned 404 for the user and the datetimepicker threw after load | **False negative** at process-validation level |
| CLI completion-marker checks (validation surrogate, not a generated test) | Each command prints its expected completion line | Passed against live Solr in the run; today `index` and `courses` print completion after explicit `ERR` lines and exit 0 | **False negative** for failure propagation |

Generated-test confusion matrix: **TP 0, FP 0, TN 0, FN 0** because there were no generated tests; accuracy, precision, recall and F1 are undefined. Scoring the two validation surrogates separately contributes **FN 2**. Neither starts a real browser, and neither requires the absence of error log lines.

## 1.3 Behaviour preservation

The fixed thirteen-cell tv-radio checklist from the overview is used unchanged. Runtime evidence from today's exact-commit checks is preferred; session runtime evidence is identified where the external Solr service cannot be reproduced. One search-rendering cell is not observed and excluded rather than guessed.

| Behaviour | Status | Evidence |
| --- | --- | --- |
| b1 Frontend loads all modules | preserved | Independent boot: `node app.js` reaches “Listening on port 8082” and remains running |
| b2 Frontend registers routes and serves `/` | preserved | Independent HTTP 200 on `/`; process remains running despite unavailable optional services |
| b3 Frontend content modules resolve their dependencies | preserved | Independent boot loads all content modules; fresh lockfile install succeeds |
| b4 Bare `/search/` route matches | preserved | Independent request reaches the handler and returns 200 rather than Express 404; route is `/search/{*splat}` at `client-tv-radio.js:397` |
| b5 Search page renders without a template error | not observed | Today the offline Solr path produces a template error and 45-byte error sentinel; the run only checked HTTP 200 after repair and never rendered it in a browser. No equivalent base run under the same outage exists |
| b6 Client bundle `/libs/client.js` is valid JavaScript | preserved | Independent HTTP fetch, 72,461 bytes, accepted by `new Function`; Uglify input is a `{filename: contents}` map at `tv-radio-frontend/app.js:168-173` |
| b7 Admin title search handles query options | preserved | Deterministic static evidence: repository scan finds no direct `request.query.hasOwnProperty`, `isPrototypeOf` or `propertyIsEnumerable` call after Express 5 migration |
| b8 Admin API boots and serves `/` | preserved | Exact API command boots on 8080; full-interface mode boots on 8081 and serves `/` with HTTP 200 |
| b9 `chapman.js index` completes | preserved | Session runtime with live Mongo/Solr completed all four sections and live counts showed 3 programmes. Limitation: today's offline-Solr run fails internally despite exit 0 |
| b10 `chapman.js geodata` ingest completes | preserved | Session runtime with live Solr recorded 141,365 cities, 250 countries and 51 states. Limitation: today's service-offline rerun was stopped after repeated add failures |
| b11 Frontend survives logging an error | preserved | Independent runtime emits Solr, Influx and template errors through Winston/Logstash and stays alive |
| b12 Admin UI reaches its API without `/api//` 404s | preserved | Static URL construction gives `/api/auth/status`; independent request returns 200. No `/api//` literal remains |
| b13 Socket.IO client authorises against the Admin API | preserved | Independent live check obtains a JWT from `/api/auth` and connects a Socket.IO 4 client on `/api/socketio/socket.io` |

Observed 12, preserved 12: **BPR = 12 / 12 = 1.00**. Missing 0 of 12 observed: **MBR = 0 / 12 = 0.00**. One cell is not observed and excluded. No unrequested application behaviour was identified: **NBR = 0 / (12 preserved + 0 new) = 0.00**. Exact behavioural equivalence is not established because b5 and the browser-only datetimepicker interaction were not independently observed.

The media-scan repair is additional positive evidence outside the fixed checklist: against the empty MongoDB today it transitions to `active:false`, progress `0/0`, `last-scan-was-success:true` and a new completion time. The superficially similar UniSat scan remains false because its configured `tv-radio-admin/Data` source lacks the required `.verified` safety marker (`shared-config.js:99-100`, `unisat-record-processing.js:30-43`); this is an environment/configuration failure, not assumed preservation or regression.

## 1.4 Cost and efficiency

| Thread | Effort | Minutes | Input tokens | Note |
| --- | --- | --- | --- | --- |
| Raw Codex orchestrator | medium | **339 wall**; 31.5 tool-active recorded | **40,559,481** | One thread, 267 tool calls, ten user turns; wall time includes about 239 minutes between the first validation work and the user's two `continue` messages. No sub-agents or guardian threads exist |
| Total | — | **339 wall** | **40,559,481** (39,703,040 cached; 856,441 uncached) | Output 90,908, including 28,732 reasoning tokens |

Notional cost is **US$26.86** using the overview's GPT-5.5-equivalent rates: `(0.856441M × US$5) + (39.703040M × US$0.50) + (0.090908M × US$30) = US$4.28 + US$19.85 + US$2.73 = US$26.86`. Cached input is 97.9%. These counts are the final session-log total before the evaluation prompt, so evaluation work is excluded. There are no per-stage timings because the raw run had no staged agents; 31.5 minutes is only summed command wall time and understates reasoning/editing time.

Against the eleven runs in the overview, 40.6M input tokens exceed the 17.4M mean and 10.5M median. US$26.86 exceeds the US$17.15 mean and US$12.16 median and would rank second-highest, behind R11's US$52.71 and above R8's US$22.91. The 339-minute wall time would likewise rank second to R11's 784 minutes.

## 1.5 LLM configuration

GPT-5.6-sol through Codex CLI 0.154.0, medium reasoning effort, one orchestrator thread on Windows 11. Independent verification used Node 22.22.2 and npm 12.0.2. The upgrade did not use the legacy upgrade skill/prompts, GitNexus or Playwright. It attempted the permitted in-app browser control, which failed before opening a tab because required host sandbox metadata was absent; validation then used direct HTTP, static scans, logs and API polling.

## Stage outcomes

| Stage | Result |
| --- | --- |
| Analysis | Ad hoc rather than a pipeline artifact. Correctly enumerated eight manifests and 51 original entries; found the Express, async, Uglify, MongoDB, Winston/Logstash and Influx compatibility surfaces and produced a broad callsite inventory in `DEPENDENCY-UPGRADE.md` |
| Plan | No persisted plan, approval gate, scope budget or immutable acceptance contract. Work proceeded directly from the prompt, which let status-only HTTP and completion-string checks stand in for the requested browser and error-aware checks |
| Execution | Changed or added 81 files in the final commit, addressed 50 of 51 manifest entries, added eight lockfiles, migrated major-version callsites, modernised Solr configuration and replaced seven vendored library families. Follow-up execution repaired the search wildcard, datetimepicker adapter, missing assets and media scan. The eventual user-created commit also includes three pre-existing `Geodata-hub` files despite the explicit exclusion |
| Validation | No independent validator or generated tests. The agent declared completion after startup, HTTP 200s and live CLI counts, explicitly leaving the browser flow manual. The user immediately found three regression groups. Fresh verification confirms installation/boot and 12 behaviours, but cannot pass declared T: browser rendering is unobserved, Solr is offline, and the CLI masks service failures as completion |

## What was broken afterwards

- After the first “complete” response, bare frontend `/search/` was 404 because Express 5's named `*splat` did not include the base path. It was repaired before `0c720b9`.
- The upgraded Bootstrap datetimepicker rejected `ignoreInputValue` and still had v3 method assumptions (`setDate`, property-style `widget`, `minViewMode`). The adapter was repaired before the final commit, but no browser retest was available.
- Media scan used removed MongoDB callback APIs and could leave an empty-database scan active forever. It was repaired and independently passes today.
- The first frontend asset audit missed the default favicon request and two nonexistent arrow images; these were repaired before the final commit.
- The final validation still has no evidence for a rendered search page or the homepage Search-button console flow. Today the search handler returns an HTTP-200 error sentinel with Solr offline.
- `index`, `geodata` and `courses` swallow Solr add/commit errors and print completion; `index` and `courses` exit 0 today despite explicit error lines. This violates the user's output-aware failure requirement even though the run's live-Solr counts were non-zero.
- UniSat scanning remains operationally unavailable with the default local configuration because `tv-radio-admin/Data/.verified` is absent. The failure is intentional safety behaviour and requires a real verified media path, not an application workaround.
- The exact final commit contains three files under the explicitly excluded `Geodata-hub`. Transcript and diff evidence indicate they were pre-existing untracked files that the agent did not edit, but the later user-created all-in-one commit makes the evaluated artifact scope-contaminated.
- Fresh Admin/API installation now reports one high-severity Engine.IO advisory (`GHSA-2gc4-cqfq-p2gv`). This is time-dependent registry evidence; the 27 September audit recorded zero.

## Run-specific recommendations

- Make the user's acceptance checks immutable even in raw mode. Do not declare completion while the required browser Search flow is explicitly outstanding.
- Treat the application's `ERROR !!!` response body and any server-side error log as failure even when HTTP status is 200. Search-page validation should assert expected DOM content, not status alone.
- Propagate Solr errors through every async queue and final callback. `Search/build.js` and the geodata/course workers must fail the CLI process if any add or commit fails; completion lines should only be emitted after a clean commit.
- Add a small regression suite for the exact breakpoints this run missed: bare `/search/`, datetimepicker initialization and set/get, zero-record media scan, authenticated Socket.IO connection, Uglify bundle contents, and CLI failure propagation with Solr unavailable.
- Keep user-excluded paths out of the eventual commit. Before handoff, compare `git diff --name-only <base>` against exclusions and either split pre-existing files into a separate commit or refuse an all-in-one commit.
- Record runtime service dependencies in a reproducible harness. A minimal Compose definition or documented bind mount for the Solr configset would make the live Lucene version, config reload and post-index counts independently repeatable without taking ownership of the user's manually managed container.
- Distinguish compatibility boundaries from current-version coverage. Archiver 8 and UUID 14 are justified CommonJS holds; MongoDB, Nodemailer and Sharp patch/minor drift and the new Engine.IO advisory should be reported separately and revisited.
- Preserve the useful dependency-to-callsite inventory, but generate it mechanically from imports and compare it against changed files so smaller clients such as Winston, Logstash and Influx cannot be silently omitted.

Compared with the eleven runs in the overview, declared **FBSR remains 0**, below the existing declared rate of 0.27, and extended FBSR remains 0 like every prior run. **BPR 1.00** exceeds the prior best of 0.87; adding this run's twelve observed preserved cells would move the pooled figure from `74 / 128 = 0.58` to `86 / 140 = 0.61`, though the unobserved search-rendering cell makes that result narrower than full equivalence. At **US$26.86**, the run is above both existing central measures and would be the second-costliest run in the overview.
