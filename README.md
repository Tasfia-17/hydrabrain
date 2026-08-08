# HydraBrain

> **Your browser becomes the universal connector to your company's brain.**

HydraBrain is an AI-powered browser extension that integrates directly with [HydraDB](https://hydradb.com) — the graph-native context layer for AI agents. It turns your browser into a universal knowledge ingestion and retrieval layer across GitHub, Linear, Slack, Notion, and any web-accessible tool.

**Submission for the HydraDB Hackathon — Multi-Connector Cross-Source Retrieval Challenge**

---

## The Core Idea

Most tools that integrate HydraDB use command-line scripts or web apps. HydraBrain takes a different approach: it runs *inside your browser as an extension*, making HydraDB accessible at all times while you work.

**Why this wins:**
- **Browser-native.** The side panel is always visible while you browse GitHub, Linear, Slack, or Notion.
- **Universal ingestion.** Any web page — including internal tools without APIs — can be synced to HydraDB using the extension's accessibility-tree extraction.
- **Multi-hop reasoning, live.** Ask questions spanning multiple sources and watch the reasoning trace appear in real time.
- **Fast/Thinking mode tracker.** Dashboard showing which queries needed deep reasoning vs. fast lookup — judges can verify the latency vs. accuracy tradeoff.

---

## Features

### 1. Multi-Connector Knowledge Ingestion (4 connectors)

HydraBrain ingests data from 4 native HydraDB connectors into separate collections:

| Connector | Collection | Contents |
|---|---|---|
| **Linear** | `linear_test` | Tickets, priorities, assignees, comments, project links |
| **GitHub** | `github_col` | PRs, commits, issues, authors, reviewers, linked tickets |
| **Slack** | `slack_test` | Messages with author + timestamps, threads, decisions |
| **Notion** | `notion_test` | Architecture decision records, team wikis, design docs |

### 2. Universal Browser Connector

The content script (`hydradb-page-detector.js`) detects supported pages and extracts structured data using the accessibility tree — no API key needed for the source app:

- **GitHub** issues, PRs, commits → extracts title, state, assignees, labels, body, comments
- **Linear** tickets → extracts ticket ID, priority, status, assignee, project, description
- **Slack** channels → extracts messages with author and timestamp
- **Notion** pages → extracts full page content and title

One click syncs the current page to HydraDB:
```
/hydrabrain --sync-page
```

### 3. Multi-Hop Reasoning Engine

The `executeReasoningPlan()` function in `client.js` runs a sequence of HydraDB queries where each hop builds on the previous result. It auto-selects fast vs. thinking mode per hop using heuristics:

- **Fast mode** for direct lookups, known-entity queries, metadata retrieval
- **Thinking mode** for temporal comparisons, contradiction detection, implicit relationship inference

### 4. Live Reasoning Trace in Side Panel

When `/hydrabrain <question>` is run, the side panel shows each hop with:
- Source collection queried
- Mode used (⚡ Fast / 🧠 Thinking)
- Latency and cost per hop
- Relevance score and matched content

### 5. Fast vs. Thinking Dashboard

`/hydrabrain --metrics` shows session-level statistics:
```
Session Queries:  47
─────────────────────────────
Fast Mode:      38 (81%)  ████████████
Thinking Mode:   9 (19%)  ██

Avg Latency:    87ms (fast) / 420ms (thinking)
Total Cost:     $0.34
HydraDB Calls:  142
```

### 6. Slash Commands

| Command | Description |
|---|---|
| `/hydrabrain <query>` | Query HydraDB across all sources |
| `/hydrabrain --metrics` | Show fast/thinking usage dashboard |
| `/hydrabrain --demo` | Run all 5 competition questions with reasoning traces |
| `/hydrabrain --ingest-demo` | Ingest the demo dataset (GitHub + Linear + Slack + Notion) |
| `/sync [connector]` | Trigger HydraDB connector sync |

### 7. Agent Tools

Three new tools available to the AI agent:

| Tool | Mode | Description |
|---|---|---|
| `query_hydradb` | Ask + Act | Query HydraDB with collection scoping and mode selection |
| `hydradb_ingest` | Act | Sync current page content into HydraDB |
| `hydradb_sync` | Act | Trigger connector sync (github/linear/slack/notion/all) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  BROWSER (HydraBrain Extension)                              │
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Side Panel UI   │  │ Content      │  │ Background     │  │
│  │                 │  │ Script       │  │ Service Worker │  │
│  │ /hydrabrain cmd │  │              │  │                │  │
│  │ /sync cmd       │  │ Page detect: │  │ HydraDB Client │  │
│  │ Query results   │  │ • GitHub     │  │ Ingest/Query   │  │
│  │ Reasoning trace │  │ • Linear     │  │ Sync/Metrics   │  │
│  │ Metrics dash    │  │ • Slack      │  │ Multi-hop plan │  │
│  └─────────────────┘  │ • Notion     │  └────────────────┘  │
│                       └──────────────┘                      │
└──────────────────────────────────────────────────────────────┘
                              │
                   API calls (HTTPS)
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  HYDRADB  (api.hydradb.com, API-Version: 2)                  │
│                                                              │
│  Database: hydramind                                         │
│                                                              │
│  Collections:                                                │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐   │
│  │linear_test│ │github_col │ │slack_test │ │notion_test │   │
│  └───────────┘ └───────────┘ └───────────┘ └────────────┘   │
│                                                              │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │ 4 Connectors │  │ Knowledge Graph│  │ Query Engine     │ │
│  │ Linear       │  │ Entity links   │  │ fast / thinking  │ │
│  │ GitHub       │  │ Cross-source   │  │ hybrid / text    │ │
│  │ Slack        │  │ relations      │  │ metadata filters │ │
│  │ Notion       │  └────────────────┘  └──────────────────┘ │
│  └──────────────┘                                            │
└──────────────────────────────────────────────────────────────┘
```

### Key Source Files

| File | Purpose |
|---|---|
| `src/hydrabrain-extension/src/hydradb/client.js` | HydraDB API client — query, ingest, sync, metrics, multi-hop reasoning engine |
| `src/hydrabrain-extension/src/hydradb/demo-data.js` | Demo dataset (8 docs) + 5 competition questions with hop plans |
| `src/hydrabrain-extension/src/content/hydradb-page-detector.js` | Page type detection + accessibility-tree extraction for 4 platforms |
| `src/hydrabrain-extension/src/agent/tools.js` | Agent tool definitions: `query_hydradb`, `hydradb_ingest`, `hydradb_sync` |
| `src/hydrabrain-extension/src/agent/agent.js` | Tool dispatch (`executeTool`) + `_executeHydraDB*` handler methods |
| `src/hydrabrain-extension/src/ui/sidepanel.js` | Slash command handlers + side panel UI rendering functions |
| `src/hydrabrain-extension/src/background.js` | Background message handlers for all `hydrabrain_*` message types |

---

## Setup & Reproducibility

### Step 1: Load the extension

```bash
git clone https://github.com/Tasfia-17/hydrabrain.git
```

In Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `src/hydrabrain-extension`

### Step 2: Configure API keys

In the extension side panel → Settings:
- **HydraDB API Key** — your key from [app.hydradb.com](https://app.hydradb.com)
- **LLM Provider** — configure any OpenAI-compatible provider (OpenRouter recommended)

Or set programmatically:
```js
chrome.storage.local.set({ hydradb_api_key: 'sk_live_...' });
```

### Step 3: Ingest demo data

Open the extension side panel, type:
```
/hydrabrain --ingest-demo
```

This ingests 8 documents across 4 collections:
- 2 Linear tickets (BUG-123, FEAT-456)
- 3 GitHub items (PR #45, Commit abc123, Issue #67)
- 2 Slack threads (#eng, #payments)
- 2 Notion docs (ADR-001, Team Wiki)

### Step 4: Run the demo

```
/hydrabrain --demo
```

Runs all 5 competition questions with full reasoning traces and latency measurements.

### Step 5: Try individual queries

```
/hydrabrain Who filed BUG-123 and what did they say in Slack about the fix?
/hydrabrain What was decided about the OAuth migration?
/hydrabrain Which engineer has the most context on the auth service?
```

---

## Demo Scenario

The demo data represents a fictional engineering team working on **Phoenix Platform v2.0**. The same people and projects appear across all 4 sources, testing HydraDB's cross-source entity resolution:

### People (appear across all 4 sources)

| Person | GitHub | Slack | Linear | Notion Role |
|---|---|---|---|---|
| **Alice Chen** | `@alice-dev` | `@alice` | `alice@company.com` | Backend Lead |
| **Bob Smith** | `@bob-dev` | `@bob` | `bob@company.com` | Backend Engineer |
| **Carol Davis** | `@carol-dev` | `@carol` | `carol@company.com` | Tech Lead |
| **Dave Wilson** | `@dave-dev` | `@dave` | `dave@company.com` | SRE |

### Cross-Source Entity Links

```
BUG-123 (Linear ticket)
  → PR #45 (GitHub) — the fix
  → Commit abc123 (GitHub) — the cause
  → Slack #eng thread — the discussion
  → ADR-001 (Notion) — referenced as background

Alice Chen
  → Creator of BUG-123 (Linear)
  → Author of Commit abc123 (GitHub)
  → Reviewer of PR #45 (GitHub)
  → Author of ADR-001 (Notion)
  → @alice in Slack #eng (Slack)
  → Backend Lead on auth-service (Notion wiki)
```

---

## 5 Competition Demo Questions

### Q1: Who filed BUG-123, which project are they on, and what did they say about the fix in Slack?

**Requires:** Linear → Notion → Slack (3 hops)

| Hop | Source | Mode | Latency | Score | Answer |
|---|---|---|---|---|---|
| 1 | Linear | ⚡ fast | 1908ms | 0.882 | Alice Chen filed it, assigned to Bob, Project: Phoenix Platform v2.0 |
| 2 | Notion | ⚡ fast | 1980ms | 0.913 | Alice is Backend Lead on Phoenix Platform v2.0 |
| 3 | Slack | ⚡ fast | 1358ms | 0.901 | Alice said: *"Found root cause of BUG-123. Token refresh middleware throws TokenExpiredError but no catch block. My fault — removed try/catch in the Jan 8 refactor."* |

**Total: 5,246ms | $0.006 | All fast ✅**

---

### Q2: Show PRs referencing urgent tickets, and whether they have Slack discussion

**Requires:** GitHub → Linear → Slack (3 hops, negative query on Hop 3)

| Hop | Source | Mode | Latency | Score | Answer |
|---|---|---|---|---|---|
| 1 | GitHub | ⚡ fast | 1895ms | 0.831 | PR #45 — fixes BUG-123 (urgent) |
| 2 | Linear | ⚡ fast | 1984ms | 0.889 | BUG-123 confirmed Urgent/P0, blocking mobile |
| 3 | Slack | 🧠 thinking | 3834ms | 0.899 | PR #45 WAS discussed — Carol approved, Bob got credit |

**Total: 7,713ms | $0.019 | 2 fast + 1 thinking ✅**

---

### Q3: What was decided about the OAuth migration, and has anyone contradicted it?

**Requires:** Notion → Slack → Linear (3 hops, temporal + contradiction reasoning)

| Hop | Source | Mode | Latency | Score | Answer |
|---|---|---|---|---|---|
| 1 | Notion | 🧠 thinking | 7710ms | **0.940** | ADR-001: Custom OAuth with node-oauth2-server. Auth0 rejected ($2k/mo), Cognito rejected (vendor lock-in) |
| 2 | Slack | 🧠 thinking | 3930ms | 0.767 | Slack confirms same decision — Carol proposed, Alice agreed |
| 3 | Linear | ⚡ fast | 1793ms | 0.873 | FEAT-456 scope unchanged, no contradictions found |

**Total: 13,433ms | $0.034 | 1 fast + 2 thinking ✅**

---

### Q4: Which engineer has the most context on the auth service?

**Requires:** GitHub → Slack → Notion (3 hops, aggregation across sources)

| Hop | Source | Mode | Latency | Score | Answer |
|---|---|---|---|---|---|
| 1 | GitHub | ⚡ fast | 2391ms | 0.907 | Alice authored Commit abc123, reviewed PR #45; Bob authored PR #45 |
| 2 | Slack | ⚡ fast | 1784ms | 0.904 | Alice identified root cause, led discussion, found memory leak |
| 3 | Notion | ⚡ fast | 1688ms | **0.918** | Alice Chen is Backend Lead, owns auth-service, leads FEAT-456 |

**Total: 5,863ms | $0.006 | All fast ✅**

---

### Q5: Find the Stripe vs PayPal decision — reasoning, where discussed, follow-up concerns

**Requires:** Notion → Slack → Linear (3 hops, historical decision recovery)

| Hop | Source | Mode | Latency | Score | Answer |
|---|---|---|---|---|---|
| 1 | Notion | 🧠 thinking | 3211ms | 0.732 | Team Wiki: "Stripe over PayPal — verbal decision by Carol (no ADR written)" |
| 2 | Slack | 🧠 thinking | 2802ms | 0.726 | Carol in #payments: *"Stripe chosen because PayPal's API was too slow for latency requirements. Verbal call, no doc."* |
| 3 | Linear | ⚡ fast | 428ms | 0.768 | BUG-123 + FEAT-456 confirm downstream Stripe reliability concerns |

**Total: 6,441ms | $0.034 | 1 fast + 2 thinking ✅**

---

## Latency vs. Accuracy Summary

| Q | Total Latency | Cost | Fast | Thinking | Accuracy |
|---|---|---|---|---|---|
| Q1 | 5,246ms | $0.006 | 3/3 | 0/3 | ✅ 100% |
| Q2 | 7,713ms | $0.019 | 2/3 | 1/3 | ✅ 100% |
| Q3 | 13,433ms | $0.034 | 1/3 | 2/3 | ✅ 100% |
| Q4 | 5,863ms | $0.006 | 3/3 | 0/3 | ✅ 100% |
| Q5 | 6,441ms | $0.034 | 1/3 | 2/3 | ✅ 100% |
| **Total** | **38,696ms** | **$0.099** | **10/15 (67%)** | **5/15 (33%)** | **✅ 100%** |

### Key Finding

**Fast mode handles 67% of hops without accuracy loss.** Thinking mode is reserved for questions that involve:
1. Comparing and reasoning about multiple alternatives (Q3: Auth0 vs Cognito vs custom)
2. Negative existence queries (Q2: "has no Slack discussion")
3. Implicit or undocumented decisions not stored as structured data (Q5: verbal Stripe decision)

---

## HydraDB API Details

All API calls verified against live `api.hydradb.com`:

```
Database: hydramind
API Version: 2.0.1
```

| Endpoint | Method | Usage |
|---|---|---|
| `/databases` | GET | List databases |
| `/databases/collections?database=hydramind` | GET | List collections |
| `/databases/status?database=hydramind` | GET | Check provisioning |
| `/context/ingest` | POST | Ingest with `documents` field (multipart) |
| `/context/status` | GET | Poll indexing status |
| `/query` | POST | Query with `mode`, `collection`, `query_apps` |
| `/connectors?database=hydramind` | GET | List connectors |
| `/connectors/:id/sync?database=hydramind` | POST | Trigger on-demand sync |

### Query Parameters Used

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

## Judging Criteria Mapping

| Criterion | How HydraBrain Delivers |
|---|---|
| **Correctness** | All 5 questions answered correctly — see BENCHMARK.md for expected vs actual |
| **Cross-source reasoning** | Q1: Linear+Notion+Slack; Q4: GitHub+Slack+Notion; Q5: Notion+Slack+Linear |
| **Latency** | Fast mode avg 1.9s/hop, 67% of all hops use fast mode |
| **Cost** | $0.099 total for 15 query hops across 5 multi-hop questions |
| **Reproducibility** | `git clone` → load extension → `/hydrabrain --ingest-demo` → `/hydrabrain --demo` |
| **Developer experience** | Browser extension with slash commands, live reasoning traces, metrics dashboard |

---

## 60-Second Demo Script

**0–10s:** "Most companies have knowledge scattered across GitHub, Linear, Slack, and Notion. HydraDB connects them. HydraBrain runs that entire retrieval pipeline from inside your browser — always visible while you work."

**10–25s:** "Type `/hydrabrain --ingest-demo` — 8 documents across 4 collections ingested in seconds. Now: *'Who filed BUG-123, which project are they on, and what did they say in Slack?'* Three hops: Linear finds Alice filed it, Notion confirms she's Backend Lead on Phoenix Platform, Slack retrieves her exact message. 5.2 seconds. All fast mode."

**25–40s:** "Harder question: *'What was decided about the OAuth migration and has anyone contradicted it?'* HydraBrain switches to thinking mode for Notion and Slack — finds ADR-001 at 0.94 relevance, confirms Carol proposed it in Slack, finds no contradictions in Linear. 13 seconds. $0.034."

**40–50s:** "The metrics panel: 67% of hops run in fast mode. 100% accuracy across all 5 questions. Total cost for all 15 retrieval hops: $0.099."

**50–60s:** "And the universal connector — I'm on a GitHub issue right now. One slash command syncs the entire page — title, assignees, labels, body, comments — into HydraDB. Any web page. No API required. HydraBrain: cross-source reasoning from your browser."

---

## License

MIT
