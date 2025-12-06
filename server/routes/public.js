const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const TreatmentPlan = require("../models/TreatmentPlan");
const Patient = require("../models/Patient");

/**
 * Optional authentication middleware
 * Doesn't require auth, but extracts user info if token is present
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );
      req.user = decoded;
    } catch (err) {
      // Invalid token - continue as unauthenticated
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};

/**
 * GET /api/public/treatment/:id
 * Get treatment plan by ID (public access for QR codes)
 * - Unauthenticated: Returns basic sanitized info
 * - Authenticated doctors/admins: Returns full treatment details
 */
router.get("/treatment/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const treatment = await TreatmentPlan.findById(id).populate("patientId");

    if (!treatment) {
      return res.status(404).json({
        success: false,
        message: "Treatment plan not found",
      });
    }

    // Check if user is authenticated and has appropriate role
    const isAuthorizedProvider =
      req.user && (req.user.role === "doctor" || req.user.role === "admin");

    if (isAuthorizedProvider) {
      // Return full treatment details for authorized healthcare providers
      const fullData = {
        _id: treatment._id,
        patient: {
          id: treatment.patientId?._id,
          name: treatment.patientId
            ? `${treatment.patientId.firstName} ${treatment.patientId.lastName}`
            : "Unknown Patient",
          condition: treatment.patientId?.primaryComplaint?.condition,
          dateOfBirth: treatment.patientId?.dateOfBirth,
          gender: treatment.patientId?.gender,
        },
        status: treatment.status,
        workflowStep: treatment.workflowStep,
        createdAt: treatment.createdAt,
        reviewedAt: treatment.reviewedAt,
        reviewedBy: treatment.reviewedBy,
        reviewNotes: treatment.reviewNotes,

        // Full treatment data
        currentPlan: {
          treatment: treatment.treatment,
          safetyAssessment: treatment.safetyAssessment,
          drugInteractions: treatment.drugInteractions,
          contraindications: treatment.contraindications,
          alternatives: treatment.alternatives,
          rationale: treatment.rationale,
        },

        // Validation info
        validation: treatment.validation,

        // Modification history
        modifications: treatment.modifications,
        postApprovalModifications: treatment.postApprovalModifications || 0,
        regenerationCount: treatment.regenerationCount || 0,
      };

      res.json({
        success: true,
        data: fullData,
        requiresAuth: false,
        fullAccess: true,
      });
    } else {
      // Return sanitized data for unauthenticated users or non-providers
      const publicData = {
        _id: treatment._id,
        patientName: treatment.patientId
          ? `${treatment.patientId.firstName} ${treatment.patientId.lastName}`
          : "Unknown Patient",
        status: treatment.status,
        generatedAt: treatment.createdAt,
        reviewedAt: treatment.reviewedAt,
        reviewedBy: treatment.reviewedBy,
        // Only show that a treatment exists, not the details
        message:
          "Log in as a healthcare provider to view full treatment details",
      };

      res.json({
        success: true,
        data: publicData,
        requiresAuth: true,
        fullAccess: false,
      });
    }
  } catch (error) {
    console.error("Error fetching public treatment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch treatment plan",
    });
  }
});

/**
 * GET /api/public/verify/:id
 * Verify that a treatment plan exists (for QR code validation)
 * Returns minimal info without any sensitive data
 */
router.get("/verify/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const treatment = await TreatmentPlan.findById(id, {
      _id: 1,
      status: 1,
      createdAt: 1,
    });

    if (!treatment) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: "Treatment plan not found",
      });
    }

    res.json({
      success: true,
      valid: true,
      id: treatment._id,
      status: treatment.status,
      createdAt: treatment.createdAt,
    });
  } catch (error) {
    console.error("Error verifying treatment:", error);
    res.status(500).json({
      success: false,
      valid: false,
      message: "Failed to verify treatment plan",
    });
  }
});

module.exports = router;
