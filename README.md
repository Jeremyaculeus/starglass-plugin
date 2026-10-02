# StarGlass Research

StarGlass connects selected official public-record APIs to your own Claude Code or ChatGPT research session. Your host account does the reasoning. StarGlass supplies read-only discovery and bounded source passages with canonical URLs, retrieval dates, line locators and integrity hashes.

This repository contains the client workflow and Claude Code marketplace plugin. The hosted backend and private research records are not included. This is an operator pilot; installing the client does not automatically grant service access or imply approval by a vendor directory.

## Install in Claude Code

Use your existing Claude Code subscription login, then run:

```sh
claude plugin marketplace add Jeremyaculeus/starglass-plugin
claude plugin install starglass-research@starglass --scope user
```

Start a fresh Claude Code session. Authenticate the bundled connection:

```sh
claude mcp login plugin:starglass-research:starglass-research
```

Sign in with the Aculeus account enabled for the pilot and consent to `plugin-research:read`. The native client may also request `offline_access` for renewal. No API key or hosted research workspace is required. If you previously added the same endpoint manually, that entry takes precedence over a plugin entry; choose one installation method to avoid testing the wrong connection.

## Test a source workflow

Ask Claude to use the `starglass-research` skill and:

1. List the source catalogue and its limits.
2. Search NPPES for Mayo Clinic organizations, with at most three results.
3. Fetch a record using its actual returned identifier, with lines 1–30.
4. Report the canonical URL, publisher, retrieval date, returned range and receipt hashes. State truncation and what the passage supports.

Successful configuration is not evidence that every provider is healthy. Do not invent identifiers or treat a failed/empty search as proof that records do not exist.

## ChatGPT

The pilot supports a custom OAuth MCP connection at `https://aculeus.ai/api/mcp`, with the same read-only tools. Connect it using your pilot-enabled Aculeus account. Your ChatGPT plan and workspace determine whether custom connections are available. The independent search-to-fetch compatibility check is pending the reviewed server update; a supplied-identifier native fetch has passed. No public directory listing is claimed.

## Coverage and cost boundaries

The three tools are `sources_list`, `source_search` and `source_fetch`. Adapter coverage includes federal prime contracts/grants (USAspending), SEC filing discovery, FEC committee registrations, explicitly identified congressional bills, GovInfo, lobbying disclosures and NPPES organizations. SEC is currently unconfigured in the pilot; consult the actual catalogue.

This is not a complete funding ledger, licensure check or universal document crawler. Tax returns, organization-hosted audits, board documents and state records may require authorized host search or supplied documents. Keep their provenance separate from StarGlass receipts. The service does not call Parallel or model APIs, silently acquire paid records, or save your queries, documents or final answers in its research harness. Your host controls its conversation history. Account/connection and aggregate quota bookkeeping remain subject to the service privacy policy and provider operations.

The pilot allows 1,000 source operations per enabled person per month, 60 MCP requests per minute and no automatic paid overage. Search/fetch failures and repeats consume operations; the catalogue does not. Limits are shared across connected hosts. A receipt's hashes identify returned representations; they do not certify that a source's claims are true.

## Connections and support

Manage or revoke connections at [StarGlass account access](https://aculeus.ai/plugin/account). Revocation blocks new service requests; disconnect in your host to clear its stored credentials. A revoked pilot connection requires operator restoration and fresh host sign-in to reconnect. Neither revocation nor service bookkeeping removes a host's saved conversations.

[Product](https://aculeus.ai/plugins) · [Support](https://aculeus.ai/talk-to-us) · [Privacy](https://aculeus.ai/privacy) · [Terms](https://aculeus.ai/terms)
