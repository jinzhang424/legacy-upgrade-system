# B01 — Measured repository complexity at each original commit

As of 12 Oct 2026. This report records the provenance of the complexity table in section 5.1 of the report (Table 6: "Measured complexity of each target at its original commit"). Those figures were computed ad hoc on 6 Oct 2026 by scripts that lived only in a session scratch directory and were never committed, so until now the only durable copy of them was the prose of the report itself. The scripts are now in [`report/metrics/`](../report/metrics/), the per-blob data they emit is in [`report/metrics/blobs/`](../report/metrics/blobs/), and every published figure below was re-derived with them on 12 Oct 2026 and agrees exactly.

[B00](B00-pre-upgrade-baselines.md) scores what each original *does*; this report measures what each original *is*.

## Method

Every figure is taken from the git object store at the stated commit, not from a working tree, so no build output, installed dependency or agent artefact can contaminate it. `gitcount.py` lists the tree with `git ls-tree -r -z <commit>`, skips symbolic links (mode `120000`) and submodule entries, and reads each remaining blob with `git cat-file --batch`, counting lines two ways (total and non-blank). `classify4.awk` then classifies each path and sums per class.

The two published rows map onto that output as follows.

| Table 6 row | Definition |
| --- | --- |
| Total source files / Total source LOC | `code + style + markup + infra + config` classes, plus any `pom.xml`, counted as **non-blank** lines |
| Main code files / code LOC | the `code` class alone (`.js .jsx .mjs .cjs .ts .tsx .vue .py .rb .php .java .kt .go .rs .c .cc .cpp .h .hpp .pl .lua .cs`) |

Excluded from the source total: binary and media assets, fonts, lockfiles and `*.map`; anything under a `node_modules`, `bower_components`, `external`, `vendor`, `third-party`, `libs` or `gradle/wrapper` directory; files matching a known third-party library filename; `*.min.js` and `*.min.css`; generated output (`lib/codemirror.js`, the `cache/` response cache, tv-radio's precompiled Ember templates); agent instruction material under `.claude/` and `.agents/`; and Markdown documentation.

**One exclusion the report's Appendix B does not state.** The last term of the `||` chain in `classify4.awk` is `cls=="data-config" && low ~ /pom\.xml$/`, and `&&` binds tighter than `||`, so the `data-config` class (JSON, XML, SQL, `managed-schema`) is excluded from the source total *except* for `pom.xml`. This is load-bearing for PeelAndSlice.Java, whose total is 22 rather than 21 because of it, and it drops Conifer's 5 data-config files (2,185 non-blank lines), monarch-legacy's 16 (5,668) and codemirror5's `package.json`. Appendix B's summary of the method ("what remains is code, stylesheets, templates, shell and Dockerfiles, and configuration") is looser than the script on this point and should be tightened to say that JSON/XML data and schema files are excluded, `pom.xml` aside.

## Measurement sources

| Target | Commit | Repository measured |
| --- | --- | --- |
| codemirror5 | `6e708583` | [`projects/codemirror5`](../projects/codemirror5) (R10/D02 base) |
| Conifer | `c406b480` | [`projects/conifer`](../projects/conifer) (R11/C03/D03 base) |
| tv-radio | `c094824` | [`projects/tv-radio`](../projects/tv-radio) |
| monarch-legacy | `e337d87` | fresh clone of `monarch-initiative/monarch-legacy` (D5/R13 base) |
| PeelAndSlice.Java | `161e0cd` | fresh clone of `jason-kerney/PeelAndSlice.Java` |
| coderetreat | `0347363` | fresh clone of `tonytvo/coderetreat` (identified 12 Oct 2026 from the run artefacts' paths; commit `03473638`, "add node_modules to ignore list", 3 Apr 2022) |

Note that monarch-legacy has two original commits in this corpus: this measurement is at `e337d87` (the pipeline and raw Codex base, D5/R13), while [B00](B00-pre-upgrade-baselines.md) and [C5](C05-claude-code-monarch-legacy.md) are based on `e33024b1`.

## Published figures, re-derived

| Target | Total source files | Total source LOC | Main code files | Code LOC | Raw blobs |
| --- | --- | --- | --- | --- | --- |
| PeelAndSlice.Java | 22 | 510 | 16 | 353 | 29 |
| coderetreat | 91 | 2,508 | 58 | 1,869 | 225 |
| codemirror5 | 562 | 84,275 | 298 | 56,798 | 590 |
| monarch-legacy | 266 | 48,087 | 108 | 30,772 | 589 |
| tv-radio | 272 | 58,905 | 153 | 42,257 | 654 |
| Conifer | 603 | 58,874 | 414 | 45,464 | 833 |

All ten originally published cells reproduce exactly. coderetreat was published as "not measured" and is measured here for the first time; Table 6 in the report was updated with its figures on 12 Oct 2026. The raw blob counts in the report's Appendix B are 29, 590, 589, **659** and **834**: the two differences are the symlink/submodule filter Appendix B already flags (one on Conifer, five on tv-radio), where a GitHub trees-API `type == "blob"` filter counts symbolic links while excluding submodule entries and `gitcount.py` does the opposite.

## Full per-class breakdown

Files / total lines / non-blank lines. The source total is the classes above each rule, plus `pom.xml` where present; rows below the rule are excluded.

**codemirror5 `6e708583`** — 590 blobs

| Class | Files | Total | Non-blank |
| --- | --- | --- | --- |
| code | 298 | 63,392 | 56,798 |
| style | 79 | 4,522 | 3,837 |
| markup | 183 | 27,637 | 23,631 |
| infra | 1 | 6 | 6 |
| config | 1 | 3 | 3 |
| **source total** | **562** | **95,560** | **84,275** |
| data-config | 1 | 52 | 52 |
| docs | 4 | 2,519 | 1,492 |
| asset/data | 13 | 1,329 | 1,303 |
| vendored | 3 | 409 | 370 |
| agent-material | 7 | 632 | 470 |

**Conifer `c406b480`** — 833 blobs

| Class | Files | Total | Non-blank |
| --- | --- | --- | --- |
| code | 414 | 57,691 | 45,464 |
| style | 86 | 9,810 | 8,186 |
| markup | 67 | 3,681 | 3,152 |
| infra | 14 | 199 | 130 |
| config | 22 | 2,416 | 1,942 |
| **source total** | **603** | **73,797** | **58,874** |
| data-config | 5 | 2,500 | 2,185 |
| docs | 2 | 294 | 160 |
| asset/data | 186 | 101,308 | 99,991 |
| vendored | 37 | 27,164 | 24,395 |

**tv-radio `c094824`** — 654 blobs

| Class | Files | Total | Non-blank |
| --- | --- | --- | --- |
| code | 153 | 55,380 | 42,257 |
| style | 26 | 8,934 | 8,200 |
| markup | 92 | 9,960 | 8,443 |
| infra | 1 | 6 | 5 |
| **source total** | **272** | **74,280** | **58,905** |
| data-config | 23 | 2,747 | 2,490 |
| asset/data | 297 | 200,776 | 199,543 |
| vendored | 61 | 249,593 | 215,037 |
| generated | 1 | 29,694 | 29,570 |

**monarch-legacy `e337d87`** — 589 blobs

| Class | Files | Total | Non-blank |
| --- | --- | --- | --- |
| code | 108 | 35,366 | 30,772 |
| style | 21 | 3,073 | 2,590 |
| markup | 79 | 8,740 | 7,861 |
| infra | 10 | 261 | 205 |
| config | 48 | 7,602 | 6,659 |
| **source total** | **266** | **55,042** | **48,087** |
| data-config | 16 | 5,704 | 5,668 |
| docs | 15 | 1,255 | 812 |
| asset/data | 253 | 106,760 | 104,627 |
| vendored | 6 | 4,930 | 4,783 |
| generated | 33 | 33 | 33 |

**PeelAndSlice.Java `161e0cd`** — 29 blobs

| Class | Files | Total | Non-blank |
| --- | --- | --- | --- |
| code | 16 | 402 | 353 |
| infra | 2 | 27 | 18 |
| config | 3 | 86 | 78 |
| `pom.xml` (1 of 3 data-config) | 1 | 64 | 61 |
| **source total** | **22** | **579** | **510** |
| data-config (the other 2) | 2 | 22 | 22 |
| docs | 2 | 79 | 62 |
| asset/data | 3 | 56 | 48 |

**coderetreat `0347363`** — 225 blobs

| Class | Files | Total | Non-blank |
| --- | --- | --- | --- |
| code | 58 | 2,300 | 1,869 |
| config | 33 | 766 | 639 |
| **source total** | **91** | **3,066** | **2,508** |
| data-config | 2 | 51 | 51 |
| docs | 27 | 622 | 395 |
| asset/data | 13 | 96,761 | 96,708 |
| vendored | 50 | 19,120 | 18,562 |
| generated | 42 | 4,311 | 4,310 |

Its 33 `config` files are the 22 `build.gradle` and 11 `settings.gradle` scripts; the 50 vendored files are 12 `gradle-wrapper.jar`, 12 `gradle-wrapper.properties`, 12 `gradlew`, 12 `gradlew.bat` and 2 lockfiles; the 42 generated files are the checked-in Eclipse metrics report under `refactoring/trivia/java/Metrics` (32 HTML, 10 JPG). The 22/11/12 counts corroborate the "12 wrappers, 22 build scripts, 1 package.json" and "12 build roots" cells the report already carried for this target from the run artefacts.

### Two rules added for coderetreat

`classify4.awk` needed two exclusions it had never met before, both of which follow the intent of rules already in it:

1. `gradlew` and `gradlew.bat` are classified vendored. They are the same Gradle wrapper as `gradle/wrapper/`, which was already excluded; leaving them in would have added 24 files and 2,812 lines of third-party launcher script.
2. `refactoring/trivia/java/Metrics/` is classified generated. It is a checked-in Eclipse metrics report (32 HTML files, 1,454 lines), the coderetreat analogue of `lib/codemirror.js` and the `cache/` dump already excluded by name.

Without them the figure would be 147 files / 6,774 LOC, which is not comparable with the other five targets. All five previously published targets were re-run after the change and are byte-identical to the figures above, as the two rules match no path in any of them.

## Corrections this implies for the report

1. **Appendix B's exclusion list should name the data-config exclusion** (JSON/XML/SQL/schema out, `pom.xml` in), as above.
2. **The per-target original commits are no longer stated anywhere in the report.** The version of Table 6 that was first inserted carried an "Original commit" row (`161e0cd`, `0347363`, `6e70858`, `e337d87`, `c094824`, `c406b48`); a later edit renamed the rows from "First-party source" to "Total source" and dropped that row, and Table 5 never had it. Appendix B's claim that the figures were taken "at each target's original commit" is therefore not checkable from the report as it stands. Restore the row, or state the commits in Appendix B.
3. **"Total source" is a misleading label** for a figure that excludes vendored, generated, asset, documentation and JSON/XML files. "First-party source", the original label, described it correctly.
4. **coderetreat is no longer unmeasured.** Its column was filled on 12 Oct 2026 (91 / 2,508, code 58 / 1,869), Appendix B's exclusion list was extended with the Gradle-launcher and Eclipse-metrics rules, its raw blob list gained coderetreat 225, and the six commits measured are now named there. Corrections 1 and 2 above are therefore applied in the live document; 3 and 4 are not.
5. **monarch-legacy's `e337d87` basis should be stated in the table**, since B00 and C5 measure a different original commit (`e33024b1`) and the row is read against both elsewhere.

## Environment

Windows 11, Python 3.13, git, GNU awk, on the same machine as the runs. Measurement is read-only against the object store: no checkout, worktree or install is performed, and the target repositories' working trees are untouched.
