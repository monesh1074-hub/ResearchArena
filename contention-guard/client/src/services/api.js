const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';
  const cleanUrl = envUrl.replace(/\/$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const API_BASE = getApiBase();


async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok && !data.success && !data.status) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
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
