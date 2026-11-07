'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { EvidenceSession, readiness, parseBytes, MAX_BUNDLE_BYTES } = require('../skills/starglass-research/scripts/evidence');
const contract = require('../skills/starglass-research/scripts/evidence-contract');
const template = require('../skills/starglass-research/templates/evidence-check.synthetic.json');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
function raw(text = '0.20', record = 'row1', patch = {}) {
  const citation = { ...template.receipts[0].citation, returned_chars: text.length,
    total_lines: text.split('\n').length, end_line: text.split('\n').length,
    text_sha256: hash(text), returned_text_sha256: hash(text), ...patch };
  return Buffer.from(JSON.stringify({ schema_version: '1', source: 'fixture', record_id: record, status: 'ok', text, citation }));
}
function setup(text = '0.20') {
  const session = new EvidenceSession();
  const [entry] = session.ingest(raw(text));
  const select = { receipt_id: entry.receipt_id, start_line: 1, end_line: text.split('\n').length, quote: '0.20' };
  return { session, entry, select };
}
function plan(selection, extra = {}) {
  return { case_frame: template.case_frame, claims: [{ claim_id: 'c1', text: 'Synthetic only', scope: 'cited_spans', bindings: [selection] }], ...extra };
}
function calc(selection) {
  return { calculation_id: 'a1', operation: 'sum', unit: 'units', values: [{ ...selection, row_id: 'row', unit: 'units' }],
    population: { scope: 'selected_rows', expected_row_ids: ['row'], source_keys: [{ source: 'fixture', record_id: 'row1' }] } };
}

test('raw bytes survive ingestion, copies cannot mutate receipt storage, and repeat is idempotent', () => {
  const session = new EvidenceSession();
  const bytes = Buffer.from(raw().toString().replace('"status":"ok"', '"status":"ok", "unrelated":9007199254740993'));
  const original = Buffer.from(bytes);
  const [entry] = session.ingest(bytes);
  bytes.fill(0);
  assert.deepEqual(session.raw(entry.raw_sha256), original);
  const copy = session.raw(entry.raw_sha256); copy.fill(0);
  session.ingest(original);
  assert.equal(session.index().length, 1);
  assert.deepEqual(session.raw(entry.raw_sha256), original);
});

test('capture envelope and MCP response agree, source-search discovery cannot become evidence', () => {
  const payload = JSON.parse(raw());
  const response = { structuredContent: payload, content: [{ type: 'text', text: JSON.stringify(payload) }] };
  const session = new EvidenceSession();
  assert.equal(session.ingest(Buffer.from(JSON.stringify({ tool_response: response }))).length, 1);
  response.content[0].text = JSON.stringify({ ...payload, text: 'changed' });
  assert.throws(() => session.ingest(Buffer.from(JSON.stringify(response))), /AMBIGUOUS/);
  assert.throws(() => session.ingest(Buffer.from('{"schema_version":"1","status":"ok","results":[]}')), /NO_ACQUIRED/);
  assert.throws(() => session.ingest(Buffer.from(JSON.stringify({ isError: true, structuredContent: payload }))), /NO_SUCCESSFUL/);
});

test('strict parse rejects duplicate keys, broken UTF-8, deep input and trailing JSON', () => {
  for (const text of ['{"a":1,"a":2}', '{"a":1,"\\u0061":2}', '{}{}', '['.repeat(70) + '0' + ']'.repeat(70)]) assert.throws(() => parseBytes(Buffer.from(text)));
  assert.throws(() => parseBytes(Buffer.from([0xc0, 0x80])));
  assert.throws(() => parseBytes(Buffer.alloc(5 * 1024 * 1024 + 1)));
});

test('invalid receipts fail atomically without rewriting hashes or line metadata', () => {
  const session = new EvidenceSession();
  for (const patch of [{ returned_chars: 5 }, { end_line: null }, { returned_text_sha256: '0'.repeat(64) }, { next_start_line: 2 }, { truncated: true }, { unexpected: true }]) assert.throws(() => session.ingest(raw('0.20', 'row1', patch)));
  assert.equal(session.index().length, 0);
});

test('explicit repeated occurrence, Unicode and CRLF preserve exact UTF-16 offset and zeros', () => {
  const { session, select } = setup('😀 first=0.20\r\nsecond=0.20');
  assert.throws(() => session.select(select, true), /AMBIGUOUS/);
  const operand = session.select({ ...select, occurrence: 2, unit: 'units', row_id: 'row' }, true);
  assert.equal(operand.value_start_char, '😀 first=0.20\r\nsecond='.length);
  assert.equal(operand.value, '0.20');
  assert.equal(operand.quote, '0.20');
  assert.throws(() => session.select({ ...select, occurrence: 3 }), /INVALID_OCCURRENCE/);
});

test('reject substring borrowing, exponent, unicode numeric neighbors and ambiguous comma tokens', () => {
  for (const text of ['10.20', '-0.20', '0.200', '0.20e2', '0.20, 2', '2,0.20', '０0.20', '−0.20']) {
    const { session, select } = setup(text);
    assert.throws(() => session.select({ ...select, unit: 'units', row_id: 'row' }, true), /BOUNDARY/);
  }
  const { session, select } = setup('"amount": 0.20, "label": "x"');
  assert.equal(session.select({ ...select, unit: 'units', row_id: 'row' }, true).value, '0.20');
});

test('grouping is explicit and never converts through floating point', () => {
  const { session, select } = setup('amount: -9,007,199,254,740,993.00');
  const input = { ...select, quote: '-9,007,199,254,740,993.00', unit: 'units', row_id: 'row' };
  assert.throws(() => session.select(input, true));
  assert.equal(session.select({ ...input, number_format: 'grouped_decimal' }, true).value, '-9007199254740993.00');
});

test('assembly owns offsets, preserves review choices and returns honest unused receipts', () => {
  const { session, select } = setup('amount: 0.20');
  session.ingest(raw('another record', 'unused'));
  const result = session.assemble(plan(select, { arithmetic: [calc(select)] }));
  assert.equal(result.batches.length, 1);
  const bundle = result.batches[0];
  contract.validate(contract.bundle, bundle);
  assert.equal(bundle.arithmetic[0].values[0].value_start_char, 8);
  assert.equal(bundle.claims[0].reviewer_conclusion, undefined);
  assert.equal(bundle.arithmetic[0].population.scope, 'selected_rows');
  assert.equal(result.unused_receipt_ids.length, 1);
  assert.match(result.boundary, /not authenticity/);
});

test('source dependencies include all pages and retain conflicts for the real checker', () => {
  const { session, select } = setup();
  session.ingest(raw('9.00'));
  const result = session.assemble(plan(select));
  assert.equal(result.batches[0].receipts.length, 2);
  assert.equal(result.batches[0].receipts[1].text, '9.00');
});

test('independent source components batch by UTF-8 bytes without dropping claims', () => {
  const session = new EvidenceSession();
  const claims = [];
  for (let i = 0; i < 4; i++) {
    const text = '😀'.repeat(5000) + '0.20';
    const [entry] = session.ingest(raw(text, 'record' + i));
    claims.push({ claim_id: 'c' + i, text: 'synthetic', scope: 'cited_spans', bindings: [{ receipt_id: entry.receipt_id, start_line: 1, end_line: 1, quote: '0.20' }] });
  }
  const { batches } = session.assemble({ case_frame: template.case_frame, claims });
  assert.ok(batches.length > 1);
  assert.equal(batches.flatMap(batch => batch.claims).length, 4);
  for (const batch of batches) assert.ok(Buffer.byteLength(JSON.stringify(batch)) <= MAX_BUNDLE_BYTES);
});

test('an oversized connected component and population are refused, never split or truncated', () => {
  const session = new EvidenceSession();
  const claims = [];
  for (let i = 0; i < 4; i++) {
    const [entry] = session.ingest(raw('😀'.repeat(5000) + i));
    claims.push({ claim_id: 'c' + i, text: 'synthetic', scope: 'cited_spans', bindings: [{ receipt_id: entry.receipt_id, start_line: 1, end_line: 1, quote: String(i) }] });
  }
  assert.throws(() => session.assemble({ case_frame: template.case_frame, claims }), /DEPENDENCY_GROUP/);
  const { session: small, select } = setup();
  const arithmetic = calc(select); arithmetic.values = Array(257).fill(arithmetic.values[0]);
  assert.throws(() => small.assemble(plan(select, { arithmetic: [arithmetic] })), /INVALID_INPUT/);
});

test('CLI and status never write, create capture consent, connect or claim authentication', t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'starglass-companion-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const script = path.resolve(__dirname, '../skills/starglass-research/scripts/evidence.js');
  const run = spawnSync(process.execPath, [script, 'status'], { cwd, encoding: 'utf8' });
  assert.equal(run.status, 0);
  const status = JSON.parse(run.stdout);
  assert.equal(status.capture, 'disabled');
  assert.equal(status.authentication, 'not_checked');
  assert.equal(status.mcp_connection, 'not_checked');
  const indexed = spawnSync(process.execPath, [script, 'index'], { cwd, encoding: 'utf8', input: JSON.stringify({ receipts: [raw().toString()] }) });
  assert.equal(indexed.status, 0);
  assert.equal(JSON.parse(indexed.stdout).receipts.length, 1);
  assert.deepEqual(fs.readdirSync(cwd), []);
  fs.writeFileSync(path.join(cwd, '.starglass-capture.json'), '{"schema_version":"1","enabled":true}');
  assert.equal(readiness(cwd).capture, 'enabled_by_local_marker');
  fs.writeFileSync(path.join(cwd, '.starglass-capture.json'), 'broken');
  assert.equal(readiness(cwd).capture, 'invalid_marker');
});

test('duplicate physical operands are rejected even with distinct row IDs', () => {
  const { session, select } = setup();
  const arithmetic = calc(select);
  arithmetic.values.push({ ...arithmetic.values[0], row_id: 'other' });
  arithmetic.population.expected_row_ids.push('other');
  assert.throws(() => session.assemble(plan(select, { arithmetic: [arithmetic] })), /DUPLICATE_PHYSICAL_OPERAND/);
});

test('type constraints reject impossible dates, unsafe metadata and unexpected semantic fields', () => {
  const session = new EvidenceSession();
  for (const patch of [{ retrieved_at: '2026-02-30T00:00:00Z' }, { byte_count: 9007199254740992 }, { returned_chars: '4' }]) assert.throws(() => session.ingest(raw('0.20', 'row1', patch)));
  const { session: valid, select } = setup();
  assert.throws(() => valid.assemble(plan(select, { approved: true })), /INVALID_PLAN/);
  assert.throws(() => valid.select({ ...select, value_start_char: 1 }), /INVALID_SELECTION/);
});

test('prepared bundle passes the actual server contract and checker without granting semantic truth', {
  skip: !process.env.STARGLASS_BACKEND_EVIDENCE && 'Set STARGLASS_BACKEND_EVIDENCE to the pinned backend evidence.ts for cross-repository parity'
}, async () => {
  const { pathToFileURL } = require('node:url');
  const { EvidenceCheckInputSchema, checkEvidence } = await import(pathToFileURL(path.resolve(process.env.STARGLASS_BACKEND_EVIDENCE)).href);
  const { session, select } = setup('0.20');
  const input = plan(select, { arithmetic: [calc(select)] });
  let bundle = session.assemble(input).batches[0];
  assert.equal(EvidenceCheckInputSchema.safeParse(bundle).success, true);
  let result = checkEvidence(bundle);
  assert.equal(result.status, 'needs_review');
  assert.equal(result.arithmetic[0].result, '0.20');
  assert.ok(result.issues.some(issue => issue.code === 'HOST_SEMANTIC_REVIEW_MISSING'));
  input.claims[0].reviewer_conclusion = { status: 'supported', reviewer_id: 'synthetic-host', note: 'Synthetic test only' };
  bundle = session.assemble(input).batches[0];
  result = checkEvidence(bundle);
  assert.equal(result.status, 'consistent');
  assert.match(result.boundary.meaning, /do not prove source authenticity or truth/);
  // The portable mirror is intentionally stricter for unsafe integer metadata.
  // For the public v1 contract cases below it rejects the same invalid shapes.
  for (const mutate of [
    b => { b.extra = true; }, b => { b.case_frame.question = ''; },
    b => { b.receipts[0].citation.end_line = null; },
    b => { b.claims[0].bindings[0].quote = ''; },
    b => { b.arithmetic[0].values[0].value = '1e3'; },
    b => { b.receipts[0].citation.retrieved_at = '2026-02-30T00:00:00Z'; },
  ]) {
    const invalid = JSON.parse(JSON.stringify(bundle)); mutate(invalid);
    assert.equal(EvidenceCheckInputSchema.safeParse(invalid).success, false);
    assert.throws(() => contract.validate(contract.bundle, invalid));
  }
});

test('CLI assembles an indexed response into checker input, and failures do not leak source data', () => {
  const script = path.resolve(__dirname, '../skills/starglass-research/scripts/evidence.js');
  const bytes = raw('amount: 0.20');
  const indexed = spawnSync(process.execPath, [script, 'index'], { encoding: 'utf8', input: JSON.stringify({ receipts: [bytes.toString()] }) });
  const [{ receipt_id }] = JSON.parse(indexed.stdout).receipts;
  const select = { receipt_id, start_line: 1, end_line: 1, quote: '0.20' };
  const result = spawnSync(process.execPath, [script, 'assemble'], { encoding: 'utf8', input: JSON.stringify({ receipts: [bytes.toString()], plan: plan(select, { arithmetic: [calc(select)] }) }) });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).batches[0].arithmetic[0].values[0].value_start_char, 8);
  const failed = spawnSync(process.execPath, [script, 'assemble'], { encoding: 'utf8', input: 'private-test-payload' });
  assert.equal(failed.status, 1);
  assert.equal(failed.stdout, '');
  assert.match(failed.stderr, /INVALID_JSON/);
  assert.equal(failed.stderr.includes('private-test-payload'), false);
});

test('existing opted-in hook capture feeds the companion without reparsing raw numeric payloads', t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'starglass-capture-companion-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  fs.writeFileSync(path.join(cwd, '.starglass-capture.json'), '{"schema_version":"1","enabled":true}');
  const payload = JSON.parse(raw());
  const event = { session_id: 'synthetic', tool_use_id: 'capture', cwd,
    tool_name: 'mcp__plugin_starglass-research_starglass-research__source_fetch',
    tool_input: { source: 'fixture', record_id: 'row1' }, tool_response: payload };
  const captured = spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/capture.js')], { cwd, encoding: 'utf8', input: JSON.stringify(event) });
  assert.equal(captured.status, 0);
  const bytes = fs.readFileSync(path.join(cwd, '.starglass-evidence/synthetic/capture.json'));
  const session = new EvidenceSession();
  const [entry] = session.ingest(bytes);
  assert.deepEqual(session.raw(entry.raw_sha256), bytes);
  const result = session.assemble(plan({ receipt_id: entry.receipt_id, start_line: 1, end_line: 1, quote: '0.20' }));
  assert.equal(result.batches[0].receipts[0].text, '0.20');
});

test('transaction acquisition indexes only actual acquired passages and rejects a malformed row atomically', () => {
  const fetched = JSON.parse(raw());
  const record = { record_id: fetched.record_id, text: fetched.text, citation: fetched.citation };
  const response = { schema_version: '1', status: 'partial', source: 'fixture', results: [{ record_id: 'discovery-only' }], acquired_records: [record] };
  const session = new EvidenceSession();
  const [entry] = session.ingest(Buffer.from(JSON.stringify(response)));
  assert.equal(entry.record_id, 'row1');
  assert.equal(session.index().length, 1);
  const broken = new EvidenceSession();
  response.acquired_records.push({ ...record, citation: { ...record.citation, returned_chars: 5 } });
  assert.throws(() => broken.ingest(Buffer.from(JSON.stringify(response))), /RECEIPT_TEXT_MISMATCH/);
  assert.equal(broken.index().length, 0);
});

const { nextRequest } = require('../skills/starglass-research/scripts/evidence');
function pageResponse(patch = {}) {
  return { ...JSON.parse(raw()), source: 'sec', record_id: '123', ...patch };
}
function continuationBytes(response, context) {
  return Buffer.from(JSON.stringify(context ? { ...context, tool_response: response } : response));
}
function searchResponse(input, patch = {}) {
  return { schema_version: '1', source: input.source, query: input.query, ...(input.mode ? { mode: input.mode } : {}),
    status: 'ok', results: [], truncated: true, next_cursor: 'observed-next',
    coverage: { query: input.query, filters: input.filters ?? {}, mode: input.mode ?? 'keywords',
      requested_limit: input.limit ?? 5, next_cursor: 'observed-next', provider_has_more: true }, ...patch };
}

test('fetch continuation preserves the original record and page policy from a capture', () => {
  const context = { tool_name: 'mcp__plugin_starglass-research_starglass-research__source_fetch', tool_input: { source: 'sec', record_id: '123', start_line: 1, max_lines: 2 } };
  const response = pageResponse();
  Object.assign(response.citation, { total_lines: 3, next_start_line: 2, truncated: true });
  const bytes = continuationBytes(response, context);
  const original = Buffer.from(bytes);
  const next = nextRequest(bytes);
  assert.equal(next.status, 'ready');
  assert.deepEqual(next.request, { tool_name: 'source_fetch', arguments: { ...context.tool_input, start_line: 2 } });
  assert.deepEqual(bytes, original);
  assert.equal(context.tool_input.start_line, 1);
  assert.equal(nextRequest(bytes, { ...context, tool_input: { ...context.tool_input, max_lines: 1 } }).reason, 'CONFLICTING_REQUEST_CONTEXT');
});

test('fetch continuation distinguishes no more lines, incomplete extraction, missing context and invalid windows', () => {
  const context = { tool_name: 'source_fetch', tool_input: { source: 'sec', record_id: '123' } };
  const response = pageResponse();
  assert.equal(nextRequest(continuationBytes(response), context).status, 'no_more');
  assert.equal(nextRequest(continuationBytes(response)).reason, 'ORIGINAL_REQUEST_REQUIRED');
  assert.equal(nextRequest(continuationBytes({ ...response, source: 'fec' }), context).reason, 'SOURCE_MISMATCH');
  assert.equal(nextRequest(continuationBytes({ ...response, record_id: 'different' }), context).reason, 'FETCH_RECORD_MISMATCH');
  const partial = { ...response, citation: { ...response.citation, extraction_partial: true, truncated: true } };
  assert.equal(nextRequest(continuationBytes(partial), context).reason, 'EXTRACTION_PARTIAL');
  const empty = { ...response, citation: { ...response.citation, end_line: null, next_start_line: 1 } };
  assert.equal(nextRequest(continuationBytes(empty), context).reason, 'NO_ADVANCING_PASSAGE');
  const wrongWindow = { ...context, tool_input: { ...context.tool_input, start_line: 2 } };
  assert.equal(nextRequest(continuationBytes(response), wrongWindow).reason, 'FETCH_WINDOW_MISMATCH');
  const beyond = { ...response, citation: { ...response.citation, start_line: 10000, end_line: 10000, total_lines: 10001, next_start_line: 10001, truncated: true } };
  assert.equal(nextRequest(continuationBytes(beyond), { ...context, tool_input: { ...context.tool_input, start_line: 10000 } }).reason, 'FETCH_CONTINUATION_OUTSIDE_WINDOW');
});

test('search continuation retains exact request fields and replaces only the observed cursor', () => {
  const input = { source: 'sec', query: 'Example company', mode: 'submissions', limit: 7, filters: { cik: '0000000123', forms: ['10-K', '10-K/A'], start_date: '2025-01-01' }, cursor: 'previous' };
  const original = JSON.parse(JSON.stringify(input));
  const response = searchResponse(input);
  const next = nextRequest(continuationBytes(response), { tool_name: 'source_search', tool_input: input });
  assert.equal(next.status, 'ready');
  assert.deepEqual(next.request.arguments, { ...input, cursor: 'observed-next' });
  assert.deepEqual(input, original);
  const defaults = { source: 'ecfr', query: 'workplace safety' };
  const result = nextRequest(continuationBytes(searchResponse(defaults)), { tool_name: 'source_search', tool_input: defaults });
  assert.deepEqual(result.request.arguments, { ...defaults, cursor: 'observed-next' });
  assert.equal(Object.hasOwn(result.request.arguments, 'limit'), false);
});

test('search continuation refuses missing or mismatched context, malformed requests and nonadvancing cursors', () => {
  const input = { source: 'nppes', query: 'Example clinic', mode: 'organization', limit: 3, filters: { state: 'CA' } };
  const context = { tool_name: 'source_search', tool_input: input };
  const response = searchResponse(input);
  assert.equal(nextRequest(continuationBytes(response)).status, 'blocked');
  for (const patch of [{ source: 'sec' }, { query: 'another inquiry' }, { mode: 'transactions' },
    { coverage: { ...response.coverage, filters: { state: 'TN' } } },
    { coverage: { ...response.coverage, requested_limit: 5 } }, { coverage: undefined }]) {
    assert.equal(nextRequest(continuationBytes({ ...response, ...patch }), context).status, 'blocked');
  }
  for (const patch of [{ limit: 11 }, { query: ' padded ' }, { filters: { unknown: true } }, { cursor: '\n' }, { extra: true }]) {
    assert.equal(nextRequest(continuationBytes(response), { ...context, tool_input: { ...input, ...patch } }).status, 'blocked');
  }
  assert.equal(nextRequest(continuationBytes(response), { ...context, tool_input: { ...input, cursor: 'observed-next' } }).reason, 'NON_ADVANCING_CURSOR');
});

test('null search cursor never hides provider ceilings, truncation, partial status or unadvertised paging', () => {
  const input = { source: 'nppes', query: 'Example clinic', mode: 'organization' };
  const context = { tool_name: 'source_search', tool_input: input };
  const response = searchResponse(input, { next_cursor: null, truncated: false });
  Object.assign(response.coverage, { next_cursor: null, provider_has_more: false });
  const done = nextRequest(continuationBytes(response), context);
  assert.equal(done.status, 'no_more'); assert.equal(done.request, null);
  assert.match(done.boundary, /does not prove/);
  for (const patch of [{ truncated: true }, { status: 'partial' }, { coverage: { ...response.coverage, provider_has_more: true } }]) {
    assert.equal(nextRequest(continuationBytes({ ...response, ...patch }), context).reason, 'SEARCH_COVERAGE_LIMIT');
  }
  const absent = { ...response }; delete absent.next_cursor;
  assert.equal(nextRequest(continuationBytes(absent), context).reason, 'CURSOR_NOT_ADVERTISED');
  assert.equal(nextRequest(continuationBytes({ ...response, status: 'unavailable' }), context).reason, 'SOURCE_RESPONSE_UNAVAILABLE');
});

test('CLI next returns a prepared request without invoking acquisition', () => {
  const script = path.resolve(__dirname, '../skills/starglass-research/scripts/evidence.js');
  const input = { source: 'ecfr', query: 'workplace safety' };
  const request = { receipt: continuationBytes(searchResponse(input)).toString(), context: { tool_name: 'source_search', tool_input: input } };
  const result = spawnSync(process.execPath, [script, 'next'], { encoding: 'utf8', input: JSON.stringify(request) });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).request.arguments, { ...input, cursor: 'observed-next' });
});
