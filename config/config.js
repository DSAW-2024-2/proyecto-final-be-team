require('dotenv').config();

const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3000,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION || '15m',
    JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '7d',
    DB: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    }
};

// Validación de configuración crítica
const requiredConfigs = ['JWT_ACCESS_SECRET', 'FRONTEND_URL'];

for (const config_name of requiredConfigs) {
    if (!config[config_name]) {
        throw new Error(`${config_name} es requerido en las variables de entorno`);
    }
}

module.exports = config;