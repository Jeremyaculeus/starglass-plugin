---
name: deep-research
description: Start a StarGlass investigation in your own AI host. Asks the missing intake questions, then shows an editable Case Plan for your decision before any long source acquisition. Pass a saved case folder to resume an approved investigation.
argument-hint: "[question: who or what, period, what you need] or [saved case folder]"
disable-model-invocation: true
metadata:
  internal: true
---

Research request: $ARGUMENTS

Load the `starglass-research:starglass-research` skill now with this request as
its arguments, and follow its "Start here when this skill is invoked" section.
If the Skill tool cannot load it, read
`${CLAUDE_PLUGIN_ROOT}/skills/starglass-research/SKILL.md` and follow the same
section.

- If the request is empty, ask "What should StarGlass investigate?" and stop.
- If the request is a path to a saved case folder or its `case-frame.json`, follow
  that section's resume step instead of starting intake again.

Running this command starts adaptive intake. It does not approve a Case Plan or
start long acquisition; only the user's approval of the displayed plan does.
Neither this command nor plan approval authorizes sending private data; that
needs the user's explicit permission for the specific data and destination.
Hosted Aculeus Deep Research is a separate product. This runs in the user's own
AI host with the StarGlass tools.
