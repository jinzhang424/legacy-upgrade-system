# Evaluation C3: `claude_refactored_chats/conifer.md` (Claude Code, direct agent, Conifer full stack, 26–27 Sep 2026)

Verdict: the most ambitious piece of work in the corpus, and the one whose failure is hardest to see. The same full-stack Conifer modernization as [R11](R11-conifer.md) — five manifests, five Dockerfiles, two Compose files, React 16→19, webpack 4→5, react-router 4-beta→7, `redux-connect` removed, `node-sass`→`sass`, `raven`→`@sentry/react`, `enzyme`→Testing Library, `youtube_dl`→`yt-dlp`, pywb 2.5→2.10 — was completed in 5 h 32 m for US$62.28. All 13 services build and run with zero restarts, every declared page returns HTTP 200 with correct server-rendered markup, the home page carries `Conifer | Homepage` in its SSR `<title>`, and both external-service checks pass. It also repaired all four baseline defects ([B00](B00-pre-upgrade-baselines.md)), fixed the interactive `jest --watch` flag, and — unlike R11 — did **not** weaken the anonymous-access check.

**The client bundle is dead.** Every page in the application throws `ReferenceError: process is not defined` before React hydrates, because webpack 5 removed the automatic `process` shim and no `ProvidePlugin`/fallback replaced it. The reference never throws. Nothing about this is visible over HTTP: the SSR tree renders fully, the status is 200, the title is right. In the browser, React attaches no roots at all (`Object.keys(#app)` contains no `__react*` key), Swagger UI at `/docs/api` renders **nothing** into its container, the Sign Up link becomes a full page reload rather than a client-side route transition, and the login form — which has no `method` or `action` — falls back to a native GET, so submitting it puts the username and password in the URL as `?username=…&password=…`. The run verified these pages with `curl` and a grep for `swaggerContainer`, which is precisely the false positive the task brief warned about in bold.

Three further server-side routes (`/:user/_settings`, `/:coll/manage`, `/:coll/$new`) return HTTP 500 with `Element type is invalid … got: undefined`. Bookmark-list creation returns 500 and uploaded WARCs are never indexed — the **same two regressions R11 had**, from the same redis-py major jump, except that here it was a deliberate, documented decision (`redis>=5.0` added to override pywb's `redis==2.10.6` pin) taken after auditing only the application's own redis calls, not pywb's. The failing `zadd` is in pywb 2.10.0's `redisindexer.py`.

C = 1, T (declared) = 0, FBSR = 0. BPR 0.48 under the oracle as R11 used it (0.71 if the console-clean clause is dropped), MBR 0.52, EBER 0, NBR 0.06.

This is **not** a `$upgrade` pipeline run. It is the same task given to a general coding agent (Claude Code, Sonnet 5, high effort) with no orchestrator, no generated test suite, no separate validation gate and no GitNexus, so it belongs in the ablation section of the framework rather than in the R1–R11 aggregates. Section 1.6 states which components were absent and what stood in for them.

| Item | Value |
| --- | --- |
| Chat | `claude_refactored_chats/conifer.md` (the agent's own end-of-session reconstruction, 58 KB; also left in the target repo as an untracked `CONVERSATION_LOG.md`) |
| Session log | `~/.claude/projects/C--Users-OEM-conifer/f381cc61-d4e7-42c0-afd6-d095a1052b4d.jsonl` (3,291 records, 7.1 MB) plus six sub-agent logs under `f381cc61…/subagents/`. A separate 3.9-minute follow-up session (`49235bb7…`, US$0.24) moved the transcript |
| Target as given | `C:\Users\OEM\legacy-upgrade-system\projects\conifer` — identical intake to R11: every outdated entry in `frontend/package.json`, `webrecorder/requirements.txt`, `webrecorder/setup.py`, `search-driver/package.json`, five Dockerfiles, `docker-compose.yml`, `search-compose.yml`; repair the three known start-up failures at HEAD; no re-architecture; `data/`, `wr.env`, `node_modules/`, `proxy-certs/`, `migration_scripts/`, generated bundles and the two `.bak` files out of scope |
| Target actually used | `C:\Users\OEM\conifer` — a separate clone of the same upstream repository at the **same base commit `c406b480`**, so the comparison with R11 holds. The agent's first tool call (a `pwd` and directory listing) was interrupted by the user, who then said *"only look at the files in this repo"*; it complied and never touched the designated workspace. `projects/conifer` carries R11's branch at `40be3587`; this clone has no `.gitnexus` store |
| Validation commands from user | `docker compose build`; `docker compose up -d` for 12 services; readiness on `http://localhost:8089/` with the SSR title `Conifer \| Homepage`; key pages `/_login`, `/_register`, `/_faq`, `/docs/api`; key flows "Sign Up client-side navigation" and "invalid login"; live Redis and Solr config checks; datastore empty; capture/replay explicitly out of scope. The brief states that a 200 is not proof and that **any `error` or `pageerror` console entry is a genuine failure** |
| Branch and state evaluated | `main`, uncommitted working tree on `c406b480`. 150 changed paths with a real diff (124 text, 26 SVGs differing only by line endings), 4 deletions, 10 untracked files. Excluding the regenerated `yarn.lock`: **+1,091 / −1,470 across 149 files**. `yarn.lock` alone is +8,119 / −8,974. No commit, no stash |
| Pipeline verdict | not applicable — no validator, no confidence score |
| Human decisions | 3 substantive: the pasted brief; one tool interruption plus *"only look at the files in this repo"*; and the plan-mode approval. Two housekeeping turns at the end exported the transcript. The "check whether agent X has finished" turns in the chat are the run's **own** `ScheduleWakeup` prompts, not the user's |
| Verification date | 27 Sep 2026, against the running stack as the session left it: all 13 containers, a 31-behaviour Playwright + HTTP oracle equivalent to R11's, the frontend Jest suite, `compileall`, the player build entry, and the live Redis and Solr configuration |

## The hydration failure

This is the finding the whole report turns on, so it is worth stating with its evidence.

The production client bundle (`/static/main-b8290325647de24e5e8f.js`, 4.55 MB) contains 28 references to `process.nextTick` and further references to `process.env`, `process.emit`, `process.cwd`, `process.stdout` and `process.stderr`, all of them inside vendored library code. Webpack 4 injected a `process` shim into every bundle automatically. **Webpack 5 does not**, and — this is the trap — it emits **no build error** for it, because `process` is a bare global reference rather than a module import. The build compiles clean; the browser throws on first evaluation.

Measured in headless Chromium (build 1234, the same browser B00 used):

| Probe | Result |
| --- | --- |
| `pageerror` on `/` | `ReferenceError: process is not defined` |
| React hydration on `/` | `Object.keys(#app)` contains **no** `__react*` key; no `[data-reactroot]`. React never mounted |
| `/docs/api` | HTTP 200, `#swaggerContainer` `innerHTML.length` = **0**, `.swagger-ui` elements = 0, `.opblock` = 0. Whole-page text is 43 characters — the SSR header and footer only |
| Flow 1 (Sign Up) | reaches `/_register` and the `name="confirmpassword"` field is present, but by a **full page reload**. The brief: *"A full-page reload or a blank render here means the router migration failed"* |
| Flow 2 (invalid login) | lands on `/_login?username=nonexistent_user_upgrade_check&password=wrongpassword123`. No rejection message is rendered |
| Login form markup | `<form id="loginform" class="">` — no `method`, no `action` |

The run found and fixed three *other* missing Node-core shims (`path`, `stream`, `querystring`) by adding `resolve.fallback` entries. It found all three the same way: the build failed and named them. `process` is the one that does not announce itself, and it is the one that was missed. The fix is one plugin — `new webpack.ProvidePlugin({ process: 'process/browser' })` — plus the `process` package.

**The credentials-in-URL behaviour is the most serious downstream consequence** and is a new behaviour, not a lost one. A password submitted this way lands in browser history, in the `Referer` header of every subsequent request from that page, and in nginx's access log. Nothing in the original does this.

The run's self-assessment was honest about its limits — *"the interactive browser flows … need real Playwright, which I don't have direct access to — I verified the underlying markers are present in the rendered HTML, but couldn't click through"* — but the conclusion it drew from the markers ("All the key markers are present") is exactly the inference the brief told it not to make. The user's own closing note, *"No apparent issues found when manually testing it,"* is itself evidence of how well a complete SSR tree hides a dead bundle.

## The redis-py decision

R11 lost bookmark lists and the WARC index because redis-py rose from 2.10.6 to 6.1.1 as an *unpinned transitive* dependency that nobody noticed. This run noticed. During the first backend build, pip printed:

```
pywb 2.10.0 requires fakeredis<1.0, but you have fakeredis 2.38.0 which is incompatible.
pywb 2.10.0 requires redis==2.10.6, but you have redis 8.1.0 which is incompatible.
pywb 2.10.0 requires werkzeug==3.1.7, but you have werkzeug 3.1.8 which is incompatible.
```

It resolved werkzeug correctly by matching pywb's exact pin, then grepped the application for `StrictRedis` and `decode_responses`, found only `from_url()` and ordinary commands, judged the redis jump low risk, added an explicit `redis>=5.0` to `requirements.txt`, and recorded the rest as "an accepted, documented tradeoff". That reasoning is well-formed and the finding was correctly reported to the user as the genuine version conflict the brief asked for.

The audit was one package too narrow. The failing call is not in Conifer:

```
File "pywb-2.10.0-py3.11.egg/pywb/recorder/redisindexer.py", line 75, in add_urls_to_index
    self.redis.zadd(z_key, 0, cdx)
redis.exceptions.DataError: ZADD requires at least one element/score pair
```

pywb 2.10.0 pins `redis==2.10.6` precisely because its own recorder still uses the redis-py 2 `zadd(key, score, member)` signature. Overriding that pin is what breaks the WARC index (k31), and replay of an uploaded capture now returns HTTP 500.

The bookmark-list failure (k30) is in Conifer's own code and is the identical line R11 hit — `create_bookmark_list` passes `props.get('before_id')`, normally absent, down to `zscore(key, None)`:

```
File "/code/webrecorder/models/collection.py", line 209, in create_bookmark_list
File "/code/webrecorder/models/collection.py", line 279, in get_list
File "/code/webrecorder/models/base.py", line 723, in contains_id
redis.exceptions.DataError: Invalid input of type: 'NoneType'.
```

redis-py 2 encoded `None` as the literal string `"None"`; redis-py ≥ 3 raises. A grep for `StrictRedis` cannot find this, and neither can a grep for `zadd`. What finds it is running the feature, or running `webrecorder/test/test_lists_anon_user.py` — one of the 33 developer test files that are still not runnable (see 1.2).

## 1.1 Build effectiveness

| Metric | Value | Evidence |
| --- | --- | --- |
| C (build and boot) | 1 | All 13 Compose services `running` today with **0 restarts** on every one of `app`, `recorder`, `warcserver`, `frontend`, `nginx`, `redis`, `solr`. Both webpack bundles (client and server) compile with zero errors. `python -m compileall /code/webrecorder` exits 0 |
| T (user's declared checks) | 0 | Startup health check fails the brief's own console rule (`pageerror` on `/`); `/docs/api` renders nothing; Flow 1 is a full page reload; Flow 2 submits over GET and shows no rejection. The two `external_service_checks` pass |
| CSR / TSR / FBSR | 1.00 / 0.00 / 0.00 | N = 1 |
| Frontend Jest | fails | 1 suite, **3 of 3 tests fail**: `TypeError: React.act is not a function` — React 19 moved `act`, and the installed `@testing-library/react` still reaches for `react-dom-test-utils`. The run flagged this and, per the brief's own note that the suite proves little, did not chase it |
| Developer pytest suite | still unrunnable | `pytest`, `webtest`, `mock` and `responses` are all absent from the app image. `setup.py` was correctly modernized (`tests_require` → `extras_require['test']`, `dependency_links` and the `setup.py test` command removed) and CI was updated to `pip install -e .[test]`, but `webrecorder/Dockerfile` still only runs `pip install -r requirements.txt`. **Not one of the 33 test files was executed during the run** |
| Baseline defects repaired | 4 of 4 | (1) the Werkzeug/Jinja2 deadlock — solved better than R11 by replacing the `werkzeug.user_agent` dependency entirely with a `ua-parser`-backed shim in `utils.py` and pinning `werkzeug==3.1.7` to match pywb exactly, plus `jinja2.contextfunction` → `pass_context` across 12 call sites; (2) the `ulimit` shell builtin removed from the three uWSGI commands, relying on the existing `ulimits:` directive; (3) the `exec $@` word-splitting bug in pywb's entrypoint worked around with `env -u UWSGI_MOUNT uwsgi …`, which also fixes a second, undocumented defect — the base image bakes `UWSGI_MOUNT=/=/pywb/pywb/apps/wayback.py`, which double-mounted pywb's own app and crashed under modern gevent; (4) `catatnight/postfix` replaced with `boky/postfix`, and the `mailserver` service now starts healthy and is back in the stack |
| CRLF repair | 633 of 635 | A genuine, unglamorous piece of work: the clone was checked out under a global `core.autocrlf=true`, which corrupted every shell script (`redis` would not boot: `env: 'bash\r': No such file or directory`). 633 tracked files converted to LF and a `.gitattributes` added. See the caveat below |
| Scope discipline | clean | No change under `data/`, `wr.env`, `node_modules/`, `proxy-certs/`, `migration_scripts/`, `static/bundle/`, `frontend/static/`, or the two `.bak` files. The one `solrconf/` edit (`luceneMatchVersion` 8.5.1 → 10.0.0) is the reconciliation the brief explicitly requested |
| Dependency coverage | high | See below |

**Dependency coverage.** Every manifest was addressed. `webrecorder/requirements.txt` went from 7 pinned and 7 bare names to 15 explicit pins (`bottle==0.13.4`, `werkzeug==3.1.7`, `bleach==6.4.0`, `boto3==1.43.100`, `requests==2.34.2`, `itsdangerous==2.2.0`, `psutil==7.2.2`, `gevent-websocket==0.10.1`, `fakeredis==2.38.0`, `apispec==6.10.0`, `yt-dlp` replacing `youtube_dl`, `ua-parser` new); `six` was removed from all 16 files that imported it and the last `iteritems()` call sites rewritten. Images: `node:10.6.0`/`node:12.8.0` → `node:24`, `pywb:2.5.0` → `2.10.0`, `redis:3.2.4` → `redis:8.8`, `nginx:1.13-alpine` → `nginx:1.30-alpine`, unpinned `solr` → `solr:10.0.0`, `zookeeper:3.6` → `3.9`, `shepherd:1.2.0` → `1.2.5-beta.1`. `version: '2'` and all 13 `container_name:` entries removed from `docker-compose.yml`. On the frontend, `hard-source-webpack-plugin`, `file-loader`, `url-loader`, `node-sass`, `enzyme`, `raven-js`, `raven-for-redux`, `@babel/polyfill`, the `babel-core` bridge, `redux-connect`, `react-router-config` and `react-router-breadcrumbs-hoc` are all gone, and `universal-webpack` — the unmaintained SSR wrapper R11 had to hand-repair — was removed outright rather than patched.

Four judgement calls are worth recording because each was researched rather than guessed, using live registry data:

- **Babel stays on 7.x.** Babel 8 has shipped, but the brief said "latest 7.x", and the run honoured the instruction over the newer option.
- **ESLint pinned to 8.57.1**, not 10.x, because `eslint-config-airbnb` has no flat-config support; `eslint-webpack-plugin` was then pinned back to `^3.2.0` after reading that specific version's `package.json` to confirm ESLint 8 support.
- **Immutable pinned to 4.3.9**, not 5.x, because `redux-immutable`'s peer range stops at 4.
- **pywb has no 3.x.** An exploration agent asserted a breaking pywb 3 restructure; the run fetched `pypi.org/pypi/pywb/json` and the upstream `CHANGES.rst`, established that 2.10.0 is both the latest 2.x and the latest overall, and corrected the plan. That is the single best piece of self-correction in either corpus.

Three residuals in coverage:

- **`boky/postfix:latest` and `webrecorder/dat-share` carry no version tag.** The brief's whole point about the untagged `solr` image was that floating tags hide age; the replacement mailserver reintroduces exactly that. R11 pinned `boky/postfix:5.1.0`.
- **`shepherd-client` is still `github:oldweb-today/shepherd-client#rb-dimensions`.** The brief said to resolve each of the three forked dependencies to a maintained upstream release "or flag it if not". `react-collapsible` was resolved to the registry `^2.10.0` and `react-router-breadcrumbs-hoc` was replaced with an inline implementation; `shepherd-client` was neither resolved nor flagged in the final report.
- **`search-compose.yml` still declares `version: '3'`.** The brief named only `docker-compose.yml`, so this is a consistency miss rather than a scope miss; R11's validator cleaned it.

**Two build entry points are now broken.** `npm run build-player` and `npm run build-desktop` both fail. Verified by running the player build: `Can't resolve 'react-router-config'` (the package was removed from `package.json` while `containers/PlayerApp/index.js:6` still imports `renderRoutes` from it), plus `Can't resolve 'querystring'` in five files and `Can't resolve 'path'` in two, because `player.config.js` and `desktop.config.js` are standalone configs that declare only `fallback: { fs: false }` and never received the Node-core fallbacks the base config got. The run flagged `PlayerApp` as out of scope and said so plainly, which is honest — but the brief's exclusion list does not mention it, and it also still uses the removed `DragDropContext` decorator and a default `HTML5Backend` import that no longer exists.

## 1.2 Generated tests

**The run generated no tests.** No test file was added, and the existing `src/components/TempUserTimer/index.test.js` was left untouched. TP = TN = FP = FN = 0, so accuracy, precision, recall and F1 are all undefined for this configuration.

What replaced them was execution, and a great deal of it: 142 `Bash` calls, repeated `docker compose build` cycles per service, six `docker compose up` / log-inspection rounds, direct container introspection of `node_modules` to settle export shapes (`react-dnd-html5-backend`, `@novnc/novnc`, `react-router-dom`), and `curl` probes of five pages plus the two live-service checks. That loop found a long list of real defects that no static analysis would have produced — the CRLF corruption, the `UWSGI_MOUNT` double-mount, `jinja2.contextfunction`, the apispec 6 `add_path` → `path` rename, dart-sass `includePaths`/`loadPaths`, three missing Node-core shims, `@novnc/novnc`'s tightened `exports` map, `react-dnd-html5-backend`'s missing default export, stale v5 `matchPath()` signatures, Node 24's read-only `navigator` global, and an SSR data-loading race.

The loop's limit is that it terminated at `curl`. Every one of those defects announced itself as a build error or a container exit. The three that did not — the dead `process` global, the three SSR-500 routes, the redis-py `zadd` — all sit behind an HTTP 200 and needed either a browser or a feature exercised end to end.

The comparison with R11 is unusually clean, because the two runs failed the same task in opposite directions. R11's generated-test component produced one recorded test and one adopted existing test, and the adopted one did active harm: `test_colls_api.py` was stale at the base commit, the validator treated its 403 as a regression, and "repaired" it by removing an access check from `basecontroller.py` — which is why R11 lost k25. This run generated nothing, ran no pytest file at all, and **k25 is preserved**. Scored strictly: R11 TP 0, FP 1 (with harm); C03 TP 0, FP 0, FN 2 (k30 and k31 were both detectable by existing tests it never ran). Neither configuration detected anything; only one of them also removed an authorization check.

The sharper reading is that the pytest suite was the shared blind spot. `webrecorder/test/test_lists_anon_user.py` and `test_upload.py` exercise exactly k30 and k31. Both runs left them unrunnable, and both shipped both regressions. Installing six packages into the app image would have cost either run a few minutes.

## 1.3 Behaviour preservation

Same 31-behaviour reference set as R11, measured with an equivalent Playwright + HTTP oracle on 27 Sep 2026 (the full-text search check is excluded on both versions because `SEARCH_AUTO` is unset). Per B00 the original exhibits all 31, so every "missing" below is a loss relative to a behaviour the reference actually has.

| Behaviour | Original | This run | Status |
| --- | --- | --- | --- |
| k1 core services running | running | 13 running, 0 restarts | preserved |
| k2 `/` SSR title and clean console | pass | title correct, **`pageerror`, no hydration** | **missing** |
| k3 `/_login` form | pass | fields present, same `pageerror` | **missing** |
| k4 `/_register` form | pass | fields present, same `pageerror` | **missing** |
| k5 `/_faq` | pass | 32 KB renders, same `pageerror` | **missing** |
| k6 `/_policies` | pass | 36 KB renders, same `pageerror` | **missing** |
| k7 `/docs/api` Swagger UI renders | pass | **container empty, 0 operations** | **missing** |
| k8 Sign Up client-side navigation | pass | **full page reload** | **missing** |
| k9 invalid login shows rejection | pass | **GET submit, credentials in URL, no rejection** | **missing** |
| k10 OpenAPI spec `/api/v1.json` | 52 paths, 14 tags, 3.0.0 | 52 paths, 14 tags, 3.0.0 | preserved |
| k11 admin CLI creates a user | pass | pass | preserved |
| k12 API login with valid credentials | 200 | 200 | preserved |
| k13 current-user endpoint | pass | pass | preserved |
| k14 create collection (logged in) | 200 | 200 | preserved |
| k15 list collections | pass | pass | preserved |
| k16 get collection | pass | pass | preserved |
| k17 user page lists the collection | pass | lists it, same `pageerror` | **missing** |
| k18 collection page renders | pass | **renders** (R11: 504), same `pageerror` | **missing** |
| k19 collection management page | pass | **HTTP 500** | **missing** |
| k20 new-capture page | pass | **HTTP 500** | **missing** |
| k21 user settings page | pass | **HTTP 500** | **missing** |
| k22 delete collection | pass | pass | preserved |
| k23 logout | pass | pass | preserved |
| k24 valid login through the UI lands on the user page | pass | **stays on `/_login`, GET submit** | **missing** |
| k25 anonymous session is refused API collection creation | 403 | **403** (R11: 200) | preserved |
| k26 anonymous session can list its own collections | 200 | 200 | preserved |
| k27 registration API accepts a sign-up | 200 | 200 | preserved |
| k28 Redis running version matches the Dockerfile pin | 3.2.4 = 3.2.4 | 8.8.3 = `redis:8.8` | preserved |
| k29 Solr `conifer` core at the repo's `luceneMatchVersion` | Solr 10.0.0, Lucene 8.5.1 | Solr 10.0.0, Lucene 10.0.0 | preserved |
| k30 create a bookmark list in a collection | 200 | **500, `DataError` on `None`** | **missing** |
| k31 an uploaded WARC is indexed into its collection | recording 1,823 bytes | **recording 0 bytes, replay 500** | **missing** |

Observed 31, preserved 15: **BPR 0.48, MBR 0.52, EBER 0.**

That number needs one qualification to be read fairly. Nine of the sixteen losses (k2–k6, k17, k18, and in part k8) are the **same single defect** — the dead `process` global — scored once per page, and five of those pages (k2–k6, k17, k18) still render correct markup and fail only the brief's console-clean clause. If that clause is dropped and only substantive page content is scored, preserved rises to 22 and **BPR is 0.71, MBR 0.29**. The strict figure is the primary one because it is the rule R11 was scored under and the rule the user's brief states, but the corpus comparison should quote both: R11 lost four behaviours from four independent causes; this run lost sixteen from four causes, one of which accounts for nine of them and is a one-line fix.

**New behaviours (NBR).** Counting only observable changes the user did not ask for: the login form now transmits the username and password as a URL query string on submit (k9, k24). The mailserver now starting and `npm test` now running non-interactively are both requested fixes and are not counted, per the overview's rule. **NBR = 1 / 16 = 0.06.**

Not observed directly, as in R11: live capture through a remote browser (images not installed), full-text search (disabled), e-mail delivery.

One inherited failure is **not** charged to this run: `GET /api/v1/recording/{rec}/num_pages` returns 500 with `AttributeError: 'Recording' object has no attribute 'count_pages'`. `recscontroller.py` and `models/recording.py` differ from the base commit only in their `six` → `urllib.parse` import lines, so the method has been missing since before the upgrade.

## 1.4 Cost and efficiency

Figures are from the session log's two `cost-state` records. The first is the state at the end of the upgrade work, at the moment the user asked for a transcript; the second is the end of the session and includes writing the 58 KB transcript.

| Boundary | Wall | API time | Tool time | Tokens | Cost |
| --- | --- | --- | --- | --- | --- |
| End of upgrade work | **332.1 min** (5 h 32 m) | 109.6 min | 80.8 min | **257,369,228** | **US$62.28** |
| End of session (incl. transcript) | 350.0 min | 115.4 min | 80.8 min | 260,429,909 | US$63.38 |
| Follow-up session `49235bb7` | 3.9 min | 1.1 min | 0.06 min | 547,379 | US$0.24 |

Breakdown at the upgrade boundary:

| Model | Input (uncached) | Cache read | Cache write | Output (of which thinking) | Cost |
| --- | --- | --- | --- | --- | --- |
| `claude-sonnet-5` | 132,912 | 253,828,051 | 1,285,357 | 485,340 (245,991) | US$60.16 |
| `claude-haiku-4-5-20251001` | 1,615,631 | 0 | 0 | 21,937 | US$2.13 |

Thread structure — one main thread and six sub-agents, all Sonnet 5:

| Thread | Kind | Duration | Tool calls | Total tokens | Share |
| --- | --- | --- | --- | --- | --- |
| Main | orchestrator | 5 h 47 m span | 555 | 206,958,838 | 80.4% |
| Router v7 + `redux-connect` removal | fork | 14 m 0 s | 139 | 32,401,041 | 12.6% |
| react-bootstrap v2 migration | fork | 4 m 6 s | 45 | 14,497,009 | 5.6% |
| Frontend npm version research | general-purpose | 8 m 39 s | 33 | 1,221,654 | 0.5% |
| Backend WSGI/uwsgi diagnosis | Explore | 15 m 11 s | 42 | 916,760 | 0.4% |
| Backend/infra version research | general-purpose | 3 m 11 s | 48 | 878,093 | 0.3% |
| Frontend routing/redux/SSR survey | Explore | 2 m 44 s | 47 | 495,833 | 0.2% |
| **Total** | | | | **257,369,228** | |

Sub-agent totals are de-duplicated by request id; the main thread is the session total minus the six sub-agents, which is the same convention C01 uses. The same table is now recorded at the foot of `claude_refactored_chats/conifer.md`.

Notes:

- **The two forks are 92% of all sub-agent token spend** (46.7 M of 50.4 M cache reads) and produced the two largest and best pieces of work in the run: the router rewrite converted 13 containers off `asyncConnect`, wrote four new helpers, and — unprompted — found and fixed 23 further files using the removed bare `react-router` `withRouter` HOC, which would have been a hard crash. The react-bootstrap fork caught `Button block` usage across 8 files, which was not in the brief at all.
- Main-thread tool mix: Bash 142, Edit 140, Read 109, WebFetch 59, Grep 35, Write 23, WebSearch 12, Glob 9, ListAgents 9, Agent 6, ScheduleWakeup 6, ToolSearch 3, EnterPlanMode 1, ExitPlanMode 1.
- **132,912 uncached input tokens for the whole upgrade**, against 253.8 M served from cache. As in C02, this configuration pays almost entirely for re-reading its own accumulated context, and the bill is dominated by the two long-lived forks.
- The 40 `WebSearch` requests (all billed to Haiku) are the live-version research that produced the Babel, ESLint, Immutable and pywb decisions above. US$2.13 for the component that kept the run off four wrong version choices is the best-value line in the table.
- Wall time includes long idle stretches: the run used six `ScheduleWakeup` calls to poll for background agents. API time is 33% of wall, tool time a further 24%.
- N = 1, so mean and median coincide for every figure.
- Cost is not directly comparable with R1–R11, which are priced at GPT-5.5 list, and token counts are not comparable at all: Claude Code bills and reports cache reads per request, so 253.8 M here is not 4× the work of R11's 65.0 M.

Against R11, the same task through the full pipeline:

| | R11 (pipeline, Codex / GPT-5.5) | C03 (Claude Code, Sonnet 5) |
| --- | --- | --- |
| Threads | 8 | 7 (1 + 6) |
| Wall time | 784 min (incl. ~3 h usage lockout) | **332 min** |
| Tokens | 65,005,806 | 257,369,228 (not comparable) |
| Notional cost | **US$52.71** | US$62.28 |
| Substantive user turns | 3 decisions plus 2 stage gates | **3** |
| Services up | 12 (+ mailserver) | 13 |
| Baseline defects repaired | 4 of 4 | 4 of 4 |
| `universal-webpack` | hand-repaired by the orchestrator | **removed** |
| T (declared) | **1** | 0 |
| T (independent) | 0 | 0 |
| BPR | **0.87** | 0.48 (0.71 content-only) |
| k25 access check | **removed** | preserved |
| k18 collection page | 504 | **renders** |
| k30, k31 redis-py | broken | broken |
| Browser verification | Playwright, by the validator | **none** |
| Committed | `40be3587` | **no** |

The pipeline cost 18% less and took 2.4× longer, and the difference in outcome is almost entirely one component: R11's validator drove a real browser and this run did not. That single capability is worth nine of this run's sixteen lost behaviours, and it is the only thing that would have caught the one-line `process` defect.

## 1.5 LLM configuration

| Configuration | Reported value |
| --- | --- |
| Model | `claude-sonnet-5` (all upgrade work, main thread and all six sub-agents); `claude-haiku-4-5-20251001` for the 40 web searches and session titling |
| Harness | Claude Code 2.1.283, VS Code extension, **auto** permission mode with one excursion into **plan** mode |
| Reasoning effort | **high** (`"effort": "high"`, `perTurnEffort: null` — set once for the session) |
| Temperature / max output tokens | not configurable in this harness; not recorded |
| Input tokens | 132,912 uncached + 253,828,051 cache read + 1,285,357 cache write (Sonnet); 1,615,631 (Haiku) |
| Output tokens | 507,277, of which 245,991 thinking |
| Total tokens | 257,369,228 at the upgrade boundary; 260,429,909 for the session |
| Monetary cost | US$62.28 upgrade; US$63.38 session; US$63.62 including the follow-up session |
| Execution time | 332.1 min wall, 109.6 min API, 80.8 min tool |
| Environment | Windows 11, Docker Engine 29.5.3, Compose v5.1.4, Node v24.15.0, no MCP servers registered, no GitNexus. Resolved in the images: Node 24, pywb 2.10.0, redis-py 8.1.0, fakeredis 2.38.0, Werkzeug 3.1.7, Jinja2 3.1.6, Solr 10.0.0, Redis 8.8.3 |

## 1.6 Position in the ablation

| Component | Present? | What stood in for it |
| --- | --- | --- |
| GitNexus graph retrieval | **no** | not registered, and the clone the run was steered into has no `.gitnexus` store. Replaced by two `Explore` sub-agents, 35 `Grep` sweeps and 109 file reads. On this task the substitution held up well: the backend agent traced the `werkzeug.user_agent` crash and found all 23 `six` importers; the frontend agent mapped `asyncConnect` across 15 containers and flagged the `scheduler/tracing` alias. Its one bad call — an unverified claim that pywb 3.x exists — was caught by the main thread going to PyPI. R11's GitNexus analysis reported 390 affected files and 359 high risk; this run's blast radius came out at 149, and nothing in the 1.3 table traces to a file it failed to find |
| LLM-generated testing | **no** | the repository's own suites, except that neither was usable: Jest fails 3/3 on a React 19 `act` relocation, and the 33 pytest files remain uninstallable in the app image. Section 1.2 shows both runs shipped k30 and k31 for want of two of those files |
| Validation and repair feedback | **partly** | a long, genuinely effective build-and-run repair loop, but it terminated at `curl`. No separate validator thread, no browser, no confidence score, and no re-run of the user's declared checks under the rule the user stated. This is the component whose absence the 1.3 table measures |
| Orchestration, staged plan, human gates | **partly** | plan mode was entered once and a phased plan (Phases 0–5) written and approved — more structure than C01 or C02 had. But there were no per-stage gates, no scope-expansion limit, and no halt on a dirty tree. The run also delegated to six sub-agents of its own, so "no orchestrator" understates it: it built one |

Read against R11 on the identical task: the direct agent matched the pipeline on the hard, novel engineering — the four baseline repairs, the `UWSGI_MOUNT` double-mount, the CRLF sweep, removing `universal-webpack` outright, the pywb self-correction, preserving `k25` — and beat it on wall time and on the collection page. It lost, decisively, on verification. Every defect that survived this run is one that a browser or an existing test file would have surfaced in minutes, and the pipeline's validator is exactly the component that does that. C02 argued that the pipeline's value has to be shown on R11-shaped tasks rather than R10-shaped ones; this is that task, and the answer is that one of the pipeline's four components earns its place here and the other three do not visibly change the outcome.

## Stage outcomes

| Stage | Result |
| --- | --- |
| Intake | First tool call interrupted by the user; complied with *"only look at the files in this repo"* and worked in the home-directory clone for the rest of the session, never touching the designated workspace |
| Investigation | Two parallel `Explore` agents (frontend surface, backend start-up failures) plus 109 direct reads. Produced a correct diagnosis of all three declared baseline failures before any edit |
| Planning | Entered plan mode, wrote a phased plan (Phases 0–5) to `~/.claude/plans/proud-whistling-koala.md`, approved by the user via `ExitPlanMode`. The plan's stated "key finding" (a pywb 3.x restructure) was later disproved by the run itself and corrected |
| Research | Two `general-purpose` agents pulled live version data for ~40 backend and frontend packages, with explicit instructions not to rely on training knowledge. Four version decisions were changed as a result |
| Execution | Two forks did the router/`redux-connect` rewrite and the react-bootstrap migration; the main thread did the backend, the Dockerfiles, Compose, the webpack configs and the CRLF sweep. 140 edits, 23 writes |
| Self-validation | Build-and-run loop across all services with log inspection; `docker compose run --rm --no-deps frontend yarn install` used as the brief prescribed so the lockfile landed on the host; five pages probed with `curl` and grepped for DOM markers; both live-service checks run correctly; Jest run and its failure reported |
| Residual handling | Final report was explicit about what was not verified (Playwright flows, Jest, capture/replay, `PlayerApp`, the frozen third-party images) and about the redis/fakeredis conflict being accepted rather than solved. It did not report the three SSR-500 routes, the broken player build, or the dead bundle, none of which it had looked for |
| Commit | none. 150 changed paths on `main`, plus an untracked `CONVERSATION_LOG.md` left in the repository root |

## What was broken afterwards

1. **The client bundle throws on every page and React never hydrates.** `ReferenceError: process is not defined`. The whole application is server-rendered markup with no interactivity: no client-side routing, no Redux-driven forms, no Swagger UI. One `ProvidePlugin` line fixes it.
2. **The login form submits credentials as a URL query string.** A direct consequence of (1) plus a `<form>` with no `method`. Passwords land in browser history, `Referer` headers and nginx access logs.
3. **Three routes return HTTP 500 from the SSR server** — `/:user/_settings`, `/:user/:coll/manage`, `/:user/:coll/$new` — with `Element type is invalid: expected a string … but got: undefined`, i.e. a component that resolves to `undefined` after the migration. `/:coll/management` and the collection cover are unaffected, so this is three specific route components, not a blanket failure.
4. **Bookmark lists cannot be created** (500, `DataError` on `None`) and **uploaded WARCs are never indexed** (recording 0 bytes, replay 500). Both follow from redis-py 8.1.0 overriding pywb's `redis==2.10.6` pin; the second failure is inside pywb's own `redisindexer.py`.
5. **`npm run build-player` and `npm run build-desktop` both fail** — `react-router-config` removed from the manifest but still imported, and no Node-core fallbacks in `player.config.js` / `desktop.config.js`.
6. **The Jest suite fails 3/3** on `React.act is not a function`. The `--watch` flag was correctly fixed, so the suite at least runs in CI now; it just does not pass.
7. **The 33 developer test files are still unrunnable in the app image.** `setup.py` and CI were modernized; the Dockerfile was not.
8. **26 SVG files are CRLF in the working tree**, and the new `.gitattributes` marks `*.svg binary`, so git will never normalize them. The sweep that fixed 633 files skipped these, and the rule added to protect them now pins the corruption in place.
9. **Two floating image tags.** `boky/postfix:latest` and untagged `webrecorder/dat-share`, in a change whose brief was specifically about floating tags hiding age.
10. **Nothing is committed.** The entire upgrade exists as a dirty working tree on `main` in a clone the evaluation does not track, with `CONVERSATION_LOG.md` left untracked in the root.

## Run-specific recommendations

- **Add a hydration assertion to any SSR acceptance check.** The single check that separates this run from a passing one is three lines in a headless browser: load the page, wait, assert that a React root exists and that no `pageerror` fired. For SSR applications an HTTP status and a DOM-marker grep are not weak evidence, they are actively misleading, and the brief said so. This is the highest-value change available to either the pipeline or a direct agent.
- **Treat "webpack 4 → 5" as implying a Node-globals audit, not just a config port.** `path`, `stream` and `querystring` announced themselves as build errors and were fixed; `process` and `Buffer` never do, because they are globals rather than imports. R11 hit the `Buffer` half of the same trap. A standing checklist entry — grep the emitted bundle for `process.`/`Buffer.` and add `ProvidePlugin` if present — closes both.
- **When you override an upstream pin, audit the upstream package, not only your own code.** The `redis>=5.0` decision was made after grepping Conifer for `StrictRedis`; the break is in pywb. A pin that a dependency states explicitly is a claim about that dependency's own call sites, so the audit has to cover them.
- **Install the test tooling before deciding the tests are weak.** Six packages in the app image would have made `test_lists_anon_user.py` and `test_upload.py` runnable, and those two files test exactly the two data-layer regressions that both runs shipped. The brief called the suite "weaker than it looks", which is true of the frontend suite and not of the 33 pytest files.
- **Fix every webpack entry point, not the ones the smoke test uses.** `player.config.js` and `desktop.config.js` are standalone configs that silently missed the fallbacks. Either have them extend the base config or diff them against it at the end of a build-config migration.
- **Pin the replacement image.** `boky/postfix:latest` reintroduces the exact defect the brief opened with. R11 pinned `5.1.0`.
- **Exclude generated artefacts from a CRLF sweep explicitly, and re-run `file` afterwards.** The 26 SVGs were missed and then locked in by the `*.svg binary` rule. Converting first and writing `.gitattributes` second — with a verification pass between — avoids both halves.
- **Commit the work.** As with C01, C02 and R10: an upgrade that exists only as a dirty working tree cannot be diffed against a branch, reverted, or scored per-commit — and here it sits in a clone outside the evaluation's checkout, with 150 changed paths and no record of intent.
- **Launch the agent in the directory under test.** The same cwd/brief mismatch as C02, resolved here by a user interruption rather than by a refusal. It cost this run GitNexus and the harness instructions, and it is avoidable by starting the session in the target directory.

Evidence sources: the chat, the session and sub-agent logs listed above, and direct verification on 27 Sep 2026 against the running stack — `docker compose ps` and per-container restart counts; a 31-behaviour oracle equivalent to R11's, comprising a Python/urllib API script (admin CLI user creation, login, current user, collection create/list/get/delete, bookmark list, WARC upload from `webrecorder/test/warcs/test_3_15_upload.warc.gz` with index polling, logout, anonymous session, registration) and a Playwright script driving headless Chromium build 1234 with console and page-error capture over the five key pages, both key flows, UI login, and the five logged-in pages; `docker compose logs` for the `app`, `recorder` and `frontend` tracebacks; `docker compose exec` for installed package versions, `compileall`, the Jest run and the player build; `curl` for the OpenAPI spec, the SSR title and the route sweep; `redis-cli INFO server` and the Solr `config`/`cores` endpoints for the external-service checks; and `git diff`, `git status` and `git log` against `c406b480`. Test data created by the oracle was removed afterwards.
