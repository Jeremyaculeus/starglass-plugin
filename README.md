# StarGlass Research

StarGlass connects your AI host to selected official public-record sources. Claude Code, ChatGPT, and Codex supply research reasoning and keep the conversation; StarGlass provides read-only source discovery, bounded passages with canonical URLs, retrieval dates, line locators and integrity hashes, plus mechanical checks for supplied evidence.

## Start a trial

Create a Starglass account at [aculeus.ai/start](https://aculeus.ai/start), verify your email, then activate the cardless 30-day trial at [your StarGlass account](https://aculeus.ai/account/starglass). Set up a supported host at [aculeus.ai/connect](https://aculeus.ai/connect). Installing a client does not create an account or activate a trial.

After the trial, you may explicitly choose a subscription for **USD 49 per user per month**. The trial does not convert automatically. Active accounts include 1,000 MCP source operations per person per UTC calendar month. Website Quick Answer has a separate USD 5 provider-cost allowance for the whole trial and for each paid service month. Aculeus absorbs any provider cost from a final Quick Answer that exceeds its allowance; customers have no overage charge. MCP research uses your AI host and does not call a proprietary LLM or Parallel. Quick Answer is available on the website only. Hosted Deep Research, Case creation and Aculeus shared workspaces are separate. Your AI host subscription is also separate.

## Connect your host

### Codex

Codex OAuth sign-in, source search and fetch were tested with a fresh free-trial account on October 4, 2026. This is connection evidence, not a claim of research-quality parity or automatic token renewal.

```sh
codex mcp add starglass --url https://aculeus.ai/api/mcp
codex mcp login starglass --oauth-client-registration cimd --scopes profile,offline_access,plugin-research:read
npx skills add Jeremyaculeus/starglass-plugin --skill starglass-research --agent codex
```

The first two commands register and authenticate the MCP server; the `npx` command installs the research workflow skill. Node.js/npm are required for `npx`. The host CLI must already be installed. Start a new Codex session after installing the skill. The skill does not connect the server or grant account access.

### Claude Code

The plugin bundles the MCP connection and research skill. Sign in with your StarGlass account when prompted:

```sh
claude plugin marketplace add Jeremyaculeus/starglass-plugin
claude plugin install starglass-research@starglass --scope user
claude plugin enable starglass-research@starglass --scope user
claude mcp login plugin:starglass-research:starglass-research
```

The native Claude source workflow was recorded on October 2, 2026. No new Claude test is claimed here.

### ChatGPT

Custom MCP app availability depends on your plan and workspace settings. In ChatGPT, create a custom app using OAuth and this server URL: `https://aculeus.ai/api/mcp`. Sign in with your StarGlass account, approve read-only access, then select StarGlass in a new chat. The recorded personal Pro account completed sign-in, source discovery, search and fetch on October 2, 2026; this is historical evidence and does not guarantee availability for every account or imply a directory listing.

For current steps and other clients, see the [connection guide](https://aculeus.ai/connect). Support: [jeremy@aculeus.ai](mailto:jeremy@aculeus.ai). Read the [privacy policy](https://aculeus.ai/privacy).

## Research workflow and coverage

The native MCP toolchain has four tools: `sources_list`, `source_search`, `source_fetch` and `evidence_check`. The host does the investigation, synthesis and review. Follow the [research workflow](docs/RESEARCH-WORKFLOW.md), [portable evidence bundle guide](plugin/skills/starglass-research/references/evidence-bundle.md) and [host compatibility guide](plugin/skills/starglass-research/references/host-compatibility.md). Host file access, review features and tool availability depend on the app and session. Check the live tool schemas before using new modes or filters.

The seven supported source families are USAspending federal awards, SEC filings, FEC committee registrations, identified congressional bills, GovInfo publications, lobbying disclosures and NPPES health-provider organizations. Coverage, credentials and availability are source-specific and shown by the catalogue. This is not a complete funding ledger, licensure check, tax-return or audit extractor, or universal document crawler. Authorized host searches and supplied files can fill gaps, with separate provenance.

An evidence check evaluates supplied passages, hashes and calculations. It does not certify that a source is true or that coverage is complete. Empty or failed searches do not prove records are absent. MCP requests do not route to Parallel or a proprietary LLM and do not store your research files or final answers in the research harness. Account and aggregate quota bookkeeping remain subject to the [privacy policy](https://aculeus.ai/privacy).

## Historical native evidence

[Watch the archived 79-second evidence walkthrough](https://raw.githubusercontent.com/Jeremyaculeus/starglass-plugin/main/docs/StarGlass-native-evidence-2026-10-02-r2.mp4) · [Captions](docs/StarGlass-native-evidence-2026-10-02-r2.srt) · [Scope and provenance](docs/README.md)

The walkthrough preserves dated October 2, 2026 operator results. It predates these self-serve trial instructions and is not a fresh trial test, continuous live recording, dedicated reviewer run or directory approval. It uses public/synthetic material. Automatic token renewal remains unverified.
