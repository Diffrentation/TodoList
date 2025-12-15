"use client";
import React, { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { FaRegEyeSlash, FaRegEye, FaCamera, FaUser } from "react-icons/fa";
import toast from "react-hot-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";

export default function Signup() {
  const [showPass, setShowPass] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    phone: "",
    address: {
      city: "",
      state: "",
      country: "India",
      pincode: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id.startsWith("address.")) {
      const addressField = id.split(".")[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [id]: value,
      });
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setSelectedFile(file);

    toast.success("Profile image selected");
  };

  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate all required fields including address
    if (
      !formData.firstname ||
      !formData.lastname ||
      !formData.email ||
      !formData.password ||
      !formData.phone ||
      !formData.address.city ||
      !formData.address.state ||
      !formData.address.pincode
    ) {
      toast.error("All fields including address are required");
      setLoading(false);
      return;
    }

    // Validate pincode format
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(formData.address.pincode)) {
      toast.error("Please enter a valid 6-digit pincode");
      setLoading(false);
      return;
    }

    try {
      // Create FormData object
      const submitFormData = new FormData();

      // Append all text fields
      submitFormData.append("firstname", formData.firstname);
      submitFormData.append("lastname", formData.lastname);
      submitFormData.append("email", formData.email);
      submitFormData.append("password", formData.password);
      submitFormData.append("phone", formData.phone);
      submitFormData.append("role", "buyer");

      // Append address fields
      submitFormData.append("address.city", formData.address.city);
      submitFormData.append("address.state", formData.address.state);
      submitFormData.append("address.country", formData.address.country);
      submitFormData.append("address.pincode", formData.address.pincode);

      // Append profile image if selected
      if (selectedFile) {
        submitFormData.append("profileImage", selectedFile);
      }

      // Use fetch directly for FormData to avoid axios Content-Type issues
      // Don't set Content-Type header - fetch will set it automatically with boundary
      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: submitFormData,
        credentials: "include", // Include cookies
        // Let fetch set Content-Type automatically for FormData
      });

      // Check if response is ok before parsing
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({
          message: `HTTP error! status: ${res.status}`,
        }));
        console.error("Registration error:", errorData);
        toast.error(errorData.message || `Registration failed (${res.status})`);
        return;
      }

      const data = await res.json();

      if (data.success) {
        toast.success("OTP sent to your email! Please Verify the OTP.");
        const userId = data.userId;
        router.push(`/auth/otp?type=register&userId=${userId}`);
      } else {
        toast.error(data.message || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      // Check if it's a network error or parsing error
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error(
          "Network error. Please check your connection and try again."
        );
      } else {
        toast.error(error.message || "Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => router.push("/auth/login");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "w-full max-w-3xl rounded-2xl border border-border bg-card shadow-xl shadow-primary/5",
          "p-6 sm:p-8 md:p-10"
        )}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Create Your Account
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Fill in your details to get started
          </p>
        </motion.div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Profile Image Upload */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="relative">
              <div
                className={cn(
                  "w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-dashed",
                  "border-border flex items-center justify-center cursor-pointer",
                  "hover:border-primary transition-colors bg-muted/50",
                  "hover:bg-muted"
                )}
                onClick={handleImageClick}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile preview"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <FaUser className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground mx-auto" />
                    <span className="text-xs text-muted-foreground mt-1 block">
                      Add Photo
                    </span>
                  </div>
                )}

                <div className="absolute bottom-0 right-0 bg-primary rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
                  <FaCamera className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </motion.div>

          {/* Personal Information */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
          >
            <LabelInputContainer>
              <Label htmlFor="firstname" className="text-foreground">First Name</Label>
              <Input
                id="firstname"
                value={formData.firstname}
                onChange={handleChange}
                placeholder="John"
                type="text"
                required
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </LabelInputContainer>

            <LabelInputContainer>
              <Label htmlFor="lastname" className="text-foreground">Last Name</Label>
              <Input
                id="lastname"
                value={formData.lastname}
                onChange={handleChange}
                placeholder="Doe"
                type="text"
                required
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </LabelInputContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
          >
            <LabelInputContainer>
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
                placeholder="you@example.com"
                required
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </LabelInputContainer>

            <LabelInputContainer className="relative">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                value={formData.password}
                onChange={handleChange}
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                required
                className="bg-background border-input text-foreground placeholder:text-muted-foreground pr-10"
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPass(!showPass)}
                aria-label="Toggle password visibility"
              >
                {showPass ? <FaRegEye className="h-5 w-5" /> : <FaRegEyeSlash className="h-5 w-5" />}
              </button>
            </LabelInputContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <LabelInputContainer>
              <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={handleChange}
                type="text"
                placeholder="Enter your phone number"
                required
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </LabelInputContainer>
          </motion.div>

          {/* Address Information */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pt-6 border-t border-border"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Address Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <LabelInputContainer>
                <Label htmlFor="address.city" className="text-foreground">City</Label>
                <Input
                  id="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  placeholder="Mumbai"
                  type="text"
                  required
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </LabelInputContainer>

              <LabelInputContainer>
                <Label htmlFor="address.state" className="text-foreground">State</Label>
                <Input
                  id="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  placeholder="Maharashtra"
                  type="text"
                  required
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </LabelInputContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4">
              <LabelInputContainer>
                <Label htmlFor="address.country" className="text-foreground">Country</Label>
                <Input
                  id="address.country"
                  value={formData.address.country}
                  onChange={handleChange}
                  placeholder="India"
                  type="text"
                  required
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </LabelInputContainer>

              <LabelInputContainer>
                <Label htmlFor="address.pincode" className="text-foreground">Pincode</Label>
                <Input
                  id="address.pincode"
                  value={formData.address.pincode}
                  onChange={handleChange}
                  placeholder="400001"
                  type="text"
                  maxLength={6}
                  required
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </LabelInputContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <button
              disabled={loading}
              className={cn(
                "group/btn relative w-full h-11 rounded-xl font-semibold text-primary-foreground",
                "bg-primary hover:bg-primary/90 transition-all duration-300",
                "shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center"
              )}
              type="submit"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating Account...
                </span>
              ) : (
                "Create Account →"
              )}
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-sm text-muted-foreground"
          >
            Already have an account?{" "}
            <button
              type="button"
              onClick={handleLogin}
              className="font-semibold text-primary hover:text-primary/80 underline transition-colors"
            >
              Log in
            </button>
          </motion.p>
        </form>
      </motion.div>
    </div>
  );
}

const LabelInputContainer = ({ children, className }) => (
  <div className={cn("flex w-full flex-col space-y-2", className)}>
    {children}
  </div>
);

