require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const publicRoutes = require("./routes/public");
const patientRoutes = require("./routes/patients");
const treatmentRoutes = require("./routes/treatments");
const auditRoutes = require("./routes/audit");
const chatRoutes = require("./routes/chat");
const consultationRoutes = require("./routes/consultation");
const documentRoutes = require("./routes/documents");
const { authenticate } = require("./middleware/auth");
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
const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["set-cookie"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Clinical Assistant API is running!" });
});

// Public routes
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);

// Protected routes - require authentication
app.use("/api/patients", authenticate, patientRoutes);
app.use("/api/treatments", authenticate, treatmentRoutes);
app.use("/api/audit", authenticate, auditRoutes);
app.use("/api/chat", authenticate, chatRoutes);
app.use("/api/consultation", authenticate, consultationRoutes);
app.use("/api/documents", authenticate, documentRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
