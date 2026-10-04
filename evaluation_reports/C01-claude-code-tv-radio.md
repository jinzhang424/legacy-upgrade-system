# Evaluation C1: `claude_refactored_chats/tv-radio.md` (Claude Code, direct agent, tv-radio plus Solr, 24 and 26 Sep 2026)

Verdict: the broadest tv-radio upgrade attempted so far — 50 of 51 dependency entries addressed, the Solr config migrated 4.9 → 10 and validated against a real Solr 10 container, the public frontend's vendored libraries replaced wholesale — and the only run in which Solr, MongoDB, InfluxDB and Memcached were all live during execution. It is also the most expensive by an order of magnitude (US$49.46, 182 M input tokens for the upgrade alone) and it still ends with the search page broken, the admin interface dead, geodata ingest failing and no commit. C = 1, T = 0, FBSR = 0, BPR 0.62.

This is **not** a `$upgrade` pipeline run. It is the same task given to a general coding agent (Claude Code, Sonnet 5) with no orchestrator, no generated test suite, no separate validation gate and no GitNexus, so it belongs in the ablation section of the framework rather than in the R1–R11 aggregates. Section 1.6 below states which components were absent and which were replaced by something else.

| Item | Value |
| --- | --- |
| Chat | `claude_refactored_chats/tv-radio.md` (5,636 lines; upgrade session, then a "fix all errors" repair session) |
| Session logs | `~/.claude/projects/c--Users-OEM-legacy-upgrade-system-projects-tv-radio/`: `101d4017…` (upgrade, 24 Sep), `80ea9f23…` (repair, 26 Sep), plus 7 sub-agent logs under `101d4017…/subagents/` |
| Target | tv-radio, all 8 packages, plus Solr (version unknown beyond `luceneMatchVersion 4.9`), plus the vendored front-end libraries in both `tv-radio-admin/Admin/Interface/libs/` and `tv-radio-frontend/static/libs/`; same Express 5, async 3 and uglify-js sweep instructions as R9 |
| Validation commands from user | Admin and frontend `node app.js`; key page `/search/`; key flow: type a query on the homepage, click Search, check the console; four `chapman.js` commands with `--verbose`, judged by their own completion lines and by non-zero record counts; database empty |
| Branch and commit evaluated | none. The upgrade exists only as uncommitted working-tree changes on `main` at `780bc07` (the pre-upgrade commit). 99 tracked files changed (+17,972 / −29,264), 22 untracked files added; excluding vendored libraries and CSS, 74 files (+933 / −1,219) |
| Scope decisions taken at the plan gate | vendored front-end libs: full major upgrades; Solr target: 9.x latest (executed against 10.0.0, the image actually running); unmaintained packages (`request`, `ftp`, `socketio-jwt`, `gc-stats`): swap for maintained replacements |
| Pipeline verdict | not applicable — no validator, no confidence score. The agent's own closing summary calls the work "verified working" on every item it lists |
| Human decisions | 9 (3 plan-mode questions, 1 plan approval, "fix all errors", "it has been set up now", 1 permission denial on `docker stop/rm` handed back to the user, 2 transcript-export requests) |
| Verification date | 26 Sep 2026, against the working tree as the sessions left it, with the live Docker stack (Solr 10.0.0 SolrCloud with `SOLR_MODULES=analysis-extras`, MongoDB 8, InfluxDB 1.8, Memcached), Node v24.15.0 |

## 1.1 Build effectiveness

| Metric | Value | Evidence |
| --- | --- | --- |
| C (install and boot) | 1 | `npm install` is clean in all 8 packages (`node_modules` present, 115 packages in Admin/API, 134 in the frontend). Admin API: `node app.js --port 8080 --verbose --interface` starts, `GET /` → 200 (6,206 B). Frontend: `node app.js` starts, `GET /` → 200 (35,668 B). 35 changed first-party `.js` files all pass `node --check`; both Solr XML files are well-formed |
| T (declared checks) | 0 | Four of the declared checks fail: `/search/` → **404**; the homepage search flow (`/search/news`) → 200 but the body is `ERROR !!!<code>` and the log carries `TypeError: Cannot read properties of undefined (reading 'toString')` from the template renderer; `chapman.js geodata` → Solr 400, `Document is missing mandatory uniqueKey field: id`; the admin web interface loads but 4 of its 5 `/shared/*.js` scripts return 403 with `Content-Type: text/html`, so the Ember app never initialises |
| T (extended) | 0 | Everything in T (declared), plus: the frontend's passive-auth call throws on every page under jQuery 4 (`e.indexOf is not a function`); `/api//usage/state` → 404 (the `/api//` double-slash break, as in R8 and R9); Solr logs `Error loading class 'solr.LRUCache'` on every core open |
| CSR / TSR / FBSR | 1.00 / 0.00 / 0.00 | N = 1 |
| Dependency coverage | 50 of 51 | 44 entries version-bumped, 6 removed (`body-parser` ×2, `ftp`, `optimist`, `request`, `gc-stats`), 4 replacements added (`mime-types`, `basic-ftp`, `minimist`, `undici`). The one untouched entry is `pace@0.0.4` in CLI, which was instead worked around in code (it throws on a zero total) |
| Breaking-pattern sweeps | complete | 0 `q.drain =` / `.empty =` / `.saturated =` assignments remain in first-party code (16 sites converted); 0 `req.query.hasOwnProperty(` calls remain (5 sites); 0 bare `*` routes remain (21 sites converted to `*splat`, 3 fused globs such as `:segmentFile(segment.*)` restructured) |

What the CLI commands actually did on the live stack: `resetindex` completes (exit 0); `index` completes through all four sections with 0 records, which is correct on an empty datastore; `courses` completes and **5,070 documents** land in the `course-codes` collection; `geodata` fails on the first country batch after 250 documents.

The two faults behind the failing checks are both genuine upgrade defects, and both are precise:

- **`/search/` 404.** Express 5's `*splat` requires at least one path segment, so `app.get("/search/*splat", …)` no longer matches the bare `/search/` that Express 4's `"/search/*"` matched. Every bare-wildcard route in the repo has this property; `/search/` is the one the user declared as a key page.
- **Search page template error.** `tv-radio-frontend/data/tv-radio-data.js:187` sets `stats.field` on the indexed-date field. `schema.xml` was migrated from `solr.Trie*Field` to `solr.*PointField` (15 field types) with **no `docValues` attribute anywhere in the file** — Solr answers `400 Can't calculate stats on a PointField without docValues`, the data layer returns undefined, and the template renderer dies on `.toString()`. Trie fields carried their own index structure; Point fields require `docValues="true"` for stats, faceting and sorting. This is the single missing attribute that costs the run its declared key page and key flow.
- **geodata 400.** `Document is missing mandatory uniqueKey field: id` on the country batch — the GeoNames column-mapping defect that R9's executor fixed and this run did not.
- **Admin `/shared/*.js` 403.** The repair session added an explicit route that serves the five symlink targets with `response.sendFile(target)`. Four of the five targets are paths containing `..` (`__dirname + "/../../Common/common.js"`), which `sendFile` refuses without a `root` option — so it 403s and falls through to the error page. Only `admin-common.js`, whose target has no `..`, is served. The underlying cause (git symlinks checked out as text files on a `core.symlinks=false` Windows clone) was diagnosed correctly; the fix was never re-tested after being written.

## 1.2 Generated tests

**The run generated no tests.** There is no test file anywhere in the working tree, and no test harness was created or run. Testing accuracy, precision, recall and F1 are undefined for this configuration (TP = TN = FP = FN = 0).

What replaced them was direct execution: both servers started against the live Docker stack and probed with `curl`, the four CLI commands run end to end, `uglify.minify` exercised standalone (confirming 0 bytes before the fix and 72 KB after), `path-to-regexp` v8 exercised standalone to discover that `:name(regex)` had been removed, and — the strongest step in the run — the migrated Solr configset uploaded to a **disposable** Solr 10 container (never the user's) until collection creation succeeded. That live loop caught four breaking changes no migration guide lists: `<checkIntegrityAtMerge>`, `solr.XSLTResponseWriter`, `solr.admin.AdminHandlers`, and `express.static.mime.define()`.

It did not catch the four faults in 1.1, for a consistent reason: every probe was made against the resource the agent had just changed, and none against the declared user-facing checks after the last change. `/search/` was never requested (the transcript shows `/search/` probed once, before the final Solr work, and the search flow never); geodata was declared "confirmed working end-to-end: no hang, and the CLI now correctly reports failure instead of the previous false success message" — that is, its failure was read as the *fix* working; and the `/shared` route was written in the repair session and summarised as fixed without a single request against it.

Scored the way section 1.2 of the overview scores the pipeline's tests — a detection counts only when it flags a real broken behaviour — this configuration has no detector at all, so recall is 0 by construction and precision is undefined.

## 1.3 Behaviour preservation

Same 13-behaviour reference set as the R1–R9 tv-radio runs, so the column is comparable. All 13 were observed directly on 26 Sep except b13.

| Behaviour | Status | Evidence |
| --- | --- | --- |
| b1 Frontend loads all modules | preserved | boots, serves the homepage |
| b2 Frontend registers routes and serves `/` | preserved | `GET /` → 200, 35,668 B; `/browse/channels`, `/browse/genres`, `/browse/programmes`, `/playlists` all 200 at ~22 KB |
| b3 Content modules resolve their dependencies | preserved | all content modules load at startup; `undici` and `mime-types` resolve |
| b4 Bare `/search/` route matches | **missing** | `GET /search/` → 404. `*splat` does not match an empty segment |
| b5 Search page renders without a template error | **missing** | `GET /search/news` → `ERROR !!!C27B8BCC…`; `[Content/TVRadio] issue during page rendering occurred`, `source: template-render`. Root cause: Solr 400 on `stats.field` over a `docValues`-less PointField |
| b6 Client bundle `/libs/client.js` is valid JavaScript | preserved | 200, 72,558 B of real minified JS. Fixed twice: the array-vs-object-map input, then the uglify-js 3 `sourceMap: {}` option shape |
| b7 Admin title search handles query options | preserved | `/api/titles/search?primarytitle=test&limit=5&offset=0&sortfield=…` → 200 `{"totalCount":0,"start":0,"entities":[]}`; 0 `hasOwnProperty` call sites remain |
| b8 Admin API boots and serves `/` | preserved | 200, 6,206 B |
| b9 `chapman.js index` completes | preserved | all four sections complete, exit 0, no hang |
| b10 `chapman.js geodata` ingest completes | **missing** | Solr 400 `Document is missing mandatory uniqueKey field: id` after 250 documents |
| b11 Frontend survives logging an error | preserved | winston 3 writes the template-render errors as JSON lines and the server keeps serving; the three winston-logstash 0.3.x monkey-patches were removed |
| b12 Admin UI reaches its API without `/api//` 404s | **missing** | `/api//usage/state` → 404, `/api/usage/state` → 200 |
| b13 Socket.IO client authorises against the Admin API | **missing** | the server is socket.io 4.8.3 and answers at `/api/socketio/socket.io/` (200), but `Admin/Interface/index.html` still loads the vendored `socket.io-1.1.0.js`; `Admin/Interface/libs/` was left at jQuery 1.11, Bootstrap 3, Ember 1.13 and Handlebars 3 despite the approved scope decision. In any case the admin app does not initialise (b-extra 2 below) |

Observed 13, preserved 8: **BPR 0.62, MBR 0.38, EBER 0**.

Three further behaviours sit outside the shared 13. They are reported separately so the denominator stays comparable with R1–R9; folding them in gives BPR 6/16 = 0.38 on the admin side or 8/15 = 0.53 counting only the two that are genuine regressions.

| Extra behaviour | Status | Note |
| --- | --- | --- |
| Frontend passive-auth runs on page load | **missing (new regression)** | `common.js:160` calls `loginIFrame.load(function(){…})`. jQuery 4 removed the `.load(handler)` event shortcut, so the argument is treated as a URL: `e.indexOf is not a function`. This is the **only** removed-API call site left in first-party frontend JS — the plan's sweep for `.bind()`/`.live()`/`.size()` converted the rest and missed this one |
| Admin Interface shared scripts load | missing, but **not a regression** | the `Interface/shared/*.js` symlink placeholders are broken in the pre-upgrade checkout too (recorded in R9 as an environment defect; B00 did not re-check them). The run diagnosed it correctly and shipped a fix that does not work |
| Frontend page formatting | degraded, not root-caused | the user reports "formatting of page is not correct". The templates are internally consistent — no `col-xs-*`, `hidden-*`, `data-toggle`, `panel-*` or `img-responsive` remains in any `.hbs` — but the site's own `uoa-lib-main.css` is still written against Bootstrap 3 markup and was not migrated |

New behaviours (NBR). Counting only observable changes the user did not ask for, following the overview's rule that requested changes do not count: (1) the Admin API now generates a random JWT secret per process when `JWT_TOKEN_SECRET` is unset, replacing a hardcoded checked-in secret — a security improvement, but sessions silently stop surviving a restart; (2) `/libs/client.js` minification failures are now logged rather than silently producing an empty bundle. The `/shared/:file` route and the CLI's now-accurate failure reporting were both requested ("fix all errors"; "confirm the command's own log output shows a real completion line") and are not counted. **NBR = 2 / (8 + 2) = 0.20.**

Beyond the metric, the run also repaired four pre-existing defects in the reference implementation, which no pipeline run found: `_ingestUSStates` never set `hasFinished` (geodata hung on its last step regardless of the async fix), `course-code-dataset.js` flushed its final batch only at `holding.length >= 10` (silently dropping 1–9 trailing records every run — the 5,070 documents now indexed are the visible consequence), two `q.length` vs `q.length()` property-versus-method bugs, and three shape bugs in the `config.js.default` / `shared-config.js.default` templates.

## 1.4 Cost and efficiency

Figures are from the session logs' `cost-state` records, which are authoritative for cost; per-thread token totals are de-duplicated by request id and reconcile with them to within 0.2% (the thread rows below sum to 182,180,683 against the session total of 182,453,922).

| Thread | Model | Minutes | Tokens (input + cache + output) | Note |
| --- | --- | --- | --- | --- |
| Main, upgrade session (24 Sep) | Sonnet 5, high effort | 90 wall / 92.5 API | 155,912,749 | 5 user turns; plan mode then auto |
| Explore: Express, Solr, vendored libs | Sonnet 5 | 3.6 | 1,790,034 | |
| Explore: async queues and uglify-js | Sonnet 5 | 2.8 | 786,630 | found all 16 `.drain =` sites up front |
| Explore: winston/influx and CLI ingest | Sonnet 5 | 2.0 | 591,286 | |
| general-purpose: mongodb driver 2 → 7 | Sonnet 5 | 15.0 | 11,244,115 | flagged 4 breakages outside its own scope |
| general-purpose: frontend vendored libs | Sonnet 5 | 15.2 | 11,481,863 | jQuery 4, Bootstrap 5, tempus-dominus, velocity-animate, js-cookie 3 |
| claude-code-guide ×2 (transcript export, `/usage`) | Haiku 4.5 | 1.7 | 374,006 | housekeeping, not upgrade work |
| **Upgrade session total** | | **90 wall** | **182,453,922** (input 101,627 uncached, 180,614,609 cached read, 1,285,815 cache write, output 451,871 incl. 196,281 thinking) | **US$44.74** |
| Main, repair session (26 Sep) | Sonnet 5, high effort | 36.6 wall / 15.6 API | 16,473,973 at the point the user recorded the cost | 4 user turns, no sub-agents; **US$4.73** |
| **Total** | | **127 min wall** | **198,927,895** | **US$49.46** |

Notes:

- Input tokens 199.0 M of which 99.2% served from cache; output 517,492. Uncached input across both sessions is 126,142 tokens — this configuration pays almost entirely for re-reading a very large context, not for new input.
- The repair session's final `cost-state` reads US$5.22 / 18.6 API minutes, but that includes writing the 300 KB transcript reconstruction the user asked for afterwards; US$4.73 is the figure at the end of the repair work and the one the user recorded.
- A third session on 24 Sep (`6476c1fd…`, 6 minutes, US$0.79) restored the Solr Docker image before the run and is excluded as environment preparation.
- Tool time was 8.3 minutes (upgrade) and 2.3 minutes (repair); the agent reports 1,030 lines added and 677 removed in the upgrade session, 60 added and 49 removed in the repair.
- N = 1, so mean and median coincide for every figure in this section.
- **Wall-time note (added 27 Sep).** The 127-minute total pairs the upgrade session's figure with the repair session's *end-of-session* wall time, which includes writing the transcript. Pairing both sessions at their upgrade/repair boundaries instead gives 92.2 + 31.0 = **123.2 minutes**, and that is the figure the overview's comparison-run table and `claude_refactored_chats/tv-radio.md` use. Token and cost figures are unaffected.
- Cost is not directly comparable with R1–R11, which are priced at GPT-5.5 list. Against those runs by magnitude: this run used **10.5× the input tokens of the median pipeline run** (17.4 M in R9, the closest comparable task) and **2.6× the cost of the most expensive tv-radio pipeline run** (R8, US$22.91), for 90 minutes of wall time against R9's 99.

## 1.5 LLM configuration

| Configuration | Reported value |
| --- | --- |
| Model | `claude-sonnet-5` (main and 5 of 7 sub-agents); `claude-haiku-4-5-20251001` for the 2 housekeeping sub-agents |
| Harness | Claude Code 2.1.280 (upgrade) and 2.1.282 (repair), VS Code extension, auto permission mode, plan mode for the first 3 turns |
| Reasoning effort | high, on every turn of both sessions |
| Temperature / max output tokens | not configurable in this harness; not recorded |
| Input tokens | total 198,410,403 (uncached 126,142: 101,627 upgrade + 24,515 repair), mean = median = 99,205,202 per session |
| Output tokens | total 517,492 (incl. 234,625 thinking) |
| Total tokens | 198,927,895 |
| Monetary cost | US$49.46 total; US$44.74 upgrade, US$4.73 repair |
| Execution time | 127 minutes wall (90 + 36.6); 108 minutes of API time |
| Environment | Windows 11, Node v24.15.0, Docker: Solr 10.0.0 (SolrCloud, `SOLR_MODULES=analysis-extras`), MongoDB 8, InfluxDB 1.8, Memcached |

## 1.6 Position in the ablation

This run is a useful ablation point because three of the four components in the framework were genuinely absent, and the transcript says so explicitly.

| Component | Present? | What stood in for it |
| --- | --- | --- |
| GitNexus graph retrieval | **no** | the tools were not registered in either session (the agent checked, then wrote: "This is a tooling-availability limitation, not a choice to skip the safety step"). Replaced by Grep sweeps per changed symbol and manual `git diff` review. The breaking-pattern sweeps it produced were *complete* — 16/16 `.drain`, 5/5 `hasOwnProperty`, 21/21 wildcard routes — which is at least as good as any pipeline run achieved on the same repo |
| LLM-generated testing | **no** | live execution: real servers, real CLI runs, standalone library probes, and a disposable Solr 10 container |
| Validation and repair feedback | **partly** | no separate validator thread, no confidence score, no key-page/key-flow check list applied at the end. The agent validated inline, as it changed each thing, and then summarised from those intermediate results rather than re-checking at the end — which is exactly how the four surviving faults were reported as fixed |
| Orchestration, staged plan, human gates | yes | plan mode with three scope questions, an approved seven-stage plan, per-stage grep verification |

Read against R9 (the same task, full pipeline, GitNexus indexed): FBSR is 0 in both. The pipeline run preserved 9 of 12 observed behaviours against this run's 8 of 13, for a third of the cost, but touched neither Solr's actual config validity nor the vendored libraries. This run's distinctive contributions — a Solr configset that a real Solr 10 accepts, four undocumented Solr breaking changes found by execution, a working `uglify-js` 3 source-map call, four pre-existing correctness bugs repaired — all came from *running things*, and every one of its surviving faults would have been caught by running the user's own declared check list once at the end.

## Stage outcomes

| Stage | Result |
| --- | --- |
| Research | 3 parallel Explore sub-agents (Express/Solr/vendored libs; async/uglify; winston/influx/CLI) in the first 4 minutes. Discovered that `Admin/API/node_modules/express` was already at 5.2.1 while `package.json` declared 4.9.5 — so the Express 5 breaks were live bugs, not future risk |
| Plan | 3 scope questions put to the user, then a 7-stage plan (correctness fixes → Express 5 → winston/influx → backend majors → Solr → vendored front-end libs → validation), approved once and followed in order |
| Execution | 8 package manifests, 35 first-party `.js` files, 3 Solr XML files, 27 `.hbs` templates; 2 sub-agents for the mongodb driver rewrite and the frontend vendored libraries; per-stage grep verification after each pattern fix |
| Self-validation | both servers started against the live stack and probed; 4 CLI commands run; Solr configset iterated 6 times against a disposable container until 4 collections created and a document round-tripped |
| Scope narrowing | `Admin/Interface` (Ember 1.13, ~38 files) and JW Player / dash.js / Shaka dropped and flagged, despite the user's approved "full major-version upgrades" decision for the vendored libs. This is the single largest deviation from the agreed scope and it is what leaves b13 and the admin UI where they are |
| Repair session (26 Sep) | user pasted the post-run error log; 4 root causes diagnosed (Windows symlink placeholders, missing JWT secret, InfluxDB credentials, zero Solr collections); the Solr side was finished correctly after the user recreated the container with `SOLR_MODULES=analysis-extras`; the `/shared` route fix was shipped untested and does not work |
| Commit | none. The entire upgrade is uncommitted working-tree state, and the Solr configset and collections are local-only ZooKeeper state the agent flagged as untracked |

## What was broken afterwards

1. `/search/` 404s and any search flow renders `ERROR !!!` — Express 5 `*splat` plus a `docValues`-less Point field schema.
2. `chapman.js geodata` fails on the country batch with a missing `id`.
3. The admin Ember interface does not initialise: 4 of 5 `/shared/*.js` return 403 with an HTML content type.
4. `/api//usage/state` 404s (the `/api//` double-slash break, third run in a row).
5. Frontend passive-auth throws on every page: `loginIFrame.load(function(){…})` under jQuery 4.
6. Frontend formatting is visibly wrong: `uoa-lib-main.css` is still Bootstrap 3-era.
7. Solr logs `Error loading class 'solr.LRUCache'` on every core open — `solr.FastLRUCache` was replaced with `solr.LRUCache`, which Solr 10 no longer resolves under that name (`solr.search.CaffeineCache` is the current class).
8. `socketio-jwt` was kept (at ^4.6.2) rather than replaced, against the approved scope decision, and the vendored socket.io client is still 1.1.0 against a 4.8.3 server.

## Run-specific recommendations

- Run the user's declared check list as a **final** step, unchanged, after the last edit. Every one of faults 1–5 above is reachable by one `curl` or one CLI invocation, and four of them were reported as fixed on the strength of an intermediate result.
- Never report a fix that was written but not exercised. The `/shared` route (`sendFile` with a `..` path) is the clearest case in the corpus: a single `curl http://localhost:8080/shared/common.js` would have shown the 403.
- Add `docValues="true"` to every `*PointField` type in `schema.xml` before declaring a Trie → Point migration complete, and grep the application for `stats.field`, `facet.field` and `sort=` over those fields. Put this in the known-break table alongside the Express 5 and async 3 entries.
- Put the Express 5 empty-segment case in the known-break table too: `"/x/*"` → `"/x/*splat"` is not behaviour-preserving for the bare `/x/` URL. Either add a second route or use `{/*splat}`.
- When a scope decision is approved at a gate and later abandoned (here, `Admin/Interface`), say so at the gate's granularity, not only in a closing bullet — the user approved a full vendored-library upgrade and received one for half the repo.
- Commit the work. An upgrade that exists only as a dirty working tree cannot be diffed, reverted, or scored against a branch, and the Solr configset that makes it run is untracked local state.

Evidence sources: the chat, the four session logs and seven sub-agent logs listed above, and direct verification on 26 Sep 2026 (servers booted and probed, four CLI commands run, Solr collection counts and container logs read, static sweeps and `node --check` over the changed files).
