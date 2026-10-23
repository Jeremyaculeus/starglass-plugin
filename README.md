# Starglass Research

Starglass connects your AI host to selected official public-record sources. Claude Code, ChatGPT, and Codex supply research reasoning and keep the conversation; Starglass provides read-only source discovery, bounded passages with canonical URLs, retrieval dates, line locators and integrity hashes, plus mechanical checks for supplied evidence.

## Start a trial

Create a Starglass account at [aculeus.ai/start](https://aculeus.ai/start), verify your email, then activate the cardless 30-day trial at [your Starglass account](https://aculeus.ai/account/starglass). Set up a supported host at [aculeus.ai/connect](https://aculeus.ai/connect). Installing a client does not create an account or activate a trial.

After the trial, you may explicitly choose a subscription for **USD 49 per user per month**. The trial does not convert automatically. Active accounts include 1,000 MCP source operations per person per UTC calendar month. Website Quick Answer has a separate USD 5 provider-cost allowance for the whole trial and for each paid service month. Aculeus absorbs any provider cost from a final Quick Answer that exceeds its allowance; customers have no overage charge. MCP research uses your AI host and does not call a proprietary LLM or Parallel. Quick Answer is available on the website only. Hosted Deep Research, Case creation and Aculeus shared workspaces are separate. Your AI host subscription is also separate.

## Connect your host

### Codex

Codex OAuth sign-in, source search and fetch were tested with a fresh free-trial account on October 4, 2026. This is connection evidence, not a claim of research-quality parity or automatic token renewal.

```sh
codex mcp add starglass --url https://aculeus.ai/api/mcp
codex mcp login starglass --oauth-client-registration cimd --scopes profile,offline_access,plugin-research:read
npx skills add Jeremyaculeus/starglass-plugin --skill starglass-research --agent codex
```

The first two commands register and authenticate the MCP server; the `npx` command installs the research workflow skill. Node.js/npm are required for `npx`. The host CLI must already be installed. Start a new Codex session after installing the skill. If you installed the skill before 0.3.0, run `npx skills update starglass-research` (or re-run the `npx skills add` command above), then start a new session. The skill does not connect the server or grant account access.

### Claude Code

The plugin bundles the MCP connection and research skill. Sign in with your Starglass account when prompted:

```sh
claude plugin marketplace add Jeremyaculeus/starglass-plugin
claude plugin install starglass-research@starglass --scope user
claude plugin enable starglass-research@starglass --scope user
claude mcp login plugin:starglass-research:starglass-research
```

From plugin 0.3.0 the plugin starts enabled when you have not set it yourself, so the `enable` command is harmless if it is already on. A setting you saved earlier is kept across updates. The native Claude source workflow was recorded on October 2, 2026. No new Claude test is claimed here.

### ChatGPT

Custom MCP app availability depends on your plan and workspace settings. In ChatGPT, create a custom app using OAuth and this server URL: `https://aculeus.ai/api/mcp`. Sign in with your Starglass account, approve read-only access, then select Starglass in a new chat. The recorded personal Pro account completed sign-in, source discovery, search and fetch on October 2, 2026; this is historical evidence and does not guarantee availability for every account or imply a directory listing.

For current steps and other clients, see the [connection guide](https://aculeus.ai/connect). Support: [jeremy@aculeus.ai](mailto:jeremy@aculeus.ai). Read the [privacy policy](https://aculeus.ai/privacy).

## Start an investigation

Invoking Starglass tells your AI host to start an investigation. The skill instructs the host to restate your question, check the Starglass catalogue and ask the single missing decision that would most change the inquiry; "I don't know" is an accepted answer. When nothing material is missing, it instructs the host to show an editable Case Plan and ask "Proceed with this plan, or change anything?" The instructions make source searches and fetches wait for your approval of the plan you have seen; a question or change returns to the plan. Invoking Starglass is not approval of a plan, and neither invoking it nor approving a plan authorizes sending private material. A request for one or two fields of one named record, or an explicit quick lookup that stays within one record or one source family, skips the plan loop; a quick request that needs multi-source or multi-page acquisition still gets the plan. These are instructions to your host; no native host test of this start flow is claimed yet.

- **Claude Code:** run `/starglass-research:investigate <question>`, or invoke the skill with `/starglass-research:starglass-research <question>`. Claude may also load the skill itself when you ask it to research a public-record question. To resume a saved case, pass its folder: `/starglass-research:investigate <case-folder>`. The host is instructed to restate the saved scope and next action and ask you to confirm before new acquisition.
- **Codex:** in a new session after installing the skill, send `$starglass-research <question>`. Update an install from before 0.3.0 first, as described under Codex above.
- **Other MCP clients:** an `investigate` MCP prompt, which starts the same intake in clients that list MCP prompts, ships with MCP server 0.3.6. That server must be deployed to aculeus.ai before the prompt can be used. Until then, paste the [research request](docs/RESEARCH-WORKFLOW.md#a-research-request). The server also advertises the intake policy to skill-free hosts through its initialization instructions and `sources_list`; whether a given host reads them is not tested.

This is host-led research that uses your AI host's reasoning with the Starglass tools. Hosted Aculeus Deep Research is a separate product and is not included in the USD 49 plan.

## Research workflow and coverage

The native MCP toolchain has four tools: `sources_list`, `source_search`, `source_fetch` and `evidence_check`. The host does the investigation, synthesis and review. In Claude Code, the bundled `starglass-research:starglass-reviewer` subagent runs the skeptical review in a separate context; it inherits the session's model, so it is not a second model. Its `source_fetch` calls reopen records already in the case and count toward your monthly source operations. Follow the [research workflow](docs/RESEARCH-WORKFLOW.md), [portable evidence bundle guide](plugin/skills/starglass-research/references/evidence-bundle.md) and [host compatibility guide](plugin/skills/starglass-research/references/host-compatibility.md). Host file access, review features and tool availability depend on the app and session. Check the live tool schemas before using new modes or filters.

The seven original supported source families are USAspending federal awards, SEC filings, FEC committee registrations, identified congressional bills, GovInfo publications, lobbying disclosures and NPPES health-provider organizations. MCP server 0.4.0 adds five law sources: eCFR current regulations (not the official legal edition), Federal Register documents, U.S. Code sections, CourtListener court opinions (an archive, not the issuing court) and the Firecrawl Government Index for state and local discovery (never evidence). They ship off, appear as `not_configured` in the catalogue until the operator enables them, and need that server release deployed to aculeus.ai. Fetched law records carry `cited_authorities`, extracted references that are not verified authority. Coverage, credentials and availability are source-specific and shown by the catalogue. This is not a complete funding ledger, licensure check, tax-return or audit extractor, or universal document crawler. Authorized host searches and supplied files can fill gaps, with separate provenance.

An evidence check evaluates supplied passages, hashes and calculations. It does not certify that a source is true or that coverage is complete. Empty or failed searches do not prove records are absent. MCP requests do not route to Parallel or a proprietary LLM and do not store your research files or final answers in the research harness. Account and aggregate quota bookkeeping remain subject to the [privacy policy](https://aculeus.ai/privacy).

## Historical native evidence

[Watch the archived 79-second evidence walkthrough](https://raw.githubusercontent.com/Jeremyaculeus/starglass-plugin/main/docs/StarGlass-native-evidence-2026-10-02-r2.mp4) · [Captions](docs/StarGlass-native-evidence-2026-10-02-r2.srt) · [Scope and provenance](docs/README.md)

The walkthrough preserves dated October 2, 2026 operator results. It predates these self-serve trial instructions and is not a fresh trial test, continuous live recording, dedicated reviewer run or directory approval. It uses public/synthetic material. Automatic token renewal remains unverified.
