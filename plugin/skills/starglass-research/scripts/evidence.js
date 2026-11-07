'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const contract = require('./evidence-contract');
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_BUNDLE_BYTES = 60 * 1024;
const MAX_ELEMENTS = 10000;
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const key = value => JSON.stringify([value.source, value.record_id]);
const fail = message => { throw new Error(message); };

// JSON duplicate keys are ambiguous even if JSON.parse would silently choose one.
// Parse only bounded UTF-8 input; retain the original Buffer separately.
function parseBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_INPUT_BYTES) fail('INPUT_TOO_LARGE_OR_NOT_BYTES');
  const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  let pos = 0;
  let elements = 0;
  function space() { while (/[\x20\t\r\n]/.test(raw[pos] || '')) pos++; }
  function string() {
    const start = pos++;
    while (pos < raw.length) {
      const ch = raw[pos++];
      if (ch === '\\') pos++;
      else if (ch === '"') return JSON.parse(raw.slice(start, pos));
    }
    fail('INVALID_JSON');
  }
  function value(depth) {
    if (depth > 64 || ++elements > 100000) fail('INPUT_COMPLEXITY_LIMIT');
    space();
    if (raw[pos] === '"') return string();
    if (raw[pos] === '{' || raw[pos] === '[') {
      const object = raw[pos++] === '{';
      const end = object ? '}' : ']';
      const keys = new Set();
      space();
      if (raw[pos] === end) { pos++; return; }
      while (pos < raw.length) {
        if (object) {
          space();
          if (raw[pos] !== '"') fail('INVALID_JSON');
          const name = string();
          if (keys.has(name)) fail('AMBIGUOUS_JSON_KEY');
          keys.add(name); space();
          if (raw[pos++] !== ':') fail('INVALID_JSON');
        }
        value(depth + 1); space();
        if (raw[pos] === end) { pos++; return; }
        if (raw[pos++] !== ',') fail('INVALID_JSON');
      }
      fail('INVALID_JSON');
    }
    const match = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(raw.slice(pos));
    if (!match) fail('INVALID_JSON');
    pos += match[0].length;
  }
  value(0); space();
  if (pos !== raw.length) fail('INVALID_JSON');
  return JSON.parse(raw);
}

function payloadFrom(parsed) {
  const response = Object.hasOwn(parsed, 'tool_response') ? parsed.tool_response : parsed;
  if (!response || typeof response !== 'object' || Array.isArray(response) || response.isError === true) fail('NO_SUCCESSFUL_RECEIPT');
  if (Object.hasOwn(response, 'structuredContent')) {
    // If both representations exist, disagreement is not silently resolved.
    const texts = response.content?.filter(item => item.type === 'text');
    if (texts?.length && (texts.length !== 1 || JSON.stringify(parseBytes(Buffer.from(texts[0].text))) !== JSON.stringify(response.structuredContent))) fail('AMBIGUOUS_MCP_REPRESENTATION');
    return response.structuredContent;
  }
  if (Object.hasOwn(response, 'content')) {
    if (!Array.isArray(response.content) || response.content.length !== 1 || response.content[0].type !== 'text' || typeof response.content[0].text !== 'string') fail('AMBIGUOUS_MCP_REPRESENTATION');
    return parseBytes(Buffer.from(response.content[0].text));
  }
  return response;
}

class EvidenceSession {
  #raw = new Map();
  #receipts = new Map();
  ingest(bytes) {
    const parsed = parseBytes(bytes);
    const payload = payloadFrom(parsed);
    if (!payload || payload.schema_version !== '1') fail('UNSUPPORTED_RECEIPT_VERSION');
    const sha256 = digest(bytes);
    if (this.#raw.has(sha256)) return this.index().filter(row => row.raw_sha256 === sha256);
    let records;
    if (payload.status === 'ok' && Object.hasOwn(payload, 'text') && Object.hasOwn(payload, 'citation')) records = [payload];
    else if (['ok', 'partial'].includes(payload.status) && Array.isArray(payload.acquired_records) && payload.acquired_records.length) {
      records = payload.acquired_records.map(row => ({ ...row, source: payload.source }));
    } else fail('NO_ACQUIRED_PASSAGES');
    const pending = records.map((record, i) => {
      const receipt = { receipt_id: sha256 + ':' + i, source: record.source, record_id: record.record_id, text: record.text, citation: record.citation };
      contract.validate(contract.receipt, receipt);
      const c = receipt.citation;
      if (digest(receipt.text) !== c.returned_text_sha256 || receipt.text.length !== c.returned_chars) fail('RECEIPT_TEXT_MISMATCH');
      if (c.end_line < c.start_line || c.end_line > c.total_lines || receipt.text.split('\n').length !== c.end_line - c.start_line + 1) fail('RECEIPT_LINE_RANGE_MISMATCH');
      if (c.next_start_line !== (c.end_line < c.total_lines ? c.end_line + 1 : null) || c.truncated !== (c.extraction_partial || c.start_line > 1 || c.end_line < c.total_lines)) fail('RECEIPT_PAGINATION_MISMATCH');
      return clone(receipt);
    });
    this.#raw.set(sha256, Buffer.from(bytes));
    pending.forEach(receipt => this.#receipts.set(receipt.receipt_id, receipt));
    return this.index().filter(row => row.raw_sha256 === sha256);
  }
  raw(sha256) {
    const bytes = this.#raw.get(sha256);
    if (!bytes) fail('RAW_RECEIPT_NOT_FOUND');
    return Buffer.from(bytes);
  }
  index() {
    return [...this.#receipts.values()].map(r => ({ receipt_id: r.receipt_id, source: r.source, record_id: r.record_id,
      start_line: r.citation.start_line, end_line: r.citation.end_line, raw_sha256: r.receipt_id.split(':')[0],
      returned_text_sha256: r.citation.returned_text_sha256, truncated: r.citation.truncated, extraction_partial: r.citation.extraction_partial }));
  }
  select(selection, numeric = false) {
    if (!selection || Object.keys(selection).some(k => !['receipt_id', 'start_line', 'end_line', 'quote', 'occurrence', 'row_id', 'unit', 'number_format'].includes(k))) fail('INVALID_SELECTION');
    const { receipt_id, start_line, end_line, quote, occurrence } = selection;
    contract.validate(contract.binding, { receipt_id, start_line, end_line, quote });
    const receipt = this.#receipts.get(receipt_id);
    if (!receipt) fail('RECEIPT_NOT_FOUND');
    if (start_line > end_line || start_line < receipt.citation.start_line || end_line > receipt.citation.end_line) fail('SELECTION_OUTSIDE_RECEIPT');
    const span = receipt.text.split('\n').slice(start_line - receipt.citation.start_line, end_line - receipt.citation.start_line + 1).join('\n');
    const positions = [];
    for (let i = span.indexOf(quote); i !== -1; i = span.indexOf(quote, i + 1)) positions.push(i);
    if (!positions.length) fail('QUOTE_NOT_FOUND');
    if (occurrence === undefined && positions.length !== 1) fail('AMBIGUOUS_QUOTE_SELECT_OCCURRENCE');
    if (occurrence !== undefined && (!Number.isSafeInteger(occurrence) || occurrence < 1 || occurrence > positions.length)) fail('INVALID_OCCURRENCE');
    const start = positions[(occurrence ?? 1) - 1];
    const binding = { receipt_id, start_line, end_line, quote };
    if (!numeric) {
      if (['row_id', 'unit', 'number_format'].some(k => Object.hasOwn(selection, k))) fail('NUMERIC_FIELDS_ON_CLAIM_SELECTION');
      return binding;
    }
    const format = selection.number_format ?? 'plain_decimal';
    const value = format === 'grouped_decimal' ? quote.replace(/,/g, '') : quote;
    const operand = { ...binding, row_id: selection.row_id, unit: selection.unit, value, value_start_char: start,
      ...(selection.number_format === undefined ? {} : { number_format: format }) };
    contract.validate(contract.operand, operand);
    if (format === 'grouped_decimal' && !/^-?[1-9][0-9]{0,2}(?:,[0-9]{3})+(?:\.[0-9]{1,18})?$/.test(quote)) fail('INVALID_GROUPED_DECIMAL');
    const end = start + quote.length;
    const preceding = Array.from(span.slice(0, start)).pop() ?? '';
    const following = Array.from(span.slice(end))[0] ?? '';
    const neighbor = /[\p{N}.eE+\-\u2212\uFE63\uFF0D\uFF0B\uFF0E]/u;
    if (neighbor.test(preceding) || neighbor.test(following) ||
      (preceding === ',' && /\p{N}$/u.test(span.slice(0, start - 1).trimEnd())) ||
      (following === ',' && /^[+\-\u2212\uFE63\uFF0D\uFF0B]?\p{N}/u.test(span.slice(end + 1).trimStart()))) fail('DECIMAL_TOKEN_BOUNDARY_MISMATCH');
    return operand;
  }
  assemble(plan) {
    if (!plan || Object.keys(plan).some(k => !['case_frame', 'claims', 'arithmetic'].includes(k))) fail('INVALID_PLAN');
    contract.validate(contract.frame, plan.case_frame);
    if (!Array.isArray(plan.claims) || !plan.claims.length || !Array.isArray(plan.arithmetic ?? [])) fail('CLAIMS_REQUIRED');
    const claims = plan.claims.map(claim => {
      const result = { ...claim, bindings: claim.bindings.map(selection => this.select(selection)) };
      contract.validate(contract.claim, result); return result;
    });
    const arithmetic = (plan.arithmetic ?? []).map(calculation => {
      const result = { ...calculation, values: calculation.values.map(selection => this.select(selection, true)) };
      contract.validate(contract.calculation, result);
      const rowIds = result.values.map(value => value.row_id);
      if (new Set(rowIds).size !== rowIds.length) fail('DUPLICATE_ROW_ID');
      const expected = result.population.expected_row_ids;
      if (new Set(expected).size !== expected.length || expected.length !== rowIds.length || expected.some(id => !rowIds.includes(id))) fail('POPULATION_ROWS_MISMATCH');
      const locations = new Set();
      for (const value of result.values) {
        if (value.unit !== result.unit) fail('UNIT_MISMATCH');
        const receipt = this.#receipts.get(value.receipt_id);
        if (!result.population.source_keys.some(source => key(source) === key(receipt))) fail('BOUND_SOURCE_NOT_IN_SCOPE');
        const span = receipt.text.split('\n').slice(value.start_line - receipt.citation.start_line, value.end_line - receipt.citation.start_line + 1).join('\n');
        const prefix = span.slice(0, value.value_start_char);
        const location = JSON.stringify([key(receipt), receipt.citation.text_sha256, value.start_line + prefix.split('\n').length - 1, value.value_start_char - prefix.lastIndexOf('\n') - 1, value.quote.length]);
        if (locations.has(location)) fail('DUPLICATE_PHYSICAL_OPERAND');
        locations.add(location);
      }
      return result;
    });
    for (const [items, field] of [[claims, 'claim_id'], [arithmetic, 'calculation_id']]) {
      if (new Set(items.map(item => item[field])).size !== items.length) fail('DUPLICATE_' + field.toUpperCase());
    }
    // Source-connected components keep all pages and dependent claims/calculations
    // together. Never split one population or conceal cross-page conflicts.
    let units = [...claims.map(item => ({ claims: [item], arithmetic: [], sources: this.#dependencies(item.bindings, item.source_keys) })),
      ...arithmetic.map(item => ({ claims: [], arithmetic: [item], sources: this.#dependencies(item.values, item.population.source_keys) }))];
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length;) {
        if ([...units[i].sources].some(source => units[j].sources.has(source))) {
          units[i] = { claims: [...units[i].claims, ...units[j].claims], arithmetic: [...units[i].arithmetic, ...units[j].arithmetic], sources: new Set([...units[i].sources, ...units[j].sources]) };
          units.splice(j, 1); j = i + 1;
        } else j++;
      }
    }
    const makeBundle = groups => {
      const sources = new Set(groups.flatMap(group => [...group.sources]));
      return { schema_version: '1', case_frame: clone(plan.case_frame),
        receipts: [...this.#receipts.values()].filter(receipt => sources.has(key(receipt))).map(clone),
        claims: groups.flatMap(group => group.claims), arithmetic: groups.flatMap(group => group.arithmetic) };
    };
    const fits = bundle => {
      try { contract.validate(contract.bundle, bundle); } catch { return false; }
      let count = 0;
      const walk = value => { count++; if (value && typeof value === 'object') Object.values(value).forEach(walk); };
      walk(bundle);
      return count <= MAX_ELEMENTS && Buffer.byteLength(JSON.stringify(bundle)) <= MAX_BUNDLE_BYTES;
    };
    const batches = [];
    let current = [];
    for (const unit of units) {
      if (!unit.claims.length) fail('CALCULATION_REQUIRES_CONNECTED_CLAIM');
      if (!fits(makeBundle([unit]))) fail('DEPENDENCY_GROUP_EXCEEDS_CHECK_LIMITS');
      if (current.length && !fits(makeBundle([...current, unit]))) { batches.push(makeBundle(current)); current = []; }
      current.push(unit);
    }
    if (current.length) batches.push(makeBundle(current));
    const included = new Set(batches.flatMap(batch => batch.receipts.map(r => r.receipt_id)));
    return { batches, unused_receipt_ids: [...this.#receipts.keys()].filter(id => !included.has(id)),
      boundary: 'Prepared inputs only. Run every batch through evidence_check. Consistency is not authenticity, relevance, semantic truth, unit verification or real-world completeness.' };
  }
  #dependencies(bindings, sourceKeys = []) {
    const sources = new Set(bindings.map(binding => key(this.#receipts.get(binding.receipt_id))));
    for (const source of sourceKeys) {
      if (![...this.#receipts.values()].some(receipt => key(receipt) === key(source))) fail('SOURCE_NOT_FOUND');
      sources.add(key(source));
    }
    return sources;
  }
}


// Pure request preparation, not acquisition or authorization. Failure and absent
// continuation are separate outcomes; neither establishes complete research.
function nextRequest(bytes, originalContext) {
  const blocked = reason => ({ status: 'blocked', reason, request: null });
  const noMore = reason => ({ status: 'no_more', reason, request: null,
    boundary: 'No further page is advertised for this response. This does not prove complete real-world coverage.' });
  try {
    const parsed = parseBytes(bytes);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return blocked('INVALID_RECEIPT');
    const captured = Object.hasOwn(parsed, 'tool_input') ? { tool_name: parsed.tool_name, tool_input: parsed.tool_input } : undefined;
    const equal = require('node:util').isDeepStrictEqual;
    if (captured && originalContext && !equal(captured, originalContext)) return blocked('CONFLICTING_REQUEST_CONTEXT');
    const context = captured ?? originalContext;
    if (!context) return blocked('ORIGINAL_REQUEST_REQUIRED');
    if (Object.keys(context).some(k => !['tool_name', 'tool_input'].includes(k))) return blocked('INVALID_REQUEST_CONTEXT');
    const names = {
      source_fetch: 'source_fetch', source_search: 'source_search',
      'mcp__plugin_starglass-research_starglass-research__source_fetch': 'source_fetch',
      'mcp__plugin_starglass-research_starglass-research__source_search': 'source_search',
    };
    const tool = Object.hasOwn(names, context.tool_name) ? names[context.tool_name] : null;
    if (!tool) return blocked('UNSUPPORTED_TOOL_CONTEXT');
    const input = context.tool_input;
    contract.validate(tool === 'source_fetch' ? contract.fetchRequest : contract.searchRequest, input);
    const payload = payloadFrom(parsed);
    if (payload?.schema_version !== '1') return blocked('UNSUPPORTED_RECEIPT_VERSION');
    if (payload.source !== input.source) return blocked('SOURCE_MISMATCH');
    if (!['ok', 'partial'].includes(payload.status)) return blocked('SOURCE_RESPONSE_UNAVAILABLE');
    let args;
    if (tool === 'source_fetch') {
      if (payload.status !== 'ok' || payload.record_id !== input.record_id) return blocked('FETCH_RECORD_MISMATCH');
      const c = payload.citation;
      if (!c || c.end_line === null) return blocked('NO_ADVANCING_PASSAGE');
      if (c.start_line !== (input.start_line ?? 1) || c.end_line - c.start_line + 1 > (input.max_lines ?? 60)) return blocked('FETCH_WINDOW_MISMATCH');
      // Reuse immutable ingestion validation; do not repair inconsistent receipts.
      new EvidenceSession().ingest(bytes);
      if (c.next_start_line === null) return c.extraction_partial ? blocked('EXTRACTION_PARTIAL') : noMore('RETURNED_NEXT_LINE_NULL');
      if (c.next_start_line <= c.end_line || c.next_start_line > 10000) return blocked('FETCH_CONTINUATION_OUTSIDE_WINDOW');
      args = { ...clone(input), start_line: c.next_start_line };
      contract.validate(contract.fetchRequest, args);
    } else {
      if (payload.query !== input.query || payload.mode !== input.mode) return blocked('SEARCH_SCOPE_MISMATCH');
      if (!Object.hasOwn(payload, 'next_cursor')) return blocked('CURSOR_NOT_ADVERTISED');
      const coverage = payload.coverage;
      if (!coverage || coverage.query !== input.query || !equal(coverage.filters, input.filters ?? {}) || coverage.requested_limit !== (input.limit ?? 5) || coverage.mode !== (input.mode ?? 'keywords')) return blocked('SEARCH_SCOPE_MISMATCH');
      if (coverage.next_cursor !== payload.next_cursor || typeof coverage.provider_has_more !== 'boolean' || typeof payload.truncated !== 'boolean') return blocked('CONTINUATION_METADATA_MISMATCH');
      if (payload.next_cursor === null) {
        if (payload.status === 'partial' || payload.truncated || coverage.provider_has_more) return blocked('SEARCH_COVERAGE_LIMIT');
        return noMore('RETURNED_CURSOR_NULL');
      }
      if (typeof payload.next_cursor !== 'string' || payload.next_cursor === input.cursor) return blocked('NON_ADVANCING_CURSOR');
      args = { ...clone(input), cursor: payload.next_cursor };
      contract.validate(contract.searchRequest, args);
    }
    return { status: 'ready', request: { tool_name: tool, arguments: args },
      boundary: 'Prepared only. The host retains acquisition approval, source allowances, stopping decisions and coverage review.' };
  } catch (error) {
    return blocked(/^[A-Z_]+(?: at [a-zA-Z0-9_.]+)?$/.test(error.message) ? error.message : 'INVALID_RECEIPT_OR_REQUEST');
  }
}

// Deliberately no probing host configs, secrets, credentials, external MCP or skill
// installations. A local marker is observable; successful authentication is not.
function readiness(cwd = process.cwd()) {
  let capture = 'disabled';
  try {
    const marker = path.join(cwd, '.starglass-capture.json');
    const stat = fs.lstatSync(marker);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024) capture = 'invalid_marker';
    else {
      const value = parseBytes(fs.readFileSync(marker));
      capture = value?.schema_version === '1' && value.enabled === true ? 'enabled_by_local_marker' : 'disabled';
    }
  } catch (error) { if (error.code !== 'ENOENT') capture = 'invalid_marker'; }
  return { helper: 'available', node: process.versions.node, capture, mcp_connection: 'not_checked',
    authentication: 'not_checked', host_skill_activation: 'not_checked',
    next: 'In the research host inspect exposed schemas and call sources_list. Missing tools or sign-in: https://aculeus.ai/connect. Do not change access or repeat completed setup.' };
}

async function main() {
  if (process.argv[2] === 'status') { process.stdout.write(JSON.stringify(readiness()) + '\n'); return; }
  if (!['index', 'assemble', 'next'].includes(process.argv[2])) fail('USAGE: evidence.js status|index|assemble|next (JSON on stdin)');
  const chunks = []; let size = 0;
  for await (const chunk of process.stdin) { size += chunk.length; if (size > MAX_INPUT_BYTES) fail('INPUT_TOO_LARGE'); chunks.push(chunk); }
  const request = parseBytes(Buffer.concat(chunks));
  if (process.argv[2] === 'next') {
    if (!request || Object.keys(request).some(k => !['receipt', 'context'].includes(k)) || typeof request.receipt !== 'string') fail('INVALID_REQUEST');
    process.stdout.write(JSON.stringify(nextRequest(Buffer.from(request.receipt, 'utf8'), request.context)) + '\n'); return;
  }
  if (!request || Object.keys(request).some(k => !['receipts', 'plan'].includes(k)) || !Array.isArray(request.receipts)) fail('INVALID_REQUEST');
  const session = new EvidenceSession();
  for (const raw of request.receipts) { if (typeof raw !== 'string') fail('RAW_RECEIPT_STRING_REQUIRED'); session.ingest(Buffer.from(raw, 'utf8')); }
  const result = process.argv[2] === 'index' ? { receipts: session.index() } : session.assemble(request.plan);
  process.stdout.write(JSON.stringify(result) + '\n');
}
if (require.main === module) main().catch(error => { const code = /^[A-Z_]+(?: at [a-zA-Z0-9_.]+)?$/.test(error.message) ? error.message : 'INVALID_REQUEST_OR_RECEIPT'; process.stderr.write('Starglass evidence preparation failed: ' + code + '. No files were written.\n'); process.exitCode = 1; });
module.exports = { EvidenceSession, nextRequest, readiness, parseBytes, MAX_INPUT_BYTES, MAX_BUNDLE_BYTES };
