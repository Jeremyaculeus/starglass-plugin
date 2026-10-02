# StarGlass Research

StarGlass connects selected official public-record APIs to your own Claude Code or ChatGPT research session. Your host account does the investigation, reasoning, synthesis, and skeptical review. StarGlass supplies read-only discovery, bounded source passages with canonical URLs, retrieval dates, line locators and integrity hashes, and mechanical evidence checking when exposed by your connection.

This repository contains the client workflow and Claude Code marketplace plugin. The hosted backend and private research records are not included. This is an operator pilot; installing the client does not automatically grant service access or imply approval by a vendor directory.

## Install in Claude Code

Use your existing Claude Code subscription login, then run:

```sh
claude plugin marketplace add Jeremyaculeus/starglass-plugin
claude plugin install starglass-research@starglass --scope user
claude plugin enable starglass-research@starglass --scope user
```

Start a fresh Claude Code session. Authenticate the bundled connection:

```sh
claude mcp login plugin:starglass-research:starglass-research
```

Sign in with the Aculeus account enabled for the pilot and consent to `plugin-research:read`. The native client may also request `offline_access` for renewal. No API key or hosted research workspace is required. If you previously added the same endpoint manually, that entry takes precedence over a plugin entry; choose one installation method to avoid testing the wrong connection.

## Research workflow

The skill guides the host through a case frame, purposeful multi-source acquisition, iterative gap closure, evidence and claim ledgers, synthesis from inspected source context, skeptical review, mechanical checks, and repair before a calibrated report. Your host's reasoning and agent tokens are intended for this work. The service does not call model APIs or Parallel.

Use the [research workflow](docs/RESEARCH-WORKFLOW.md) for a research request and the [portable evidence bundle guide](plugin/skills/starglass-research/references/evidence-bundle.md) for reusable templates. The bundle belongs in your authorized host workspace or chat; StarGlass does not require a hosted Case or save a research archive. Authorized host search and supplied documents can fill gaps such as audits, tax returns, PDFs and state records, with separate provenance.

## Test the connection

Ask Claude to use the `starglass-research` skill and:

1. List the source catalogue and its limits.
2. Search NPPES for Mayo Clinic organizations, using a small first page for this connection test.
3. Fetch a record using its actual returned identifier, with lines 1–30.
4. Report the canonical URL, publisher, retrieval date, returned range and receipt hashes. State truncation and what the passage supports.

Successful configuration is not evidence that every provider is healthy. Do not invent identifiers or treat a failed/empty search as proof that records do not exist.

This connection test is not a complete research case. For substantive questions, follow relevant search pages and fetched passages, test rival explanations, inspect all material evidence, and report blocked coverage. Inspect your live tool schema before using new modes, filters, pagination or `evidence_check`; an older three-tool connection cannot supply those capabilities until refreshed. Withhold confirmed figure labels when required checks are unavailable.

## ChatGPT

The pilot supports a custom OAuth MCP connection at `https://aculeus.ai/api/mcp`, with the same read-only tools. Connect it using your pilot-enabled Aculeus account. Your ChatGPT plan and workspace determine whether custom connections are available. On October 2, 2026, a personal ChatGPT Pro account completed native sign-in, catalogue discovery, search and fetch using the identifier returned by that search. The installed Claude Code plugin completed the same source workflow. No public directory listing is claimed. A custom MCP connection does not prove that ChatGPT loaded this repository's skill or that agent mode can use the connection. Follow the [host compatibility guide](plugin/skills/starglass-research/references/host-compatibility.md) and disclose unavailable file, review, or checking capabilities.

## Coverage and cost boundaries

Acquisition tools are `sources_list`, `source_search` and `source_fetch`; `evidence_check` adds mechanical checks when your live schema exposes it. Adapter coverage includes federal prime contracts/grants (USAspending), SEC filing discovery, FEC committee registrations, explicitly identified congressional bills, GovInfo, lobbying disclosures and NPPES organizations. Consult the actual catalogue for credentials, availability, modes and limits; catalogue availability can change. Confirmed figures require both a successful mechanical check and host judgment that the evidence supports the exact claim. A consistency result does not certify real-world truth.

This is not a complete funding ledger, licensure check or universal document crawler. Tax returns, organization-hosted audits, board documents and state records may require authorized host search or supplied documents. Keep their provenance separate from StarGlass receipts. The service does not call Parallel or model APIs, silently acquire paid records, or save your queries, documents or final answers in its research harness. Your host controls its conversation history. Account/connection and aggregate quota bookkeeping remain subject to the service privacy policy and provider operations.

The pilot allows 1,000 source operations per enabled person per month, 60 MCP requests per minute and no automatic paid overage. Search/fetch failures and repeats consume operations; the catalogue does not. Limits are shared across connected hosts. A receipt's hashes identify returned representations; they do not certify that a source's claims are true.

## Connections and support

Manage or revoke connections at [StarGlass account access](https://aculeus.ai/plugin/account). Revocation blocks new service requests; disconnect in your host to clear its stored credentials. A revoked pilot connection requires operator restoration; the host may also require fresh sign-in. Revocation and recovery were tested in both hosts. Automatic token renewal still awaits verification after natural expiry. Neither revocation nor service bookkeeping removes a host's saved conversations.

[Product](https://aculeus.ai/plugins) · [Support](https://aculeus.ai/talk-to-us) · [Privacy](https://aculeus.ai/privacy) · [Terms](https://aculeus.ai/terms)

## Recorded native evidence

[Watch the 79-second evidence walkthrough](https://raw.githubusercontent.com/Jeremyaculeus/starglass-plugin/main/docs/StarGlass-native-evidence-2026-10-02-r2.mp4) · [Captions](docs/StarGlass-native-evidence-2026-10-02-r2.srt) · [Scope and provenance](docs/README.md)

The walkthrough uses dated screenshots of actual October 2, 2026 operator results: returned NPPES identifier, bounded citation receipt, revocation refusal and restored host connections. It is a captioned, silent evidence sequence, not a continuous live recording, dedicated reviewer run or directory approval. It contains public/synthetic material only. Automatic token renewal remains pending verification.
