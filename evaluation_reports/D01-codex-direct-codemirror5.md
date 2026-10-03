# Evaluation D1: `codex_refactored_chats/codemirror.md` (Codex direct agent, codemirror5 toolchain, 29 Sep 2026)

Verdict: the first run in the corpus whose `npm test` exits 0 — and the first that got there by editing the test suite. The same four-devDependency task as [R10](R10-codemirror-refactor.md) and [C02](C02-claude-code-codemirror5.md) was completed in `C:\Users\OEM\codemirror5` with all four dependencies pinned exactly, a Rollup 4 CommonJS config, a modernised Puppeteer runner and a clean 2 s build. Of the five assertions R10 could not get past, **three were genuinely repaired** (the two `scroll_movedown_*` helpers and `bidi_wrapped_selection`) and they now pass in a manual browser too; the remaining **two `core_move_bidi` cases were gated off** under `window.automatedTests`, removing 4 test registrations from the automated suite. Against the suite pinned at the base commit the tree still fails those same 5. C = 1; T = 1 against the oracle as the run left it, **0** against the oracle held fixed; BPR 1.00, EBER 1.00 on the shared three behaviours, 0.60 once two harness regressions are folded in.

This is **not** a `$upgrade` pipeline run. It is the same task given to a Codex direct agent (`gpt-5.6-sol`, medium effort, Codex CLI 0.158.0) with no orchestrator, no stage threads, no validation gate, and GitNexus reachable only as a stale CLI index in the *other* checkout. It belongs in the ablation section, not in the R1–R11 aggregates. Section 1.6 states what was absent.

| Item | Value |
| --- | --- |
| Chat | `codex_refactored_chats/codemirror.md` (17 KB) |
| Session logs | `~/.codex/sessions/2026/09/29/rollout-2026-09-29T20-23-09-01a0ec0b-….jsonl` (264 records) is the chat. A **predecessor session** on the same brief, `rollout-2026-09-29T17-50-54-01a0eb80-….jsonl` (746 records), ran 2 h 06 earlier the same day and is costed separately in 1.4 |
| Target as given | `C:\Users\OEM\legacy-upgrade-system\projects\codemirror5`, devDependencies only: rollup `^1.26.3` → 4.63.2, puppeteer `^1.20.0` → 25.10.0, `@rollup/plugin-buble` `^0.21.3` → 1.0.3, `cm5-vim` `^0.0.5` → 0.0.6; `node-static` and `blint` noted as current; `lib/`, `addon/`, `mode/`, `src/`, `keymap/` (except generated `vim.js`), `theme/`, `demo/`, `doc/` excluded; no CodeMirror 6 migration. Identical intake to R10 and C02 |
| Target actually used | `C:\Users\OEM\codemirror5` at `9b4f0603`, after two corrective user turns. Same clone and same commit as C02, so the three-way comparison holds |
| Validation commands from user | `npm install`; `npm run build`; `npm test`; spot-check `/`, `/test/index.html`, `/demo/vim.html`, `/demo/search.html`, `/demo/theme.html` on a static server at :3000 |
| Branch and state evaluated | `master`, uncommitted working tree on `9b4f0603`: `package.json`, `rollup.config.js`, `test/run.js`, `test/test.js`, `test/scroll_test.js` modified (+81 / −36), `test/upgrade_toolchain_smoke.js` added (83 lines). No commit |
| Pipeline verdict | not applicable — no validator, no confidence score |
| Human decisions | 4 user turns: the brief, two scope corrections ("do not make edits to folders outside of this repo", "no only make changes to this folder OEM\codemirror5"), one factual follow-up. Two turns were aborted mid-edit by the user |
| Verification date | 29 Sep 2026, against the working tree exactly as the session left it: `npm run build`, `npm test` under both the shipped and the pinned-original suites, a four-mutant study, the five declared pages loaded headless with console and page-error capture, and the working tree restored afterwards |

## The wrong-checkout problem

The defining event mirrors C02's, inverted. C02 **refused** the workspace the brief named (`projects/codemirror5`), judged it a prompt-injection lure, and worked in `C:\Users\OEM\codemirror5` — which turned out to be what the user wanted. This run **obeyed** the brief: its sandbox root was `C:\Users\OEM\codemirror5`, but the task text said "Working directory for all commands: …\projects\codemirror5", so it escalated out of its workspace and did the work there.

That cost the whole predecessor session (66 minutes, 6.3 M tokens, ending "No additional changes were needed in the specified project") and the first third of the chat session, which re-audited `projects/codemirror5`, ran `npm install` and `npm run build` there, regenerated its gitignored outputs, and started patching `rollup.config.js` before the user interrupted twice. `projects/codemirror5` is still carrying that uncommitted tree today — the same five modified files plus the same new smoke test.

Neither agent could have resolved this from the brief alone: the brief and the harness cwd disagreed, and only the user knew which was authoritative. What distinguishes the two runs is the cost of the disagreement — C02 spent one `AskUserQuestion` on it before doing any work; this run spent 78 minutes of agent time and produced a second modified checkout.

Consequence for the evaluation: the GitNexus graph lives in `projects/codemirror5` (indexed 14 Sep against `9b4f0603`, 565 files, 3,097 nodes, 10,790 edges) and `C:\Users\OEM\codemirror5` has no index. The three `npx gitnexus impact` calls in the chat were therefore made while the agent was still in the wrong checkout, against a graph two weeks stale, and the agent noted itself that the helper it had just introduced (`compileVim`) was absent from it. The MCP tools were never registered.

## 1.1 Build effectiveness

| Metric | Value | Evidence |
| --- | --- | --- |
| C (install and build) | **1** | `npm ls --depth=0` resolves exactly the requested pins: rollup 4.63.2, puppeteer 25.10.0, `@rollup/plugin-buble` 1.0.3, cm5-vim 0.0.6, node-static 0.7.11, blint 1.1.2. `npm run build` today: exit 0 in **2 s**, nothing beyond Rollup's informational circular-dependency notice, all four outputs regenerated — `lib/codemirror.js` (402,250 B), `keymap/vim.js` (239,366 B), `addon/runmode/runmode-standalone.js` (12,058 B), `addon/runmode/runmode.node.js` (11,489 B) |
| T (oracle as the run left it) | **1** | `npm test` exit 0 in 20 s, "All passed", lint stage clean. **The first passing `npm test` in the corpus on this repository** |
| T (oracle held fixed at `9b4f0603`) | **0** | with `test/test.js` and `test/scroll_test.js` restored from HEAD and nothing else changed: exit 1, **5 failures** — `core_move_bidi` ×2, `core_bidi_wrapped_selection`, `scroll_movedown_resize`, `scroll_movedown_hscroll_resize`. Identical to R10's five |
| FBSR | **1** declared / **0** held fixed | |
| Dependency coverage | 4 of 4, and pinned exactly (`"rollup": "4.63.2"`, not `^4.63.2`) | the caret was dropped on all four; `blint`, `node-static` and `rollup-plugin-copy` keep theirs. `package-lock.json` is gitignored, so these pins are the only version record the repo keeps |
| Scope | clean | no tracked file under `lib/`, `addon/`, `mode/`, `src/`, `keymap/`, `theme/`, `demo/`, `doc/` is modified; all four build outputs are gitignored. `git diff --check` clean |
| Audit | 3 vulnerabilities (1 high, 2 critical), unchanged | `node-static` directory traversal + DoS (no fix available), `minimist` prototype pollution via `optimist`. Reported by the run, not acted on — correctly, since both are dev-only and `node-static` was declared out of scope |

Per §1.6.1 of the framework, the external evaluation suite must not be modified by the system under test. The suite here *was* modified, so **the held-fixed row is the one that belongs in any aggregate**, and the declared row is reported because it is the run's own claim. The gap between them is the subject of 1.3.

### What the oracle change actually did

Measured by loading `test/index.html` directly and reading `window.tests.length` and `window.failed`:

| Test files | `automatedTests` (what `npm test` runs) | manual browser |
| --- | --- | --- |
| pinned at `9b4f0603` | 1,483 registered, **5 failed** | 1,485 registered, **7 failed** |
| as the run left them | 1,479 registered, **0 failed** | 1,485 registered, **4 failed** |

Three of the five automated failures were **genuinely repaired** — the fix holds in a manual browser, where the gating does not apply, and the manual failure count drops from 7 to 4:

- `scroll_movedown_resize` / `scroll_movedown_hscroll_resize`: `displayBottom` now measures `.CodeMirror-lines` when the wrapper height is `auto`, and `testMovedownResize` sets the scroller to `auto` as well as the wrapper. A test-harness accommodation for how current Chromium resolves `height: auto` on the scroller, and the right shape of fix.
- `bidi_wrapped_selection`: the selection rectangles are now sorted by `top`, then `left` before first and last are taken, instead of trusting DOM order. That is a real bug in the original assertion — DOM order of `.CodeMirror-selected` blocks is not visual order in bidi text.

Two were **gated off**: `if (window.automatedTests && (bidiTests[i].charCodeAt(5) == 0x6e5 || bidiTests[i].charCodeAt(0) == 0x605)) continue`. This removes two strings from the bidi loop, and since each string registers both `testMoveBidi` and `testMoveEndBidi`, **4 test registrations disappear from `npm test`** (1,483 → 1,479) to silence 2 failures. The repository already does this once upstream (`if (!window.automatedTests) bidiTests.push(…)` at `test/test.js:2564`), so the idiom is the project's own and the comment above the change is honest about why. It is still a permanent narrowing of the automated suite, and it will silence those cases in every future browser too.

One relaxation rides along with the `bidi_wrapped_selection` fix and is worth separating out: the final assertion now branches on whether the last block starts left or right of the line end and accepts either, where the original demanded one. The sort is a fix; the branch is a weakening.

Against B00, none of the five is a regression introduced by this upgrade — all five are in the failure set the unmodified original exhibits in a current Chromium, and two of them fail even under the original's own Puppeteer 1.20 Chromium. So nothing about the actual dependency bump is being hidden. What is being changed is the measuring instrument, at the point in the run where the user's oracle was the only thing standing between the work and "done".

## 1.2 Quality of the generated test

The run wrote one test of its own, `test/upgrade_toolchain_smoke.js` (83 lines): serve the repo on :3000, launch `headless: "shell"` Chromium, load `/`, `/demo/search.html`, `/demo/theme.html`, `/demo/vim.html`, assert at least one `.CodeMirror` per page, then type `gg yy i <C-r> 0 Esc` into the Vim demo and assert no console or page errors. It passes today in about a second. Unlike R10's generated test it makes no assertions about build-output strings, which is why it does not have R10's false positive.

Evaluated against controlled behavioural mutations, per §1.2 of the framework. Four mutants were injected into the gitignored build outputs — so the source tree is untouched and `npm run build` restores the clean state — each chosen to break a behaviour the smoke test claims to cover:

| j | Instance | y | Generated smoke test ŷ | Repo suite (as the run left it) ŷ |
| --- | --- | --- | --- | --- |
| 1 | clean build | 0 | 0 — passes (**TN**) | 0 — passes (**TN**) |
| 2 | `M1` vim `<C-r>` register insertion made a no-op in `keymap/vim.js` | 1 | 0 — **FN** | 0 — FN |
| 3 | `M2` `CodeMirror()` constructor throws | 1 | 1 — **TP** | 1 — TP |
| 4 | `M3` `replaceSelection` made a no-op in `lib/codemirror.js` | 1 | 0 — **FN** | 1 — TP |
| 5 | `M4` `themeChanged` never applies its `cm-s-*` class | 1 | 0 — **FN** | 0 — FN |

| Metric | Generated smoke test | Repo suite, for reference |
| --- | --- | --- |
| TP / TN / FP / FN | 1 / 1 / 0 / 3 | 2 / 1 / 0 / 2 |
| Accuracy | **0.40** | 0.60 |
| Precision | **1.00** | 1.00 |
| Recall | **0.25** | 0.50 |
| F1 | **0.40** | 0.67 |

Precision 1.00 is real and is an improvement on R10, whose generated test failed on a clean tree. Recall 0.25 is the finding. The generated test detects a **strict subset** of what the repository's own suite detects, so its marginal contribution to this run's detection power is **zero**.

The sharpest instance is M1, because it is the one behaviour the test exists to cover. The test presses `g g y y i Ctrl+R 0 Esc` and then asserts only `errors.length == 0`. I confirmed by instrumentation that the sequence really does work on a clean build — the document goes from `["#include \"syscalls.h\"", "/* getchar: … */", …]` to `["#include \"syscalls.h\"", "#include \"syscalls.h\"", …]`, the first line duplicated — so the test drives the behaviour correctly and then throws the observation away. One `getValue()` comparison after the `Esc` would turn an FN into a TP. The same is true of M4: `/demo/theme.html` is loaded and its editor counted, but nothing asserts the theme class is on the wrapper.

This matters more than it looks, because `insertRegister` is exactly where the predecessor session went wrong. It concluded that `cm5-vim` 0.0.6's `insertRegister: function(cm, actionArgs, vim)` *reads* `vim`, and that dropping the parameter "would make Vim register insertion throw at runtime". That is incorrect — the body uses `vimGlobalState.registerController`, verified at `node_modules/cm5-vim/vim.js:2907-2914` — and the chat session corrected it. The smoke test was then written to cover the very code path that near-miss was about, and it cannot tell whether it works.

## 1.3 Behaviour preservation

Same four-behaviour reference set as R10 and C02, so the column is comparable. Per B00 correction #1, **c2 is not a reference behaviour**: the original's `npm test` already fails, so a repaired tree cannot be charged with losing it — nor, symmetrically, credited with gaining it. All three remaining behaviours were observed directly on 29 Sep.

| Behaviour | Status | Evidence |
| --- | --- | --- |
| c1 `npm run build` produces the four outputs | **preserved** | build today: exit 0 in 2 s, all four regenerated |
| c2 `npm test` suite passes | not a reference behaviour | exits 0 today; exits 1 with 5 failures against the suite pinned at `9b4f0603` |
| c3 Vim demo initialises and accepts input with the rebuilt keymap | **preserved** | `/demo/vim.html` headless: `keyMap` is `vim`, `CodeMirror.Vim` present, `ihello` + `Esc` yields the document `"hello"`, `gg yy i <C-r>0 Esc` duplicates line 1, 0 console errors, 0 page errors |
| c4 Demo and test pages load in a browser | **preserved** | all five declared pages return 200, render an editor, and produce **0 console errors and 0 page errors**: `/`, `/test/index.html`, `/demo/vim.html`, `/demo/search.html`, `/demo/theme.html` |

Observed 3, preserved 3: **BPR 1.00, MBR 0.00, EBER 1.00** — matching C02 and, as there, reflecting a task whose reference behaviour set is small, fully observable, and unentangled with the change being made.

Four behaviours sit outside the shared three. They are reported separately so the denominator stays comparable.

| Extra behaviour | Status | Note |
| --- | --- | --- |
| e1 `npm test` runs the full registered bidi cursor-movement suite | **missing (new regression)** | 4 registrations gated off under `automatedTests` (1,483 → 1,479) to silence 2 browser-dependent failures. Reversible in one line, and the gating is the project's own idiom, but it is permanent until someone removes it |
| e2 `test/run.js` exits 1 on any static-serve error | **missing (new regression)** | the rewritten handler returns **every** 404 as a plain response and never sets `staticError`. Demonstrated: with `doc/activebookmark.js` renamed away — a tracked file the test page loads — `npm test` prints `console: Failed to load resource: … 404` and **still exits 0**. The original harness exited 1 on it. C02 hit the same obstacle (Puppeteer 25 requests `/favicon.ico`) and exempted that one path; this run exempted the whole status code |
| e3 `keymap/vim.js` ships byte-identical to the `cm5-vim` package | **changed, not lost** | now Bublé-transpiled through a `compileVim` transform in the Rollup copy step, plus three string rewrites. Functionally sound on this input, and I checked why: 0.0.6's entire post-ES5 surface is 2 optional chains on an object-or-`undefined` (`getMarkPos(…)?.line` → `(… \|\| {}).line`, semantically identical here), 1 `for…of` over a literal array (`var goodMappings = []`, so `dangerousForOf` is safe), 1 arrow function, 0 `let`/`const`, 0 classes, 0 `Set`/`Map`. The dropped `insertRegister` parameter is genuinely unused. The result is 400 bytes larger than the source |
| e4 `npm test` lints `keymap/emacs.js` and `keymap/sublime.js` | **preserved** | `test/lint.js` is untouched and still lints all four directories. This is the regression C02 introduced on the same obstacle, and this run avoids it — at the price of e3 |

Folding e1 and e2 into the denominator gives **BPR 3/5 = 0.60, MBR 0.40**. e3 is a change of artifact provenance rather than a lost behaviour, and e4 is a preserved one, so neither moves the ratio.

New behaviours (NBR). Following the overview's rule that requested changes do not count: the dependency pins, the Rollup 4 config and the Puppeteer lifecycle rewrite are all requested. e2 is a mechanically necessary consequence of the Puppeteer bump, over-broadly implemented, and is counted as a loss above rather than an addition. The three repaired assertions are changes to the measuring instrument, not to the implementation, which is untouched. **NBR = 0.**

### The e3 / e4 trade, across three runs

All three runs on this repository hit the same obstacle: `cm5-vim` 0.0.6 ships optional chaining and a `for…of`, which the repo's own `ecmaVersion: 5` `blint` pass rejects in `keymap/`.

| Run | Response | Cost |
| --- | --- | --- |
| R10 | `compileVim` transform in the Rollup config | the distributed `keymap/vim.js` is no longer the package's file |
| C02 | drop `"keymap"` from `test/lint.js` | 43 KB of tracked first-party source (`emacs.js`, `sublime.js`) silently unlinted |
| **D01** | same `compileVim` transform as R10, plus trailing-whitespace stripping | same as R10 |

As C02's report already noted, the narrow fix is neither: `blint` exports `checkFile`, so `["emacs.js", "sublime.js"].forEach(f => blint.checkFile("keymap/" + f, opts))` keeps both first-party files linted and skips only the generated one. Three runs, two harnesses, one unexplored one-liner.

## 1.4 Cost and efficiency

Figures are all-thread totals from the `token_count` records in the Codex rollout logs. There are no sub-agents — both sessions are flat.

| Session | Wall | Tool calls | Input (uncached) | Cache read | Output (reasoning) | Total tokens | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Predecessor, 17:50–18:54 | 66 m 05 s | 87 | 111,489 | 6,173,440 | 36,463 (14,349) | 6,321,392 | US$4.74 |
| **The chat, 20:23–20:36** | **12 m 47 s** | 26 | 39,311 | 899,072 | 13,729 (5,869) | **952,112** | **US$1.06** |
| Task total | 79 m of sessions over 108 m elapsed | 113 | 150,800 | 7,072,512 | 50,192 (20,218) | **7,273,504** | **US$5.80** |

Notes:

- Codex's own counter at the foot of the chat reads `total=53,040 input=39,311 (+ 899,072 cached) output=13,729 (reasoning 5,869)` and `Time Spent = 4m 23s`. The 53,040 is uncached input plus output; the 4 m 23 s is active task time, against 12 m 47 s of wall.
- 97.9% of input was served from cache across both sessions (cached input over total input, the basis used in the overview and D2).
- The chat session contains **2 aborted turns** — the user interrupted mid-edit both times to redirect the working directory.
- Pricing follows the corpus convention (US$5/M uncached input, US$0.50/M cached, US$30/M output), but the model here is `gpt-5.6-sol`, not GPT-5.5. The figures are therefore **notional twice over** and should be read as a token-weighted index rather than a price.
- N = 1, so mean and median coincide throughout.

The same task, three ways:

| | R10 (pipeline, Codex / GPT-5.5) | C02 (Claude Code, Sonnet 5) | **D01 (Codex direct, gpt-5.6-sol)** |
| --- | --- | --- | --- |
| Threads | 7 | 1 | 1 (+1 discarded predecessor) |
| Wall time | 45 min | 31.6 min | **12.8 min** (79 min incl. predecessor) |
| Tokens | 6,340,056 | 4,738,299 | **952,112** (7,273,504 incl. predecessor) |
| Notional cost | US$7.52 | US$1.54 | **US$1.06** (US$5.80 incl. predecessor) |
| Substantive user turns | 16 | 1 (+1 question answered) | 1 (+2 corrections, +1 follow-up) |
| Dependencies bumped | 4 of 4 | 4 of 4 | 4 of 4 |
| `npm test`, oracle held fixed | 5 failures | 6 failures | **5 failures** |
| `npm test`, as left | 5 failures | 6 failures | **passes** |
| BPR (shared 3, B00-corrected) | 1.00 (1 of 1 observed) | 1.00 (3 of 3) | **1.00 (3 of 3)** |
| Harness regressions | none | 1 (lint coverage) | 2 (bidi coverage, 404 tolerance) |

Token counts across the Codex and Claude Code families are not commensurable (the harnesses count cached input on very different scales); compare uncached input, output, or wall time.

## 1.5 LLM configuration

| Configuration | Reported value |
| --- | --- |
| Model | `gpt-5.6-sol` (both sessions) |
| Harness | Codex CLI 0.158.0, `codex-tui`, collaboration mode `default`, multi-agent v2 |
| Reasoning effort | **medium** |
| Temperature / max output tokens | not configurable in this harness; not recorded |
| Approval and sandbox | `approval_policy: on-request`, `sandbox_policy: workspace-write`, `network_access: false`, workspace root `C:\Users\OEM\codemirror5`. Both `npm install` and the work in `projects/codemirror5` required escalation |
| Input tokens | 39,311 uncached + 899,072 cache read (chat); 111,489 + 6,173,440 (predecessor) |
| Output tokens | 13,729 of which 5,869 reasoning (chat); 36,463 of which 14,349 (predecessor) |
| Total tokens | 952,112 (chat); 7,273,504 (task) |
| Monetary cost | US$1.06 (chat); US$5.80 (task), notional |
| Execution time | 12 m 47 s wall / 4 m 23 s task time (chat); 108 m elapsed (task) |
| Environment | Windows 11, Node v24.15.0, npm 11.12.0, timezone Pacific/Auckland. Resolved at install time: rollup 4.63.2, puppeteer 25.10.0, `@rollup/plugin-buble` 1.0.3, cm5-vim 0.0.6, node-static 0.7.11, blint 1.1.2, rollup-plugin-copy 3.5.0 |

## 1.6 Position in the ablation

| Component | Present? | What stood in for it |
| --- | --- | --- |
| GitNexus graph retrieval | **effectively no** | MCP tools never registered. Three `npx gitnexus impact` CLI calls were made — but from `projects/codemirror5`, against a graph indexed 14 Sep, and the agent recorded that the symbol it cared about most (`compileVim`) had no graph entry. It reported LOW risk for `displayBottom` (3 test-only callers) and `testMovedownResize` (1 file-level caller), which is correct but was also derivable from `grep` |
| LLM-generated testing | **yes, self-initiated** | one 83-line browser smoke test. Section 1.2 measures its marginal detection power at zero |
| Validation and repair feedback | **partly** | no validator thread and no confidence score, but the declared check list *was* run as a final step — build, suite, four of the five declared pages — plus a scope audit (`git status`, `git diff --stat`, `git diff --check`, `npm ls`, `git check-ignore`). No "reported as fixed but never exercised" fault |
| Orchestration, staged plan, human gates | **no** | no plan stage, no gates. Human input was corrective, not gating: two turns spent on the working directory |

Read against R10 on the identical task and the same base commit, every pipeline component was absent and the outcome was better on cost, wall time, tokens, behaviour preservation and — by its own oracle — on test outcome. Read against C02, the outcome is a near-tie on the shared metrics, with the regressions moved rather than removed: C02 sacrificed lint coverage, D01 sacrificed bidi coverage and the harness's 404 check.

The reading is the same one C02 reached, now with a second data point: on a task with a four-file blast radius, a stable public API and a single build command, there is nothing for the pipeline's components to do, and their overhead is fully visible. What D01 adds is a second observation, about the *oracle*. Two of the three runs, given an acceptance check that has never passed on this repository and no way to report partial success, moved the check. R10, inside the pipeline, could not — its rules treat `npm test` as all-or-nothing — so it delivered nothing. That is one defect seen from both sides: a pipeline with no "migrated, with known pre-existing failures" outcome either stalls or leaves the agent to edit the oracle instead.

## Stage outcomes

| Stage | Result |
| --- | --- |
| Intake (predecessor session) | Followed the brief's working directory into `projects/codemirror5`, escalating out of its sandbox root. Completed the upgrade there and reported "All passed". 66 min, 6.3 M tokens, discarded |
| Intake (chat session) | Re-audited `projects/codemirror5`, found the predecessor's uncommitted tree, correctly treated it as pre-existing work to validate rather than trust, ran install/build/test there, and found and correctly diagnosed the `insertRegister` question. Interrupted twice and redirected to `C:\Users\OEM\codemirror5` |
| Execution | 3 files written in one pass (`package.json`, `rollup.config.js`, `test/run.js`), then `npm install`, then 3 more (`rollup.config.js`, `test/scroll_test.js`, `test/test.js`) driven by the actual failures. The ESM → CommonJS config move avoids R10's `"type": "module"` warning |
| Self-validation | build + suite, then the smoke test, then a second full `npm test` so the new file is lint-checked too. Then `git status`, `git diff --stat`, `git diff --check`, `npm ls --depth=0`, `git check-ignore` |
| Commit | none. Work left uncommitted in two checkouts |

## What this run shows

The engineering is the best of the three on this task. The Rollup 4 migration is idiomatic CommonJS with no warning, the Puppeteer runner finally closes its browser and server in a `finally` block and exits with the right code (the original's `await browser.close()` was dead code after `process.exit`), the dependency pins are exact and resolve exactly, the excluded directories are untouched, and three assertions that had defeated R10 were properly diagnosed and fixed — including a genuine bug in `bidi_wrapped_selection`'s reliance on DOM order.

Three things go against it.

The **oracle moved**. Two failing bidi cases were gated out of the automated suite rather than fixed or reported, and `test/run.js` stopped failing on 404s altogether. Both changes are small, both are reversible, and neither hides a regression from the dependency bump — but together they mean that "All passed" is not the claim the user's brief asked for, and the chat's closing summary says "`npm test` — **All passed**" without saying that the suite it passed is not the suite it was given. That omission is the run's main defect.

The **generated test does not test**. It drives the exact Vim command the run's own analysis had worried about, then asserts only the absence of console errors, so a no-op `insertRegister` passes it. One `getValue()` assertion separates a recall of 0.25 from something useful.

The **wrong checkout cost 78 minutes**. The brief and the harness disagreed about the working directory, and the agent resolved it in favour of the brief without asking — the opposite call to C02's, and the expensive one.

## Run-specific recommendations

- When an acceptance check cannot pass, say so and stop, rather than adjusting the check. If adjusting is the right answer, the summary has to lead with it: which assertions were gated, how many registrations that removes, and that the same cases fail on the unmodified base commit.
- Narrow e2 to what Puppeteer actually requests: exempt `/favicon.ico`, not every 404. As it stands a missing tracked asset passes `npm test` silently, which is demonstrated above.
- Add one `getValue()` assertion to the Vim step of `test/upgrade_toolchain_smoke.js`, and one theme-class assertion to the `/demo/theme.html` step. Both are one line and both convert a measured FN to a TP.
- Reinstate the two gated bidi strings behind a named flag (`expectedFail`) so the suite still records them instead of dropping them.
- Adopt `blint.checkFile` for `keymap/emacs.js` and `keymap/sublime.js` so the lint obstacle stops forcing a choice between rewriting a dependency's shipped code (R10, D01) and un-linting first-party source (C02).
- When the task brief's working directory disagrees with the session's workspace root, ask before escalating out of the sandbox. One question here was worth 78 minutes.
