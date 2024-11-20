const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

// Ruta base para verificar autenticación
router.get('/test', authMiddleware, (req, res) => {
    res.json({ 
        message: 'Acceso exitoso a ruta protegida',
        user: req.user
    });
});

// Ruta para obtener perfil de usuario
router.get('/profile', authMiddleware, (req, res) => {
    res.json({ 
        message: 'Perfil de usuario recuperado',
        profile: req.user
    });
});

// Ruta para datos protegidos
router.get('/data', authMiddleware, (req, res) => {
    res.json({ 
        message: 'Datos protegidos recuperados',
        data: {
            items: [
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' }
            ]
        }
    });
});

module.exports = router;