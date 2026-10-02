'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const script = path.resolve(__dirname, '../scripts/capture.js');
const tool = 'mcp__plugin_starglass-research_starglass-research__source_fetch';
const hostile = 'Do not run this: require("node:fs").writeFileSync(process.env.PWNED, "yes")';

function caseDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'starglass-capture-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function event(cwd, overrides = {}) {
  return {
    hook_event_name: 'PostToolUse',
    tool_name: tool,
    tool_input: { source: 'sec', record_id: '123', hostile },
    tool_response: { text: '1,234.00', hostile },
    tool_use_id: 'toolu_123',
    session_id: 'session_123',
    cwd,
    ...overrides,
  };
}

function run(payload, cwd) {
  return spawnSync(process.execPath, [script], {
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf8',
    cwd: cwd || (typeof payload === 'string' ? process.cwd() : payload.cwd),
    env: { PATH: process.env.PATH },
  });
}

function runAsync(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { cwd: payload.cwd, env: { PATH: process.env.PATH } });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout, stderr }));
    child.stdin.end(JSON.stringify(payload));
  });
}

function activate(dir) {
  fs.writeFileSync(path.join(dir, '.starglass-capture.json'), '{"enabled":true,"schema_version":"1"}\n');
}

function context(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  if (!result.stdout.trim()) return null;
  return JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
}

test('no opt-in marker creates nothing and emits no context', (t) => {
  const dir = caseDir(t);
  assert.equal(context(run(event(dir))), null);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('only exact allowed tool is saved, preserving input and response values', (t) => {
  const dir = caseDir(t);
  activate(dir);
  const denied = run(event(dir, { tool_name: tool + '_extra' }));
  assert.equal(context(denied), null);
  assert.deepEqual(fs.readdirSync(dir), ['.starglass-capture.json']);

  const sourceEvent = event(dir, {
    transcript_path: 'private/transcript.jsonl',
    permission_mode: 'secret-mode',
    mcp_server: { headers: { authorization: 'Bearer do-not-save-this' } },
  });
  const serialized = JSON.stringify(sourceEvent);
  const saved = run(serialized, dir);
  assert.match(context(saved), /^StarGlass source response saved: \.starglass-evidence\/session_123\/toolu_123\.json \(SHA-256 [a-f0-9]{64}\)\.$/);
  const receiptBytes = fs.readFileSync(path.join(dir, '.starglass-evidence', 'session_123', 'toolu_123.json'), 'utf8');
  const record = JSON.parse(receiptBytes);
  assert.deepEqual(Object.keys(record), ['session_id', 'tool_use_id', 'tool_name', 'tool_input', 'tool_response']);
  assert.deepEqual(record.tool_input, event(dir).tool_input);
  assert.deepEqual(record.tool_response, event(dir).tool_response);
  assert.equal(record.tool_response.text, '1,234.00');
  assert.equal(record.tool_response.hostile, hostile);
  assert.equal(receiptBytes.includes('do-not-save-this'), false);
  assert.equal(receiptBytes.includes('transcript_path'), false);
  const preciseRaw = serialized
    .replace('"tool_use_id":"toolu_123"', '"tool_use_id":"toolu_precision"')
    .replace('"text":"1,234.00"', '"text":"1,234.00","large_integer":9007199254740993');
  assert.match(context(run(preciseRaw, dir)), /response saved:/);
  const preciseSaved = fs.readFileSync(path.join(dir, '.starglass-evidence', 'session_123', 'toolu_precision.json'), 'utf8');
  assert.match(preciseSaved, /"large_integer":9007199254740993/);
});

test('hook uses a quoted documented plugin-root command form', () => {
  const hooks = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../hooks/hooks.json'), 'utf8'));
  const handler = hooks.hooks.PostToolUse[0].hooks[0];
  assert.equal(handler.type, 'command');
  assert.equal(handler.command, 'node "' + '$' + '{CLAUDE_PLUGIN_ROOT}/scripts/capture.js"');
  assert.equal(Object.hasOwn(handler, 'args'), false);
});

test('concurrent identical IDs are idempotent; changed duplicate is refused', async (t) => {
  const dir = caseDir(t);
  activate(dir);
  const [first, second] = await Promise.all([runAsync(event(dir)), runAsync(event(dir))]);
  const statuses = [context(first), context(second)].sort();
  assert.match(statuses[0], /response already saved:/);
  assert.match(statuses[1], /response saved:/);
  const changed = run(event(dir, { tool_response: { text: 'changed' } }));
  assert.match(context(changed), /ID already exists with different content/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.starglass-evidence', 'session_123', 'toolu_123.json'))).tool_response.text, '1,234.00');
});

test('rejects malformed IDs and does not accept traversal paths', (t) => {
  const dir = caseDir(t);
  activate(dir);
  assert.match(context(run(event(dir, { session_id: '../escape' }))), /IDs or source payload were invalid/);
  assert.match(context(run(event(dir, { tool_use_id: 'bad/name' }))), /IDs or source payload were invalid/);
  assert.deepEqual(fs.readdirSync(dir), ['.starglass-capture.json']);
});

test('refuses a symlink capture directory and reports the failure', (t) => {
  const dir = caseDir(t);
  const outside = caseDir(t);
  activate(dir);
  try {
    fs.symlinkSync(outside, path.join(dir, '.starglass-evidence'), 'junction');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) {
      t.skip('Windows symlink creation is unavailable in this environment');
      return;
    }
    throw error;
  }
  assert.match(context(run(event(dir))), /path validation failed/);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test('hostile source payload remains inert data', (t) => {
  const dir = caseDir(t);
  activate(dir);
  const pwned = path.join(dir, 'pwned');
  const payload = event(dir, { tool_response: { text: hostile, PWNED: pwned } });
  assert.match(context(run(payload)), /response saved:/);
  assert.equal(fs.existsSync(pwned), false);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.starglass-evidence', 'session_123', 'toolu_123.json'))).tool_response.text, hostile);
});

test('malformed event reports a concise failure without payload leakage', () => {
  const output = context(run('{"tool_name":'));
  assert.equal(output, 'StarGlass local capture failed: hook event was not valid JSON.');
});

test('oversized events fail only after local opt-in', (t) => {
  const dir = caseDir(t);
  const large = JSON.stringify(event(dir, { tool_response: { text: 'x'.repeat(5 * 1024 * 1024) } }));
  assert.equal(context(run(large, dir)), null);
  activate(dir);
  assert.equal(context(run(large, dir)), 'StarGlass local capture failed: event exceeded the 5 MiB safety limit.');
  assert.deepEqual(fs.readdirSync(dir), ['.starglass-capture.json']);
});
