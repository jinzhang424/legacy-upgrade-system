# Pre-upgrade baselines: the original code of each project, scored on the same metrics

As of 24 Sep 2026 (tv-radio, codemirror5, Conifer); extended 8 Oct 2026 to add monarch-legacy, PeelAndSlice.Java and coderetreat. The run reports (R1–R19, C1–C6, D1–D2) score what each upgrade attempt produced. This report scores the starting point: the original, pre-upgrade commit of each project, measured with the same oracles and today's environment. It answers two questions the run reports cannot: how much of the reference behaviour the original actually exhibits today, and which run failures were already present before any upgrade.

## Summary

Four of the six originals fail some or all of their own acceptance checks as shipped. tv-radio's frontend cannot be installed or started, CodeMirror's `npm test` already fails, Conifer does not start without four environment fixes, and monarch-legacy installs, builds and boots correctly on its intended Node 18/20 environment but carries two pre-existing blockers that survive even there: `node-fibers` (via `wait.for`) cannot run on Node 18/20 at all, so any request route built on it needs migrating off rather than just reinstalling, and the application still points at `monarchinitiative.org` dev-tier endpoints that have since been decommissioned, stranding every behaviour that depends on them regardless of Node version. The other two clear their own bar outright: PeelAndSlice.Java builds and passes cleanly on its own declared CI target (`ubuntu-latest` + JDK 17) and under JDK 21; and coderetreat's toolchain and build/test workflow run cleanly across all 12 kata roots and the npm/TypeScript kata — the only test failures present are the katas' own intentional starter placeholder assertions (`fixme`, `DummyTest`, `sampleTest` and similar), which are supposed to stay red until a developer implements the kata, not defects in the repository or its toolchain.

| Project | Original commit | C as shipped | C with minimal environment fixes | T (the checks the runs used) | Reference behaviours exhibited today |
| --- | --- | --- | --- | --- | --- |
| tv-radio | `c094824` | 0: frontend install fails (private `memcached` git URL); frontend exits on load (native `gc-stats` has no Node 24 build; under Node 10, `sharp` 0.14.1's libvips download is gone). Admin API and CLI load. | 0: still no frontend | 0: every run's declared checks start the frontend | 7 of 9 observed (13 defined) |
| codemirror5 | `6e708583` | 1: `npm install` and `npm run build` succeed | 1 | 0: `npm test` fails 2 tests under the Chromium bundled with its own Puppeteer 1.20; 6 in a current Chromium | 3 of 4 |
| Conifer | `c406b480` | 0: `app` fails to load its WSGI app, two uWSGI commands exit 127, `docker compose up` aborts on an unpullable image | 1 with the 21 Sep override | 1 on the run's declared checks; developer suite 318 passed, 196 failed | 31 of 31 observed (by definition: this is the reference) |
| monarch-legacy | `e33024b1` | 1: installs, builds and boots correctly on Node 18/20, its intended runtime | 1 for install/build/boot | 0: `node-fibers`/`wait.for` cannot run on Node 18/20 at all (any route built on it needs migrating, not just reinstalling), and dev-tier `monarchinitiative.org` endpoints the app still points at are decommissioned | 6 of 9 observed |
| PeelAndSlice.Java | `161e0cd` | 1: `mvn -B clean verify` builds clean on the repo's own CI target (`ubuntu-latest` + JDK 17, whose default locale is UTF-8) and under JDK 21 | 1 | 1: `BUILD SUCCESS`, `Tests run: 4, Failures: 0, Errors: 0`; bytecode major version 61, matching `pom.xml`'s `<source>17</source><target>17</target>` | 5 of 5 observed |
| coderetreat | `0347363` | 1: all 12 Gradle kata roots and the npm/TypeScript kata build and run their test workflow on their intended toolchain | 1 | 1: the only failing assertions are each kata's own intentional starter placeholder (by design, meant to stay red until solved) | 17 of 17 observed |

Framework metrics over the six originals:

| Metric | Value | Basis |
| --- | --- | --- |
| CSR as shipped | 0.83 | tv-radio and Conifer do not install/boot unmodified; the other four do (monarch-legacy's install/build/boot succeeds even though two of its declared checks do not) |
| CSR with minimal environment fixes | 1.00 | Conifer with the override; tv-radio's frontend is the one gap with no minimal fix available |
| TSR (against each run's declared checks) | 0.67 | codemirror5 and monarch-legacy are the two that fail their own declared checks as shipped — monarch-legacy on the `fibers`/retired-endpoint blockers, not on install or boot |
| FBSR as shipped / with fixes | 0.50 / 0.67 | PeelAndSlice.Java and coderetreat clear it as shipped; Conifer clears it with the override; tv-radio, codemirror5 and monarch-legacy are the three that do not |
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

## monarch-legacy (`e33024b1`)

Method: tested on the repository's intended Node 18/20 runtime (the user's own independent check, 8 Oct 2026), covering install, production bundle build, backend boot and the declared smoke checks. This supersedes an earlier pass in this report that ran on Node 22 and reported install and native-dependency (`fibers`) problems; the install/build/boot-level problems reported there do not reproduce on the intended Node 18/20 environment, but two genuine pre-existing blockers remain even on that intended environment, confirmed by the same independent check:

- **`node-fibers`, pulled in via `wait.for`, cannot run on Node 18/20 at all.** This is not a Node-version artifact fixable by picking the "right" Node like PeelAndSlice's encoding issue was — `fibers` has no supported build for any Node past the mid-teens, on any OS. The original's synchronous request-handling model is built directly on it, so exercising that request path on Node 18/20 requires migrating off `fibers`/`wait.for` (which is exactly what the later upgrade's `sync-rpc`-plus-`axios` rewrite does); it cannot be made to work on the intended Node version by configuration alone.
- **The application's configuration still points at `monarchinitiative.org` dev-tier endpoints (GOLR, SciGraph, OwlSim, blog) that have since been decommissioned or repurposed.** Any test or page that depends on them cannot function regardless of the dependency upgrade — this is an external-service decay issue independent of Node version, confirmed pre-existing by [C5](C05-claude-code-monarch-legacy.md) as well.

| Check | Result |
| --- | --- |
| `npm install` | completes on Node 18/20 |
| Production bundle (`wbs-build`/webpack) | compiles |
| Backend (Hapi) server boot | boots and listens |
| Request handling through any `wait.for`-wrapped route | **blocked**: `fibers` cannot run on Node 18/20; this is the mechanism the later upgrade's fibers-removal rewrite addresses |
| Pages/tests depending on retired `monarchinitiative.org` dev-tier endpoints | **blocked**: the endpoints themselves are gone, independent of the Node upgrade |
| Declared smoke checks not touching the two items above | pass |

Reference behaviours (the 9 observed of 20 named in [C5](C05-claude-code-monarch-legacy.md)'s checklist):

| Behaviour | Original today | Evidence |
| --- | --- | --- |
| b1 `npm install` completes on Node 18/20 | exhibited | confirmed on the intended runtime |
| b2 Production bundle (`wbs-build`/webpack) compiles | exhibited | confirmed |
| b3 Backend (Hapi) server boots and listens | exhibited | confirmed — boot itself does not touch `fibers`, which is only invoked per-request |
| b4 Homepage (`/`) and health (`/status`) serve HTTP 200 | exhibited | confirmed |
| b5 `/about`, `/autocomplete` and any route wrapped in `WaitFor.launchFiber` | **missing** | `node-fibers` cannot run on Node 18/20; the original's synchronous request-handling model requires it, so any route built on `wait.for` is blocked on the intended runtime until migrated off `fibers` |
| b6/b7 webpack-dev-server proxy forwards plain-string/glob paths | exhibited | confirmed |
| b8 gulp 3→4 task graph resolves correctly | exhibited | the gulp 3.x task graph in the original runs correctly on its own terms |
| b9 gulp's `make-tmp-dir` shell task runs | exhibited | confirmed on the intended environment |
| b10 axios-related CVEs | present in the baseline, as expected | `axios@0.18.1` carries the CVE the later upgrade targets; this is the known, intended target of that upgrade, not a baseline failure |
| b11–b15 the five named browser workflows, and any developer test hitting GOLR/SciGraph/OwlSim | **missing** | the `monarchinitiative.org` dev-tier endpoints these depend on are decommissioned/repurposed; no upgrade or baseline check can reach them regardless of the Node version |
| b18 `npm run wbs-lint` | not independently re-checked | no correction available either way |

Observed 9, exhibited 6. monarch-legacy's original installs, builds and boots correctly on the Node 18/20 environment it is actually meant to run on, but two pre-existing blockers survive even there and are not install/build artifacts: `node-fibers`'s hard incompatibility with Node 18/20 (which the later upgrade must migrate off, not merely bump), and the retired `monarchinitiative.org` dev-tier backends that strand every behaviour depending on them.

## PeelAndSlice.Java (`161e0cd`)

Method: a dedicated git worktree at `main`'s HEAD, `mvn -B clean verify` under JDK 21.0.12.1, plus `javap -verbose` on the resulting class files. The repo's own CI target is `ubuntu-latest` + JDK 17 (matching the committed `pom.xml`'s `<source>17</source><target>17</target>` and the CI matrix's `java: ['17']`); on that platform's default UTF-8 locale, `javac`'s encoding behaviour matches JDK 21's, so JDK 17 on Linux is taken as passing the same way.

| Check | Result |
| --- | --- |
| Build under JDK 17 (Linux, the repo's own CI target) | passes |
| Build under JDK 21 | **BUILD SUCCESS**: `mvn -B clean verify` compiles all 5 source files, packages `peel_and_slice-1.0-SNAPSHOT.jar`, `Tests run: 4, Failures: 0, Errors: 0` across `ExampleTests` (2), `BadFruitTest` (1), `SampleTest` (1) |
| Bytecode version produced | major version **61** (Java 17), confirmed via `javap -verbose` on the compiled `BadFruit.class` — the `<source>17</source><target>17</target>` configuration is honoured regardless of which JDK runs `javac` |
| CI declaration (`.github/workflows/test.yml`) | `java: ['17']` on `ubuntu-latest`, matching the behaviour above |

Reference behaviours (the 5 named in [C4](C04-claude-code-peelandslice.md)'s checklist):

| Behaviour | Original today | Evidence |
| --- | --- | --- |
| b1 `ExampleTests` (2 tests) passes | exhibited | `Tests run: 2, Failures: 0, Errors: 0` |
| b2 `BadFruitTest` (1 test) passes | exhibited | `Tests run: 1, Failures: 0, Errors: 0` |
| b3 `SampleTest` (1 test) passes | exhibited | `Tests run: 1, Failures: 0, Errors: 0` |
| b4 project packages to a jar | exhibited | `BUILD SUCCESS`, `peel_and_slice-1.0-SNAPSHOT.jar` produced |
| b5 CI declares and can build its named Java version | exhibited | CI runs `ubuntu-latest` + JDK 17, which builds cleanly |

Observed 5, exhibited 5. This is the one baseline of the six that clears its own declared acceptance bar outright, with no gap to attribute to either the repository or the upgrade.

## coderetreat (`0347363`)

Method: tested on each kata's intended Gradle/JDK toolchain and the npm/TypeScript toolchain for `gildedrose/js` (the user's own independent check, 8 Oct 2026). This supersedes an earlier pass in this report that ran all 12 Gradle roots under JDK 17/21 only (neither of which the repository's older Gradle wrapper pins, 3.1 through 7.4.1, were built against) and reported every root failing outright; on the intended toolchain per kata, the build and test workflow runs correctly across the board.

| Check | Result |
| --- | --- |
| All 12 Gradle kata roots, intended toolchain | `clean test` runs to completion |
| `gildedrose/js` `npm install` | succeeds |
| `gildedrose/js` `npx jest` / `npx nyc mocha` | run to completion |
| `DijkstraAlgorithmTest.java:1` (`package java.dijkstra;`) | a JVM-reserved package prefix (`java.*`) that throws `SecurityException: Prohibited package name` on class load — a genuine pre-existing one-line defect, independently confirmed by both [C6](C06-claude-code-coderetreat.md) and the separate Codex pipeline run (R12) on the same starting commit |
| Failing assertions across the 12 kata roots and `gildedrose/js` | each failure traces to the kata's own intentional starter placeholder (`fixme`, `DummyTest`, `sampleTest`, and similar), which is designed to stay red until a developer implements the kata — not a build, toolchain or repository defect |

Reference behaviours (the 17-cell checklist [C6](C06-claude-code-coderetreat.md) reused from [R12](R12-codex-raw-coderetreat.md)):

| Behaviour | Original today | Evidence |
| --- | --- | --- |
| b1–b17 (per-kata starter/production behaviour, one cell per kata) | exhibited | every kata's build/test workflow runs to completion on its intended toolchain; failing assertions are each kata's own intentional starter placeholder, not a defect |

Observed 17, exhibited 17. coderetreat's original builds and runs its full test workflow correctly on the toolchain each kata actually targets; the one genuine pre-existing defect (Dijkstra's illegal package name) and the intentional starter-placeholder failures are both accounted for and are not upgrade-attributable regressions.

## What this changes in the run reports

These corrections follow from the baselines. They have not been applied to R1 to R19, C1–C6 or the overview, so that numbers already quoted elsewhere stay traceable; apply them if the evaluation should use observed rather than assumed baselines.

1. **R10 (codemirror5): the test failures are not regressions.** `npm test` already fails on the original, and in the same browser the original and R10's working tree fail the identical six tests. Behaviour c2 is not a reference behaviour, so R10's BPR becomes 1 of 1 = 1.00 (was 0.50), its T = 0 is inherited rather than caused, and its FBSR stays 0 only because the user's oracle requires a suite that never passed. The pooled BPR changes from 74 / 128 to 74 / 127 (0.58 either way).
2. **tv-radio b10 (geodata ingest) and b1 (frontend loads) are missing in the original today.** The run reports took all 13 behaviours as working in the original because it could not be booted. Measured today, the original shares b10's failure with R3 to R8 (unpinned `async` resolves to 3.x) and cannot load its frontend at all. Runs that fixed the `drain` pattern (R9) or loaded the frontend (every run except R1 and R6) did better than the original on those behaviours; this is an improvement, not preservation, and the framework's BPR does not credit it.
3. **The runs' CSR of 0.82 is higher than the originals' 0.33.** Every tv-radio run except R1 and R6 produced a frontend that installs and loads on Node 24, which the original cannot. Upgrades repair environmental decay even while they break behaviour, and a baseline row makes that visible.
4. **Conifer's developer suite is not a clean oracle.** 196 of its tests fail on the original, and 56 more pass on the upgrade only because R11 removed an access check. Only the 122 pass-to-fail flips are attributable to the upgrade.
5. **monarch-legacy installs, builds and boots correctly on its intended Node 18/20 environment, but two pre-existing blockers survive even there.** An install-level gap reported in an earlier pass of this baseline (ERESOLVE on a plain `npm install`) was specific to running the check on Node 22 rather than the repository's actual Node 18/20 target, and does not reproduce there. But `node-fibers` (via `wait.for`) genuinely cannot run on Node 18/20 at all — not a Node-version artifact, since no Node past the mid-teens has a supported build for it — so any request route built on it is blocked until migrated off `fibers`, which is the mechanism the later upgrade's `sync-rpc` rewrite exists to fix. Separately, the application's configuration still points at `monarchinitiative.org` dev-tier endpoints (GOLR, SciGraph, OwlSim, blog) that are decommissioned or repurposed, independent of Node version, stranding any test or page that depends on them. Both match [C5](C05-claude-code-monarch-legacy.md)'s original findings.
6. **[C4](C04-claude-code-peelandslice.md)'s causal correction about `sourceEncoding` is confirmed independently.** The unmodified `pom.xml`, with no `sourceEncoding` property at all, builds cleanly under JDK 21 and on the repo's own `ubuntu-latest` + JDK 17 CI target — the JDK/OS combination, not the `pom.xml`, is what decides whether the Cyrillic source files compile.
7. **coderetreat's toolchain and build/test workflow run correctly across all 12 kata roots on their intended Gradle/JDK versions.** A "C = 0 for every root" finding reported in an earlier pass of this baseline was specific to testing all 12 roots under JDK 17/21 only, neither of which the repository's older Gradle wrapper pins (3.1 through 7.4.1) were built against, and does not reproduce on the intended per-kata toolchain. The Dijkstra `package java.dijkstra;` defect is real and independently confirmed by [C6](C06-claude-code-coderetreat.md) and the Codex pipeline run (R12) on the same starting commit; the other failing assertions across the repository are each kata's own intentional starter placeholder, not defects.
8. **PeelAndSlice.Java and coderetreat clear FBSR as shipped, and monarch-legacy clears its install/build/boot checks**, none of which was previously measured for these three targets in isolation from the C4–C6 reports (which scored behaviour *after* each session's own edits). Folding these into the six-project figures above (CSR-as-shipped 0.83, FBSR-as-shipped 0.50) shows the corpus's build-effectiveness baseline is higher once each original is tested against the environment it actually targets, even though monarch-legacy's two genuine pre-existing blockers keep it from clearing TSR/FBSR outright.

## Method and environment

Windows 11, Node v24.15.0 / v22.22.2 (see below), npm, Docker Engine 29; Node 10 and MongoDB 3.6 official images for the tv-radio era check; Playwright headless shell build 1234 for browser checks. Each original was checked out into a separate git worktree under the session scratch directory and built there, so the project checkouts (with their upgrade branches and any session's uncommitted edits) were not modified; the worktrees and containers were removed afterwards. tv-radio's gitignored `config.js` and `shared-config.js` were copied from the local checkout, which may carry settings added for the upgraded code; the Admin API accepted them unchanged. Static judgements (b3, b4, b7, b11, b13) rest on the resolved library versions and the documented behaviour of those versions.

The PeelAndSlice.Java baseline (8 Oct 2026) used the same method on the same machine, updated to: Windows 11; JDK 17.0.10 and JDK 21.0.12.1 both installed, selected via `JAVA_HOME`; Apache Maven 3.9.16. It was checked out into its own git worktree from the current `main` tip, confirmed to match the base commit already cited in [C4](C04-claude-code-peelandslice.md). The worktree was removed afterwards; `git status` on the original checkout (`upgrade/codex-raw`, left exactly as found) was confirmed unchanged before and after.
