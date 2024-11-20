const app = require('./app');
const config = require('./config/config');

// Start server
app.listen(config.PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${config.PORT}`);
    console.log(`Frontend URL: ${config.FRONTEND_URL}`);
    console.log(`Ambiente: ${config.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM recibido. Cerrando servidor...');
    process.exit(0);
});