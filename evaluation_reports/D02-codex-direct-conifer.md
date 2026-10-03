# Evaluation D2: `codex_refactored_chats/conifer.md` (Codex direct agent, Conifer full stack, 30 Sep – 2 Oct 2026)

Verdict: the best-preserved Conifer upgrade in the corpus after R11, and the first direct agent to pass the brief's own declared checks. The same full-stack modernization as [R11](R11-conifer.md) and [C03](C03-claude-code-conifer.md) was completed in `C:\Users\OEM\conifer` with 13 services up and zero restarts, a hydrating React 18 / webpack 5 client, every declared page clean in a real browser, both external-service checks passing, all four baseline defects repaired, and — unlike R11 — the anonymous-access check intact. Against a 31-behaviour oracle, **26 behaviours are preserved and 5 are lost**: BPR 0.84, MBR 0.16, EBER 0, NBR 0. Three of the five losses are the same two redis-py regressions that R11 and C03 both shipped (bookmark lists, WARC indexing); the other three are pages that throw a React hydration error (`/{user}`, `/{user}/{coll}/manage`) or return an SSR 500 (`/{user}/_settings`) when a logged-in user opens them.

C = 1, T (declared) = 1, T (independent) = 0, FBSR 1 declared / 0 independent.

This is **not** a `$upgrade` pipeline run. It is the Conifer brief given to a Codex direct agent (`gpt-5.6-sol`, medium effort, Codex CLI 0.159.2) with no orchestrator, no stage threads, no separate validator and no GitNexus (the tool mix is `exec` ×545 and `wait` ×10, nothing else). It belongs in the ablation section next to C03, not in the R1–R11 aggregates. Section 1.6 states what was absent.

| Item | Value |
| --- | --- |
| Chat | `codex_refactored_chats/conifer.md` (2,273 lines; the brief and the agent's command log appear twice in it, once per resumed turn) |
| Session log | `~/.codex/sessions/2026/09/30/rollout-2026-09-30T19-53-55-01a0f117-….jsonl`, one thread, 559 model requests, no sub-agents. An earlier attempt on the same brief, `rollout-2026-09-30T18-43-47-01a0f0d7-….jsonl`, ran 57 minutes, ended on the account usage limit and is not costed here (24.1 M tokens) |
| Target | `C:\Users\OEM\conifer` at base commit `c406b480`, the same clone and commit as C03, so the R11 / C03 comparison holds. The brief says to work in `C:\Users\OEM\conifer` this time, so the working-directory problem that hit C02, C03 and D01 did not occur |
| Validation commands from user | `docker compose build`; `docker compose up -d` for 12 services (mailserver omitted); readiness on `http://localhost:8089/`; key pages `/_login`, `/_register`, `/_faq`, `/docs/api`; flows "Sign Up client-side navigation" and "invalid login"; live Redis and Solr checks. The brief states that a 200 is not proof and that any `error` or `pageerror` console entry is a genuine failure |
| State evaluated | uncommitted working tree on `main` at `c406b480`: 123 paths with a content diff (+8,968 / −12,774, of which `yarn.lock` is most of the churn), 11 untracked paths (`.gitattributes`, `UPGRADE_REPORT.md`, `frontend/package-lock.json`, three new helpers, `frontend/validation/`, `frontend/webpack/standalone.config.js`, `shepherd/`, `search-driver/.dockerignore`, `webrecorder/pyproject.toml`), no deletions. `git status` lists 676 entries; the extra ~550 beyond the content diff look like line-ending or stat-only noise (inferred, not itemised). No commit |
| Pipeline verdict | not applicable |
| Human decisions | 1 substantive (the brief). The other four user turns are two `continue` messages and two automatic "server restarted, continue" recoveries. Three turns were interrupted and one ended on the usage limit |
| Verification date | 3 Oct 2026, against the stack as the session left it, then against a fresh build of the original `c406b480` for the reference |

## 1.1 Build effectiveness

| Metric | Value | Evidence |
| --- | --- | --- |
| C (build and boot) | **1** | all 13 Compose services running, restarts 0 (including `mailserver`, healthy, and `redis`, healthy). `python -m compileall /code/webrecorder` exits 0 |
| T (user's declared checks) | **1** | startup URL serves the SSR title `Conifer \| Homepage`; `/_login`, `/_register`, `/_faq`, `/docs/api` render and hydrate with no `pageerror` or `console.error`; Swagger UI shows 68 operations; Sign Up is a client-side transition (page marker survives, no reload); an invalid login stays on `/_login` with no credentials in the URL and shows a rejection; Redis 8.2.10 = `FROM redis:8.2.10-bookworm`; Solr core accepts `luceneMatchVersion` 8.5.1. The run's own `frontend/validation/playwright-smoke.spec.js` passes 3 of 3 |
| T (independent oracle) | **0** | 5 of 31 behaviours lost (section 1.3) |
| CSR / TSR / FBSR | 1.00 / 1.00 declared, 0.00 independent / 1 declared, 0 independent | N = 1 |
| Frontend Jest | **3/3 pass, but only under `NODE_ENV=test`** | `yarn test` and the brief's own `npx jest --ci --watchAll=false` fail to start in a fresh `frontend` container (`Must use import to load ES Module: /code/config/testSetup.js`) because the image sets a production `NODE_ENV` that disables the Babel test transform. With `-e NODE_ENV=test` all three RTL tests pass. The chat's "3/3 passed" is therefore correct but not reproducible with the command the user supplied |
| ESLint | 0 errors, 1,000 warnings | `yarn lint` under `NODE_ENV=test`; the cap of 1,000 suggests more are truncated |
| Developer pytest suite | **521 passed, 1 failed, 13 skipped** across 30 files | run per file with `env -i` as in R11. The one failure is `test_extract.py::test_stats`. Baseline (B00) was 318 passed, 196 failed, 13 skipped. The chat's closing sentence says the suite "is runnable but not green … a websocket test stalled"; the tree as left is green apart from that one test, and `test_ws.py` passes 8 of 8 in 19 s. The summary understates the work |
| Baseline defects repaired | 4 of 4 | (1) uWSGI commands no longer pass invalid positional ini arguments (`uwsgi --ini … --need-app`); (2) the start-before-Redis race that left the app serving pywb's fallback is closed with a Redis health check and `depends_on`; (3) `catatnight/postfix` → `boky/postfix:5.1.0`, `mailserver` back in the stack; (4) the Werkzeug / pywb deadlock is bridged by installing pywb 2.10.0 and bottle-cork 0.12.0 with `--no-deps` and pinning current versions of everything else. (4) is the genuine version conflict the brief asked about, correctly identified and honestly reported in `UPGRADE_REPORT.md`; it is also the cause of k30 and k31 below |
| Scope discipline | clean | no change under `data/`, `wr.env`, `node_modules/`, `proxy-certs/`, `migration_scripts/`, `static/bundle/`, `frontend/static/` or the `.bak` files. `solrconf/` untouched: Solr was pinned to **8.11.4** to match the repo's declared `luceneMatchVersion` 8.5.1, rather than editing the config to match Solr 10. `webrecorder/webrecorder/config/webarchives` (a submodule) shows modified content |
| CRLF | repaired | `.gitattributes` (`* text=auto eol=lf`, `*.sh eol=lf`) added, `core.autocrlf=false`; no shell script or Dockerfile remains CRLF in the working tree |

**Dependency coverage.** Every manifest was addressed.

- *Frontend.* Node 24.9.0; webpack 5.111; `sass` replaces `node-sass`; React 18.3.1; react-redux 9.3; react-router 5.3.4; Jest 30; ESLint 8.57; `@sentry/browser` 11 replaces raven; swagger-ui 5.33; enzyme → Testing Library; `redux-connect` replaced by a local `asyncConnect` helper; `hard-source-webpack-plugin`, `file-loader`, `url-loader` and `universal-webpack` removed; two of the three personal forks resolved to registry releases (`react-collapsible ^2.10.0`, `react-router-breadcrumbs-hoc ^4.1.0`).
- *Frontend judgement calls.* React stays on 18.3.1 and react-router on 5.3.4 rather than the newest majors. `UPGRADE_REPORT.md` justifies both (retained editor and helmet integrations; the route table's v4/v5 regex parameters, which v6+ removes). The brief said "latest stable" for the router but also warned about the regex syntax, so this is a defensible reading, not a miss.
- *`shepherd-client`.* It is still a GitHub fork, pinned to a commit tarball, and the report states that no registry release carries the dimensions behaviour. That is exactly "resolve or flag", and the flag is there; C03 did not do this.
- *Python.* `requirements.txt` has explicit pins for every previously bare name (`werkzeug==3.1.9`, `bleach`, `boto3`, `requests`, `itsdangerous`, `psutil`, `gevent-websocket`, `bottle==0.13.4`, `fakeredis==2.38.0`, `apispec==6.10.0`, `yt-dlp` for `youtube_dl`, `redis==8.1.0`); `six` is gone from the codebase; `pyproject.toml` added; test tooling added to the image.
- *search-driver.* Node 24.9.0, `puppeteer-core ^25.12.0`, `ioredis ^5.11.1`, `node-fetch ^3.3.2`.
- *Images and Compose.* `redis:8.2.10-bookworm`, `nginx:1.30.5-alpine3.24`, `solr:8.11.4`, `boky/postfix:5.1.0`, `coturn/coturn:4.18.0` (replacing the frozen `oldwebtoday/coturn`), `dat-share` and `behaviors` pinned by digest, a derived `conifer/shepherd:1.2.5-beta.1-docker4.4`. `version:` and all `container_name:` entries are removed from `docker-compose.yml` and `search-compose.yml`. The `webrecorder/Dockerfile` hardcoded `python3.5` VOLUME path is gone.
- *Residuals.* The backend base image is the beta tag `webrecorder/pywb:2.10.0b1` with the stable 2.10.0 wheel installed over it, which is documented. `browsertrix:0.2.0` is unchanged. The final message says the third-party images remain unverifiable, as the brief required.

## 1.2 Generated tests

The run produced three kinds of test artefact.

| Artefact | What it is |
| --- | --- |
| `frontend/validation/playwright-smoke.spec.js` (+ config) | 3 Playwright tests, 78 lines: home SSR + client-side Sign Up, four key pages with a console-clean assertion, invalid login. Passes 3 of 3 today in 10 s |
| `TempUserTimer/index.test.js` | the one existing enzyme test, rewritten with Testing Library; 3 tests, pass under `NODE_ENV=test` |
| Repair of the legacy `webrecorder/test` harness | 17 files, +134 / −103. `testutils.py` now forces `ANON_DISABLED=0` and the other test defaults instead of letting `wr.env` leak in (the failure mode flagged in R11), shims fakeredis 2's removed `DATABASES` registry and the external `mock` package. 34 assertions were removed and 31 added |

Evaluated against the 31-behaviour oracle as ground truth (a lost behaviour is a positive, y = 1; the new tests "predict" a violation when they fail):

| Suite | TP | TN | FP | FN | Accuracy | Precision | Recall | F1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Generated Playwright smoke spec, all 31 behaviours | 0 | 26 | 0 | 5 | **0.84** | undefined | **0.00** | **0.00** |
| Same, restricted to the 7 behaviours it covers (k2–k5, k7–k9) | 0 | 7 | 0 | 0 | 1.00 | undefined | undefined | undefined |
| Repaired pytest suite, as left | 0 | 26 | 0 | 5 | **0.84** | undefined | **0.00** | **0.00** |

Reading these honestly: both suites are silent on all five defects. The smoke spec simply does not visit the logged-in pages, so its recall is untestable rather than low. The pytest result is the more serious one. `test_lists_anon_user.py` (43 tests) and `test_upload.py` (37 tests) both pass, yet creating a bookmark list and indexing an uploaded WARC are both broken on the live stack. The cause is that the in-process WebTest/fakeredis harness tolerates `None` arguments and the old `zadd(key, score, member)` signature, which real redis-py 8 and pywb's `redisindexer.py` do not. A green legacy suite therefore cannot be used as an external oracle for this upgrade, and `Python suite 521/522` should not be read as TSR evidence.

Two smaller observations on the assertion edits. Most of the 34 removals adapt to data that drifts on the live internet (Internet Archive vs Archive-It sources, `wbinfo.timestamp = "19961226` → `"1996`, the IANA reserved-domains page wording) and are reasonable. One is a behaviour change worth a second look: an `assert res.json == {'error': 'no_such_user'}` became `{'success': True}`.

## 1.3 Behaviour preservation

The 31-behaviour reference set is the one used for R11 and C03. R11's oracle script was not preserved, so it was rebuilt a second time, committed this time as `oracles/conifer-oracle.mjs`, and **validated against the reference before use**: run against a fresh build of the original `c406b480` (with the four-fix baseline override), it scores **31 of 31**. Full-text search is excluded on both versions (`SEARCH_AUTO` unset). Raw results are in `oracles/conifer-oracle-baseline-c406b480.json` and `oracles/conifer-oracle-codex-d02.json`.

| Behaviour | Original | This run | Status |
| --- | --- | --- | --- |
| k1 core services running | 7/7, 0 restarts | 7/7, 13 containers, 0 restarts | preserved |
| k2 `/` SSR title, clean console, hydrates | pass | pass | preserved |
| k3 `/_login` form | pass | pass | preserved |
| k4 `/_register` form | pass | pass | preserved |
| k5 `/_faq` | pass | pass | preserved |
| k6 `/_policies` | pass | pass | preserved |
| k7 `/docs/api` Swagger UI renders | 68 operations | 68 operations | preserved |
| k8 Sign Up client-side navigation | pass | pass, no reload | preserved |
| k9 invalid login shows rejection | pass | pass, no credentials in URL | preserved |
| k10 OpenAPI `/api/v1.json` | 52 paths, 14 tags, 3.0.0 | 52 paths, 14 tags, 3.0.0 | preserved |
| k11 admin CLI creates a user | pass | pass | preserved |
| k12 API login | 200 | 200 | preserved |
| k13 current-user endpoint | pass | pass | preserved |
| k14 create collection | 200 | 200 | preserved |
| k15 list collections | pass | pass | preserved |
| k16 get collection | pass | pass | preserved |
| k17 user page lists the collection, clean console | pass | **renders, but 6× React error #418 and #423 (hydration mismatch)** | **missing** |
| k18 collection page renders | pass | pass | preserved |
| k19 collection management page | pass | **renders, but React error #418** | **missing** |
| k20 new-capture page | pass | pass | preserved |
| k21 user settings page | pass | **HTTP 500, `Element type is invalid … got: object`** | **missing** |
| k22 delete collection | pass | pass | preserved |
| k23 logout | pass | pass | preserved |
| k24 valid login through the UI lands on the user page | pass | pass | preserved |
| k25 anonymous session refused collection creation | 403 | **403** | preserved |
| k26 anonymous session lists its collections | 200 | 200 | preserved |
| k27 registration API | 200 | 200 | preserved |
| k28 Redis running version matches the Dockerfile pin | 3.2.4 = 3.2.4 | 8.2.10 = `redis:8.2.10-bookworm` | preserved |
| k29 Solr `conifer` core at the repo's `luceneMatchVersion` | Solr 10.0.0, Lucene 8.5.1 | Solr 8.11.4, Lucene 8.5.1 | preserved |
| k30 create a bookmark list | 200 | **500, `DataError: Invalid input of type: 'NoneType'`** | **missing** |
| k31 uploaded WARC is indexed | recording 1,823 bytes | **recording 0 bytes** | **missing** |

Observed 31, preserved 26: **BPR 0.84, MBR 0.16, EBER 0.** New behaviours: none that were not requested (the mailserver starting and `npm test` running non-interactively are requested fixes), so **NBR = 0**.

**The five losses are four distinct causes.**

- **k30 and k31 are the redis-py regressions again.** `create_bookmark_list` passes an absent `before_id` to `zscore`, which redis-py 2 encoded as the string `"None"` and redis-py 8 rejects; the recorder log shows `pywb/recorder/redisindexer.py: self.redis.zadd(z_key, 0, cdx)` raising `ZADD requires at least one element/score pair`. This is the **third run in a row** to ship both (R11, C03, D02). Here it was a deliberate, documented choice: `UPGRADE_REPORT.md` says "the old redis client cannot satisfy current fakeredis; the current client breaks this repository's old `hmset`/`zadd` calls. The image therefore installs pywb without its obsolete dependency metadata, pins current redis/fakeredis, and ports the repository calls". The repository's own calls were ported; pywb's, and the `None` argument to `zscore`, were not, and the harness that would have caught them was repaired to tolerate them.
- **k17 and k19 are one defect.** The pages server-render, the client hydrates, and React falls back to client rendering with a minified #418 text-mismatch error, then #423. The original is clean on the same pages. It is not a timezone artefact: the same errors appear with the browser timezone forced to UTC. It only occurs for a logged-in session (the login redirect itself is clean), so the likely cause is SSR rendering the logged-in user page from different data than the client holds; the root cause was not pinned down. Under the brief's own rule ("any `pageerror` is a genuine failure") these count; on content alone both pages render.
- **k21** is an SSR component that resolves to an object rather than a component, the same family as C03's three SSR 500s, but here confined to the settings route. `/manage` and `/$new` render.

If the console-clean clause is dropped, k17 and k19 pass and BPR is 28/31 = 0.90.

Comparison on the same oracle:

| | Original | R11 (pipeline) | C03 (Claude Code) | **D02 (Codex direct)** |
| --- | --- | --- | --- | --- |
| Preserved / 31 | 31 | 27 | 15 | **26** |
| BPR | 1.00 | 0.87 | 0.48 | **0.84** |
| Client hydrates | yes | yes | no (`process` undefined) | **yes** |
| k25 anonymous access check | 403 | **200 (removed)** | 403 | **403** |
| k18 collection page | pass | 504 | pass | **pass** |
| k30 / k31 redis-py | pass | broken | broken | **broken** |
| Declared checks (T) | n/a | pass | fail | **pass** |

Not observed directly, as before: live capture through a remote browser, full-text search, e-mail delivery, and the `search-compose.yml` multi-node SolrCloud topology.

## 1.4 Cost and efficiency

All figures are from the single Codex rollout log. Headline token figures use the log's cumulative `token_count` counter, as D1 did; the per-request `token_usage_record` entries sum 1.2% higher (see the note below).

| | Value |
| --- | --- |
| Input tokens | 76,600,075 (uncached 1,754,763 + cache read 74,845,312) |
| Output tokens | 126,384 (reasoning 34,114) |
| **Total tokens** | **76,726,459** (1,881,147 excluding cached input) |
| Cache hit rate | 97.7% |
| Model requests | 559 |
| Tool calls | 555 (`exec` 545, `wait` 10) |
| Notional cost | **US$49.99** (US$8.77 uncached input + US$37.42 cache read + US$3.79 output) |
| Context compactions | 3 |

Turn times (Codex records no separate API-time figure; `duration_ms` is wall-clock for the turn, covering model and tool time):

| Turn | Start (UTC) | Duration | End |
| --- | --- | --- | --- |
| 1 | 30 Sep 06:55 | 44 m 09 s | interrupted |
| 2 | 1 Oct 08:19 | ≈ 6 m 38 s | interrupted (from timestamps) |
| 3 | 1 Oct 08:26 | 84 m 39 s | **usage limit reached** |
| 4 | 2 Oct 04:40 | ≈ 1 m 15 s | interrupted (from timestamps) |
| 5 | 2 Oct 04:41 | 60 m 36 s | completed |
| **Active total** | | **≈ 197 min (3 h 17 m)** | |

Elapsed time from first to last record is 46 h 46 m, almost all of it the usage-limit lockout between turns 3 and 5. Turn 5 is the only completed turn, and is what the final answer comes from.

Notes:

- The per-request records sum to 77,519,177 input (cached 75,752,576), 136,836 output, **77,656,013** total, i.e. US$50.82. The 929,554-token gap to the cumulative counter is real usage the counter does not include (most likely the interrupted turns' last requests and compaction calls). Either figure is fine for comparison; the cumulative one is used so the line stays consistent with D1 and with the figure Codex itself displays.
- Pricing follows the corpus convention (US$5/M uncached input, US$0.50/M cached, US$30/M output) but the model is `gpt-5.6-sol`, so the figures are notional twice over, as in D1.
- Token counts across the Codex and Claude Code families are not commensurable; compare uncached input, output, cost or wall time.
- N = 1, so mean and median coincide.
- An earlier attempt on the same brief (`18-43-47`, 57 min, 24.1 M tokens, about US$17 at the same rates) hit the usage limit and was superseded; it is not included above.

Same task, three ways:

| | R11 (pipeline, GPT-5.5) | C03 (Claude Code, Sonnet 5) | **D02 (Codex direct, gpt-5.6-sol)** |
| --- | --- | --- | --- |
| Threads | 8 | 7 | **1** |
| Active / wall time | 784 min incl. ~3 h lockout | 332 min | **197 min active** (46.8 h elapsed incl. lockout) |
| Tokens | 65,005,806 | 257,369,228 (not comparable) | **76,726,459** |
| Uncached input + output | n/a | 2,255,820 | **1,881,147** |
| Notional cost | US$52.71 | US$62.28 | **US$49.99** |
| Substantive user turns | 3 + 2 gates | 3 | **1** |
| Services up | 12 (+ mailserver) | 13 | **13** |
| BPR | 0.87 | 0.48 | **0.84** |
| Declared checks | pass | fail | **pass** |
| Browser verification | validator, Playwright | none | **own Playwright spec** |
| Committed | `40be3587` | no | **no** |

## 1.5 LLM configuration

| Configuration | Reported value |
| --- | --- |
| Model | `gpt-5.6-sol` (all turns) |
| Harness | Codex CLI 0.159.2, `codex-tui`, collaboration mode `default`, source `vscode` |
| Reasoning effort | **medium** |
| Temperature / max output tokens | not configurable in this harness; not recorded |
| Context window | 258,400 tokens, 3 compactions |
| Approval and sandbox | `approval_policy: on-request`, `sandbox_policy: workspace-write`, `network_access: false`, workspace root `C:\Users\OEM\conifer` |
| Input tokens | 1,754,763 uncached + 74,845,312 cache read |
| Output tokens | 126,384, of which 34,114 reasoning |
| Total tokens | 76,726,459 |
| Monetary cost | US$49.99, notional |
| Execution time | ≈ 197 min active; 46 h 46 m elapsed |
| Environment | Windows 11, Node 24.9.0 in the images. Resolved in the app image: pywb 2.10.0, redis-py 8.1.0, fakeredis 2.38.0, Werkzeug 3.1.9, Bottle 0.13.4, Jinja2 3.1.6; Redis 8.2.10, Solr 8.11.4 |

## 1.6 Position in the ablation

| Component | Present? | What stood in for it |
| --- | --- | --- |
| GitNexus graph retrieval | **no** | no MCP tools were called (the tool log is `exec` and `wait` only). Replaced by `rg`, `Get-Content` and package-registry queries (`npm view`, PyPI) |
| LLM-generated testing | **yes, self-initiated** | a 3-test Playwright smoke spec, a rewritten RTL unit test, and a repair of the legacy pytest harness that took the suite from 318 passing / 196 failing to 521 / 1. Section 1.2 measures its detection power against the five real defects at zero |
| Validation and repair feedback | **substantial, but not independent** | no validator thread and no confidence score, but a long build-run-inspect loop that ended in real-browser checks of every page the brief named and both external-service probes. It is the reason this run hydrates and C03 does not. It did not drive the logged-in pages, which is where the residual defects sit |
| Orchestration, staged plan, human gates | **no** | one agent, one thread, no plan stage, no gates. The only human input was `continue` |

Read against C03 on the identical task and base commit, the main difference in outcome is one capability: this run drove a real browser through the declared pages and kept going until they were clean, and C03 stopped at `curl`. Read against R11, the pipeline's validator drove a real browser too, but the pipeline's repair loop removed an access check (k25) to satisfy a stale test; this run never weakened a security check, cost slightly less, and used one thread instead of eight. R11 still scores slightly higher on the independent oracle (0.87 vs 0.84) and committed its work. A fair reading is that browser-driven validation with repair feedback, not orchestration or graph retrieval, is what separates these outcomes, which agrees with C03's conclusion.

## Stage outcomes

| Stage | Result |
| --- | --- |
| Intake | Read the brief, audited the five manifests and Compose files, found the three declared baseline failures plus the Redis start-up race |
| Research | Queried the npm and PyPI registries for current versions; recorded deliberate holds (React 18, router 5, Solr 8.11, Bootstrap 4) with reasons |
| Execution | 545 shell commands over 5 turns; repeated `docker compose build` and `up` cycles; three context compactions |
| Self-validation | Compose build and start, per-page Playwright checks, a persisted smoke spec, Jest, ESLint, `git diff --check`, live Redis and Solr probes. The legacy pytest suite was run, harness issues were diagnosed (the `wr.env` `ANON_DISABLED` leak) and fixed, and the result was then under-reported in the summary |
| Residual handling | Final message names the unverifiable third-party images, the untested SolrCloud topology, and the capture/replay gap. It does not mention k17, k19, k21, k30 or k31, none of which it looked for |
| Commit | none. Work left as a dirty tree on `main` |

## What was broken afterwards

1. **Bookmark lists cannot be created** (500, `DataError` on `None`). Same line as R11 and C03.
2. **Uploaded WARCs are never indexed** (recording 0 bytes). The failing call is `zadd` in pywb 2.10.0's own `redisindexer.py`, which depends on the redis-py 2 signature that the `--no-deps` install and `redis==8.1.0` pin removed.
3. **`/{user}/_settings` returns an SSR 500** (`Element type is invalid … got: object`).
4. **`/{user}` and `/{user}/{coll}/manage` throw React hydration errors** (#418, #423) for a logged-in session; the original is clean.
5. **`yarn test` and the brief's `npx jest` fail to start in a stock container**; they need `NODE_ENV=test`.
6. **The legacy pytest suite is green while two real regressions exist**, because the fakeredis harness it was repaired to run on tolerates them. `test_extract.py::test_stats` still fails.
7. **The final summary understates the test result** ("not green") when the tree as left passes 521 of 522.
8. **Nothing is committed**, so the 123-file change set cannot be diffed against a branch or reverted by commit.
9. **The base image is a beta tag** (`webrecorder/pywb:2.10.0b1`) with the stable wheel installed over it.
10. **The submodule `webrecorder/webrecorder/config/webarchives` shows modified content** (`test/test_format.py`).
11. **Evaluation users remain in the live Redis data.** Running the oracle created `ev…`, `r…` and `tzuser1` accounts in the stack's `data/` directory. They are harmless but should be removed before the stack is reused as a demo.

## Run-specific recommendations

- **Audit the dependency you bypass.** The `--no-deps` install of pywb is a claim that nothing in pywb needs the redis-py 2 API, and the recorder log shows otherwise. Grepping the application's own calls (done) is half the audit; the other half is the package whose pin was overridden.
- **Do not repair the test harness to accept what production rejects.** Replace `fakeredis` with a real Redis container for at least `test_lists_anon_user.py` and `test_upload.py`. That one change turns two currently-green suites into detectors for k30 and k31.
- **Extend the browser check to logged-in pages.** Every declared page was clean; every residual UI defect is behind a login. A loop of "log in, visit each route in `frontend/src/routes.js`, assert no `pageerror`" is the generalisation of the run's own spec and would catch k17, k19 and k21.
- **Fix `NODE_ENV` for the test run.** Set it in the `frontend` service's test command (or in the Babel config) so `yarn test` works in the stock container, and update the validation block accordingly.
- **Report the suite state as measured.** The closing message should say "521 of 522 pass; `test_extract.py::test_stats` fails" rather than "not green".
- **Commit the work.** As with C01–C03 and R10, an upgrade that exists only as a dirty tree cannot be scored per commit.
- **Reuse `oracles/conifer-oracle.mjs`.** It is parameterised by `ORACLE_CWD` and `ORACLE_COMPOSE`, runs in about four minutes, and scores 31/31 on the original.

Evidence sources: the chat; the rollout log above (token and turn accounting, model and effort, tool mix); a fresh 31-behaviour oracle run against the stack as left (`oracles/conifer-oracle-codex-d02.json`) and against a clean build of `c406b480` (`oracles/conifer-oracle-baseline-c406b480.json`); a per-file `env -i` pytest sweep of the 30 `test_*.py` files (`oracles/conifer-pytest-codex-d02.txt`); the run's own Playwright spec; Jest and ESLint in a fresh `frontend` container; recorder, app and frontend container logs; `git diff`, `git status`, `git ls-files --eol`; and `UPGRADE_REPORT.md` in the target repo.
