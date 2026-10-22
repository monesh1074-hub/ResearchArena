import { browserEngine } from './browserEngine';

const getApiBase = () => {
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    const cleanUrl = envUrl.replace(/\/$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  return '/api';
};

const API_BASE = getApiBase();

let useBrowserEngine = false;

async function fetchJson(endpoint, options = {}) {
  if (useBrowserEngine) {
    return handleBrowserFallback(endpoint, options);
  }

  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 404 || !response.ok) {
      // If deployed statically without backend, automatically activate client-side engine
      useBrowserEngine = true;
      return handleBrowserFallback(endpoint, options);
    }

    const data = await response.json().catch(() => ({}));
    return data;
  } catch (err) {
    // Network failure -> seamlessly switch to browser engine
    useBrowserEngine = true;
    return handleBrowserFallback(endpoint, options);
  }
}

function handleBrowserFallback(endpoint, options = {}) {
  if (endpoint.startsWith('/health')) {
    return { data: browserEngine.getHealth() };
  }
  if (endpoint.startsWith('/products')) {
    return { success: true, data: browserEngine.getProducts() };
  }
  if (endpoint.startsWith('/simulation/status')) {
    return { success: true, data: browserEngine.getSimulationStatus() };
  }
  if (endpoint.startsWith('/simulation/start')) {
    const body = options.body ? JSON.parse(options.body) : {};
    return { success: true, data: browserEngine.startSimulation(body) };
  }
  if (endpoint.startsWith('/simulation/stop')) {
    return { success: true, data: browserEngine.stopSimulation() };
  }
  if (endpoint.startsWith('/simulation/reset')) {
    const body = options.body ? JSON.parse(options.body) : {};
    browserEngine.reset(body.initialInventory || 100);
    return { success: true, message: 'Reset successful' };
  }
  if (endpoint.startsWith('/simulation/compare')) {
    const body = options.body ? JSON.parse(options.body) : {};
    return { success: true, data: browserEngine.runComparisonBenchmark(body) };
  }
  if (endpoint.startsWith('/metrics')) {
    return { success: true, data: browserEngine.getMetrics() };
  }
  if (endpoint.startsWith('/strategy/events')) {
    return { success: true, data: browserEngine.getStrategyEvents() };
  }
  if (endpoint.startsWith('/transactions')) {
    return { success: true, data: browserEngine.getTransactions() };
  }
  if (endpoint.startsWith('/consistency/report')) {
    return { success: true, data: browserEngine.getConsistencyReport() };
  }
  return { success: true, data: {} };
}

export const api = {
  // Health & Catalog
  getHealth: () => fetchJson('/health'),
  getProducts: () => fetchJson('/products'),
  createProduct: (data) => fetchJson('/products', { method: 'POST', body: JSON.stringify(data) }),

  // Transactions
  purchase: (data) => fetchJson('/transactions/purchase', { method: 'POST', body: JSON.stringify(data) }),
  getTransactions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/transactions${query ? `?${query}` : ''}`);
  },

  // Simulator Controls
  startSimulation: (config) => fetchJson('/simulation/start', { method: 'POST', body: JSON.stringify(config) }),
  stopSimulation: () => fetchJson('/simulation/stop', { method: 'POST' }),
  resetSimulation: (config = {}) => fetchJson('/simulation/reset', { method: 'POST', body: JSON.stringify(config) }),
  runComparison: (config = {}) => fetchJson('/simulation/compare', { method: 'POST', body: JSON.stringify(config) }),
  getSimulationStatus: () => fetchJson('/simulation/status'),
  getExportCsvUrl: () => `${API_BASE}/simulation/export-csv`,

  // Telemetry & Adaptive
  getMetrics: () => fetchJson('/metrics'),
  getStrategyEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/strategy/events${query ? `?${query}` : ''}`);
  },
  getAdaptiveStatus: () => fetchJson('/strategy/adaptive'),
  updateAdaptiveConfig: (config) => fetchJson('/strategy/config', { method: 'POST', body: JSON.stringify(config) }),

  // Consistency Report
  getConsistencyReport: () => fetchJson('/consistency/report'),
};
