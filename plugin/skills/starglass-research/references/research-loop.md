# Research loop

The host is responsible for meaning and investigation. StarGlass handles bounded
acquisition, provenance, and exposed mechanical checks. No string-matching rule
can decide whether a passage answers the user's question.

## Frame before acquisition

Use the [case-frame template](../templates/case-frame.json). Record the actual
question and requested slots: for example, funding by transaction date, a filing
period, or a reported organizational role. Resolve these distinctions before
combining figures. Record legal names, aliases, parents/subsidiaries, and known
EIN, UEI, CIK, NPI, committee, or bill identifiers with their provenance. Leave
unknown identifiers unresolved; a matching name alone is not a resolved entity.

Separate the period asked about from publication, filing, effective, transaction,
and retrieval dates. State the relevant date basis and currency/unit. Record at
least the plausible initial explanation, its rival, and evidence that could
disconfirm each. A hypothesis is a research guide, not an asserted fact.

Build coverage rows for the question's entities, periods, requested facts, and
source families. Explain why each selected adapter or host source is relevant.
Choose multiple sources explicitly when needed; there is no single-source rule,
fixed source count, or arbitrary three-result stopping rule. Explain a bounded
scope chosen by the user or imposed by available quota.

## Inspect capability, then acquire

Read the actual host tool schemas and returned catalogue. Do not infer a new
deployment from this skill's installation. Preserve the catalogue response and
record unsupported modes/filters and missing credentials in the coverage log.
Tool names may have a host-specific prefix. Use the exposed equivalent.

Read [source modes and coverage](source-tools.md) when the live schema exposes
scoped searches, structured acquired records, or cursors.

- `sources_list({})` discovers source availability and service limits.
- `source_search` discovers records or, when its live schema exposes it, acquires
  structured source records. Its required arguments are `source` and `query`;
  use `limit`, modes, filters, and opaque cursors only as exposed by that schema.
- `source_fetch` accepts a typed returned `record_id`, not an arbitrary URL.
  Inspect `start_line`, `max_lines`, returned range, `next_start_line`, truncation,
  and hashes to continue context acquisition within its live limits.
- `evidence_check`, when present, checks explicitly supplied evidence and claims
  mechanically. Follow [the bundle guide](evidence-bundle.md); never invent a
  successful check on a host where the tool is missing.

For each purposeful batch: state the coverage target; call the selected sources;
acquire the identity, date, figure, and surrounding context through captured
structured records or fetched source passages; capture responses;
avoid counting the same captured receipt twice while retaining distinct versions
and provider row occurrences whose transaction identity is uncertain; update the ledger;
decide which gap the next batch will close. Parallel independent read-only calls
are useful if the host supports them and shared limits allow them. Sequence calls
that depend on a returned identifier or cursor.

Follow opaque cursors exactly. Do not generate cursors or assume page exhaustion
because a page is short. Preserve provider coverage/truncation warnings and the
actual end condition. For fetched passages, keep the actual one-based range and
compare full-text hashes when continuing the same representation. If the hash
changes, retain both versions and reacquire a consistent version for a claim.
Do not silently stitch pages from different representations.

Search results are discovery metadata unless the response expressly supplies
acquired records with provenance. Titles and snippets do not substitute for source
content. A page size, line window, or context window does not establish complete
coverage. Keep all acquired source entries visible in the manifest, track whether
they were considered, and inspect every material relevant record. For large cases,
stage reading by question/period and retain source pointers and substantive
summaries; reopen full context for claims and contradictions. Do not silently
discard sources based on a fixed score, top-k limit, or prose length.

## Interpret source-specific records

**USAspending:** distinguish discovery award summaries, cumulative award amounts,
and individual transaction obligations. Sum only the explicitly selected captured
transaction field over a scoped record set. Deduplicate underlying transactions
only when their distinct identity is proven; a shared award ID or identical row
representation is insufficient. Preserve and count ambiguous provider row
occurrences, label capture sums accordingly, and do not present them as certified
distinct-transaction totals. A transaction obligation
can be negative. Do not add cumulative award totals to transaction obligations,
equate obligations with payments, or treat a federal source as all funding.
Record recipient UEI, award/transaction identity, action date, award type, field,
unit, filters, page coverage, and missing periods. Do not infer a fiscal year from
an award identifier suffix. Unsupported transaction filters leave a stated gap.

**SEC:** resolve CIK before using a name match. Inspect filing form, accession,
filing date, reporting period, amendments, and the actual relevant disclosure.
Submission metadata and a filing index do not establish figures in the filing.
Use exposed CIK/forms/date filters and pagination; older name-based search cannot
be described as a complete issuer filing history.

**NPPES:** resolve NPI, entity type, organization/other names, address purpose,
taxonomy, dates, and reported authorized-official fields. An authorized official,
contact, practice address, or taxonomy is a reported role/attribute, not proof of
ownership, corporate control, current licensure, or a parent relationship. Track
alias filters and pagination where exposed. A name search can omit subsidiaries
or differently named organizations.

**Other adapters:** verify committee, bill, package, and disclosure identifiers
and record-level scope. FEC individual-contribution data is outside this interface.
Do not extrapolate a source beyond the catalogue's stated coverage.

## Close gaps with authorized host evidence

Use the host's available search/browser/document tools and authorized user files
when evidence falls outside the adapters. This can include organization-hosted
audits, tax returns, board records, state registries, court documents, and PDFs.
Record the canonical URL or user-approved file reference, publisher, retrieval
time, document date/period, and locator. Preserve bytes/text and a computed hash
when the host can capture them; otherwise disclose the weaker provenance.

For PDFs, inspect the relevant rendered pages and extracted text when available.
Record printed versus PDF page numbers. Mark OCR errors, unreadable tables,
missing pages, scans, or extraction failures and withhold affected figures until
resolved. Host evidence keeps its own provenance; local hashes or line numbering
are not StarGlass receipts. Do not upload private files to StarGlass or another
service just to run this workflow.

## Synthesize, challenge, repair

Every semantic pass receives the full case frame, asked slots, identity resolutions,
evidence inventory, conflicts, and coverage gaps. Explain the meaning of each
number before computing it. Use mechanical arithmetic for specified fields;
the host decides whether the calculation answers the question.

Draft from the evidence ledger and inspected source context. Preserve conflicting
evidence and separate explicit source statements from inferences. Attach stable
claim IDs to the draft so review issues and check results can be repaired.
Use the [skeptical review brief](skeptical-review.md). Run mechanical checks on
the final proposed figures, then resolve reviewer issues and rerun affected checks
after changes. An unchanged successful check need not be repeated.

Stop when each requested slot has a supported answer or an explicit unresolved
gap, material rival explanations have been tested, relevant retrieved evidence
has been considered, review issues are resolved or disclosed, and each confirmed
figure passes its required mechanical floor. Quota exhaustion, inaccessible
sources, or host limits can justify a partial report, never an unqualified answer.
State what remained unexamined and which next record would change the conclusion.
