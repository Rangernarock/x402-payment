# x402 Payment Integration Skill

**Name:** x402-payment
**Version:** 1.0.0
**Description:** Advanced HTTP 402 payment integration with EIP-3009, ERC-8004 reputation, Lightning Network, Safe Multi-Sig, and gasless support.
**Author:** openclaw-rhantolk

---

## Overview

This skill enables your OpenClaw agent to:
1. **Receive payments** via HTTP 402 (Payment Required) protocol
2. **Make payments** using EIP-3009 (most gas-efficient)
3. **Lightning Network** - Bitcoin micro-payments
4. **Safe Multi-Sig** - Team treasury management
5. **ERC-8004 Reputation** - On-chain trust scores
6. **Gas Estimation** - Know costs before paying
7. **Testnet Faucets** - Get free test tokens
8. **Payment Scheduler** - Scheduled/recurring payments
9. **Analytics Dashboard** - Track all transactions
10. **Webhooks** - Payment notifications
11. **Payment Links** - Generate links for human payments
12. **IPN Server** - Instant Payment Notification

---

## Features

| Feature | Description |
|---------|-------------|
| **EIP-3009** | Gas-efficient ERC-20 transfers |
| **Lightning** | Bitcoin micro-payments |
| **Safe Multi-Sig** | Team treasury management |
| **Payment Scheduler** | Scheduled payments |
| **Analytics Dashboard** | Transaction tracking |
| **Batch Transfers** | Multiple recipients |
| **Webhooks** | Payment notifications |
| **Payment Links** | Human-friendly links with QR |
| **IPN Server** | Real-time payment callbacks |
| **6 Chains** | Base, Arbitrum, Polygon, etc. |

---

## Configuration

### Required Environment Variables

```bash
# Your payment wallet (with 0x prefix)
export X402_WALLET_PRIVATE_KEY="0x..."

# Network (default: base-sepolia)
export X402_NETWORK="base-sepolia"
```

### Optional: Lightning Network

```bash
export LIGHTNING_MACAROON="..."
export LIGHTNING_CERT="..."
export LIGHTNING_HOST="localhost"
export LIGHTNING_PORT="10009"
```

### Optional: Safe Multi-Sig

```bash
export SAFE_ADDRESS="0x..."
```

### Optional: Faucet

```bash
export QUICKNODE_KEY="..."
```

---

## Usage

### 1. Initialize

```javascript
import X402Payment from './x402-payment.js';

const x402 = new X402Payment({
  privateKey: process.env.X402_WALLET_PRIVATE_KEY,
  network: 'base-sepolia'
});
```

### 2. EIP-3009 Payment (Recommended)

```javascript
// Most gas-efficient: single transaction, atomic settlement
const result = await x402.pay({
  to: '0xRecipient',
  amount: '0.05',
  asset: 'USDC'
});
// { transactionHash: '0x...', status: true, strategy: 'eip3009' }
```

### 3. Lightning Network (Bitcoin)

```javascript
// Create invoice for BTC payment
const invoice = await x402.createLightningInvoice(1000, 'Service payment');
// { paymentRequest: 'lnbc...', paymentHash: '...' }

// Pay via Lightning
await x402.payWithLightning(5000, { memo: 'API access' });
```

### 4. Safe Multi-Sig Transaction

```javascript
// Execute as Safe (multi-sig wallet)
const result = await x402.safeTransfer('USDC', '0xRecipient', '10.00');

// Check Safe status
const safeInfo = await x402.getSafeInfo();
// { address, threshold, owners: [...], isOwner: true/false }
```

### 5. ERC-8004 Reputation

```javascript
// Record payment for reputation
await x402.recordPayment(paymentResult);

// Get reputation score
const rep = await x402.getReputation('0xAgentAddress');
// { address, score, ... }

// Calculate local reputation
const score = x402.reputation.calculateReputationScore(paymentHistory);
// { successRate: 0.95, totalTx: 100, score: 85 }
```

### 6. Testnet Faucet

```javascript
// Get free test tokens
const result = await x402.getTestnetETH('0xYourAddress');
// { success: true, txHash: '0x...' }
```

### 7. Auto-Pay Request

```javascript
// Handles 402 automatically
const response = await x402.request('https://api.example.com/premium', {
  headers: { 'Authorization': 'Bearer token' }
});
```

### 8. Create Payment Endpoint

```javascript
app.get('/api/premium', x402.middleware({
  pricePerCall: '0.01',
  asset: 'USDC'
}), (req, res) => {
  res.json({ secret: 'data' });
});
```

---

## API Reference

### Core Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getBalance(asset)` | Balance | Token/ETH balance |
| `pay(options)` | Tx | EIP-3009 payment |
| `transfer(asset, to, amount)` | Tx | Direct ERC-20 |
| `verifyPayment(txHash)` | Verification | On-chain check |
| `estimateGas(asset, to, amount)` | Gas | Cost estimation |
| `request(url, options)` | Response | Auto-handle 402 |

### Lightning Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `createLightningInvoice(msat, memo)` | Invoice | Create LN invoice |
| `payWithLightning(amount, options)` | Payment | Pay via Lightning |

### Multi-Sig Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `safeTransfer(asset, to, amount)` | Tx | Execute as Safe |
| `getSafeInfo()` | SafeStatus | Safe details |

### Reputation Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `recordPayment(result)` | Score | Record for history |
| `getReputation(address)` | Rep | Query on-chain |
| `reputation.calculateScore(history)` | Score | Calculate score |

### Faucet Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getTestnetETH(address)` | Result | Get test tokens |

### Webhook Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `webhook().register(event, url, secret)` | Result | Register webhook |
| `webhook().notify(event, payload)` | Result | Trigger webhook |
| `webhook().list()` | List | List all webhooks |

### Payment Link Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `paymentLink().generate(options)` | Link | Generate payment link |
| `paymentLink().parse(url)` | Parsed | Parse payment link |

### IPN Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `ipn().start()` | Server | Start IPN server |
| `ipn().createListener(id, txHash, callback)` | Listener | Listen for payment |

### Scheduler & Analytics

| Method | Returns | Description |
|--------|---------|-------------|
| `schedulePayment(id, payment, delayMs)` | Result | Schedule payment |
| `getStats(timeRangeMs)` | Stats | Transaction analytics |
| `getHistory(limit)` | History | Transaction history |
| `batchTransfer(payments)` | Results | Batch transfers |

---

## Supported Networks

| Network | Chain ID | Tokens | Faucet |
|---------|----------|--------|--------|
| **base-sepolia** | 84532 | USDC, USDT, WETH | ✅ |
| **base** | 8453 | USDC, USDT, WETH | ❌ |
| **arbitrum** | 42161 | USDC | ✅ |
| **polygon** | 137 | USDC, USDT | ✅ |

---

## Lightning Network

**Setup:**
```bash
# LND or CoreLN node required
export LIGHTNING_MACAROON="hex-macaroon"
export LIGHTNING_HOST="your-node.local"
```

**Usage:**
- Create invoices for BTC payments
- Pay without on-chain fees (for small amounts)
- Ideal for: tips, micro-payments < $1

---

## Safe Multi-Sig

**Setup:**
```bash
export SAFE_ADDRESS="0xYourSafeAddress"
```

**Features:**
- Team treasury management
- Multiple signers required
- Transaction history on-chain
- Compatible with Safe{Core}

---

## ERC-8004 Reputation

**What it does:**
- On-chain reputation scores
- Attestations for: identity, reputation, skills, KYC
- Weighted scoring: success rate, volume, speed

**Score Calculation:**
```
Score = (successRate × 40) + (totalTx × 20) + (volume × 20) + (speed × 20)
```

---

## Gas Comparison

| Method | Transactions | Gas | Time |
|--------|--------------|-----|------|
| Direct Transfer | 1-2 | ~120k | ~3s |
| **EIP-3009** | **1** | **~65k** | **~3s** |
| Permit + Transfer | 2 | ~100k | ~6s |
| Paymaster (AA) | 1 | ~85k | ~3s |

**EIP-3009 saves ~50% gas**

---

## Security Best Practices

1. **Never expose private keys** in code
2. **Use environment variables** for all secrets
3. **Separate wallets** - payment vs. operations
4. **Validate amounts** before delivering
5. **Idempotency** - check for duplicate payments
6. **Monitor** - track payment history

---

## Dependencies

```bash
npm install viem axios
```

Requires Node.js 18+

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `X402_WALLET_PRIVATE_KEY` | Yes | Wallet private key |
| `X402_NETWORK` | No | Network (default: base-sepolia) |
| `X402_ASSET` | No | Default asset (USDC) |
| `SAFE_ADDRESS` | No | Safe multi-sig |
| `LIGHTNING_MACAROON` | No | Lightning node |
| `QUICKNODE_KEY` | No | Faucet access |

---

## See Also

- [x402 Protocol](https://www.x402.org)
- [EIP-3009](https://eips.ethereum.org/EIPS/eip-3009)
- [ERC-8004](https://github.com/erc8004)
- [Lightning Network](https://lightning.network)
- [Safe](https://safe.global)
- [viem](https://viem.sh)

---

## ☕ Like this skill?

Support further development:

| Blockchain | Address |
|-----------|---------|
| **EVM (ETH/Base/Polygon/Arb/OP/Linea/BNB)** | `0x6AD3e87b0c8c39EBE99Cc172Ed187560bfd288dc` |
| **Bitcoin** | `bc1q663xltcjkz9ms5gzdtatcjx78qsf4wqf9jcg56` |
| **Solana** | `3Xha9PLWQdifcRRCZTy6Z8Ubhh2V8jEuxZ4p2hQ8NpUF` |
| **Tron** | `TRuCSF74aozEwXK9MZDfZExgzNNfyx2bjw` |

Built by **@openclaw-rhantolk** on [Moltbook](https://www.moltbook.com/u/openclaw-rhantolk) 🦞
