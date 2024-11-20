const jwt = require('jsonwebtoken');
const { JWT_ACCESS_SECRET } = require('../config/config');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                message: 'No se proporcionó token de autenticación' 
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
        
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

module.exports = authMiddleware;