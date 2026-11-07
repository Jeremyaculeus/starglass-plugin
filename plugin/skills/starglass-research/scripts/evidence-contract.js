'use strict';

// Portable, dependency-free mirror of evidence_check v1 input constraints.
// Keep in sync with Aculeus lib/plugin-research/evidence.ts. No coercion/defaults.
const str = (max, min = 1, pattern) => ({ type: 'string', min, max, pattern });
const integer = (min = 0, max = Number.MAX_SAFE_INTEGER) => ({ type: 'integer', min, max });
const list = (item, max, min = 0) => ({ type: 'array', item, min, max });
const obj = (fields, optional = []) => ({ type: 'object', fields, optional });
const choice = (...values) => ({ type: 'enum', values });
const id = str(256);
const line = integer(1, 1000000);
const hash = str(64, 64, /^[a-f0-9]{64}$/);
const boolean = { type: 'boolean' };
const sourceKey = obj({ source: id, record_id: id });
const bindingFields = { receipt_id: id, start_line: line, end_line: line, quote: str(16384) };
const binding = obj(bindingFields);
const citation = obj({
  id, canonical_url: str(2048), publisher: str(512),
  retrieved_at: { ...str(100, 1, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/), datetime: true },
  content_type: str(256), representation: id, raw_sha256: hash, text_sha256: hash,
  returned_text_sha256: hash, parser_version: id, byte_count: integer(), returned_chars: integer(),
  total_lines: line, start_line: line, end_line: line, truncated: boolean,
  extraction_partial: boolean, next_start_line: { type: 'nullable', item: line },
});
const receipt = obj({ receipt_id: id, source: id, record_id: id, text: str(32768, 0), citation });
const claim = obj({ claim_id: id, text: str(4096), scope: choice('cited_spans', 'complete_sources'),
  source_keys: list(sourceKey, 64), bindings: list(binding, 64, 1),
  reviewer_conclusion: obj({ status: choice('supported', 'contradicted', 'uncertain'), reviewer_id: id, note: str(4096) }),
}, ['source_keys', 'reviewer_conclusion']);
const operand = obj({ ...bindingFields, row_id: id, unit: id, value_start_char: integer(0, 32768),
  number_format: choice('plain_decimal', 'grouped_decimal'),
  value: str(60, 1, /^-?(?:0|[1-9][0-9]{0,39})(?:\.[0-9]{1,18})?$/),
}, ['number_format']);
const calculation = obj({ calculation_id: id, operation: choice('sum', 'min', 'max', 'count'), unit: id,
  values: list(operand, 256, 1), population: obj({ scope: choice('selected_rows', 'complete'),
    expected_row_ids: list(id, 256, 1), source_keys: list(sourceKey, 64, 1),
    completeness_assertion: choice('host_asserted_unverified'),
  }, ['completeness_assertion']),
});
const frame = obj({ case_id: id, question: str(4096), entity_ids: list(obj({ scheme: id, value: id }), 32), time_scope: str(512) });
const bundle = obj({ schema_version: choice('1'), case_frame: frame, receipts: list(receipt, 64, 1),
  claims: list(claim, 64, 1), arithmetic: list(calculation, 16) }, ['arithmetic']);

// Continuation preserves already-normalized original arguments, never trims or
// fills host choices. Omitted fields retain the server's documented defaults.
const scalar = (max, min = 1, pattern) => ({ ...str(max, min, pattern), scalar: true });
const sources = choice('usaspending', 'sec', 'fec', 'congress', 'govinfo', 'lda', 'nppes', 'ecfr', 'federal_register', 'uscode', 'courtlistener', 'gov_index');
const date = scalar(10, 10, /^\d{4}-\d{2}-\d{2}$/);
const filters = obj({
  recipient_uei: scalar(12, 12, /^[A-Za-z0-9]{12}$/), start_date: date, end_date: date,
  cik: scalar(10, 1, /^\d{1,10}$/), forms: list(scalar(30), 20, 1),
  state: scalar(2, 2, /^[A-Za-z]{2}$/), city: scalar(100),
  postal_code: scalar(10, 5, /^\d{5}(?:\d{4})?\*?$/),
  address_purpose: choice('LOCATION', 'MAILING', 'PRIMARY', 'SECONDARY'), organization_alias: boolean,
  jurisdiction: scalar(5, 2, /^us(?:-[a-z]{2})?$/), court: scalar(20, 1, /^[a-z0-9]{1,20}$/),
  court_type: choice('federal-supreme', 'federal-appellate', 'federal-district', 'federal-bankruptcy', 'federal-special', 'military', 'state-supreme', 'state-appellate', 'state-trial', 'state-special', 'state-attorney-general'),
  cites: scalar(200), domain: scalar(253, 1, /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/),
  opinion_id: scalar(12, 1, /^[1-9]\d{0,11}$/),
});
filters.optional = Object.keys(filters.fields);
const searchRequest = obj({ source: sources, query: scalar(512, 3), limit: integer(1, 10),
  mode: choice('transactions', 'submissions', 'organization', 'cited_by'), filters, cursor: scalar(1024),
}, ['limit', 'mode', 'filters', 'cursor']);
const fetchRequest = obj({ source: sources, record_id: scalar(256), start_line: integer(1, 10000), max_lines: integer(1, 100) }, ['start_line', 'max_lines']);

function validate(schema, value, path = 'input') {
  const fail = () => { throw new Error('INVALID_INPUT at ' + path); };
  switch (schema.type) {
    case 'nullable': if (value !== null) validate(schema.item, value, path); break;
    case 'enum': if (!schema.values.includes(value)) fail(); break;
    case 'boolean': if (typeof value !== 'boolean') fail(); break;
    case 'integer': if (!Number.isSafeInteger(value) || value < schema.min || value > schema.max) fail(); break;
    case 'string': if (typeof value !== 'string' || value.length < schema.min || value.length > schema.max || (schema.pattern && !schema.pattern.test(value))) fail();
      if (schema.scalar && (value !== value.trim() || /[\u0000-\u001f\u007f]/.test(value))) fail();
      if (schema.datetime && (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19))) fail();
      break;
    case 'array':
      if (!Array.isArray(value) || value.length < schema.min || value.length > schema.max) fail();
      value.forEach((item, i) => validate(schema.item, item, path + '.' + i)); break;
    case 'object':
      if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
      if (Object.keys(value).some(key => !Object.hasOwn(schema.fields, key))) fail();
      for (const [key, child] of Object.entries(schema.fields)) {
        if (!Object.hasOwn(value, key) && schema.optional.includes(key)) continue;
        validate(child, value[key], path + '.' + key);
      }
      break;
    default: throw new Error('Unknown schema');
  }
  return value;
}
module.exports = { validate, receipt, binding, operand, claim, calculation, frame, bundle, searchRequest, fetchRequest };
