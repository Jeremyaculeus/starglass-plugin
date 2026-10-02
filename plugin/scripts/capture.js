'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MAX_EVENT_BYTES = 5 * 1024 * 1024;
const TOOL_NAMES = new Set([
  'mcp__plugin_starglass-research_starglass-research__sources_list',
  'mcp__plugin_starglass-research_starglass-research__source_search',
  'mcp__plugin_starglass-research_starglass-research__source_fetch',
  'mcp__plugin_starglass-research_starglass-research__evidence_check',
]);
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

function isRegularFileNoLink(filePath) {
  try {
    const stat = fs.lstatSync(filePath);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function ensureDirectoryTree(root, parts) {
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      fs.mkdirSync(current);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    const stat = fs.lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error('capture directory is not a local directory');
    }
    const real = fs.realpathSync(current);
    const relative = path.relative(root, real);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
      throw new Error('capture directory escapes the case directory');
    }
  }
  return current;
}

function saveExclusive(target, bytes) {
  const temp = target + '.' + process.pid + '.' + crypto.randomBytes(8).toString('hex') + '.tmp';
  let fd;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    try {
      // Publish only the complete file and fail if another hook already claimed the ID.
      fs.linkSync(temp, target);
      return 'saved';
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const stat = fs.lstatSync(target);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('existing capture is not a regular file');
      if (!fs.readFileSync(target).equals(bytes)) throw new Error('capture ID already exists with different content');
      return 'already saved';
    }
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    try { fs.unlinkSync(temp); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

function result(context) {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: context,
    },
  });
}

function main(raw) {
  if (Buffer.byteLength(raw, 'utf8') > MAX_EVENT_BYTES) return { active: true, output: result('StarGlass local capture failed: event exceeded the 5 MiB safety limit.') };
  let event;
  try { event = JSON.parse(raw); } catch {
    return { active: true, output: result('StarGlass local capture failed: hook event was not valid JSON.') };
  }
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return { active: true, output: result('StarGlass local capture failed: hook event was malformed.') };
  }
  if (!TOOL_NAMES.has(event.tool_name)) return { active: false };
  if (typeof event.cwd !== 'string' || !path.isAbsolute(event.cwd)) {
    return { active: true, output: result('StarGlass local capture failed: case directory was invalid.') };
  }

  let root;
  try {
    root = fs.realpathSync(process.cwd());
    const eventRoot = fs.realpathSync(event.cwd);
    if (eventRoot !== root || !fs.statSync(root).isDirectory()) throw new Error('case path does not match hook working directory');
  } catch {
    return { active: true, output: result('StarGlass local capture failed: case directory was unavailable.') };
  }
  const marker = path.join(root, '.starglass-capture.json');
  if (!isRegularFileNoLink(marker)) return { active: false };
  let consent;
  try { consent = JSON.parse(fs.readFileSync(marker, 'utf8')); } catch {
    return { active: true, output: result('StarGlass local capture failed: opt-in marker was malformed.') };
  }
  if (!consent || consent.enabled !== true || consent.schema_version !== '1') return { active: false };

  if (typeof event.session_id !== 'string' || !SAFE_ID.test(event.session_id) ||
      typeof event.tool_use_id !== 'string' || !SAFE_ID.test(event.tool_use_id) ||
      !event.tool_input || typeof event.tool_input !== 'object' || Array.isArray(event.tool_input) ||
      !Object.hasOwn(event, 'tool_response')) {
    return { active: true, output: result('StarGlass local capture failed: event IDs or source payload were invalid.') };
  }

  try {
    const directory = ensureDirectoryTree(root, ['.starglass-evidence', event.session_id]);
    const relativePath = path.posix.join('.starglass-evidence', event.session_id, event.tool_use_id + '.json');
    const target = path.join(directory, event.tool_use_id + '.json');
    // Retain the exact hook JSON bytes so numeric precision, string contents,
    // response fields, and source formatting are not changed by reserialization.
    const bytes = Buffer.from(raw, 'utf8');
    if (bytes.byteLength > MAX_EVENT_BYTES) throw new Error('source payload exceeded the 5 MiB safety limit');
    const status = saveExclusive(target, bytes);
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    return { active: true, output: result('StarGlass source response ' + status + ': ' + relativePath + ' (SHA-256 ' + hash + ').') };
  } catch (error) {
    const safe = error.message === 'capture ID already exists with different content'
      ? error.message
      : 'local write or path validation failed';
    return { active: true, output: result('StarGlass local capture failed: ' + safe + '.') };
  }
}

if (require.main === module) {
  let input = '';
  let byteCount = 0;
  let oversized = false;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    byteCount += Buffer.byteLength(chunk, 'utf8');
    if (byteCount > MAX_EVENT_BYTES) oversized = true;
    else input += chunk;
  });
  process.stdin.on('end', () => {
    let outcome;
    if (oversized) {
      let optedIn = false;
      try {
        const marker = path.join(fs.realpathSync(process.cwd()), '.starglass-capture.json');
        if (isRegularFileNoLink(marker)) {
          const consent = JSON.parse(fs.readFileSync(marker, 'utf8'));
          optedIn = consent && consent.enabled === true && consent.schema_version === '1';
        }
      } catch {
        optedIn = false;
      }
      outcome = optedIn
        ? { active: true, output: result('StarGlass local capture failed: event exceeded the 5 MiB safety limit.') }
        : { active: false };
    } else {
      outcome = main(input);
    }
    if (outcome.active) process.stdout.write(outcome.output + '\n');
  });
}

module.exports = { main, MAX_EVENT_BYTES };
