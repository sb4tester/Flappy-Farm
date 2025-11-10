// One-off backfill for a specific tx hash or small block range (Mongo-based)
// Usage:
//  node backend/scripts/backfillDepositByTx.js --tx 0x...                # single tx
//  node backend/scripts/backfillDepositByTx.js --from 70619000 --to 70619100  # block range
require('dotenv').config();
const { connectMongo } = require('../db/mongo');
const ethers = require('ethers');

const provider = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC_URL);
const TOKEN_DECIMALS_OVERRIDE = process.env.LISTENER_TOKEN_DECIMALS ? parseInt(process.env.LISTENER_TOKEN_DECIMALS, 10) : null;
const MIN_USDT_STR = process.env.LISTENER_MIN_USDT || '0';
const MIN_USDT = Number(MIN_USDT_STR);
function cleanAddr(v) { return (v || '').split('#')[0].trim(); }
let USDT_CONTRACT = cleanAddr(process.env.USDT_CONTRACT_ADDRESS);
let DEPOSIT_ADDRESS = cleanAddr(process.env.SYSTEM_DEPOSIT_ADDRESS);
try { if (USDT_CONTRACT) USDT_CONTRACT = ethers.utils.getAddress(USDT_CONTRACT); } catch {}
try { if (DEPOSIT_ADDRESS) DEPOSIT_ADDRESS = ethers.utils.getAddress(DEPOSIT_ADDRESS); } catch {}

const abi = [ 'event Transfer(address indexed from, address indexed to, uint256 value)' ];
const erc20MetaAbi = [ 'function decimals() view returns (uint8)' ];
const iface = new ethers.utils.Interface(abi);

function calculateBonus(usdtAmount) {
  if (usdtAmount >= 100000) return usdtAmount * 0.15;
  if (usdtAmount >= 10000) return usdtAmount * 0.10;
  if (usdtAmount >= 1000) return usdtAmount * 0.05;
  return 0;
}

async function ensureMongoDeps() {
  await connectMongo();
  return {
    UserState: require('../models/UserState'),
    ProcessedTx: require('../models/ProcessedTx'),
    Transaction: require('../models/Transaction'),
    userRepo: require('../repositories/userRepo'),
    transactionRepo: require('../repositories/transactionRepo'),
  };
}

async function processTransfer(fromAddr, valueWei, txHash, tokenDecimals, opts = {}) {
  const { UserState, ProcessedTx, Transaction, userRepo, transactionRepo } = await ensureMongoDeps();
  const from = fromAddr.toLowerCase();
  let value = Number(ethers.utils.formatUnits(valueWei, tokenDecimals));
  value = Math.round(value * 1e6) / 1e6;
  if (value < MIN_USDT) {
    console.log(`Skipping dust deposit ${value} < MIN_USDT(${MIN_USDT_STR}) for tx ${txHash}`);
    return 'dust';
  }

  const user = await UserState.findOne({ usdtWallet: from }).lean().exec();
  if (!user) {
    console.log(`Unknown deposit from ${from} amount ${value} (tx ${txHash})`);
    return 'unknown';
  }
  const userId = user.uid;

  const already = await ProcessedTx.findById(txHash).lean().exec();
  const bonus = calculateBonus(value);
  const totalCoin = value + bonus;
  const bonusPercent = value > 0 ? (bonus * 100) / value : 0;

  if (already && !opts.force) {
    console.log(`Already processed ${txHash}, skipping.`);
    return 'exists';
  }

  let delta = totalCoin;
  if (opts.force) {
    const existingTx = await Transaction.findOne({ userId, type: 'DEPOSIT', 'meta.txHash': txHash }).lean().exec();
    const prevAmount = existingTx ? (existingTx.amountCoin || 0) : 0;
    delta = totalCoin - prevAmount;
  }

  if (delta !== 0) {
    await userRepo.incCoins(userId, delta);
  }

  // Upsert transaction document with latest totals
  await Transaction.updateOne(
    { userId, type: 'DEPOSIT', 'meta.txHash': txHash },
    { $set: { amountCoin: totalCoin, amountUSDT: value, meta: { txHash, bonusPercent, channel: opts.force ? 'backfill.force' : 'backfill' } } },
    { upsert: true }
  ).exec();

  // Mark processed
  await ProcessedTx.updateOne(
    { _id: txHash },
    { $set: { userId, amount: value, confirmedAt: new Date() } },
    { upsert: true }
  ).exec();

  return 'processed';
}

async function resolveTokenDecimals() {
  let tokenDecimals = 18;
  if (Number.isInteger(TOKEN_DECIMALS_OVERRIDE) && TOKEN_DECIMALS_OVERRIDE >= 0) {
    tokenDecimals = TOKEN_DECIMALS_OVERRIDE;
    console.log(`Using token decimals override: ${tokenDecimals}`);
  } else {
    try {
      const token = new ethers.Contract(USDT_CONTRACT, erc20MetaAbi, provider);
      const d = await token.decimals();
      tokenDecimals = parseInt(d.toString(), 10) || 18;
      console.log(`Detected token decimals from chain: ${tokenDecimals}`);
    } catch (e) {
      console.warn('Failed to fetch token decimals, defaulting to 18');
    }
  }
  return tokenDecimals;
}

async function backfillByTx(txHash, opts) {
  if (!process.env.BSC_RPC_URL || !USDT_CONTRACT || !DEPOSIT_ADDRESS) {
    throw new Error('Missing BSC_RPC_URL/USDT_CONTRACT_ADDRESS/SYSTEM_DEPOSIT_ADDRESS');
  }
  console.log('Backfilling single tx:', txHash);
  const tokenDecimals = await resolveTokenDecimals();
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) throw new Error('Receipt not found');
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== USDT_CONTRACT.toLowerCase()) continue;
    try {
      const parsed = iface.parseLog(log);
      const to = parsed.args.to;
      if (to.toLowerCase() !== DEPOSIT_ADDRESS.toLowerCase()) continue;
      const res = await processTransfer(parsed.args.from, parsed.args.value, txHash, tokenDecimals, opts);
      console.log('Result:', res);
      return;
    } catch {}
  }
  console.log('No matching USDT Transfer to deposit address found in tx');
}

async function backfillRange(fromBlock, toBlock, opts) {
  if (!process.env.BSC_RPC_URL || !USDT_CONTRACT || !DEPOSIT_ADDRESS) {
    throw new Error('Missing BSC_RPC_URL/USDT_CONTRACT_ADDRESS/SYSTEM_DEPOSIT_ADDRESS');
  }
  console.log(`Backfilling range ${fromBlock}..${toBlock}`);
  const tokenDecimals = await resolveTokenDecimals();

  let chunkSize = parseInt(process.env.BACKFILL_BLOCK_CHUNK || process.env.LISTENER_BLOCK_CHUNK || '5000', 10);
  if (opts && Number.isInteger(opts.chunk) && opts.chunk > 0) {
    chunkSize = opts.chunk;
  }
  let start = fromBlock;
  while (start <= toBlock) {
    const end = Math.min(start + chunkSize - 1, toBlock);
    console.log(`Chunk ${start} -> ${end}`);
    try {
      const filter = {
        address: USDT_CONTRACT,
        fromBlock: start,
        toBlock: end,
        topics: [
          ethers.utils.id('Transfer(address,address,uint256)'),
          null,
          ethers.utils.hexZeroPad(DEPOSIT_ADDRESS, 32)
        ]
      };
      const logs = await provider.getLogs(filter);
      if (logs.length) console.log(`  found ${logs.length} transfers`);
      for (const log of logs) {
        const parsed = iface.parseLog(log);
        await processTransfer(parsed.args.from, parsed.args.value, log.transactionHash, tokenDecimals, opts);
      }
      start = end + 1;
      // gently increase chunk size if small and stable
      if (chunkSize < 20000) chunkSize = Math.min(20000, Math.floor(chunkSize * 1.25 + 1));
    } catch (err) {
      const msg = err && (err.message || JSON.stringify(err));
      const code = err && (err.code || (err.error && err.error.code));
      console.warn(`  getLogs failed for ${start}-${end}:`, msg);
      // Common provider limits: reduce chunk and retry
      if (chunkSize > 500 && (code === -32005 || code === -32701 || /limit|range|too many|exceed/i.test(msg))) {
        chunkSize = Math.max(500, Math.floor(chunkSize / 2));
        console.log(`  reducing chunk size to ${chunkSize} and retrying...`);
        continue;
      }
      throw err;
    }
  }
}

(async () => {
  const args = process.argv.slice(2);
  const getArg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i+1] : null; };
  const tx = getArg('--tx');
  const from = getArg('--from');
  const to = getArg('--to');
  const force = args.includes('--force');
  const chunkArg = (() => { const i = args.indexOf('--chunk'); return i >= 0 ? parseInt(args[i+1], 10) : null; })();
  try {
    if (tx) {
      await backfillByTx(tx, { force });
    } else if (from && to) {
      await backfillRange(parseInt(from,10), parseInt(to,10), { force, chunk: chunkArg });
    } else {
      console.log('Usage:');
      console.log('  node backend/scripts/backfillDepositByTx.js --tx <hash>');
      console.log('  node backend/scripts/backfillDepositByTx.js --from <block> --to <block>');
      console.log('Options:');
      console.log('  --force   Recompute and adjust balance if already processed');
      console.log('  --chunk   Override block chunk size (default env BACKFILL_BLOCK_CHUNK or 5000)');
    }
    process.exit(0);
  } catch (e) {
    console.error('Backfill failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
