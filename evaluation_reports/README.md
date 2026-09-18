# Evaluation reports

One report per chat in `refactored_chats/`, scored against the metrics framework (compilation and testing effectiveness, generated-test quality, behaviour preservation, cost and efficiency, LLM configuration, ablation). `00-overview.md` combines the ten runs and holds the cross-run tables; an online copy is at https://claude.ai/code/artifact/ab89e6e2-f20c-4d18-b147-f35dba010a07.

| Report | Chat | Date | Target | Pipeline verdict | C | T (declared / extended) | BPR | Cost (US$) | Wall (min) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [R01](R01-190626_run.md) | `190626_run.md` | 19 Jun | tv-radio, all packages | approved 0.82 | 0 | 0 / 0 | 0.11 | 9.62 | 56 |
| [R02](R02-230626_run.md) | `230626_run.md` | 23 Jun | tv-radio frontend only | approved 0.86 | 1 | 1 / 0 | 0.75 | 12.16 | 98 |
| [R03](R03-260626_run.md) | `260626_run.md` | 26 Jun | tv-radio, all packages | rejected 0.78 | 1 | 0 / 0 | 0.50 | 12.11 | 42 |
| [R04](R04-290626_run.md) | `290626_run.md` | 29 Jun | tv-radio, all packages | approved 0.86 | 1 | 1 / 0 | 0.50 | 19.45 | 90 |
| [R05](R05-130726_run.md) | `130726_run.md` | 13 Jul | tv-radio, all packages | rejected 0.82 | 1 | 1 / 0 | 0.60 | 13.13 | 73 |
| [R06](R06-010826.md) | `010826.md` | 1 Aug | tv-radio plus Solr | execution failed | 0 | 0 / 0 | 0.13 | 10.45 | 72 |
| [R07](R07-020826.md) | `020826.md` | 2 Aug | tv-radio plus Solr | rejected 0.62 | 1 | 0 / 0 | 0.36 | 11.61 | 70 |
| [R08](R08-050826.md) | `050826.md` | 5 Aug | tv-radio plus Solr and vendored libs | rejected 0.78 | 1 | 0 / 0 | 0.46 | 22.91 | 136 |
| [R09](R09-100826.md) | `100826.md` | 10 Aug | tv-radio plus Solr, explicit sweeps | rejected 0.42 | 1 | 0 / 0 | 0.75 | 17.00 | 99 |
| [R10](R10-codemirror-refactor.md) | `codemirror-refactor.md` | 14 Sep | codemirror5 toolchain | execution failed | 1 | 0 / 0 | 0.50 | 7.52 | 45 |
| Aggregate | | | | 3 approved | CSR 0.80 | TSR 0.25 / 0; FBSR 0.20 / 0 | 0.48 (MBR 0.52, EBER 0, NBR 0.06) | 135.96 total, 12.13 median | 72.5 median |

Column notes: C is install-and-boot verified on 18 Sep 2026 by checking out each commit; T (declared) uses the checks the user asked for in that run, T (extended) adds the faults the user found straight afterwards; BPR is the share of observed reference behaviours preserved (13 tv-radio behaviours, 2 for CodeMirror); cost is all Codex threads at GPT-5.5 list prices; wall time is the main Codex thread including approval waits.

Each report has the same sections: identification, 1.1 build effectiveness, 1.2 generated tests, 1.3 behaviour preservation, 1.4 cost and efficiency, 1.5 LLM configuration, stage outcomes, what was broken afterwards, run-specific recommendations. Evidence sources and verification methods are described in the overview's appendix.
