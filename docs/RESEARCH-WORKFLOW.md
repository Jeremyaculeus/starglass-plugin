# Research with StarGlass

StarGlass supplies read-only public-record acquisition and exposed mechanical
checks. Your Claude, ChatGPT, or Codex host performs the investigation, meaning,
synthesis, and skeptical review using your existing host account. The service does
not call model APIs or Parallel. Host reasoning and agent tokens are intended to
produce a thorough answer; short prompts and small result pages are not quality
goals.

Use the [starglass-research skill](../plugin/skills/starglass-research/SKILL.md)
when your host loads it. A custom MCP connection alone does not prove that a host
loaded the skill. You can also give the host this workflow and its linked resources.

## A research request

> Use StarGlass and your available authorized host tools to investigate this
> question. Frame the subject, stable entity identifiers, period, requested
> figures, rival explanations, and source coverage before searching. Acquire and
> inspect relevant records iteratively; paginate to the completeness required by
> the question. Keep a host-owned evidence bundle, challenge the draft with a
> native subagent if available or a disclosed same-model separate pass, and run
> the exposed mechanical evidence check before labeling figures confirmed. Repair
> issues and report conclusions, citations, actual review/check results, and gaps.

Append your actual question, period, entities, and any authorized local documents.
Do not send confidential search terms to upstream sources without authorization.

## What the host should deliver

The [research loop](../plugin/skills/starglass-research/references/research-loop.md)
defines framing, purposeful multi-source acquisition, evidence interpretation,
gap closure, full-context synthesis, review, and repair. Sources are selected for
the question; no fixed number of sources or results establishes completeness.

A [portable evidence bundle](../plugin/skills/starglass-research/references/evidence-bundle.md)
contains the case frame, source manifest and captured passages, claims ledger,
search/coverage log, skeptical review, mechanical check responses, and report.
Save it only in an authorized host location. If file tools are absent, keep the
same structured record in chat or a supported export. StarGlass does not create
a mandatory hosted Case or save a background research archive.

Every material claim should identify its evidence, entity, date basis, and scope.
Federal transaction obligations, cumulative award values, and actual payments are
different measures. NPPES reported officials and addresses do not establish
ownership. Discovery metadata does not replace acquired source context.

For organization audits, tax returns, board documents, state records, PDFs, or
user files outside the adapters, use available authorized host tools and retain
their actual provenance. Disclose missing text, OCR errors, or unreadable pages.
Never attach an invented StarGlass receipt to those records.

## Availability and limits

Inspect actual tool schemas and call `sources_list`. Older hosts may still expose
only the three acquisition tools. Do not claim new filters, pagination modes, or
`evidence_check` until the schema is visible. Useful research can continue with
explicit limitations, but an absent check cannot support a confirmed figure label.
Mechanical consistency is a required evidence floor, not a semantic truth verdict.
The host still decides whether the record concerns the right entity and answers
the question.

[Host compatibility](../plugin/skills/starglass-research/references/host-compatibility.md)
describes current primary documentation and fallbacks. Claude Code native subagents
can review in a separate context when available. ChatGPT tool access, agent mode,
custom MCP availability, skill loading, and file/delegation capabilities vary;
this workflow does not promise capabilities absent from the current session.

The final answer should state the review method, actual mechanical check result,
completed coverage, contradictory evidence, blocked or unexamined records, and
what would change the conclusion. Quota or host limits justify a partial report
with gaps, never a silent quality cut or a claim that incomplete searches prove
absence.
