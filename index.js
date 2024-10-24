require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const app = express();

// Constants
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

if (!JWT_SECRET) {
    console.error('JWT_SECRET is not defined in environment variables');
    process.exit(1);
}

// Middleware
app.use(helmet());
app.use(express.json());
app.use(cors({
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // límite de 100 peticiones por ventana
});

app.use(limiter);

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: NODE_ENV === 'production' ? 'Error interno del servidor' : err.message 
    });
};

// Authentication middleware
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                message: 'No se proporcionó token de autenticación' 
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        req.user = decoded;
        next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ 
                message: 'Token expirado' 
            });
        }
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ 
                message: 'Token inválido' 
            });
        }
        next(err);
    }
};

// Login request validation middleware
const validateLoginRequest = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            message: 'Email y contraseña son requeridos' 
        });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ 
            message: 'Formato de datos inválido' 
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            message: 'Formato de email inválido' 
        });
    }

    next();
};

// Routes
app.post('/login', validateLoginRequest, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Aquí iría la lógica de verificación con la base de datos
        if (email === "admin@example.com" && password === "12345") {
            const token = jwt.sign(
                { 
                    id: 123,
                    email: email,
                    role: 'user'
                }, 
                JWT_SECRET, 
                { 
                    expiresIn: '1h',
                    algorithm: 'HS256'
                }
            );

            return res.json({ 
                token,
                message: 'Login exitoso'
            });
        }

        res.status(401).json({ 
            message: 'Credenciales inválidas' 
        });
    } catch (err) {
        next(err);
    }
});

app.get('/ruta-protegida', authMiddleware, (req, res) => {
    res.json({ 
        message: 'Acceso exitoso a ruta protegida',
        user: req.user
    });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Frontend URL: ${FRONTEND_URL}`);
    console.log(`Ambiente: ${NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM recibido. Cerrando servidor...');
    process.exit(0);
});
