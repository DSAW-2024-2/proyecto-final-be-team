const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");

// Reservar un viaje
router.post("/:tripId", authMiddleware, async (req, res) => {
  try {
    const tripId = req.params.tripId;
    const userId = req.user.id;

    const tripRef = req.app.locals.collections.trips.doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Viaje no encontrado"
      });
    }

    const tripData = tripDoc.data();

    // Verificar si el usuario ya está registrado como pasajero
    if (tripData.passengers && tripData.passengers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "El usuario ya está registrado como pasajero en este viaje"
      });
    }

    // Verificar si hay asientos disponibles
    if (tripData.availableSeats <= 0) {
      return res.status(400).json({
        success: false,
        message: "No hay asientos disponibles en este viaje"
      });
    }

    // Actualizar el viaje con el nuevo pasajero
    await tripRef.update({
      passengers: [...(tripData.passengers || []), userId],
      availableSeats: tripData.availableSeats - 1
    });

    res.status(200).json({
      success: true,
      message: "Viaje reservado exitosamente"
    });
  } catch (error) {
    console.error("Error reservando el viaje:", error);
    res.status(500).json({
      success: false,
      message: "Error al reservar el viaje",
      error: error.message
    });
  }
});

module.exports = router;