const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const errorHandler = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const protectedRoutes = require('./routes/protected.routes');
const vehicleRoutes = require('./routes/vehicles.routes');
const userRoutes = require('./routes/users.routes');
const app = express();
const tripsRoutes = require("./routes/trips.routes");

const { initializeFirebase } = require('./config/firebase.config');

const testRoutes = require('./routes/test.routes');

const {db, collections} = initializeFirebase();
app.locals.db = db;
app.locals.collections = collections;

// Validar configuración crítica
if (!config.JWT_ACCESS_SECRET) {
    console.error('JWT_SECRET is not defined in environment variables');
    process.exit(1);
}

// Configurar middlewares de seguridad y parseo
app.use(helmet()); 
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS configuration
const FRONTEND_URL = 'https://proyecto-final-fe-team-sigma.vercel.app';
const ALLOWED_ORIGINS = [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Device-ID'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 86400
}));

// Configurar rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Rutas
app.use('/', authRoutes);
app.use('/api', protectedRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use("/api/trips", tripsRoutes);
app.use('/test', testRoutes);

// Ruta de healthcheck
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Middleware de manejo de errores
app.use(errorHandler);

// Middleware para rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        message: 'Ruta no encontrada'
    });
});

module.exports = app;