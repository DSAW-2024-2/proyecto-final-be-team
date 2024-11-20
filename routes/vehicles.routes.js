// vehicles.routes.js
// El archivo maneja todas las rutas relacionadas con los vehículos, incluyendo el registro,
// actualización y consulta de información de vehículos.

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { validateCar } = require('../middleware/vehicleValidation.middleware');

// Función de compresión de imágenes actualizada para manejar diferentes formatos de base64
const compressBase64Image = (base64String) => {
    if (!base64String) return null;

    // Si ya tiene el prefijo correcto, retornarlo como está
    if (base64String.startsWith('data:image')) {
        return base64String;
    }

    // Si es solo el string base64, verificar que sea válido
    try {
        // Intentar decodificar para verificar que es un base64 válido
        atob(base64String);
        // Si es válido, añadir el prefijo
        return `data:image/jpeg;base64,${base64String}`;
    } catch (error) {
        console.error('Error al procesar imagen base64:', error);
        return null;
    }
};

// Ruta para registrar un nuevo vehículo
router.post('/register-car', [authMiddleware, validateCar], async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('Registrando vehículo para usuario:', userId);
        
        // Obtener el documento del usuario
        const userRef = req.app.locals.collections.users.doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            console.log('Usuario no encontrado:', userId);
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        const userData = userDoc.data();
        
        // Verificar si el usuario ya tiene un vehículo registrado
        if (userData.vehicle) {
            console.log('Usuario ya tiene vehículo registrado:', userId);
            return res.status(400).json({
                message: 'El usuario ya tiene un vehículo registrado'
            });
        }

        const { plate, color, availableSeats, brand, model, carImage, soatImage } = req.body;

        // Comprimir y validar imágenes antes de guardar
        const processedCarImage = compressBase64Image(carImage);
        const processedSoatImage = compressBase64Image(soatImage);

        if (!processedCarImage || !processedSoatImage) {
            console.log('Error en procesamiento de imágenes');
            return res.status(400).json({
                message: 'Error al procesar las imágenes. Formato inválido.'
            });
        }

        // Crear objeto del vehículo
        const carData = {
            plate: plate.toUpperCase(),
            color: color.toLowerCase(),
            availableSeats: parseInt(availableSeats),
            brand: brand.trim(),
            model: model.trim(),
            carImage: processedCarImage,
            soatImage: processedSoatImage,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            tripCount: 0,
            lastUsed: null
        };

        console.log('Guardando datos del vehículo:', { ...carData, carImage: '[Image data]', soatImage: '[Image data]' });

        // Actualizar el documento del usuario con los datos del vehículo
        await userRef.update({
            vehicle: carData,
            hasVehicle: true,
            updatedAt: new Date()
        });

        // Enviar respuesta sin las imágenes para reducir el tamaño de la respuesta
        const { carImage: img1, soatImage: img2, ...carDataWithoutImages } = carData;
        
        console.log('Vehículo registrado exitosamente');
        res.status(201).json({
            success: true,
            message: `Vehículo ${plate.toUpperCase()} registrado exitosamente`,
            data: carDataWithoutImages
        });

    } catch (error) {
        console.error('Error registrando el vehículo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar el vehículo',
            error: error.message
        });
    }
});

// Ruta para obtener el vehículo del usuario actual
router.get('/my-car', authMiddleware, async (req, res) => {
    try {
        console.log('Obteniendo información del vehículo para usuario:', req.user.id);
        const userId = req.user.id;
        const userRef = req.app.locals.collections.users.doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.log('Usuario no encontrado:', userId);
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const userData = userDoc.data();

        if (!userData.vehicle) {
            console.log('Usuario no tiene vehículo registrado:', userId);
            return res.status(404).json({
                success: false,
                message: 'No tienes ningún vehículo registrado'
            });
        }

        // Procesar las imágenes antes de enviarlas
        const processedVehicle = {
            ...userData.vehicle,
            carImage: userData.vehicle.carImage ? compressBase64Image(userData.vehicle.carImage) : null,
            soatImage: userData.vehicle.soatImage ? compressBase64Image(userData.vehicle.soatImage) : null
        };

        console.log('Información del vehículo recuperada exitosamente');
        res.status(200).json({
            success: true,
            data: processedVehicle
        });

    } catch (error) {
        console.error('Error obteniendo el vehículo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener información del vehículo',
            error: error.message
        });
    }
});

// Ruta para actualizar el estado del vehículo
router.patch('/my-car/status', authMiddleware, async (req, res) => {
    try {
        console.log('Actualizando estado del vehículo para usuario:', req.user.id);
        const userId = req.user.id;
        const { status } = req.body;

        if (!['active', 'inactive', 'maintenance'].includes(status)) {
            console.log('Estado inválido:', status);
            return res.status(400).json({
                success: false,
                message: 'Estado no válido'
            });
        }

        const userRef = req.app.locals.collections.users.doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists || !userDoc.data().vehicle) {
            console.log('Vehículo no encontrado para usuario:', userId);
            return res.status(404).json({
                success: false,
                message: 'Vehículo no encontrado'
            });
        }

        await userRef.update({
            'vehicle.status': status,
            'vehicle.updatedAt': new Date()
        });

        console.log('Estado del vehículo actualizado exitosamente');
        res.status(200).json({
            success: true,
            message: `Estado del vehículo actualizado a: ${status}`,
            data: { status }
        });

    } catch (error) {
        console.error('Error actualizando estado del vehículo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el estado del vehículo',
            error: error.message
        });
    }
});

// Ruta para actualizar el vehículo
router.put('/my-car/update', [authMiddleware], async (req, res) => {
    try {
        console.log('Actualizando información del vehículo para usuario:', req.user.id);
        const userId = req.user.id;
        const userRef = req.app.locals.collections.users.doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.log('Usuario no encontrado:', userId);
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const userData = userDoc.data();

        if (!userData.vehicle) {
            console.log('Usuario no tiene vehículo registrado:', userId);
            return res.status(404).json({
                success: false,
                message: 'No tienes ningún vehículo registrado'
            });
        }

        if (userData.vehicle.plate === userRef.plate) { // Validar que la placa no esté ya registrada
            return res.status(400).json({
                message: 'La placa del vehículo ya está registrada'
            });
        }

        const { carImage, soatImage, ...updateData } = req.body;
        const updatedVehicle = {
            ...userData.vehicle,
            ...updateData,
            updatedAt: new Date()
        };

        // Procesar nuevas imágenes si se proporcionan
        if (carImage) {
            const processedCarImage = compressBase64Image(carImage);
            if (processedCarImage) {
                updatedVehicle.carImage = processedCarImage;
            }
        }

        if (soatImage) {
            const processedSoatImage = compressBase64Image(soatImage);
            if (processedSoatImage) {
                updatedVehicle.soatImage = processedSoatImage;
            }
        }

        console.log('Guardando actualización del vehículo');
        await userRef.update({
            vehicle: updatedVehicle
        });

        // Enviar respuesta sin las imágenes
        const { carImage: img1, soatImage: img2, ...responseData } = updatedVehicle;

        console.log('Vehículo actualizado exitosamente');
        res.status(200).json({
            success: true,
            message: 'Vehículo actualizado exitosamente',
            data: responseData
        });

    } catch (error) {
        console.error('Error actualizando el vehículo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el vehículo',
            error: error.message
        });
    }
});

module.exports = router;