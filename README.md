# ContentionGuard | Adaptive Transaction Intelligence
> **A Research Platform and Benchmark Suite Evaluating Optimistic Concurrency Control (OCC), Pessimistic Concurrency Control (PCC), and Contention-Aware Adaptive Guard for Web API Transactions.**

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-10%2F10%20Passed%20(100%25)-success.svg)](#6-automated-tests)

---

## 1. Research Objective

In high-volume e-commerce, ticketing, and fintech web APIs, concurrent purchase requests frequently compete for limited resources (e.g., inventory flash sales). Standard static concurrency protocols suffer from severe trade-offs:
- **Optimistic Concurrency Control (OCC)** achieves ultra-high throughput under low contention by avoiding locks, but collapses under high contention due to repeated validation failures, retry thrashing, and high transaction abort rates.
- **Pessimistic Concurrency Control (PCC)** serializes updates via row-level locks (`SELECT ... FOR UPDATE`), eliminating retry thrashing and ensuring zero conflicts, but introduces lock queuing latency and lower throughput during low-contention periods.

### Core Research Question
> *"Can a contention-aware adaptive concurrency control mechanism improve transaction throughput and response time while maintaining strict data consistency under changing workloads?"*

**ContentionGuard** implements and benchmarks an intelligent controller—the **Contention-Aware Adaptive Guard**—which monitors real-time transaction telemetry over a sliding window, computes a normalized contention score, and dynamically shifts between OCC and PCC using dual-threshold hysteresis and cooldown mechanics.

---

## 2. Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|               ContentionGuard Web Dashboard (React + Vite + Tailwind + Recharts)  |
|  - Real-time KPIs (TPS, Latency, Conflicts)  - Workload Profile Generator         |
|  - Live Hysteresis Contention Gauge          - Interactive Comparison & CSV Export|
+------------------------------------------+----------------------------------------+
                                           | HTTP REST API (port 4000)
                                           v
+-----------------------------------------------------------------------------------+
|                        Express.js Application & REST Router                       |
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
| - Version-conditional update      |   | - PostgreSQL SELECT ... FOR UPDATE        |
| - WHERE id=$1 AND version=$2      |   | - Mutex row locking & queue wait metrics  |
| - Jittered exponential backoff    |   | - Atomic commit / safe rollback           |
+-----------------+-----------------+   +---------------------+---------------------+
                  \                                   /
                   \                                 /
                    v                               v
+-----------------------------------------------------------------------------------+
|                       Database Storage Engine Abstraction Layer                   |
|                                                                                   |
|  [Mode A: PostgreSQL 16 (Real DB)]          [Mode B: In-Memory Transaction Engine]|
|  - Connection pooling via `pg.Pool`         - Mutex row lock queues with timeouts |
|  - Full MVCC & ACID transactions            - Versioned CAS & Rollback primitives |
|  - CHECK (stock >= 0) constraint            - Atomic stock integrity validation   |
|                                                                                   |
|  * Seamless auto-fallback: if PostgreSQL is offline, In-Memory Engine activates   |
|    automatically and is clearly labeled in the UI badge.                          |
+-----------------------------------------------------------------------------------+
```

---

## 3. Concurrency Control Implementations

### A. Optimistic Concurrency Control (OCC) — `server/src/concurrency/occ.js`
- **Read Phase**: Fetches current product stock and `version`.
- **Validation & Commit Phase**: Issues conditional update:
  ```sql
  UPDATE products 
  SET stock = stock - $1, version = version + 1, updated_at = CURRENT_TIMESTAMP
  WHERE id = $2 AND version = $3 AND stock >= $1
  RETURNING stock, version;
  ```
- **Conflict Handling**: If zero rows updated, detects concurrent modification, applies exponential backoff with full random jitter:
  $$\text{backoff} = \text{random}(0, \min(T_{\max}, T_{\text{base}} \times 2^{\text{attempt}}))$$
- **Termination**: Bounded to `OCC_MAX_RETRIES` (default 4). If stock is depleted, fast-fails immediately without retrying.

### B. Pessimistic Concurrency Control (PCC) — `server/src/concurrency/pcc.js`
- **Lock Acquisition**: Checks out database client and begins transaction:
  ```sql
  BEGIN;
  SELECT id, name, stock, version FROM products WHERE id = $1 FOR UPDATE;
  ```
- **Lock Wait Tracking**: Measures elapsed time waiting in database lock queue.
- **Stock Validation & Atomic Write**: Validates `stock >= quantity`, executes decrement, commits transaction with `COMMIT`.
- **Safe Rollback**: If stock is insufficient or error occurs, rolls back cleanly with `ROLLBACK`.

### C. Contention-Aware Adaptive Guard — `server/src/concurrency/adaptive.js`
- **Telemetry Window**: Retains last $W = 50$ transactions.
- **Contention Score Formula**:
  $$S_{\text{contention}} = 0.45 \times C_{\text{conflict}} + 0.25 \times \min\left(1, \frac{R_{\text{avg}}}{2.0}\right) + 0.15 \times \min\left(1, \frac{L_{\text{avg}} - L_{\text{base}}}{3 \times L_{\text{base}}}\right) + 0.15 \times \min\left(1, \frac{W_{\text{lock}}}{80}\right)$$
- **Hysteresis Dual Thresholds**:
  - $S \ge 0.40$ (High Threshold): Escalate to **PCC**.
  - $S \le 0.15$ (Low Threshold): De-escalate to **OCC**.
  - $0.15 < S < 0.40$ (Hysteresis Band): Retain current strategy, preventing jitter and oscillation.
- **Cooldown Filter**: Requires $\ge 10$ transactions or $\ge 2000$ ms before permitting a subsequent strategy flip.
- **Hot-Resource Override**: Evaluates per-resource contention so hot items can be routed to PCC while cold items run on OCC concurrently.

---

## 4. Database Schema

Defined in `server/migrations/init.sql`:

```sql
-- Products Catalog
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    stock INT NOT NULL CHECK (stock >= 0),
    version INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transaction Audit Ledger
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    request_id VARCHAR(128) UNIQUE NOT NULL,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id),
    strategy VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    retries INT NOT NULL DEFAULT 0,
    conflict_detected BOOLEAN NOT NULL DEFAULT FALSE,
    execution_time_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Strategy Transition Event History
CREATE TABLE IF NOT EXISTS strategy_events (
    id SERIAL PRIMARY KEY,
    previous_strategy VARCHAR(32) NOT NULL,
    new_strategy VARCHAR(32) NOT NULL,
    contention_score DOUBLE PRECISION NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Idempotency Ledger
CREATE TABLE IF NOT EXISTS idempotency_keys (
    request_id VARCHAR(128) PRIMARY KEY,
    status VARCHAR(32) NOT NULL,
    response_body JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Setup & Execution Commands

### Prerequisites
- Node.js v18+ (v20+ recommended)
- Optional: PostgreSQL (if unavailable, in-memory mode runs automatically with zero configuration)

### Quick Start (Single Command)
From the `contention-guard` root directory:

```bash
# 1. Install root, server, and client dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 2. Run both Backend API (port 4000) and Frontend Dashboard (port 5173) concurrently
npm run dev
```

The application will be available at:
- **Dashboard UI**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:4000](http://localhost:4000)
- **Healthcheck**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

### Running Separately
```bash
# Terminal 1: Start Backend API
cd server
npm start

# Terminal 2: Start Vite Client
cd client
npm run dev
```

---

## 6. Automated Tests

Run the test suite verifying all 10 transaction correctness and concurrency conditions:

```bash
cd server
npm test
```

### Test Verification Matrix
| Test Case | Condition Tested | Verification Method | Result |
|-----------|------------------|---------------------|--------|
| **1. OCC Conflict Detection** | Atomic version mismatch detection | Concurrent conditional updates with identical versions | **PASSED** |
| **2. PCC Serialization** | Row-level locking (`FOR UPDATE`) | 10 concurrent requests to single row serialized safely | **PASSED** |
| **3. Adaptive Escalation** | Strategy escalation under contention | Sustained validation aborts trigger OCC $\rightarrow$ PCC | **PASSED** |
| **4. Hysteresis Stability** | Anti-chattering band | Mid-range score (30%) remains stable, no flip-flopping | **PASSED** |
| **5. Bounded Retries** | Infinite loop prevention | Max retries (3) enforced with jittered backoff | **PASSED** |
| **6. High Contention Oversell Guard** | Requests (25) exceed stock (5) | Exactly 5 succeed, 20 rejected, stock = 0 (never negative) | **PASSED** |
| **7. Insufficient Stock Safety** | Request quantity > stock | Clean 409 rejection, zero partial deduction | **PASSED** |
| **8. Idempotency Key Replay** | Identical request_id replay | Returns cached response, inventory decremented only ONCE | **PASSED** |
| **9. 3-Way Consistency Check** | All 3 strategies pass invariants | OCC, PCC, and Adaptive pass mathematical consistency audit | **PASSED** |
| **10. Healthcheck & Metadata** | API contract validity | Health endpoint reports engine mode and catalog items | **PASSED** |

---

## 7. Example API Requests & Responses

### 1. Healthcheck
```bash
curl http://localhost:4000/api/health
```
```json
{
  "status": "HEALTHY",
  "service": "Contention-Aware Transaction Guard (CTG)",
  "version": "1.0.0",
  "database": {
    "mode": "memory",
    "isPostgres": false,
    "isInMemory": true,
    "label": "In-Memory Simulation Engine"
  }
}
```

### 2. Purchase via OCC
```bash
curl -X POST http://localhost:4000/api/transactions/purchase \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod-1","quantity":1,"strategy":"OCC","requestId":"req-demo-001"}'
```
```json
{
  "success": true,
  "status": "SUCCESS",
  "transactionId": "tx-1729608000-a1b",
  "requestId": "req-demo-001",
  "productId": "prod-1",
  "strategy": "OCC",
  "retries": 0,
  "conflictDetected": false,
  "executionTimeMs": 2.1,
  "newStock": 99,
  "newVersion": 2,
  "message": "Transaction committed successfully under OCC"
}
```

### 3. Purchase via PCC (Row Lock)
```bash
curl -X POST http://localhost:4000/api/transactions/purchase \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod-1","quantity":1,"strategy":"PCC","requestId":"req-demo-002"}'
```

### 4. Purchase via Contention-Aware Adaptive Guard
```bash
curl -X POST http://localhost:4000/api/transactions/purchase \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod-1","quantity":1,"strategy":"ADAPTIVE","requestId":"req-demo-003"}'
```
```json
{
  "success": true,
  "status": "SUCCESS",
  "productId": "prod-1",
  "strategy": "ADAPTIVE",
  "routedStrategy": "PCC",
  "adaptiveDetails": {
    "routedStrategy": "PCC",
    "contentionScore": 0.54,
    "decisionReason": "Global adaptive state: PCC (Score: 54.0%)"
  },
  "newStock": 97
}
```

### 5. Run Automated Comparison Benchmark
```bash
curl -X POST http://localhost:4000/api/simulation/compare \
  -H "Content-Type: application/json" \
  -d '{"workloadProfile":"high","concurrentClients":15,"totalTransactions":150,"hotResourcePercentage":85,"initialInventory":100}'
```

### 6. Export Benchmark CSV
```bash
curl http://localhost:4000/api/simulation/export-csv -o ctg_benchmark_results.csv
```

---

## 8. Invariant Verification & Correctness Guarantees

Every benchmark run is mathematically audited by `server/src/services/consistencyService.js` against five formal invariants:

1. **Non-Negative Stock Invariant**:
   $$\forall p \in \text{Products},\quad \text{stock}(p) \ge 0$$
2. **Exact Inventory Balance Invariant**:
   $$\text{InitialStock}(p) = \text{CurrentStock}(p) + \sum_{t \in \text{Tx}_{\text{success}}(p)} \text{quantity}(t)$$
3. **Non-Overselling Invariant**:
   $$\sum_{t \in \text{Tx}_{\text{success}}(p)} \text{quantity}(t) \le \text{InitialStock}(p)$$
4. **Idempotency Uniqueness**:
   $$\forall \text{reqId},\quad |\{t \in \text{Tx}_{\text{success}} \mid \text{request\_id}(t) = \text{reqId}\}| \le 1$$
5. **No Orphaned or Partial Commits**:
   Transactions either commit completely or roll back with zero side effects.

---

## 9. Research Findings & Empirical Trade-Offs

| Concurrency Protocol | Low Contention Performance | High Contention Performance | Conflict Behavior | Latency Profile | Best Suited For |
|---|---|---|---|---|---|
| **OCC** | **Superior** (Zero lock overhead, maximum parallelism) | **Degrades** (Retry thrashing, aborts) | High version collisions, backoff loops | Low median, high p95/p99 tail latency | Read-heavy or distributed write workloads |
| **PCC** | **Moderate** (Lock acquire/release overhead) | **Superior** (Serialized queue, zero aborts) | 0% validation conflicts | Consistent median latency, lock queue wait | High contention flash sales, hot resources |
| **Adaptive Guard (CTG)** | **Optimal** (Routes to OCC fast-path) | **Optimal** (Escalates to PCC locks) | Dampened (Transitory during switch) | Lowest balanced p95 latency | Real-world dynamic traffic, burst contention |

---

## 10. 3-Minute Demonstration Script

- **[0:00 - 0:40] Introduction & Core Problem**: Open the dashboard at `http://localhost:5173`. Point out the header showing the active strategy, contention score gauge, and database status badge. Explain the research question: OCC collapses under write contention, while PCC incurs lock overhead when contention is low.
- **[0:40 - 1:20] Running Low Contention Workload (OCC Mode)**: Select the "Low Contention" profile. Click "Start Sim". Show the throughput climbing above 1000 tps with 0% conflict rate. Show that OCC delivers maximum throughput with minimum latency.
- **[1:20 - 2:00] Burst Contention & Adaptive Response**: Switch strategy to "Adaptive Guard" and select the "Burst Contention" profile. Click "Start Sim". Watch the live charts as the burst phase triggers: the contention score rises past the 40% threshold, the strategy pill transitions from OCC $\rightarrow$ PCC, and the Strategy Transition Events feed logs the exact reason. Notice that transaction aborts remain zero because row locks serialize the hot item.
- **[2:00 - 2:30] Automated 3-Way Benchmark**: Click "Run Comparison". Explain that the engine resets the database to identical baselines and runs identical workloads across OCC, PCC, and Adaptive. Point to the generated Research Comparison bar charts and the Invariant Verification Audit Matrix proving 0 violations.
- **[2:30 - 3:00] Data Export & Invariant Proof**: Click "Export Benchmark CSV" to download the raw trial metrics for academic reporting. Highlight that all three protocols preserved 100% data consistency with zero negative stock.
