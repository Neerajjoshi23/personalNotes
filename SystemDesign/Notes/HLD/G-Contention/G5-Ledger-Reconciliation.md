# G5 · Ledger + Reconciliation: money systems are append-only stories, not mutable balances

> **Status:** [ ] Read the blog ? [ ] Read the sources ? [ ] Self-test passed · **Date:** ___
> **Used in:** Payment system / digital wallet / UPI (#16), Ticket / hotel booking refunds (#8), E-commerce / flash sale (#18), Notification/retry idempotency follow-ups (#13)

---

## Why this topic matters

A payments interview is not won by drawing "Payment Service → PSP". The hard part is proving that money did not appear, disappear or move twice when retries, webhooks, timeouts and settlement files disagree.

The core trick: treat money as an **append-only ledger**. Balances are derived views, not hand-edited numbers. External processors and banks are reconciled against your internal ledger.

| Normal app thinking | Money-system thinking |
|---|---|
| Update `users.balance = balance - 100` | Append debit/credit entries; derive balance |
| Retry failed API call | Retry with idempotency key; check existing result |
| PSP webhook says paid | Match to payment intent; transition state once |
| "Exactly once" network call | At-least-once calls + idempotency + reconciliation |
| Debug by latest row | Audit by immutable event/entry history |

**Interview line:** "I store every money movement as immutable double-entry ledger entries. The current balance is a projection. PSP calls and webhooks are idempotent, and daily reconciliation compares our ledger to PSP/bank settlement files."

---

## Part 1: double-entry bookkeeping for developers

Double-entry bookkeeping says every transaction affects at least two accounts, and total debits equal total credits. This is not accounting trivia; it is a consistency model for money.

Example: user adds ₹1,000 to wallet from bank/card.

```text
Transaction: wallet top-up ₹1,000

Debit   PSP clearing / cash receivable      ₹1,000
Credit  User wallet liability               ₹1,000
```

Why user wallet is a liability: the company owes that value to the user. When the user spends wallet money on a ticket:

```text
Transaction: buy ticket with wallet ₹700

Debit   User wallet liability               ₹700
Credit  Merchant / ticket payable           ₹700
```

You do not have to become an accountant for interviews. Know these engineering rules:

| Rule | Engineering value |
|---|---|
| Every transaction balances | Detects missing half of money movement |
| Entries are immutable | Audit and replay are possible |
| Accounts have normal sides | Debits/credits are consistent, not arbitrary plus/minus |
| Balances are derived | Projection bugs can be rebuilt from source |
| Reversals are new entries | You never delete history to "undo" money |

A simple ledger model:

```sql
CREATE TABLE ledger_transactions (
  id UUID PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES ledger_transactions(id),
  account_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Invariant:

```sql
-- For each transaction and currency:
SUM(debits.amount_minor) = SUM(credits.amount_minor)
```

Use integer minor units (`paise`, `cents`), not floating-point money.

---

## Part 2: immutable ledger and balances as derived views

A wallet service may keep a `balances` table for fast reads, but the ledger is the source of truth.

```
ledger_transactions + ledger_entries  ───►  balance projection
          source of truth                   fast query view
```

Balance projection:

```sql
CREATE TABLE account_balances (
  account_id TEXT NOT NULL,
  currency CHAR(3) NOT NULL,
  posted_balance_minor BIGINT NOT NULL,
  pending_balance_minor BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (account_id, currency)
);
```

Two implementation options:

1. **Write ledger entries and balance projection in the same DB transaction.** Simple if ledger and balance live in one database.
2. **Append ledger entries, then update projections asynchronously.** More scalable, but reads may lag; expose `posted` vs `pending` carefully.

Do not update balances without ledger entries. If a projection is wrong, you should be able to rebuild:

```sql
SELECT account_id, currency,
       SUM(CASE WHEN direction='DEBIT' THEN amount_minor ELSE -amount_minor END) AS balance
FROM ledger_entries
GROUP BY account_id, currency;
```

The sign depends on account normal side; the important idea is that entries drive balances, not the other way around.

### Posted vs pending

Payments often have stages:

- **Authorized:** card has a hold; money not settled.
- **Captured:** PSP captured funds.
- **Settled:** funds appear in bank/merchant settlement.
- **Refunded/chargeback:** later reversal or dispute.

Wallet UX may show:

| Balance | Meaning |
|---|---|
| Available | User can spend now |
| Pending | Held/authorized but not final |
| Posted/settled | Final accounting balance |

In interviews, be clear about which balance you use for spending decisions.

---

## Part 3: idempotent payment flow with PSP

A payment service talks to a PSP such as Stripe/Razorpay/Adyen. Networks fail, users refresh, and PSP webhooks arrive multiple times. The flow must be idempotent.

```
Client -> Order service -> Payment service -> PSP
                         <- webhook/redirect <- PSP
Payment service -> ledger -> order saga
```

Payment intent state machine:

```text
CREATED
  -> PSP_REQUESTED
  -> AUTHORIZED
  -> CAPTURED
  -> SETTLED
  -> FAILED
  -> REFUND_PENDING -> REFUNDED
  -> CHARGEBACK
```

Minimal tables:

```sql
CREATE TABLE payments (
  payment_id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount_minor BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  status TEXT NOT NULL,
  psp TEXT NOT NULL,
  psp_payment_id TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX one_successful_payment_per_order
ON payments(order_id)
WHERE status IN ('AUTHORIZED','CAPTURED','SETTLED');
```

Request flow:

1. Client sends `POST /orders/{id}/pay` with an idempotency key.
2. Payment service creates or finds a `payments` row for that key.
3. It calls PSP with the same stable idempotency key or PSP-specific key.
4. PSP response/webhook updates payment state if transition is valid.
5. Ledger entries are appended when money movement is confirmed according to business policy.
6. Order saga moves forward or compensates.

Do not trust only the synchronous PSP response. The response can be lost. Webhooks can be delayed. The payment page redirect can be forged. Always verify with PSP identifiers/signatures and idempotent state transitions.

```sql
UPDATE payments
SET status = 'CAPTURED', psp_payment_id = :psp_id
WHERE payment_id = :payment_id
  AND status IN ('PSP_REQUESTED', 'AUTHORIZED');
```

If the update affects zero rows, the event is duplicate, out of order, or invalid. Handle it explicitly.

---

## Part 4: exactly-once money movement in practice

"Exactly once" is not achieved by hoping a network call runs once. It is achieved by combining several boring controls:

| Control | What it prevents |
|---|---|
| Idempotency key | Duplicate client/worker retries creating two payments |
| Unique constraints | Two successful payments for same order |
| State machine | Invalid transitions like `FAILED -> CAPTURED` without review |
| Ledger transaction balancing | Missing debit/credit half |
| Outbox/CDC | State updated but event not published |
| Reconciliation | External PSP/bank truth differs from internal state |

A robust capture handler:

```text
handle PSP_CAPTURED(payment_id, psp_event_id):
  begin transaction
    if event psp_event_id already processed: return stored result
    load payment row FOR UPDATE
    if payment already CAPTURED/SETTLED: mark event duplicate; commit
    if transition invalid: mark event needs_review; commit
    update payment status to CAPTURED
    insert balanced ledger transaction with idempotency key capture:payment_id
    insert outbox event PaymentCaptured
    mark psp_event_id processed
  commit
```

This is why [G4 Sagas](G4-Sagas.md) and [D3 Idempotency](../D-Async/D3-Delivery-Semantics-Idempotency.md) matter. Money movement is at-least-once execution made safe by idempotent state.

### Reversals, refunds and chargebacks

Never delete or mutate old ledger entries. Add new entries linked to the original transaction.

```text
Original payment ₹700:
Debit   Cash/PSP clearing        700
Credit  Merchant payable         700

Refund ₹700:
Debit   Merchant payable         700
Credit  Cash/PSP clearing        700
```

If a refund fails at PSP but your ledger says refunded, reconciliation should catch it. Ideally append ledger entries when the refund is confirmed or represent pending refund separately.

---

## Part 5: reconciliation: internal ledger vs PSP/bank files

Reconciliation answers: "Do our records match the external world?"

External sources:

- PSP payment events and dashboard/API.
- PSP settlement files: what was actually settled, fees, taxes, chargebacks.
- Bank statements: money that hit bank accounts.
- Internal order/wallet ledger.

Daily reconciliation shape:

```
PSP settlement file ─┐
PSP API events      ─┼─► reconciliation job ─► matched / mismatch / needs review
Internal ledger     ??
```

Match keys:

| Internal field | External field |
|---|---|
| `psp_payment_id` | PSP transaction ID |
| `order_id` / metadata | merchant reference |
| amount + currency | amount + currency |
| settlement date | settlement batch date |
| fee/tax fields | PSP fee/tax fields |

Mismatch examples:

| Mismatch | Possible cause | Action |
|---|---|---|
| PSP captured, internal failed | Lost webhook or timeout | Update payment, append ledger, alert if old |
| Internal captured, PSP missing | Bad state transition or PSP reversal | Investigate; maybe mark needs review |
| Amount differs | Currency/fee/tax/rounding bug | Do not auto-fix silently; create adjustment with approval |
| Duplicate PSP transaction | Retry without idempotency | Link/void/refund duplicate; root-cause |
| Settlement less fees | Fees not accounted | Book fee entries to expense account |

Reconciliation should produce durable records:

```sql
CREATE TABLE reconciliation_items (
  id UUID PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  internal_reference TEXT,
  status TEXT NOT NULL CHECK (status IN ('MATCHED','MISMATCH','NEEDS_REVIEW','RESOLVED')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
```

For an interview, mention both automated matching and manual review. Real money systems have operations teams; the design should support them with audit trails and safe adjustment entries.

---

## Part 6: audit, reporting and operational guardrails

Money systems should be boring to operate.

Guardrails:

- No floating-point amounts.
- Every ledger transaction balances per currency.
- Immutable entries; corrections are reversals/adjustments.
- Unique idempotency keys for external side effects.
- PSP webhook signature verification.
- State transition table, not arbitrary status updates.
- Outbox events for downstream systems.
- Reconciliation jobs and dashboards.
- Alerts on unmatched high-value transactions.
- Role-based access and approval for manual adjustments.

Observability examples:

| Metric | Why |
|---|---|
| payments by status and age | Find stuck `PSP_REQUESTED` / `REFUND_PENDING` |
| reconciliation mismatch count | External/internal drift |
| duplicate idempotency hits | Retry storms or client bugs |
| ledger imbalance attempts | Serious code bug; page immediately |
| PSP webhook lag | Delayed state transitions |

A useful audit trail can answer:

- Who initiated the payment?
- Which idempotency key was used?
- What PSP request/response IDs were involved?
- Which ledger entries were created?
- Which settlement file matched it?
- If adjusted, who approved it and why?

This is the difference between a toy payment diagram and an interview-ready one.

---

## Part 7: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| User wallet balance | Append-only double-entry ledger + balance projection | Auditability and rebuildability |
| Client retries payment button | Idempotency key + existing payment row | Prevents duplicate PSP calls/payments |
| PSP webhook duplicate | Processed-events table + state machine | Webhooks are at-least-once |
| Order paid but shipping fails | Saga compensation: void/refund; ledger reversal if needed | Payment is part of larger workflow |
| Need current balance fast | Materialized balance table updated from ledger | Fast reads without losing source of truth |
| End-of-day settlement | Reconciliation job against PSP/bank files | Catches lost events and fee/amount differences |
| Manual correction | Adjustment ledger transaction with approval/audit | Never mutate old entries |

### Common interview traps

- Storing only mutable `balance` and no ledger history.
- Using floating-point types for money.
- Saying "exactly once" without idempotency keys and unique constraints.
- Trusting browser redirect instead of PSP webhook/server verification.
- Ignoring duplicate/out-of-order webhooks.
- Forgetting reconciliation with PSP settlement and bank statements.
- Deleting ledger entries for refunds instead of appending reversal entries.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why are balances derived views in a money system?</summary>

Because the immutable ledger is the auditable source of truth. A balance table can be wrong or stale; it can be rebuilt from ledger entries. Directly mutating balances without entries loses history and makes reconciliation hard.
</details>

<details><summary>2. What does double-entry bookkeeping guarantee?</summary>

Every transaction has balanced debit and credit entries per currency. Total money is accounted for: a movement out of one account is matched by movement into another account or liability/revenue/expense account.
</details>

<details><summary>3. Why do PSP calls need idempotency keys?</summary>

The client, worker or network can retry after a timeout where the original request may actually have succeeded. A stable idempotency key lets the PSP/payment service return the same result instead of creating a duplicate charge.
</details>

<details><summary>4. How should duplicate PSP webhooks be handled?</summary>

Store processed PSP event IDs, lock/load the payment row, apply only valid state transitions, and return success for duplicates. Do not append duplicate ledger entries.
</details>

<details><summary>5. What is reconciliation?</summary>

A periodic comparison between internal payment/ledger records and external PSP or bank settlement records. It classifies matches and mismatches, then triggers automated fixes or manual review.
</details>

<details><summary>6. Give an example of a reconciliation mismatch and action.</summary>

PSP settlement shows a captured payment that internal state still marks failed, likely due to a lost webhook. The job should verify the PSP transaction, transition payment to captured, append ledger entries idempotently, and alert if outside normal delay.
</details>

<details><summary>7. How do refunds appear in an append-only ledger?</summary>

As new reversal entries linked to the original transaction, not by deleting or editing original entries. The refund debits/credits the opposite accounts according to policy.
</details>

<details><summary>8. What database constraints help prevent duplicate successful payments?</summary>

A unique idempotency key and a partial unique index such as one successful `AUTHORIZED/CAPTURED/SETTLED` payment per order. Ledger transaction idempotency keys also prevent duplicate entries.
</details>

---

## My notes (write from memory after reading)

- 
- 
- 

**One thing I'd have got wrong before reading this:**

---

## Sources / read more

| Source | What to read | Where / time |
|---|---|---|
| [Modern Treasury: Accounting for Developers, Part I](https://www.moderntreasury.com/journal/accounting-for-developers-part-i) | Headings: "Introduction", "Why Developers Need to Understand Accounting", "Core Concepts: Accounts, Transactions, and Ledgers", "What is an Account in Accounting?", "How Transactions Work in a Ledger", "Understanding Debit Vs. Credit Normal Accounts", "What are Debits and Credits in Accounting?", "How to Ensure Your Ledger is Balanced" | ~35 min |
| **Alex Xu Vol 2, ch 11: Payment System** | Payment state, PSP integration, reconciliation ideas | [PDF p.316](<../../../Books/System Design Interview Vol 2 - Alex Xu.pdf#page=316>) |
| **Alex Xu Vol 2, ch 12: Digital Wallet** | Wallet ledger and balance model | [PDF p.342](<../../../Books/System Design Interview Vol 2 - Alex Xu.pdf#page=342>) |

**Connects to:** [G4 Sagas](G4-Sagas.md) · [D3 Delivery semantics + idempotency](../D-Async/D3-Delivery-Semantics-Idempotency.md) · [D4 Outbox + CDC](../D-Async/D4-Outbox-CDC.md) · [B3 Transactions](../B-Data/B3-Transactions-Isolation.md) · Questions: Payment/wallet (#16), Ticket booking (#8), Flash sale (#18)
