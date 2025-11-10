const { connectMongo } = require('./db/mongo');
const ethers = require('ethers');
require('dotenv').config();

const provider = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC_URL);
// Sanitize addresses from env (strip inline comments and whitespace)
function cleanAddr(v) { return (v || '').split('#')[0].trim(); }
let USDT_CONTRACT = cleanAddr(process.env.USDT_CONTRACT_ADDRESS);
let DEPOSIT_ADDRESS = cleanAddr(process.env.SYSTEM_DEPOSIT_ADDRESS);
try { if (USDT_CONTRACT) USDT_CONTRACT = ethers.utils.getAddress(USDT_CONTRACT); } catch {}
try { if (DEPOSIT_ADDRESS) DEPOSIT_ADDRESS = ethers.utils.getAddress(DEPOSIT_ADDRESS); } catch {}
const CONFIRMATIONS = parseInt(process.env.LISTENER_CONFIRMATIONS || '3', 10);
const INITIAL_BACKSCAN = parseInt(process.env.LISTENER_INITIAL_BACKSCAN || '5000', 10);
let CHUNK_SIZE = parseInt(process.env.LISTENER_BLOCK_CHUNK || '2000', 10);
const START_MODE = (process.env.LISTENER_START_MODE || 'backscan').toLowerCase(); // 'today' | 'backscan' | 'current'
const TZ_OFFSET_MIN = parseInt(process.env.LISTENER_TZ_OFFSET_MIN || '420', 10); // Asia/Bangkok = +420
const AVG_BLOCK_SEC = parseInt(process.env.LISTENER_AVG_BLOCK_SEC || '3', 10);
const TOKEN_DECIMALS_OVERRIDE = process.env.LISTENER_TOKEN_DECIMALS ? parseInt(process.env.LISTENER_TOKEN_DECIMALS, 10) : null;
const MIN_USDT_STR = process.env.LISTENER_MIN_USDT || '0';
const MIN_USDT = Number(MIN_USDT_STR);

const abi = [
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];
const erc20MetaAbi = [ 'function decimals() view returns (uint8)' ];
const iface = new ethers.utils.Interface(abi);

async function scanDepositsOnce() {
  if (!process.env.BSC_RPC_URL || !USDT_CONTRACT || !DEPOSIT_ADDRESS) {
    console.error('Missing BSC_RPC_URL/USDT_CONTRACT_ADDRESS/SYSTEM_DEPOSIT_ADDRESS');
    return;
  }

  await connectMongo();
  const ListenerState = require('./models/ListenerState');
  const ProcessedTx = require('./models/ProcessedTx');
  const userRepo = require('./repositories/userRepo');
  const transactionRepo = require('./repositories/transactionRepo');
  const { distributeCommission } = require('./controllers/referralController');
  const UserState = require('./models/UserState');

  // Resolve token decimals once per run (fallback 18) with optional override
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
      console.warn('Failed to fetch token decimals, defaulting to 18:', e && e.message ? e.message : e);
    }
  }
  let state = await ListenerState.findOne({ key: 'depositListener' }).lean().exec();
  let lastScannedBlock = state ? (state.lastScannedBlock || 0) : 0;

  const latestBlock = await provider.getBlockNumber();
  const latest = await provider.getBlock(latestBlock);
  const safeBlock = latestBlock - CONFIRMATIONS;

  // helper to find block near a target timestamp (sec)
  async function findBlockByTimestamp(targetSec) {
    // approximate lower bound using average block time
    const deltaSec = Math.max(0, latest.timestamp - targetSec);
    const approx = Math.max(1, safeBlock - Math.ceil(deltaSec / AVG_BLOCK_SEC));
    let lo = Math.max(1, approx - 50000);
    let hi = safeBlock;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const b = await provider.getBlock(mid);
      if (!b) { hi = mid - 1; continue; }
      if (b.timestamp < targetSec) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  if (!state || lastScannedBlock === 0) {
    let startFrom = 0;
    const startFromEnv = parseInt(process.env.LISTENER_START_BLOCK || '0', 10);
    if (startFromEnv > 0) {
      startFrom = startFromEnv;
      console.log(`Initializing deposit scanner from LISTENER_START_BLOCK=${startFrom}`);
    } else if (START_MODE === 'today') {
      // compute midnight of today in Asia/Bangkok
      const now = new Date();
      const bangkokNowMs = now.getTime() + TZ_OFFSET_MIN * 60000;
      const bangkokMidnight = new Date(bangkokNowMs);
      bangkokMidnight.setHours(0,0,0,0);
      const targetSec = Math.floor((bangkokMidnight.getTime() - TZ_OFFSET_MIN * 60000) / 1000);
      try {
        const blockAtMidnight = await findBlockByTimestamp(targetSec);
        const buffer = parseInt(process.env.LISTENER_START_BUFFER || '500', 10);
        startFrom = Math.max(1, blockAtMidnight - buffer);
        console.log(`Initializing from today's midnight block ~${blockAtMidnight} (start ${startFrom})`);
      } catch (e) {
        console.warn('Failed to locate midnight block, fallback to backscan:', e && e.message ? e.message : e);
        startFrom = Math.max(1, safeBlock - INITIAL_BACKSCAN);
      }
    } else if (START_MODE === 'current') {
      // start from the current safe block (no backscan)
      startFrom = Math.max(1, safeBlock);
      console.log(`Initializing from current safe block ${startFrom} (no backscan)`);
    } else {
      startFrom = Math.max(1, safeBlock - INITIAL_BACKSCAN);
      console.log(`Initializing deposit scanner with backscan=${INITIAL_BACKSCAN} blocks (start ${startFrom})`);
    }

    lastScannedBlock = startFrom - 1;
    await ListenerState.updateOne({ key: 'depositListener' }, { $set: { lastScannedBlock, mode: START_MODE, updatedAt: new Date() } }, { upsert: true }).exec();
  }

  if (lastScannedBlock >= safeBlock) {
    console.log('No new blocks to scan. Waiting...');
    return;
  }

  console.log(`Scanning to ${safeBlock} in chunks of ${CHUNK_SIZE}`);
  let fromBlock = lastScannedBlock + 1;
  while (fromBlock <= safeBlock) {
    let toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, safeBlock);
    console.log(`Chunk ${fromBlock} -> ${toBlock}`);
    try {
      const filter = {
        address: USDT_CONTRACT,
        fromBlock,
        toBlock,
        topics: [
          ethers.utils.id('Transfer(address,address,uint256)'),
          null,
          ethers.utils.hexZeroPad(DEPOSIT_ADDRESS, 32)
        ]
      };
      const logs = await provider.getLogs(filter);
      if (logs.length) console.log(`Chunk found ${logs.length} transfers`);

      for (const log of logs) {
        const txHash = log.transactionHash;
        const parsed = iface.parseLog(log);
        const from = parsed.args.from.toLowerCase();
        let value = Number(ethers.utils.formatUnits(parsed.args.value, tokenDecimals));
        // Round to 6 decimals for stability in Firestore and UI
        value = Math.round(value * 1e6) / 1e6;
        if (value < MIN_USDT) {
          console.log(`Skipping dust deposit ${value} < MIN_USDT(${MIN_USDT_STR}) for tx ${txHash}`);
          continue;
        }

        const userState = await UserState.findOne({ usdtWallet: from }).lean().exec();
        if (!userState) {
          // Unknown deposit log can be handled via console or dedicated collection if needed
          console.log(`Unknown deposit from ${from} amount ${value} tx ${txHash}`);
          continue;
        }
        const userId = userState.uid;

        const existing = await ProcessedTx.findById(txHash).lean().exec();
        if (existing) continue; // already processed

        const bonus = calculateBonus(value);
        const totalCoin = value + bonus;
        const bonusPercent = value > 0 ? (bonus * 100) / value : 0;

        await userRepo.incCoins(userId, totalCoin);
        await transactionRepo.createTransaction({ userId, type: 'DEPOSIT', amountCoin: totalCoin, amountUSDT: value, meta: { txHash, bonusPercent, channel: 'onchain.listener' } });
        await ProcessedTx.create({ _id: txHash, userId, amount: value, confirmedAt: new Date() });
        try { await distributeCommission(userId, value); } catch (e) { console.warn('distributeCommission failed', e && e.message ? e.message : e); }
      }

      await ListenerState.updateOne({ key: 'depositListener' }, { $set: { lastScannedBlock: toBlock, updatedAt: new Date(), error: null } }, { upsert: true }).exec();
      lastScannedBlock = toBlock;
      fromBlock = toBlock + 1;
      if (CHUNK_SIZE < 2000) CHUNK_SIZE = Math.min(2000, Math.floor(CHUNK_SIZE * 1.25 + 1));
    } catch (err) {
      const code = err && (err.code || (err.error && err.error.code));
      const msg = err && (err.message || JSON.stringify(err));
      console.error(`getLogs failed for ${fromBlock}-${toBlock}:`, msg);
      if (CHUNK_SIZE > 100 && (code === -32005 || /limit/i.test(msg))) {
        CHUNK_SIZE = Math.max(100, Math.floor(CHUNK_SIZE / 2));
        console.log(`Reducing chunk size to ${CHUNK_SIZE} and retrying...`);
        continue;
      }
      await ListenerState.updateOne({ key: 'depositListener' }, { $set: { lastScannedBlock: fromBlock - 1, error: msg, updatedAt: new Date() } }, { upsert: true }).exec();
      throw err;
    }
  }

  console.log(`Updated lastScannedBlock to ${lastScannedBlock}`);
}

function calculateBonus(usdtAmount) {
  if (usdtAmount >= 100000) return usdtAmount * 0.15;
  if (usdtAmount >= 10000) return usdtAmount * 0.10;
  if (usdtAmount >= 1000) return usdtAmount * 0.05;
  return 0;
}

module.exports = { scanDepositsOnce };
