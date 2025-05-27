// firebase.js
// โหลดตัวแปรจาก .env ก่อนใช้งาน
require('dotenv').config();

const admin = require('firebase-admin');

// อ่านค่าตัวแปรจาก environment
const {
  FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY_ID,
  FIREBASE_CLIENT_ID
} = process.env;

// ตรวจสอบว่า projectId ถูกโหลดมาหรือไม่
console.log('🔍 FIREBASE_PROJECT_ID=', FIREBASE_PROJECT_ID);
if (!FIREBASE_PROJECT_ID) {
  throw new Error('Missing FIREBASE_PROJECT_ID in environment');
}

// สร้าง serviceAccount object สำหรับ credential
const serviceAccount = {
  project_id: FIREBASE_PROJECT_ID,
  private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: FIREBASE_CLIENT_EMAIL,
  private_key_id: FIREBASE_PRIVATE_KEY_ID,
  client_id: FIREBASE_CLIENT_ID
};

// เริ่มต้น Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: FIREBASE_PROJECT_ID
});

// Export Firestore database
const db = admin.firestore();
module.exports = { admin, db };