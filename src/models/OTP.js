import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    hashedOTP: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired OTPs
    },
    attempts: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: ["registration", "login", "forgot"],
      default: "registration",
    },
  },
  {
    timestamps: true,
  }
);

// Hash OTP before saving
otpSchema.pre("save", async function (next) {
  // Only hash if hashedOTP is modified and is not already a hash (starts with $2a$ or $2b$)
  if (!this.isModified("hashedOTP")) return next();

  // Check if already hashed (bcrypt hashes start with $2a$ or $2b$)
  if (
    this.hashedOTP &&
    (this.hashedOTP.startsWith("$2a$") || this.hashedOTP.startsWith("$2b$"))
  ) {
    return next();
  }

  // Hash the plain text OTP
  this.hashedOTP = await bcrypt.hash(String(this.hashedOTP), 10);
  next();
});

// Method to verify OTP
otpSchema.methods.verifyOTP = async function (otp) {
  if (!otp || !this.hashedOTP) {
    console.error("[OTP VERIFY] Missing OTP or hashedOTP");
    return false;
  }

  // Ensure OTP is a string
  const otpString = String(otp).trim();

  try {
    const isValid = await bcrypt.compare(otpString, this.hashedOTP);
    console.log("[OTP VERIFY] Comparing:", {
      received: otpString,
      hashedLength: this.hashedOTP?.length,
      isValid,
    });
    return isValid;
  } catch (error) {
    console.error("[OTP VERIFY] Error comparing OTP:", error);
    return false;
  }
};

// Static method to generate OTP
otpSchema.statics.generateOTP = function () {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const OTP = mongoose.models.OTP || mongoose.model("OTP", otpSchema);

export default OTP;
