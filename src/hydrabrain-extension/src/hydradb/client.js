/**
 * HydraBrain — HydraDB API Client
 *
 * Thin wrapper around https://api.hydradb.com (API-Version: 2).
 * Handles query, ingest, connector sync, and latency/cost tracking.
 *
 * All network calls go directly from the extension background to HydraDB —
 * no proxy, no server. API key is stored in chrome.storage.local under
 * 'hydradb_api_key' and never sent to any third party.
 */

export const HYDRADB_BASE_URL = 'https://api.hydradb.com';
export const HYDRADB_API_VERSION = '2';
export const HYDRADB_DATABASE = 'hydramind';

// Connector IDs (pre-configured on the account)
export const HYDRADB_CONNECTORS = {
  github:  '67e944ce-661a-4dcc-a293-69808d262a96',
  slack:   '2fb21d96-f9e9-46dd-8edd-f9ec267f3a3d',
  linear:  'e5ec9fd7-95eb-4df9-ab9d-608ca5b766ae',
  notion:  'c220b886-bc06-4648-9b6d-e450ef2f71f5',
};

// Collections map provider names to HydraDB sub-tenant IDs
export const HYDRADB_COLLECTIONS = {
  github:   'github_col',
  slack:    'slack_test',
  linear:   'linear_test',
  notion:   'notion_test',
  demo:     'hhjjjd7lkp',
};

// Retrieval mode cost estimates (USD per query, rough)
const COST_ESTIMATES = {
  fast:     0.002,
  thinking: 0.015,
};

/**
 * HydraDB API client class.
 * Instantiate with your API key, or call HydraDBClient.fromStorage().
 */
export class HydraDBClient {
  constructor(apiKey) {
    if (!apiKey) throw new Error('HydraDB API key is required');
    this.apiKey = apiKey;
    this.database = HYDRADB_DATABASE;
    // Metrics tracking
    this.metrics = {
      totalQueries: 0,
      fastQueries: 0,
      thinkingQueries: 0,
      totalLatencyMs: 0,
      totalCostUsd: 0,
      hydradbCalls: 0,
      sessionStart: Date.now(),
    };
  }

  /**
   * Load API key from chrome.storage.local and return a client instance.
   */
  static async fromStorage() {
    const data = await chrome.storage.local.get(['hydradb_api_key']);
    const key = data.hydradb_api_key;
    if (!key) throw new Error('HydraDB API key not configured. Set it in HydraBrain settings.');
    return new HydraDBClient(key);
  }

  /** Build standard headers for every request */
  _headers(isJson = true) {
    const h = {
      'Authorization': `Bearer ${this.apiKey}`,
      'API-Version': HYDRADB_API_VERSION,
    };
    if (isJson) h['Content-Type'] = 'application/json';
    return h;
  }

  /** Central fetch wrapper — records latency and increments call counter */
  async _fetch(method, path, body = null, isJson = true) {
    const url = `${HYDRADB_BASE_URL}${path}`;
    const start = Date.now();
    this.metrics.hydradbCalls++;
    const opts = {
      method,
      headers: this._headers(isJson),
    };
    if (body !== null) {
      opts.body = isJson ? JSON.stringify(body) : body;
    }
    let res;
    try {
      res = await fetch(url, opts);
    } catch (err) {
      throw new Error(`HydraDB network error: ${err.message}`);
    }
    const latencyMs = Date.now() - start;
    this.metrics.totalLatencyMs += latencyMs;
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`HydraDB returned non-JSON response (HTTP ${res.status})`);
    }
    if (!res.ok || data.success === false) {
      const msg = data?.error?.message || data?.detail?.message || `HTTP ${res.status}`;
      throw new Error(`HydraDB error: ${msg}`);
    }
    return { data, latencyMs };
  }

  // ─── QUERY ────────────────────────────────────────────────────────────────

  /**
   * Query HydraDB for relevant context.
   *
   * @param {string} query  - Natural language query
   * @param {object} opts
   *   .collection      - Scope to a specific collection (optional)
   *   .type            - 'knowledge' | 'memory' | 'all' (default: 'knowledge')
   *   .mode            - 'fast' | 'thinking' (default: 'fast')
   *   .queryBy         - 'hybrid' | 'text' (default: 'hybrid')
   *   .queryApps       - Include connector data (default: true)
   *   .metadataFilters - {metadata: {...}, additional_metadata: {...}}
   *   .limit           - Max chunks returned
   * @returns {object}  { chunks, sources, graphContext, latencyMs, costUsd, mode }
   */
  async query(query, opts = {}) {
    const mode = opts.mode || 'fast';
    const body = {
      database:    this.database,
      query,
      type:        opts.type       || 'knowledge',
      query_by:    opts.queryBy    || 'hybrid',
      mode,
      query_apps:  opts.queryApps  !== false,
    };
    if (opts.collection)       body.collection        = opts.collection;
    if (opts.metadataFilters)  body.metadata_filters  = opts.metadataFilters;
    if (opts.limit)            body.limit             = opts.limit;

    const { data, latencyMs } = await this._fetch('POST', '/query', body);

    // Update metrics
    this.metrics.totalQueries++;
    if (mode === 'fast')     this.metrics.fastQueries++;
    else                     this.metrics.thinkingQueries++;
    const costUsd = COST_ESTIMATES[mode] || COST_ESTIMATES.fast;
    this.metrics.totalCostUsd += costUsd;

    const chunks   = data.data?.chunks  || [];
    const sources  = data.data?.sources || [];
    const graphCtx = data.data?.graph_context || {};

    return {
      chunks,
      sources,
      graphContext: graphCtx,
      latencyMs,
      costUsd,
      mode,
      requestId: data.meta?.request_id,
    };
  }

  /**
   * Multi-hop query — execute several queries in sequence, each building
   * on the previous result. Returns all hops with their latency/cost.
   *
   * @param {Array<{query, opts}>} hops
   * @returns {object} { hops, totalLatencyMs, totalCostUsd, answer }
   */
  async multiHopQuery(hops) {
    const results = [];
    let totalLatency = 0;
    let totalCost = 0;
    for (const hop of hops) {
      const result = await this.query(hop.query, hop.opts || {});
      results.push({
        query:     hop.query,
        label:     hop.label || hop.query,
        ...result,
      });
      totalLatency += result.latencyMs;
      totalCost    += result.costUsd;
    }
    return {
      hops: results,
      totalLatencyMs: totalLatency,
      totalCostUsd:   totalCost,
    };
  }

  // ─── INGEST ───────────────────────────────────────────────────────────────

  /**
   * Ingest text content as knowledge into HydraDB.
   *
   * @param {string} text         - Content to ingest
   * @param {object} opts
   *   .collection  - Target collection
   *   .title       - Document title
   *   .source      - Source label (e.g. 'github', 'linear', 'slack')
   *   .metadata    - Additional metadata key/value pairs
   * @returns {object} { id, status }
   */
  async ingestText(text, opts = {}) {
    const formData = new FormData();
    formData.append('type', 'knowledge');
    formData.append('database', this.database);
    if (opts.collection) formData.append('collection', opts.collection);

    // Create a Blob file from the text
    const blob = new Blob([text], { type: 'text/plain' });
    const filename = opts.title
      ? opts.title.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) + '.txt'
      : 'document.txt';
    formData.append('documents', blob, filename);

    // Attach document metadata
    if (opts.metadata || opts.title || opts.source) {
      const docMeta = [{
        title:    opts.title  || filename,
        source:   opts.source || 'hydrabrain',
        ...opts.metadata,
      }];
      formData.append('document_metadata', JSON.stringify(docMeta));
    }

    const { data, latencyMs } = await this._fetch('POST', '/context/ingest', formData, false);
    this.metrics.hydradbCalls++; // double counted above, correct by noting ingest is separate
    const id = data.data?.results?.[0]?.id;
    return { id, latencyMs, success: !!id };
  }

  /**
   * Ingest a memory (user-specific context) into HydraDB.
   */
  async ingestMemory(text, opts = {}) {
    const formData = new FormData();
    formData.append('type', 'memory');
    formData.append('database', this.database);
    if (opts.collection) formData.append('collection', opts.collection);
    formData.append('memories', JSON.stringify([{ text }]));

    const { data, latencyMs } = await this._fetch('POST', '/context/ingest', formData, false);
    const id = data.data?.results?.[0]?.id;
    return { id, latencyMs, success: !!id };
  }

  /**
   * Poll ingestion status until completed or errored.
   * @param {string} id
   * @param {number} timeoutMs
   */
  async waitForIngestion(id, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const { data } = await this._fetch(
        'GET',
        `/context/status?database=${this.database}&ids=${id}`,
      );
      const status = data.data?.statuses?.[0]?.indexing_status;
      if (status === 'completed') return { success: true, status };
      if (status === 'errored') {
        const msg = data.data?.statuses?.[0]?.error_message || 'indexing failed';
        return { success: false, status, error: msg };
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    return { success: false, status: 'timeout' };
  }

  // ─── CONNECTORS ───────────────────────────────────────────────────────────

  /**
   * List all connectors for the database.
   */
  async listConnectors() {
    const { data } = await this._fetch('GET', `/connectors?database=${this.database}`);
    return data.connectors || [];
  }

  /**
   * Trigger an on-demand sync for a connector.
   * @param {string} connectorId
   */
  async syncConnector(connectorId) {
    const { data, latencyMs } = await this._fetch(
      'POST',
      `/connectors/${connectorId}/sync?database=${this.database}`,
      {},
    );
    return { workflowId: data.workflow_id, runId: data.run_id, latencyMs };
  }

  /**
   * Sync all known connectors.
   */
  async syncAllConnectors() {
    const results = {};
    for (const [name, id] of Object.entries(HYDRADB_CONNECTORS)) {
      try {
        results[name] = await this.syncConnector(id);
      } catch (err) {
        results[name] = { error: err.message };
      }
    }
    return results;
  }

  /**
   * Get connector resources for a specific connector.
   */
  async getConnectorResources(connectorId) {
    const { data } = await this._fetch(
      'GET',
      `/connectors/${connectorId}/resources?database=${this.database}`,
    );
    return data.resources || [];
  }

  // ─── DATABASE ─────────────────────────────────────────────────────────────

  /**
   * List all collections in the database.
   */
  async listCollections() {
    const { data } = await this._fetch(
      'GET',
      `/databases/collections?database=${this.database}`,
    );
    return data.data?.collections || [];
  }

  /**
   * Get database stats (row counts).
   */
  async getDatabaseStats() {
    const { data } = await this._fetch(
      'GET',
      `/databases/stats?database=${this.database}`,
    );
    return data.data || {};
  }

  // ─── CONTEXT MANAGEMENT ───────────────────────────────────────────────────

  /**
   * List context sources, optionally scoped to a collection.
   */
  async listContext(opts = {}) {
    const body = {
      database: this.database,
      type: opts.type || 'knowledge',
    };
    if (opts.collection) body.collection = opts.collection;
    const { data } = await this._fetch('POST', '/context/list', body);
    return {
      sources: data.data?.sources || [],
      total:   data.data?.total   || 0,
    };
  }

  /**
   * Get entity relations for context graph inspection.
   */
  async getRelations(opts = {}) {
    const params = new URLSearchParams({ database: this.database });
    if (opts.collection) params.set('collection', opts.collection);
    if (opts.id)         params.set('id', opts.id);
    const { data } = await this._fetch('GET', `/context/relations?${params}`);
    return data.data || {};
  }

  // ─── METRICS ──────────────────────────────────────────────────────────────

  /** Return current session metrics snapshot */
  getMetrics() {
    const m = this.metrics;
    const avgLatency = m.totalQueries > 0
      ? Math.round(m.totalLatencyMs / m.totalQueries)
      : 0;
    const fastPct = m.totalQueries > 0
      ? Math.round((m.fastQueries / m.totalQueries) * 100)
      : 0;
    return {
      totalQueries:    m.totalQueries,
      fastQueries:     m.fastQueries,
      thinkingQueries: m.thinkingQueries,
      fastPct,
      avgLatencyMs:    avgLatency,
      totalCostUsd:    Number(m.totalCostUsd.toFixed(4)),
      hydradbCalls:    m.hydradbCalls,
      sessionMinutes:  Math.round((Date.now() - m.sessionStart) / 60000),
    };
  }

  /** Reset metrics for a new session */
  resetMetrics() {
    this.metrics = {
      totalQueries: 0,
      fastQueries: 0,
      thinkingQueries: 0,
      totalLatencyMs: 0,
      totalCostUsd: 0,
      hydradbCalls: 0,
      sessionStart: Date.now(),
    };
  }
}

// ─── MULTI-HOP REASONING ENGINE ───────────────────────────────────────────

/**
 * Execute a named multi-hop reasoning plan.
 * Each step can choose fast or thinking mode based on heuristics.
 *
 * @param {HydraDBClient} client
 * @param {string} question  - High-level question driving the plan
 * @param {Array<HopSpec>} plan
 *   HopSpec: { label, query, collection, forceMode, metadataFilters }
 * @returns {ReasoningTrace}
 */
export async function executeReasoningPlan(client, question, plan) {
  const trace = {
    question,
    hops: [],
    startedAt: Date.now(),
  };

  for (let i = 0; i < plan.length; i++) {
    const spec = plan[i];
    // Auto-select mode: use thinking for semantic/temporal hops, fast for metadata
    const autoMode = _shouldUseThinking(spec) ? 'thinking' : 'fast';
    const mode = spec.forceMode || autoMode;

    const hopStart = Date.now();
    let result;
    try {
      result = await client.query(spec.query, {
        collection:      spec.collection,
        mode,
        queryBy:         spec.queryBy || 'hybrid',
        metadataFilters: spec.metadataFilters,
        queryApps:       spec.queryApps !== false,
      });
    } catch (err) {
      result = { chunks: [], sources: [], latencyMs: Date.now() - hopStart, error: err.message };
    }

    trace.hops.push({
      hopNumber:   i + 1,
      label:       spec.label || `Hop ${i + 1}`,
      query:       spec.query,
      collection:  spec.collection || 'all',
      mode,
      autoMode,
      latencyMs:   result.latencyMs,
      costUsd:     result.costUsd || 0,
      chunks:      result.chunks || [],
      error:       result.error || null,
    });
  }

  trace.finishedAt     = Date.now();
  trace.totalLatencyMs = trace.hops.reduce((s, h) => s + h.latencyMs, 0);
  trace.totalCostUsd   = Number(trace.hops.reduce((s, h) => s + (h.costUsd || 0), 0).toFixed(4));
  trace.fastHops       = trace.hops.filter(h => h.mode === 'fast').length;
  trace.thinkingHops   = trace.hops.filter(h => h.mode === 'thinking').length;

  return trace;
}

/** Heuristic: should this hop use thinking mode? */
function _shouldUseThinking(spec) {
  const q = (spec.query || '').toLowerCase();
  const thinkingKeywords = [
    'why', 'decide', 'reason', 'contradict', 'evolution', 'temporal',
    'history', 'compare', 'sentiment', 'relationship', 'who is responsible',
    'what changed', 'aggregate', 'summarize across',
  ];
  return thinkingKeywords.some(kw => q.includes(kw));
}

// ─── STORAGE HELPERS ──────────────────────────────────────────────────────

/** Save HydraDB API key to chrome.storage.local */
export async function saveHydraDBApiKey(apiKey) {
  await chrome.storage.local.set({ hydradb_api_key: apiKey });
}

/** Load HydraDB API key from chrome.storage.local */
export async function loadHydraDBApiKey() {
  const data = await chrome.storage.local.get(['hydradb_api_key']);
  return data.hydradb_api_key || null;
}
