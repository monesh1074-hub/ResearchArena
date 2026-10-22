# Research Arena | Contention-Aware Transaction Guard (CTG)
> **A High-Performance Research Benchmark Platform Evaluating Optimistic Concurrency Control (OCC), Pessimistic Concurrency Control (PCC), and Dynamic Contention-Aware Adaptive Guarding for Web API Transactions.**

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployable-black.svg)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

---

## 1. Research Overview

In high-concurrency web applications (e.g., e-commerce flash sales, ticketing platforms, financial order books), simultaneous write transactions compete for shared resources. Standard static concurrency protocols suffer from severe fundamental trade-offs:

* **Optimistic Concurrency Control (OCC)**: Validates versions at commit time (`WHERE id = $1 AND version = $2`). Outstandingly fast with zero locking overhead under low contention, but collapses under high contention due to cascading version collisions, exponential backoff retries, and high abort rates.
* **Pessimistic Concurrency Control (PCC)**: Serializes write access through row-level exclusive locks (`SELECT ... FOR UPDATE`). Eliminates conflict aborts and protects hot inventory, but introduces substantial lock queuing latency and lower throughput during low-contention periods.

### The Research Question
> *"Can a contention-aware adaptive concurrency control mechanism dynamically balance transaction throughput, conflict rates, and tail latency while strictly preserving data consistency under volatile workloads?"*

**Research Arena** implements the **Contention-Aware Adaptive Guard (CTG)**—an intelligent routing engine that continuously monitors telemetry across a sliding observation window, calculates a normalized contention score, and dynamically switches between OCC and PCC using dual-threshold hysteresis and cooldown mechanics.

---

## 2. System Architecture

```
+-----------------------------------------------------------------------------------+
|               Research Arena Web Dashboard (React 18 + Vite + Recharts)           |
|  - Real-time KPIs (TPS, Latency, Conflicts)  - Workload Profile Generator         |
|  - Live Hysteresis Contention Gauge          - Interactive Comparison & CSV Export|
|  - Anti-Fluctuation State Guard              - Continuous Telemetry Engine        |
+------------------------------------------+----------------------------------------+
                                           | Integrated Middleware (Vite: 5173 / Vercel: /api)
                                           v
+-----------------------------------------------------------------------------------+
|                        Express.js Backend API & Simulator                         |
|   /api/health       /api/products       /api/transactions/purchase                |
|   /api/simulation/* /api/metrics        /api/strategy/*    /api/consistency/report|
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                      Idempotency & Request Ledger Guard                           |
|       - Atomic Request-ID Deduplication (Prevents duplicate decrements on replay) |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                      Contention-Aware Adaptive Guard (CTG)                        |
|   - Real-time Sliding Window (N=50 observations)                                  |
|   - Multi-factor Contention Score: Conflicts (45%) + Retries (25%) + Latency (30%)|
|   - Dual-Threshold Hysteresis: High = 40% (Escalate PCC) | Low = 15% (Revert OCC) |
|   - Cooldown Period (10 transactions / 2000 ms) to prevent routing oscillation    |
+---------------------+-------------------------------+-----------------------------+
                      |                               |
       [Low Contention / Fallback]      [High Contention / Hot-Resource]
                      v                               v
+-----------------------------------+   +-------------------------------------------+
| Optimistic Concurrency (OCC)      |   | Pessimistic Concurrency (PCC)             |
| Atomic Version Compare-and-Swap   |   | Exclusive Row-Level Lock                  |
| Exponential Jittered Backoff Loop |   | (SELECT ... FOR UPDATE)                   |
+-----------------------------------+   +-------------------------------------------+
                      |                               |
                      +---------------+---------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|               Dual-Engine Storage Layer (In-Memory Engine & PostgreSQL)           |
|   - Strict Invariant Verification Matrix (Zero Negative Stock, Exact Balances)    |
+-----------------------------------------------------------------------------------+
```

---

## 3. Quick Start

### Prerequisites
* **Node.js**: v18.0 or newer
* **npm**: v9.0 or newer

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/monesh1074-hub/ResearchArena.git
   cd ResearchArena
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Launch the application with a single command:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   ```
   http://localhost:5173
   ```
   Both the React frontend dashboard and all `/api/*` backend endpoints execute simultaneously from this single command.

---

## 4. Single-Command Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Starts Vite dev server with integrated Express API middleware on `http://localhost:5173` |
| `npm run build` | Compiles optimized, chunk-split production bundle into `dist/` |
| `npm run preview` | Previews the compiled production build locally |
| `npm start` | Serves compiled React app and API through `server.cjs` on port `4000` |
| `npm run deploy` | Deploys directly to Vercel via CLI |

---

## 5. Deploying to Vercel

The application is pre-configured for **zero-config, zero-error deployment** on Vercel:

### Option 1: Via Vercel Web Dashboard (Recommended)
1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository: `monesh1074-hub/ResearchArena`.
3. Leave all build and framework settings as default (`vercel.json` handles everything).
4. Click **Deploy**.

### Option 2: Via Terminal
```bash
npx vercel --prod
```

### Why It Works Without Errors on Vercel
* **SPA URL Rewriting**: Configured in `vercel.json` so refreshing routes never throws a 404 error.
* **Serverless Backend Routing**: Requests to `/api/(.*)` route directly to the Express serverless handler in `api/index.js`.
* **Zero-Fluctuation Guarantee**: Includes an **Anti-Fluctuation State Guard** and client-side simulation engine fallback (`src/services/browserEngine.js`) so telemetry and charts never stutter or reset to 0 across Vercel's multi-container edge network.

---

## 6. Workload Contention Profiles

The simulator tests transactional behavior under four distinct workload profiles:

1. **Low Contention**:
   * Requests are distributed uniformly across catalog items (~20% hot-item targeting).
   * Demonstrates OCC delivering peak non-blocking throughput and sub-millisecond latencies.
2. **Medium Contention**:
   * Moderate clustering on hot inventory (~50%).
   * Version collisions begin to trigger backoff retries.
3. **High Contention**:
   * Extreme write contention on a single hot item (~90%).
   * OCC collapses into retry thrashing; PCC and Adaptive Guard stabilize performance via serialized row-level locks.
4. **Burst Wave Contention**:
   * Dynamic time-varying contention wave:
     * *Phase 1 (0–25%)*: Calm baseline (15% contention) $\rightarrow$ Runs in OCC mode.
     * *Phase 2 (25–75%)*: Flash sale surge (95% contention) $\rightarrow$ Contention score crosses 40% threshold, triggering automatic shift to PCC.
     * *Phase 3 (75–100%)*: Contention subsides $\rightarrow$ Contention score drops below 15%, smoothly reverting back to OCC after cooldown.

---

## 7. Comparative Benchmark Summary

| Concurrency Protocol | Low Contention | High Contention | Conflict Behavior | Latency Profile | Best Suited For |
|---|---|---|---|---|---|
| **OCC** | **Superior** (Max parallelism, no locks) | **Collapses** (Retry thrashing, aborts) | High version collisions, backoff loops | Low median, high p95/p99 tail latency | Read-heavy or low write contention |
| **PCC** | **Moderate** (Lock acquire overhead) | **Superior** (Zero conflicts, serialized) | 0% validation conflicts | Consistent median latency, lock queuing | High contention flash sales, hot resources |
| **Adaptive Guard (CTG)** | **Optimal** (Routes to OCC fast-path) | **Optimal** (Escalates to PCC locks) | Dampened (Transitory during transition) | Lowest balanced p95 latency | Real-world dynamic traffic, burst contention |

---

## 8. Invariant Verification & Correctness Guarantees

Every transaction run is mathematically validated in real time against five formal invariants:

1. **Non-Negative Stock Invariant**:
   $$\forall p \in \text{Products},\quad \text{stock}(p) \ge 0$$
2. **Exact Inventory Balance Invariant**:
   $$\text{InitialStock}(p) = \text{CurrentStock}(p) + \sum_{t \in \text{Tx}_{\text{success}}(p)} \text{quantity}(t)$$
3. **Non-Overselling Invariant**:
   $$\sum_{t \in \text{Tx}_{\text{success}}(p)} \text{quantity}(t) \le \text{InitialStock}(p)$$
4. **Idempotency Uniqueness**:
   $$\forall \text{reqId},\quad |\{t \in \text{Tx}_{\text{success}} \mid \text{request\_id}(t) = \text{reqId}\}| \le 1$$
5. **Atomic Commit or Rollback**:
   Transactions commit completely or abort with zero partial state mutations.

---

## 9. Project Directory Structure

```
Research Arena/
├── index.html                   # React HTML5 root entry
├── vite.config.js               # Vite config with integrated Express API middleware
├── tailwind.config.js           # Tailwind theme & color tokens
├── postcss.config.js            # PostCSS configuration
├── package.json                 # Single unified project dependencies & scripts
├── vercel.json                  # Vercel deployment & rewrite rules
├── .env.example                 # Environment variables specification
├── api/
│   └── index.js                 # Express API handler (Vercel Serverless Function)
├── src/
│   ├── main.jsx                 # React root mount
│   ├── App.jsx                  # Main benchmark dashboard & anti-fluctuation guard
│   ├── index.css                # Global CSS styles & cards
│   ├── components/              # Modular UI components
│   │   ├── Header.jsx           # Status banner & theme toggle
│   │   ├── OverviewCards.jsx    # Real-time KPI summary cards
│   │   ├── WorkloadControls.jsx # Simulation parameters & profile selector
│   │   ├── LiveCharts.jsx       # Recharts live throughput, latency & hysteresis curves
│   │   ├── ComparisonSection.jsx# 3-way benchmark bar charts & matrix
│   │   ├── TransactionLogs.jsx  # Real-time transaction audit ledger
│   │   ├── StrategyEventsFeed.jsx # Transition event history feed
│   │   ├── AdaptiveConfigModal.jsx# Threshold & cooldown tuning modal
│   │   └── ChallengeOverview.jsx# Academic problem statement & methodology
│   ├── lib/                     # Core backend concurrency & simulation engines
│   │   ├── concurrency/         # OCC, PCC, and Adaptive Guard algorithms
│   │   ├── database/            # In-Memory Simulation DB & PostgreSQL pool
│   │   ├── metrics/             # Real-time telemetry & percentile calculator
│   │   ├── services/            # Transaction inventory & consistency validator
│   │   └── simulator/           # Multi-worker asynchronous workload simulator
│   └── services/
│       ├── api.js               # Client API service with Vercel environment detection
│       └── browserEngine.js     # Continuous client simulation engine for Vercel
└── server.cjs                   # Optional standalone production server entry
```

---

## 10. API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | System health check and storage engine status |
| `/api/products` | `GET`, `POST` | List catalog items or create a new inventory item |
| `/api/transactions/purchase` | `POST` | Execute atomic purchase with specified strategy (`OCC`, `PCC`, `ADAPTIVE`) |
| `/api/transactions` | `GET` | Retrieve transaction audit history with filtering |
| `/api/simulation/start` | `POST` | Start asynchronous concurrent transaction simulation |
| `/api/simulation/stop` | `POST` | Stop active workload simulation |
| `/api/simulation/reset` | `POST` | Reset catalog stock, transactions, and metrics |
| `/api/simulation/compare` | `POST` | Execute automated 3-way benchmark across all protocols |
| `/api/simulation/status` | `GET` | Fetch active simulation progress and dispatch statistics |
| `/api/simulation/export-csv` | `GET` | Download transaction audit log as CSV |
| `/api/metrics` | `GET` | Aggregated throughput, latencies, and time-series data |
| `/api/strategy/adaptive` | `GET` | Real-time adaptive controller score and threshold status |
| `/api/strategy/config` | `POST` | Update adaptive thresholds and cooldown parameters |
| `/api/consistency/report` | `GET` | Execute 5-point mathematical consistency audit |

---

## 11. Demonstration Walkthrough (3 Minutes)

1. **Dashboard Overview (0:00 - 0:40)**:
   * Open `http://localhost:5173`.
   * Point out the live telemetry banner, database status (In-Memory Engine), and the active strategy pill.
2. **Low Contention (OCC Mode) (0:40 - 1:15)**:
   * Select **Low Contention** profile, strategy **OCC**.
   * Click **Start Simulation**. Observe throughput surging above 1000 TPS with 0% conflict rate.
3. **Burst Wave & Adaptive Shift (1:15 - 2:00)**:
   * Select **Adaptive Guard** and **Burst Wave** profile.
   * Click **Start Simulation**.
   * Watch the contention score surge as flash traffic hits. At >40% contention, the strategy automatically escalates from **OCC $\rightarrow$ PCC** to serialize the hot product with 0 aborts.
   * Once contention drops below 15%, the system reverts back to OCC.
4. **Automated 3-Way Benchmark (2:00 - 2:40)**:
   * Click **Run Comparison**.
   * The benchmark resets stock to identical baselines and tests OCC, PCC, and Adaptive under identical conditions.
   * Review the Comparative Results bar charts and the verified Invariant Audit.
5. **Data Export & Audit (2:40 - 3:00)**:
   * Click **Export Benchmark CSV** to download raw trial metrics.

---

## 12. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
