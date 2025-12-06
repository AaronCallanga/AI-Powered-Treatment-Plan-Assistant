const mongoose = require("mongoose");
const Patient = require("./models/Patient");
require("@dotenvx/dotenvx").config({ quiet: true });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/clinical_assistant";

const samplePatients = [
  {
    firstName: "John",
    lastName: "Smith",
    dateOfBirth: new Date("1975-03-15"),
    gender: "male",
    medicalHistory: {
      conditions: ["type_2_diabetes", "hypertension", "hyperlipidemia"],
      allergies: ["penicillin"],
      surgeries: ["appendectomy_2010"],
      familyHistory: ["heart_disease", "diabetes"],
    },
    currentMedications: [
      { drugName: "Metformin", dosage: "500mg", frequency: "twice daily" },
      { drugName: "Lisinopril", dosage: "10mg", frequency: "once daily" },
      {
        drugName: "Atorvastatin",
        dosage: "20mg",
        frequency: "once daily at bedtime",
      },
    ],
    healthMetrics: {
      age: 49,
      weight: 95,
      height: 178,
      bloodPressure: { systolic: 145, diastolic: 92 },
      heartRate: 78,
      bloodGlucose: 140,
    },
    lifestyle: {
      smokingStatus: "former",
      alcoholConsumption: "moderate",
      exerciseFrequency: "light",
      dietType: "Western diet",
    },
    primaryComplaint: {
      condition: "erectile_dysfunction",
      description:
        "Difficulty achieving and maintaining erection for the past 6 months",
      duration: "6 months",
      severity: "moderate",
    },
    status: "pending",
  },
  {
    firstName: "Sarah",
    lastName: "Johnson",
    dateOfBirth: new Date("1988-07-22"),
    gender: "female",
    medicalHistory: {
      conditions: ["pcos", "anxiety"],
      allergies: ["sulfa drugs", "latex"],
      surgeries: [],
      familyHistory: ["thyroid_disease", "breast_cancer"],
    },
    currentMedications: [
      { drugName: "Sertraline", dosage: "50mg", frequency: "once daily" },
      {
        drugName: "Birth Control",
        dosage: "standard",
        frequency: "once daily",
      },
    ],
    healthMetrics: {
      age: 36,
      weight: 82,
      height: 165,
      bloodPressure: { systolic: 118, diastolic: 76 },
      heartRate: 72,
      bloodGlucose: 95,
    },
    lifestyle: {
      smokingStatus: "never",
      alcoholConsumption: "occasional",
      exerciseFrequency: "moderate",
      dietType: "Vegetarian",
    },
    primaryComplaint: {
      condition: "weight_loss",
      description:
        "Struggling with weight loss despite diet and exercise, suspect PCOS-related",
      duration: "2 years",
      severity: "moderate",
    },
    status: "pending",
  },
  {
    firstName: "Michael",
    lastName: "Chen",
    dateOfBirth: new Date("1992-11-08"),
    gender: "male",
    medicalHistory: {
      conditions: ["alopecia"],
      allergies: [],
      surgeries: [],
      familyHistory: ["male_pattern_baldness"],
    },
    currentMedications: [],
    healthMetrics: {
      age: 32,
      weight: 75,
      height: 175,
      bloodPressure: { systolic: 120, diastolic: 80 },
      heartRate: 68,
      bloodGlucose: 90,
    },
    lifestyle: {
      smokingStatus: "never",
      alcoholConsumption: "occasional",
      exerciseFrequency: "active",
      dietType: "Balanced",
    },
    primaryComplaint: {
      condition: "hair_loss",
      description: "Noticeable hair thinning at crown and receding hairline",
      duration: "1 year",
      severity: "mild",
    },
    status: "pending",
  },
  {
    firstName: "Robert",
    lastName: "Williams",
    dateOfBirth: new Date("1960-02-28"),
    gender: "male",
    medicalHistory: {
      conditions: [
        "coronary_artery_disease",
        "hypertension",
        "type_2_diabetes",
        "gout",
      ],
      allergies: ["aspirin", "ibuprofen"],
      surgeries: ["coronary_stent_2020", "knee_replacement_2018"],
      familyHistory: ["heart_disease", "stroke", "diabetes"],
    },
    currentMedications: [
      { drugName: "Clopidogrel", dosage: "75mg", frequency: "once daily" },
      { drugName: "Metoprolol", dosage: "50mg", frequency: "twice daily" },
      { drugName: "Lisinopril", dosage: "20mg", frequency: "once daily" },
      { drugName: "Metformin", dosage: "1000mg", frequency: "twice daily" },
      { drugName: "Allopurinol", dosage: "300mg", frequency: "once daily" },
      { drugName: "Nitroglycerin", dosage: "0.4mg", frequency: "as needed" },
    ],
    healthMetrics: {
      age: 64,
      weight: 102,
      height: 180,
      bloodPressure: { systolic: 155, diastolic: 95 },
      heartRate: 82,
      bloodGlucose: 165,
    },
    lifestyle: {
      smokingStatus: "former",
      alcoholConsumption: "none",
      exerciseFrequency: "light",
      dietType: "Low-sodium cardiac diet",
    },
    primaryComplaint: {
      condition: "erectile_dysfunction",
      description:
        "Complete inability to achieve erection, concerned about medication interactions",
      duration: "1 year",
      severity: "severe",
    },
    status: "pending",
  },
  {
    firstName: "Emily",
    lastName: "Davis",
    dateOfBirth: new Date("1995-05-10"),
    gender: "female",
    medicalHistory: {
      conditions: ["generalized_anxiety_disorder", "insomnia"],
      allergies: ["shellfish"],
      surgeries: [],
      familyHistory: ["depression", "anxiety"],
    },
    currentMedications: [
      { drugName: "Escitalopram", dosage: "10mg", frequency: "once daily" },
    ],
    healthMetrics: {
      age: 29,
      weight: 58,
      height: 162,
      bloodPressure: { systolic: 110, diastolic: 70 },
      heartRate: 75,
      bloodGlucose: 88,
    },
    lifestyle: {
      smokingStatus: "never",
      alcoholConsumption: "occasional",
      exerciseFrequency: "moderate",
      dietType: "Mediterranean",
    },
    primaryComplaint: {
      condition: "insomnia",
      description:
        "Difficulty falling asleep and staying asleep, affecting work performance",
      duration: "8 months",
      severity: "moderate",
    },
    status: "pending",
  },
];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing patients
    await Patient.deleteMany({});
    console.log("Cleared existing patients");

    // Insert sample patients
    const inserted = await Patient.insertMany(samplePatients);
    console.log(`Inserted ${inserted.length} sample patients`);

    console.log("\nSample patients created:");
    inserted.forEach((p) => {
      console.log(
        `  - ${p.firstName} ${p.lastName} (${p.primaryComplaint.condition})`
      );
    });

    await mongoose.connection.close();
    console.log("\nDatabase seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
