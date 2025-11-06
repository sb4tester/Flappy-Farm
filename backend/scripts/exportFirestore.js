/*
  Export entire Firestore (all root collections and subcollections) to JSON.

  Usage:
    - Ensure backend/.env has valid Firebase Admin credentials (same as backend/firebase.js expects).
    - Run:  npm run export-firestore

  Output:
    - Writes to backend/firestore_db.json (or path from FIRESTORE_EXPORT_PATH)
*/

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { admin, db } = require('../firebase');

function isTimestamp(v) {
  return v && typeof v.toDate === 'function' && typeof v.toMillis === 'function';
}

function isGeoPoint(v) {
  return v && typeof v.latitude === 'number' && typeof v.longitude === 'number' && v._latitude !== undefined;
}

function isDocumentRef(v) {
  return v && typeof v.path === 'string' && typeof v.get === 'function';
}

function isBytes(v) {
  // Firestore Bytes in admin SDK are Buffer-like (Uint8Array)
  return v && (v instanceof Uint8Array || Buffer.isBuffer(v));
}

function normalize(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(normalize);
  if (isTimestamp(value)) return value.toDate().toISOString();
  if (isGeoPoint(value)) return { _type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  if (isDocumentRef(value)) return { _type: 'ref', path: value.path };
  if (isBytes(value)) return { _type: 'bytes', base64: Buffer.from(value).toString('base64') };
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalize(v);
    return out;
  }
  return value;
}

async function exportDocSubcollections(docRef) {
  const subs = await docRef.listCollections();
  const result = [];
  for (const sub of subs) {
    result.push(await exportCollection(sub));
  }
  return result;
}

async function exportCollection(collRef) {
  const snap = await collRef.get();
  const docs = [];
  for (const doc of snap.docs) {
    const data = normalize(doc.data());
    const subcollections = await exportDocSubcollections(doc.ref);
    docs.push({ id: doc.id, data, subcollections });
  }
  return { name: collRef.id, path: collRef.path, docs };
}

async function exportAll() {
  const root = await db.listCollections();
  const collections = [];
  for (const c of root) {
    collections.push(await exportCollection(c));
  }
  return { exportedAt: new Date().toISOString(), projectId: process.env.FIREBASE_PROJECT_ID, collections };
}

(async () => {
  try {
    const data = await exportAll();
    const outPath = process.env.FIRESTORE_EXPORT_PATH || path.join(__dirname, '..', 'firestore_db.json');
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Firestore export written to:', outPath);
    process.exit(0);
  } catch (e) {
    console.error('Failed to export Firestore:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();

