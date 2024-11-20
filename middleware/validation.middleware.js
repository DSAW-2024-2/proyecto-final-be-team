const validateLoginRequest = (req, res, next) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            message: 'Email y contraseña son requeridos'
        });
    }
    
    // Validar formato de email y dominio unisabana.edu.co
    const emailRegex = /^[^\s@]+@unisabana\.edu\.co$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            message: 'El email debe ser un correo válido de @unisabana.edu.co'
        });
    }
    
    next();
};

const validateRegisterRequest = (req, res, next) => {
    const { idUni, email, phone, name, password } = req.body;
    
    if (!idUni || !email || !phone || !name || !password) {
        return res.status(400).json({
            message: 'Todos los campos son requeridos'
        });
    }
    
    // Validar formato de email y dominio unisabana.edu.co
    const emailRegex = /^[^\s@]+@unisabana\.edu\.co$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            message: 'El email debe ser un correo válido de @unisabana.edu.co'
        });
    }
    
    // Validar longitud de la contraseña
    if (password.length < 6) {
        return res.status(400).json({
            message: 'La contraseña debe tener al menos 6 caracteres'
        });
    }
    
    // Validar formato de teléfono
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({
            message: 'Formato de teléfono inválido (debe tener 10 dígitos)'
        });
    }
    
    next();
};

module.exports = {
    validateLoginRequest,
    validateRegisterRequest
};