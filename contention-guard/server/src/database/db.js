const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { inMemoryDb } = require('./inMemoryDb');

let pool = null;
let currentMode = process.env.DB_MODE === 'postgres' ? 'postgres' : 'memory';
let isPgConnected = false;
let dbStatusMessage = 'Running in In-Memory Simulation Engine';

/**
 * Initialize Database Layer
 */
async function initDb() {
  if (process.env.DB_MODE === 'postgres') {
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        database: process.env.PGDATABASE || 'contention_guard',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 10000,
        max: 20
      });

      // Test connection
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        isPgConnected = true;
        currentMode = 'postgres';
        dbStatusMessage = 'Connected to PostgreSQL';
        console.log('[DB] Successfully connected to PostgreSQL.');

        // Run migrations
        const migrationPath = path.join(__dirname, '../../migrations/init.sql');
        if (fs.existsSync(migrationPath)) {
          const sql = fs.readFileSync(migrationPath, 'utf8');
          await client.query(sql);
          console.log('[DB] PostgreSQL schema migrations applied successfully.');
        }
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn(`[DB] PostgreSQL connection failed (${err.message}). Falling back to In-Memory Engine.`);
      currentMode = 'memory';
      isPgConnected = false;
      dbStatusMessage = `In-Memory Simulation Mode (PostgreSQL unavailable: ${err.code || err.message})`;
    }
  } else {
    currentMode = 'memory';
    isPgConnected = false;
    dbStatusMessage = 'In-Memory Simulation Engine Mode';
    console.log('[DB] Initialized in In-Memory Simulation Mode.');
  }

  return {
    mode: currentMode,
    isPgConnected,
    dbStatusMessage
  };
}

/**
 * Get DB metadata & health
 */
function getDbStatus() {
  return {
    mode: currentMode,
    isPostgres: currentMode === 'postgres',
    isInMemory: currentMode === 'memory',
    isConnected: currentMode === 'postgres' ? isPgConnected : true,
    label: currentMode === 'postgres' ? 'PostgreSQL (Real Database)' : 'In-Memory Simulation Engine',
    statusMessage: dbStatusMessage
  };
}

/**
 * Product Retrieval
 */
async function getProduct(productId) {
  if (currentMode === 'memory') {
    return await inMemoryDb.getProduct(productId);
  }

  const res = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
  return res.rows[0] || null;
}

async function getAllProducts() {
  if (currentMode === 'memory') {
    return await inMemoryDb.getAllProducts();
  }

  const res = await pool.query('SELECT * FROM products ORDER BY id ASC');
  return res.rows;
}

async function createProduct({ id, name, stock }) {
  if (currentMode === 'memory') {
    return await inMemoryDb.createProduct({ id, name, stock });
  }

  const res = await pool.query(
    'INSERT INTO products (id, name, stock, version, updated_at) VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP) RETURNING *',
    [id, name, stock]
  );
  return res.rows[0];
}

/**
 * OCC Update: Atomic conditional version check and decrement
 */
async function occUpdateStock({ productId, expectedVersion, quantity }) {
  if (currentMode === 'memory') {
    return await inMemoryDb.occUpdateStock({ productId, expectedVersion, quantity });
  }

  // Atomic conditional update in PostgreSQL
  const res = await pool.query(
    `UPDATE products 
     SET stock = stock - $1, 
         version = version + 1, 
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND version = $3 AND stock >= $1
     RETURNING stock, version`,
    [quantity, productId, expectedVersion]
  );

  if (res.rowCount === 0) {
    // Check whether failure was due to version mismatch or insufficient stock
    const current = await getProduct(productId);
    if (!current) {
      return { success: false, reason: 'PRODUCT_NOT_FOUND' };
    }
    if (current.version !== expectedVersion) {
      return {
        success: false,
        reason: 'VERSION_MISMATCH',
        currentVersion: current.version,
        currentStock: current.stock
      };
    }
    if (current.stock < quantity) {
      return {
        success: false,
        reason: 'INSUFFICIENT_STOCK',
        currentStock: current.stock
      };
    }
    return { success: false, reason: 'CONCURRENT_CONFLICT' };
  }

  return {
    success: true,
    newStock: res.rows[0].stock,
    newVersion: res.rows[0].version
  };
}

/**
 * PCC Update: Row-level lock (SELECT ... FOR UPDATE) inside transaction
 */
async function pccExecuteTransaction(productId, quantity, txId) {
  if (currentMode === 'memory') {
    const lockResult = await inMemoryDb.pccAcquireLock(productId, txId, parseInt(process.env.PCC_LOCK_TIMEOUT_MS || '5000', 10));
    if (!lockResult.acquired) {
      return {
        success: false,
        reason: lockResult.reason || 'LOCK_TIMEOUT',
        lockWaitMs: lockResult.waitMs
      };
    }

    try {
      const updateResult = await inMemoryDb.pccUpdateStock({ productId, quantity, txId });
      return {
        ...updateResult,
        lockWaitMs: lockResult.waitMs
      };
    } finally {
      inMemoryDb.pccReleaseLock(productId, txId);
    }
  }

  // PostgreSQL implementation with client checkout and row-level locking
  const client = await pool.connect();
  const lockStart = Date.now();
  let lockWaitMs = 0;

  try {
    await client.query('BEGIN');

    // Acquire exclusive row lock on targeted product
    const selectRes = await client.query(
      'SELECT id, name, stock, version FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );
    lockWaitMs = Date.now() - lockStart;

    if (selectRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'PRODUCT_NOT_FOUND', lockWaitMs };
    }

    const product = selectRes.rows[0];
    if (product.stock < quantity) {
      await client.query('ROLLBACK');
      return {
        success: false,
        reason: 'INSUFFICIENT_STOCK',
        currentStock: product.stock,
        lockWaitMs
      };
    }

    // Perform atomic decrement
    const updateRes = await client.query(
      `UPDATE products 
       SET stock = stock - $1, 
           version = version + 1, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 
       RETURNING stock, version`,
      [quantity, productId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      newStock: updateRes.rows[0].stock,
      newVersion: updateRes.rows[0].version,
      lockWaitMs
    };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) { }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Idempotency ledger
 */
async function getIdempotencyRecord(requestId) {
  if (currentMode === 'memory') {
    return await inMemoryDb.getIdempotencyRecord(requestId);
  }

  const res = await pool.query('SELECT * FROM idempotency_keys WHERE request_id = $1', [requestId]);
  return res.rows[0] || null;
}

async function setIdempotencyRecord(requestId, status, responseBody) {
  if (currentMode === 'memory') {
    return await inMemoryDb.setIdempotencyRecord(requestId, status, responseBody);
  }

  await pool.query(
    `INSERT INTO idempotency_keys (request_id, status, response_body, created_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (request_id) DO UPDATE 
     SET status = EXCLUDED.status, response_body = EXCLUDED.response_body`,
    [requestId, status, JSON.stringify(responseBody)]
  );
}

/**
 * Transaction logging
 */
async function recordTransaction(txRecord) {
  if (currentMode === 'memory') {
    return await inMemoryDb.recordTransaction(txRecord);
  }

  const res = await pool.query(
    `INSERT INTO transactions 
     (id, request_id, product_id, strategy, status, retries, conflict_detected, execution_time_ms, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      txRecord.id,
      txRecord.request_id,
      txRecord.product_id,
      txRecord.strategy,
      txRecord.status,
      txRecord.retries || 0,
      !!txRecord.conflict_detected,
      txRecord.execution_time_ms || 0
    ]
  );
  return res.rows[0];
}

async function getRecentTransactions(limit = 100, filters = {}) {
  if (currentMode === 'memory') {
    return await inMemoryDb.getRecentTransactions(limit, filters);
  }

  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];

  if (filters.strategy && filters.strategy !== 'ALL') {
    params.push(filters.strategy.toUpperCase());
    query += ` AND UPPER(strategy) = $${params.length}`;
  }
  if (filters.status && filters.status !== 'ALL') {
    params.push(filters.status.toUpperCase());
    query += ` AND UPPER(status) = $${params.length}`;
  }
  if (filters.productId && filters.productId !== 'ALL') {
    params.push(filters.productId);
    query += ` AND product_id = $${params.length}`;
  }

  params.push(limit);
  query += ` ORDER BY created_at DESC LIMIT $${params.length}`;

  const res = await pool.query(query, params);
  return res.rows;
}

/**
 * Strategy Events Logging
 */
async function recordStrategyEvent({ previousStrategy, newStrategy, contentionScore, reason }) {
  if (currentMode === 'memory') {
    return await inMemoryDb.recordStrategyEvent({ previousStrategy, newStrategy, contentionScore, reason });
  }

  const res = await pool.query(
    `INSERT INTO strategy_events (previous_strategy, new_strategy, contention_score, reason, created_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     RETURNING *`,
    [previousStrategy, newStrategy, contentionScore, reason]
  );
  return res.rows[0];
}

async function getStrategyEvents(limit = 50) {
  if (currentMode === 'memory') {
    return await inMemoryDb.getStrategyEvents(limit);
  }

  const res = await pool.query(
    'SELECT * FROM strategy_events ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return res.rows;
}

/**
 * Reset database state
 */
async function resetDatabase(customStock = 100) {
  if (currentMode === 'memory') {
    return await inMemoryDb.reset(customStock);
  }

  await pool.query('BEGIN');
  try {
    await pool.query('DELETE FROM transactions');
    await pool.query('DELETE FROM strategy_events');
    await pool.query('DELETE FROM idempotency_keys');
    await pool.query('UPDATE products SET stock = $1, version = 1, updated_at = CURRENT_TIMESTAMP', [customStock]);
    await pool.query('COMMIT');
    return { success: true, message: 'PostgreSQL database successfully reset' };
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
}

/**
 * Consistency Verification Matrix
 */
async function validateConsistency() {
  if (currentMode === 'memory') {
    return inMemoryDb.validateConsistency();
  }

  const violations = [];
  const products = await getAllProducts();
  const productStats = {};

  for (const prod of products) {
    const txRes = await pool.query(
      "SELECT COUNT(*) as count FROM transactions WHERE product_id = $1 AND status = 'SUCCESS'",
      [prod.id]
    );
    const unitsSold = parseInt(txRes.rows[0].count, 10);
    const initialStock = 100; // standard baseline or tracked
    const expectedStock = initialStock - unitsSold;

    if (prod.stock < 0) {
      violations.push(`Negative stock detected for ${prod.id}: ${prod.stock}`);
    }
    if (prod.stock !== expectedStock) {
      violations.push(
        `Mismatch for ${prod.id}: Current(${prod.stock}) != Initial(${initialStock}) - Sold(${unitsSold})`
      );
    }
    if (unitsSold > initialStock) {
      violations.push(`Overselling detected for ${prod.id}: Sold ${unitsSold} > ${initialStock}`);
    }

    productStats[prod.id] = {
      name: prod.name,
      initialStock,
      currentStock: prod.stock,
      unitsSold,
      expectedStock,
      version: prod.version,
      isConsistent: prod.stock >= 0 && prod.stock === expectedStock && unitsSold <= initialStock
    };
  }

  return {
    isValid: violations.length === 0,
    violations,
    productStats,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  initDb,
  getDbStatus,
  getProduct,
  getAllProducts,
  createProduct,
  occUpdateStock,
  pccExecuteTransaction,
  getIdempotencyRecord,
  setIdempotencyRecord,
  recordTransaction,
  getRecentTransactions,
  recordStrategyEvent,
  getStrategyEvents,
  resetDatabase,
  validateConsistency
};
