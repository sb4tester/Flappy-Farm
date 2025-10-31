Backend Deployment Guide (DigitalOcean)

ภาษาไทย: คู่มือ Deploy/Update ด้วย PM2 (สรุปเร็ว)

1) Deploy ใหม่ (ครั้งแรกบนเซิร์ฟเวอร์)
- ติดตั้ง: Node.js LTS, npm, git และ pm2 (`sudo npm i -g pm2`).
- โคลนโปรเจกต์: `git clone <repo_url> farm-backend && cd farm-backend/backend`.
- ตั้งค่าไฟล์แวดล้อม: คัดลอกค่าไปที่ `backend/.env` ตามตัวอย่างด้านล่าง.
- ติดตั้งแพ็กเกจ: `npm install`.
- รันด้วย PM2: `pm2 start app.js --name farm-backend`.
- ให้รันอัตโนมัติหลังรีบูต: `pm2 save` และ `pm2 startup` (ทำตามคำสั่งที่ pm2 แจ้ง).

2) Update Code (อัปเดตรอบถัดไป)
- เข้าโฟลเดอร์โปรเจกต์: `cd ~/farm-backend` (หรือโฟลเดอร์ที่โคลนไว้).
- ดึงโค้ดล่าสุด: `git pull`.
- ติดตั้งแพ็กเกจใหม่ถ้ามี: `cd backend && npm install`.
- รีสตาร์ตแอป: `pm2 restart farm-backend` (หรือ zero-downtime ใช้ `pm2 reload farm-backend`).

Requirements ของระบบ (โดยสรุป)
- OS: Ubuntu 22.04 LTS (แนะนำ) หรือเทียบเท่า.
- Runtime: Node.js LTS (>= 18), npm.
- Process manager: pm2 (global) สำหรับรันเป็น service.
- Git: สำหรับดึงโค้ดด้วย `git pull`.
- Optional: Nginx + Certbot สำหรับ HTTPS/Reverse proxy.
- Secrets/Configs: ไฟล์ `backend/.env` ต้องตั้งค่าครบ (ดูตัวอย่างด้านล่าง).

Cron ในระบบ (รันด้วย node-cron ภายในแอป)
- ฝากถอน On-chain (Deposit Scanner): ทุก 1 นาที (`*/1 * * * *`, timezone: Asia/Bangkok) เรียก `scanDepositsOnce()` เพื่อจับธุรกรรมและบันทึกสถานะบล็อกล่าสุดไว้ใน Firestore.
- งานรายวันทั่วไป: ทุกวันเวลา 00:00 (`0 0 * * *`) เรียก `dailyJobs.dailyTask()`.
- สุ่มไข่/สแปนไข่: ทุกวันเวลา 07:00 (`0 7 * * *`, timezone: Asia/Bangkok) เรียก `dailyJobs.spawnDailyEggs()`.
- Lucky Draw: ทุก 7/14/28 วัน เวลา 00:00 (`0 0 */7 * *`, `0 0 */14 * *`, `0 0 */28 * *`) เรียก `drawWinners('bronze'|'silver'|'gold')`.
- หมายเหตุ: cron ทั้งหมดรันภายในแอปผ่าน `node-cron` ไม่ต้องตั้ง OS-level cron สำหรับงานแอป (ยกเว้นงานระบบ เช่น renew SSL ของ certbot ตามสคริปต์ตัวอย่าง).

ดู Logs ได้จากที่ไหนบ้าง
- PM2 real-time logs: `pm2 logs farm-backend` (เพิ่ม `--lines 200` เพื่อดูย้อนหลัง), สถานะ: `pm2 status`, monitoring: `pm2 monit`.
- แอประบุ log ผ่าน `console.log/console.error` ซึ่งจะไหลไปที่ PM2 logs.
- ถ้าใช้ Nginx เป็น reverse proxy: ตรวจ `sudo tail -f /var/log/nginx/access.log` และ `sudo tail -f /var/log/nginx/error.log`.
- ข้อผิดพลาดของ Deposit Scanner จะแสดงใน PM2 logs ด้วยข้อความคล้าย `Deposit scanner error: ...`.


Overview
- Node.js/Express backend with Firebase Admin + Firestore
- On‑chain deposit scanner runs via cron inside the app (every 1 minute)
- Daily jobs and lucky draw are scheduled with node-cron inside the app

Prerequisites
- A DigitalOcean Droplet (Ubuntu 22.04 LTS recommended)
- A domain (optional, for HTTPS via Nginx + Let’s Encrypt)
- Firebase Admin credentials for your project
- BSC RPC URL (testnet or mainnet), USDT contract address, and system deposit wallet address

1) Create Droplet and SSH In
- Create a Droplet (Ubuntu 22.04) and add your SSH key.
- SSH into the Droplet as root, then create a non‑root user:
  - adduser deploy
  - usermod -aG sudo deploy
  - rsync your SSH key to /home/deploy/.ssh/authorized_keys
  - su - deploy

2) Install System Packages
- Update and install base packages:
  - sudo apt update && sudo apt -y upgrade
  - sudo apt -y install git curl ufw
- Install Node.js (LTS) + npm using NodeSource:
  - curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  - sudo apt -y install nodejs
- (Recommended) Install PM2 process manager:
  - sudo npm i -g pm2

3) Clone Your Repository
- cd ~
- git clone <your_repo_url> farm-backend
- cd farm-backend/backend

4) Configure Environment (.env)
- Copy your environment values into backend/.env. Example (adjust to your project):
  - API_PORT=5000
  - FIREBASE_PROJECT_ID=your-project-id
  - FIREBASE_PRIVATE_KEY_ID=...
  - FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
  - FIREBASE_CLIENT_EMAIL=...
  - FIREBASE_CLIENT_ID=...
  - JWT_SECRET=some-strong-secret
  - BSC_RPC_URL=https://bsc-testnet.publicnode.com
  - USDT_CONTRACT_ADDRESS=0xA95683265aEE1f035e05F13644F14E50fd0C6518   # testnet example
  - SYSTEM_DEPOSIT_ADDRESS=0xYourSystemDepositAddress
  - LISTENER_BLOCK_CHUNK=1000                    # tune smaller if RPC limits
  - LISTENER_INITIAL_BACKSCAN=1000              # first-run backscan size
  - (Optional) LISTENER_START_BLOCK=<block>     # force first start point
  - (Optional) LISTENER_CONFIRMATIONS=3

Security notes:
- Never commit .env to source control.
- Keep your Firebase private key safe (multiline string with \n escaped).

5) Install Dependencies
- From backend/ directory:
  - npm install

6) Run Locally (for quick check)
- node app.js
- You should see logs like: "Server running on port 5000" and cron schedules starting.

7) Run as a Service with PM2 (recommended)
- pm2 start app.js --name farm-backend
- pm2 save
- pm2 startup  # follow the printed command to enable auto‑start on reboot
- Logs:
  - pm2 logs farm-backend
  - pm2 status

8) Set Up Reverse Proxy (Nginx) + HTTPS (optional but recommended)
- Install Nginx + Certbot:
  - sudo apt -y install nginx
  - sudo ufw allow OpenSSH
  - sudo ufw allow 'Nginx Full'
  - sudo ufw enable
- Create Nginx site (example):
  - sudo nano /etc/nginx/sites-available/farm-backend
    server {
      listen 80;
      server_name api.example.com;

      location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
      }
    }
  - sudo ln -s /etc/nginx/sites-available/farm-backend /etc/nginx/sites-enabled/
  - sudo nginx -t && sudo systemctl reload nginx
- Issue Let’s Encrypt cert:
  - sudo apt -y install certbot python3-certbot-nginx
  - sudo certbot --nginx -d api.example.com

9) Firestore/Authentication Checklist
- Firebase Admin creds valid for the project ID in .env
- Firestore rules allow backend (Admin SDK bypasses rules, but project must exist)
- Users authenticate via Firebase ID tokens (frontend retrieves ID token)

10) On‑chain Deposit Scanner Tuning
- Scanner runs every 1 minute (cron inside app.js) and saves progress in Firestore:
  - collection: listenerState / document: depositListener
  - field: lastScannedBlock
- If your RPC returns "limit exceeded", reduce:
  - LISTENER_BLOCK_CHUNK=500 (or 250/100 if still hitting limits)
  - LISTENER_INITIAL_BACKSCAN=500 (for first run)
- If you must restart from a specific block:
  - Delete listenerState/depositListener in Firestore
 - Set LISTENER_START_BLOCK=<block> in .env
  - Restart the backend

Env (.env) keys for the deposit scanner
- `BSC_RPC_URL` RPC endpoint (e.g., `https://bsc-testnet.publicnode.com`)
- `USDT_CONTRACT_ADDRESS` Token contract to monitor
- `SYSTEM_DEPOSIT_ADDRESS` Hot wallet address to receive deposits
- `LISTENER_CONFIRMATIONS` Safe confirmations before scanning (default `3`)
- `LISTENER_BLOCK_CHUNK` Blocks per `getLogs` call (e.g., `2000`; reduce if RPC hits limits)
- `LISTENER_INITIAL_BACKSCAN` How many blocks to scan on first run (e.g., `1000`)
- `LISTENER_START_MODE` One of `backscan` | `today` | `current`
  - backscan: start from `safeBlock - LISTENER_INITIAL_BACKSCAN`
  - today: start from today 00:00 Asia/Bangkok (with buffer)
  - current: start from current safe block (no backscan)
- `LISTENER_START_BLOCK` Force a specific start block (overrides the mode)
- `LISTENER_TZ_OFFSET_MIN` Minutes offset for local midnight calc (default `420` for BKK)
- `LISTENER_AVG_BLOCK_SEC` Average seconds per block for timestamp search (default `3`)
- `LISTENER_TOKEN_DECIMALS` Force token decimals (e.g., `6` for USDT); overrides on-chain value
- `LISTENER_MIN_USDT` Ignore deposits below this value (e.g., `0.000001`)

Quick examples
- Backscan the last 1,000 blocks only on first run:
  - `LISTENER_START_MODE=backscan`
  - `LISTENER_INITIAL_BACKSCAN=1000`
- Start from the current block only (no history):
  - `LISTENER_START_MODE=current`
- Start from a specific block:
  - `LISTENER_START_BLOCK=70730000`

Reset listener state to apply a new initial window
- Run once: `node backend/scripts/resetDepositListener.js`
- Then restart: `pm2 restart farm-backend`

Manual backfill (missed old tx or blocks)
- By transaction hash:
  - `node backend/scripts/backfillDepositByTx.js --tx 0xYOUR_TX_HASH`
- By block range:
  - `node backend/scripts/backfillDepositByTx.js --from 70619000 --to 70619100`
Notes:
- Ensure `.env` has correct `BSC_RPC_URL`, `USDT_CONTRACT_ADDRESS`, `SYSTEM_DEPOSIT_ADDRESS`.
- Backfill writes to `processedTxs` and user `transactions` like the live scanner.
- Add `--force` to recalculate/adjust if the tx was already processed.

11) Cron Jobs in App
- Daily jobs (status updates, etc.) run at 00:00 server time.
- Egg spawn runs daily at 07:00 Asia/Bangkok by code.
- Lucky draw runs on 7/14/28 day schedules.
- All scheduled via node-cron inside app.js; no OS‑level cron needed.

12) Troubleshooting
- 401 Unauthorized on protected routes:
  - Ensure frontend sends a fresh Firebase ID token (force refresh before calling)
- Missing module errors (e.g., protobufjs, ethers):
  - npm install (already included in package.json)
- BSC RPC "limit exceeded":
  - Reduce LISTENER_BLOCK_CHUNK; consider more reliable RPC endpoint
- Deposit not visible on Deposit page:
  - Confirm usdtWallet set in user settings matches sender address
  - Check Firestore: users/{uid}/transactions with type "deposit"
  - Check unknownDeposits collection if address not matched

13) Updating Backend
- Pull latest code:
  - cd ~/farm-backend && git pull
  - cd backend && npm install
  - pm2 restart farm-backend

14) Health/Logs
- pm2 logs farm-backend
- Check Nginx logs: /var/log/nginx/access.log and error.log

That’s it! Your backend should now be running on your DigitalOcean Droplet with PM2 and (optionally) Nginx + HTTPS.
