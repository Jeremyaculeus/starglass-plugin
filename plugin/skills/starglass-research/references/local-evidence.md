# Local evidence companion

The research host owns the mechanics; the person chooses the question, scope,
material ambiguities and consent. Do not ask the person to maintain receipt IDs,
count offsets, format checker JSON or decide arbitrary batch sizes.

Node.js 18+ runs the dependency-free companion included **inside this skill**:

```sh
node <installed-skill>/scripts/evidence.js status
node <installed-skill>/scripts/evidence.js index < request.json
node <installed-skill>/scripts/evidence.js assemble < request.json
node <installed-skill>/scripts/evidence.js next < request.json
```

These commands read stdin and write stdout only. They never acquire sources,
connect/authenticate MCP, modify access, create files, enable capture, or send
anything to the network. `status` reads only the case-local capture marker. It
reports MCP connection, authentication and host skill activation as `not_checked`.
A website cannot detect those external states. In the actual research host,
inspect exposed tool schemas and call `sources_list`; only that observed result
supports a connection report. If tools or authentication are missing, follow
https://aculeus.ai/connect for that specific gap. Do not repeat working steps,
create credentials or infer trial/access/entitlement from installation.

The CLI is intended for host automation, not user homework. A host can use the
JavaScript API directly to avoid intermediate request files:

```js
const { EvidenceSession } = require('<installed-skill>/scripts/evidence');
const evidence = new EvidenceSession();
const index = evidence.ingest(originalResponseBuffer);
const prepared = evidence.assemble(plan);
```

`ingest` accepts raw UTF-8 bytes from a successful `source_fetch` response, its
MCP text/structuredContent envelope, or the existing opt-in capture envelope.
It also indexes actual `source_search.acquired_records` passages, never discovery
snippets. Invalid, oversized, duplicate-key or conflicting envelope input is
rejected, not repaired. IDs are deterministic raw SHA-256 plus record position.
`index()` returns those IDs with source, record, line range and capture/hash
metadata. `raw(hash)` returns a copy of the original bytes; originals and indexed
receipts are retained in memory only and callers cannot mutate stored copies.
The original capture hook and its user-authorized opt-in remain unchanged.

Each CLI request contains `receipts`, an array of strings containing the original
receipt JSON without parsing/reserializing it. `assemble` also takes `plan`:

```json
{
  "case_frame": {
    "case_id": "example",
    "question": "What does the selected synthetic record report?",
    "entity_ids": [],
    "time_scope": "synthetic demonstration"
  },
  "claims": [{
    "claim_id": "claim-1",
    "text": "The synthetic record reports 0.20.",
    "scope": "cited_spans",
    "bindings": [{
      "receipt_id": "<ID from index>",
      "start_line": 1,
      "end_line": 1,
      "quote": "0.20"
    }]
  }]
}
```

The host supplies evidence selections and substantive judgment. The helper does
not select evidence semantically or manufacture reviewer conclusions. Claims use
the existing checker fields. Bindings select exact text within explicit lines;
if the same quote occurs more than once, supply a one-based `occurrence` after
inspecting the source. Ambiguous selections fail instead of choosing the first.

Optional `arithmetic` uses the existing checker calculation/population fields.
Each `values` entry supplies a selection plus `row_id` and `unit`, **not** `value`
or `value_start_char`. The helper derives the decimal string and exact zero-based
UTF-16 offset, preserving signs, indentation, newlines and decimal zeros. Strict
comma grouping requires explicit `number_format: "grouped_decimal"`, and may be
sent only if the live schema exposes that option. It rejects numeric substrings,
exponents and ambiguous token boundaries. It does not infer units, row identity,
semantic relevance, real-world population completeness or approval.

`assemble` returns `batches`, `unused_receipt_ids`, and the boundary statement.
Every known passage for a used source is included. Claims/calculations connected
through source dependencies stay together, including all source pages, so batch
splitting cannot conceal representation conflicts. Independent components pack
under the 60 KiB UTF-8, 10,000-element and v1 count/type limits. One oversized
component or calculation fails whole preparation; no rows are dropped and no
partial sums are presented as a total. A calculation needs a source-connected
claim because the server requires at least one claim. Inspect unused IDs as a
coverage signal; they are not evidence of irrelevance. No overall check result is
invented or combined across batches.

Run **every** prepared batch through the exposed `evidence_check` and retain its
actual per-item diagnostics under existing storage consent. Preparation is not a
check pass. Consistency is not authenticity, identity/date relevance, semantic
entailment, unit verification or proof of real-world completeness. The server
remains authoritative for the live schema and mechanical results. Host-created
receipts remain host provenance, never authenticated Starglass acquisitions.

## Prepare the next page

Use `nextRequest(originalResponseBuffer, originalContext)` from the same module
or CLI `next` with `{"receipt":"<original receipt JSON>","context":{...}}`.
Context is `{tool_name: "source_fetch" | "source_search", tool_input: originalArguments}`.
Existing capture envelopes already include that context; omit the extra context
for them. Conflicting contexts fail. Keep the original, validated request rather
than rebuilding its scope from memory. Non-normalized arguments are refused,
not silently trimmed. No request is sent and no receipt/index is modified.

For fetches, the helper validates source, record, returned text, line metadata
and original window. It advances only `start_line` to the observed
`citation.next_start_line`, preserving `max_lines` and every other argument.
It refuses empty/nonadvancing passages and a continuation outside the server's
10,000-line request bound. It does not invent or follow a different record ID.

For searches, it requires the original request plus matching returned
source/query/mode and coverage filters/limit/cursor. It preserves the exact
request and replaces only `cursor`. Omitted fields remain omitted; no mode,
filters or page size are guessed. A repeated cursor is blocked. The helper does
not decode/rewrite opaque cursors or automatically retry a request.

Outcomes are `ready` with a prepared `request`, `no_more` with no request when
a null continuation is actually observed, or `blocked` with a reason and no
request. Missing cursor support/context is blocked, not exhaustion. A null
search cursor accompanied by truncation, partial status or provider-more is a
coverage limit; a fetch ending in partial extraction stays blocked. Even
`no_more` means only that this response advertises no next page, never that
real-world coverage is complete. The host retains plan approval, allowances,
material scope choices, stopping rules and manual recovery.

## Recovery and host limits

If Node, the helper, files or a supported capture shape are unavailable, disclose
the limit and use the existing file/chat bundle workflow. Do not invent a saved
receipt, connection or successful check. Preserve raw outputs; do not rewrite
source text or hashes to satisfy validation. A changed source representation or
oversized connected group needs an explicit coverage/check limitation or an
explicit revised scope, not silently omitted pages. A user may still inspect and
supply a manual bundle. Keep consent, review, plan decisions and manual override
in the host workflow; the helper does not change them.

No new persistence is enabled by this companion. Existing capture writes only
when the user enabled `.starglass-capture.json`; removing it disables future
capture. Without authorized local storage keep the record in the host's actual
chat/export capability. Never commit research data to this public repository.

## Development verification

Run `node --test plugin/test/*.test.js` from the repository root. Tests use only
synthetic data and verify behavior, not a model's compliance with skill prose.
The portable validator mirrors Aculeus `lib/plugin-research/evidence.ts` v1;
recheck against that schema when server constraints change. Node deliberately
rejects unsafe integer metadata rather than rounding it. These tests do not
claim fresh native-host installation, OAuth renewal or production source checks.

For optional cross-repository checks, set `STARGLASS_BACKEND_EVIDENCE` to the
pinned server `lib/plugin-research/evidence.ts` and
`STARGLASS_BACKEND_WORKFLOW` to its `workflow.ts`, then run the same test command
with a TypeScript-capable Node runtime (tested with Node 24.15.0). These load the
actual pure schema/checker and intake contract without contacting services.
Native host installation and live MCP verification remain separate release gates.
