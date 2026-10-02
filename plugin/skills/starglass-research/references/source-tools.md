# Source search contract and interpretation

Use this reference after inspecting the live tools. The quality-client contract
retains legacy `source_search` arguments: `source`, `query` (3–512 characters),
and optional `limit` (1–10, default 5). A limit is a page size. New schemas expose
optional `mode`, strict `filters`, and opaque `cursor`; old hosts may lack them.
Do not send unsupported fields or generate a cursor.

## Question-driven search modes

| Source | Mode | Exposed filters | Important scope |
| --- | --- | --- | --- |
| USAspending | `transactions` | `recipient_uei`, `start_date`, `end_date` | Requires the subject's resolved UEI and ISO date window starting no earlier than 2007-10-01. Federal action obligations, not all funding or payments. |
| SEC | `submissions` | `cik`, `forms`, `start_date`, `end_date` | Requires resolved CIK. Exact forms and date filters narrow discovery; inspect the filing itself for substantive claims. |
| NPPES | `organization` | `state`, `city`, `postal_code`, `address_purpose`, `organization_alias` | Organization name/alias search and location filters; reported fields do not prove ownership. |

The strict filter object accepts only the fields exposed by the schema; use the
appropriate source's fields. Read exact allowed values and validation errors
from that schema instead of guessing formats. Without a new mode, legacy search
can still help discovery but cannot be described as the new scoped acquisition.

For example, after resolving a UEI from inspected records, select USAspending
transactions with that actual `recipient_uei` and the requested start/end dates.
Retain the initial query and filters for every continuation; pass exactly the
returned cursor. SEC submissions use the resolved CIK, not a name guessed to be
unique. NPPES already searches organization names and other organization names;
`organization_alias` records the host's intent and does not select a separate API
index. Use explicit aliases/wildcards and locations when relevant. Do not substitute
example identifiers for the actual subject.

## Search output and completeness

New responses report `mode` and `coverage`: query, filters, requested limit,
records seen/returned, omissions, next cursor, and provider-has-more. Their
`complete: false` warns that the adapter has not certified a complete real-world
population. Retain these fields even when no next cursor remains. Cursor exhaustion
means exhaustion of that exposed search route, not proof that every relevant
record exists in the acquired set. Log invalid/omitted siblings and any text budget
omission; do not silently treat returned rows as all seen rows.

USAspending transactions provide `acquired_records`, each with typed `record_id`,
record type, structured `data`, exact serialized `text`, citation representation
`transaction_row_json`, row hash, and `federal_action_obligation`. Preserve the
supplied text/citation exactly for bindings. These are acquired row captures,
unlike discovery titles/snippets; do not reformat them before checking. If they
already contain sufficient context, an extra fetch is not a prerequisite. Use
`source_fetch` only for fetchable returned identifiers accepted by its live schema.

`accepted_page_federal_action_obligations` is a page measure, never a full funding
ledger total. The transaction cursor traverses contracts, then assistance types
02–11. The search endpoint's internal ID identifies an award, not a unique
transaction. Captured row IDs identify a page position and row representation;
they do not prove distinct underlying actions. Preserve identical returned rows
and report their ambiguity; never deduplicate different modifications merely
because they share an award ID. A sum over captures is not a certified distinct
transaction ledger. The current total captured-row text budget can omit rows;
inspect omissions and acquire missing evidence or report a partial row set.

SEC cursors traverse recent submissions and advertised historical files. Record
which were acquired and failed. A permitted SEC ownership XML subpath in a returned
filing ID is a typed source identifier, not permission to fetch arbitrary URLs.
NPPES pagination uses provider skip offsets through 1000; a full page indicates
possible more results, not certified more results. If the provider's ceiling leaves
possible matches, narrow purposeful searches and report unresolved coverage; do
not pretend pagination passed beyond the ceiling.

Every result still needs host judgment about entity, date, definition, relevance,
and counterevidence. Neither a page receipt nor a mechanically consistent row
proves a complete population or supports an ownership inference.
