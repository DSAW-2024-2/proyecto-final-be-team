const validateCar = async (req, res, next) => {
    try {
        const { plate, color, availableSeats, brand, model, carImage, soatImage } = req.body;

        // Validar que se enviaron todos los campos requeridos
        if (!plate || !color || !availableSeats || !brand || !model) {
            return res.status(400).json({
                message: 'Todos los campos son requeridos'
            });
        }

        //validar color y marca
        if (typeof color !== 'string' || typeof brand !== 'string' || typeof model !== 'string') {   
            return res.status(400).json({
                message: 'El color, marca y modelo deben ser textos'
            });
        }

        // Validar formato de placa (ABC-123)
        const plateRegex = /^[A-Z]{3}-\d{3}$/;
        if (!plateRegex.test(plate.toUpperCase())) {
            return res.status(400).json({
                message: 'El formato de la placa no es válido. Debe ser ABC-123'
            });
        }

        // Validar que se enviaron las imágenes en base64
        if (!carImage || !soatImage) {
            return res.status(400).json({
                message: 'Las imágenes del vehículo y SOAT son requeridas'
            });
        }

        // Validar que las imágenes sean base64 válido
        const base64Regex = /^data:image\/(jpeg|jpg|png);base64,/;
        if (!base64Regex.test(carImage) || !base64Regex.test(soatImage)) {
            return res.status(400).json({
                message: 'Las imágenes deben estar en formato válido (JPEG, PNG)'
            });
        }

        // Validar número de asientos disponibles
        const seats = parseInt(availableSeats);
        if (isNaN(seats) || seats < 1 || seats > 8) {
            return res.status(400).json({
                message: 'El número de asientos debe ser entre 1 y 8'
            });
        }

        // Validar que la placa no esté ya registrada
        const usersRef = req.app.locals.collections.users;
        const existingCarQuery = await usersRef.where('vehicle.plate', '==', plate.toUpperCase()).get();

        if (!existingCarQuery.empty) {
            return res.status(400).json({
                message: 'La placa del vehículo ya está registrada'
            });
        }

        next();
    } catch (error) {
        console.error('Error in car validation:', error);
        res.status(500).json({
            message: 'Error al validar los datos del vehículo'
        });
    }
};

module.exports = { validateCar };