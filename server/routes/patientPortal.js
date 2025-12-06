const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const TreatmentPlan = require("../models/TreatmentPlan");
const { authenticate } = require("../middleware/auth");

/**
 * Middleware to ensure user is a patient and accessing their own data
 */
const ensurePatientAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Access denied. This endpoint is for patients only.",
      });
    }

    if (!req.user.patientId) {
      return res.status(403).json({
        success: false,
        message: "No patient record linked to this account",
      });
    }

    // Attach patient ID for easy access
    req.patientId = req.user.patientId;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/patient-portal/profile
 * Get the logged-in patient's own data
 */
router.get("/profile", authenticate, ensurePatientAccess, async (req, res) => {
  try {
    const patient = await Patient.findById(req.patientId).lean();

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient record not found",
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/patient-portal/profile
 * Update the logged-in patient's own data
 * Only allows updating specific fields (not medical history set by doctors)
 */
router.put("/profile", authenticate, ensurePatientAccess, async (req, res) => {
  try {
    // Fields that patients are allowed to update
    const allowedFields = [
      "firstName",
      "lastName",
      "dateOfBirth",
      "gender",
      "healthMetrics.weight",
      "healthMetrics.height",
      "healthMetrics.bloodPressure",
      "healthMetrics.heartRate",
      "healthMetrics.bloodGlucose",
      "lifestyle.smokingStatus",
      "lifestyle.alcoholConsumption",
      "lifestyle.exerciseFrequency",
      "lifestyle.dietType",
      "lifestyle.otherFactors",
      "primaryComplaint.description",
      "primaryComplaint.severity",
    ];

    // Build update object with only allowed fields
    const updateData = {};

    const setNestedValue = (obj, path, value) => {
      const keys = path.split(".");
      let current = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    };

    const getNestedValue = (obj, path) => {
      const keys = path.split(".");
      let current = obj;
      for (const key of keys) {
        if (current === undefined) return undefined;
        current = current[key];
      }
      return current;
    };

    for (const field of allowedFields) {
      const value = getNestedValue(req.body, field);
      if (value !== undefined) {
        setNestedValue(updateData, field, value);
      }
    }

    const patient = await Patient.findByIdAndUpdate(
      req.patientId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient record not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: patient,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/patient-portal/treatments
 * Get the logged-in patient's treatment plans
 */
router.get(
  "/treatments",
  authenticate,
  ensurePatientAccess,
  async (req, res) => {
    try {
      const treatments = await TreatmentPlan.find({ patientId: req.patientId })
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        data: treatments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/patient-portal/treatment/:id
 * Get a specific treatment plan (only if it belongs to the logged-in patient)
 */
router.get(
  "/treatment/:id",
  authenticate,
  ensurePatientAccess,
  async (req, res) => {
    try {
      const treatment = await TreatmentPlan.findOne({
        _id: req.params.id,
        patientId: req.patientId,
      }).lean();

      if (!treatment) {
        return res.status(404).json({
          success: false,
          message: "Treatment plan not found or access denied",
        });
      }

      res.json({
        success: true,
        data: treatment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

module.exports = router;


