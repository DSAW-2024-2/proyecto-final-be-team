// tripValidation.middleware.js

/**
 * Define las rutas válidas para los viajes
 */
const VALID_ROUTES = [
    { id: 'boyaca', name: 'Boyacá' },
    { id: 'autopista', name: 'Autopista Norte' },
    { id: 'septima', name: '7ma' },
    { id: 'novena', name: '9na' },
    { id: 'zipa', name: 'Zipa' },
    { id: 'heroes', name: 'Héroes' },
    { id: 'suba', name: 'Suba' },
    { id: 'mosquera', name: 'Mosquera' },
    { id: 'calle80', name: 'Calle 80' },
    { id: 'chia', name: 'Chía' },
];

/**
 * Define los métodos de pago válidos
 */
const VALID_PAYMENT_METHODS = ['nequi', 'daviplata', 'efectivo'];

/**
 * Middleware para validar los datos de un viaje antes de su creación o actualización
 */
const validateTrip = (req, res, next) => {
    try {
        const { 
            tripDate, 
            origin, 
            destination, 
            arrivalTime, 
            departureTime, 
            cost, 
            paymentMethods,
            routeTag,
            affinity,
            description 
        } = req.body;

        // Validar campos requeridos
        const requiredFields = [
            'tripDate', 
            'origin', 
            'destination', 
            'arrivalTime', 
            'departureTime', 
            'cost', 
            'paymentMethods',
            'routeTag'
        ];

        const missingFields = requiredFields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios',
                missingFields
            });
        }

        // Validar que los campos de texto no estén vacíos
        const textFields = [
            { field: 'origin', name: 'Origen' },
            { field: 'destination', name: 'Destino' },
        ];

        for (const { field, name } of textFields) {
            if (typeof req.body[field] !== 'string' || req.body[field].trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `El campo ${name} no puede estar vacío y debe ser texto`
                });
            }
        }

        // Validar costo
        const costNumber = Number(cost);
        if (isNaN(costNumber) || costNumber <= 0) {
            return res.status(400).json({
                success: false,
                message: 'El costo debe ser un número válido mayor a 0'
            });
        }

        // Validar límites razonables del costo (ejemplo: entre 1000 y 100000 pesos)
        if (costNumber < 1000 || costNumber > 100000) {
            return res.status(400).json({
                success: false,
                message: 'El costo debe estar entre 1000 y 100000 pesos'
            });
        }

        // Validar formato de fecha
        if (!/^\d{4}-\d{2}-\d{2}$/.test(tripDate)) {
            return res.status(400).json({
                success: false,
                message: 'El formato de fecha debe ser YYYY-MM-DD'
            });
        }

        // Validar fecha del viaje
        const tripDateObj = new Date(tripDate);
        const now = new Date();

        if (isNaN(tripDateObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Fecha inválida'
            });
        }

        if (tripDateObj < now) {
            return res.status(400).json({
                success: false,
                message: 'La fecha del viaje no puede ser anterior a la fecha actual'
            });
        }

        // Validar formato de hora
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(departureTime) || !timeRegex.test(arrivalTime)) {
            return res.status(400).json({
                success: false,
                message: 'El formato de hora debe ser HH:MM'
            });
        }

        // Validar horarios
        const departureTimeObj = new Date(`${tripDate} ${departureTime}`);
        const arrivalTimeObj = new Date(`${tripDate} ${arrivalTime}`);

        if (isNaN(departureTimeObj.getTime()) || isNaN(arrivalTimeObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Horarios inválidos'
            });
        }

        if (departureTimeObj < now) {
            return res.status(400).json({
                success: false,
                message: 'La hora de salida no puede ser anterior a la hora actual'
            });
        }

        if (arrivalTimeObj <= departureTimeObj) {
            return res.status(400).json({
                success: false,
                message: 'La hora de llegada debe ser posterior a la hora de salida'
            });
        }

        // Validar que el viaje no sea más largo de 3 horas
        const tripDuration = (arrivalTimeObj - departureTimeObj) / (1000 * 60 * 60); // en horas
        if (tripDuration > 3) {
            return res.status(400).json({
                success: false,
                message: 'El viaje no puede durar más de 3 horas'
            });
        }

        // Validar métodos de pago
        if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debe seleccionar al menos un método de pago'
            });
        }

        // Validar que los métodos de pago sean válidos
        const invalidPaymentMethods = paymentMethods.filter(method => 
            !VALID_PAYMENT_METHODS.includes(method)
        );

        if (invalidPaymentMethods.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Métodos de pago no válidos',
                invalidPaymentMethods,
                validPaymentMethods: VALID_PAYMENT_METHODS
            });
        }

        // Validar rutas
        const validRouteIds = VALID_ROUTES.map(route => route.id);
        
        if (!validRouteIds.includes(routeTag)) {
            return res.status(400).json({
                success: false,
                message: 'Ruta no válida',
                validRoutes: VALID_ROUTES
            });
        }

        // Validar campos opcionales
        if (affinity && typeof affinity !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'El campo afinidad debe ser texto'
            });
        }

        if (description && typeof description !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'El campo descripción debe ser texto'
            });
        }

        // Si todas las validaciones pasan, continuar
        next();
    } catch (error) {
        console.error('Error en la validación del viaje:', error);
        return res.status(500).json({
            success: false,
            message: 'Error en la validación del viaje',
            error: error.message
        });
    }
};

/**
 * Middleware para validar parámetros de búsqueda de viajes
 */
const validateTripSearch = (req, res, next) => {
    try {
        const { date, routeTag, maxCost } = req.query;

        // Validar fecha si se proporciona
        if (date) {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de fecha inválido'
                });
            }
        }

        // Validar ruta si se proporciona
        if (routeTag && !VALID_ROUTES.map(r => r.id).includes(routeTag)) {
            return res.status(400).json({
                success: false,
                message: 'Ruta no válida',
                validRoutes: VALID_ROUTES
            });
        }

        // Validar costo máximo si se proporciona
        if (maxCost) {
            const cost = Number(maxCost);
            if (isNaN(cost) || cost <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El costo máximo debe ser un número válido mayor a 0'
                });
            }
        }

        next();
    } catch (error) {
        console.error('Error en la validación de búsqueda:', error);
        return res.status(500).json({
            success: false,
            message: 'Error en la validación de la búsqueda',
            error: error.message
        });
    }
};

module.exports = { 
    validateTrip,
    validateTripSearch,
    VALID_ROUTES,
    VALID_PAYMENT_METHODS
};