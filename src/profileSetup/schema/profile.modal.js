import mongoose from "mongoose";
const { Schema } = mongoose;

const menuItemSchema = new Schema({
  title: { type: String, required: true },
  courses: { type: Number, required: true },
});

const profileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    isProfileCompleted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String },

    // Section 01: Personal Information
    image: { type: String }, // Profile Portrait URL
    fullName: { type: String },
    displayName: { type: String },
    email: { type: String },
    phone: { type: String },
    city: { type: String },
    country: { type: String },
    languages: { type: [String], default: [] },

    // Section 02: Professional Information
    yearsOfExperience: { type: String },
    currentPosition: { type: String },
    cuisineSpecialties: { type: [String], default: [] },
    chefCategory: { type: [String], default: [] }, // yacht, villa, event, personal
    aboutMe: { type: String },

    // Section 03: Menu & Pricing
    startingPricePerPerson: { type: Number },
    guestPricingTiers: [{
      minGuests: { type: Number },
      maxGuests: { type: Number }, // Optional. If not provided, it implies up to infinity (e.g. 40+)
      pricePerPerson: { type: Number },
      isCustomQuote: { type: Boolean, default: false }
    }],
    sampleMenuTitle: { type: String },
    minimumBookingAmount: { type: Number },
    menuDescription: { type: String },
    menuBuilder: { type: [menuItemSchema], default: [] },

    // Section 04: Visual Portfolio
    dishPhotography: { type: [String], default: [] },
    eventHighlights: { type: [String], default: [] },
    instagramProfile: { type: String },
    portfolioWebsite: { type: String },

    // Section 05: Identity & Verification
    cv: { type: String },
    governmentId: { type: String },
    foodSafetyCertificate: { type: String },

    // Section 06: Service Availability
    instantBooking: { type: Boolean, default: false },
    alwaysAvailable: { type: Boolean, default: false },
    availableDates: { type: [Date], default: [] },
    serviceWindows: { type: [String], default: [] }, // e.g. Dinner, Brunch, Lunch
    travelRadius: { type: Number }, // in miles
    travelRadiusLocation: { type: String }, // e.g. LOS ANGELES, CA

    // Section 07: Platform Terms & Escrow
    agreedToTerms: { type: Boolean, default: false },
    fullLegalName: { type: String },
    digitalSignature: { type: String },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.Profile ||
  mongoose.model("Profile", profileSchema);
