# Adaptive intake validation

This candidate changes the host-led workflow, not the acquisition or check APIs.
Release versions are client package 0.2.4, research protocol 0.2.5 and MCP server
0.3.5. They are independent. The backend must be released separately for
skill-free MCP hosts to receive the new instructions.

## Local checks

From this repository, run the dependency-free capture and policy checks:

```sh
node --test plugin/test/*.test.js
```

The cross-repository policy parity check is skipped unless the exact candidate
backend workflow is supplied. With both candidate repositories available and
Node.js 22.18+ or 24's supported TypeScript stripping:

```sh
STARGLASS_BACKEND_WORKFLOW=/absolute/path/to/aculeus/lib/plugin-research/workflow.ts node --test plugin/test/*.test.js
```

The local candidate run passed 13 tests: nine existing capture tests and four
policy/package tests, including the non-skipped cross-repository check. The
[13 synthetic scenarios](../plugin/test/research-intake.cases.json) are a
manual host evaluation rubric; no model execution is claimed. The parity check
compares the entire four-paragraph core intake policy exactly, and asserts its
availability in both initialization instructions and the catalogue protocol.

The backend's existing SDK transport fixture now checks MCP server version,
the exact initialization instructions and the complete advertised protocol.
Its new research-intake spec tests the policy contract. Run the normal backend
`npm run test:plugin-research -- --fixtures`, `npm run typecheck` and
`npm run lint` in a complete checkout with its dependencies before release.
A source-only cloud snapshot has no Next.js, TypeScript, tsx or MCP SDK
dependency installation; those aggregate backend checks remain unverified.

## Native-host and release acceptance

In Claude Code with the skill, OpenAI with the skill and OpenAI MCP without the
skill, conduct the scenario matrix as actual conversations. Record observed
replies, user plan decisions and tool calls. Verify that no long acquisition
starts before the displayed plan's actual user decision, that confidential
data stays local, and that context recovery preserves approved decisions.
Do not substitute static string checks or hand-authored traces for native proof.

After the coordinated release, verify the exact backend commit, live
initialization/catalogue versions and instructions, and installed client package
inventory. A client archive or repository push is not server deployment.
Current icon/logo assets are retained; neither this patch nor its tests establish
directory submission, approval, publication or a live listing logo.
