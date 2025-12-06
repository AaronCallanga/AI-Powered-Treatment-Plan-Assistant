const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const User = require("../models/User");
const { generatePatientCredentials } = require("../services/credentialService");

// GET all patients (with pagination and field selection)
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      fields,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Cap at 100
    const skip = (pageNum - 1) * limitNum;

    // Build query filter
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { "primaryComplaint.condition": { $regex: search, $options: "i" } },
      ];
    }

    // Build field projection
    let projection = null;
    if (fields) {
      projection = fields.split(",").reduce((acc, field) => {
        acc[field.trim()] = 1;
        return acc;
      }, {});
    }

    // Build sort
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Execute query with pagination
    const [patients, total] = await Promise.all([
      Patient.find(filter, projection)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(), // Use lean() for read-only performance
      Patient.countDocuments(filter),
    ]);

    res.json({
      data: patients,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + patients.length < total,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single patient by ID
router.get("/:id", async (req, res) => {
  try {
    const { fields } = req.query;

    // Build field projection
    let projection = null;
    if (fields) {
      projection = fields.split(",").reduce((acc, field) => {
        acc[field.trim()] = 1;
        return acc;
      }, {});
    }

    const patient = await Patient.findById(req.params.id, projection).lean();
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new patient (intake) with auto-generated login credentials
router.post("/", async (req, res) => {
  try {
    // Generate login credentials for the patient
    const credentials = generatePatientCredentials(req.body);

    // Create the patient record first
    const patient = new Patient(req.body);
    const newPatient = await patient.save();

    // Create a User account linked to this patient
    const user = new User({
      username: credentials.username,
      email: credentials.email,
      password: credentials.password, // Will be hashed by User model pre-save hook
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      role: "patient",
      patientId: newPatient._id,
    });

    await user.save();

    // Update patient with the user ID
    newPatient.userId = user._id;
    await newPatient.save();

    // Return patient data along with login credentials (password in plain text for initial display)
    res.status(201).json({
      patient: newPatient,
      credentials: {
        email: credentials.email,
        username: credentials.username,
        password: credentials.password, // Plain text password for user to note down
        message:
          "Please save these credentials. The patient can use the email or username to log in.",
      },
    });
  } catch (error) {
    console.error("Error creating patient:", error);
    res.status(400).json({ message: error.message });
  }
});

// PUT update patient
router.put("/:id", async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.json(patient);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE patient
router.delete("/:id", async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.json({ message: "Patient deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
