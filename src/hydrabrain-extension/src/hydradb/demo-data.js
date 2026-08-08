/**
 * HydraBrain — Demo Data Ingestion
 *
 * Ingests a realistic cross-source scenario into HydraDB collections
 * so the 5 competition demo questions can be answered with real data.
 *
 * Scenario: "auth-service refactor" spanning GitHub, Linear, Slack, Notion.
 *
 * Run via: /hydradb --ingest-demo  (slash command)
 * Or call ingestAllDemoData() from the background worker.
 */

import { HydraDBClient, HYDRADB_COLLECTIONS } from './client.js';

// ─── LINEAR DEMO DATA ─────────────────────────────────────────────────────

const LINEAR_DOCS = [
  {
    title: 'BUG-123: Auth service crashes on token expiry',
    text: `# BUG-123: Auth service crashes on token expiry

**Creator:** Alice Chen (@alice)
**Assignee:** Bob Smith (@bob)
**Priority:** Urgent
**Status:** In Progress
**Project:** Phoenix Platform (v2.0)
**Labels:** bug, auth-service, p0

## Description
The auth service crashes with an unhandled exception when a JWT token expires
during an active session. Users are silently logged out with no error message.

## Steps to Reproduce
1. Log in to the app
2. Wait for token to expire (60 min)
3. Attempt any API call
4. Server returns 500 instead of 401

## Root Cause Analysis
The token refresh middleware throws a TokenExpiredError but there is no catch
block in the middleware chain. This was introduced in commit abc123 on 2024-01-08
by Alice Chen during the auth-service refactor.

## Fix Approach
Bob is implementing a global error handler that catches TokenExpiredError and
returns a proper 401 with a Retry-After header. PR #45 is the fix.

## Comments
- **Alice [2024-01-10 09:00]:** I traced it to the refresh middleware. Bob can you pick this up?
- **Bob [2024-01-10 09:30]:** On it. Will have a PR by tomorrow.
- **Carol [2024-01-10 10:00]:** This is blocking the mobile release. Priority bumped to Urgent.
- **Bob [2024-01-11 14:00]:** PR #45 is up. Fixes the crash and adds 401 response.

## Related
- PR #45 (GitHub): Fix auth token expiry crash
- Slack thread: #eng channel, 2024-01-10
- Notion page: Auth Service Architecture Decision`,
    collection: HYDRADB_COLLECTIONS.linear,
    metadata: { source: 'linear', type: 'ticket', ticket_id: 'BUG-123', priority: 'urgent', project: 'Phoenix Platform' },
  },
  {
    title: 'FEAT-456: Migrate auth service to OAuth 2.0',
    text: `# FEAT-456: Migrate auth service to OAuth 2.0

**Creator:** Carol Davis (@carol)
**Assignee:** Alice Chen (@alice)
**Priority:** High
**Status:** Planned
**Project:** Phoenix Platform (v2.0)
**Labels:** feature, auth-service, oauth

## Description
Migrate the current JWT-based auth service to OAuth 2.0 with support for
refresh tokens, revocation, and third-party SSO providers.

## Background
Current auth system was written 18 months ago. It has accumulated significant
tech debt:
- No refresh token rotation
- No token revocation endpoint
- No SSO support
- TokenExpiredError not handled (see BUG-123)

## Scope
1. Implement OAuth 2.0 authorization code flow
2. Add refresh token rotation with 7-day sliding window
3. Add /auth/revoke endpoint
4. Support Google and GitHub SSO providers
5. Deprecate the current JWT-only endpoint

## Decision History
- AWS Cognito was evaluated but rejected due to vendor lock-in (Carol, 2024-01-05)
- Auth0 was evaluated but $2k/mo is over budget (Carol, 2024-01-05)
- Decision: build custom OAuth using node-oauth2-server (Alice + Carol, 2024-01-06)

## Comments
- **Carol [2024-01-08]:** Let's prioritize this after BUG-123 is resolved.
- **Alice [2024-01-09]:** Agreed. BUG-123 is blocking. I'll start design doc in Notion.`,
    collection: HYDRADB_COLLECTIONS.linear,
    metadata: { source: 'linear', type: 'ticket', ticket_id: 'FEAT-456', priority: 'high', project: 'Phoenix Platform' },
  },
  {
    title: 'ENG-789: Auth service has no retry logic for Stripe webhook',
    text: `# ENG-789: Auth service has no retry logic for Stripe webhook

**Creator:** Bob Smith (@bob)
**Assignee:** Alice Chen (@alice)
**Priority:** Medium
**Status:** Open
**Project:** Phoenix Platform (v2.0)
**Labels:** tech-debt, stripe, auth-service

## Description
The Stripe webhook handler in auth-service does not retry failed webhook
deliveries. If our endpoint returns a 500, Stripe will retry but our
idempotency key logic is broken — it may process the same payment twice.

## Root Cause
The payment_processed handler in auth-service shares a connection pool with
the auth middleware. Under load, when the auth service is processing token
refreshes, the payment handler times out.

## Fix
Decouple the payment webhook handler from auth-service. Move it to
payment-service with proper retry logic and idempotency key handling.

## Comments
- **Bob [2024-01-13]:** This is the same pattern as process_payment issues we discussed in Slack.
- **Alice [2024-01-13]:** Yes, the Q3 tech debt is catching up. We need to refactor this properly.`,
    collection: HYDRADB_COLLECTIONS.linear,
    metadata: { source: 'linear', type: 'ticket', ticket_id: 'ENG-789', priority: 'medium', project: 'Phoenix Platform' },
  },
];

// ─── GITHUB DEMO DATA ─────────────────────────────────────────────────────

const GITHUB_DOCS = [
  {
    title: 'PR #45: Fix auth token expiry crash (auth-service)',
    text: `# PR #45: Fix auth token expiry crash in auth-service

**Author:** Bob Smith (@bob-dev)
**Reviewer:** Alice Chen (@alice-dev)
**Status:** Open — 2 reviews requested
**Branch:** fix/auth-token-expiry-crash
**Base:** main
**Repository:** phoenix-platform/auth-service
**Labels:** bug-fix, auth, p0
**Linked Issue:** BUG-123

## Summary
Adds a global error handler for TokenExpiredError in the auth middleware chain.
Previously, expiry during an active session caused an unhandled promise rejection
that brought down the entire auth worker process.

## Changes
- src/middleware/auth.js: Added TokenExpiredError catch block
- src/middleware/auth.js: Returns 401 with Retry-After: 0 header
- src/routes/refresh.js: Added /auth/refresh endpoint for proactive renewal
- test/auth.test.js: Added 12 new test cases covering expiry scenarios

## Test Results
All 47 auth tests passing. New tests cover:
- Token expired exactly at boundary
- Token expired mid-request
- Concurrent requests with same expired token
- Refresh endpoint rate limiting

## Commits
- abc456: Add TokenExpiredError handler to auth middleware
- abc457: Add /auth/refresh endpoint
- abc458: Add test coverage for token expiry scenarios
- abc459: Update API documentation

## Reviews
- **Alice [2024-01-11 15:00]:** LGTM on the middleware change. Can you add a test for the case
  where refresh itself fails? Also check BUG-123 — is this the complete fix or just part of it?
- **Bob [2024-01-11 16:00]:** Added test for refresh failure. Yes this is the complete fix for BUG-123.
  FEAT-456 will handle the broader OAuth migration.
- **Carol [2024-01-12 09:00]:** Approved. Merge when Alice signs off.`,
    collection: HYDRADB_COLLECTIONS.github,
    metadata: { source: 'github', type: 'pull_request', pr_number: '45', author: 'bob-dev', repo: 'auth-service' },
  },
  {
    title: 'Commit abc123: auth-service refactor — remove legacy JWT handler',
    text: `# Commit abc123: auth-service refactor — remove legacy JWT handler

**Author:** Alice Chen <alice@company.com>
**Date:** 2024-01-08T14:23:00Z
**Repository:** phoenix-platform/auth-service
**Branch:** main

## Commit Message
refactor: remove legacy JWT handler and migrate to middleware chain

Removes the old monolithic JWT validation function and replaces it with
a composable middleware chain. This enables easier testing and more
granular error handling.

BREAKING CHANGE: The /auth/validate endpoint signature has changed.
Consumers must update to the new format documented in auth-service/README.md.

## Files Changed
- src/auth/jwt.js: Removed legacy validateToken() function
- src/middleware/auth.js: New file — auth middleware chain
- src/middleware/refresh.js: New file — token refresh middleware
- src/routes/auth.js: Updated to use middleware chain

## Note
This commit inadvertently removed the try/catch around the token refresh
call. BUG-123 was filed as a result. PR #45 is the fix.

Reported by Alice in post-commit review. See BUG-123 for full context.`,
    collection: HYDRADB_COLLECTIONS.github,
    metadata: { source: 'github', type: 'commit', commit_hash: 'abc123', author: 'alice-dev', repo: 'auth-service' },
  },
  {
    title: 'GitHub Issue #67: Auth service memory leak under high load',
    text: `# Issue #67: Auth service memory leak under high load

**Reporter:** Dave Wilson (@dave-dev)
**Assignee:** Alice Chen (@alice-dev)
**Labels:** performance, auth-service, memory-leak
**Milestone:** v2.0
**Repository:** phoenix-platform/auth-service

## Description
Under sustained load (>500 req/s), the auth-service memory usage grows
unboundedly. After 4 hours, the process OOMs and restarts.

## Investigation
Using heapdump analysis, Alice identified that the token blacklist (in-memory
Map) is never pruned. Expired tokens accumulate indefinitely.

Alice's note from Slack #eng on 2024-01-13:
> "Found the leak — the blacklist Map in auth.js never gets cleared.
>  I'm adding a LRU eviction with a 1h TTL. Quick fix, proper fix is
>  to use Redis as part of FEAT-456."

## Status
Alice is working on a quick LRU fix. Long-term fix is part of FEAT-456
(OAuth migration which will use Redis for token storage).

## Comments
- **Dave [2024-01-13]:** This correlates with the Stripe webhook timeout issues (ENG-789).
  When auth-service OOMs, the payment webhook handler also fails.
- **Alice [2024-01-13]:** Yes, they share the same process. Decoupling is in ENG-789.`,
    collection: HYDRADB_COLLECTIONS.github,
    metadata: { source: 'github', type: 'issue', issue_number: '67', author: 'dave-dev', repo: 'auth-service' },
  },
];

// ─── SLACK DEMO DATA ──────────────────────────────────────────────────────

const SLACK_DOCS = [
  {
    title: 'Slack #eng — auth-service BUG-123 discussion',
    text: `# Slack Channel: #eng — auth-service discussion (2024-01-10 to 2024-01-13)

## Thread: BUG-123 auth crash

[alice @ 2024-01-10T09:12:00]: Hey team, I found the root cause of BUG-123. 
The token refresh middleware throws TokenExpiredError but there's no catch block. 
I traced it to the refactor I did on Jan 8th. My bad — I removed the try/catch 
when I cleaned up the legacy handler. Bob can you take the fix?

[bob @ 2024-01-10T09:31:00]: On it. I'll have a PR up by tomorrow morning.
Should be straightforward — just need a catch block and a proper 401 response.

[carol @ 2024-01-10T10:03:00]: This is blocking mobile. We cannot ship v2.0 without this.
Bumping BUG-123 to Urgent. Bob please make this P0.

[dave @ 2024-01-10T10:15:00]: I can review the PR when it's up. Also worth 
noting — this same crash pattern appeared in process_payment last quarter.
We keep missing try/catch in async middleware chains.

[alice @ 2024-01-10T10:22:00]: Good point Dave. We should add a lint rule for
unhandled async errors. I'll add that to the FEAT-456 scope.

[bob @ 2024-01-11T14:05:00]: PR #45 is up! Fixed the crash, added 12 new tests,
and added a /auth/refresh endpoint. Alice can you review?

[alice @ 2024-01-11T15:00:00]: Reviewing now. Looks good. Asked for one more test.

[alice @ 2024-01-11T16:30:00]: LGTM! Carol, can you do final approval?

[carol @ 2024-01-12T09:05:00]: Approved. Merging now. Bob nice work!

## Thread: OAuth migration discussion

[carol @ 2024-01-08T11:00:00]: Team — I evaluated Auth0 and AWS Cognito for FEAT-456.
Auth0 is $2k/mo which is over budget. Cognito locks us into AWS. 
I recommend we build custom OAuth using node-oauth2-server. Thoughts?

[alice @ 2024-01-08T11:30:00]: Agreed on the vendor lock-in concern. 
node-oauth2-server looks solid. I'll start a design doc in Notion.

[bob @ 2024-01-08T11:45:00]: +1. Let's not repeat the Stripe vs PayPal mistake
where we made a verbal decision without a document. Alice please write it up.

[alice @ 2024-01-08T12:00:00]: Will do. The design doc will cover token rotation,
revocation, and SSO. I'll have a draft by EOD.

## Thread: Memory leak discussion (2024-01-13)

[alice @ 2024-01-13T10:00:00]: Found the memory leak in auth-service (Issue #67).
The token blacklist Map is never pruned. Expired tokens pile up over time.
I'm adding LRU eviction with 1h TTL as a quick fix.

[dave @ 2024-01-13T10:12:00]: That explains the auth-service OOMs we saw on Jan 11.
Does this correlate with ENG-789? When auth OOMs, Stripe webhooks fail too.

[alice @ 2024-01-13T10:20:00]: Yes same process. Decoupling payment webhooks
from auth is already in ENG-789. Bob is Alice working on that too?

[bob @ 2024-01-13T10:25:00]: I filed ENG-789. Alice has it. Proper fix is to move
webhooks to payment-service as part of FEAT-456 scope expansion.

[carol @ 2024-01-13T10:35:00]: Let's make sure ENG-789 and FEAT-456 are linked
in Linear. This is all connected — auth refactor, payment reliability, memory leak.`,
    collection: HYDRADB_COLLECTIONS.slack,
    metadata: { source: 'slack', type: 'thread', channel: '#eng', date: '2024-01-10' },
  },
  {
    title: 'Slack #payments — Stripe webhook and process_payment discussion',
    text: `# Slack Channel: #payments (2024-01-10 to 2024-01-13)

[alice @ 2024-01-10T09:12:00]: I think process_payment is buggy — it silently 
swallows CardErrors without alerting us.

[bob @ 2024-01-10T09:15:00]: Yeah we need to refactor process_payment. It was 
written in one night before the Q3 deadline.

[alice @ 2024-01-11T10:02:00]: Why did we use Stripe instead of PayPal? 
Was there a decision doc for this?

[carol @ 2024-01-11T10:08:00]: Stripe was chosen because PayPal's API was too 
slow for our latency requirements. No doc was written, it was a verbal call.

[bob @ 2024-01-12T14:30:00]: The boss wants process_payment fully refactored 
and tested by Friday. This is now P0.

[alice @ 2024-01-12T14:45:00]: The partial refund bug in calculate_refund is 
also blocking the returns feature. It should be merged into process_payment.

[carol @ 2024-01-13T09:00:00]: Technical debt note: process_payment has no 
retry logic. If Stripe times out, the user gets charged but we never know.

[dave @ 2024-01-13T09:15:00]: This connects to ENG-789 in auth-service. 
The Stripe webhook handler there has the same retry problem.

[alice @ 2024-01-13T09:22:00]: We have a systemic problem with error handling 
across services. I'm raising this in the architecture review.`,
    collection: HYDRADB_COLLECTIONS.slack,
    metadata: { source: 'slack', type: 'thread', channel: '#payments', date: '2024-01-10' },
  },
];

// ─── NOTION DEMO DATA ─────────────────────────────────────────────────────

const NOTION_DOCS = [
  {
    title: 'Auth Service Architecture Decision Record (ADR-001)',
    text: `# Auth Service Architecture Decision Record — ADR-001

**Author:** Alice Chen
**Status:** Accepted
**Date:** 2024-01-08
**Project:** Phoenix Platform v2.0
**Database:** Engineering Decisions

## Context
The current auth service (JWT-based, 18 months old) has accumulated tech debt:
1. No refresh token rotation — tokens must be rotated manually
2. No revocation endpoint — compromised tokens cannot be invalidated
3. No SSO support — users must create separate accounts
4. TokenExpiredError not handled gracefully (BUG-123)
5. In-memory token blacklist causes memory leak at scale (Issue #67)

## Decision
Migrate to OAuth 2.0 with the following specifics:
- **Library:** node-oauth2-server (MIT license, 4k GitHub stars)
- **Token storage:** Redis (replaces in-memory Map, fixes memory leak)
- **Refresh tokens:** 7-day sliding window with rotation
- **Revocation:** /auth/revoke endpoint returning 200 on success
- **SSO providers:** Google and GitHub in v1, Okta in v2

## Alternatives Considered
| Option | Pro | Con | Decision |
|---|---|---|---|
| Auth0 | Full-featured, battle-tested | $2k/month over budget | Rejected |
| AWS Cognito | Scalable, managed | Vendor lock-in, complex pricing | Rejected |
| Clerk | Developer-friendly | Expensive at scale | Rejected |
| Custom OAuth | Full control, no vendor lock-in | Implementation effort | **Chosen** |

## Consequences
- BUG-123 fix (PR #45) is a stopgap; the real fix is this migration
- ENG-789 (payment webhook coupling) will be resolved as part of this work
- Estimated 3-week implementation timeline (Alice Chen, lead)
- Breaking change to /auth/validate endpoint — consumers must update

## Implementation Notes
Alice's design notes from Slack #eng:
> "The key insight is that OAuth 2.0 authorization codes are short-lived (10 min)
>  and refresh tokens are long-lived (7 days). This eliminates the need for the
>  in-memory blacklist entirely — we just don't issue tokens that last forever."

## Related
- FEAT-456: Migrate auth service to OAuth 2.0 (Linear)
- BUG-123: Auth service crashes on token expiry (Linear)
- Issue #67: Memory leak under high load (GitHub)
- PR #45: Fix auth token expiry crash (GitHub)
- Slack #eng: OAuth migration discussion (2024-01-08)`,
    collection: HYDRADB_COLLECTIONS.notion,
    metadata: { source: 'notion', type: 'document', doc_type: 'adr', author: 'alice' },
  },
  {
    title: 'Phoenix Platform v2.0 — Engineering Team Wiki',
    text: `# Phoenix Platform v2.0 — Engineering Team Wiki

**Last Updated:** 2024-01-13
**Author:** Carol Davis
**Database:** Team Wiki

## Team Members

| Name | GitHub | Slack | Linear | Role |
|---|---|---|---|---|
| Alice Chen | @alice-dev | @alice | alice@company.com | Backend Lead |
| Bob Smith | @bob-dev | @bob | bob@company.com | Backend Engineer |
| Carol Davis | @carol-dev | @carol | carol@company.com | Tech Lead |
| Dave Wilson | @dave-dev | @dave | dave@company.com | SRE |

## Active Projects

### Auth Service Refactor
- **Owner:** Alice Chen
- **Status:** In Progress
- **Key tickets:** BUG-123, FEAT-456, ENG-789
- **Key PRs:** PR #45 (fix), upcoming OAuth migration
- **Risk:** HIGH — touches authentication across all services

### Payment Service
- **Owner:** Bob Smith
- **Status:** Maintenance
- **Key issues:** process_payment tech debt, calculate_refund bug
- **Risk:** MEDIUM — Stripe integration stability

## Architecture Decisions Log
- 2024-01-08: OAuth 2.0 migration decision (ADR-001, Alice Chen)
- 2024-01-06: Stripe over PayPal — verbal decision by Carol (no ADR written)
- 2023-10-15: Node.js over Go for services — Alice Chen

## Tech Debt Backlog (P0/P1)
1. process_payment: no retry logic, swallows CardErrors (Bob — see Slack #payments)
2. calculate_refund: needs to merge into process_payment (Bob)
3. auth-service: memory leak in token blacklist (Alice — Issue #67)
4. auth-service: no refresh token rotation (Alice — FEAT-456)

## On-Call Rotation
- Week of Jan 8: Alice Chen
- Week of Jan 15: Bob Smith
- Week of Jan 22: Dave Wilson`,
    collection: HYDRADB_COLLECTIONS.notion,
    metadata: { source: 'notion', type: 'wiki', author: 'carol' },
  },
];

// ─── INGESTION RUNNER ─────────────────────────────────────────────────────

/**
 * Ingest all demo data into HydraDB.
 * Returns a detailed report of what was ingested and at what latency.
 */
export async function ingestAllDemoData(client, onProgress = null) {
  const report = {
    startedAt: Date.now(),
    ingested: [],
    failed: [],
    totalLatencyMs: 0,
  };

  const allDocs = [
    ...LINEAR_DOCS.map(d => ({ ...d, source: 'linear' })),
    ...GITHUB_DOCS.map(d => ({ ...d, source: 'github' })),
    ...SLACK_DOCS.map(d => ({ ...d, source: 'slack' })),
    ...NOTION_DOCS.map(d => ({ ...d, source: 'notion' })),
  ];

  for (let i = 0; i < allDocs.length; i++) {
    const doc = allDocs[i];
    if (onProgress) {
      onProgress({ current: i + 1, total: allDocs.length, title: doc.title, source: doc.source });
    }
    try {
      const result = await client.ingestText(doc.text, {
        title:      doc.title,
        collection: doc.collection,
        source:     doc.source,
        metadata:   doc.metadata,
      });
      report.ingested.push({
        id:        result.id,
        title:     doc.title,
        source:    doc.source,
        latencyMs: result.latencyMs,
      });
      report.totalLatencyMs += result.latencyMs || 0;
    } catch (err) {
      report.failed.push({ title: doc.title, source: doc.source, error: err.message });
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  report.finishedAt = Date.now();
  report.successCount = report.ingested.length;
  report.failCount    = report.failed.length;
  return report;
}

// Demo question plans for the competition
export const DEMO_QUESTIONS = [
  {
    id: 'Q1',
    question: 'Who filed BUG-123, which project are they working on, and what did they say about the fix in Slack?',
    plan: [
      { label: 'Hop 1: Find BUG-123 details', query: 'BUG-123 auth service crash creator assignee', collection: HYDRADB_COLLECTIONS.linear },
      { label: 'Hop 2: Find project context', query: 'Phoenix Platform v2.0 project auth service team', collection: HYDRADB_COLLECTIONS.notion },
      { label: 'Hop 3: Find Slack discussion about BUG-123 fix', query: 'BUG-123 auth crash fix discussion', collection: HYDRADB_COLLECTIONS.slack },
    ],
  },
  {
    id: 'Q2',
    question: 'Show me all PRs merged in the last 48h that reference urgent tickets but have no Slack discussion.',
    plan: [
      { label: 'Hop 1: Find recent PRs in GitHub', query: 'pull request merged auth service recent', collection: HYDRADB_COLLECTIONS.github },
      { label: 'Hop 2: Cross-check with urgent Linear tickets', query: 'urgent priority tickets BUG auth service', collection: HYDRADB_COLLECTIONS.linear },
      { label: 'Hop 3: Check Slack discussion existence', query: 'PR merged auth service discussion review', collection: HYDRADB_COLLECTIONS.slack, forceMode: 'thinking' },
    ],
  },
  {
    id: 'Q3',
    question: 'What was decided about the OAuth migration, and has anyone contradicted that since?',
    plan: [
      { label: 'Hop 1: Find OAuth decision doc', query: 'OAuth 2.0 migration architecture decision ADR', collection: HYDRADB_COLLECTIONS.notion, forceMode: 'thinking' },
      { label: 'Hop 2: Check Slack for contradictions or updates', query: 'OAuth migration disagreement concern alternative Auth0 Cognito', collection: HYDRADB_COLLECTIONS.slack, forceMode: 'thinking' },
      { label: 'Hop 3: Check Linear for scope changes', query: 'FEAT-456 OAuth migration scope change reversal', collection: HYDRADB_COLLECTIONS.linear },
    ],
  },
  {
    id: 'Q4',
    question: 'Which engineer has the most context on the auth service based on commits, PR reviews, and Slack mentions?',
    plan: [
      { label: 'Hop 1: Find auth service contributors in GitHub', query: 'auth service commits PRs reviews author', collection: HYDRADB_COLLECTIONS.github },
      { label: 'Hop 2: Find auth service mentions in Slack', query: 'auth service token expiry BUG-123 fix person', collection: HYDRADB_COLLECTIONS.slack },
      { label: 'Hop 3: Find ownership from Notion wiki', query: 'auth service owner team lead responsible', collection: HYDRADB_COLLECTIONS.notion },
    ],
  },
  {
    id: 'Q5',
    question: 'Find the decision to use Stripe over PayPal — original reasoning, where it was discussed, and any follow-up concerns.',
    plan: [
      { label: 'Hop 1: Find payment decision in Notion', query: 'Stripe PayPal decision architecture payment provider', collection: HYDRADB_COLLECTIONS.notion, forceMode: 'thinking' },
      { label: 'Hop 2: Find Slack discussion about Stripe decision', query: 'Stripe PayPal decision reasoning latency API choice', collection: HYDRADB_COLLECTIONS.slack },
      { label: 'Hop 3: Find subsequent concerns in Linear/GitHub', query: 'Stripe webhook retry payment bug concern', collection: HYDRADB_COLLECTIONS.linear },
    ],
  },
];
