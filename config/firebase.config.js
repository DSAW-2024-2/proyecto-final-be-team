const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

const initializeFirebase = () => {
    try {
        // Verificar que serviceAccount existe
        if (!serviceAccount) {
            throw new Error('Service Account no encontrado');
        }

        // Verificar si Firebase ya está inicializado
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('Firebase inicializado por primera vez');
        } else {
            console.log('Firebase ya estaba inicializado');
        }

        //Inicializar Firestore
        const db = admin.firestore();

        //Referencias de las colecciones
        const collections = {
            users: db.collection('users'),
            trips: db.collection('trips'),
            refreshTokens: db.collection('refreshTokens')
        }

        return { db, collections };
    } catch (err) {
        console.error('Error al inicializar Firebase:', err);
        process.exit(1);
    }
};

module.exports = {
    initializeFirebase,
    admin
};