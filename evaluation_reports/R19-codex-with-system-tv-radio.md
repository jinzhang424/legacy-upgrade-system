# Evaluation R19: tv-radio dependency and Solr upgrade (16 Aug 2026)

Verdict: this was the most complete tv-radio upgrade in the series, but it still did not produce a release that passed the user's own browser acceptance check. Fresh installs of all eight npm modules succeed; the Admin API and frontend processes boot; the frontend homepage, `/search/`, the search-result route and all four ordered index-maintenance commands work against MongoDB 8.2.5 and Solr 10, with the index moving 146,740 → 0 → 4 → 141,675 → 146,745 documents. The pipeline nevertheless reported a clean Admin browser while a fresh checkout serves five Git symlink placeholders as JavaScript, leaving the Ember root empty. More importantly, it upgraded Eonasdan Datetimepicker 3 to 4.17.49 without migrating its callers, producing the user's immediate `option ignoreInputValue is not recognized!` error, and paired Bootstrap 5.3.8 JavaScript with Bootstrap 3.2 CSS and Bootstrap 3-era `data-toggle`/`data-dismiss` markup. C = 1, T (declared) = 0, T (extended) = 0, so FBSR = 0. On the 13-cell corpus checklist all observed cells are preserved, but the two run-specific vendored-UI cells are missing: observed 15, preserved 13, BPR 0.87.

| Item | Value |
| --- | --- |
| Chat | Codex session `01a0095b-21a8-7a21-ace3-1c946d4663ca` (`~/.codex/sessions/2026/08/16/rollout-2026-08-16T18-56-02-01a0095b-21a8-7a21-ace3-1c946d4663ca.jsonl`) and its nine stage/follow-up threads; no `refactored_chats` copy exists |
| Target | `projects/tv-radio`: all eight npm modules, every manifest dependency, 18 vendored files under `tv-radio-admin/Admin/Interface/libs`, and the manually managed Solr configset under `tv-radio-admin/Settings/Solr`; Ember fixed at exactly 1.13.3 and jQuery capped at 2.1.4 |
| Upgrade request / validation commands | Start Admin from `tv-radio-admin/Admin/API` and frontend from `tv-radio-frontend` with `node app.js`; verify localhost Admin, frontend homepage and `/search/`; type a homepage query, click Search and inspect the browser console; from `tv-radio-admin/CLI`, in order, run `node chapman.js resetindex --verbose`, `index --verbose`, `geodata --verbose`, `courses --verbose`, require each sub-step's completion output and non-zero Solr records where feasible; sweep Express 5 route/query breaks, async 3 queue callbacks and every Uglify call; validate the external services the plan touches |
| Branch and commit evaluated | `upgrade/outdated-deps-solr-20260816` at pipeline output `b67004d` (executor `aa5cf2b`, base `c094824`); the later date-picker repair amended the branch to `f61cc82`, and is not credited to the pipeline result |
| Run artifacts | `.codex/upgrade-runs/tv-radio/20260816-185842-upgrade-outdated-dependencies-solr/`: impact report 581,441 bytes, change plan 491,424, execution result 13,800, validation report 18,452 |
| Tool version | Upgrade skill commit `df2d5f9`; Codex CLI 0.147.0 |
| Pipeline verdict | rejected, confidence 0.259375, because Memcached, Logstash, SMTP, FTP and FFmpeg were unavailable or unconfigured; it claimed all 13 commands, five browser checks and the homepage search flow passed |
| Human decisions beyond the two gates | 4: retry the external blockers; repair the reported date-picker error and retest FFmpeg; retest all blockers; retest SMTP specifically. The intervening “Did you try…” question is not counted as a decision |

## 1.1 Build effectiveness

The commit was checked out detached and installed afresh on 6 Oct 2026 with Node 22.22.2 and npm 12.0.2. `npm install --no-audit --no-fund` succeeded in Admin/API, CLI, Common, Export, Ingest, Search, Utilities and frontend. The repository does not track `tv-radio-admin/shared-config.js`, `tv-radio-frontend/config.js` or the ingest datasets, so the current local deployment configuration and six data fixtures had to be supplied to the worktree; this is a portability limitation, not evidence contained in the commit. The manually managed containers were started separately. No application code was changed for this verification.

| Metric | Value | Evidence |
| --- | --- | --- |
| C (install and boot) | 1 | Eight fresh installs succeed. Admin prints `API listening on port 8080` / `Chapman Admin API successfully started`; `/` returns `{"status":"ok"}`. `node app.js --interface` prints `API and Web Interface listening on port 8080`. Frontend prints `Listening on port 8082` and serves `/`. C follows the overview definition—dependency install and entry processes load without crashing—not browser correctness. |
| T (declared) | 0 | Frontend `/`, `/search/` and `/search/television` render; the four CLI commands complete with live record evidence. The Admin website does not work from a fresh checkout: its Ember root remains empty because `/shared/common.js` returns the literal text `../../../Common/common.js`, as do the other four placeholder files. That directly contradicts the validation report's “full admin UI rendered with no console errors.” |
| T (extended) | 0 | The user immediately reached a date field in their symlink-capable working tree and got `option ignoreInputValue is not recognized!`. Commit `b67004d` still contains five Datetimepicker 3 calls against vendored Datetimepicker 4.17.49. Bootstrap's runtime and markup generations are also incompatible. |
| FBSR | 0 | `C AND T = 1 AND 0 = 0`, for both declared and extended T. |
| Dependency coverage | 51 of 51 original manifest entries addressed: 50 changed, replaced or removed and `optimist` 0.6.1 left because it had no newer release; two replacements (`cli-progress`, `basic-ftp`) were added. The plan also changed 14 vendored assets and three Solr files. On the 16 Aug registry snapshot these were the latest selected releases, subject to the Ember/jQuery ceiling. Today's `npm outdated` reports only releases published after the run, including Nodemailer 10 (4 Sep), MongoDB 7.6 (24 Aug), Sharp 0.35.4 (26 Aug), Socket.IO 4.8.4 (25 Sep) and later patch releases; these are not omissions by the run. |
| Syntax/static findings | `node --check` passes on all 74 changed JavaScript files. Independent scans find no bare or unnamed Express wildcard, unnamed optional route, direct `request.query.hasOwnProperty`, async queue lifecycle property assignment, or filename-array Uglify call. They do find the unconverted date-picker calls and Bootstrap generation mismatch described below. Frontend startup also emits three `winston-logstash` “legacy winston transport” warnings, although an actual warning event reaches Logstash. |

The central regression is visible without trusting the later report. `compound-input.js` calls `.data("DateTimePicker").setDate(...)` at lines 373 and 543, passes `ignoreInputValue` and `pickTime` at lines 400 and 572, and sets `minViewMode` at line 575. Those are v3 interfaces; the upgraded v4 plugin rejects `ignoreInputValue`, exactly matching the user's stack trace. The generated test never opens an Admin editor and never searches these call sites. The follow-up repair on 19 Aug changed this file and amended the branch to `f61cc82`; that proves the defect belonged to `b67004d`, not the user's configuration.

The second regression is broader. `Admin/Interface/libs/bootstrap.js:2` is Bootstrap 5.3.8, while `Admin/Interface/css/bootstrap.css:2` remains Bootstrap 3.2.0. The HTML and precompiled templates still use Bootstrap 3 attributes: `index.html:35` has `data-dismiss="modal"`, and `app/views.js` contains 31 `data-toggle` or `data-dismiss` sites (for example lines 570, 701, 2807 and 15236). Bootstrap 5 expects `data-bs-*` and does not expose the Bootstrap 3 jQuery plugin surface. Modal, dropdown, tooltip, collapse and alert behaviour therefore cannot be preserved by the JavaScript-only vendored bump. The pipeline did not flag this and the later date-picker repair did not fix it.

The fresh-checkout Admin failure is a separate, inherited Windows portability defect that invalidates the validator's claimed browser observation. All five tracked files in `Admin/Interface/shared` contain only a relative path on line 1 rather than the target JavaScript. `app.js:114` serves that directory verbatim. This defect predates the upgrade, so it is not counted as a missing preservation cell, but a fresh-install validator should have encountered it and either materialised the links explicitly or reported the limitation.

Live independent checks today were stronger than the original validation report's service probes:

- Solr 10 answered `/admin/ping`; before the declared commands it held 146,740 documents. `resetindex` emitted its completion line and produced 0. `index` emitted completion for titles, programmes, playlists and UniSat, then the final marker, and produced 4 programme records. `geodata` emitted every sub-step and final marker and produced 141,365 cities (141,675 total at that point). `courses` emitted both markers and produced 5,070 `course_code_ac` records, for 146,745 total.
- Headless Chromium rendered the Solr-backed `/search/television` result page; the route returned HTTP 200 and 34,311 bytes. `/` and `/search/` also returned 200. Before Solr started, the same route returned the application's 45-byte error page, which is why service state is material to this check.
- MongoDB 8.2.5 pinged through driver 7.5.0. InfluxDB 1.12.4 contained `tvradio` and the `node`/`requests` measurements. A Memcached set/get returned `ok`. Logstash received the unique warning event `R19_EVAL_LOGSTASH_20261006`. Nodemailer 9 `verify()` passed against MailHog on port 587. `basic-ftp` logged in and listed `/`. FFmpeg and ffprobe 9.0 both executed. An authenticated Socket.IO 4 client obtained `/api/auth` and connected to `/api/socketio/socket.io`.

These service successes use the later ignored configuration files and existing manually managed containers. They show that the five pipeline rejection reasons were environmental and were eventually cleared; they do not repair the Admin browser regressions or make Solr provisioning reproducible. The updated Solr config has `luceneMatchVersion 10.0.0` in both config files, and the live core is Solr 10, but rebuilding/reloading that configset remains a manual deployment step as the user required.

## 1.2 Generated tests

The generator wrote one `node:test` file with five subtests. All five pass today after fresh installation.

| Test | What it asserts | Result | Classification |
| --- | --- | --- | --- |
| All module manifests parse and direct dependencies resolve | parses eight manifests and resolves every direct dependency from its owning package | pass | true negative for dependency resolution; no browser or API invocation |
| Ember remains 1.13.3 and jQuery reaches 2.1.4 | string-checks three Ember files and two jQuery files | pass | true negative for the explicit version constraint; does not test Ember/jQuery integration |
| Express 5 routes register and query objects use safe prototype calls | scans non-`libs` JavaScript in Admin/API and frontend, rejects known route/query patterns, and registers extracted paths with Express 5 | pass | true negative; independently confirmed by the repo-wide scan and boot |
| async 3 queue lifecycle callbacks register and fire | runs a synthetic queue and scans all Ingest JavaScript for `drain`/`empty`/`saturated` property assignments | pass | true negative; independently confirmed by the full Ingest scan and the two long-running ingest commands |
| Uglify input, Solr 10 config and CLI completion markers | checks a filename-to-source map in `app.js`, the two `luceneMatchVersion` values, and only that completion-marker strings exist in `chapman.js` | pass | true negative for Uglify/Solr source shape; weak false assurance for CLI behaviour because it does not execute a command or inspect Solr |

At run-instance level a real post-run violation exists and the generated set is green: actual `y = 1`, prediction `ŷ = 0`. Confusion-matrix contribution: TP 0, FP 0, TN 0, FN 1. Treating the five narrow assertions as five independent instances would hide the integration defect; the corpus scores generated testing at run level for this reason. The missing oracle is direct: load every upgraded vendored plugin with its real callers and exercise at least one Admin date field, modal and dropdown.

## 1.3 Behaviour preservation

The first 13 rows are the fixed tv-radio checklist from the overview. Rows b14 and b15 extend it only for the vendored Admin UI that this run explicitly upgraded; both are observable user behaviours at the same granularity as the existing page and Socket.IO rows. “Static” below means a deterministic API/markup compatibility check; “runtime” means today's independent process, browser, protocol or command execution; “user runtime” is the immediate fault reported in this chat.

| Behaviour | Status | Evidence |
| --- | --- | --- |
| b1 Frontend loads all modules | preserved | runtime: fresh install reaches `Listening on port 8082` |
| b2 Frontend registers routes and serves `/` | preserved | runtime: HTTP 200, 36,469 bytes after services started |
| b3 Frontend content modules resolve dependencies | preserved | generated test plus fresh module resolution; no unresolved require at boot |
| b4 Bare `/search/` route matches | preserved | runtime: HTTP 200; route is `/search{/*splat}` at `client-tv-radio.js:397` |
| b5 Search page renders without a template error | preserved | runtime: headless Chromium rendered `/search/` and `/search/television`; no console-error output |
| b6 Client bundle `/libs/client.js` is valid JavaScript | preserved | runtime: served 72,461 bytes and executed on the rendered pages; static Uglify map at `app.js:176-178` |
| b7 Admin title search handles query options | preserved | deterministic static scan: no direct Object prototype method on `request.query`; Express 5 routes register |
| b8 Admin API boots and serves `/` | preserved | runtime: startup markers and `{"status":"ok"}` |
| b9 `chapman.js index` completes | preserved | runtime: four sub-step markers, final marker, 4 non-zero programme documents |
| b10 `chapman.js geodata` completes | preserved | runtime: country, main city, NZ city and US-state completion markers; 141,365 city records |
| b11 Frontend survives logging an error | preserved | runtime: warning call completes and the exact event appears in Logstash; legacy-transport warnings remain |
| b12 Admin UI reaches its API without `/api//` 404s | preserved | static route construction has no `/api//`; user's editor/date-picker trace shows the Admin app progressed beyond initial API-backed rendering in the working deployment. Fresh-checkout UI is limited by the inherited symlink placeholders |
| b13 Socket.IO client authorises against Admin API | preserved | runtime: token from `/api/auth`, authenticated Socket.IO 4 connection succeeds |
| b14 Admin date fields initialise | **missing** | user runtime: `ignoreInputValue is not recognized`; static: five v3 calls remain against v4.17.49 |
| b15 Admin Bootstrap modal/dropdown/tooltip controls retain behaviour | **missing** | deterministic static: Bootstrap 5.3.8 JS with Bootstrap 3.2 CSS and 31 Bootstrap 3 data attributes; no compatibility adapter |

Observed 15, preserved 13: BPR `13 / 15 = 0.87`. Missing 2: MBR `2 / 15 = 0.13`. Exact behaviour equivalence EBER = 0 because at least one reference behaviour is missing. On the unextended 13-cell corpus checklist, observed 13 and preserved 13 gives BPR 1.00; that number is reported only for comparability and is not the headline because it omits the exact vendored UI the run changed. New unrequested behaviours observed: 0; NBR `0 / (13 preserved + 0 new) = 0`.

Not observed directly: a fully materialised Admin checkout running every editor, modal and dropdown; real outbound mail delivery (MailHog verifies SMTP but is not an external recipient); a destructive Primo export upload; media transcoding of a repository fixture (only FFmpeg/ffprobe execution was rechecked). These limitations are not silently scored as passes.

## 1.4 Cost and efficiency

The accounting reads the final `token_count` event from the orchestrator and every child rollout. The root log has three counter epochs (16 Aug, 17 Aug, and 19 Aug–27 Sep); each is counted once. The cutoff is the evaluation prompt at 6 Oct 03:32:52 UTC, so none of this report's tokens are included. “Minutes” for root rows is summed `task_complete` duration, excluding days when the conversation was idle; child rows use their session wall time.

| Thread | Effort | Minutes | Input tokens | Note |
| --- | --- | ---: | ---: | --- |
| Orchestrator, initial pipeline | medium | 81.6 active | 6,233,768 | preflight, two gates, stage handoffs and final rejected verdict; 6,038,784 cached; 16,577 output |
| Repository analysis | medium | 11.9 | 5,240,637 | 135 files, 88 high risk; 5,022,464 cached; 19,335 output |
| Planning | medium | 10.2 | 2,818,097 | 132 planned files, 65 dependency/config rows; 2,715,648 cached; 17,716 output |
| Test generation | medium | 4.2 | 596,323 | one file, five subtests; 544,256 cached; 7,072 output |
| Execution | medium | 24.9 | 5,877,108 | 86 changed files, one scope expansion, one repair round; 5,737,728 cached; 16,467 output |
| Final validation | medium | 24.8 | 7,978,423 | 13 command results, browser and service checks; 7,810,816 cached; 28,793 output |
| Orchestrator, 17 Aug blocker retry | medium | 5.7 active | 832,644 | 752,128 cached; 1,934 output |
| Blocker-retest child | medium | 4.8 | 803,394 | first post-run service retry; 750,080 cached; 8,440 output |
| Orchestrator, 19 Aug–27 Sep follow-up | medium | 21.1 active | 4,746,859 | date-picker repair coordination, blocker/SMTP results, score and GeoHub answer; 4,492,672 cached; 10,167 output |
| Date-picker repair child | medium | 7.5 | 2,504,568 | amended commit to `f61cc82`; 2,399,488 cached; 12,265 output |
| All-blockers retest child | medium | 6.2 | 995,844 | 921,856 cached; 10,903 output |
| SMTP retest child | medium | 1.8 | 381,599 | 345,856 cached; 3,091 output |

Initial pipeline total: 28,744,356 input (27,869,696 cached, 874,660 uncached), 105,960 output, 28,850,316 tokens. At the overview's notional GPT-5.5 schedule—US$5/M uncached input, US$0.50/M cached input and US$30/M output—the cost is `0.874660×5 + 27.869696×0.5 + 0.105960×30 = US$21.49`.

Upgrade-related follow-up total: 10,264,908 input (9,662,080 cached, 602,828 uncached), 46,800 output; US$9.25. End-to-end upgrade total before evaluation: 39,009,264 input (37,531,776 cached, 1,477,488 uncached), 152,760 output, 39,162,024 tokens; `1.477488×5 + 37.531776×0.5 + 0.152760×30 = US$30.74`. The pipeline-only figure is the one comparable to R1–R11; the follow-up figure is the cost of actually clearing its missed defect and environmental blockers.

Stage timings from the child logs are 11.9 minutes analysis, 10.2 planning, 4.2 test generation, 24.9 execution and 24.8 validation. The initial orchestrator elapsed 86 minutes including gates and handoffs; its task-active total is 81.6 minutes.

## 1.5 LLM configuration

| Configuration | Reported value |
| --- | --- |
| Model | `gpt-5.6-sol` via OpenAI Codex CLI, from every `turn_context` record |
| Reasoning effort | medium on the orchestrator and all nine child threads |
| Environment | Windows 11 / PowerShell; Node 22.22.2 and npm 12.0.2 for today's verification; Docker Engine 28.0.4; GitNexus indexed before the run; headless Chromium 138 for today's page checks |
| Tool version | Codex CLI 0.147.0; upgrade skill repository commit `df2d5f9` |
| Service tier | Codex subscription; monetary figures are a notional token-weighted index using the overview's GPT-5.5 prices, not an invoice or a claim about GPT-5.6 pricing |
| Temperature / maximum output | not exposed / not separately configured in the session logs |

## Stage outcomes

| Stage | Result |
| --- | --- |
| Analysis | Passed artifact gate. Enumerated all eight manifests and 18 vendored files; reported 135 affected files, 88 high risk, 15 Express bare wildcards, four unsafe query prototype calls, eight async queue assignments, one unsafe Uglify call, Ember 1.13.3/jQuery 2.1.4 ceiling, and Solr 10 as the inferred target. This was substantially complete, but it did not turn the Bootstrap major into a CSS/markup migration obligation or enumerate Datetimepicker v3 caller APIs. |
| Plan | Passed human gate. 132 planned files, 86 high risk, 65 dependency/vendored/Solr rows, 14 executor checks, eight external-service checks and scope-expansion limit 8. It explicitly required the declared pages, search flow, CLI completion text and Solr counts, but its generated-test design covered version strings and source patterns rather than vendored UI integration. |
| Execution | Reported passed at `aa5cf2b`: 86 files changed, one repair round, one scope expansion for `tv-radio-frontend/usage-monitoring.js`. It migrated the Express, async, MongoDB, Uglify, logging, metrics, FTP and Socket.IO call sites well enough for today's runtime checks, but left the date-picker calls and Bootstrap 3 UI contract behind. |
| Validation | Rejected at confidence 0.259375 and amended to `b67004d` after one source-map repair. It reported 30/30 content checks, 13/13 commands, clean Admin/frontend pages and a clean search flow, plus passing Solr/Mongo/Influx and five environmental failures. The service failures were real for that configuration and later cleared. Its Admin-browser claim is not reproducible from a fresh checkout, and it missed the two vendored-UI regressions; rejection was therefore the right release decision for incomplete reasons. |

## What was broken afterwards

- Admin date fields threw `option ignoreInputValue is not recognized!` because Datetimepicker 4.17.49 was called through five v3 APIs. The 19 Aug manual repair amended the branch to `f61cc82`; it is outside pipeline commit `b67004d`.
- Bootstrap 5.3.8 JavaScript was shipped alongside Bootstrap 3.2 CSS and Bootstrap 3 markup/precompiled templates. Modal, dropdown, tooltip, collapse and alert controls retain the old attributes and plugin assumptions. This remains in `f61cc82`.
- A clean Windows checkout serves the five `Admin/Interface/shared` symlink placeholders as literal JavaScript, so the Admin Ember UI is empty. This is inherited rather than introduced, but it refutes the validator's claim that it tested a fresh, working Admin browser.
- The five original rejection blockers were configuration/service availability, not code repairs: after the user's configuration adjustments, Memcached, Logstash, FTP, FFmpeg/ffprobe and SMTP all passed. Solr configset rebuild/reload remains a manual operational responsibility outside the repo.
- `winston-logstash` still announces itself as a legacy Winston transport three times on frontend startup. Delivery works today, so this is compatibility debt rather than a scored failure.

## Run-specific recommendations

- For every vendored major, build a caller inventory before execution. A Datetimepicker 3→4 rule must flag `pickTime`, `ignoreInputValue`, `minViewMode`, `.data("DateTimePicker").setDate` and old `show` signatures in every caller, then exercise one real field in a browser.
- Treat Bootstrap JS, CSS, markup attributes and programmatic calls as one atomic compatibility unit. Do not bump `libs/bootstrap.js` to 5 while leaving Bootstrap 3 CSS and `data-toggle`/`data-dismiss`; either keep the latest compatible Bootstrap 3 release or migrate the whole Admin UI and its precompiled templates.
- Make the Admin browser check reproducible from a detached checkout. On Windows, detect Git symlink placeholders before startup and either materialise their targets in the test worktree or fail with an explicit portability limitation. A 200 response and page title are not a rendered Ember application.
- Add Admin-specific browser assertions: require non-empty `#main_container`, open an editor, initialise a date field, open and dismiss a modal, use a dropdown, and capture both console and page errors. These checks directly cover the two regressions this run shipped.
- Keep the strong checks that worked here: full Express route/query scans, all-Ingest async scans, the Uglify source-map assertion, ordered CLI completion markers and post-command Solr counts. The independent rerun confirms those migrations are sound.
- Record ignored configuration and fixture prerequisites in the artifact. The commit cannot reproduce the declared tests without `shared-config.js`, frontend `config.js`, ingest data and a manually reloaded Solr core; validation should distinguish repository correctness from an already prepared workstation.
- Report initial-pipeline and follow-up usage separately. R19 costs US$21.49 at the gate and US$30.74 through the repair/retest finish; reporting only the main-thread status would hide most of both.
- Calibrate confidence against product checks. A score of 0.259375 correctly prevented release, but all of its stated code/browser checks were green while the user's first Admin editor interaction failed. Browser depth, not external-service availability alone, should dominate confidence for a vendored UI upgrade.

Compared with the existing overview, R19's extended FBSR is 0, the same as every R1–R11 run after immediate or independent faults are counted; unlike R4, R5 and R11 it also fails declared T under a reproducible fresh-checkout browser. Its extended BPR 0.87 ties R11's best overall result and exceeds the previous best tv-radio run, R9 at 0.75, although the unextended 13-cell corpus checklist is 1.00. Its pipeline-only US$21.49 is above the R1–R11 mean US$17.15 and median US$12.16 and would be the third-highest run after R11 (US$52.71) and R8 (US$22.91). Including the US$9.25 post-run repair/retest work raises it to US$30.74, second only to R11.
