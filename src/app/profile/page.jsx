"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Camera, ChevronDown, Loader2, Pencil, Save, Trash2, UserRound } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ThemeToggle } from "@/components/theme-toggle";
import api from "@/lib/axios";
import { getUserFromLocalStorage, saveUserToLocalStorage } from "@/utils/localStorage";

function initials(user) {
  return `${user?.firstname?.[0] || ""}${user?.lastname?.[0] || ""}`.toUpperCase() || "U";
}

function ProfileImage({ user, preview, onClick, size = "large" }) {
  const dimensions = size === "small" ? "h-10 w-10" : "h-16 w-16 sm:h-20 sm:w-20";
  return <button type="button" onClick={onClick} title="Change profile picture" className={`group relative inline-flex ${dimensions} shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 shadow-lg ring-4 ring-white dark:ring-slate-950`}>
    {preview ? <img src={preview} alt="Profile" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-white"><UserRound size={size === "small" ? 18 : 30} /></span>}
    <span className="absolute inset-0 grid place-items-center bg-slate-950/55 text-white opacity-0 transition group-hover:opacity-100"><Camera size={18}/></span>
  </button>;
}

function SettingRow({ label, hint, children, last = false }) {
  return <div className={`grid gap-3 px-4 py-4 sm:grid-cols-[minmax(150px,1fr)_minmax(260px,1.1fr)] sm:items-center sm:px-6 ${last ? "" : "border-b border-slate-100 dark:border-slate-800"}`}>
    <div><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>{hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}</div>
    <div className="min-w-0">{children}</div>
  </div>;
}

const fieldClass = "h-10 w-full rounded-lg border-0 bg-slate-100 px-3 text-sm text-slate-900 outline-none ring-1 ring-transparent transition placeholder:text-slate-400 focus:bg-white focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900";

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [user, setUser] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [formData, setFormData] = useState({ firstname: "", lastname: "", title: "", username: "", phone: "", address: { city: "", state: "", country: "India", pincode: "" } });

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get("/auth/profile");
      const profile = response.data.user;
      setUser(profile);
      setImagePreview(profile.profileImage || "");
      setFormData({ firstname: profile.firstname || "", lastname: profile.lastname || "", title: profile.title || "", username: profile.username || "", phone: profile.phone || "", address: { city: profile.address?.city || "", state: profile.address?.state || "", country: profile.address?.country || "India", pincode: profile.address?.pincode || "" } });
    } catch (error) {
      toast.error(error.response?.data?.message || "We could not load your profile");
      if (error.response?.status === 401) router.replace("/auth/login");
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const changeField = (event) => {
    const { name, value } = event.target;
    if (name.startsWith("address.")) {
      const key = name.split(".")[1];
      setFormData((current) => ({ ...current, address: { ...current.address, [key]: value } }));
    } else setFormData((current) => ({ ...current, [name]: value }));
  };

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file for your profile picture");
    if (file.size > 5 * 1024 * 1024) return toast.error("Profile image must be smaller than 5 MB");
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
    toast.success("Profile picture ready to save");
  };

  const syncLocalUser = (updatedUser) => {
    const stored = getUserFromLocalStorage();
    if (stored) saveUserToLocalStorage({ ...stored, ...updatedUser }, true);
    window.dispatchEvent(new Event("userUpdated"));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!formData.firstname.trim() || !formData.lastname.trim()) return toast.error("Enter your first and last name");
    if (!/^[0-9]{10}$/.test(formData.phone.trim())) return toast.error("Enter a valid 10-digit phone number");
    if (!formData.address.city.trim() || !formData.address.state.trim() || !/^[0-9]{6}$/.test(formData.address.pincode.trim())) return toast.error("Complete your city, state, and 6-digit pincode");
    try {
      setSaving(true);
      let response;
      if (selectedFile) {
        const payload = new FormData();
        Object.entries({ firstname: formData.firstname.trim(), lastname: formData.lastname.trim(), title: formData.title.trim(), username: formData.username.trim(), phone: formData.phone.trim(), "address.city": formData.address.city.trim(), "address.state": formData.address.state.trim(), "address.country": formData.address.country.trim() || "India", "address.pincode": formData.address.pincode.trim() }).forEach(([key, value]) => payload.append(key, value));
        payload.append("profileImage", selectedFile);
        response = await api.put("/auth/profile", payload, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        response = await api.put("/auth/profile", { ...formData, firstname: formData.firstname.trim(), lastname: formData.lastname.trim(), title: formData.title.trim(), username: formData.username.trim(), phone: formData.phone.trim(), address: { ...formData.address, city: formData.address.city.trim(), state: formData.address.state.trim(), country: formData.address.country.trim() || "India", pincode: formData.address.pincode.trim() } });
      }
      const updatedUser = response.data.user;
      setUser(updatedUser);
      setImagePreview(updatedUser.profileImage || "");
      setSelectedFile(null);
      syncLocalUser(updatedUser);
      toast.success("Your profile has been saved");
    } catch (error) { toast.error(error.response?.data?.message || "We could not save your profile");
    } finally { setSaving(false); }
  };

  const deleteImage = async () => {
    if (!imagePreview) return;
    try {
      setUploadingImage(true);
      const response = await api.put("/auth/profile", { deleteProfileImage: true });
      setUser(response.data.user);
      setImagePreview("");
      setSelectedFile(null);
      syncLocalUser(response.data.user);
      toast.success("Profile picture removed");
    } catch (error) { toast.error(error.response?.data?.message || "We could not remove your profile picture");
    } finally { setUploadingImage(false); }
  };

  return <ProtectedRoute><main className="min-h-screen bg-white px-4 py-7 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-8 sm:py-10"><div className="mx-auto w-full max-w-3xl">
    <header className="mb-8 flex items-center justify-between gap-4"><div className="flex items-center gap-4"><button type="button" onClick={() => router.push("/dashboard")} aria-label="Back to workspace" className="grid h-10 w-10 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"><ArrowLeft size={20}/></button><div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your account details and workspace preferences.</p></div></div><ThemeToggle /></header>
    {loading ? <div className="grid min-h-72 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-600"/></div> : <form onSubmit={saveProfile}>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <SettingRow label="Profile picture"><div className="flex items-center justify-end gap-3"><div className="hidden text-right sm:block"><p className="text-xs text-slate-500 dark:text-slate-400">JPG, PNG, or WebP · max 5 MB</p><button type="button" onClick={() => fileInputRef.current?.click()} className="mt-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Change picture</button></div><ProfileImage user={user} preview={imagePreview} onClick={() => fileInputRef.current?.click()}/></div></SettingRow>
        <SettingRow label="Email"><div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"><span className="min-w-0 truncate">{user?.email}</span><button type="button" onClick={() => toast("Email changes require account support for security.", { icon: "✉️" })} aria-label="Email change information" className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"><Pencil size={15}/></button></div></SettingRow>
        <SettingRow label="Full name"><div className="grid gap-2 sm:grid-cols-2"><input name="firstname" value={formData.firstname} onChange={changeField} maxLength={50} className={fieldClass} placeholder="First name"/><input name="lastname" value={formData.lastname} onChange={changeField} maxLength={50} className={fieldClass} placeholder="Last name"/></div></SettingRow>
        <SettingRow label="Title" hint="Your job title or role"><input name="title" value={formData.title} onChange={changeField} maxLength={80} className={fieldClass} placeholder="e.g. Product designer"/></SettingRow>
        <SettingRow label="Username" hint="One word, like a nickname or first name" last><input name="username" value={formData.username} onChange={changeField} maxLength={40} className={fieldClass} placeholder="e.g. dexter"/></SettingRow>
      </section>
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={selectImage} className="hidden"/>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3"><button type="button" disabled={!imagePreview || uploadingImage} onClick={deleteImage} className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/30">{uploadingImage ? <Loader2 size={15} className="animate-spin"/> : <Trash2 size={15}/>}Remove picture</button><button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}Save changes</button></div>
      <section className="mt-10"><h2 className="mb-4 text-base font-semibold">Additional details</h2><button type="button" onClick={() => setShowDetails((value) => !value)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 text-left text-sm font-medium shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"><span>Phone number and address</span><ChevronDown size={18} className={`text-slate-400 transition-transform ${showDetails ? "rotate-180" : ""}`}/></button>{showDetails && <div className="mt-2 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2"><label className="text-sm font-medium">Phone number<input name="phone" inputMode="numeric" maxLength={10} value={formData.phone} onChange={changeField} className={`${fieldClass} mt-1.5`} placeholder="10-digit number"/></label><label className="text-sm font-medium">City<input name="address.city" value={formData.address.city} onChange={changeField} className={`${fieldClass} mt-1.5`}/></label><label className="text-sm font-medium">State<input name="address.state" value={formData.address.state} onChange={changeField} className={`${fieldClass} mt-1.5`}/></label><label className="text-sm font-medium">Country<input name="address.country" value={formData.address.country} onChange={changeField} className={`${fieldClass} mt-1.5`}/></label><label className="text-sm font-medium sm:col-span-2">Pincode<input name="address.pincode" inputMode="numeric" maxLength={6} value={formData.address.pincode} onChange={changeField} className={`${fieldClass} mt-1.5`}/></label></div>}</section>
      <section className="mt-10"><h2 className="mb-4 text-base font-semibold">Workspace access</h2><div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-400">Manage team membership, projects, and tasks in your workspace.</p><button type="button" onClick={() => router.push("/dashboard")} className="h-10 shrink-0 rounded-lg bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50">Manage workspace</button></div></section>
    </form>}
  </div></main></ProtectedRoute>;
}
