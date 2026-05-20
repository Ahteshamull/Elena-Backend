import mongoose from "mongoose";
import dotenv from "dotenv";
import Subscription from "../src/subscription/schema/subscription.modal.js";
import dbConnect from "../src/config/database/dbConfig.js";

dotenv.config();

const seedSubscriptions = async () => {
  try {
    await dbConnect();

    // Clear existing subscriptions
    await Subscription.deleteMany({});

    const subscriptions = [
      {
        planName: "Bronze",
        billingCycle: "monthly",
        price: 0,
        trialDays: 14,
        maxServices: 3,
        maxBookings: 5,
        features: [
          "Trial Access to Gold-Level Experience",
          "Provider Profile",
          "Booking Features",
          "Customer Features",
          "Dashboard Access (Preview)",
          "Marketing Access (Limited)"
        ],
        status: "active"
      },
      {
        planName: "Silver",
        billingCycle: "monthly",
        price: 25,
        maxServices: -1,
        maxBookings: -1,
        features: [
          "Unlimited bookings",
          "Calendar syncing",
          "Automated reminders",
          "Multiple portfolio uploads",
          "Social media integrations",
          "Review collection",
          "Messaging access",
          "Basic analytics dashboard",
          "Limited CRM templates"
        ],
        status: "active"
      },
      {
        planName: "Gold",
        billingCycle: "monthly",
        price: 40,
        maxServices: -1,
        maxBookings: -1,
        features: [
          "Everything in Silver PLUS:",
          "Priority search placement",
          "Recommended Provider badge",
          "Expanded CRM/dashboard templates",
          "Advanced automation tools",
          "Revenue tracking",
          "Repeat client tracking",
          "Marketing guidance resources"
        ],
        status: "active"
      },
      {
        planName: "Platinum",
        billingCycle: "monthly",
        price: 65,
        maxServices: -1,
        maxBookings: -1,
        features: [
          "Everything in Gold PLUS:",
          "Unlimited services listed",
          "Full analytics dashboard",
          "Campaign assistance",
          "Basic consulting support included",
          "Priority support",
          "Early feature testing"
        ],
        status: "active"
      },
      {
        planName: "Founding Member",
        billingCycle: "monthly",
        price: 350, // Upfront fee
        recurringPrice: 15, // Ongoing fee
        maxServices: -1,
        maxBookings: -1,
        features: [
          "Platinum-Level Access",
          "Locked lifetime pricing ($15/month)",
          "Founding Member badge",
          "Early feature access",
          "VIP community access"
        ],
        status: "active"
      }
    ];

    // Also add yearly options with 10% discount
    const yearlySubscriptions = subscriptions
      .filter(s => s.price > 0 && s.planName !== "Founding Member")
      .map(s => ({
        ...s,
        billingCycle: "yearly",
        price: s.price * 12 * 0.9,
        discountPercentage: 10
      }));

    await Subscription.insertMany([...subscriptions, ...yearlySubscriptions]);

    console.log("Subscriptions seeded successfully!");
    process.exit();
  } catch (error) {
    console.error("Error seeding subscriptions:", error);
    process.exit(1);
  }
};

seedSubscriptions();
