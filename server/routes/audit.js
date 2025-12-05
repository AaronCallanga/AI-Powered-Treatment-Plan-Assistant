const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLog");

// GET - Get all audit logs (paginated)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by action type
    if (req.query.action) {
      query.action = req.query.action;
    }

    // Filter by patient
    if (req.query.patientId) {
      query.patientId = req.query.patientId;
    }

    // Filter by treatment plan
    if (req.query.treatmentPlanId) {
      query.treatmentPlanId = req.query.treatmentPlanId;
    }

    // Filter by performer
    if (req.query.performedBy) {
      query["performedBy.userName"] = new RegExp(req.query.performedBy, "i");
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Filter by risk level
    if (req.query.riskLevel) {
      query["safety.riskLevel"] = req.query.riskLevel;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("patientId", "firstName lastName")
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET - Get audit trail for a specific patient
router.get("/patient/:patientId", async (req, res) => {
  try {
    const logs = await AuditLog.getPatientAuditTrail(req.params.patientId, {
      limit: parseInt(req.query.limit) || 100,
      startDate: req.query.startDate ? new Date(req.query.startDate) : null,
      endDate: req.query.endDate ? new Date(req.query.endDate) : null,
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET - Get audit trail for a specific treatment plan
router.get("/treatment/:treatmentPlanId", async (req, res) => {
  try {
    const logs = await AuditLog.getTreatmentAuditTrail(
      req.params.treatmentPlanId
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET - Get physician activity report
router.get("/physician/:userName", async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default last 30 days
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();

    const report = await AuditLog.getPhysicianActivity(
      req.params.userName,
      startDate,
      endDate
    );

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET - Get critical safety events
router.get("/safety/critical", async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default last 7 days
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();

    const events = await AuditLog.getCriticalSafetyEvents(startDate, endDate);

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET - Get compliance summary
router.get("/compliance/summary", async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();

    const [
      totalActions,
      treatmentsGenerated,
      treatmentsApproved,
      treatmentsRejected,
      treatmentsModified,
      overridesApplied,
      criticalEvents,
    ] = await Promise.all([
      AuditLog.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      AuditLog.countDocuments({
        action: "TREATMENT_GENERATED",
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      AuditLog.countDocuments({
        action: "TREATMENT_APPROVED",
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      AuditLog.countDocuments({
        action: "TREATMENT_REJECTED",
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      AuditLog.countDocuments({
        action: "TREATMENT_MODIFIED",
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      AuditLog.countDocuments({
        action: "OVERRIDE_APPLIED",
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      AuditLog.countDocuments({
        "safety.riskLevel": "critical",
        createdAt: { $gte: startDate, $lte: endDate },
      }),
    ]);

    // Get unique physicians
    const physicians = await AuditLog.distinct("performedBy.userName", {
      createdAt: { $gte: startDate, $lte: endDate },
      "performedBy.role": "physician",
    });

    res.json({
      period: { startDate, endDate },
      summary: {
        totalActions,
        treatmentsGenerated,
        treatmentsApproved,
        treatmentsRejected,
        treatmentsModified,
        overridesApplied,
        criticalEvents,
        uniquePhysicians: physicians.length,
        approvalRate:
          treatmentsGenerated > 0
            ? ((treatmentsApproved / treatmentsGenerated) * 100).toFixed(1)
            : 0,
        modificationRate:
          treatmentsGenerated > 0
            ? ((treatmentsModified / treatmentsGenerated) * 100).toFixed(1)
            : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST - Create manual audit log entry (for system events)
router.post("/", async (req, res) => {
  try {
    const log = await AuditLog.log(req.body);
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
