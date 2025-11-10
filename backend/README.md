# Backend (Hybrid: Firestore + MongoDB)

## Setup
- Node.js LTS installed.
- Create `backend/.env` with required credentials and config:
  - Firestore Admin: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY_ID`, `FIREBASE_CLIENT_ID`
  - Mongo: `MONGODB_URI`
  - Optional: `API_PORT` (fallbacks to `PORT` or 5000)

## Run Server
- From `backend/`: `npm install`
- Start API: `npm start`

## Scripts
- Seed promotions \(Firestore\): `npm run seed:promotions`
- Export Firestore: `npm run export-firestore`
- Migrate Firestore ? Mongo \(chickens, marketOrders\): `npm run migrate:fs-to-mongo`
- Spawn daily eggs \(manual, Firestore\): `npm run spawn-eggs`
- Fix feedCount from history \(Hybrid\): `npm run fix-feedcount`
  - Mongo-first: updates `chickens.feedCount`; fallback to Firestore per user
- Update dead chickens weight=0 \(Hybrid\): `node scripts/updateDeadChickenWeights.js`

## Daily Egg Schedule (07:00 Asia/Bangkok)
- Cron job: runs at `07:00` Bangkok time to spawn eggs for all users.
- Fallback scheduler: checks Bangkok time every minute and triggers once per Bangkok day at 07:00.
  - Protects against timezone issues on some hosts (e.g., missing ICU data).
  - Safe to call repeatedly — egg IDs are date-based \(`daily_YYYY-MM-DD_<chickenId>`\), preventing duplicates.

## Logs / Verification
- On spawn: look for `Spawning daily eggs for all users...` and `Finished spawning daily eggs.` in server logs.
- Verify in Firestore: `users/{uid}/eggs/daily_YYYY-MM-DD_<chickenId>` created for eligible mother chickens.

## Troubleshooting
- No eggs created (0 per user):
  - Chickens must be `type = mother`, `status = normal`, and `feedCount >= 3`.
  - Feed via API/UI increases `feedCount` by the number of food units given.
  - After feeding up to `feedCount >= 3`, run `npm run spawn-eggs` again.
  - If historical data shows `feedCount = 0` while there is `costHistory`, run `npm run fix-feedcount` \(supports Mongo/Firestore\).
- Deprecation warning for `punycode` is harmless and can be ignored.

