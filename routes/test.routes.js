// routes/test.routes.js
const express = require('express');
const router = express.Router();

// Ruta para probar la conexión a Firebase
router.get('/test-firebase', async (req, res) => {
    try {
        // Intenta escribir un documento de prueba
        const testRef = req.app.locals.collections.users;
        const testDoc = await testRef.add({
            name: 'Test User',
            email: 'test@test.com',
            createdAt: new Date()
        });

        // Intenta leer el documento que acabamos de crear
        const docSnapshot = await testRef.doc(testDoc.id).get();
        
        // Elimina el documento de prueba
        await testRef.doc(testDoc.id).delete();

        res.json({
            status: 'success',
            message: 'Firebase está conectado y funcionando correctamente',
            testData: docSnapshot.data()
        });

    } catch (error) {
        console.error('Error en la prueba de Firebase:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al conectar con Firebase',
            error: error.message
        });
    }
});

module.exports = router;