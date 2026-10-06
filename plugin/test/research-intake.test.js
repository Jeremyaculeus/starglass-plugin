'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const pluginRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pluginRoot, '..');
const read = (relative) => fs.readFileSync(path.join(pluginRoot, relative), 'utf8');
const guide = read('skills/starglass-research/references/research-intake.md');
const rubric = JSON.parse(read('test/research-intake.cases.json'));
const expectedCaseIds = [
  "fully-specified",
  "partial-adaptive",
  "contradictory-context",
  "unknown-identifier",
  "delegated-dont-know",
  "go-ahead-before-plan",
  "go-ahead-after-plan",
  "private-material",
  "leading-allegation",
  "source-injection",
  "changed-capabilities",
  "context-reset",
  "simple-lookup"
];

test('manual synthetic rubric covers each intake branch and all host variants', () => {
  assert.equal(rubric.kind, 'synthetic_manual_host_rubric');
  assert.match(rubric.scope, /no model execution or live acquisition is claimed/);
  assert.deepEqual(rubric.host_variants, ['claude-code-skill-loaded', 'openai-skill-loaded', 'openai-mcp-without-skill']);
  assert.deepEqual(rubric.cases.map((item) => item.id), expectedCaseIds);
  assert.equal(new Set(rubric.cases.map((item) => item.id)).size, rubric.cases.length);
  const covered = new Set();
  for (const item of rubric.cases) {
    assert.ok(item.messages.length > 0, item.id);
    assert.ok(item.expected.length > 0 && item.forbidden.length > 0, item.id);
    for (const requirement of item.requirements) {
      assert.ok(Object.hasOwn(rubric.policy_requirements, requirement), item.id + ': unknown requirement');
      assert.ok(guide.includes(rubric.policy_requirements[requirement]), item.id + ': missing documented policy');
      covered.add(requirement);
    }
  }
  assert.deepEqual([...covered].sort(), Object.keys(rubric.policy_requirements).sort());
});

test('skill, loop, bundle and workflow make intake discoverable without inventing approval', () => {
  for (const relative of ['skills/starglass-research/SKILL.md', 'skills/starglass-research/references/research-loop.md', 'skills/starglass-research/references/evidence-bundle.md']) {
    assert.match(read(relative), /research-intake\.md/);
  }
  const workflow = fs.readFileSync(path.join(repoRoot, 'docs/RESEARCH-WORKFLOW.md'), 'utf8');
  assert.match(workflow, /actual user start decision/);
  const frame = JSON.parse(read('skills/starglass-research/templates/case-frame.json'));
  assert.equal(frame.contract, 'starglass-quality-client-v1');
  assert.equal(frame.intake.plan_decision.status, 'pending');
  assert.equal(frame.intake.plan_decision.approved_revision, null);
  assert.equal(frame.intake.plan_decision.user_response_ref, null);
  assert.equal(frame.intake.plan_decision.user_response_text, null);
  assert.deepEqual(frame.intake.assumptions, []);
  assert.deepEqual(frame.intake.researchable_unknowns, []);
  assert.match(guide, /must not be sent as new fields to/);
  const stepOne = read('skills/starglass-research/SKILL.md').split('1. Read existing answers')[1].split('2. Preserve the actual')[0].replace(/\s+/g, ' ');
  assert.ok(stepOne.includes('sources_list') && stepOne.includes('show the Case Plan'));
  assert.ok(stepOne.indexOf('sources_list') < stepOne.indexOf('show the Case Plan'));
  assert.ok(stepOne.includes('catalogue discovery is not source acquisition'));
});

// Optional two-repository integration check. It loads the actual pure TS protocol
// on Node 22.18+/24, or a caller-supplied supported TS runtime. No API/model calls.
test('installed skill and skill-free server expose identical core intake policy', {
  skip: !process.env.STARGLASS_BACKEND_WORKFLOW && 'Set STARGLASS_BACKEND_WORKFLOW to the pinned backend workflow.ts for cross-repository parity'
}, async () => {
  const backendPath = path.resolve(process.env.STARGLASS_BACKEND_WORKFLOW);
  const { RESEARCH_INTAKE_STEPS, RESEARCH_PROTOCOL, RESEARCH_SERVER_INSTRUCTIONS } = await import(pathToFileURL(backendPath).href);
  assert.equal(RESEARCH_PROTOCOL.version, '0.2.5');
  assert.equal(RESEARCH_INTAKE_STEPS.length, 4);
  assert.equal(RESEARCH_PROTOCOL.steps.length, 12);
  assert.deepEqual(RESEARCH_PROTOCOL.steps.slice(0, 4), RESEARCH_INTAKE_STEPS);
  const planStep = RESEARCH_INTAKE_STEPS[3];
  assert.ok(planStep.includes('sources_list') && planStep.includes('show a compact editable Case Plan'));
  assert.ok(planStep.indexOf('sources_list') < planStep.indexOf('show a compact editable Case Plan'));
  assert.match(planStep, /non-acquisition discovery before finalizing the plan/);
  assert.match(planStep, /For long research, source_search and source_fetch wait for that displayed plan's actual user decision/);
  const core = guide.split('## Core policy\n\n')[1].split('\n\n## Conversation shape')[0];
  assert.deepEqual(core.split('\n\n'), [...RESEARCH_INTAKE_STEPS]);
  for (const phrase of Object.values(rubric.policy_requirements)) {
    assert.ok(RESEARCH_PROTOCOL.steps.join(' ').includes(phrase), 'catalogue lacks: ' + phrase);
    assert.ok(RESEARCH_SERVER_INSTRUCTIONS.includes(phrase), 'initialize lacks: ' + phrase);
  }
});

test('package versions agree and preserve the MCP connection and capture opt-in', () => {
  const manifest = JSON.parse(read('.claude-plugin/plugin.json'));
  const marketplace = JSON.parse(fs.readFileSync(path.join(repoRoot, '.claude-plugin/marketplace.json'), 'utf8'));
  assert.equal(manifest.version, '0.2.4');
  assert.equal(marketplace.plugins[0].version, manifest.version);
  assert.ok(fs.existsSync(path.join(pluginRoot, manifest.icon)));
  const mcp = JSON.parse(read('.mcp.json'));
  assert.equal(mcp.mcpServers['starglass-research'].url, 'https://aculeus.ai/api/mcp');
  assert.match(read('scripts/capture.js'), /\.starglass-capture\.json/);
});
