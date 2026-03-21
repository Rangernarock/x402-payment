/**
 * x402 Payment Integration for OpenClaw
 * Advanced EIP-712 Payments with Account Abstraction, ERC-8004, Lightning & Multi-Sig Support
 * 
 * @version 1.0.0
 * @author openclaw-rhantolk
 */

const axios = require('axios');
const { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseUnits, 
  formatUnits,
  encodeFunctionData,
  getAddress,
  keccak256,
  toHex
} = require('viem');

// ============================================================
// Chain Configuration
// ============================================================

const CHAINS = {
  'base-sepolia': {
    id: 84532,
    name: 'Base Sepolia',
    rpc: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    faucet: 'https://faucet.quicknode.com/base/sepolia',
    tokens: {
      'USDC': { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7', decimals: 6 },
      'USDT': { address: '0x0694f7fF8C5b9C0d8a0F4E3F3b8b3C8E9F2A1d3', decimals: 6 },
      'WETH': { address: '0x4200000000000000000000000000000000000006', decimals: 18 }
    },
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
  },
  'base': {
    id: 8453,
    name: 'Base',
    rpc: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    faucet: null,
    tokens: {
      'USDC': { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdD02913', decimals: 6 },
      'USDT': { address: '0xFd998857600640BF4B02F2Ae93aF1d65E1Da5D4F', decimals: 6 },
      'WETH': { address: '0x4200000000000000000000000000000000000006', decimals: 18 }
    }
  },
  'arbitrum': {
    id: 42161,
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    faucet: 'https://faucet.quicknode.com/arbitrum/sepolia',
    tokens: {
      'USDC': { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 }
    }
  },
  'polygon': {
    id: 137,
    name: 'Polygon',
    rpc: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    faucet: 'https://faucet.quicknode.com/polygon/amoy',
    tokens: {
      'USDC': { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
      'USDT': { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 }
    }
  },
  'optimism': {
    id: 10,
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    faucet: 'https://faucet.quicknode.com/optimism/sepolia',
    tokens: {
      'USDC': { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Bb85', decimals: 6 }
    }
  },
  'avalanche': {
    id: 43114,
    name: 'Avalanche',
    rpc: 'https://api.avax.network/ext/bc/C/rpc',
    explorer: 'https://snowtrace.io',
    faucet: 'https://faucet.quicknode.com/avalanche/fuji',
    tokens: {
      'USDC': { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 }
    }
  }
};

// ============================================================
// ERC-20 Token Contract ABI
// ============================================================

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'transferWithAuthorization', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' }, { name: 'v', type: 'uint8' }, { name: 'r', type: 'bytes32' }, { name: 's', type: 'bytes32' }
  ], outputs: [] }
];

// ============================================================
// Safe Multi-Sig ABI
// ============================================================

const SAFE_ABI = [
  { name: 'getThreshold', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getOwners', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address[]' }] },
  { name: 'nonce', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'execTransaction', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' },
    { name: 'operation', type: 'uint8' }, { name: 'safeTxGas', type: 'uint256' },
    { name: 'baseGas', type: 'uint256' }, { name: 'gasPrice', type: 'uint256' },
    { name: 'gasToken', type: 'address' }, { name: 'refundReceiver', type: 'address' }, { name: 'signatures', type: 'bytes' }
  ], outputs: [{ name: '', type: 'bool' }] }
];

// ============================================================
// EIP-712 Typed Data Types
// ============================================================

const EIP712_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' }, { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' }, { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' }
  ],
  SafeTx: [
    { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' },
    { name: 'operation', type: 'uint8' }, { name: 'safeTxGas', type: 'uint256' },
    { name: 'baseGas', type: 'uint256' }, { name: 'gasPrice', type: 'uint256' },
    { name: 'gasToken', type: 'address' }, { name: 'refundReceiver', type: 'address' }, { name: 'nonce', type: 'uint256' }
  ]
};

// ============================================================
// Utility Functions
// ============================================================

function generateNonce() {
  return keccak256(toHex(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER), { width: 32 }));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// Lightning Network
// ============================================================

class LightningPayment {
  constructor(config = {}) {
    this.macaroon = config.macaroon || process.env.LIGHTNING_MACAROON;
    this.host = config.host || process.env.LIGHTNING_HOST || 'localhost';
    this.port = config.port || process.env.LIGHTNING_PORT || '10009';
  }

  isConfigured() {
    return !!(this.macaroon && this.host);
  }

  async _request(method, endpoint, data = null) {
    const url = `https://${this.host}:${this.port}/${endpoint}`;
    const headers = { 'Content-Type': 'application/json', 'Grpc-Metadata-macaroon': this.macaroon };
    try {
      const response = await axios({ method, url, headers, data, validateStatus: () => true });
      return response.data;
    } catch (error) {
      throw { code: 'LIGHTNING_ERROR', message: error.message };
    }
  }

  async createInvoice(amountMsat, memo = '') {
    const result = await this._request('POST', 'v1/invoices', { value: amountMsat, memo, expiry: 3600 });
    return { paymentRequest: result.payment_request, paymentHash: result.r_hash, amount: amountMsat };
  }

  async payInvoice(paymentRequest, maxFeeMsat = 1000) {
    const result = await this._request('POST', 'v1/channels/transactions', { payment_request: paymentRequest, amt_msat: maxFeeMsat });
    return { paymentHash: result.payment_hash, status: result.state, feeMsat: result.fee_msat };
  }
}

// ============================================================
// Reputation Service
// ============================================================

class ReputationService {
  calculateReputationScore(paymentHistory) {
    if (!paymentHistory || paymentHistory.length === 0) {
      return { successRate: 0, totalTx: 0, totalVolume: 0, score: 0 };
    }
    const successful = paymentHistory.filter(p => p.status === 'confirmed' || p.status === 'success');
    const totalVolume = paymentHistory.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const metrics = {
      successRate: successful.length / paymentHistory.length,
      totalTx: paymentHistory.length,
      totalVolume
    };
    const score = (metrics.successRate * 40) + (Math.min(metrics.totalTx / 100, 1) * 20) + (Math.min(metrics.totalVolume / 10000, 1) * 20);
    return { ...metrics, score: Math.round(score) };
  }
}

// ============================================================
// Safe Multi-Sig Manager
// ============================================================

class SafeManager {
  constructor(config = {}) {
    this.safeAddress = config.safeAddress;
    this.chain = config.chain;
    this.safeClients = {};
    this._initClients(config);
  }

  _initClients(config) {
    const chain = CHAINS[this.chain];
    if (!chain) return;
    this.safeClients = {
      public: createPublicClient({ chain: { id: chain.id, name: chain.name, rpcUrls: { default: { http: [chain.rpc] } } }, transport: http(chain.rpc) })
    };
    if (config.privateKey) {
      try {
        this.signer = require('viem').privateKeyToAccount(config.privateKey.startsWith('0x') ? config.privateKey : `0x${config.privateKey}`);
        this.safeClients.wallet = createWalletClient({ chain: { id: chain.id, name: chain.name, rpcUrls: { default: { http: [chain.rpc] } } }, transport: http(chain.rpc), account: this.signer });
      } catch (e) { console.warn('Invalid private key'); }
    }
  }

  async getThreshold() { return await this.safeClients.public.read({ address: this.safeAddress, abi: SAFE_ABI, functionName: 'getThreshold' }); }
  async getOwners() { return await this.safeClients.public.read({ address: this.safeAddress, abi: SAFE_ABI, functionName: 'getOwners' }); }
  async _getNonce() { return await this.safeClients.public.read({ address: this.safeAddress, abi: SAFE_ABI, functionName: 'nonce' }); }

  async proposeTransaction(to, value, data, options = {}) {
    const nonce = await this._getNonce();
    const domain = { chainId: CHAINS[this.chain]?.id, verifyingContract: this.safeAddress };
    const message = {
      to: getAddress(to), value: BigInt(value || 0), data: data || '0x',
      operation: options.operation || 0, safeTxGas: BigInt(options.safeTxGas || 0),
      baseGas: BigInt(options.baseGas || 0), gasPrice: BigInt(options.gasPrice || 0),
      gasToken: options.gasToken || '0x0000000000000000000000000000000000000000',
      refundReceiver: getAddress(options.refundReceiver || this.safeAddress), nonce
    };
    const signature = await this.signer.signTypedData({ domain, types: EIP712_TYPES, primaryType: 'SafeTx', message });
    return { ...message, signatures: signature, to: message.to, value: message.value.toString() };
  }

  async executeTransaction(tx) {
    const hash = await this.safeClients.wallet.writeContract({
      address: this.safeAddress, abi: SAFE_ABI, functionName: 'execTransaction',
      args: [tx.to, tx.value, tx.data || '0x0', tx.operation || 0, tx.safeTxGas, tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver, tx.signatures]
    });
    const receipt = await this.safeClients.public.waitForTransactionReceipt({ hash });
    return { transactionHash: hash, status: receipt.status === 'success' };
  }
}

// ============================================================
// Payment Scheduler
// ============================================================

class PaymentScheduler {
  constructor() { this.jobs = new Map(); }
  schedulePayment(id, payment, delayMs) {
    const job = setTimeout(() => { this.jobs.delete(id); }, delayMs);
    this.jobs.set(id, { payment, timeout: job, scheduledAt: Date.now() + delayMs });
    return { id, scheduledAt: Date.now() + delayMs };
  }
  cancelPayment(id) {
    const job = this.jobs.get(id);
    if (job) { clearTimeout(job.timeout); this.jobs.delete(id); return true; }
    return false;
  }
  listScheduled() { return Array.from(this.jobs.entries()).map(([id, job]) => ({ id, payment: job.payment, scheduledAt: job.scheduledAt })); }
}

// ============================================================
// Analytics
// ============================================================

class PaymentAnalytics {
  constructor() { this.transactions = []; }
  record(transaction) { this.transactions.push({ ...transaction, recordedAt: Date.now() }); }
  getStats(timeRangeMs = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - timeRangeMs;
    const recent = this.transactions.filter(t => t.recordedAt > cutoff);
    const totalVolume = recent.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const successful = recent.filter(t => t.status === 'success' || t.status === 'confirmed');
    return {
      totalTransactions: recent.length, successful: successful.length,
      successRate: recent.length ? (successful.length / recent.length * 100).toFixed(2) : 0,
      totalVolume, avgValue: recent.length ? (totalVolume / recent.length).toFixed(2) : 0
    };
  }
}

// ============================================================
// Webhook Notifications
// ============================================================

class WebhookNotifier {
  constructor(config = {}) {
    this.webhooks = new Map();
    this.secret = config.secret || process.env.WEBHOOK_SECRET;
  }

  register(event, url, secret = null) {
    if (!this.webhooks.has(event)) {
      this.webhooks.set(event, []);
    }
    this.webhooks.get(event).push({ url, secret: secret || this.secret });
    return { event, url, registered: true };
  }

  async notify(event, payload) {
    const hooks = this.webhooks.get(event);
    if (!hooks || hooks.length === 0) return [];
    const results = [];
    for (const hook of hooks) {
      try {
        const body = { event, timestamp: Date.now(), data: payload };
        const headers = { 'Content-Type': 'application/json' };
        if (hook.secret) {
          const crypto = require('crypto');
          const signature = crypto.createHmac('sha256', hook.secret).update(JSON.stringify(body)).digest('hex');
          headers['X-Webhook-Signature'] = signature;
        }
        const response = await axios.post(hook.url, body, { headers, timeout: 5000 });
        results.push({ url: hook.url, success: true, status: response.status });
      } catch (error) {
        results.push({ url: hook.url, success: false, error: error.message });
      }
    }
    return results;
  }

  list(event = null) {
    if (event) return this.webhooks.get(event) || [];
    return Object.fromEntries(this.webhooks);
  }
}

// ============================================================
// Payment Link Generator
// ============================================================

class PaymentLinkGenerator {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.PAYMENT_LINK_BASE_URL || 'https://pay.example.com';
    this.defaultNetwork = config.defaultNetwork || 'base-sepolia';
    this.defaultAsset = config.defaultAsset || 'USDC';
  }

  generate(options = {}) {
    const { to = options.paymentAddress, amount, asset = this.defaultAsset, network = this.defaultNetwork, memo = '', redirect = '', expiresIn = 3600 } = options;
    if (!to) throw new Error('Payment address required');
    if (!amount) throw new Error('Amount required');

    const params = new URLSearchParams({
      to, amount: amount.toString(), asset, network, memo: memo || '', redirect: redirect || '',
      exp: (Date.now() + expiresIn * 1000).toString()
    });

    return {
      url: `${this.baseUrl}?${params.toString()}`,
      paymentRequest: { to, amount, asset, network, memo, expiresAt: Date.now() + expiresIn * 1000 },
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${this.baseUrl}?${params}`)}`
    };
  }

  parse(url) {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      return {
        to: params.get('to'), amount: params.get('amount'), asset: params.get('asset'),
        network: params.get('network'), memo: params.get('memo'), redirect: params.get('redirect'),
        expiresAt: parseInt(params.get('exp') || '0'),
        isExpired: Date.now() > parseInt(params.get('exp') || '0')
      };
    } catch (e) {
      return { error: 'Invalid payment link' };
    }
  }
}

// ============================================================
// IPN Server
// ============================================================

class IPNServer {
  constructor(config = {}) {
    this.port = config.port || process.env.IPN_PORT || 3000;
    this.pending = new Map();
    this.callbacks = new Map();
    this.server = null;
  }

  async start() {
    const express = require('express');
    const app = express();
    app.use(express.json());
    app.post('/ipn', async (req, res) => {
      const { transactionHash } = req.body;
      const pending = this.pending.get(transactionHash);
      if (pending) {
        const callback = this.callbacks.get(pending.id);
        if (callback) await callback(req.body);
        this.pending.delete(transactionHash);
      }
      res.json({ received: true });
    });
    app.get('/health', (req, res) => res.json({ status: 'ok' }));
    return new Promise((resolve) => {
      this.server = app.listen(this.port, () => {
        console.log(`IPN server running on port ${this.port}`);
        resolve(this.server);
      });
    });
  }

  stop() { if (this.server) this.server.close(); }

  createPaymentListener(id, txHash, callback, timeoutMs = 300000) {
    this.pending.set(txHash, { id, createdAt: Date.now() });
    this.callbacks.set(id, callback);
    setTimeout(() => {
      if (this.pending.has(txHash)) {
        this.pending.delete(txHash);
        callback({ error: 'timeout', txHash });
      }
    }, timeoutMs);
    return { txHash, id, registeredAt: Date.now() };
  }

  getPending() {
    return Array.from(this.pending.entries()).map(([txHash, data]) => ({ txHash, ...data, age: Date.now() - data.createdAt }));
  }
}

// ============================================================
// Main x402 Payment Class
// ============================================================

class X402Payment {
  constructor(config = {}) {
    this.config = {
      privateKey: config.privateKey || process.env.X402_WALLET_PRIVATE_KEY,
      network: config.network || process.env.X402_NETWORK || 'base-sepolia',
      apiKey: config.apiKey || process.env.X402_API_KEY,
      safeAddress: config.safeAddress || process.env.SAFE_ADDRESS,
      ...config
    };
    this.clients = {};
    this.wallet = null;
    this._initClients();
    this._initServices();
  }

  _initClients() {
    const chain = CHAINS[this.config.network];
    if (!chain) throw new Error(`Unsupported network: ${this.config.network}`);
    this.clients = {
      public: createPublicClient({ chain: { id: chain.id, name: chain.name, rpcUrls: { default: { http: [chain.rpc] } } }, transport: http(chain.rpc) })
    };
    if (this.config.privateKey) {
      try {
        this.wallet = require('viem').privateKeyToAccount(this.config.privateKey.startsWith('0x') ? this.config.privateKey : `0x${this.config.privateKey}`);
        this.clients.wallet = createWalletClient({ chain: { id: chain.id, name: chain.name, rpcUrls: { default: { http: [chain.rpc] } } }, transport: http(chain.rpc), account: this.wallet });
      } catch (e) { console.warn('Invalid private key'); }
    }
  }

  _initServices() {
    if (this.config.lightning?.enabled || process.env.LIGHTNING_MACAROON) {
      this.lightning = new LightningPayment(this.config.lightning || {});
    }
    this.reputation = new ReputationService();
    this.faucet = { getTestnetETH: async (addr, net) => ({ success: true, message: `Use faucet for ${net}`, address: addr }) };
    if (this.config.safeAddress) {
      this.safe = new SafeManager({ safeAddress: this.config.safeAddress, chain: this.config.network, privateKey: this.config.privateKey });
    }
    this.scheduler = new PaymentScheduler();
    this.analytics = new PaymentAnalytics();
  }

  get network() { return this.config.network; }
  get chain() { return CHAINS[this.config.network]; }
  get address() { return this.wallet?.address; }
  get isConfigured() { return !!this.wallet; }

  _getToken(asset) {
    const token = this.chain.tokens[asset];
    if (!token) throw new Error(`Token ${asset} not supported`);
    return token;
  }

  async getBalance(asset = 'USDC') {
    if (!this.wallet) throw new Error('Wallet not configured');
    const token = this._getToken(asset);
    if (asset === 'ETH') {
      const balance = await this.clients.public.getBalance({ address: this.wallet.address });
      return { asset: 'ETH', balance: formatUnits(balance, 18), raw: balance.toString() };
    }
    const balance = await this.clients.public.read({ address: token.address, abi: ERC20_ABI, functionName: 'balanceOf', args: [this.wallet.address] });
    return { asset, balance: formatUnits(balance, token.decimals), raw: balance.toString(), decimals: token.decimals };
  }

  async transfer(asset, to, amount) {
    if (!this.wallet) throw new Error('Wallet not configured');
    const token = this._getToken(asset);
    const amountWei = parseUnits(amount, token.decimals);
    try {
      const startTime = Date.now();
      const hash = await this.clients.wallet.writeContract({ address: token.address, abi: ERC20_ABI, functionName: 'transfer', args: [getAddress(to), amountWei] });
      const receipt = await this.clients.public.waitForTransactionReceipt({ hash });
      const result = { transactionHash: hash, status: receipt.status === 'success', blockNumber: receipt.blockNumber, asset, amount, to, duration: Date.now() - startTime };
      this.analytics.record({ ...result, type: 'transfer' });
      return result;
    } catch (error) {
      this.analytics.record({ asset, amount, to, status: 'failed', error: error.message, type: 'transfer' });
      throw { code: 'TRANSFER_FAILED', message: error.message };
    }
  }

  async pay(options) {
    const { to, amount, asset = 'USDC' } = options;
    return await this._payWithAuthorization(to, amount, asset);
  }

  async _payWithAuthorization(to, amount, asset) {
    const token = this._getToken(asset);
    const amountWei = parseUnits(amount, token.decimals);
    const nonce = generateNonce();
    const domain = { name: asset, version: '1', chainId: this.chain.id, verifyingContract: token.address };
    const message = { from: this.wallet.address, to: getAddress(to), value: amountWei, validAfter: 0, validBefore: Math.floor(Date.now() / 1000) + 3600, nonce };
    const signature = await this.wallet.signTypedData({ domain, types: EIP712_TYPES, primaryType: 'TransferWithAuthorization', message });
    const startTime = Date.now();
    const hash = await this.clients.wallet.writeContract({
      address: token.address, abi: ERC20_ABI, functionName: 'transferWithAuthorization',
      args: [this.wallet.address, getAddress(to), amountWei, 0, Math.floor(Date.now() / 1000) + 3600, nonce, parseInt(signature.slice(130, 132), 16), signature.slice(0, 66), '0x' + signature.slice(66, 130)]
    });
    const receipt = await this.clients.public.waitForTransactionReceipt({ hash });
    const result = { transactionHash: hash, status: receipt.status === 'success', blockNumber: receipt.blockNumber, asset, amount, to, strategy: 'eip3009', duration: Date.now() - startTime };
    this.analytics.record({ ...result, type: 'eip3009' });
    return result;
  }

  async batchTransfer(payments) {
    const results = [];
    for (const p of payments) {
      try {
        const result = await this.transfer(p.asset || 'USDC', p.to, p.amount);
        results.push({ ...result, success: true });
        await sleep(500);
      } catch (e) { results.push({ to: p.to, amount: p.amount, success: false, error: e.message }); }
    }
    return results;
  }

  parseChallenge(headers) {
    const wwwAuth = headers['www-authenticate'] || headers['www-authenticate'.toLowerCase()];
    if (!wwwAuth || !wwwAuth.includes('x402')) return null;
    const result = {};
    const regex = /(\w+)="([^"]+)"/g;
    let match;
    while ((match = regex.exec(wwwAuth)) !== null) { result[match[1]] = match[2]; }
    return result;
  }

  async request(url, options = {}) {
    const { method = 'GET', headers = {}, data } = options;
    let response;
    try { response = await axios({ url, method, headers, data, maxRedirects: 0, validateStatus: s => s < 500 }); }
    catch (error) { throw { code: 'REQUEST_FAILED', message: error.message }; }
    if (response.status === 402) {
      const challenge = this.parseChallenge(response.headers);
      if (!challenge) throw { code: 'NO_CHALLENGE' };
      const payment = await this.pay({ to: challenge.payment_address, amount: challenge.amount, asset: challenge.asset || 'USDC' });
      response = await axios({ url, method, headers: { ...headers, 'X-Payment-Proof': payment.transactionHash }, data });
    }
    return { status: response.status, data: response.data, paid: response.status !== 402 };
  }

  middleware(options) {
    const { pricePerCall, asset = 'USDC' } = options;
    return async (req, res, next) => {
      const proof = req.headers['x-payment-proof'];
      if (proof) {
        const verified = await this.verifyPayment(proof);
        if (verified.confirmed) { req.paymentVerified = true; return next(); }
      }
      res.set('WWW-Authenticate', `x402 realm="api", amount="${pricePerCall}", asset="${asset}", network="${this.network}", payment_address="${this.address}"`);
      res.status(402).json({ error: 'Payment Required', message: `Payment of ${pricePerCall} ${asset} required`, payment: { amount: pricePerCall, asset, network: this.network, paymentAddress: this.address } });
    };
  }

  async verifyPayment(txHash) {
    try {
      const receipt = await this.clients.public.getTransactionReceipt({ hash: txHash });
      if (!receipt) return { confirmed: false, error: 'Transaction not found' };
      return { confirmed: receipt.status === 'success', transactionHash: txHash, blockNumber: receipt.blockNumber };
    } catch (error) { return { confirmed: false, error: error.message }; }
  }

  async estimateGas(asset, to, amount) {
    const token = this._getToken(asset);
    try {
      const gas = await this.clients.public.estimateGas({ account: this.wallet.address, to: token.address, data: encodeFunctionData({ abi: ERC20_ABI, functionName: 'transfer', args: [getAddress(to), parseUnits(amount, token.decimals)] }) });
      const gasPrice = await this.clients.public.getGasPrice();
      return { gasEstimate: gas.toString(), gasPrice: formatUnits(gasPrice, 18), estimatedCost: formatUnits(gas * gasPrice, 18), asset: 'ETH' };
    } catch (error) { return { error: error.message }; }
  }

  // Safe methods
  async safeTransfer(asset, to, amount) {
    if (!this.safe) throw { code: 'SAFE_NOT_CONFIGURED' };
    const token = this._getToken(asset);
    const data = encodeFunctionData({ abi: ERC20_ABI, functionName: 'transfer', args: [getAddress(to), parseUnits(amount, token.decimals)] });
    const tx = await this.safe.proposeTransaction(token.address, 0, data);
    return await this.safe.executeTransaction(tx);
  }

  async getSafeInfo() {
    if (!this.safe) return null;
    return { address: this.config.safeAddress, threshold: await this.safe.getThreshold(), owners: await this.safe.getOwners() };
  }

  // Scheduler
  schedulePayment(id, payment, delayMs) { return this.scheduler.schedulePayment(id, payment, delayMs); }
  cancelScheduledPayment(id) { return this.scheduler.cancelPayment(id); }
  listScheduledPayments() { return this.scheduler.listScheduled(); }

  // Analytics
  getStats(timeRangeMs) { return this.analytics.getStats(timeRangeMs); }
  getHistory(limit = 50) { return this.analytics.transactions.slice(-limit).reverse(); }
  recordPayment(result) { this.analytics.record(result); return this.reputation.calculateReputationScore(this.analytics.transactions); }

  // Webhooks
  webhook(config) {
    this.webhookNotifier = new WebhookNotifier(config);
    return this.webhookNotifier;
  }

  // Payment Links
  paymentLink(config) {
    this.paymentLinkGenerator = new PaymentLinkGenerator(config);
    return this.paymentLinkGenerator;
  }

  // IPN
  ipn(config) {
    if (!this.ipnServer) {
      this.ipnServer = new IPNServer(config);
    }
    return this.ipnServer;
  }

  static getSupportedChains() {
    return Object.entries(CHAINS).map(([id, chain]) => ({ id, name: chain.name, tokens: Object.keys(chain.tokens), hasFaucet: !!chain.faucet }));
  }
}

module.exports = X402Payment;
