# HydraBrain

HydraBrain is a browser extension that connects [HydraDB](https://hydradb.com) to your browser's side panel. It lets you query your HydraDB knowledge graph, ingest content from web pages, and trigger connector syncs -- all from inside the browser while you work.

**HydraDB Hackathon submission -- Multi-Connector Cross-Source Retrieval Challenge**

---

## What it does

HydraDB is a context layer for AI agents. It syncs data from tools like Slack, Linear, Notion, and GitHub into a single queryable knowledge graph. HydraBrain puts a query interface for that graph directly in your browser.

When you open the side panel, you can:

- Ask questions that span multiple connected sources ("Who filed this ticket and what did they say about it in Slack?")
- See how HydraDB routes each hop of a multi-hop question, which collection it queries, and whether it used fast or thinking mode
- Ingest the current page -- a GitHub issue, a Linear ticket, a Notion page -- into HydraDB with a single slash command
- Trigger connector syncs on demand
- Track how many queries used fast vs thinking mode and what the total latency was

The extension uses WebBrain's existing browser automation infrastructure (accessibility-tree extraction, side panel UI, slash command system, agent tool dispatch) and adds a HydraDB API layer on top of it.

---

## Architecture

```
Browser (HydraBrain Extension)
|
+-- Side panel (slash commands, query results, reasoning trace, metrics)
|
+-- Content script (page detection, accessibility-tree extraction)
|
+-- Background service worker
    |
    +-- HydraDB client (client.js)
        |
        +-- POST /query            -- fast and thinking mode queries
        +-- POST /context/ingest   -- document ingestion
        +-- POST /connectors/:id/sync -- trigger connector sync
        +-- GET  /connectors        -- list connector status
        |
        HTTPS --> api.hydradb.com
                  Database: hydramind
                  Collections:
                    linear_test   (Linear connector)
                    slack_test    (Slack connector)
                    notion_test   (Notion connector)
                    github_col    (GitHub connector)
```

### Key source files

| File | Purpose |
|---|---|
| `src/hydrabrain-extension/src/hydradb/client.js` | HydraDB API client: query, ingest, sync, metrics, multi-hop reasoning engine |
| `src/hydrabrain-extension/src/hydradb/demo-data.js` | Demo dataset (9 docs, 4 collections) and 5 benchmark questions with hop plans |
| `src/hydrabrain-extension/src/content/hydradb-page-detector.js` | Page type detection and accessibility-tree extraction for GitHub, Linear, Slack, Notion |
| `src/hydrabrain-extension/src/agent/tools.js` | Agent tool definitions: `query_hydradb`, `hydradb_ingest`, `hydradb_sync` |
| `src/hydrabrain-extension/src/agent/agent.js` | Tool dispatch: `_executeHydraDBQuery`, `_executeHydraDBIngest`, `_executeHydraDBSync` |
| `src/hydrabrain-extension/src/ui/sidepanel.js` | Slash command handlers and side panel rendering |
| `src/hydrabrain-extension/src/background.js` | Background message handlers for `hydrabrain_*` message types |

---

## Connectors

Four HydraDB connectors are configured on the `hydramind` database:

| Provider | Collection | Status |
|---|---|---|
| Slack | `slack_test` | Active, syncing hourly |
| Linear | `linear_test` | Active, syncing hourly |
| Notion | `notion_test` | Active, syncing hourly |
| GitHub | `github_col` | Active, connector error (provider page processing failed) |

The Slack, Linear, and Notion connectors pull data automatically every hour. The GitHub connector is configured but is currently returning an error from the provider side. Documents are ingested into `github_col` via `/context/ingest` to populate it for the benchmark.

---

## Slash Commands

| Command | Description |
|---|---|
| `/hydrabrain <query>` | Query HydraDB across connected sources |
| `/hydrabrain --metrics` | Show fast/thinking usage and latency for the current session |
| `/hydrabrain --demo` | Run all 5 benchmark questions with full reasoning traces |
| `/hydrabrain --ingest-demo` | Ingest the demo dataset into the 4 collections |
| `/sync [connector]` | Trigger connector sync (github, linear, slack, notion, or all) |

---

## Agent Tools

Three tools are available to the AI agent:

| Tool | Mode | Description |
|---|---|---|
| `query_hydradb` | Ask + Act | Query HydraDB with collection scoping and mode selection |
| `hydradb_ingest` | Act | Ingest the current page into the appropriate collection |
| `hydradb_sync` | Act | Trigger a connector sync |

`query_hydradb` is added to `ASK_ONLY_TOOLS` so it is available in read-only Ask mode.

---

## Setup

### Step 1: Load the extension

```bash
git clone https://github.com/Tasfia-17/hydrabrain.git
```

In Chrome:
1. Go to `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select `src/hydrabrain-extension`

### Step 2: Configure the API key

In the extension side panel, go to Settings and enter your HydraDB API key from [app.hydradb.com](https://app.hydradb.com).

Or set it programmatically:
```js
chrome.storage.local.set({ hydradb_api_key: 'sk_live_...' });
```

The key is stored in `chrome.storage.local` and never sent anywhere except `api.hydradb.com`.

### Step 3: Ingest the demo dataset

```
/hydrabrain --ingest-demo
```

This ingests 9 documents across 4 collections:

- 2 Linear tickets (BUG-123, FEAT-456)
- 3 GitHub items (PR #45, Commit abc123, Issue #67)
- 2 Slack threads (#eng, #payments)
- 2 Notion docs (ADR-001, Team Wiki)

### Step 4: Run the demo

```
/hydrabrain --demo
```

Runs all 5 benchmark questions with per-hop reasoning traces and latency measurements. See [BENCHMARK.md](BENCHMARK.md) for the full results.

### Step 5: Try individual queries

```
/hydrabrain Who filed BUG-123 and what did they say about the fix in Slack?
/hydrabrain What was decided about the OAuth migration?
/hydrabrain Which engineer has the most context on the auth service?
```

---

## Demo Scenario

The demo dataset represents an engineering team working on Phoenix Platform v2.0. The same people and projects appear across all 4 connected sources, which is what HydraDB is designed to handle.

### People (appear in all 4 sources)

| Person | GitHub | Slack | Linear | Notion |
|---|---|---|---|---|
| Alice Chen | `@alice-dev` | `@alice` | `alice@company.com` | Backend Lead |
| Bob Smith | `@bob-dev` | `@bob` | `bob@company.com` | Backend Engineer |
| Carol Davis | `@carol-dev` | `@carol` | `carol@company.com` | Tech Lead |
| Dave Wilson | `@dave-dev` | `@dave` | `dave@company.com` | SRE |

### Cross-source links

```
BUG-123 (Linear ticket)
  -> PR #45 (GitHub) -- the fix
  -> Commit abc123 (GitHub) -- the root cause
  -> Slack #eng thread -- the discussion
  -> ADR-001 (Notion) -- referenced as background

Alice Chen
  -> Creator of BUG-123 (Linear)
  -> Author of Commit abc123 (GitHub)
  -> Reviewer of PR #45 (GitHub)
  -> Author of ADR-001 (Notion)
  -> @alice in Slack #eng (Slack)
  -> Backend Lead, owns auth-service (Notion wiki)
```

---

## Benchmark Questions

Five questions that require multi-hop retrieval across sources. All results are from real API calls against `api.hydradb.com`. See [BENCHMARK.md](BENCHMARK.md) for the full breakdown with latency, scores, and per-hop analysis.

| Question | Sources | Hops | Fast | Thinking |
|---|---|---|---|---|
| Q1: Who filed BUG-123 and what did they say in Slack? | Linear + Notion + Slack | 3 | 3 | 0 |
| Q2: PRs referencing urgent tickets with Slack discussion? | GitHub + Linear + Slack | 3 | 2 | 1 |
| Q3: What was the OAuth decision and any contradictions? | Notion + Slack + Linear | 3 | 1 | 2 |
| Q4: Which engineer has the most auth-service context? | GitHub + Slack + Notion | 3 | 3 | 0 |
| Q5: Find the Stripe vs PayPal decision and follow-up concerns | Notion + Slack + Linear | 3 | 1 | 2 |

Fast mode handles 67% of hops. Thinking mode is used for contradiction detection, negative-existence queries, and implicit verbal decisions not recorded as structured data.

---

## HydraDB API Reference

Base URL: `https://api.hydradb.com`
Required headers: `Authorization: Bearer <key>`, `API-Version: 2`

| Endpoint | Method | Usage |
|---|---|---|
| `/databases/collections?database=hydramind` | GET | List collections |
| `/connectors?database=hydramind` | GET | List connectors |
| `/connectors/:id/sync?database=hydramind` | POST | Trigger sync |
| `/context/ingest` | POST | Ingest documents |
| `/context/status?database=hydramind&ids=<id>` | GET | Poll indexing status |
| `/query` | POST | Query with `mode`, `collection`, `query_by` |

Query body:
```json
{
  "database": "hydramind",
  "collection": "linear_test",
  "query": "natural language query",
  "type": "knowledge",
  "query_by": "hybrid",
  "mode": "fast",
  "query_apps": true
}
```

---

## License

MIT
