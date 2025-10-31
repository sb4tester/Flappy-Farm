const { admin, db } = require("./firebase");
const ethers = require("ethers");
require("dotenv").config();

const provider = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC_URL);

const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS;
const DEPOSIT_ADDRESS = process.env.SYSTEM_DEPOSIT_ADDRESS;
const CONFIRMATIONS = 3;

const abi = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];
const iface = new ethers.utils.Interface(abi);

async function main() {
  // STEP 1: อ่าน lastScannedBlock
  const stateRef = db.collection("listenerState").doc("depositListener");
  const stateSnap = await stateRef.get();
  let lastScannedBlock = stateSnap.exists ? stateSnap.data().lastScannedBlock : 0;

  // STEP 2: อ่านบล็อกล่าสุด
  const latestBlock = await provider.getBlockNumber();
  const safeBlock = latestBlock - CONFIRMATIONS;

  if (lastScannedBlock >= safeBlock) {
    console.log("No new blocks to scan. Waiting...");
    return;
  }

  const fromBlock = lastScannedBlock + 1;
  const toBlock = safeBlock;

  console.log(`Scanning from block ${fromBlock} to ${toBlock}...`);

  // STEP 3: สแกน Transfer event
  const filter = {
    address: USDT_CONTRACT,
    fromBlock,
    toBlock,
    topics: [
      ethers.utils.id("Transfer(address,address,uint256)"),
      null,
      ethers.utils.hexZeroPad(DEPOSIT_ADDRESS, 32)
    ]
  };

  const logs = await provider.getLogs(filter);
  console.log(`Found ${logs.length} deposit transactions.`);

  for (const log of logs) {
    const parsed = iface.parseLog(log);
    const from = parsed.args.from.toLowerCase();
    const value = Number(ethers.utils.formatUnits(parsed.args.value, 18));
    const txHash = log.transactionHash;

    console.log(`Processing tx: ${txHash} from: ${from} amount: ${value} USDT`);

    const userSnap = await db.collection("users").where("usdtWallet", "==", from).limit(1).get();
    if (userSnap.empty) {
      console.log(`Unknown deposit from ${from}, saving for manual review.`);
      await db.collection("unknownDeposits").doc(txHash).set({
        fromAddress: from,
        amount: value,
        txHash,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      continue;
    }

    const userDoc = userSnap.docs[0];
    const userId = userDoc.id;

    await db.runTransaction(async (tx) => {
      const processedRef = db.collection("processedTxs").doc(txHash);
      const processedSnap = await tx.get(processedRef);
      if (processedSnap.exists) {
        console.log(`tx ${txHash} already processed, skipping.`);
        return;
      }

      const userRef = db.collection("users").doc(userId);
      const userData = (await tx.get(userRef)).data();

      const bonus = calculateBonus(value);
      const totalCoin = value + bonus;
      const bonusPercent = (bonus * 100) / value;

      tx.update(userRef, {
        coin_balance: (userData.coin_balance || 0) + totalCoin
      });

      tx.set(userRef.collection("transactions").doc(txHash), {
        type: "deposit",
        amount: totalCoin,
        metadata: { usdtAmount: value, bonusPercent, txHash, channel: 'onchain.listener' },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      tx.set(processedRef, {
        userId,
        amount: value,
        confirmedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // แจก commission 5 ชั้น
      let currentUserId = userId;
      const levels = [
        { level: 1, percent: 5 },
        { level: 2, percent: 4 },
        { level: 3, percent: 3 },
        { level: 4, percent: 2 },
        { level: 5, percent: 1 },
      ];

      for (const lv of levels) {
        const currentSnap = await tx.get(db.collection("users").doc(currentUserId));
        const currentData = currentSnap.data();
        const referrerId = currentData.referrer;
        if (!referrerId) break;

        const referrerSnap = await tx.get(db.collection("users").doc(referrerId));
        if (!referrerSnap.exists) break;

        const referrerData = referrerSnap.data();
        const isAgent = !!referrerData.isAgent || (referrerData.activeUserCount >= 50);
        if (!isAgent) {
          console.log(`Referrer ${referrerId} not agent, skipping level ${lv.level}`);
          currentUserId = referrerId;
          continue;
        }

        const commissionAmount = value * lv.percent / 100;
        tx.update(db.collection("users").doc(referrerId), {
          commission_balance: (referrerData.commission_balance || 0) + commissionAmount
        });

        const commissionId = txHash + "-lv" + lv.level;
        tx.set(db.collection("users").doc(referrerId).collection("commissions").doc(commissionId), {
          fromUser: userId,
          level: lv.level,
          amount: commissionAmount,
          baseType: "deposit",
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Commission ${commissionAmount} coin → referrer ${referrerId} at level ${lv.level}`);
        currentUserId = referrerId;
      }
    });
  }

  // STEP 4: อัพเดท lastScannedBlock
  await stateRef.set({
    lastScannedBlock: toBlock,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log(`Updated lastScannedBlock to ${toBlock}`);
}

function calculateBonus(usdtAmount) {
  if (usdtAmount >= 100000) return usdtAmount * 0.15;
  if (usdtAmount >= 10000) return usdtAmount * 0.10;
  if (usdtAmount >= 1000) return usdtAmount * 0.05;
  return 0;
}

module.exports = { scanDepositsOnce: main };
