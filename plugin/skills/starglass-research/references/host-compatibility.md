# Host compatibility

Checked against primary documentation on October 2, 2026. Actual tool availability,
account permissions, host version, and workspace policies govern each session.

## Claude Code

The installed plugin packages this skill and an OAuth MCP connection. Claude Code
supports native subagents with separate context and tool access. Use an available
native research/review subagent after checking its permissions and access. Give it
the complete case frame and evidence bundle explicitly; do not assume it inherited
the conversation or skill. Keep the host's current model choices. A separate agent
context is useful for challenge but is not proof of a different model or independent
real-world investigation. Record the actual review method and model if visible.

MCP tool access can be restricted by host/subagent configuration. If the reviewer
cannot access captured sources, supply the bundle through authorized host files
or the brief; disclose any missing evidence. Do not edit host settings, create
credentials, or widen permissions to force delegation. A read-only task brief is
not itself an enforced permission restriction. The main host owns any bundle
writes and final integration; the reviewer returns findings.

Primary reference: [Claude Code subagents](https://code.claude.com/docs/en/sub-agents).

## ChatGPT and Codex

OpenAI plugin skills combine instructions and optional resources with an MCP
server's tools. Installing this Claude marketplace repository or making a custom
MCP connection does not prove that ChatGPT loaded this skill and its resources.
Confirm what the current host actually exposes. When the skill is unavailable,
the upgraded server advertises the core workflow through MCP initialization and
the `research_protocol` returned by `sources_list`. Read that live protocol; its
presence does not prove the host followed it. The host can also follow the
[bundled workflow](research-loop.md)
and supplied templates as instructions, subject to its tools and policies.

Do not promise native subagents, filesystem access, persistent artifact storage,
or custom MCP access in ChatGPT agent mode. In a session without native delegation,
perform a same-model separate skeptical pass and disclose that limitation. Without
file tools, keep the bundle as structured sections/attachments in the host chat
and offer an export the host actually supports. Do not claim files were saved.

Primary reference: [OpenAI plugin skills](https://developers.openai.com/plugins/concepts/skills).

## Old or partially refreshed tool catalogue

An older host may expose only `sources_list`, `source_search`, and `source_fetch`
with legacy search arguments. Use those live schemas. Explain unavailable checks,
source modes, or pagination; do not send guessed arguments. Continue useful research
and report its limitations, withholding confirmed figures when the required check
is absent. If appropriate, explain that reconnecting or refreshing tools through
the host's normal controls may expose a newer catalogue. Do not claim refresh or
deployment succeeded until new schemas are visible.
