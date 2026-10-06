# Evaluation R10: `codemirror-refactor.md` (codemirror5 dev toolchain, 14 Sep 2026)

Verdict: the toolchain migration itself is correct (rollup 1 to 4 and puppeteer 1 to 25 build and run today), but `npm test` fails on five layout and bidi assertions under the Chromium that Puppeteer 25 ships, the executor judged those outside its plan, and nothing was committed. The generated smoke test fails for a reason of its own. C = 1, T = 0, FBSR = 0.

| Item | Value |
| --- | --- |
| Chat | `refactored_chats/codemirror-refactor.md` |
| Target | `projects/codemirror5`, devDependencies only: rollup `^1.26.3` to 4.63.2, puppeteer `^1.20.0` to 25.10.0, `@rollup/plugin-buble` `^0.21.3` to 1.0.3, `cm5-vim` `^0.0.5` to 0.0.6; `lib/`, `addon/`, `mode/`, `src/`, `keymap/` (except generated `vim.js`), `theme/`, `demo/`, `doc/` excluded; no CodeMirror 6 migration |
| Validation commands from user | `npm install`; `npm run build` (regenerates `lib/codemirror.js`, `keymap/vim.js`, `addon/runmode/runmode-standalone.js`, `addon/runmode/runmode.node.js`); `npm test`; spot-check `/`, `/test/index.html`, `/demo/vim.html`, `/demo/search.html`, `/demo/theme.html` on a static server at :3000 |
| Branch and state evaluated | `upgrade/devdependency-toolchain-rollup-puppeteer`, uncommitted working tree on top of `6e708583` (`package.json`, `rollup.config.js`, `test/run.js` modified; `test/upgrade_toolchain_smoke.js` added) |
| Run artifacts | `.codex/upgrade-runs/codemirror5/20260914-152831-startup/` (no validation report) |
| Tool version | `5acacf4` (quantitative confidence score) / `df2d5f9` |
| Pipeline verdict | execution failed; no commit; no validation |
| Human decisions beyond the two gates | 3 (commit the unrelated workspace files; add the generated test command to `executor_check_commands` and rerun; "try again") |

## 1.1 Build effectiveness

| Metric | Value | Evidence |
| --- | --- | --- |
| C (install and build) | 1 | Today: `npm run build` completes in 6 s and regenerates `lib/codemirror.js`, `addon/runmode/runmode-standalone.js`, `addon/runmode/runmode.node.js`; `keymap/vim.js` is produced from `cm5-vim` 0.0.6 through the added `compileVim` transform. Executor: `npm install`, `npm run build` and the bounded node-static startup at `http://localhost:3000/` passed. |
| T (`npm test`) | 0 | Today: 5 failures in 18 s: `core_move_bidi` (two cases, "cursor didn't move right"), `core_bidi_wrapped_selection`, `scroll_movedown_resize`, `scroll_movedown_hscroll_resize`. Same five as the executor reported after four repair rounds. |
| Dependency coverage | 4 of 4 requested devDependencies changed; `node-static` and `blint` already current | |
| Syntax | `test/run.js` and the smoke test pass `node --check`; `rollup.config.js` is now an ES module (Node warns that `package.json` lacks `"type": "module"`) | |

The failing assertions are layout and bidirectional-text checks that depend on the browser build, not on Rollup or Puppeteer API changes. Whether they are legitimate regressions of CodeMirror under Chromium 152 or brittle tests is a question for the library maintainers; under the user's oracle (`npm test` must pass) the run fails either way.

## 1.2 Generated tests

| Test | What it asserts | Result | Classification |
| --- | --- | --- | --- |
| `test/upgrade_toolchain_smoke.js` | the four devDependency versions in `package.json`; `rollup.config.js` still copies `cm5-vim/vim.js` and keeps `namedFunctionExpressions: false`; `test/run.js` no longer calls `page.waitFor`; the four build outputs exist and contain expected text; then a headless Puppeteer session types into the Vim demo and asserts no console errors | fails today at the first stage: `addon/runmode/runmode.node.js does not contain module.exports` (Rollup 4's CommonJS output does not use that literal string). The executor never reached it because `npm test` failed first. | false positive: a wrong expectation about build output; the Vim demo check, the one part that would test behaviour, never runs |

TP 0, FP 1, FN 1.

## 1.3 Behaviour preservation

| Behaviour | Status | Evidence |
| --- | --- | --- |
| c1 `npm run build` produces the four outputs | preserved | build today |
| c2 `npm test` suite passes | missing | 5 failures today and in the run |
| c3 Vim demo initialises and accepts input with the rebuilt keymap | not observed | the smoke test that would check it aborts earlier |
| c4 Demo and test pages load in a browser | not observed | validation never ran |

Observed 2, preserved 1: BPR 0.50, MBR 0.50. New behaviours: none.

## 1.4 Cost and efficiency

| Thread | Effort | Minutes | Input tokens | Note |
| --- | --- | --- | --- | --- |
| Orchestrator (main) | medium | 45 | 2,013,987 | 16 user turns |
| Repository analysis | medium | 4 | 544,909 | |
| Planning | medium | 3 | 233,749 | |
| Test generation | medium | 2 | 322,052 | |
| Execution, attempt 1 | medium | 3 | 115,600 | halted: generated test command absent from `executor_check_commands` |
| Execution, attempt 2 | medium | 11 | 1,748,851 | migrated config and runner; `npm test` failed after 3 repairs |
| Execution, retry | medium | 7 | 1,360,908 | one more runner repair; same 5 failures |
| Total | | 45 wall | 6,340,056 (5,870,336 cached, 469,720 uncached) | output 74,566 (reasoning 15,074) |

Notional cost: US$7.52, the cheapest run. Main-thread line from the chat: total 171,248, input 147,619 (+1,866,368 cached), output 23,629 (matches the session log). Stage timings recorded by the user: preflight 43 s, analysis 6 m 8 s, planning 4 m 45 s, test generation 3 m, execution 4 m 25 s (halt on the missing executor check) + 12 m 8 s (migration and first `npm test` repairs) + 7 m 3 s (retry); about 38 minutes of agent activity against 45 minutes of wall time.

## 1.5 LLM configuration

GPT-5.5 via Codex CLI, medium effort on all seven threads, Windows 11, Node v24.15.0, GitNexus indexed (line locations from `Select-String` because ripgrep returned no root-manifest matches in that shell), Playwright MCP configured but not reached.

## Stage outcomes

| Stage | Result |
| --- | --- |
| Analysis | 4 affected files (`package.json`, `rollup.config.js`, `test/run.js`, generated `keymap/vim.js`), 2 high risk, 5 breaking-change notes |
| Plan | 4 ordered changes, 5 executor checks (install, build, startup probe, `npm test`, generated test after the manual patch), 5 key pages, 1 key flow, 3 content checks, scope-expansion limit 3 |
| Execution | 4 repairs: `compileVim` transform to strip optional chaining, for-of and an unused parameter from `cm5-vim` 0.0.6 output for the repo's parser and linter; `test/run.js` no longer exits on node-static 404s; `await page.evaluateOnNewDocument`; still 5 test failures. `keymap/vim.js` is a gitignored artifact, so it never appears in the diff. |
| Validation | not run |

## What this run shows

On a small, well-specified toolchain task the analysis and plan were accurate and the migration was competent: `test/run.js` now uses `headless: "shell"`, closes the browser and server in a `finally` block, and exits with the right code. The pipeline still ended with nothing committed because its rules treat the user's `npm test` as an all-or-nothing gate and give the executor no way to report "toolchain migrated; five pre-existing tests now fail under the new browser" as a partial success for the human to decide on. The same plan defect that halted R3 (generated test missing from `executor_check_commands`) recurred unchanged eleven weeks later.

## Run-specific recommendations

- Allow a "migrated with known test failures" outcome that commits the toolchain change and lists the failing tests with their categories, instead of leaving the work uncommitted in the working tree.
- Have the test generator run its own smoke test once before recording it; this one fails on its first assertion.
- Fix the generated-test-to-executor-check propagation in the test generator (it has now cost two runs a halt).
- Add `"type": "module"` handling to the Rollup 4 migration recipe so the build does not warn on every run.
