const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema({
  drugName: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  startDate: { type: Date },
});

const patientSchema = new mongoose.Schema(
  {
    // Basic Info
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "other"] },

    // Medical History
    medicalHistory: {
      conditions: [{ type: String }], // e.g., ["diabetes", "hypertension"]
      allergies: [{ type: String }], // e.g., ["penicillin", "shellfish"]
      surgeries: [{ type: String }],
      familyHistory: [{ type: String }],
    },

    // Current Medications
    currentMedications: [medicationSchema],

    // Health Metrics
    healthMetrics: {
      age: { type: Number },
      weight: { type: Number }, // in kg
      height: { type: Number }, // in cm
      bmi: { type: Number },
      bloodPressure: {
        systolic: { type: Number },
        diastolic: { type: Number },
      },
      heartRate: { type: Number },
      bloodGlucose: { type: Number },
    },

    // Lifestyle Factors
    lifestyle: {
      smokingStatus: {
        type: String,
        enum: ["never", "former", "current"],
        default: "never",
      },
      alcoholConsumption: {
        type: String,
        enum: ["none", "occasional", "moderate", "heavy"],
        default: "none",
      },
      exerciseFrequency: {
        type: String,
        enum: ["sedentary", "light", "moderate", "active", "very_active"],
        default: "sedentary",
      },
      dietType: { type: String },
      otherFactors: { type: String }, // Free-form field for additional lifestyle info
    },

    // Primary Complaint
    primaryComplaint: {
      condition: {
        type: String,
        enum: [
          "erectile_dysfunction",
          "hair_loss",
          "weight_loss",
          "anxiety",
          "insomnia",
          "other",
        ],
      },
      description: { type: String },
      duration: { type: String },
      severity: {
        type: String,
        enum: ["mild", "moderate", "severe"],
      },
    },

    // Intake metadata
    intakeDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "reviewed", "treatment_planned"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Calculate BMI before saving
patientSchema.pre("save", async function () {
  if (
    this.healthMetrics &&
    this.healthMetrics.weight &&
    this.healthMetrics.height
  ) {
    const heightInMeters = this.healthMetrics.height / 100;
    this.healthMetrics.bmi = parseFloat(
      (this.healthMetrics.weight / (heightInMeters * heightInMeters)).toFixed(1)
    );
  }
});

module.exports = mongoose.model("Patient", patientSchema);
