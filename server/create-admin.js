const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./src/models/User.js");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    console.log("MongoDB connected successfully");

    const email = "valabojusumanth4@gmail.com";
    const password = "Sumanth@2005";

    const existing = await User.findOne({ email });

    if (existing) {
      existing.role = "admin";
      existing.roleSelectionCompleted = true;
      existing.emailVerified = true;
      existing.emailVerifiedAt = existing.emailVerifiedAt || new Date();
      existing.isActive = true;

      await existing.save();

      console.log("\n=================================");
      console.log("Existing account promoted to admin");
      console.log("Email:", email);
      console.log("Password:", password);
      console.log("Role:", existing.role);
      console.log("=================================\n");
    } else {
      const admin = new User({
        name: "RBAC Admin",
        email,
        password,
        candidateType: "experienced",
        role: "admin",
        roleSelectionCompleted: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        isActive: true,
      });

      await admin.save();

      console.log("\n=================================");
      console.log("Admin account created successfully");
      console.log("Email:", email);
      console.log("Password:", password);
      console.log("Role:", admin.role);
      console.log("=================================\n");
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\nCREATE ADMIN ERROR:", error);
    process.exit(1);
  }
}

createAdmin();