const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { validateTrip, validateTripSearch } = require("../middleware/tripValidation.middleware");

// Crear un viaje (asociado con el conductor)
router.post("/", [authMiddleware, validateTrip], async (req, res) => {
  try {
    const userId = req.user.id;
    const userRef = req.app.locals.collections.users.doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false,
        message: "Usuario no encontrado" 
      });
    }

    const userData = userDoc.data();

    if (!userData.vehicle) {
      return res.status(400).json({
        success: false,
        message: "El usuario no tiene un vehículo registrado"
      });
    }

    const {
      tripDate,
      origin,
      destination,
      arrivalTime,
      departureTime,
      cost,
      paymentMethods,
      routeTag,  // Aseguramos que routeTag está incluido
      affinity,
      description
    } = req.body;

    // Log para debugging
    console.log('Creating trip with routeTag:', routeTag);

    const newTrip = {
      driverId: userId,
      driverName: userData.name,
      driverVehicle: {
        plate: userData.vehicle.plate,
        color: userData.vehicle.color,
        availableSeats: userData.vehicle.availableSeats,
        brand: userData.vehicle.brand,
        model: userData.vehicle.model,
      },
      tripDate: new Date(tripDate),
      origin,
      destination,
      arrivalTime,
      departureTime,
      cost: Number(cost),
      paymentMethods,
      routeTag,  // Incluimos routeTag en el objeto newTrip
      affinity: affinity || "No especificada",
      description: description || "",
      createdAt: new Date(),
      status: "scheduled",
      passengers: [],
      availableSeats: userData.vehicle.availableSeats
    };

    // Log para debugging
    console.log('New trip object:', { ...newTrip, routeTag });

    const tripRef = await req.app.locals.collections.trips.add(newTrip);
    
    // Verificamos que se guardó correctamente
    const savedTrip = await tripRef.get();
    const savedData = savedTrip.data();

    if (!savedData.routeTag) {
      throw new Error('Route tag was not saved correctly');
    }
    
    res.status(201).json({ 
      success: true,
      message: "Viaje creado exitosamente",
      data: {
        id: tripRef.id,
        ...newTrip
      }
    });
  } catch (error) {
    console.error("Error creando el viaje:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear el viaje",
      error: error.message
    });
  }
});

// Obtener todos los viajes con opción de filtrar por ruta
router.get("/", validateTripSearch, async (req, res) => {
  try {
    const { routeTag } = req.query;
    let tripsQuery = req.app.locals.collections.trips;

    // Si se proporciona routeTag, filtrar por esa ruta
    if (routeTag) {
      tripsQuery = tripsQuery.where('routeTag', '==', routeTag);
    }

    const tripsSnapshot = await tripsQuery.get();
    const allTrips = tripsSnapshot.docs.map((doc) => ({ 
      id: doc.id, 
      ...doc.data(),
      tripDate: doc.data().tripDate.toDate(),
      createdAt: doc.data().createdAt.toDate()
    }));
    
    res.status(200).json({
      success: true,
      data: allTrips
    });
  } catch (error) {
    console.error("Error obteniendo los viajes:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener los viajes",
      error: error.message
    });
  }
});

// Obtener un viaje por ID
router.get("/:id", async (req, res) => {
  try {
    const tripId = req.params.id;
    const tripDoc = await req.app.locals.collections.trips.doc(tripId).get();
    
    if (!tripDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Viaje no encontrado"
      });
    }

    const tripData = tripDoc.data();
    
    res.status(200).json({
      success: true,
      data: {
        id: tripDoc.id,
        ...tripData,
        tripDate: tripData.tripDate.toDate(),
        createdAt: tripData.createdAt.toDate()
      }
    });
  } catch (error) {
    console.error("Error obteniendo el viaje:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener el viaje",
      error: error.message
    });
  }
});

// Actualizar un viaje por ID
router.put("/:id", [authMiddleware, validateTrip], async (req, res) => {
  try {
    const tripId = req.params.id;
    const tripRef = req.app.locals.collections.trips.doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Viaje no encontrado"
      });
    }

    const tripData = tripDoc.data();
    if (tripData.driverId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para modificar este viaje"
      });
    }

    const updatedData = {
      ...req.body,
      routeTag: req.body.routeTag, // Aseguramos que routeTag se actualiza
      updatedAt: new Date()
    };

    await tripRef.update(updatedData);
    
    res.status(200).json({
      success: true,
      message: "Viaje actualizado exitosamente"
    });
  } catch (error) {
    console.error("Error actualizando el viaje:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar el viaje",
      error: error.message
    });
  }
});

// Eliminar un viaje por ID
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const tripId = req.params.id;
    const tripRef = req.app.locals.collections.trips.doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Viaje no encontrado"
      });
    }

    const tripData = tripDoc.data();
    if (tripData.driverId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para eliminar este viaje"
      });
    }

    await tripRef.delete();
    
    res.status(200).json({
      success: true,
      message: "Viaje eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error eliminando el viaje:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar el viaje",
      error: error.message
    });
  }
});

module.exports = router;