# Evaluation C2: `claude_refactored_chats/code-mirror.md` (Claude Code, direct agent, codemirror5 toolchain, 26 Sep 2026)

Verdict: the cleanest result in the corpus. The same four-devDependency toolchain task as [R10](R10-codemirror-refactor.md) — rollup 1 → 4, puppeteer 1 → 25, `@rollup/plugin-buble` 0.21 → 1.0, `cm5-vim` 0.0.5 → 0.0.6 — completed in 32 minutes for US$1.54, with all four requested dependencies bumped, a working ESM Rollup 4 config, a build that runs clean in 2.4 s, and all five declared pages loading with zero console errors. `npm test` still exits 1, but on the **identical six assertions the unmodified original fails in the same browser** ([B00](B00-pre-upgrade-baselines.md)), and the run isolated that itself by re-running under legacy `headless: 'shell'`. C = 1, T = 0, FBSR = 0 by the user's all-or-nothing oracle; BPR 1.00, MBR 0, **EBER 1.00** — the only run in the corpus that is behaviourally equivalent to its reference.

Two things go against it. It **refused the designated workspace** (`projects/codemirror5`) as a suspected prompt-injection lure and did the work in a different clone, which removed GitNexus from the run a second time over and makes this an accidental rather than a designed ablation point. And it silenced a lint failure by dropping the whole `keymap/` directory from `blint`, which also removes `keymap/emacs.js` and `keymap/sublime.js` — 43 KB of tracked first-party source — from the repository's own checks.

This is **not** a `$upgrade` pipeline run. It is the same task given to a general coding agent (Claude Code, Sonnet 5) with no orchestrator, no generated test suite, no separate validation gate and no GitNexus, so it belongs in the ablation section of the framework rather than in the R1–R11 aggregates. Section 1.6 states which components were absent and what stood in for them.

| Item | Value |
| --- | --- |
| Chat | `claude_refactored_chats/code-mirror.md` (the agent's own end-of-session reconstruction, 11 KB; also left in the target repo as an untracked `conversation-export.md`) |
| Session log | `~/.claude/projects/C--Users-OEM-codemirror5/7fbb3d7e-1c71-40d5-9474-0b318cd013ae.jsonl` (381 records, 1.4 MB). Single session, **no sub-agents** |
| Target as given | `C:\Users\OEM\legacy-upgrade-system\projects\codemirror5`, devDependencies only: rollup `^1.26.3` → 4.63.2, puppeteer `^1.20.0` → 25.10.0, `@rollup/plugin-buble` `^0.21.3` → 1.0.3, `cm5-vim` `^0.0.5` → 0.0.6; `node-static` and `blint` noted as already current; `lib/`, `addon/`, `mode/`, `src/`, `keymap/` (except generated `vim.js`), `theme/`, `demo/`, `doc/` excluded; no CodeMirror 6 migration. Identical intake to R10 |
| Target actually used | `C:\Users\OEM\codemirror5` — a separate clone of the same upstream repository at the same upstream commit `9b4f0603` (v5.65.21+2). `projects/codemirror5` sits at `6e708583`, which is `9b4f0603` plus one local commit adding the harness's `AGENTS.md`, `CLAUDE.md` and `.claude/skills/gitnexus/`. The two trees are therefore identical as CodeMirror source, so the comparison with R10 holds — by luck, not by design |
| Validation commands from user | `npm install`; `npm run build`; `npm test`; spot-check `/`, `/test/index.html`, `/demo/vim.html`, `/demo/search.html`, `/demo/theme.html` |
| Branch and state evaluated | `master`, uncommitted working tree on `9b4f0603`: `package.json`, `test/lint.js`, `test/run.js` modified, `rollup.config.js` renamed to `rollup.config.mjs`. +17 / −9 across 4 files. No commit |
| Change size | **4 files; 26 LoC changed (17 additions, 9 deletions)**. Measured from the working tree against `9b4f0603`, since nothing was committed: `package.json` +4/−4, `rollup.config.js` → `rollup.config.mjs` +6/−3, `test/lint.js` +4/−1, `test/run.js` +3/−1. `package.json` is counted in, not excluded as configuration-only, because the devDependency bump is the upgrade itself. The untracked `conversation-export.md` and the gitignored `package-lock.json` (1,896 lines) are excluded, and no test file was generated. This is the smallest footprint of the three runs on this target |
| Pipeline verdict | not applicable — no validator, no confidence score |
| Human decisions | 3: one `AskUserQuestion` on the suspicious workspace (answer: "Use real repo instead"), then two housekeeping turns (export the transcript, move it into this repo). The run's own closing question — leave `npm test` failing or mark the six as `expectedFail` — was **left unanswered**, so the work sits in state (1) |
| Verification date | 26 Sep 2026, against the working tree as the session left it: `npm run build`, `npm test`, dependency versions read from `node_modules`, and all five declared pages loaded in the repo's own headless Chromium with console and page-error capture |

## The workspace refusal

The run's defining event happened in its first four tool calls, and it needs to be recorded precisely because it determines what this run can and cannot measure.

The pasted task named `…\legacy-upgrade-system\projects\codemirror5` as the working directory. The session's own cwd was `C:\Users\OEM\codemirror5`. The agent listed the named path, found an untracked 60 MB file at `.gitnexus/lbug` plus a `meta.json`, a `.claude/skills/` tree and `AGENTS.md` / `CLAUDE.md` files absent from the real repository, was then blocked by its own sandbox from reading that `CLAUDE.md` (`permissions.blockReadsOutsideWorkingDirectories`), classified the directory as a probable prompt-injection lure, ran nothing inside it, and asked the user what to do. The user chose the other clone.

Every one of those observations is correct, and the inference is locally reasonable: a large unexplained binary plus agent-instruction files outside the trusted scope is exactly the shape of a malicious workspace. It is also a **false positive**. `.gitnexus/lbug` is the GitNexus graph store for this evaluation (`meta.json`: 565 files, 3,097 nodes, 10,790 edges, 230 processes, indexed 14 Sep 2026 against `9b4f0603`), `.claude/skills/gitnexus/` is the harness's own skill set, and the two instruction files are the GitNexus usage block committed by the evaluation author at `6e708583`. `.gitnexus` is listed in that repository's `.gitignore`, which is exactly why the 60 MB file looked anomalous and unexplained.

Consequences for the evaluation:

- **GitNexus was unavailable twice over.** Its MCP tools were not registered in the session *and* the run was pointed away from the only indexed checkout. The "w/o GitNexus" ablation cell is therefore filled, but by accident.
- **The run never read the harness instructions** that the pipeline runs operate under. That is the cleaner ablation, not the dirtier one — but it was not a controlled choice.
- **Nothing about the comparison is invalidated**, because the two clones share the upstream commit. Had the harness commit touched CodeMirror source rather than only adding instruction files, this run would not be comparable with R10 at all.

## 1.1 Build effectiveness

| Metric | Value | Evidence |
| --- | --- | --- |
| C (install and build) | 1 | `npm install` clean (only pre-existing transitive deprecations: `inflight`, `glob@7`). `npm run build` today: exit 0 in **2.4 s**, no warnings beyond Rollup's informational circular-dependency notice, and all four outputs regenerate — `lib/codemirror.js` (402,250 B), `addon/runmode/runmode-standalone.js` (12,058 B), `addon/runmode/runmode.node.js` (11,489 B), and `keymap/vim.js` (238,966 B, byte-identical to `node_modules/cm5-vim/vim.js` at 0.0.6) |
| T (`npm test`) | 0 | Today: exit 1, **6 assertion failures** in the in-browser suite; the lint stage passes. The six: `core_move_bidi` ×2 ("cursor didn't move right"), `core_rtl_wrapped_selection`, `core_bidi_wrapped_selection`, `scroll_movedown_resize`, `scroll_movedown_hscroll_resize` |
| CSR / TSR / FBSR | 1.00 / 0.00 / 0.00 | N = 1 |
| Source change size | **4 files / 26 LoC** | 17 inserted + 9 deleted across `package.json`, the renamed `rollup.config.mjs`, `test/lint.js` and `test/run.js`. The gitignored `package-lock.json` and the untracked chat export are excluded; no test file was generated. On the identical task, [D01](D01-codex-direct-codemirror5.md) changed 6 files / 200 LoC and [R10](R10-codemirror-refactor.md)'s four-file change is not measurable. The whole `test/lint.js` change (+4/−1) is the lint-coverage regression discussed below — a one-line edit to the linted-directory list plus a three-line comment, 5 of this run's 26 LoC |
| Dependency coverage | 4 of 4 | rollup `^4.63.2`, puppeteer `^25.10.0`, `@rollup/plugin-buble` `^1.0.3`, `cm5-vim` `^0.0.6`. `node-static` (0.7.11) and `blint` (`^1.1.2`) correctly left alone, as instructed |
| Scope discipline | clean | `git status` is exactly the four intended entries. No change to `lib/`, `addon/`, `mode/`, `src/`, `keymap/` source, `theme/`, `demo/` or `doc/`; no CodeMirror 6 work attempted; scratch scripts and screenshots from the smoke test deleted |
| Syntax | clean | `rollup.config.mjs`, `test/run.js` and `test/lint.js` all load and execute today |

**The six failures are not regressions.** B00 established that the unmodified original at `9b4f0603` fails 2 of these under its own Puppeteer 1.20 Chromium and all 6 when the same test page is run in a current Chromium, and that R10's upgraded tree fails the identical 6 in that browser. This run's tree now makes a third member of that set: **original, R10 and C02 fail exactly the same six assertions under a current Chromium.** They are bidi (UBA) layout and scroll/resize geometry checks whose outcome is set by the browser build, not by Rollup or Puppeteer APIs.

The run reached that conclusion on its own, and by the right method: it re-ran the suite under Puppeteer's legacy `headless: 'shell'` — the old headless architecture that Puppeteer 1.20 used exclusively — to separate "our config broke it" from "the browser changed", and found 5 of the 6 persisting there. That is the strongest piece of diagnostic work in the corpus on this task, and it is the step R10 did not take. It then declined to add `expectedFail` markers to `test/test.js` and put the choice to the user instead.

T = 0 nonetheless, because the user's declared oracle is `npm test` passing, and it does not. FBSR = 0 follows. The metric is measuring the oracle, not the upgrade.

Three real migration defects were found and fixed along the way, all of them by running the thing:

- **`require.resolve` under native ESM.** Rollup 4 loads config as ESM; `rollup.config.js` already used `import` but called CJS `require.resolve("cm5-vim/vim.js")`, which dies with `require is not defined in ES module scope`. Fixed with `createRequire(import.meta.url)`, and the file renamed to `.mjs` so Rollup does not have to guess the module format — which also avoids the `"type": "module"` warning R10's tree still emits on every build.
- **Vendored `vim.js` versus an ES5 linter.** `cm5-vim` 0.0.6 emits `for...of` and optional chaining; `blint` was running over `keymap/` at `ecmaVersion: 5`. See 1.3 for what the fix costs.
- **The favicon 404.** Puppeteer 25's default headless Chromium requests `/favicon.ico`; the 2018 build did not. `test/run.js`'s static-serve error callback treated any error as fatal and called `process.exit(1)`, killing the run before the suite could start. Narrowed to `if (err && req.url !== "/favicon.ico")`.

The declared `page.waitFor` removal, the one breaking change the intake called out by name, turned out to be moot: `test/run.js` already polled with a local `sleep` helper. The run checked this up front rather than migrating something that was not there.

## 1.2 Generated tests

**The run generated no tests.** No test file was added, and `test/test.js` was deliberately left untouched. TP = TN = FP = FN = 0, so accuracy, precision, recall and F1 are all undefined for this configuration.

What replaced them was execution: `npm install`, `npm run build` and `npm test` run repeatedly through the repair loop (the suite was invoked seven times across the session), a scratch runner written to capture the in-browser output stream when `npm test`'s own reporting proved too terse, the `headless: 'shell'` differential run described above, and a Puppeteer smoke pass over the four demo pages with console and page-error listeners attached. All scratch artefacts were removed afterwards and the final `git status` proves it.

It is worth stating plainly what the comparison shows, because this is the one task where the pipeline's generated test can be scored against no generated test at all. R10's `test/upgrade_toolchain_smoke.js` asserted the four version strings, three properties of the config file, the absence of `page.waitFor`, and the presence of expected text in the four build outputs. It **fails on its own first stage today** — `addon/runmode/runmode.node.js does not contain module.exports`, because Rollup 4's CJS output does not use that literal string — so the one part of it that would have tested behaviour, a Vim-demo typing check, never runs. TP 0, FP 1, FN 1 for R10; TP 0, FP 0, FN 0 here. Neither configuration detected anything, but only one of them also cost its run a halt and a false alarm.

The generated-testing component's contribution on this task was therefore negative, and the failure mode is specific: it asserted over build-output *text* rather than build-output *behaviour*, so the assertions broke on the very change the upgrade was meant to make.

## 1.3 Behaviour preservation

Same four-behaviour reference set as R10, so the column is comparable. Per B00 correction #1, **c2 is not a reference behaviour**: the original's `npm test` already fails, so a repaired tree cannot be charged with losing a behaviour the reference never exhibited. All three remaining behaviours were observed directly on 26 Sep.

| Behaviour | Status | Evidence |
| --- | --- | --- |
| c1 `npm run build` produces the four outputs | preserved | build today: exit 0 in 2.4 s; all four files regenerated; `keymap/vim.js` byte-identical to the 0.0.6 package file |
| c2 `npm test` suite passes | not a reference behaviour | fails today with 6 assertions — the same 6 the original and R10's tree fail in a current Chromium. 2 of these already failed under the original's own Puppeteer 1.20 |
| c3 Vim demo initialises and accepts input with the rebuilt keymap | preserved | `/demo/vim.html` loaded headless: `keyMap` is `vim`, `CodeMirror.Vim` present, `ihello` + `Esc` yields the document `"hello"`, 0 console errors, 0 page errors |
| c4 Demo and test pages load in a browser | preserved | all five declared pages return 200 and render with **0 console errors and 0 page errors**: `/` (1 editor, 20 highlighted tokens), `/test/index.html` (3 editors), `/demo/vim.html` (21), `/demo/search.html` (144), `/demo/theme.html` (15) |

Observed 3, preserved 3: **BPR 1.00, MBR 0.00, EBER 1.00.**

This is the only run in the corpus with EBER = 1. Against R11's 0.87 BPR at US$52.71 and R1–R9's pooled 0.58, the reading is not that this agent is better but that this task is the one where the reference behaviour set is small, fully observable, and unentangled with the change being made — a toolchain swap behind a stable public surface. The metric rewards that shape of task, and any comparison across the corpus should say so.

Two further behaviours sit outside the shared four. They are reported separately so the denominator stays comparable with R10.

| Extra behaviour | Status | Note |
| --- | --- | --- |
| e1 `npm test` lints `keymap/emacs.js` and `keymap/sublime.js` | **missing (new regression)** | `test/lint.js` dropped `"keymap"` from the linted directory list to stop the vendored `vim.js` failing an `ecmaVersion: 5` pass. Both other files in that directory are **tracked first-party source** (16,336 B and 26,694 B) and are now unlinted. The comment added above the change says `keymap/vim.js` "is copied verbatim from the cm5-vim package… so it isn't held to this repo's lint rules" — true of `vim.js`, not of its two neighbours, and the comment does not mention them |
| e2 `test/run.js` exits 1 on any static-serve error | narrowed, deliberately | now exempts `/favicon.ico` only. A genuinely missing asset in a test page would still fail the run, and the change is mechanically required by the requested Puppeteer bump |

Folding e1 into the denominator gives BPR 3/4 = 0.75, MBR 0.25. The narrower fix was available and cheap: `blint` exports `checkFile` alongside `checkDir`, so `["emacs.js", "sublime.js"].forEach(f => blint.checkFile("keymap/" + f, opts))` keeps both first-party files linted and skips only the generated one. R10 took the opposite trade on the same obstacle — a `compileVim` transform in the Rollup config that strips optional chaining, `for...of` and an unused parameter out of the vendored output so it still passes the ES5 lint. That keeps lint coverage but rewrites a dependency's shipped code at build time, which is the more fragile of the two; the right answer is neither, and is one line of `checkFile`.

New behaviours (NBR). Counting only observable changes the user did not ask for, following the overview's rule that requested changes do not count: e2 is a mechanically necessary consequence of the requested Puppeteer bump and is not counted, and e1 is a loss rather than an addition. **NBR = 0** (0.25 if e2 is counted as new).

## 1.4 Cost and efficiency

Figures are from the session log's two `cost-state` records. The first is the state at the end of the upgrade work, at the moment the user asked for a transcript; the second is the end of the session and includes writing that 11 KB transcript.

| Boundary | Wall (min) | API time | Tokens (input + cache read + cache write + output) | Cost |
| --- | --- | --- | --- | --- |
| End of upgrade work | 31.6 | 7 m 17 s | **4,738,299** | **US$1.54** |
| End of session (incl. transcript export) | 34.3 observed / 42.0 recorded | 8 m 25 s | 5,214,795 | US$1.73 |

Breakdown at the upgrade boundary:

| Model | Input (uncached) | Cache read | Cache write | Output (of which thinking) | Cost |
| --- | --- | --- | --- | --- | --- |
| `claude-sonnet-5` | 116 | 4,630,352 | 74,294 | 31,823 (19,411) | US$1.5417 |
| `claude-haiku-4-5-20251001` | 1,695 | 0 | 0 | 19 | US$0.0018 |

Notes:

- **116 uncached input tokens** for the whole upgrade. 99.98% of input was served from cache; this configuration pays almost entirely for re-reading its own accumulated context.
- Tool time 4.8 minutes of the 31.6; 121 assistant messages; 63 tool calls (32 Bash, 17 Read, 7 Edit, 5 Grep, 1 Write, 1 AskUserQuestion). No sub-agents were spawned — the only run in either corpus with a flat single-thread structure.
- 27 lines added, 19 removed at the upgrade boundary (the 227/19 in the second record is the transcript file).
- The Haiku usage is harness housekeeping (session titling), not upgrade work.
- N = 1, so mean and median coincide for every figure in this section.
- Cost is not directly comparable with R1–R11, which are priced at GPT-5.5 list. Against R10, the same task through the full pipeline:

| | R10 (pipeline, Codex / GPT-5.5) | C02 (Claude Code, Sonnet 5) |
| --- | --- | --- |
| Threads | 7 (orchestrator + 6 stage threads) | 1 |
| Wall time | 45 min | **31.6 min** |
| Tokens | 6,340,056 | **4,738,299** |
| Notional cost | US$7.52 | **US$1.54** |
| User turns | 16 | 1 substantive (+1 question answered) |
| Dependencies bumped | 4 of 4 | 4 of 4 |
| `npm test` | 5 failures after 4 repair rounds | 6 failures, root-caused to the browser |
| Generated test | 1, fails on its own first assertion | none |
| BPR (B00-corrected) | 1.00 (1 of 1 observed) | **1.00 (3 of 3 observed)** |
| Committed | no | no |

R10's BPR of 1.00 rests on a single observed behaviour because its validation stage never ran; this run's rests on three, all exercised. On the same task the direct agent was 4.9× cheaper, 1.3× faster, needed one sixteenth of the human turns, and produced a better-diagnosed residual. That is the clearest single-task cost signal in the evaluation, and it lands on the smallest and best-specified task in the set — precisely the regime where orchestration overhead has nothing to buy.

## 1.5 LLM configuration

| Configuration | Reported value |
| --- | --- |
| Model | `claude-sonnet-5` (all upgrade work); `claude-haiku-4-5-20251001` for session titling |
| Harness | Claude Code 2.1.282 → 2.1.283, VS Code extension, **auto** permission mode, normal mode (no plan mode) |
| Reasoning effort | **high** (`"effort": "high"`, `perTurnEffort: null` — set once for the session) |
| Temperature / max output tokens | not configurable in this harness; not recorded |
| Input tokens | 116 uncached + 4,630,352 cache read + 74,294 cache write (Sonnet); 1,695 (Haiku) |
| Output tokens | 31,823, of which 19,411 thinking |
| Total tokens | 4,738,299 at the upgrade boundary; 5,214,795 for the session |
| Monetary cost | US$1.54 upgrade; US$1.73 session |
| Execution time | 31.6 min wall, 7 m 17 s API, 4.8 min tool |
| Environment | Windows 11, Node v24.15.0, npm 11.12.0, no Docker, no MCP servers registered. Resolved at install time: rollup 4.63.5, puppeteer 25.12.0, `@rollup/plugin-buble` 1.0.3, `cm5-vim` 0.0.6, node-static 0.7.11, blint 1.1.2 |

## 1.6 Position in the ablation

| Component | Present? | What stood in for it |
| --- | --- | --- |
| GitNexus graph retrieval | **no** | not registered in the session, and the run was steered away from the only indexed checkout (see "The workspace refusal"). Replaced by 5 `grep` sweeps and 17 file reads. On a four-file blast radius this cost nothing measurable: the affected set (`package.json`, `rollup.config.js`, `test/run.js`, `test/lint.js`, generated `keymap/vim.js`) matches R10's GitNexus-derived analysis, and this run additionally found `test/lint.js`, which R10's analysis did not list |
| LLM-generated testing | **no** | the repository's own suite, run seven times, plus a differential run under legacy headless mode and a five-page headless smoke pass. Section 1.2 shows the generated test was a net negative on this task |
| Validation and repair feedback | **partly** | no separate validator thread and no confidence score, but — unlike C01 — the user's declared check list *was* run as a final step: build, suite, and all five declared pages, after the last edit. This is why C02 has no "reported as fixed but never exercised" fault and C01 has four |
| Orchestration, staged plan, human gates | **no** | no plan mode, no stage gates, one substantive user turn. The single `AskUserQuestion` was a safety escalation, not a scope gate |

Read against R10 on the identical task: FBSR is 0 for both, and for the same reason — the user's oracle demands a suite that has never passed on this repository. Every component of the pipeline was absent here and the outcome was strictly better on cost, wall time, human turns, observed behaviour preservation and diagnosis quality. The honest reading is not "the components do not help" but "on a task with a four-file blast radius, a stable public API and a single build command, there is nothing for them to help with, and their overhead is fully visible." The pipeline's value has to be argued on R11-shaped tasks, not R10-shaped ones, and this pair is the cleanest evidence in the corpus for where the crossover sits.

## Stage outcomes

| Stage | Result |
| --- | --- |
| Intake and safety | 4 tool calls. Detected the workspace anomaly, ran nothing inside it, escalated to the user, proceeded in the alternate clone on the user's answer. False positive; the reasoning was sound and the containment was correct |
| Investigation | Read `package.json`, `rollup.config.js`, `test/run.js`, `bin/lint` and the CI workflow; confirmed Node 24 / npm 11 compatibility; checked for `page.waitFor` before migrating it and found it absent |
| Execution | 4 files: version bumps, `git mv` to `rollup.config.mjs` with `createRequire`, the `blint` directory-list change, the favicon exemption. 7 edits total |
| Self-validation | `npm test` run 7 times through the repair loop; a scratch runner written to capture the in-browser output stream, then deleted; the `headless: 'shell'` differential run that isolated 5 of 6 failures to the browser; a five-page Puppeteer smoke pass with console and page-error listeners; scratch scripts and screenshots removed and `git status` re-checked to prove it |
| Residual handling | Declined to mask the six failures with `expectedFail`, left `test/test.js` untouched, and put the choice to the user as a numbered question with both options costed |
| Commit | none. Four uncommitted files on `master`, plus an untracked `conversation-export.md` left in the target repository |

## What was broken afterwards

1. `npm test` exits 1 on six bidi and scroll/resize assertions. **Inherited, not caused** — the same six fail on the unmodified original in the same browser, and two of them fail even under the original's own Puppeteer 1.20.
2. `keymap/emacs.js` and `keymap/sublime.js` are no longer linted by `npm test`. This is the run's only genuine regression, and it is silent: the suite still passes its lint stage, so nothing reports the lost coverage.
3. Nothing is committed. The upgrade exists only as a dirty working tree in a clone that is not the evaluation's designated checkout, and `conversation-export.md` is left untracked in the repository root.
4. The dependency ranges float and the lockfile is gitignored. `^25.10.0` resolved to puppeteer **25.12.0** and `^4.63.2` to rollup **4.63.5** on this machine. Since every remaining failure is decided by which Chromium Puppeteer ships, the acceptance result is not reproducible from the committed manifest alone.

## Run-specific recommendations

- **Exclude the generated file, not its directory.** `blint.checkFile("keymap/emacs.js", opts)` and the same for `sublime.js` restores the lost coverage in one line. More generally: when a lint failure comes from a vendored artefact, narrow the exemption to that artefact and say in the comment which files are *still* covered.
- **Pin the browser when the browser is the oracle.** Pin `puppeteer` exactly, or commit the lockfile, on any repository whose acceptance test is a rendering suite. The six failures here are a property of a Chromium version, and today's `^25.10.0` is tomorrow's different answer.
- **Record a "migrated, residual inherited" outcome.** This run produced exactly the artefact R10's recommendation asked the pipeline to allow — a complete toolchain migration with the residual failures enumerated, categorised and attributed to the browser — and still could not close, because the oracle is binary and no one answered the closing question. The framework needs a T value that distinguishes "the suite fails because of this change" from "the suite failed before this change"; B00 supplies the baseline that makes that computable, and applying it here turns T = 0 into T = 1 against the corrected oracle.
- **Give the harness's own files a provenance marker.** The `.gitnexus/` store and `.claude/skills/` tree cost this run a stop-and-ask, removed GitNexus from the measurement, and would have cost any careful agent the same. A short committed `README` inside `.gitnexus/` naming what `lbug` is, and a first line in the harness `AGENTS.md` naming the evaluation that installed it, converts a security stop into a one-read confirmation. The alternative reading — that a general agent will refuse an instrumented workspace — is itself a finding worth stating in the write-up.
- **State the target path as the session's working directory, not as prose.** The mismatch between the session cwd and the pasted path is what triggered the whole episode. Launch the agent in the directory under test.
- **Commit the work.** As with C01 and R10, an upgrade that exists only as a dirty working tree cannot be diffed, reverted or scored against a branch — and here it also sits in a clone the evaluation does not track.

Evidence sources: the chat, the session log listed above, and direct verification on 26 Sep 2026 — `npm run build`, `npm test`, `git diff` and `git status` against `9b4f0603`, resolved dependency versions read from `node_modules`, `keymap/vim.js` byte-compared against `node_modules/cm5-vim/vim.js`, `blint`'s exported API read for the `checkFile` recommendation, `.gitnexus/meta.json` and `git show 6e708583` for the workspace-refusal section, and a headless Chromium pass over all five declared pages with console and page-error capture, including an `ihello` + `Esc` typing check against the rebuilt Vim keymap.
