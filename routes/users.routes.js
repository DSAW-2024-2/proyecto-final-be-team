const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const bcrypt = require('bcryptjs');

// Función auxiliar para formatear las fechas
const formatDate = (date) => {
    if (!(date instanceof Date)) {
        date = date.toDate(); // Para convertir timestamps de Firestore
    }
    return date.toISOString().split('.')[0] + 'Z'; // Elimina los nanosegundos
};

// Función auxiliar para formatear los datos del usuario
const formatUserData = (userData, docId) => {
    const { 
        password, 
        refreshTokens, 
        vehicle, 
        hasVehicle,
        createdAt,
        updatedAt,
        ...userInfo 
    } = userData;

    return {
        id: docId,
        ...userInfo,
        createdAt: createdAt ? formatDate(createdAt) : null,
        updatedAt: updatedAt ? formatDate(updatedAt) : null
    };
};

// Obtener la información del usuario actual
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userDoc = await req.app.locals.collections.users.doc(req.user.id).get();

        if (!userDoc.exists) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado' 
            });
        }

        res.json({
            success: true,
            data: formatUserData(userDoc.data(), userDoc.id)
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error al obtener información del usuario',
            error: error.message 
        });
    }
});

// Actualizar información del usuario actual
router.put('/me', authMiddleware, async (req, res) => {
    try {
        const userRef = req.app.locals.collections.users.doc(req.user.id);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado' 
            });
        }

        const updateData = { ...req.body };
        delete updateData.role;
        delete updateData.id;
        delete updateData.vehicle;
        delete updateData.hasVehicle;

        // Si se incluye una nueva contraseña, hashearla
        if (updateData.password) {
            if (updateData.password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'La contraseña debe tener al menos 6 caracteres'
                });
            }
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        }

        // Validar email si se está actualizando
        if (updateData.email) {
            const emailRegex = /^[^\s@]+@unisabana\.edu\.co$/;
            if (!emailRegex.test(updateData.email)) {
                return res.status(400).json({
                    success: false,
                    message: 'El email debe ser un correo válido de @unisabana.edu.co'
                });
            }

            // Verificar si el nuevo email ya está en uso
            const emailSnapshot = await req.app.locals.collections.users
                .where('email', '==', updateData.email)
                .get();
            
            if (!emailSnapshot.empty && emailSnapshot.docs[0].id !== req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: 'El email ya está en uso'
                });
            }
        }

        // Validar teléfono si se está actualizando
        if (updateData.phone) {
            const phoneRegex = /^\d{10}$/;
            if (!phoneRegex.test(updateData.phone)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de teléfono inválido (debe tener 10 dígitos)'
                });
            }
        }

        updateData.updatedAt = new Date();

        await userRef.update(updateData);

        // Obtener los datos actualizados
        const updatedDoc = await userRef.get();

        res.json({
            success: true,
            message: 'Información actualizada exitosamente',
            data: formatUserData(updatedDoc.data(), updatedDoc.id)
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error al actualizar información',
            error: error.message 
        });
    }
});

// Eliminar la cuenta del usuario actual
router.delete('/me', authMiddleware, async (req, res) => {
    try {
        const userRef = req.app.locals.collections.users.doc(req.user.id);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado' 
            });
        }

        // Eliminar todos los refresh tokens del usuario
        const tokenSnapshot = await req.app.locals.collections.refreshTokens
            .where('userId', '==', req.user.id)
            .get();

        const deleteTokenPromises = tokenSnapshot.docs.map(doc => 
            req.app.locals.collections.refreshTokens.doc(doc.id).delete()
        );

        // Eliminar el usuario y sus tokens
        await Promise.all([
            userRef.delete(),
            ...deleteTokenPromises
        ]);

        res.json({
            success: true,
            message: 'Cuenta eliminada exitosamente'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error al eliminar la cuenta',
            error: error.message 
        });
    }
});

module.exports = router;