import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
      enum: ['registration', 'login', 'forgot'],
      default: 'registration',
    },
  },
  {
    timestamps: true,
  }
);

// Hash OTP before saving
otpSchema.pre('save', async function (next) {
  if (!this.isModified('hashedOTP')) return next();
  this.hashedOTP = await bcrypt.hash(this.hashedOTP, 10);
  next();
});

// Method to verify OTP
otpSchema.methods.verifyOTP = async function (otp) {
  return await bcrypt.compare(otp, this.hashedOTP);
};

// Static method to generate OTP
otpSchema.statics.generateOTP = function () {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const OTP = mongoose.models.OTP || mongoose.model('OTP', otpSchema);

export default OTP;

