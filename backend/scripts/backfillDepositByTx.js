// One-off backfill for a specific tx hash or small block range
// Usage:
//  node backend/scripts/backfillDepositByTx.js --tx 0x...                # single tx
//  node backend/scripts/backfillDepositByTx.js --from 70619000 --to 70619100  # block range
require('dotenv').config();
const { admin, db } = require('../firebase');
const ethers = require('ethers');

const provider = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC_URL);
const TOKEN_DECIMALS_OVERRIDE = process.env.LISTENER_TOKEN_DECIMALS ? parseInt(process.env.LISTENER_TOKEN_DECIMALS, 10) : null;
const MIN_USDT_STR = process.env.LISTENER_MIN_USDT || '0';
const MIN_USDT = Number(MIN_USDT_STR);
function cleanAddr(v) { return (v || '').split('#')[0].trim(); }
const USDT_CONTRACT = cleanAddr(process.env.USDT_CONTRACT_ADDRESS);
const DEPOSIT_ADDRESS = cleanAddr(process.env.SYSTEM_DEPOSIT_ADDRESS);

const abi = [ 'event Transfer(address indexed from, address indexed to, uint256 value)' ];
const erc20MetaAbi = [ 'function decimals() view returns (uint8)' ];
const iface = new ethers.utils.Interface(abi);

async function processTransfer(fromAddr, valueWei, txHash, tokenDecimals, opts = {}) {
  const from = fromAddr.toLowerCase();
  let value = Number(ethers.utils.formatUnits(valueWei, tokenDecimals));
  value = Math.round(value * 1e6) / 1e6;
  if (value < MIN_USDT) {
    console.log(`Skipping dust deposit ${value} < MIN_USDT(${MIN_USDT_STR}) for tx ${txHash}`);
    return 'dust';
  }

  const userSnap = await db.collection('users').where('usdtWallet', '==', from).limit(1).get();
  if (userSnap.empty) {
    console.log(`Unknown deposit from ${from}, saving to unknownDeposits for ${txHash}`);
    await db.collection('unknownDeposits').doc(txHash).set({
      fromAddress: from,
      amount: value,
      txHash,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return 'unknown';
  }

  const userDoc = userSnap.docs[0];
  const userId = userDoc.id;

  await db.runTransaction(async (tx) => {
    const processedRef = db.collection('processedTxs').doc(txHash);
    const processedSnap = await tx.get(processedRef);
    if (processedSnap.exists && !opts.force) return;

    const userRef = db.collection('users').doc(userId);
    const userData = (await tx.get(userRef)).data() || {};
    const bonus = value >= 100000 ? value * 0.15 : value >= 10000 ? value * 0.10 : value >= 1000 ? value * 0.05 : 0;
    const totalCoin = value + bonus;
    const bonusPercent = value > 0 ? (bonus * 100) / value : 0;

    const txRef = userRef.collection('transactions').doc(txHash);
    let delta = totalCoin;
    if (processedSnap.exists && opts.force) {
      const existingTx = await tx.get(txRef);
      const prevAmount = existingTx.exists ? (existingTx.data().amount || 0) : 0;
      delta = totalCoin - prevAmount;
    }

    tx.set(userRef, { coin_balance: (userData.coin_balance || 0) + delta }, { merge: true });
    tx.set(txRef, {
      type: 'deposit',
      amount: totalCoin,
      metadata: { usdtAmount: value, bonusPercent, txHash, channel: opts.force ? 'backfill.force' : 'backfill' },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    tx.set(processedRef, { userId, amount: value, confirmedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });
  return 'processed';
}

async function backfillByTx(txHash) {
  console.log('Backfilling single tx:', txHash);
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
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) throw new Error('Receipt not found');
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== USDT_CONTRACT.toLowerCase()) continue;
    try {
      const parsed = iface.parseLog(log);
      const to = parsed.args.to;
      if (to.toLowerCase() !== DEPOSIT_ADDRESS.toLowerCase()) continue;
      const res = await processTransfer(parsed.args.from, parsed.args.value, txHash, tokenDecimals);
      console.log('Result:', res);
      return;
    } catch {}
  }
  console.log('No matching USDT Transfer to deposit address found in tx');
}

async function backfillRange(fromBlock, toBlock) {
  console.log(`Backfilling range ${fromBlock}..${toBlock}`);
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
  console.log(`Found ${logs.length} transfers`);
  for (const log of logs) {
    const parsed = iface.parseLog(log);
    await processTransfer(parsed.args.from, parsed.args.value, log.transactionHash, tokenDecimals);
  }
}

(async () => {
  const args = process.argv.slice(2);
  const getArg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i+1] : null; };
  const tx = getArg('--tx');
  const from = getArg('--from');
  const to = getArg('--to');
  const force = args.includes('--force');
  try {
    if (tx) {
      // pass force via global opt by wrapping processTransfer but for simplicity we re-run with force in place
      const original = processTransfer;
      processTransfer = (...p) => original(p[0], p[1], p[2], p[3], { force });
      await backfillByTx(tx);
    } else if (from && to) {
      const original = processTransfer;
      processTransfer = (...p) => original(p[0], p[1], p[2], p[3], { force });
      await backfillRange(parseInt(from,10), parseInt(to,10));
    } else {
      console.log('Usage:');
      console.log('  node backend/scripts/backfillDepositByTx.js --tx <hash>');
      console.log('  node backend/scripts/backfillDepositByTx.js --from <block> --to <block>');
      console.log('Options:');
      console.log('  --force   Recompute and adjust balance if already processed');
    }
    process.exit(0);
  } catch (e) {
    console.error('Backfill failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
