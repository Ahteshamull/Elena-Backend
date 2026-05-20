import mongoose from "mongoose";
import dotenv from "dotenv";
import Addon from "../src/addon/schema/addon.modal.js";
import dbConnect from "../src/config/database/dbConfig.js";

dotenv.config();

const seedAddons = async () => {
  try {
    await dbConnect();

    // Clear existing addons
    await Addon.deleteMany({});

    const addons = [
      {
        name: "Professional Consultation Call",
        type: "Consultation",
        description: "1-on-1 business growth strategy and booking optimization call.",
        standardPrice: 149,
        foundingMemberPrice: 50,
        status: "active"
      },
      {
        name: "Google Review & QR Setup",
        type: "Review Setup",
        description: "Google review link setup, QR code generation, and messaging templates.",
        standardPrice: 199,
        status: "active"
      },
      {
        name: "Reputation Strategy & Audit",
        type: "Review Strategy",
        description: "Full review audit, response templates, and reputation growth planning.",
        standardPrice: 499,
        status: "active"
      }
    ];

    await Addon.insertMany(addons);

    console.log("Addons seeded successfully!");
    process.exit();
  } catch (error) {
    console.error("Error seeding addons:", error);
    process.exit(1);
  }
};

seedAddons();
