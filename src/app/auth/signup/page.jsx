"use client";
import React, { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { FaRegEyeSlash, FaRegEye, FaCamera, FaUser } from "react-icons/fa";
import toast from "react-hot-toast";

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
    <div className="shadow-input mx-auto mt-20 sm:mt-24 md:mt-26 w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[70vw] xl:w-[55vw] 2xl:w-[50vw] max-w-5xl rounded-lg sm:rounded-xl md:rounded-2xl bg-white p-4 sm:p-6 md:p-8 lg:p-10 dark:bg-black">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-800 dark:text-neutral-200">
        Create Your Account
      </h2>

      <form className="mt-8" onSubmit={handleSubmit}>
        {/* Profile Image Upload */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="relative">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-800 dark:border-gray-600"
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
                  <FaUser className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto" />
                  <span className="text-[10px] sm:text-xs text-gray-500 mt-1 block">
                    Add Photo
                  </span>
                </div>
              )}

              <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1.5 sm:p-2 cursor-pointer hover:bg-blue-600 transition-colors">
                <FaCamera className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
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
        </div>

        {/* Personal Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-6">
          <LabelInputContainer>
            <Label htmlFor="firstname">First Name</Label>
            <Input
              id="firstname"
              value={formData.firstname}
              onChange={handleChange}
              placeholder="John"
              type="text"
              required
            />
          </LabelInputContainer>

          <LabelInputContainer>
            <Label htmlFor="lastname">Last Name</Label>
            <Input
              id="lastname"
              value={formData.lastname}
              onChange={handleChange}
              placeholder="Doe"
              type="text"
              required
            />
          </LabelInputContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-6 mt-4">
          <LabelInputContainer>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              placeholder="you@example.com"
              required
            />
          </LabelInputContainer>

          <LabelInputContainer className="relative">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              value={formData.password}
              onChange={handleChange}
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              className="absolute top-1/2 right-4 cursor-pointer transform -translate-y-1/2"
              onClick={() => setShowPass(!showPass)}
            >
              {showPass ? <FaRegEye /> : <FaRegEyeSlash />}
            </button>
          </LabelInputContainer>
        </div>

        <LabelInputContainer className="mt-4">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={handleChange}
            type="text"
            placeholder="Enter your phone number"
            required
          />
        </LabelInputContainer>

        {/* Address Information */}
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-3 sm:mb-4">
            Address Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-6">
            <LabelInputContainer>
              <Label htmlFor="address.city">City</Label>
              <Input
                id="address.city"
                value={formData.address.city}
                onChange={handleChange}
                placeholder="Mumbai"
                type="text"
                required
              />
            </LabelInputContainer>

            <LabelInputContainer>
              <Label htmlFor="address.state">State</Label>
              <Input
                id="address.state"
                value={formData.address.state}
                onChange={handleChange}
                placeholder="Maharashtra"
                type="text"
                required
              />
            </LabelInputContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-6 mt-4">
            <LabelInputContainer>
              <Label htmlFor="address.country">Country</Label>
              <Input
                id="address.country"
                value={formData.address.country}
                onChange={handleChange}
                placeholder="India"
                type="text"
                required
              />
            </LabelInputContainer>

            <LabelInputContainer>
              <Label htmlFor="address.pincode">Pincode</Label>
              <Input
                id="address.pincode"
                value={formData.address.pincode}
                onChange={handleChange}
                placeholder="400001"
                type="text"
                maxLength={6}
                required
              />
            </LabelInputContainer>
          </div>
        </div>

        <button
          disabled={loading}
          className="group/btn mt-8 relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-700 font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
        >
          {loading ? "Creating Account..." : "Create Account →"}
        </button>

        <p className="text-center mt-6 text-sm text-neutral-600 dark:text-neutral-400">
          Already have an account?
          <span
            className="underline cursor-pointer text-blue-600 ml-1"
            onClick={handleLogin}
          >
            Log in
          </span>
        </p>
      </form>
    </div>
  );
}

const LabelInputContainer = ({ children, className }) => (
  <div className={cn("flex w-full flex-col space-y-2", className)}>
    {children}
  </div>
);

