"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  User,
  Save,
  Loader2,
  Camera,
  Trash2,
  X,
} from "lucide-react";
import {
  getUserFromLocalStorage,
  saveUserToLocalStorage,
} from "@/utils/localStorage";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [user, setUser] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    phone: "",
    address: {
      city: "",
      state: "",
      country: "India",
      pincode: "",
    },
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/auth/profile");
      if (response.data.success) {
        const userData = response.data.user;
        setUser(userData);
        setFormData({
          firstname: userData.firstname || "",
          lastname: userData.lastname || "",
          phone: userData.phone || "",
          address: {
            city: userData.address?.city || "",
            state: userData.address?.state || "",
            country: userData.address?.country || "India",
            pincode: userData.address?.pincode || "",
          },
        });
        // Set image preview if profile image exists
        if (userData.profileImage) {
          setImagePreview(userData.profileImage);
        } else {
          setImagePreview("");
        }
        setSelectedFile(null);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error(error.response?.data?.message || "Failed to load profile");
      if (error.response?.status === 401) {
        router.push("/auth/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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

  const handleDeleteImage = async () => {
    if (!user?.profileImage && !imagePreview) {
      return;
    }

    try {
      setUploadingImage(true);
      const response = await api.put("/auth/profile", {
        deleteProfileImage: true,
      });

      if (response.data.success) {
        toast.success("Profile image deleted successfully");
        setImagePreview("");
        setSelectedFile(null);
        setUser((prev) => ({ ...prev, profileImage: "" }));

        // Update localStorage
        const storedUser = getUserFromLocalStorage();
        if (storedUser) {
          saveUserToLocalStorage(
            {
              ...storedUser,
              profileImage: "",
            },
            true
          );
          window.dispatchEvent(new Event("userUpdated"));
        }
      }
    } catch (error) {
      console.error("Failed to delete profile image:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete profile image"
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.firstname.trim()) {
      return toast.error("First name is required");
    }
    if (!formData.lastname.trim()) {
      return toast.error("Last name is required");
    }
    if (!formData.phone.trim()) {
      return toast.error("Phone number is required");
    }
    if (!/^[0-9]{10}$/.test(formData.phone)) {
      return toast.error("Phone number must be 10 digits");
    }
    if (!formData.address.city.trim()) {
      return toast.error("City is required");
    }
    if (!formData.address.state.trim()) {
      return toast.error("State is required");
    }
    if (!formData.address.pincode.trim()) {
      return toast.error("Pincode is required");
    }
    if (!/^[0-9]{6}$/.test(formData.address.pincode)) {
      return toast.error("Pincode must be 6 digits");
    }

    try {
      setSaving(true);

      // If there's a new image selected, upload it with FormData
      if (selectedFile) {
        const formDataToSend = new FormData();
        formDataToSend.append("firstname", formData.firstname.trim());
        formDataToSend.append("lastname", formData.lastname.trim());
        formDataToSend.append("phone", formData.phone.trim());
        formDataToSend.append("address.city", formData.address.city.trim());
        formDataToSend.append("address.state", formData.address.state.trim());
        formDataToSend.append(
          "address.country",
          formData.address.country.trim() || "India"
        );
        formDataToSend.append(
          "address.pincode",
          formData.address.pincode.trim()
        );
        formDataToSend.append("profileImage", selectedFile);

        const response = await api.put("/auth/profile", formDataToSend, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data.success) {
          toast.success("Profile updated successfully!");
          const updatedUser = response.data.user;
          setUser(updatedUser);
          setSelectedFile(null);
          setImagePreview(updatedUser.profileImage || "");

          // Update localStorage
          const storedUser = getUserFromLocalStorage();
          if (storedUser) {
            saveUserToLocalStorage(
              {
                ...storedUser,
                firstname: updatedUser.firstname,
                lastname: updatedUser.lastname,
                phone: updatedUser.phone,
                address: updatedUser.address,
                profileImage: updatedUser.profileImage,
              },
              true
            );
            window.dispatchEvent(new Event("userUpdated"));
          }
        }
      } else {
        // No new image, just update other fields
        const response = await api.put("/auth/profile", {
          firstname: formData.firstname.trim(),
          lastname: formData.lastname.trim(),
          phone: formData.phone.trim(),
          address: {
            city: formData.address.city.trim(),
            state: formData.address.state.trim(),
            country: formData.address.country.trim() || "India",
            pincode: formData.address.pincode.trim(),
          },
        });

        if (response.data.success) {
          toast.success("Profile updated successfully!");
          const updatedUser = response.data.user;
          setUser(updatedUser);

          // Update localStorage
          const storedUser = getUserFromLocalStorage();
          if (storedUser) {
            saveUserToLocalStorage(
              {
                ...storedUser,
                firstname: updatedUser.firstname,
                lastname: updatedUser.lastname,
                phone: updatedUser.phone,
                address: updatedUser.address,
              },
              true
            );
            window.dispatchEvent(new Event("userUpdated"));
          }
        }
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background transition-colors duration-300">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50"
        >
          <div className="max-w-4xl mx-auto px-6 py-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.back()}
                  className="h-10 w-10 rounded-xl"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                    Edit Profile
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Update your personal information
                  </p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-6 py-8">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground text-sm">
                Loading profile...
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-border shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      {imagePreview ? (
                        <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-primary shadow-lg shadow-primary/20 relative">
                          <img
                            src={imagePreview}
                            alt={`${user?.firstname} ${user?.lastname}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={handleImageClick}
                              className="p-2 bg-primary/80 hover:bg-primary rounded-full text-white transition-colors"
                              title="Change Image"
                            >
                              <Camera className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteImage}
                              disabled={uploadingImage}
                              className="p-2 bg-destructive/80 hover:bg-destructive rounded-full text-white transition-colors disabled:opacity-50"
                              title="Delete Image"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20 relative group">
                          <User className="h-10 w-10 text-white" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                            <button
                              type="button"
                              onClick={handleImageClick}
                              className="p-2 bg-primary/80 hover:bg-primary rounded-full text-white transition-colors"
                              title="Upload Image"
                            >
                              <Camera className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl">
                        {user?.firstname} {user?.lastname}
                      </CardTitle>
                      <CardDescription className="text-base mt-1">
                        {user?.email}
                      </CardDescription>
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleImageClick}
                          className="h-8 text-xs"
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          {imagePreview ? "Change" : "Upload"} Image
                        </Button>
                        {imagePreview && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleDeleteImage}
                            disabled={uploadingImage}
                            className="h-8 text-xs text-destructive hover:text-destructive"
                          >
                            {uploadingImage ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3 mr-1" />
                            )}
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                        Personal Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstname">
                            First Name{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="firstname"
                            type="text"
                            value={formData.firstname}
                            onChange={handleChange}
                            placeholder="Enter first name"
                            required
                            minLength={2}
                            maxLength={50}
                            suppressHydrationWarning
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastname">
                            Last Name{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="lastname"
                            type="text"
                            value={formData.lastname}
                            onChange={handleChange}
                            placeholder="Enter last name"
                            required
                            minLength={2}
                            maxLength={50}
                            suppressHydrationWarning
                            className="h-11"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">
                          Phone Number{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="Enter 10-digit phone number"
                          required
                          pattern="[0-9]{10}"
                          maxLength={10}
                          suppressHydrationWarning
                          className="h-11"
                        />
                        <p className="text-xs text-muted-foreground">
                          10-digit phone number (e.g., 9876543210)
                        </p>
                      </div>
                    </div>

                    {/* Address Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                        Address Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="address.city">
                            City <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="address.city"
                            type="text"
                            value={formData.address.city}
                            onChange={handleChange}
                            placeholder="Enter city"
                            required
                            suppressHydrationWarning
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address.state">
                            State <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="address.state"
                            type="text"
                            value={formData.address.state}
                            onChange={handleChange}
                            placeholder="Enter state"
                            required
                            suppressHydrationWarning
                            className="h-11"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="address.country">
                            Country <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="address.country"
                            type="text"
                            value={formData.address.country}
                            onChange={handleChange}
                            placeholder="Enter country"
                            required
                            suppressHydrationWarning
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address.pincode">
                            Pincode <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="address.pincode"
                            type="text"
                            value={formData.address.pincode}
                            onChange={handleChange}
                            placeholder="Enter 6-digit pincode"
                            required
                            pattern="[0-9]{6}"
                            maxLength={6}
                            suppressHydrationWarning
                            className="h-11"
                          />
                          <p className="text-xs text-muted-foreground">
                            6-digit pincode (e.g., 123456)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        className="h-11 px-6"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving}
                        className="h-11 px-6"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
