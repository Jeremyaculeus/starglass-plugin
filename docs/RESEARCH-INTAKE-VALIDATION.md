# Adaptive intake validation

This candidate changes the host-led workflow, not the acquisition or check APIs.
Release versions are client package 0.4.0, research protocol 0.2.5 and MCP server
0.3.6 for the intake prompt (MCP server 0.4.0 adds the law sources and includes
it). They are independent. The backend must be released separately for
skill-free MCP hosts to receive the new instructions and the `investigate`
prompt; until that release is deployed, hosts keep the previously deployed
server's instructions and no prompt.

## Invocation starts intake

From client package 0.3.0, invoking the skill
(`/starglass-research:starglass-research <question>` in Claude Code,
`$starglass-research <question>` in Codex) or the Claude Code command
`/starglass-research:investigate <question>` instructs the host to start
adaptive intake. The instructed first reply restates the question, inspects the
tool schemas, calls `sources_list({})` as discovery only, then asks the single
most consequential missing decision or shows the compact Case Plan with "Proceed
with this plan, or change anything?" `source_search` and `source_fetch` are
instructed to wait for the user's approval of the displayed plan; a question or
change returns to the plan. Intake is the default; only one or two fields of one
named record or identifier, or an explicit quick lookup that stays within one
record or one source family, take the bounded-lookup path. An empty invocation is
instructed to ask what to investigate, missing or signed-out tools to point to
https://aculeus.ai/connect without an invented catalogue, and a saved case folder
to resume an approved frame without repeating intake once the user confirms its
next action. MCP server 0.3.6 adds the same start as the `investigate` prompt,
registered without arguments, and a short instruction prefix; its
initialization instructions stay within the 4,096 characters Claude Code keeps.
Protocol 0.2.5 and its four intake steps are unchanged. The plugin now starts
enabled (`defaultEnabled: true`) and bundles the `starglass-reviewer` subagent,
which inherits the session model. This is the instructed behavior; no native run
is claimed.

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

The local candidate run passed 21 tests: nine capture tests, four
policy/package tests including the non-skipped cross-repository check, and eight
invocation tests. The [13 synthetic scenarios](../plugin/test/research-intake.cases.json)
and [five invocation scenarios](../plugin/test/invocation.cases.json) are manual
host evaluation rubrics; no model execution is claimed. The parity check
compares the entire four-paragraph core intake policy exactly, and asserts its
availability in both initialization instructions and the catalogue protocol.

The backend's existing SDK transport fixture now checks MCP server version,
the exact initialization instructions and the complete advertised protocol.
Its research-intake spec tests the policy contract, and its research-prompt
spec checks the `investigate` prompt through the SDK without source calls.
Run the normal backend `npm run test:plugin-research -- --fixtures`,
`npm run typecheck` and `npm run lint` in a complete checkout with its
dependencies before release.
A source-only cloud snapshot has no Next.js, TypeScript, tsx or MCP SDK
dependency installation; those aggregate backend checks remain unverified.

## Native-host and release acceptance

In Claude Code with the skill, OpenAI with the skill and OpenAI MCP without the
skill, conduct the scenario matrices as actual conversations, including a plain
question invoked without the words "deep research". Record observed
replies, user plan decisions and tool calls. Verify that no long acquisition
starts before the displayed plan's actual user decision, that confidential
data stays local, and that context recovery preserves approved decisions.
Do not substitute static string checks or hand-authored traces for native proof.

After the coordinated release, verify the exact backend commit, live
initialization/catalogue versions and instructions, and installed client package
inventory. A client archive or repository push is not server deployment.
Current icon/logo assets are retained; neither this patch nor its tests establish
directory submission, approval, publication or a live listing logo.
