require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/clinical_assistant";

// Sample users data
const users = [
  {
    username: "admin",
    email: "admin@clinic.com",
    password: "admin123",
    firstName: "Admin",
    lastName: "User",
    role: "admin",
    specialization: "Administration",
    licenseNumber: "ADMIN-001",
  },
  {
    username: "dr.smith",
    email: "dr.smith@clinic.com",
    password: "doctor123",
    firstName: "John",
    lastName: "Smith",
    role: "doctor",
    specialization: "Internal Medicine",
    licenseNumber: "MD-12345",
  },
  {
    username: "dr.jones",
    email: "dr.jones@clinic.com",
    password: "doctor123",
    firstName: "Sarah",
    lastName: "Jones",
    role: "doctor",
    specialization: "Cardiology",
    licenseNumber: "MD-67890",
  },
];

async function seedUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing users
    await User.deleteMany({});
    console.log("Cleared existing users");

    // Create users
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${user.username} (${user.role})`);
    }

    console.log("\n✅ User seeding completed successfully!");
    console.log("\nDefault Login Credentials:");
    console.log("═══════════════════════════════════════");
    console.log("\n🔐 Admin Account:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("\n👨‍⚕️ Doctor Accounts:");
    console.log("   Username: dr.smith | Password: doctor123");
    console.log("   Username: dr.jones  | Password: doctor123");
    console.log("\n═══════════════════════════════════════\n");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
}

seedUsers();
