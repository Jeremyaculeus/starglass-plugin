'use strict';

// Static contract checks for what happens when StarGlass is invoked. They verify
// that the instructions exist and stay consistent; they do not run a model or
// prove that any host follows them. invocation.cases.json is the manual rubric.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pluginRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pluginRoot, '..');
const read = (relative) => fs.readFileSync(path.join(pluginRoot, relative), 'utf8');
const readRepo = (relative) => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const flat = (text) => text.replace(/\s+/g, ' ').trim();
const count = (text, needle) => text.split(needle).length - 1;

const START = '## Start here when this skill is invoked';
const WORK = '## Work the question through';
const SPEC_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);

function scalar(raw, line) {
  const value = raw.trim();
  if (/^".*"$/.test(value)) return JSON.parse(value);
  if (/^'.*'$/.test(value)) return value.slice(1, -1).replace(/''/g, "'");
  if (value === 'true') return true;
  if (value === 'false') return false;
  // Keep plain scalars unambiguous YAML; a stray ': ' or ' #' breaks parsing.
  assert.ok(!/: | #/.test(value), 'quote this frontmatter value: ' + line);
  return value;
}

// Minimal parser for the flat frontmatter these files use (one nesting level).
function frontmatter(text) {
  assert.ok(text.startsWith('---\n'), 'frontmatter must open on the first line');
  const end = text.indexOf('\n---\n', 3);
  assert.ok(end > 0, 'frontmatter must close');
  const data = {};
  let parent = null;
  for (const line of text.slice(4, end).split('\n')) {
    if (!line.trim()) continue;
    const nested = /^ {2,}([A-Za-z0-9_-]+):(?: (.*))?$/.exec(line);
    if (nested && parent) { data[parent][nested[1]] = scalar(nested[2] ?? '', line); continue; }
    const top = /^([A-Za-z0-9_-]+):(?: (.*))?$/.exec(line);
    assert.ok(top, 'unsupported frontmatter line: ' + line);
    assert.ok(!Object.hasOwn(data, top[1]), 'duplicate frontmatter key: ' + top[1]);
    if (!top[2]) { data[top[1]] = {}; parent = top[1]; } else { data[top[1]] = scalar(top[2], line); parent = null; }
  }
  return { data, body: text.slice(end + 5) };
}

const mainSkill = read('skills/starglass-research/SKILL.md');
const main = frontmatter(mainSkill);
const startSection = mainSkill.split(START)[1].split(WORK)[0];
const start = flat(startSection);

test('main skill frontmatter stays on Agent Skills spec keys and says invocation starts intake', () => {
  for (const key of Object.keys(main.data)) assert.ok(SPEC_KEYS.has(key), 'non-spec frontmatter key: ' + key);
  assert.equal(main.data.name, 'starglass-research');
  assert.equal(typeof main.data.description, 'string');
  assert.ok(main.data.description.length <= 1024);
  assert.match(main.data.description, /intake/);
  assert.match(main.data.description, /Case Plan/);
  assert.match(main.data.description, /own AI host/);
  // Codex installs this file too; argument text arrives as ARGUMENTS or the message.
  assert.equal(count(mainSkill, '$ARGUMENTS'), 0);
});

test('start section comes first and makes invocation start intake, not approval', () => {
  assert.equal(count(mainSkill, START), 1);
  assert.equal(count(mainSkill, WORK), 1);
  assert.ok(mainSkill.indexOf(START) < mainSkill.indexOf(WORK));
  for (const phrase of [
    'Do not wait for the words',
    'It is not approval of a plan',
    'Proceed with this plan, or change anything?',
    'When in doubt, run intake',
    'What should StarGlass investigate?',
    'https://aculeus.ai/connect',
    "accept \"I don't know\"",
    'catalogue discovery is not source acquisition',
    'case-frame.json',
    'intake.plan_decision',
    'do not re-ask answered intake',
    'not the separate hosted Aculeus Deep Research product',
  ]) assert.ok(start.includes(phrase), 'start section lacks: ' + phrase);
  assert.ok(start.indexOf('sources_list') < start.indexOf('Case Plan'));
  assert.ok(start.indexOf('What should StarGlass investigate?') < start.indexOf('sources_list({})'));
  assert.ok(start.indexOf('ask only the most consequential one') < start.indexOf('show the compact Case Plan'));
  // Long acquisition is named once, only in the sentence that makes it wait.
  assert.equal(count(start, 'source_search'), 1);
  assert.equal(count(start, 'source_fetch'), 1);
  const from = start.indexOf('source_search');
  const waitSentence = start.slice(from, start.indexOf('. ', from));
  assert.ok(waitSentence.includes('source_fetch'));
  assert.match(waitSentence, /wait for the user's actual reply to that displayed plan/);
  // Bounded lookups are narrowly defined and intake is the default.
  assert.match(start, /Treat the request as deep research by default/);
  assert.match(start, /names one record or identifier and asks for one or two of its fields, or the user explicitly asks for a quick lookup/);
});

test('existing workflow steps and markers are kept, and review points at the native reviewer', () => {
  const work = mainSkill.split(WORK)[1].split('## Boundaries')[0];
  for (const marker of ['1. Read existing answers', '2. Preserve the actual', '3. Explicitly choose', '4. Reassess', '5. Synthesize', '6. Run a skeptical review', '7. Before publishing']) {
    assert.ok(work.includes(marker), 'missing step marker: ' + marker);
  }
  const review = flat(work.split('6. Run a skeptical review')[1].split('7. Before publishing')[0]);
  assert.match(review, /starglass-research:starglass-reviewer/);
  assert.match(review, /same-model separate review pass/);
  assert.match(review, /A separate context does not imply a different model/);
  assert.match(review, /references\/skeptical-review\.md/);
});

test('investigate command is user-only, hidden from npx discovery and delegates once', () => {
  const text = read('skills/investigate/SKILL.md');
  const { data, body } = frontmatter(text);
  assert.equal(data.name, 'investigate');
  assert.equal(data['disable-model-invocation'], true);
  assert.equal(typeof data['argument-hint'], 'string');
  assert.ok(data['argument-hint'].length > 0);
  assert.deepEqual(data.metadata, { internal: true });
  assert.match(data.description, /Case Plan/);
  assert.ok(data.description.length <= 1024);
  assert.equal(count(text, '$ARGUMENTS'), 1);
  assert.equal(count(body, '$ARGUMENTS'), 1);
  const flatBody = flat(body);
  assert.match(flatBody, /`starglass-research:starglass-research`/);
  assert.ok(flatBody.includes('"Start here when this skill is invoked"'));
  assert.ok(flatBody.includes('What should StarGlass investigate?'));
  assert.match(flatBody, /does not approve a Case Plan/);
  assert.match(flatBody, /case-frame\.json/);
  assert.match(flatBody, /Hosted Aculeus Deep Research is a separate product/);
  assert.ok(fs.existsSync(path.join(pluginRoot, 'skills/starglass-research/SKILL.md')));
});

test('reviewer agent uses supported plugin fields, an enforced allowlist and the review brief', () => {
  const text = read('agents/starglass-reviewer.md');
  const { data, body } = frontmatter(text);
  assert.equal(data.name, 'starglass-reviewer');
  assert.ok(!data.name.includes(':'));
  assert.ok(typeof data.description === 'string' && data.description.length > 0);
  assert.equal(data.model, 'inherit');
  for (const ignored of ['permissionMode', 'hooks', 'mcpServers', 'initialPrompt']) assert.ok(!Object.hasOwn(data, ignored), ignored);
  const manifest = JSON.parse(read('.claude-plugin/plugin.json'));
  const [serverKey] = Object.keys(JSON.parse(read('.mcp.json')).mcpServers);
  const prefix = 'mcp__plugin_' + manifest.name + '_' + serverKey + '__';
  assert.match(JSON.parse(read('hooks/hooks.json')).hooks.PostToolUse[0].matcher, new RegExp('^\\^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const tools = data.tools.split(',').map((tool) => tool.trim());
  assert.deepEqual(tools, ['Read', 'Grep', 'Glob', prefix + 'source_fetch', prefix + 'evidence_check']);
  const brief = read('skills/starglass-research/references/skeptical-review.md').split('## Brief to the reviewer')[1].split('## Integration')[0];
  assert.ok(flat(body).includes(flat(brief)), 'agent body must carry the review brief verbatim');
  assert.match(flat(body), /A separate context is not a different model/);
  assert.match(flat(body), /write no files/);
});

test('versions agree across manifests and docs, and the plugin starts enabled', () => {
  const manifest = JSON.parse(read('.claude-plugin/plugin.json'));
  const marketplace = JSON.parse(readRepo('.claude-plugin/marketplace.json'));
  assert.equal(marketplace.plugins[0].version, manifest.version);
  assert.equal(manifest.defaultEnabled, true);
  assert.ok(readRepo('docs/RESEARCH-WORKFLOW.md').includes('Client package ' + manifest.version));
  assert.ok(readRepo('docs/RESEARCH-INTAKE-VALIDATION.md').includes('client package ' + manifest.version));
});

test('READMEs document how to start research without implying hosted Deep Research', () => {
  const readme = readRepo('README.md');
  const pluginReadme = read('README.md');
  const workflow = readRepo('docs/RESEARCH-WORKFLOW.md');
  for (const doc of [readme, pluginReadme, workflow]) {
    assert.match(doc, /## Start an investigation/);
    assert.ok(!/## Start research/.test(doc), 'keep the hosted Start research wording distinct');
    assert.ok(doc.includes('npx skills update starglass-research'), 'existing Codex installs need the update step');
    assert.match(flat(doc), /no native host test of this start flow is claimed yet/);
    assert.match(flat(doc), /quick lookup that stays within one record or one source family/);
    assert.ok(doc.includes('/starglass-research:investigate <question>'));
    assert.ok(doc.includes('$starglass-research <question>'));
    assert.match(flat(doc), /deployed to aculeus\.ai/);
    assert.match(flat(doc), /Proceed with this plan, or change anything\?/);
    assert.match(flat(doc), /hosted Aculeus Deep Research is a separate product and is not included in the USD 49 plan/i);
  }
  assert.match(flat(readme), /`investigate` MCP prompt, .* ships with MCP server 0\.3\.6/);
  assert.match(readme, /claude plugin enable starglass-research@starglass --scope user/);
});

test('manual invocation rubric covers each start requirement', () => {
  const rubric = JSON.parse(read('test/invocation.cases.json'));
  assert.equal(rubric.kind, 'synthetic_manual_host_rubric');
  assert.match(rubric.scope, /no model execution or live acquisition is claimed/);
  assert.deepEqual(rubric.cases.map((item) => item.id), [
    'skill-invoked-plain-question',
    'skill-invoked-empty',
    'skill-invoked-quick-lookup',
    'skill-invoked-signed-out',
    'resume-saved-frame',
  ]);
  assert.deepEqual(Object.keys(rubric.host_invocations), rubric.host_variants);
  const covered = new Set();
  for (const item of rubric.cases) {
    assert.ok(item.messages.length > 0 && item.expected.length > 0 && item.forbidden.length > 0, item.id);
    for (const host of item.hosts) assert.ok(rubric.host_variants.includes(host), item.id + ': unknown host');
    // Each listed host gets exactly one opening message in its own invocation form.
    assert.deepEqual(item.messages.map((message) => message.host).sort(), [...item.hosts].sort(), item.id + ': one message per host');
    for (const message of item.messages) {
      const invocation = rubric.host_invocations[message.host];
      assert.ok(message.text === invocation || message.text.startsWith(invocation + ' '), item.id + ': ' + message.host + ' message must start with ' + invocation);
    }
    for (const requirement of item.requirements) {
      assert.ok(Object.hasOwn(rubric.start_requirements, requirement), item.id + ': unknown requirement');
      assert.ok(start.includes(rubric.start_requirements[requirement]), item.id + ': start section lacks ' + requirement);
      covered.add(requirement);
    }
  }
  assert.deepEqual([...covered].sort(), Object.keys(rubric.start_requirements).sort());
  const plain = rubric.cases[0];
  for (const message of plain.messages) assert.ok(!/deep research/i.test(message.text), 'plain question must not say deep research');
  assert.ok(plain.forbidden.some((line) => line.includes('source_search') && line.includes('source_fetch')));
});
