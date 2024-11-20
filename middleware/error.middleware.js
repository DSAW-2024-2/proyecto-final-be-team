const { NODE_ENV } = require('../config/config');

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: NODE_ENV === 'production' ? 'Error interno del servidor' : err.message 
    });
};

module.exports = errorHandler;