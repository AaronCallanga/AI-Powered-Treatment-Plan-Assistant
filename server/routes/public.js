const express = require("express");
const router = express.Router();
const TreatmentPlan = require("../models/TreatmentPlan");
const Patient = require("../models/Patient");

/**
 * GET /api/public/treatment/:id
 * Get treatment plan by ID (public access for QR codes)
 * This route is public but returns limited information
 */
router.get("/treatment/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const treatment = await TreatmentPlan.findById(id).populate("patientId");

    if (!treatment) {
      return res.status(404).json({
        success: false,
        message: "Treatment plan not found",
      });
    }

    // Return sanitized data (no sensitive medical details without auth)
    const publicData = {
      _id: treatment._id,
      patientName: treatment.patientId
        ? `${treatment.patientId.firstName} ${treatment.patientId.lastName}`
        : "Unknown Patient",
      status: treatment.status,
      generatedAt: treatment.createdAt,
      // Only show basic info without detailed medical data
      message: "Please log in to view full treatment details",
    };

    res.json({
      success: true,
      data: publicData,
      requiresAuth: true,
    });
  } catch (error) {
    console.error("Error fetching public treatment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch treatment plan",
    });
  }
});

module.exports = router;
