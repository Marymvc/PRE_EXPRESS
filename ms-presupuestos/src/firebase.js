require('dotenv').config();
const admin = require('firebase-admin');

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Producción (Railway)
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Firebase: credenciales desde variable de entorno');
  } catch (err) {
    console.error('❌ Error parseando FIREBASE_SERVICE_ACCOUNT:', err.message);
    process.exit(1);
  }
} else {
  // Desarrollo local
  try {
    serviceAccount = require('../serviceAccountKey.json');
    console.log('✅ Firebase: credenciales desde archivo local');
  } catch (err) {
    console.error('❌ No se encontró serviceAccountKey.json ni FIREBASE_SERVICE_ACCOUNT');
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { admin, db };