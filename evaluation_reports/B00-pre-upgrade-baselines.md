# Pre-upgrade baselines: the original code of each project, scored on the same metrics

As of 24 Sep 2026. The run reports (R1 to R11) score what each `$upgrade` run produced. This report scores the starting point: the original, pre-upgrade commit of each project, measured with the same oracles and today's environment. It answers two questions the run reports cannot: how much of the reference behaviour the original actually exhibits today, and which run failures were already present before any upgrade.

## Summary

None of the three originals meets its own run's acceptance checks as shipped. tv-radio's frontend cannot be installed or started, CodeMirror's `npm test` already fails, and Conifer does not start without four environment fixes. With those fixes Conifer passes everything; the other two still fail.

| Project | Original commit | C as shipped | C with minimal environment fixes | T (the checks the runs used) | Reference behaviours exhibited today |
| --- | --- | --- | --- | --- | --- |
| tv-radio | `c094824` | 0: frontend install fails (private `memcached` git URL); frontend exits on load (native `gc-stats` has no Node 24 build; under Node 10, `sharp` 0.14.1's libvips download is gone). Admin API and CLI load. | 0: still no frontend | 0: every run's declared checks start the frontend | 7 of 9 observed (13 defined) |
| codemirror5 | `6e708583` | 1: `npm install` and `npm run build` succeed | 1 | 0: `npm test` fails 2 tests under the Chromium bundled with its own Puppeteer 1.20; 6 in a current Chromium | 3 of 4 |
| Conifer | `c406b480` | 0: `app` fails to load its WSGI app, two uWSGI commands exit 127, `docker compose up` aborts on an unpullable image | 1 with the 21 Sep override | 1 on the run's declared checks; developer suite 318 passed, 196 failed | 31 of 31 observed (by definition: this is the reference) |

Framework metrics over the three originals:

| Metric | Value | Basis |
| --- | --- | --- |
| CSR as shipped | 0.33 | only codemirror5 installs and builds from its repo alone |
| CSR with minimal environment fixes | 0.67 | Conifer with the override; tv-radio's frontend still cannot be built |
| TSR (against each run's declared checks) | 0.50 | Conifer passes; codemirror5 fails `npm test` |
| FBSR as shipped / with fixes | 0 / 0.33 | Conifer only, and only with the override |
| Generated-test quality, NBR, tokens, cost, time | not applicable | no pipeline ran; BPR is 1 by definition for the reference itself, so the meaningful measure here is which defined reference behaviours the original actually exhibits |

## tv-radio (`c094824`)

Method: fresh `npm install` of each of the 8 packages in a separate worktree on Node 24.15.0, `node --check` on every first-party `.js` file, bounded boot of the Admin API and frontend with the gitignored `config.js` and `shared-config.js` copied from the local checkout, probes of `/`, `/search/`, `/libs/client.js`, and execution of the two library behaviours that decide b6 and b10. MongoDB, Solr, Memcached and Logstash were not available, as on 18 Sep.

| Check | Result |
| --- | --- |
| Install | 7 of 8 packages install. The frontend fails: `memcached` is pinned to `git+ssh://git@stash.auckland.ac.nz/ltvr/memcached.git#redundancy-fix`, unreachable. With it replaced by the public `memcached@2.2.0` (the version the Admin API uses), install then fails compiling `gc-stats` under Node 24. |
| Frontend start, Node 24 (scripts skipped) | exits on load: `No native build was found for ... gc-stats` (required by `metrics.js`) |
| Frontend start, Node 10 in Docker with MongoDB 3.6 | exits on load: `Cannot find module './build/Release/sharp'`; `sharp` 0.14.1 downloads libvips from a host that no longer serves it, and three media modules require it at startup |
| Admin API start | boots on Node 24, logs "Chapman Admin API successfully started", listens; `/` returns 404 in API-only mode (the root response R4 and R6 added is therefore a new behaviour, as the run reports counted it); MongoDB unreachable |
| CLI | `chapman.js` loads all modules and prints its operation list |
| Syntax | 119 first-party files, 0 `node --check` failures |
| Lockfiles | none. Every range floats: `async ">= 0.2.9"` resolves to 3.2.6 in all seven admin packages and the frontend today |

Reference behaviours (the 13 used in the overview), original as it installs today:

| Behaviour | Original today | Evidence |
| --- | --- | --- |
| b1 Frontend loads all modules | **missing** | install fails; with substitutions, exits on `gc-stats` (Node 24) or `sharp` (Node 10) |
| b2 Frontend serves `/` | not observable | frontend cannot start |
| b3 Content modules resolve their dependencies | exhibited | `uuid@2.0.1` in the manifest and resolved; required by 3 content modules |
| b4 Bare `/search/` route matches | exhibited | Express 4.9.5 resolved; bare-wildcard routing is Express 4 behaviour |
| b5 Search page renders | not observable | |
| b6 Client bundle is valid JavaScript | exhibited | executed: `uglify.minify()` on the 12 source files with the resolved uglify-js 2.8.29 produced 72,463 bytes that parse |
| b7 Admin title search handles query options | exhibited | Express 4 query objects inherit `Object.prototype`, so `query.hasOwnProperty()` works |
| b8 Admin API boots | exhibited | booted today |
| b9 `chapman.js index` completes | not observable | CLI loads; needs MongoDB and Solr |
| b10 `chapman.js geodata` ingest completes | **missing** | executed: with the resolved async 3.2.6, `q.drain = function` never fires; the pattern occurs at 10 call sites including `Ingest/city-country-dataset.js` (geodata) and `Admin/API/admin-streaming-result-set.js` |
| b11 Frontend survives logging an error | exhibited (static) | winston 1.1.2 with winston-logstash 0.3.0, the pair the logger was written for; not exercised because the frontend cannot start |
| b12 Admin UI reaches its API without `/api//` | not observable | |
| b13 Socket.IO client authorises | exhibited (static) | socket.io and socket.io-client both 1.1.0 |

Observed 9, exhibited 7. The two missing behaviours are environmental decay rather than defects in the code as written: b1 is the private dependency plus native modules with no build for any Node that can still install them, and b10 is the unpinned `async` range drifting to a major the code predates.

## codemirror5 (`6e708583`)

Method: separate worktree, `npm install`, `npm run build`, `npm test` three times; the five pages from R10's intake served statically and loaded in headless Chromium (Playwright's headless shell, build 1234) with console capture; the in-browser test page run to completion in that same browser for both the original and R10's working tree in `projects/codemirror5`.

| Check | Result |
| --- | --- |
| Install | succeeds in 1 minute (rollup 1.32, puppeteer 1.20.0 with Chromium r686378) |
| Build | `npm run build` produces `lib/codemirror.js`, both runmode bundles and `keymap/vim.js` |
| `npm test` (Puppeteer 1.20, Chromium r686378) | **2 failures, identical on three runs**: `core_move_bidi` for two seeded strings ("cursor didn't move right") |
| In-browser test page, current Chromium | 6 failures: the same 2 `core_move_bidi` cases, `core_rtl_wrapped_selection`, `core_bidi_wrapped_selection`, `scroll_movedown_resize`, `scroll_movedown_hscroll_resize` |
| Same page, R10's upgraded working tree, same browser | **the identical 6 failures** |
| Declared pages `/`, `/test/index.html`, `/demo/vim.html`, `/demo/search.html`, `/demo/theme.html` | all load with no console errors; the Vim demo accepts `ihello<Esc>` |

| Behaviour (R10's set) | Original today |
| --- | --- |
| c1 `npm run build` produces the four outputs | exhibited |
| c2 `npm test` passes | **missing**: 2 failures under its own Chromium |
| c3 Vim demo initialises and accepts input | exhibited |
| c4 Demo and test pages load in a browser | exhibited |

The failing tests are layout and bidirectional-text assertions whose outcome depends on the browser build, and the set grows with newer Chromium. R10's five `npm test` failures under Puppeteer 25's Chromium are all in the original's six-failure set for a current browser.

## Conifer (`c406b480`)

Measured during the R11 evaluation (details in [R11](R11-conifer.md)); summarised here for completeness.

| Check | Result |
| --- | --- |
| As committed | does not start: Werkzeug is unpinned and the base image's 1.0.1 satisfies it, but the code needs 2.0 (`werkzeug.user_agent`) while pywb 2.5.0 needs below 2.1 (`werkzeug.useragents`), and Jinja2 3.1 removed `contextfunction`; `ulimit` in three Compose `command:` entries exits 127 without a shell; pywb's entrypoint word-splits `exec $@`; `catatnight/postfix` is a schema-v1 image that current Docker cannot pull |
| With the 21 Sep override | 12 services up; SSR homepage served; the run's declared pages, flows and Redis/Solr checks all pass |
| Independent oracle (31 behaviours) | all 31 exhibited, except full-text search, which is disabled in this configuration (`SEARCH_AUTO` unset) and excluded |
| Developer suite (33 pytest files, clean environment) | 318 passed, 196 failed, 13 skipped; `test_ws.py` times out and `test_player_proxy.py` errors. `test_colls_api.py` fails 11 of 13 with 403 on anonymous collection creation, which is the intended access rule since commit `955948b0`: the test was already stale |
| Live services | Redis 3.2.4 matches its pin; the untagged `solr` image resolves to Solr 10.0.0 and accepts the repo's Lucene 8.5.1 config |

## What this changes in the run reports

These corrections follow from the baselines. They have not been applied to R1 to R11 or the overview, so that numbers already quoted elsewhere stay traceable; apply them if the evaluation should use observed rather than assumed baselines.

1. **R10 (codemirror5): the test failures are not regressions.** `npm test` already fails on the original, and in the same browser the original and R10's working tree fail the identical six tests. Behaviour c2 is not a reference behaviour, so R10's BPR becomes 1 of 1 = 1.00 (was 0.50), its T = 0 is inherited rather than caused, and its FBSR stays 0 only because the user's oracle requires a suite that never passed. The pooled BPR changes from 74 / 128 to 74 / 127 (0.58 either way).
2. **tv-radio b10 (geodata ingest) and b1 (frontend loads) are missing in the original today.** The run reports took all 13 behaviours as working in the original because it could not be booted. Measured today, the original shares b10's failure with R3 to R8 (unpinned `async` resolves to 3.x) and cannot load its frontend at all. Runs that fixed the `drain` pattern (R9) or loaded the frontend (every run except R1 and R6) did better than the original on those behaviours; this is an improvement, not preservation, and the framework's BPR does not credit it.
3. **The runs' CSR of 0.82 is higher than the originals' 0.33.** Every tv-radio run except R1 and R6 produced a frontend that installs and loads on Node 24, which the original cannot. Upgrades repair environmental decay even while they break behaviour, and a baseline row makes that visible.
4. **Conifer's developer suite is not a clean oracle.** 196 of its tests fail on the original, and 56 more pass on the upgrade only because R11 removed an access check. Only the 122 pass-to-fail flips are attributable to the upgrade.

## Method and environment

Windows 11, Node v24.15.0, npm, Docker Engine 29; Node 10 and MongoDB 3.6 official images for the tv-radio era check; Playwright headless shell build 1234 for browser checks. Each original was checked out into a separate git worktree under the session scratch directory and built there, so the project checkouts (with their upgrade branches and R10's uncommitted edits) were not modified; the worktrees and containers were removed afterwards. tv-radio's gitignored `config.js` and `shared-config.js` were copied from the local checkout, which may carry settings added for the upgraded code; the Admin API accepted them unchanged. Static judgements (b3, b4, b7, b11, b13) rest on the resolved library versions and the documented behaviour of those versions.
