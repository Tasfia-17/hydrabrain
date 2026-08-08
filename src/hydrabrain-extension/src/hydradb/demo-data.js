/**
 * HydraBrain -- Demo Data Setup
 *
 * Prepares HydraDB collections for the competition benchmark by ingesting
 * documents that represent a cross-source engineering scenario. These
 * documents are the same kind of content that HydraDB connectors pull
 * from real Slack workspaces, Linear projects, Notion workspaces, and
 * GitHub repositories.
 *
 * The four connectors (Slack, Linear, Notion, GitHub) are configured on
 * the account. Slack, Linear, and Notion connectors sync automatically
 * every hour. The documents below match the structure of what those
 * connectors produce so the benchmark queries work against realistic content.
 *
 * Run via: /hydrabrain --ingest-demo
 * Or call ingestAllDemoData() from the background worker.
 */

import { HydraDBClient, HYDRADB_COLLECTIONS } from './client.js';

// ---------------------------------------------------------------------------
// LINEAR: tickets from the connected Linear workspace
// ---------------------------------------------------------------------------

const LINEAR_DOCS = [
  {
    title: 'BUG-123: Auth service crashes on token expiry',
    text: `# BUG-123: Auth service crashes on token expiry
Creator: Alice Chen (@alice) | Assignee: Bob Smith (@bob) | Priority: Urgent | Project: Phoenix Platform v2.0

The auth service crashes when JWT token expires during an active session. The token refresh middleware throws TokenExpiredError but there is no catch block. Introduced by Alice Chen in commit abc123 on 2024-01-08 during auth-service refactor.

Fix: Bob implementing global error handler. PR #45 is the fix.
Comments:
- Alice [2024-01-10 09:00]: I traced it to the refresh middleware. Bob can you pick this up?
- Bob [2024-01-10 09:30]: On it. Will have a PR by tomorrow.
- Carol [2024-01-10 10:00]: Blocking mobile release. Bumping to Urgent.
- Bob [2024-01-11 14:00]: PR #45 is up. Fixes crash and adds 401 response.
`,
    collection: HYDRADB_COLLECTIONS.linear,
    metadata: { source: 'linear', type: 'ticket', ticket_id: 'BUG-123', priority: 'urgent' },
  },
  {
    title: 'FEAT-456: Migrate auth service to OAuth 2.0',
    text: `# FEAT-456: Migrate auth service to OAuth 2.0
Creator: Carol Davis (@carol) | Assignee: Alice Chen (@alice) | Priority: High | Project: Phoenix Platform v2.0

Migrate JWT-based auth to OAuth 2.0: refresh token rotation, revocation endpoint, Google/GitHub SSO.
Decision history:
- AWS Cognito: rejected -- vendor lock-in (Carol, 2024-01-05)
- Auth0: rejected -- $2k/mo over budget (Carol, 2024-01-05)
- Custom OAuth using node-oauth2-server: chosen (Alice + Carol, 2024-01-06)
Comments:
- Carol [2024-01-08]: Prioritize after BUG-123 resolved.
- Alice [2024-01-09]: Agreed. Starting design doc in Notion.
`,
    collection: HYDRADB_COLLECTIONS.linear,
    metadata: { source: 'linear', type: 'ticket', ticket_id: 'FEAT-456', priority: 'high' },
  },
];

// ---------------------------------------------------------------------------
// GITHUB: PRs, commits, and issues from the connected repository
// ---------------------------------------------------------------------------

const GITHUB_DOCS = [
  {
    title: 'PR #45: Fix auth token expiry crash',
    text: `# PR #45: Fix auth token expiry crash
Author: Bob Smith (@bob-dev) | Reviewer: Alice Chen (@alice-dev) | Repo: phoenix-platform/auth-service | Linked: BUG-123

Adds global error handler for TokenExpiredError. Returns 401 with Retry-After header.
Changes: auth middleware catch block, /auth/refresh endpoint, 12 new tests.
Reviews:
- Alice [2024-01-11 15:00]: LGTM. This is the complete fix for BUG-123.
- Carol [2024-01-12 09:00]: Approved. Merge when Alice signs off.
`,
    collection: HYDRADB_COLLECTIONS.github,
    metadata: { source: 'github', type: 'pull_request', pr_number: '45' },
  },
  {
    title: 'Commit abc123: auth-service refactor -- remove legacy JWT handler',
    text: `# Commit abc123: auth-service refactor -- remove legacy JWT handler
Author: Alice Chen | Date: 2024-01-08 | Repo: phoenix-platform/auth-service

Removes monolithic JWT validation, replaces with composable middleware chain.
This commit inadvertently removed the try/catch around token refresh. BUG-123 filed as result. PR #45 is fix.
Reported by Alice in post-commit review.
`,
    collection: HYDRADB_COLLECTIONS.github,
    metadata: { source: 'github', type: 'commit', sha: 'abc123' },
  },
  {
    title: 'Issue #67: Auth service memory leak under high load',
    text: `# Issue #67: Auth service memory leak under high load
Reporter: Dave Wilson (@dave-dev) | Assignee: Alice Chen (@alice-dev) | Repo: phoenix-platform/auth-service

Token blacklist (in-memory Map) never pruned. Expired tokens accumulate -- process OOMs after 4h.
Alice identified in heapdump. Quick fix: LRU eviction with 1h TTL. Long-term: Redis as part of FEAT-456.
Dave noted this correlates with Stripe webhook timeout issues (ENG-789) -- same process.
`,
    collection: HYDRADB_COLLECTIONS.github,
    metadata: { source: 'github', type: 'issue', issue_number: '67' },
  },
];

// ---------------------------------------------------------------------------
// SLACK: message threads from the connected workspace
// ---------------------------------------------------------------------------

const SLACK_DOCS = [
  {
    title: 'Slack #eng -- auth-service discussion',
    text: `# Slack #eng -- auth-service discussion (2024-01-08 to 2024-01-13)

[alice @ 2024-01-10T09:12:00]: Found root cause of BUG-123. Token refresh middleware throws TokenExpiredError but no catch block. My fault -- removed try/catch in the Jan 8 refactor. Bob can you take the fix?
[bob @ 2024-01-10T09:31:00]: On it. PR up by tomorrow morning.
[carol @ 2024-01-10T10:03:00]: Blocking mobile. Bumping BUG-123 to Urgent. Bob please make this P0.
[bob @ 2024-01-11T14:05:00]: PR #45 is up! Fixed crash, added 12 new tests, added /auth/refresh endpoint.
[alice @ 2024-01-11T16:30:00]: LGTM! Carol can you do final approval?
[carol @ 2024-01-12T09:05:00]: Approved. Merging now. Bob nice work!
[carol @ 2024-01-08T11:00:00]: Team -- Auth0 is $2k/mo over budget. Cognito is vendor lock-in. I recommend custom OAuth using node-oauth2-server.
[alice @ 2024-01-08T11:30:00]: Agreed. I'll start design doc in Notion.
[bob @ 2024-01-08T11:45:00]: Don't repeat Stripe vs PayPal mistake -- verbal decision without doc. Alice please write it up.
[alice @ 2024-01-13T10:00:00]: Found memory leak in auth-service (Issue #67). Token blacklist Map never pruned. Adding LRU eviction 1h TTL as quick fix. Long term: Redis in FEAT-456.
`,
    collection: HYDRADB_COLLECTIONS.slack,
    metadata: { source: 'slack', type: 'thread', channel: '#eng' },
  },
  {
    title: 'Slack #payments -- Stripe vs PayPal discussion',
    text: `# Slack Channel: #payments (2024-01-10 to 2024-01-13)

[alice @ 2024-01-10T09:12:00]: I think process_payment is buggy -- it silently swallows CardErrors without alerting us.
[bob @ 2024-01-10T09:15:00]: Yeah we need to refactor process_payment. It was written in one night before the Q3 deadline.
[alice @ 2024-01-11T10:02:00]: Why did we use Stripe instead of PayPal? Was there a decision doc for this?
[carol @ 2024-01-11T10:08:00]: Stripe was chosen because PayPal's API was too slow for our latency requirements. No doc was written, it was a verbal call. We needed sub-100ms payment API and Stripe had it, PayPal didn't.
[bob @ 2024-01-12T14:30:00]: The boss wants process_payment fully refactored and tested by Friday. This is now P0.
[alice @ 2024-01-12T14:45:00]: The partial refund bug in calculate_refund is also blocking the returns feature. Should be merged into process_payment.
[carol @ 2024-01-13T09:00:00]: Technical debt note: process_payment has no retry logic. If Stripe times out, user gets charged but we never know.
[dave @ 2024-01-13T09:15:00]: This connects to ENG-789 in auth-service. The Stripe webhook handler there has the same retry problem. Our Stripe integration is fragile across multiple services.
`,
    collection: HYDRADB_COLLECTIONS.slack,
    metadata: { source: 'slack', type: 'thread', channel: '#payments' },
  },
];

// ---------------------------------------------------------------------------
// NOTION: architecture decision records and team wiki
// ---------------------------------------------------------------------------

const NOTION_DOCS = [
  {
    title: 'ADR-001: OAuth 2.0 migration decision',
    text: `# Auth Service Architecture Decision Record -- ADR-001
Author: Alice Chen | Status: Accepted | Date: 2024-01-08 | Project: Phoenix Platform v2.0

Decision: Migrate to OAuth 2.0 using node-oauth2-server with Redis token storage.

Alternatives Considered:
- Auth0: Rejected -- $2k/month over budget
- AWS Cognito: Rejected -- vendor lock-in, complex pricing
- Clerk: Rejected -- expensive at scale
- Custom OAuth (node-oauth2-server): CHOSEN -- full control, no vendor lock-in

Consequences:
- BUG-123 fix (PR #45) is stopgap; real fix is this migration
- ENG-789 (payment webhook coupling) resolved as part of this work
- 3-week estimate, Alice Chen leading
- Breaking change to /auth/validate endpoint

Related: FEAT-456 (Linear), BUG-123 (Linear), PR #45 (GitHub), Slack #eng OAuth discussion 2024-01-08
`,
    collection: HYDRADB_COLLECTIONS.notion,
    metadata: { source: 'notion', type: 'adr', doc_id: 'ADR-001' },
  },
  {
    title: 'Phoenix Platform v2.0 -- Engineering Team Wiki',
    text: `# Phoenix Platform v2.0 -- Engineering Team Wiki
Author: Carol Davis | Updated: 2024-01-13

Team:
- Alice Chen (@alice-dev / @alice) -- Backend Lead
- Bob Smith (@bob-dev / @bob) -- Backend Engineer
- Carol Davis (@carol-dev / @carol) -- Tech Lead
- Dave Wilson (@dave-dev / @dave) -- SRE

Active Projects:
- Auth Service Refactor: Owner Alice Chen. Tickets: BUG-123, FEAT-456, ENG-789. PRs: #45.
- Payment Service: Owner Bob Smith. Issues: process_payment tech debt, calculate_refund bug.

Architecture Decisions:
- 2024-01-08: OAuth 2.0 migration (ADR-001, Alice Chen)
- 2024-01-06: Stripe over PayPal -- verbal decision by Carol (no ADR written)
`,
    collection: HYDRADB_COLLECTIONS.notion,
    metadata: { source: 'notion', type: 'wiki' },
  },
];

// ---------------------------------------------------------------------------
// All documents across all 4 collections
// ---------------------------------------------------------------------------

export const ALL_DEMO_DOCS = [
  ...LINEAR_DOCS,
  ...GITHUB_DOCS,
  ...SLACK_DOCS,
  ...NOTION_DOCS,
];

// ---------------------------------------------------------------------------
// 5 competition benchmark questions with multi-hop plans
// ---------------------------------------------------------------------------

export const DEMO_QUESTIONS = [
  {
    id: 'Q1',
    question: 'Who filed BUG-123, which project are they working on, and what did they say about the fix in Slack?',
    hops: [
      {
        label: 'Hop 1: Linear -- find BUG-123 creator',
        query: 'BUG-123 creator who filed auth service crash',
        collection: HYDRADB_COLLECTIONS.linear,
      },
      {
        label: 'Hop 2: Notion -- confirm role and project',
        query: 'Phoenix Platform auth service team owner backend lead',
        collection: HYDRADB_COLLECTIONS.notion,
      },
      {
        label: 'Hop 3: Slack -- find what they said about the fix',
        query: 'BUG-123 auth crash fix alice root cause',
        collection: HYDRADB_COLLECTIONS.slack,
      },
    ],
    expectedAnswer: 'Alice Chen filed BUG-123. She is Backend Lead on Phoenix Platform v2.0. In Slack #eng she identified the root cause (missing try/catch in token refresh middleware from her Jan 8 refactor) and asked Bob to take the fix.',
  },
  {
    id: 'Q2',
    question: 'Show PRs referencing urgent tickets, and whether they have Slack discussion.',
    hops: [
      {
        label: 'Hop 1: GitHub -- find PRs linked to urgent tickets',
        query: 'pull request urgent ticket BUG priority fix',
        collection: HYDRADB_COLLECTIONS.github,
      },
      {
        label: 'Hop 2: Linear -- confirm ticket urgency',
        query: 'urgent P0 ticket blocking mobile',
        collection: HYDRADB_COLLECTIONS.linear,
      },
      {
        label: 'Hop 3: Slack -- check for PR discussion (thinking for negative query)',
        query: 'PR merged discussion review approval carol',
        collection: HYDRADB_COLLECTIONS.slack,
        forceMode: 'thinking',
      },
    ],
    expectedAnswer: 'PR #45 references BUG-123 (Urgent/P0). The PR was discussed in Slack #eng -- Carol approved and Bob got credit.',
  },
  {
    id: 'Q3',
    question: 'What was decided about the OAuth migration, and has anyone contradicted that decision?',
    hops: [
      {
        label: 'Hop 1: Notion -- find OAuth decision record',
        query: 'OAuth migration decision Auth0 Cognito architecture',
        collection: HYDRADB_COLLECTIONS.notion,
        forceMode: 'thinking',
      },
      {
        label: 'Hop 2: Slack -- check for contradiction or confirmation',
        query: 'OAuth Auth0 Cognito contradiction alternative decision',
        collection: HYDRADB_COLLECTIONS.slack,
        forceMode: 'thinking',
      },
      {
        label: 'Hop 3: Linear -- check if scope changed',
        query: 'FEAT-456 OAuth scope change contradiction',
        collection: HYDRADB_COLLECTIONS.linear,
      },
    ],
    expectedAnswer: 'ADR-001 documents the decision: custom OAuth using node-oauth2-server. Auth0 rejected ($2k/mo), Cognito rejected (vendor lock-in). Slack confirms the same decision. No contradictions found in Linear -- FEAT-456 scope is unchanged.',
  },
  {
    id: 'Q4',
    question: 'Which engineer has the most context on the auth service based on commits, reviews, and Slack activity?',
    hops: [
      {
        label: 'Hop 1: GitHub -- find commit authors and reviewers',
        query: 'auth service commit author reviewer alice bob',
        collection: HYDRADB_COLLECTIONS.github,
      },
      {
        label: 'Hop 2: Slack -- find who led the discussion',
        query: 'auth service token who responsible alice carol bob',
        collection: HYDRADB_COLLECTIONS.slack,
      },
      {
        label: 'Hop 3: Notion -- confirm ownership',
        query: 'auth service owner lead responsible backend',
        collection: HYDRADB_COLLECTIONS.notion,
      },
    ],
    expectedAnswer: 'Alice Chen has the most context: she authored commit abc123 (the root cause), reviewed PR #45, identified the root cause in Slack, found the memory leak (Issue #67), and is Backend Lead owning FEAT-456 and BUG-123 per the team wiki.',
  },
  {
    id: 'Q5',
    question: 'Find the Stripe vs PayPal decision: original reasoning, where it was discussed, and any follow-up concerns.',
    hops: [
      {
        label: 'Hop 1: Notion -- find payment decision in wiki',
        query: 'Stripe PayPal decision architecture payment verbal',
        collection: HYDRADB_COLLECTIONS.notion,
        forceMode: 'thinking',
      },
      {
        label: 'Hop 2: Slack -- find original discussion',
        query: 'Stripe PayPal chosen latency requirement verbal decision',
        collection: HYDRADB_COLLECTIONS.slack,
        forceMode: 'thinking',
      },
      {
        label: 'Hop 3: Linear -- find downstream reliability concerns',
        query: 'Stripe payment webhook reliability concern',
        collection: HYDRADB_COLLECTIONS.linear,
      },
    ],
    expectedAnswer: 'Stripe was chosen over PayPal for sub-100ms latency (PayPal too slow). Decision was verbal by Carol -- no ADR written. Follow-up concerns: process_payment has no retry logic, Stripe webhook handler in auth-service also fragile (ENG-789).',
  },
];

// ---------------------------------------------------------------------------
// Ingestion runner
// ---------------------------------------------------------------------------

/**
 * Ingest all demo documents into HydraDB.
 * Each document is placed in the correct collection (linear_test, github_col,
 * slack_test, notion_test) corresponding to its connector source.
 *
 * @param {HydraDBClient} client
 * @param {function} [onProgress]  called with (index, total, title, result)
 * @returns {object[]} ingestion results per document
 */
export async function ingestAllDemoData(client, onProgress) {
  const results = [];

  for (let i = 0; i < ALL_DEMO_DOCS.length; i++) {
    const doc = ALL_DEMO_DOCS[i];
    let result;
    try {
      result = await client.ingestText(doc.text, {
        collection: doc.collection,
        title: doc.title,
        source: doc.metadata?.source || 'hydrabrain',
        metadata: doc.metadata,
      });
    } catch (err) {
      result = { success: false, error: err.message };
    }

    results.push({ title: doc.title, collection: doc.collection, ...result });

    if (onProgress) {
      onProgress(i + 1, ALL_DEMO_DOCS.length, doc.title, result);
    }
  }

  return results;
}

/**
 * Summary of what gets ingested and into which collections.
 */
export const DEMO_DATASET_SUMMARY = {
  totalDocuments: ALL_DEMO_DOCS.length,
  collections: {
    [HYDRADB_COLLECTIONS.linear]: LINEAR_DOCS.length,
    [HYDRADB_COLLECTIONS.github]: GITHUB_DOCS.length,
    [HYDRADB_COLLECTIONS.slack]: SLACK_DOCS.length,
    [HYDRADB_COLLECTIONS.notion]: NOTION_DOCS.length,
  },
  description: 'Engineering scenario: auth-service refactor spanning Linear tickets, GitHub PRs/commits/issues, Slack threads, and Notion ADRs. Same people and projects appear across all 4 sources.',
};
