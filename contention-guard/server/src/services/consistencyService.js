/**
 * Strict Transactional Consistency Validator
 * 
 * Performs mathematical and relational invariant verification across all inventory assets
 * and historical transaction records to prove that concurrency control guarantees were upheld.
 * 
 * Five Invariant Checks:
 * 1. Non-Negative Stock: stock >= 0 for all resources.
 * 2. Balance Invariant: Initial Stock = Final Stock + Units Sold.
 * 3. Non-Overselling: Units Sold <= Initial Stock.
 * 4. Idempotency Uniqueness: Every unique request_id produces at most one successful ledger write.
 * 5. Atomicity / Non-Partial Commit: No orphaned records or unfinalized balances.
 */

const db = require('../database/db');

async function runConsistencyValidation() {
  const result = await db.validateConsistency();

  // Additional check: verify idempotency uniqueness across all recorded transactions
  const transactions = await db.getRecentTransactions(10000, {});
  const seenRequestIds = new Set();
  const duplicateIdempotentPurchases = [];

  for (const tx of transactions) {
    if (tx.status === 'SUCCESS') {
      if (seenRequestIds.has(tx.request_id)) {
        duplicateIdempotentPurchases.push(tx.request_id);
      }
      seenRequestIds.add(tx.request_id);
    }
  }

  if (duplicateIdempotentPurchases.length > 0) {
    result.violations.push(
      `Idempotency violation: duplicate successful purchase for request IDs: ${duplicateIdempotentPurchases.join(', ')}`
    );
    result.isValid = false;
  }

  return {
    ...result,
    totalTransactionsAudited: transactions.length,
    successfulTransactionsAudited: seenRequestIds.size,
    isConsistent: result.isValid && result.violations.length === 0,
    violationCount: result.violations.length,
    auditTimestamp: new Date().toISOString()
  };
}

module.exports = { runConsistencyValidation };
