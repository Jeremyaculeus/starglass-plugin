# Research with StarGlass

StarGlass supplies read-only public-record acquisition and exposed mechanical
checks. Your Claude, ChatGPT, or Codex host performs the investigation, meaning,
synthesis, and skeptical review using your existing host account. The service does
not call model APIs or Parallel. Host reasoning and agent tokens are intended to
produce a thorough answer; short prompts and small result pages are not quality
goals.

Use the [starglass-research skill](../plugin/skills/starglass-research/SKILL.md)
when your host loads it. A custom MCP connection alone does not prove that a host
loaded the skill. MCP server 0.3.5 and later advertise protocol 0.2.5 through
initialization instructions and `sources_list`, including the same adaptive
intake policy for skill-free hosts. Client package 0.3.0 is a separate version.
Installing it does not prove that the server is updated or that a host follows
the policy. You can also give the host this workflow and its linked resources.

## Start an investigation

Invoking StarGlass tells the host to start adaptive intake; you do not need to
ask for "deep research" or paste a procedure.

- **Claude Code:** `/starglass-research:investigate <question>`, or invoke the
  skill with `/starglass-research:starglass-research <question>`. Claude may also
  load the skill itself for a public-record research request. Pass a saved case
  folder to the command to resume an approved case without repeating intake; the
  host is instructed to confirm the next action with you before new acquisition.
- **Codex:** `$starglass-research <question>` after installing the skill. If you
  installed it before 0.3.0, run `npx skills update starglass-research` (or
  re-run the `npx skills add` command), then start a new session.
- **Other MCP clients:** the `investigate` MCP prompt ships with MCP server
  0.3.6. It must be deployed to aculeus.ai before use; a client package release
  does not deploy it. Until then, and in hosts that do not list MCP prompts, use
  the request below.

In the instructed first reply the host restates the question, inspects the tool
schemas and `sources_list` catalogue, then either asks the single most
consequential missing decision or shows the compact Case Plan and asks "Proceed
with this plan, or change anything?" The instructions make source searches and
fetches wait for your approval of the plan you have seen; a question or change
returns to the plan. Invocation is not approval of a plan, permission for private
data or permission for long acquisition. Only a request for one or two fields of
one named record or identifier, or an explicit quick lookup that stays within one
record or one source family, takes the bounded-lookup path; a quick request that
needs multi-source or multi-page acquisition still gets the plan. These are
instructions to the host; no native host test of this start flow is claimed yet.
This is host-led research in your own AI host; hosted Aculeus Deep Research is a
separate product and is not included in the USD 49 plan.

## A research request

For hosts without the skill or the server prompt, paste this request:

> Use StarGlass and your available authorized host tools to investigate this
> question. Read what I have already answered. Before long research, ask brief
> follow-up rounds for material missing decisions, accept "I don't know", and
> separate researchable unknowns from optional preferences. Harden my question
> neutrally, preserving every requested part. Show an editable Case Plan covering
> entities, dates, measures, sources, counterevidence, acceptance criteria,
> resources, stopping conditions and review, then ask me whether to proceed.
> After my decision, acquire and
> inspect relevant records iteratively; paginate to the completeness required by
> the question. Keep a host-owned evidence bundle, challenge the draft with a
> native subagent if available or a disclosed same-model separate pass, and run
> the exposed mechanical evidence check before labeling figures confirmed. Repair
> issues and report conclusions, citations, actual review/check results, and gaps.

Append your actual question, period, entities, and any authorized local documents.
Do not send confidential search terms to upstream sources without authorization.

See [adaptive intake and Case Plan](../plugin/skills/starglass-research/references/research-intake.md)
for the conversation loop, bounded identity resolution, neutral prompt hardening
and actual user start decision. A fully specified request needs no invented
questions. "Go ahead" ends optional intake; approval applies only to a plan the
user has seen and does not authorize private-data disclosure. Simple bounded
lookups do not require long-research ceremony. Saved approved frames carry the
answers and start decision across context resets.

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
Save the frame, manifest, and original-question acceptance matrix before
acquisition; update receipts and coverage after every purposeful batch. Claude
Code offers optional local PostToolUse capture, disabled unless the user
authorizes the case directory and creates its marker. This plugin does not
provide automatic capture for ChatGPT or Codex; disclose each host's actual file
and chat capabilities.

Every material claim should identify its evidence, entity, date basis, and scope.
Federal transaction obligations, cumulative award values, and actual payments are
different measures. NPPES reported officials and addresses do not establish
ownership. Discovery metadata does not replace acquired source context.

For organization audits, tax returns, board documents, state records, PDFs, or
user files outside the adapters, use available authorized host tools and retain
their actual provenance. Disclose missing text, OCR errors, or unreadable pages.
Never attach an invented StarGlass receipt to those records.

## Continue an interrupted investigation

Keep a short continuation note with completed questions, unresolved claims,
review issues, and the next action alongside the evidence bundle. If the host
reaches a context limit, start a fresh conversation from that same case's saved
frame, note, and relevant evidence files. The host should read bounded sections
and reuse successful acquisitions while preserving the original scope, dates,
source versions, and gaps. The [recovery procedure](../plugin/skills/starglass-research/references/research-loop.md#continue-after-a-context-or-session-limit)
keeps exact evidence available without replaying the entire conversation.
Wait for a subscription allowance to reset before continuing; StarGlass does
not bypass host limits. If the files are unavailable, report the missing
continuity and any affected conclusions.

## Availability and limits

Inspect actual tool schemas and call `sources_list`. Older hosts may still expose
only the three acquisition tools. Do not claim new filters, pagination modes, or
`evidence_check` until the schema is visible. Useful research can continue with
explicit limitations, but an absent check cannot support a confirmed figure label.
Mechanical consistency is a required evidence floor, not a semantic truth verdict.
The host still decides whether the record concerns the right entity and answers
the question.

[Host compatibility](../plugin/skills/starglass-research/references/host-compatibility.md)
describes current primary documentation and fallbacks. In Claude Code, the
plugin's `starglass-research:starglass-reviewer` subagent reviews in a separate
context with the session's model; a separate context is not a different model. ChatGPT tool access, agent mode,
custom MCP availability, skill loading, and file/delegation capabilities vary;
this workflow does not promise capabilities absent from the current session.

The final answer should state the review method, actual mechanical check result,
completed coverage, contradictory evidence, blocked or unexamined records, and
what would change the conclusion. Quota or host limits justify a partial report
with gaps, never a silent quality cut or a claim that incomplete searches prove
absence.
Mark every original-question acceptance row answered, partial, or unanswered.
Support market narratives with observed dated sources or leave them unanswered.
Define requested filing coverage explicitly; exhausted pages and captured rows do
not establish a complete or distinct transaction ledger. Synchronize the final
claims ledger with the report.
