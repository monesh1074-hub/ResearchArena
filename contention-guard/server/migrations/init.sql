-- Contention-Aware Transaction Guard (CTG)
-- Database Initialization & Schema Migration

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    stock INT NOT NULL CHECK (stock >= 0),
    version INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS strategy_events (
    id SERIAL PRIMARY KEY,
    previous_strategy VARCHAR(32) NOT NULL,
    new_strategy VARCHAR(32) NOT NULL,
    contention_score DOUBLE PRECISION NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
    request_id VARCHAR(128) PRIMARY KEY,
    status VARCHAR(32) NOT NULL,
    response_body JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_strategy_events_created_at ON strategy_events(created_at);

-- Initial seed catalog
INSERT INTO products (id, name, stock, version, updated_at)
VALUES 
    ('prod-1', 'Titanium CyberPhone Pro (Hot Item)', 100, 1, CURRENT_TIMESTAMP),
    ('prod-2', 'Quantum Core GPU 48GB', 100, 1, CURRENT_TIMESTAMP),
    ('prod-3', 'Spatial Audio Headset X', 100, 1, CURRENT_TIMESTAMP),
    ('prod-4', 'Ergonomic Mechanical Keyboard', 100, 1, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE 
SET stock = EXCLUDED.stock, version = 1, updated_at = CURRENT_TIMESTAMP;
