require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const patientRoutes = require("./routes/patients");
const treatmentRoutes = require("./routes/treatments");
const auditRoutes = require("./routes/audit");
const chatRoutes = require("./routes/chat");
const { initializeDatabase } = require("./services/drugInteractionDB");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/clinical_assistant";

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Initialize drug interaction database (PostgreSQL or fallback)
initializeDatabase().catch((err) => {
  console.log("Drug interaction DB initialization:", err.message);
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Clinical Assistant API is running!" });
});

app.use("/api/patients", patientRoutes);
app.use("/api/treatments", treatmentRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/chat", chatRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
