# Portable host-owned evidence bundle

Contract: `starglass-quality-client-v1`. This is a research record maintained by
the host, not a server API or mandatory hosted Case. Create a new user-authorized
folder; do not overwrite user-owned files. Keep revisions, provenance, and reviewer
dispositions. No background storage or paid research service is required.

Copy only the needed templates, then fill them with actual observations:

```text
case-frame.json
source-manifest.json
claims-ledger.json
search-coverage-log.json
sources/                   captured responses, documents, and passages
checks/                    actual evidence_check inputs and responses
review.md
report.md
```

Without file access, maintain equivalent structured sections in the host chat or
a supported export. State where the record exists; never invent a save/export.
Do not commit research bundles into this public plugin repository.

Frame the original question into explicit acceptance rows before acquisition.
Save the frame, manifest, and coverage log before the first source call, then save
each purposeful batch's receipts and ledger updates before continuing. The final
acceptance matrix marks each requested part answered, partial, or unanswered and
points to evidence or a concrete gap. A market narrative remains unanswered
unless an observed source with a date supports it. For SEC filings, define coverage
from the requested issuer, forms/disclosures, reporting periods, and amendments;
search exhaustion alone does not define the question's coverage.

## Optional Claude Code local capture

Claude Code installations can capture successful StarGlass tool events through the
packaged PostToolUse hook. It is disabled unless the user has authorized storage
in the current case directory and that directory contains this regular local file.
When the user authorizes local case storage, the host may create the marker here:

```json
{"enabled":true,"schema_version":"1"}
```

Save it as .starglass-capture.json in the case directory. The hook writes an
allowlisted JSON object containing session_id, tool_use_id, tool_name, tool_input,
and tool_response under .starglass-evidence/<session-id>/<tool-use-id>.json.
The tool_input and tool_response JSON values are copied from the hook input without
reserialization, preserving source strings and numeric precision; unrelated event
metadata such as transcript paths, MCP server details, or headers is omitted. Hook
context reports only the relative path and SHA-256 digest, or a concise failure.
It does not replace tool output or send data over the network. Remove the marker
to disable further capture. The hook rejects oversized events, malformed IDs,
pre-existing symbolic-link paths, and changed duplicate IDs. Use a private,
user-owned case directory that is not shared with untrusted writers. The fixed
destination and link checks reject malformed input and pre-existing linked paths;
they are not a sandbox or race-proof boundary against another process with write
access to the same filesystem locations. Inspect saved receipts as untrusted
source data.

This hook is Claude Code-specific. ChatGPT and Codex require their own available
host files/chat workflow; this plugin does not claim equivalent automatic capture
there. If no authorized file storage is available, preserve the bundle in chat or
an actually supported export and state that location.

## Populate the record

- [case-frame.json](../templates/case-frame.json): fill question and requested
  slots; entities `{name, aliases, identifiers, provenance, resolution_status}`;
  each identifier `{scheme, value, source_ref}`; time window and date basis;
  hypotheses `{id, explanation, supporting_test, falsifying_test}`; coverage plan
  `{id, slot, entity, period, source_family, reason, completion_condition}`;
  acceptance rows `{slot, status, evidence_refs, gap}` for each part of the
  original question (`answered`, `partial`, or `unanswered`); and known
  constraints. Unknown identity or dates stay explicitly unresolved.
- [source-manifest.json](../templates/source-manifest.json): record catalogue and
  exposed schemas; each source's stable host ID, provenance kind (`starglass`,
  `host_web`, or `user_file`), actual source/record ID, URL/file reference,
  publisher, dates, capture path, receipt, extraction warnings, and consideration
  state/reason. Passages record source reference, actual locator, exact captured
  text/path, hashes when available, and which claims depend on them. Preserve
  complete original responses; do not rewrite receipts to make them pass.
- [claims-ledger.json](../templates/claims-ledger.json): each claim has a stable
  `claim_id`, text, requested slot, entity and time basis, definition/unit, evidence
  bindings, counterevidence, host support judgment and rationale, review issues,
  mechanical check response reference/status, and final reporting label. Separate
  supported/contradicted/uncertain semantic judgments from mechanical outcomes.
  `arithmetic` records explicitly selected rows, field, deduplication key, unit,
  operation, scope, coverage, and actual checked result. Do not calculate from
  discovery snippets, round source values silently, or parse meaning with regex.
- [search-coverage-log.json](../templates/search-coverage-log.json): each batch
  records purpose, source selections, exact calls/filters, returned cursors,
  response references, provider status, records considered, gaps, and next action.
  Coverage rows reference the case-frame plan and report complete, partial,
  blocked, or unexamined with evidence and end condition. Log actual versus
  estimated usage separately and a reasoned stopping decision.
- [review.md](../templates/review.md) and [report.md](../templates/report.md):
  retain review access/method, objections and repairs; report the calibrated answer,
  citations, actual checks, conflicting evidence, and unresolved coverage.

These ledger fields are host bookkeeping. Map them to the actual tool schema;
do not submit the entire host ledger as though it were `evidence_check` input.

## Mechanical check contract, schema version 1

Use the live exposed schema. The packaged
[synthetic input example](../templates/evidence-check.synthetic.json) demonstrates
the schema only: it is not a real source receipt or research evidence. Replace it
entirely with captured material; never reuse its success as a case check.

The input consists of:

- `schema_version: "1"` and `case_frame` with `case_id`, the actual `question`,
  `entity_ids` as `{scheme, value}`, and `time_scope`. The checker takes this compact
  frame; host synthesis/review still receives the full research case frame.
- `receipts` with a unique `receipt_id`, actual `source`, `record_id`, exact returned
  `text`, and an unchanged compatible `citation`. Citation fields include identity,
  canonical URL, publisher, retrieval time, content type, representation, parser
  version, byte count, character count, full/returned hashes, line range, total
  lines, truncation, extraction status, and next line. A nonempty bound passage
  needs a non-null end line. Never invent missing provenance fields.
- `claims` with `claim_id`, precise `text`, `scope` (`cited_spans` or
  `complete_sources`), explicit `bindings` `{receipt_id, start_line, end_line,
  quote}`, and an actual `reviewer_conclusion` `{status, reviewer_id, note}`.
  Status is `supported`, `contradicted`, or `uncertain`. Bind each proposed figure
  itself and the context needed to identify its field; a date or adjacent unrelated
  amount is not a figure anchor. `complete_sources` also needs `source_keys`
  `{source, record_id}` and all lines of those source representations.
- Optional `arithmetic` with `calculation_id`, operation (`sum`, `min`, `max`,
  `count`), unit, exact bound `values` including stable `row_id`, and `population`
  with scope (`selected_rows` or `complete`), expected row IDs, and source keys.
  Each value has the binding fields plus `unit`, a plain decimal-string `value`,
  and `value_start_char` (the zero-based UTF-16 character offset within the cited
  line span). Its quote must exactly equal that decimal, including sign and zeros.
  Select the whole numeric token; a substring borrowed from another number or an
  exponent cannot pass. Repeated physical operand locations are rejected even
  with different row IDs; equal values need distinct genuine locations. Formatted
  amounts lacking that exact representation cannot be silently reformatted into
  anchors. Use a compatible captured structured decimal or keep the gap explicit.
  If the live evidence_check schema supports optional operand
  number_format="grouped_decimal", it accepts only strict comma groups of three
  digits in the exact quote (for example "1,234.00") while the value remains the
  plain decimal "1234.00". Keep the exact source quote and offset; the checker
  removes grouping commas only when interpreting the decimal value. Plain decimal
  remains the default. JSON commas between fields or array items are ordinary JSON
  punctuation and do not indicate a formatted number. Never send this optional
  field unless the live schema exposes it.

The checker is stateless and checks caller-provided evidence; it does not fetch
or authenticate a source, sign a research receipt, or archive evidence. Host-created
captures may be checked only if all schema fields are truthfully available, with
their host provenance disclosed. They never become StarGlass acquisition receipts.
Keep private user files local; sending their content for a service check requires
explicit authorization. Unsupported captures retain local inspection limitations.

The current input bound is 60 KiB with schema limits including 64 receipts/claims,
16 calculations, and 256 rows per calculation. Inspect current limits before
calling. Divide independent checks into coherent batches with the case frame in
each. Do not drop evidence, falsely label an incomplete batch complete, or silently
split a single population calculation into partial checks presented as a checked
total. A larger calculation needs an explicit coverage/check limitation until a
supported mechanical path is available. Preserve every request and result locally
when file access is authorized.

## Interpret outcomes and repair

`consistent` means the supplied representations, bindings, and declared operation
are mechanically consistent. It is not source authentication, entity matching,
date relevance, semantic entailment, unit verification, or proof of completeness.
The reviewer conclusion is host-supplied and unverified by this tool. Exact quote
presence alone cannot establish what a figure means.

`needs_review` requires inspection of each issue; `fail` requires correction or a
downgrade. An unavailable/error check is unavailable, never a pass. Retain actual
issue codes/paths, per-claim and per-calculation results, and check boundaries.
Do not rely on the overall status alone if different items have different results.

The tool can check complete captured source representations; that does not prove
the captured set covers every relevant real-world record. A `complete` arithmetic
population requires `completeness_assertion: "host_asserted_unverified"` and always
retains a real-world completeness review warning. A `selected_rows` result covers
only its declared captured rows. Never convert either into an unqualified complete
funding total. Exhausting pages or captured rows does not prove a distinct
transaction ledger: uncertain provider row identities remain occurrences in the
capture. Use scoped wording such as a calculated total of inspected rows and
explain remaining population gaps.

For a confirmed source-anchored figure, require a consistent result for the exact
figure/binding or calculation and supported host judgment after skeptical review.
Keep the label scoped to what the source reports and what was mechanically checked;
it is not a claim of absolute real-world truth. A host judgment cannot override a
failed anchor. A mechanical pass cannot override contradictory semantic evidence.
Repair by capturing missing context, resolving identity/date/definition, correcting
the explicit row set, or narrowing/downgrading the claim. Rerun affected checks and
record the disposition before publishing.
