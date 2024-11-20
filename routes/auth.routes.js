const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { validateLoginRequest, validateRegisterRequest } = require('../middleware/validation.middleware');
const {JWT_ACCESS_SECRET, 
    JWT_REFRESH_SECRET, 
    JWT_ACCESS_EXPIRATION,
    JWT_REFRESH_EXPIRATION  } = require('../config/config');

// Ruta de registro
router.post('/register', validateRegisterRequest, async (req, res, next) => {
    try {
        const { idUni, email, phone, name, password } = req.body;
        
        const userSnapshot = await req.app.locals.collections.users
            .where('email', '==', email)
            .get();

        if (!userSnapshot.empty) {
            return res.status(400).json({ 
                message: 'El correo electrónico ya está registrado' 
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            idUni,
            email,
            phone,
            name,
            password: hashedPassword,
            role: 'user',
            vehicle: null,
            createdAt: new Date()
        };

        const userRef = await req.app.locals.collections.users.add(newUser);

        const accessToken = generateAccessToken({
            id: userRef.id,
            email: email,
            role: 'user',
            name: name
        });

        const refreshToken = generateRefreshToken({
            id: userRef.id,
            email: email,
            role: 'user',
            name: name
        });

        // Guardar refresh token en Firebase
        await req.app.locals.collections.refreshTokens.add({
            userId: userRef.id,
            token: refreshToken,
            createdAt: new Date()
        });

        const { password: _, ...userData } = newUser;

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            accessToken,
            refreshToken,
            user: userData
        });

    } catch (err) {
        next(err);
    }
});

// Ruta de login
router.post('/login', validateLoginRequest, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const userSnapshot = await req.app.locals.collections.users
            .where('email', '==', email)
            .get();

        if (userSnapshot.empty) {
            return res.status(401).json({ 
                message: 'Credenciales inválidas' 
            });
        }

        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();

        const isValidPassword = await bcrypt.compare(password, userData.password);

        if (!isValidPassword) {
            return res.status(401).json({ 
                message: 'Credenciales inválidas' 
            });
        }

        // Revocar todos los refresh tokens anteriores del usuario
        const oldTokensSnapshot = await req.app.locals.collections.refreshTokens
            .where('userId', '==', userDoc.id)
            .get();

        const deletePromises = oldTokensSnapshot.docs.map(doc => 
            req.app.locals.collections.refreshTokens.doc(doc.id).delete()
        );
        await Promise.all(deletePromises);

        const accessToken = generateAccessToken({
            id: userDoc.id,
            email: userData.email,
            role: userData.role,
            name: userData.name
        });

        const refreshToken = generateRefreshToken({
            id: userDoc.id,
            email: userData.email,
            role: userData.role,
            name: userData.name
        });

        // Guardar refresh token en Firebase
        await req.app.locals.collections.refreshTokens.add({
            userId: userDoc.id,
            token: refreshToken,
            createdAt: new Date()
        });

        const { password: _, ...userResponse } = userData;

        res.json({ 
            accessToken,
            refreshToken,
            message: 'Login exitoso',
            user: userResponse
        });

    } catch (err) {
        next(err);
    }
});

// Nueva ruta para refresh token
router.post('/refresh-token', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token no proporcionado' });
    }

    try {
        // Verificar si el refresh token existe en la base de datos
        const tokenSnapshot = await req.app.locals.collections.refreshTokens
            .where('token', '==', refreshToken)
            .get();

        if (tokenSnapshot.empty) {
            return res.status(401).json({ message: 'Refresh token inválido' });
        }

        // Verificar y decodificar el refresh token
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

        // Verificar si el usuario aún existe
        const userSnapshot = await req.app.locals.collections.users
            .doc(decoded.id)
            .get();

        if (!userSnapshot.exists) {
            // Si el usuario ya no existe, eliminar el refresh token
            await req.app.locals.collections.refreshTokens
                .doc(tokenSnapshot.docs[0].id)
                .delete();
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        // Generar nuevos tokens
        const accessToken = generateAccessToken({
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name
        });

        const newRefreshToken = generateRefreshToken({
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name
        });

        // Actualizar refresh token en la base de datos
        await req.app.locals.collections.refreshTokens
            .doc(tokenSnapshot.docs[0].id)
            .delete();

        await req.app.locals.collections.refreshTokens.add({
            userId: decoded.id,
            token: newRefreshToken,
            createdAt: new Date()
        });

        res.json({
            accessToken,
            refreshToken: newRefreshToken,
        });
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            // Limpiar token expirado
            const tokenSnapshot = await req.app.locals.collections.refreshTokens
                .where('token', '==', refreshToken)
                .get();
            
            if (!tokenSnapshot.empty) {
                await req.app.locals.collections.refreshTokens
                    .doc(tokenSnapshot.docs[0].id)
                    .delete();
            }
            return res.status(401).json({ message: 'Refresh token expirado' });
        }
        return res.status(401).json({ message: 'Refresh token inválido' });
    }
});

// Ruta de logout
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (refreshToken) {
            // Eliminar el refresh token de la base de datos
            const tokenSnapshot = await req.app.locals.collections.refreshTokens
                .where('token', '==', refreshToken)
                .get();

            if (!tokenSnapshot.empty) {
                await req.app.locals.collections.refreshTokens
                    .doc(tokenSnapshot.docs[0].id)
                    .delete();
            }
        }

        res.json({ message: 'Logout exitoso' });
    } catch (err) {
        res.status(500).json({ message: 'Error al cerrar sesión' });
    }
});


// Función auxiliar para generar access token
function generateAccessToken(payload) {
    return jwt.sign(payload, JWT_ACCESS_SECRET, { 
        expiresIn: JWT_ACCESS_EXPIRATION,
        algorithm: 'HS256'
    });
}

// Función auxiliar para generar refresh token
function generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { 
        expiresIn: JWT_REFRESH_EXPIRATION,
        algorithm: 'HS256'
    });
}

// Tarea programada para limpiar tokens expirados
async function cleanupExpiredTokens(collections) {
    const now = new Date();
    const tokenSnapshot = await collections.refreshTokens.get();
    
    for (const doc of tokenSnapshot.docs) {
        try {
            const token = doc.data().token;
            jwt.verify(token, JWT_REFRESH_SECRET);
        } catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                await collections.refreshTokens.doc(doc.id).delete();
            }
        }
    }
}

// Ejecutar limpieza cada 24 horas
setInterval(() => {
    if (req.app && req.app.locals && req.app.locals.collections) {
        cleanupExpiredTokens(req.app.locals.collections);
    }
}, 24 * 60 * 60 * 1000);

router.get('/status', (req, res) => {
    res.json({
        message: 'Servicio de autenticación funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;