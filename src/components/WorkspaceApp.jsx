"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import toast from "react-hot-toast";
import {
  BarChart3, CalendarDays, Check, ChevronDown, ChevronRight, ChevronsUpDown, Circle,
  Columns3, Ellipsis, Eye, FolderKanban, GripVertical, LayoutGrid, LayoutList, Link2, LogOut, Menu,
  MoreHorizontal, PanelLeft, PanelRight, Plus, Search, Send, Settings, SlidersHorizontal, Sun, Tag, UserRound, Users, X, LockKeyhole, LockOpen, Lock, Unlock, Bell, Archive, Paperclip,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import api from "@/lib/axios";
import { clearAuth } from "@/lib/auth";

const accentPalette = {
  blue: { label: "Blue", value: "217 91% 60%" },
  amber: { label: "Amber", value: "38 92% 50%" },
  pink: { label: "Pink", value: "330 81% 60%" },
  rose: { label: "Rose", value: "347 77% 50%" },
  emerald: { label: "Emerald", value: "160 84% 39%" },
  black: { label: "Black", value: "222 47% 11%" },
};

const columns = [
  { id: "todo", label: "To Do" },
  { id: "doing", label: "Doing" },
  { id: "completed", label: "Completed" },
  { id: "on_hold", label: "On Hold" },
];
const priorities = ["none", "urgent", "high", "medium", "low"];
const defaultFields = { status: false, priority: true, members: true, dueDate: true, labels: true, reporter: false };
const fieldMeta = {
  status: { icon: Circle, label: "Status" },
  priority: { icon: BarChart3, label: "Priority" },
  members: { icon: Users, label: "Members" },
  dueDate: { icon: CalendarDays, label: "Due date" },
  labels: { icon: Tag, label: "Labels" },
  reporter: { icon: UserRound, label: "Reporter" },
};

function useDismissOnOutsideClick(ref, onDismiss) {
  useEffect(() => {
    const dismiss = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onDismiss();
    };
    const dismissOnEscape = (event) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [ref, onDismiss]);
}

function displayStatus(status) {
  return status === "pending" ? "todo" : status === "progress" ? "doing" : status;
}
function normalizeTeamRelation(item) {
  return { ...item, team: item?.team?._id || item?.team || null };
}
// Mirrors the server's canManageTeam check (owner/admin) for UI gating only —
// the API re-checks this itself, this just decides what to show as enabled.
function isTeamManager(team, userId) {
  if (!team || !userId) return false;
  const ownerId = team.owner?._id || team.owner;
  if (String(ownerId) === String(userId)) return true;
  const role = team.memberRoles?.[String(userId)] ?? team.memberRoles?.get?.(String(userId));
  return role === "admin";
}
function initials(person) {
  return `${person?.firstname?.[0] || ""}${person?.lastname?.[0] || ""}`.toUpperCase() || "U";
}
function shortDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "No date";
}
const avatarPalette = ["from-rose-400 to-orange-400", "from-indigo-400 to-purple-400", "from-emerald-400 to-teal-400", "from-amber-400 to-pink-400", "from-sky-400 to-indigo-400"];
function avatarGradient(person) {
  const seed = `${person?._id || person?.email || person?.firstname || "?"}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return avatarPalette[hash % avatarPalette.length];
}
function Avatar({ user, size = "md" }) {
  const sizes = { sm: "h-6 w-6 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-11 w-11 text-sm" };
  return user?.profileImage ? <img className={`${sizes[size]} shrink-0 rounded-full object-cover`} src={user.profileImage} alt="" /> : <span className={`${sizes[size]} inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(user)} font-semibold text-white shadow-sm`}>{initials(user)}</span>;
}

function IconButton({ label, children, className = "", ...props }) {
  return <button type="button" aria-label={label} title={label} className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:pointer-events-none disabled:opacity-40 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 ${className}`} {...props}>{children}</button>;
}

function NotificationButton() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const loadNotifications = useCallback(async () => {
    try {
      const response = await api.get("/notifications");
      setItems(response.data.notifications || []);
      setUnread(response.data.unreadCount || 0);
    } catch { /* Workspace loading already handles authentication errors. */ }
  }, []);
  useDismissOnOutsideClick(ref, () => setOpen(false));
  useEffect(() => { const timer = window.setInterval(loadNotifications, 60000); return () => window.clearInterval(timer); }, [loadNotifications]);
  const markAllRead = async () => {
    try { await api.patch("/notifications", { all: true }); setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))); setUnread(0); } catch { toast.error("Unable to update notifications"); }
  };
  const openItem = async (item) => {
    try { if (!item.readAt) { await api.patch("/notifications", { id: item._id }); setUnread((value) => Math.max(0, value - 1)); } } catch { /* Navigation should still work. */ }
    setOpen(false);
    if (item.href?.startsWith("/dashboard?task=")) window.location.assign(item.href);
  };
  return <div ref={ref} className="relative"><IconButton label="Notifications" onClick={() => { setOpen((value) => !value); if (!open) loadNotifications(); }} className="relative"><Bell size={17}/>{unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}</IconButton>{open && <div className="absolute right-0 top-11 z-50 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800"><strong className="text-sm">Notifications</strong>{unread > 0 && <button onClick={markAllRead} className="text-xs font-medium text-indigo-600 hover:underline">Mark all read</button>}</div><div className="max-h-80 overflow-y-auto">{items.length ? items.map((item) => <button key={item._id} onClick={() => openItem(item)} className={`block w-full border-b border-slate-100 px-3 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${item.readAt ? "opacity-70" : ""}`}><div className="flex items-start gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-slate-300" : "bg-indigo-500"}`}/><span className="min-w-0"><span className="block text-sm font-semibold">{item.title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{item.message}</span></span></div></button>) : <p className="px-4 py-8 text-center text-sm text-slate-500">You are all caught up.</p>}</div></div>}</div>;
}

function Priority({ value = "none" }) {
  if (value === "none") return <span className="text-xs text-slate-400">No priority</span>;
  const colors = { urgent: "text-rose-600", high: "text-red-500", medium: "text-amber-600", low: "text-slate-500" };
  return <span className={`inline-flex items-center gap-1 text-xs font-medium capitalize ${colors[value] || "text-slate-500"}`}><span aria-hidden>▴</span>{value}</span>;
}

const projectFieldKeys = ["priority", "members", "dueDate"];

function FieldMenu({ view, setView, fields, setFields, priority, setPriority, page, close, savedViews = [], onSaveView = () => {}, onApplyView = () => {}, onDeleteView = () => {} }) {
  const [priorityFilterOpen, setPriorityFilterOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [saved, setSaved] = useState(savedViews);
  const menuRef = useRef(null);
  useDismissOnOutsideClick(menuRef, close);
  useEffect(() => { api.get(`/saved-views?scope=${page}`).then((response) => setSaved(response.data.views || [])).catch(() => {}); }, [page]);
  const visibleKeys = page === "projects" ? projectFieldKeys : Object.keys(fields);
  return <div ref={menuRef} className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="menu">
    {page === "tasks" && <div className="mb-2 grid grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
      {[{ value: "list", icon: LayoutList, label: "List" }, { value: "board", icon: Columns3, label: "Board" }].map(({ value, icon: Icon, label }) => <button key={value} onClick={() => { setView(value); close(); }} className={`flex h-8 items-center justify-center gap-1 rounded-md text-xs font-medium ${view === value ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500"}`}><Icon size={14}/>{label}</button>)}
    </div>}
    <p className="px-2 py-1 text-xs font-medium text-slate-500">Show on {page === "projects" ? "table" : view}</p>
    {visibleKeys.map((key) => { const Icon = fieldMeta[key]?.icon; return <div key={key} className="relative flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
      <button onClick={() => setFields((current) => ({ ...current, [key]: !current[key] }))} className="flex flex-1 items-center gap-2 text-left">{Icon && <Icon size={14} className="text-slate-400"/>}<span>{fieldMeta[key]?.label || key}</span></button>
      <div className="flex items-center gap-1">
        <button onClick={() => setFields((current) => ({ ...current, [key]: !current[key] }))} aria-label={`Toggle ${key} visibility`} className={`flex h-4 w-4 items-center justify-center rounded ${fields[key] ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-200 dark:bg-slate-700"}`}>{fields[key] && <Check size={12}/>}</button>
        {key === "priority" && <button onClick={() => setPriorityFilterOpen((open) => !open)} aria-label="Filter by priority" className="rounded p-0.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronRight size={14}/></button>}
      </div>
      {key === "priority" && priorityFilterOpen && <>
        <div className="fixed inset-0 z-30" onClick={(event) => { event.stopPropagation(); setPriorityFilterOpen(false); }}/>
        <div onClick={(event) => event.stopPropagation()} className="absolute left-0 top-full z-40 mt-1 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <p className="px-2 py-1 text-xs font-medium text-slate-500">Priority</p>
          {["all", ...priorities].map((item) => <button key={item} onClick={() => setPriority(item)} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs capitalize hover:bg-slate-50 dark:hover:bg-slate-800">{item === "all" ? "All priorities" : item === "none" ? "No priority" : item}{priority === item && <Check size={12}/>}</button>)}
        </div>
      </>}
    </div>; })}
    <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800"><p className="px-2 py-1 text-xs font-medium text-slate-500">Saved views</p>{saved.map((item) => <div key={item._id} className="flex items-center gap-1 px-1"><button onClick={() => { setView(item.filters.view || view); setFields(item.filters.fields || fields); setPriority(item.filters.priority || "all"); close(); }} className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800">{item.name}</button><button onClick={async () => { try { await api.delete(`/saved-views/${item._id}`); setSaved((current) => current.filter((viewItem) => viewItem._id !== item._id)); } catch { toast.error("Unable to delete saved view"); } }} aria-label={`Delete ${item.name}`} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"><X size={13}/></button></div>)}<form onSubmit={async (event) => { event.preventDefault(); if (!viewName.trim()) return; try { const response = await api.post("/saved-views", { name: viewName.trim(), scope: page, filters: { view, fields, priority } }); setSaved((current) => [response.data.view, ...current]); setViewName(""); toast.success("View saved"); } catch (error) { toast.error(error.response?.data?.message || "Unable to save view"); } }} className="mt-1 flex gap-1 px-1"><input value={viewName} onChange={(event) => setViewName(event.target.value)} maxLength={60} placeholder="Save current view" className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-transparent px-2 text-xs outline-none focus:border-indigo-600 dark:border-slate-700"/><button className="rounded-md bg-slate-900 px-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">Save</button></form></div>
  </div>;
}

function NewItemDialog({ kind, initial, onClose, onSubmit, projects, team, user }) {
  const isEdit = Boolean(initial);
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [project, setProject] = useState(initial?.project?._id || initial?.project || "");
  const [priority, setPriority] = useState(initial?.priority || "none");
  const [status, setStatus] = useState(displayStatus(initial?.status || "todo"));
  const [startDate, setStartDate] = useState(initial?.startDate || null);
  const [dueDate, setDueDate] = useState(initial?.dueDate || null);
  const [labelsText, setLabelsText] = useState((initial?.labels || []).join(", "));
  const [isPrivate, setIsPrivate] = useState(Boolean(initial?.private));
  const [assignees, setAssignees] = useState(() => (initial?.assignees || []).map((person) => String(person._id || person)));
  const [assigneesTouched, setAssigneesTouched] = useState(Boolean(initial?.assignees?.length));
  const [saving, setSaving] = useState(false);
  const isTeamTask = kind === "task" && Boolean(team?._id);
  const teamMembers = team?.members?.length ? team.members : (user ? [user] : []);
  const toggleAssignee = (memberId) => {
    const id = String(memberId);
    setAssigneesTouched(true);
    setAssignees((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const labels = [...new Set(labelsText.split(",").map((label) => label.trim()).filter(Boolean))].slice(0, 12);
      const taskPayload = { title, description, project: project || null, status, priority, startDate: startDate || null, dueDate: dueDate || null, labels, private: isTeamTask ? isPrivate : false, ...(assigneesTouched ? { assignees } : {}) };
      await onSubmit(kind === "task" ? taskPayload : { title, description, priority, dueDate: dueDate || null });
      onClose();
    } finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={onClose}>
    <form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className="max-h-[calc(100dvh-2rem)] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:max-h-[88vh] sm:p-6 lg:p-8" role="dialog" aria-modal="true" aria-labelledby="new-item-title">
      <div className="sticky top-0 z-20 -mx-5 -mt-5 mb-5 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-5 lg:-mx-8 lg:-mt-8 lg:px-8"><h2 id="new-item-title" className="text-lg font-semibold">{isEdit ? `Edit ${kind}` : `Create ${kind}`}</h2><IconButton label="Close dialog" onClick={onClose} className="bg-rose-600 text-white shadow-sm hover:border-rose-700 hover:bg-rose-700 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-700"><X size={18}/></IconButton></div>
      <label className="mb-4 block text-sm font-medium">{kind === "task" ? "Task title" : "Project name"}<input autoFocus required maxLength={kind === "task" ? 200 : 120} value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700" placeholder={kind === "task" ? "e.g. Write API documentation" : "e.g. Website redesign"}/></label>
      <label className="mb-4 block text-sm font-medium">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-300 bg-transparent p-3 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700" placeholder="Add context for collaborators"/></label>
      {kind === "task" && <div className="grid gap-x-5 lg:grid-cols-2">
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700">{columns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}</select></label>
          <label className="block text-sm font-medium">Priority<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700">{priorities.map((item) => <option key={item} value={item}>{item === "none" ? "No priority" : item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
        </div>
        <label className="mb-4 block text-sm font-medium">Project <select value={project} onChange={(event) => setProject(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><option value="">No project</option>{projects.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}</select></label>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Start date<div className="mt-1.5"><DatePicker value={startDate} onChange={setStartDate}/></div></label>
          <label className="block text-sm font-medium">Due date<div className="mt-1.5"><DatePicker value={dueDate} onChange={setDueDate}/></div></label>
        </div>
        <label className="mb-4 block text-sm font-medium">Labels <span className="font-normal text-slate-400">(comma separated)</span><input value={labelsText} onChange={(event) => setLabelsText(event.target.value)} maxLength={500} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700" placeholder="e.g. frontend, release"/></label>
        {isTeamTask && <fieldset className="mb-5 rounded-xl border border-slate-200 p-3 dark:border-slate-700 lg:col-span-2"><legend className="px-1 text-sm font-medium">Assignees</legend><p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Leave this unchanged to assign project members automatically, or choose people below.</p><div className="grid gap-1 sm:grid-cols-2">{teamMembers.map((member) => { const id = String(member._id || member.id); return <label key={id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"><input type="checkbox" checked={assignees.includes(id)} onChange={() => toggleAssignee(id)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"/><Avatar user={member} size="sm"/><span className="truncate text-sm">{member.firstname} {member.lastname}</span></label>; })}</div></fieldset>}
        {isTeamTask && <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 lg:col-span-2"><input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"/><span><span className="flex items-center gap-1.5 font-medium"><LockKeyhole size={15}/>Private task</span><span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">Only assignees, project members, and the reporter can view it.</span></span></label>}
      </div>}
      {kind === "project" && <>
        <label className="mb-4 block text-sm font-medium">Priority<select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700">{priorities.map((item) => <option key={item} value={item}>{item === "none" ? "No priority" : item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
        <label className="mb-5 block text-sm font-medium">Due date<div className="mt-1.5"><DatePicker value={dueDate} onChange={setDueDate}/></div></label>
      </>}
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button><button disabled={saving} className="h-10 rounded-lg bg-[hsl(var(--color-primary))] px-4 text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90">{saving ? "Saving…" : isEdit ? "Save changes" : `Create ${kind}`}</button></div>
    </form>
  </div>;
}

function TeamSettings({ team, onClose, onCreate, onRename, onInvite, onRemoveMember, onDeleteTeam, currentUserId }) {
  const isCreate = !team;
  const ownerId = team?.owner?._id || team?.owner;
  const isOwner = team && String(ownerId) === String(currentUserId);
  const [name, setName] = useState(team?.name || "");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const submitCreate = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try { await onCreate(name.trim()); onClose(); } finally { setSaving(false); }
  };
  const submitRename = (event) => {
    event.preventDefault();
    if (name.trim() && name.trim() !== team.name) onRename(team._id, name.trim());
  };
  const submitInvite = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try { await onInvite(team._id, email.trim(), inviteRole); setEmail(""); setInviteOpen(false); } finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={onClose}>
    <div onMouseDown={(event) => event.stopPropagation()} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="team-settings-title">
      <div className="mb-5 flex items-center justify-between"><h2 id="team-settings-title" className="text-lg font-semibold">{isCreate ? "New team" : "Team settings"}</h2><IconButton label="Close" onClick={onClose} className="bg-rose-600 text-white shadow-sm hover:border-rose-700 hover:bg-rose-700 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-700"><X size={18}/></IconButton></div>
      {isCreate ? <form onSubmit={submitCreate}>
        <label className="mb-4 block text-sm font-medium">Team name<input autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700" placeholder="e.g. Engineering"/></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button><button disabled={saving} className="h-10 rounded-lg bg-[hsl(var(--color-primary))] px-4 text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90">{saving ? "Creating…" : "Create team"}</button></div>
      </form> : <>
        {isOwner ? <form onSubmit={submitRename} className="mb-5 flex items-center gap-2"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="h-10 flex-1 rounded-lg border border-slate-300 bg-transparent px-3 text-sm outline-none focus:border-indigo-600 dark:border-slate-700"/><button type="submit" className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Rename</button></form> : <p className="mb-5 text-base font-semibold">{team.name}</p>}

        <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Members</p>{isOwner && <IconButton label="Invite a teammate" onClick={() => setInviteOpen((open) => !open)} className="h-8 w-8 border border-slate-200 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-indigo-950/40"><Plus size={16}/></IconButton>}</div>
        {isOwner && inviteOpen && <label className="mb-3 block text-xs font-medium text-slate-600 dark:text-slate-300">Role for this invitation<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-transparent px-2 text-sm dark:border-slate-700"><option value="editor">Editor — create and update work</option><option value="viewer">Viewer — view only</option><option value="admin">Admin — elevated collaboration access</option></select></label>}
        <div className="mb-5 max-h-56 space-y-1 overflow-y-auto">
          {(team.members || []).map((member) => {
            const isMemberOwner = String(member._id) === String(ownerId);
            const canRemove = !isMemberOwner && (isOwner || String(member._id) === String(currentUserId));
            return <div key={member._id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
              <span className="flex min-w-0 items-center gap-2"><Avatar user={member} size="sm"/><span className="truncate text-sm">{member.firstname} {member.lastname}{isMemberOwner ? <span className="text-xs text-slate-400"> · Owner</span> : ""}</span></span>
              {canRemove && <button onClick={() => onRemoveMember(team._id, member._id)} className="shrink-0 text-xs font-medium text-rose-500 hover:underline">{String(member._id) === String(currentUserId) ? "Leave" : "Remove"}</button>}
            </div>;
          })}
        </div>

        {isOwner && inviteOpen && <form onSubmit={submitInvite} className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-950 dark:bg-indigo-950/20"><p className="mb-2 text-xs leading-5 text-slate-600 dark:text-slate-300">Enter an email. Existing verified users are added immediately; everyone else receives a secure link to create an account and join the team.</p><div className="flex items-center gap-2"><input autoFocus type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@email.com" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-900"/><button disabled={saving} className="h-10 shrink-0 rounded-lg bg-[hsl(var(--color-primary))] px-3 text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90">{saving ? "Sending…" : "Send invite"}</button></div></form>}
        {isOwner && <button onClick={() => onDeleteTeam(team._id)} className="text-sm font-medium text-rose-600 hover:underline">Delete team</button>}
      </>}
    </div>
  </div>;
}

const TaskCard = memo(function TaskCard({ task, fields, onOpen, onDelete, onMove }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const assignee = task.assignees?.[0] || task.reporter;
  const currentStatus = displayStatus(task.status);
  return <article draggable={!task.locked} onDragStart={(event) => event.dataTransfer.setData("text/task-id", task._id)} onClick={() => onOpen(task)} className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-start gap-2">
      {task.locked && <Lock size={13} className="mt-0.5 shrink-0 text-slate-400" aria-label="Locked task"/>}
      <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug">{task.title}</h3>
      <div className="relative -mr-1.5 -mt-1 shrink-0">
        <IconButton label={`More actions for ${task.title}`} onClick={(event) => { event.stopPropagation(); setMenuOpen((open) => !open); }} className="h-7 w-7"><Ellipsis size={16}/></IconButton>
        {menuOpen && <>
          <div className="fixed inset-0 z-30" onClick={(event) => { event.stopPropagation(); setMenuOpen(false); }}/>
          <div onClick={(event) => event.stopPropagation()} className="absolute right-0 top-8 z-40 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <button onClick={() => { setMenuOpen(false); onOpen(task); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800">{task.locked ? "View task" : "Edit task"}</button>
            {onMove && !task.locked && <>
              <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Move to</p>
              {columns.filter((item) => item.id !== currentStatus).map((item) => <button key={item.id} onClick={() => { setMenuOpen(false); onMove(task._id, item.id); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800">{item.label}</button>)}
              <div className="my-1 border-t border-slate-100 dark:border-slate-800"/>
            </>}
            {!task.locked && <button onClick={() => { setMenuOpen(false); onDelete(task); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">Delete task</button>}
          </div>
        </>}
      </div>
    </div>
    {fields.status && <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">{statusMeta[displayStatus(task.status)] && <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[displayStatus(task.status)].dot}`}/>}{statusMeta[displayStatus(task.status)]?.label}</div>}
    {fields.priority && task.priority !== "none" && <div className="mt-2.5"><Priority value={task.priority}/></div>}
    {fields.labels && task.labels?.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{task.labels.slice(0, 3).map((label) => <span key={label} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{label}</span>)}</div>}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        {fields.members && assignee && <span className="flex min-w-0 items-center gap-1.5"><Avatar user={assignee} size="sm"/><span className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">{assignee.firstname || "You"}</span></span>}
        {fields.reporter && task.reporter && <span className="flex min-w-0 items-center gap-1.5"><Avatar user={task.reporter} size="sm"/><span className="truncate text-xs text-slate-500 dark:text-slate-400">{task.reporter.firstname || "You"} (reporter)</span></span>}
      </span>
      {fields.dueDate && task.dueDate && <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-500 dark:bg-rose-950/40 dark:text-rose-400"><CalendarDays size={12}/>{shortDate(task.dueDate)}</span>}
    </div>
  </article>;
});

const TaskBoard = memo(function TaskBoard({ tasks, fields, onOpen, onMove, onNew, onDelete }) {
  const [collapsed, setCollapsed] = useState({});
  const [menuColumn, setMenuColumn] = useState(null);
  const [mobileColumn, setMobileColumn] = useState(columns[0].id);
  return <div>
    <div className="mb-3 flex gap-1.5 overflow-x-auto sm:hidden" role="tablist" aria-label="Task board columns">
      {columns.map((column) => {
        const count = tasks.filter((task) => displayStatus(task.status) === column.id).length;
        const isActive = mobileColumn === column.id;
        return <button key={column.id} type="button" role="tab" aria-selected={isActive} onClick={() => setMobileColumn(column.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium ${isActive ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
          {statusMeta[column.id] && <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white dark:bg-slate-950" : statusMeta[column.id].dot}`}/>}
          {column.label}
          <span className="text-[10px] opacity-70">{count}</span>
        </button>;
      })}
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Task board">
    {columns.map((column) => {
      const items = tasks.filter((task) => displayStatus(task.status) === column.id);
      const isCollapsed = collapsed[column.id];
      return <section key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData("text/task-id"); if (id) onMove(id, column.id, Math.max(-1, ...items.map((item) => item.position || 0)) + 1); }} className={`min-h-72 rounded-xl bg-slate-100/80 p-2 dark:bg-slate-900/70 ${mobileColumn === column.id ? "block" : "hidden"} sm:block`}>
        <div className="mb-2 flex items-center gap-1.5 rounded-lg px-1.5 py-1.5">
          <GripVertical size={14} className="shrink-0 text-slate-400"/>
          <h2 className="flex-1 truncate text-sm font-semibold">{column.label}</h2>
          <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{items.length}</span>
          <IconButton label={`Create task in ${column.label}`} onClick={() => onNew(column.id)} className="h-7 w-7 shrink-0"><Plus size={15}/></IconButton>
          <div className="relative shrink-0">
            <IconButton label={`${column.label} column menu`} onClick={() => setMenuColumn(menuColumn === column.id ? null : column.id)} className="h-7 w-7"><MoreHorizontal size={15}/></IconButton>
            {menuColumn === column.id && <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuColumn(null)}/>
              <div className="absolute right-0 top-8 z-40 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <button onClick={() => { onNew(column.id); setMenuColumn(null); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Add task</button>
                <button onClick={() => { setCollapsed((current) => ({ ...current, [column.id]: !current[column.id] })); setMenuColumn(null); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800">{isCollapsed ? "Expand column" : "Collapse column"}</button>
              </div>
            </>}
          </div>
        </div>
        {!isCollapsed && <>
          <div className="space-y-2">{items.map((task) => <TaskCard key={task._id} task={task} fields={fields} onOpen={onOpen} onDelete={onDelete}/>)}</div>
          <button onClick={() => onNew(column.id)} className="mt-2 flex h-9 w-full items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"><Plus size={14}/>Add task</button>
        </>}
      </section>;
    })}
    </div>
  </div>;
});

const TaskList = memo(function TaskList({ tasks, fields, onOpen, onMove, onNew, onDelete }) {
  const [collapsed, setCollapsed] = useState({});
  const [menuFor, setMenuFor] = useState(null);
  const colSpan = 2 + (fields.status ? 1 : 0) + (fields.priority ? 1 : 0) + (fields.members ? 1 : 0) + (fields.dueDate ? 1 : 0) + (fields.reporter ? 1 : 0);
  return <div className="space-y-5">
    {columns.map((column) => {
      const group = tasks.filter((task) => displayStatus(task.status) === column.id);
      const isCollapsed = collapsed[column.id];
      return <section key={column.id}>
        <button onClick={() => setCollapsed((current) => ({ ...current, [column.id]: !current[column.id] }))} className="mb-2 flex items-center gap-2 rounded-md py-1 pr-2 hover:bg-slate-50 dark:hover:bg-slate-900">
          <ChevronDown size={16} className={`shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}/>
          <h2 className="text-sm font-semibold">{column.label}</h2>
          <span className="text-xs text-slate-400">{group.length}</span>
        </button>
        {!isCollapsed && <div className="hidden overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 lg:block">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3">Task</th>
                {fields.status && <th className="px-4 py-3">Status</th>}
                {fields.priority && <th className="px-4 py-3">Priority</th>}
                {fields.members && <th className="px-4 py-3">Members</th>}
                {fields.dueDate && <th className="px-4 py-3">Due date</th>}
                {fields.reporter && <th className="px-4 py-3">Reporter</th>}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {group.map((task) => {
                const assignees = task.assignees?.length ? task.assignees : (task.reporter ? [task.reporter] : []);
                return <tr key={task._id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  <td className="px-4 py-3"><button onClick={() => onOpen(task)} className="font-medium hover:text-indigo-600">{task.title}</button></td>
                  {fields.status && <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">{statusMeta[displayStatus(task.status)] && <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[displayStatus(task.status)].dot}`}/>}{statusMeta[displayStatus(task.status)]?.label}</span></td>}
                  {fields.priority && <td className="px-4 py-3"><Priority value={task.priority}/></td>}
                  {fields.members && <td className="px-4 py-3"><MemberAvatars members={assignees}/></td>}
                  {fields.dueDate && <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{shortDate(task.dueDate)}</td>}
                  {fields.reporter && <td className="px-4 py-3">{task.reporter ? <Avatar user={task.reporter} size="sm"/> : <span className="text-xs text-slate-400">—</span>}</td>}
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <IconButton label={`More actions for ${task.title}`} onClick={() => setMenuFor(menuFor === task._id ? null : task._id)} className="h-7 w-7"><Ellipsis size={16}/></IconButton>
                      {menuFor === task._id && <>
                        <div className="fixed inset-0 z-30" onClick={() => setMenuFor(null)}/>
                        <div className="absolute right-0 top-8 z-40 w-44 rounded-lg border border-slate-200 bg-white p-1 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900">
                          <button onClick={() => { setMenuFor(null); onOpen(task); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Edit task</button>
                          <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Move to</p>
                          {columns.filter((item) => item.id !== column.id).map((item) => <button key={item.id} onClick={() => { setMenuFor(null); onMove(task._id, item.id); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800">{item.label}</button>)}
                          <div className="my-1 border-t border-slate-100 dark:border-slate-800"/>
                          <button onClick={() => { setMenuFor(null); onDelete(task); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">Delete task</button>
                        </div>
                      </>}
                    </div>
                  </td>
                </tr>;
              })}
              {!group.length && <tr><td colSpan={colSpan} className="px-4 py-6 text-center text-sm text-slate-400">No tasks in {column.label}</td></tr>}
            </tbody>
          </table>
          <button onClick={() => onNew(column.id)} className="flex h-10 w-full items-center gap-1.5 border-t border-slate-100 px-4 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"><Plus size={14}/>Add Task</button>
        </div>}
        {!isCollapsed && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
          {group.map((task) => <TaskCard key={task._id} task={task} fields={fields} onOpen={onOpen} onDelete={onDelete} onMove={onMove}/>)}
          {!group.length && <p className="col-span-full rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-700">No tasks in {column.label}</p>}
          <button onClick={() => onNew(column.id)} className="col-span-full flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"><Plus size={14}/>Add task</button>
        </div>}
      </section>;
    })}
  </div>;
});

const statusMeta = {
  todo: { label: "To Do", dot: "bg-slate-400" },
  doing: { label: "Doing", dot: "bg-sky-500" },
  completed: { label: "Completed", dot: "bg-emerald-500" },
  on_hold: { label: "On Hold", dot: "bg-amber-500" },
};
const priorityMeta = {
  none: { label: "No priority", text: "text-slate-400" },
  urgent: { label: "Urgent", text: "text-rose-600" },
  high: { label: "High", text: "text-red-500" },
  medium: { label: "Medium", text: "text-amber-600" },
  low: { label: "Low", text: "text-slate-500" },
};

function InlineSelect({ value, options, onChange, render }) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value) || options[0];
  return <div className="relative">
    <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">{render(current)}<ChevronDown size={13} className="text-slate-400"/></button>
    {open && <>
      <div className="fixed inset-0 z-30" onClick={() => setOpen(false)}/>
      <div className="absolute right-0 top-8 z-40 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        {options.map((option) => <button key={option.value} onClick={() => { onChange(option.value); setOpen(false); }} className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"><span className="flex items-center gap-1.5">{render(option)}</span>{value === option.value && <Check size={13}/>}</button>)}
      </div>
    </>}
  </div>;
}

const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  useDismissOnOutsideClick(pickerRef, () => setOpen(false));
  const selected = value ? new Date(value) : null;
  const [viewDate, setViewDate] = useState(selected || new Date());
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const startWeekday = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const days = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const isSelected = (day) => selected && day && selected.getFullYear() === viewDate.getFullYear() && selected.getMonth() === viewDate.getMonth() && selected.getDate() === day;
  return <div ref={pickerRef} className="relative">
    <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"><CalendarDays size={12}/>{value ? shortDate(value) : "Set date"}</button>
    {open && <div className="absolute right-0 top-8 z-40 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronDown size={14} className="rotate-90"/></button>
          <span className="text-xs font-semibold">{monthLabel}</span>
          <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronDown size={14} className="-rotate-90"/></button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-slate-400">{weekdayLabels.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-0.5">
          {days.map((day, index) => day ? <button type="button" key={index} onClick={() => { onChange(new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toISOString()); setOpen(false); }} className={`h-7 w-7 rounded-full text-xs ${isSelected(day) ? "bg-[hsl(var(--color-primary))] font-semibold text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>{day}</button> : <span key={index}/>)}
        </div>
        {value && <button type="button" onClick={() => { onChange(null); setOpen(false); }} className="mt-2 w-full rounded-md py-1 text-center text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40">Clear date</button>}
      </div>}
  </div>;
}

function TaskPanel({ task, tasks, teams, user, onClose, onSave, onDelete, onOpen, onCreateSubtask, onAddComment, onToggleWatch, onUploadAttachment, onRemoveAttachment, onArchive }) {
  const [draft, setDraft] = useState(task || {});
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [addingLabel, setAddingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activity, setActivity] = useState([]);
  const attachmentInputRef = useRef(null);
  useEffect(() => { api.get(`/tasks/${task?._id}/activity`).then((response) => setActivity(response.data.activity || [])).catch(() => {}); }, [task?._id]);
  if (!task) return null;
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const save = async () => { await onSave(draft._id, { title: draft.title, description: draft.description, priority: draft.priority, status: draft.status, startDate: draft.startDate || null, dueDate: draft.dueDate || null, labels: draft.labels || [], assignees: draft.assignees?.map((person) => person._id || person) || [] }); };
  const uploadAttachment = async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setUploading(true); try { await onUploadAttachment(task._id, file); } finally { setUploading(false); } };
  const togglePrivate = () => { const next = !draft.private; update("private", next); onSave(task._id, { private: next }, next ? "Task is now private" : "Task is now shared with the team"); };
  const toggleLock = () => {
    if (!isTaskManager) { toast.error("Only the reporter or a team owner/admin can lock or unlock this task."); return; }
    const next = !draft.locked;
    update("locked", next);
    onSave(task._id, { locked: next }, next ? "Task locked — only the reporter or a team owner/admin can edit it now" : "Task unlocked");
  };
  const copyLink = async () => {
    const url = `${window.location.origin}/dashboard?task=${task._id}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Unable to copy link"); }
  };
  const addLabel = (event) => {
    event.preventDefault();
    const value = labelInput.trim().slice(0, 40);
    if (value && !(draft.labels || []).includes(value) && (draft.labels || []).length < 12) update("labels", [...(draft.labels || []), value]);
    setLabelInput(""); setAddingLabel(false);
  };
  const removeLabel = (label) => update("labels", (draft.labels || []).filter((item) => item !== label));
  const addSubtask = async (event) => {
    event.preventDefault();
    const title = subtaskTitle.trim();
    if (!title) return;
    setSubtaskTitle("");
    await onCreateSubtask(task._id, title, task.team?._id || task.team || null);
  };
  const submitComment = async (event) => {
    event.preventDefault();
    const body = commentText.trim();
    if (!body) return;
    setPosting(true);
    try { await onAddComment(task._id, body); setCommentText(""); } finally { setPosting(false); }
  };
  const taskTeamId = task.team?._id || task.team || null;
  const taskTeam = teams?.find((item) => item._id === taskTeamId) || (task.team && typeof task.team === "object" ? task.team : null);
  const isTaskManager = String(task.reporter?._id || task.reporter) === String(user?.id) || isTeamManager(taskTeam, user?.id);
  const readOnly = Boolean(draft.locked) && !isTaskManager;
  const teamMembers = taskTeam?.members?.length ? taskTeam.members : (user ? [user] : []);
  const assigneeId = (draft.assignees?.[0] && (draft.assignees[0]._id || draft.assignees[0])) || user?.id;
  const assignee = teamMembers.find((member) => String(member._id) === String(assigneeId)) || task.assignees?.[0] || user;
  const subtasks = (tasks || []).filter((item) => item.parentTask && String(item.parentTask) === String(task._id));
  const watcherCount = task.watchers?.length || 0;
  const isWatching = (task.watchers || []).some((watcher) => String(watcher._id || watcher) === String(user?.id));
  const detailsFields = <div className={`divide-y divide-slate-100 dark:divide-slate-800 ${readOnly ? "pointer-events-none opacity-60" : ""}`}>
    <div className="flex items-center justify-between py-2 text-sm"><span className="text-slate-500 dark:text-slate-400">Status</span><InlineSelect value={displayStatus(draft.status)} onChange={(value) => update("status", value)} options={columns.map((column) => ({ value: column.id }))} render={(option) => <span className="flex items-center gap-1.5">{statusMeta[option.value] && <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[option.value].dot}`}/>}{statusMeta[option.value]?.label}</span>}/></div>
    <div className="flex items-center justify-between py-2 text-sm"><span className="text-slate-500 dark:text-slate-400">Priority</span><InlineSelect value={draft.priority || "none"} onChange={(value) => update("priority", value)} options={priorities.map((value) => ({ value }))} render={(option) => <span className={`font-medium ${priorityMeta[option.value]?.text}`}>{priorityMeta[option.value]?.label}</span>}/></div>
    <div className="flex items-center justify-between py-2.5 text-sm"><span className="text-slate-500 dark:text-slate-400">Assignee</span>{teamMembers.length > 1 ? <InlineSelect value={assigneeId} onChange={(value) => update("assignees", [value])} options={teamMembers.map((member) => ({ value: member._id }))} render={(option) => { const person = teamMembers.find((member) => member._id === option.value); return <span className="flex items-center gap-1.5"><Avatar user={person} size="sm"/><span className="font-medium">{person?.firstname || "Unknown"}</span></span>; }}/> : <span className="flex items-center gap-1.5"><Avatar user={assignee} size="sm"/><span className="font-medium">{assignee?.firstname || "You"}</span></span>}</div>
    <div className="flex items-center justify-between py-2.5 text-sm"><span className="text-slate-500 dark:text-slate-400">Dates</span><span className="flex items-center gap-1"><DatePicker value={draft.startDate} onChange={(value) => update("startDate", value)}/><span className="text-slate-300 dark:text-slate-600">→</span><DatePicker value={draft.dueDate} onChange={(value) => update("dueDate", value)}/></span></div>
    <div className="flex items-center justify-between py-2.5 text-sm"><span className="text-slate-500 dark:text-slate-400">Reporter</span><span className="flex items-center gap-1.5"><Avatar user={task.reporter} size="sm"/><span className="font-medium">{task.reporter?.firstname || "You"}</span></span></div>
  </div>;

  return <div className="fixed inset-0 z-40 flex items-stretch justify-center bg-slate-950/40 sm:items-center sm:p-6" role="presentation" onMouseDown={onClose}>
    <div onMouseDown={(event) => event.stopPropagation()} className="flex h-full w-full max-w-[90rem] overflow-hidden bg-white shadow-2xl dark:bg-slate-950 sm:h-[88vh] sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="task-detail-title">
      <div className="flex min-w-0 flex-1 flex-col lg:basis-[58%] lg:flex-none">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800 sm:px-5">
          <span className="hidden text-sm font-medium text-slate-500 sm:inline">Task details</span>
          <div className="flex items-center gap-1">
            <IconButton label={draft.locked ? (isTaskManager ? "Locked — click to unlock" : "Locked by the reporter or a team owner/admin") : "Click to lock this task from further edits"} onClick={toggleLock} disabled={draft.locked && !isTaskManager} className={draft.locked ? "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50" : "text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"}>{draft.locked ? <Lock size={17}/> : <Unlock size={18}/>}</IconButton>
            {taskTeamId && <IconButton label={draft.private ? "Private to assignees — click to share with the whole team" : "Shared with the whole team — click to make private"} onClick={togglePrivate} disabled={readOnly} className={draft.private ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50" : "text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"}>{draft.private ? <LockKeyhole size={17}/> : <LockOpen size={18}/>}</IconButton>}
            <IconButton label={isWatching ? "Stop watching" : "Watch this task"} onClick={() => onToggleWatch(task._id)} className={`gap-1 !w-auto px-2 ${isWatching ? "text-[hsl(var(--color-primary))]" : ""}`}><Eye size={17}/>{watcherCount > 0 && <span className="text-xs font-semibold">{watcherCount}</span>}</IconButton>
            <IconButton label="Copy link to this task" onClick={copyLink}><Link2 size={17}/></IconButton>
            {!readOnly && <div className="relative">
              <IconButton label="Task menu" onClick={() => setMenuOpen((o) => !o)}><Ellipsis size={18}/></IconButton>
              {menuOpen && <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)}/>
                <div className="absolute right-0 top-9 z-40 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"><button onClick={() => { setMenuOpen(false); onArchive(task); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><Archive size={13}/>{task.archivedAt ? "Restore task" : "Archive task"}</button><button onClick={() => { setMenuOpen(false); onDelete(task); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">Delete task</button></div>
              </>}
            </div>}
            <IconButton label={detailsOpen ? "Hide details" : "Show details"} onClick={() => setDetailsOpen((o) => !o)} className="hidden sm:inline-flex"><PanelRight size={18}/></IconButton>
            <IconButton label="Close task details" onClick={onClose} className="bg-rose-600 text-white shadow-sm hover:border-rose-700 hover:bg-rose-700 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-700"><X size={19}/></IconButton>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {readOnly && <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"><Lock size={13}/>This task is locked. Only the reporter or a team owner/admin can make changes.</p>}
          <input id="task-detail-title" value={draft.title} readOnly={readOnly} onChange={(event) => update("title", event.target.value)} maxLength={200} className="w-full border-0 bg-transparent p-0 text-2xl font-semibold outline-none focus:ring-0"/>
          <textarea value={draft.description || ""} readOnly={readOnly} onChange={(event) => update("description", event.target.value)} maxLength={4000} className="mt-2 min-h-16 w-full resize-none border-0 bg-transparent p-0 text-sm leading-6 text-slate-600 outline-none focus:ring-0 dark:text-slate-300" placeholder="Add a description…"/>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-5 text-sm dark:border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Properties</span>
            <span className="flex items-center gap-1.5"><Avatar user={assignee} size="sm"/><span className="text-slate-600 dark:text-slate-300">{assignee?.firstname || "You"}</span></span>
            {draft.dueDate && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-500 dark:bg-rose-950/40 dark:text-rose-400"><CalendarDays size={12}/>{shortDate(draft.dueDate)}</span>}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Labels</span>
            {(draft.labels || []).map((label) => <span key={label} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{label}{!readOnly && <button onClick={() => removeLabel(label)} aria-label={`Remove ${label}`} className="text-slate-400 hover:text-rose-500"><X size={11}/></button>}</span>)}
            {!readOnly && (addingLabel ? <form onSubmit={addLabel}><input autoFocus value={labelInput} onChange={(event) => setLabelInput(event.target.value)} onBlur={addLabel} maxLength={40} className="h-6 w-28 rounded-full border border-slate-300 bg-transparent px-2 text-xs outline-none focus:border-indigo-600 dark:border-slate-700"/></form> : (draft.labels || []).length < 12 && <button onClick={() => setAddingLabel(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-500 hover:border-slate-400 dark:border-slate-600"><Plus size={11}/>Add label</button>)}
          </div>

          <div className="mt-5 sm:hidden">
            <button type="button" onClick={() => setMobileDetailsOpen((open) => !open)} className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 px-3 text-sm font-medium dark:border-slate-700">
              <span>Details</span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${mobileDetailsOpen ? "rotate-180" : ""}`}/>
            </button>
            {mobileDetailsOpen && <div className="mt-2 rounded-lg border border-slate-200 px-3 dark:border-slate-700">{detailsFields}</div>}
          </div>

          <section className="mt-5"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Attachments</h3>{!readOnly && <><input ref={attachmentInputRef} onChange={uploadAttachment} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv" className="hidden"/><button onClick={() => attachmentInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 dark:hover:bg-indigo-950/30"><Paperclip size={14}/>{uploading ? "Uploading…" : "Add file"}</button></>}</div>{(task.attachments || []).length ? <div className="flex flex-wrap gap-2">{task.attachments.map((attachment) => <span key={attachment._id || attachment.url} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium dark:border-slate-700"><a href={attachment.url} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 hover:text-indigo-600"><Paperclip size={13}/><span className="max-w-36 truncate">{attachment.name}</span></a>{!readOnly && <button onClick={() => onRemoveAttachment(task._id, attachment._id)} aria-label={`Remove ${attachment.name}`} className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"><X size={13}/></button>}</span>)}</div> : <p className="text-xs text-slate-400">Attach PDFs, images, text files, or CSVs (up to 10 MB).</p>}</section>
          <section className="mt-7"><h3 className="mb-2 text-sm font-semibold">Activity</h3>{activity.length ? <div className="space-y-2">{activity.slice(0, 8).map((entry) => <div key={entry._id} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400"><Avatar user={entry.actor} size="sm"/><span><strong className="font-semibold text-slate-700 dark:text-slate-200">{entry.actor?.firstname || "Someone"}</strong> {entry.action.replaceAll("_", " ")}<span className="ml-1 text-slate-400">{shortDate(entry.createdAt)}</span></span></div>)}</div> : <p className="text-xs text-slate-400">No activity yet.</p>}</section>

          <section className="mt-7">
            <h3 className="mb-2 text-sm font-semibold">Subtasks</h3>
            <div className="space-y-2">
              {subtasks.map((subtask) => <article key={subtask._id} onClick={() => onOpen(subtask)} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{subtask.title}</span>
                {subtask.priority !== "none" && <Priority value={subtask.priority}/>}
                {subtask.dueDate && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-500 dark:bg-rose-950/40 dark:text-rose-400"><CalendarDays size={12}/>{shortDate(subtask.dueDate)}</span>}
                <IconButton label={`Delete ${subtask.title}`} onClick={(event) => { event.stopPropagation(); onDelete(subtask); }} className="h-7 w-7 shrink-0"><X size={14}/></IconButton>
              </article>)}
              {!subtasks.length && <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400 dark:border-slate-700">No subtasks yet</p>}
            </div>
            <form onSubmit={addSubtask} className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2 dark:border-slate-700"><Plus size={14} className="shrink-0 text-slate-400"/><input value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} maxLength={200} placeholder="Add subtask" className="h-7 flex-1 border-0 bg-transparent text-xs outline-none focus:ring-0"/>{subtaskTitle.trim() && <button type="submit" className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-950">Add</button>}</form>
          </section>

          <section className="mt-7">
            <h3 className="mb-3 text-sm font-semibold">Comments</h3>
            <div className="space-y-3">
              {(task.comments || []).map((comment) => <div key={comment._id} className="flex gap-2.5"><Avatar user={comment.author} size="sm"/><div className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900"><div className="flex items-center gap-2 text-xs"><span className="font-semibold">{comment.author?.firstname || "Someone"}</span><span className="text-slate-400">{shortDate(comment.createdAt)}</span></div><p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{comment.body}</p></div></div>)}
              {!(task.comments || []).length && <p className="text-xs text-slate-400">No comments yet.</p>}
            </div>
            {readOnly ? <p className="mt-4 text-xs text-slate-400">Commenting is disabled while this task is locked.</p> : <form onSubmit={submitComment} className="mt-4 flex items-center gap-2"><Avatar user={user} size="sm"/><input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={4000} placeholder="Leave a reply…" className="h-9 flex-1 rounded-lg border border-slate-200 bg-transparent px-3 text-sm outline-none focus:border-indigo-600 dark:border-slate-700"/><button disabled={posting || !commentText.trim()} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"><Send size={14}/></button></form>}
          </section>
        </div>
        <footer className="flex shrink-0 gap-2 border-t border-slate-200 p-4 dark:border-slate-800"><button onClick={save} disabled={readOnly} className="h-10 flex-1 rounded-lg bg-[hsl(var(--color-primary))] text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{readOnly ? <span className="inline-flex items-center justify-center gap-1.5"><Lock size={14}/>Locked</span> : "Save changes"}</button></footer>
      </div>
      {detailsOpen && <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-slate-200 p-5 dark:border-slate-800 sm:flex lg:w-[42%] lg:p-6">
        <h3 className="mb-2 text-sm font-semibold">Details</h3>
        {detailsFields}
      </aside>}
    </div>
  </div>;
}

export default function WorkspaceApp() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState(null); const [tasks, setTasks] = useState([]); const [projects, setProjects] = useState([]); const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true); const [page, setPage] = useState("tasks"); const [view, setView] = useState("board"); const [fields, setFields] = useState(defaultFields);
  const [query, setQuery] = useState(""); const [priority, setPriority] = useState("all"); const [menu, setMenu] = useState(null); const [mobileOpen, setMobileOpen] = useState(false); const [selected, setSelected] = useState(null); const [dialog, setDialog] = useState(null); const [profileOpen, setProfileOpen] = useState(false); const [profileMenu, setProfileMenu] = useState(null); const [workspaceOpen, setWorkspaceOpen] = useState(true); const [teamsOpen, setTeamsOpen] = useState(true); const [sidebarCollapsed, setSidebarCollapsed] = useState(false); const [accent, setAccent] = useState("blue"); const [activeTeamId, setActiveTeamId] = useState(null); const [teamModal, setTeamModal] = useState(null);
  const profileMenuRef = useRef(null);
  const closeProfileMenu = useCallback(() => { setProfileOpen(false); setProfileMenu(null); }, []);
  useDismissOnOutsideClick(profileMenuRef, closeProfileMenu);
  const mobileDrawerRef = useRef(null);
  const closeMobileDrawer = useCallback(() => setMobileOpen(false), []);
  useDismissOnOutsideClick(mobileDrawerRef, closeMobileDrawer);
  const validTeams = useMemo(() => teams.filter((team) => team?._id), [teams]);
  const activeTeam = validTeams.find((team) => team._id === activeTeamId) || null;
  const load = async () => { try { const [profile, taskResponse, projectResponse, teamResponse] = await Promise.all([api.get("/auth/profile"), api.get("/tasks"), api.get("/projects"), api.get("/teams")]); setUser(profile.data.user); setTasks((taskResponse.data.tasks || []).map(normalizeTeamRelation)); setProjects((projectResponse.data.projects || []).map(normalizeTeamRelation)); setTeams(teamResponse.data.teams || []); } catch (error) { toast.error(error.response?.data?.message || "Unable to load your workspace"); } finally { setLoading(false); } };
  useEffect(() => { load(); const saved = localStorage.getItem("accentColor"); if (saved && accentPalette[saved]) setAccent(saved); const savedTeam = localStorage.getItem("activeTeamId"); if (savedTeam) setActiveTeamId(savedTeam); }, []);
  useEffect(() => { if (activeTeamId) localStorage.setItem("activeTeamId", activeTeamId); else localStorage.removeItem("activeTeamId"); }, [activeTeamId]);
  useEffect(() => { if (activeTeamId && validTeams.length && !validTeams.some((team) => team._id === activeTeamId)) setActiveTeamId(null); }, [validTeams, activeTeamId]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("task");
    if (!taskId) return;
    setSelected({ _id: taskId });
    api.get(`/tasks/${taskId}`).then((response) => setSelected(response.data.task)).catch(() => {});
    const url = new URL(window.location.href);
    url.searchParams.delete("task");
    window.history.replaceState({}, "", url.toString());
  }, []);
  useEffect(() => {
    const value = accentPalette[accent]?.value;
    if (!value) return;
    document.documentElement.style.setProperty("--color-primary", value);
    document.documentElement.style.setProperty("--color-ring", value);
    document.documentElement.style.setProperty("--color-accent", value);
    localStorage.setItem("accentColor", accent);
  }, [accent]);
  // Search AND priority are both backend-powered (hit GET /tasks?search=&priority=
  // or /projects?search=&priority=) rather than filtering the already-loaded list
  // client-side, so both scale past what's currently in memory. Typing is
  // debounced to avoid a request per keystroke; priority changes (a single
  // discrete select, not free text) refetch immediately. Team/archived scoping
  // stays local since it's already free (no round trip) and instant. When
  // neither filter is active, no request is made and everything shows.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300); return () => window.clearTimeout(timer); }, [query]);
  const [searchMatch, setSearchMatch] = useState(null); // { page, ids: Set<string> } | null
  useEffect(() => {
    if (!debouncedQuery && priority === "all") { setSearchMatch(null); return; }
    let cancelled = false;
    const params = {};
    if (debouncedQuery) params.search = debouncedQuery;
    if (priority !== "all") params.priority = priority;
    api.get(page === "tasks" ? "/tasks" : "/projects", { params })
      .then((response) => {
        if (cancelled) return;
        const items = page === "tasks" ? response.data.tasks : response.data.projects;
        setSearchMatch({ page, ids: new Set((items || []).map((item) => item._id)) });
      })
      .catch(() => { if (!cancelled) setSearchMatch({ page, ids: new Set() }); });
    return () => { cancelled = true; };
  }, [debouncedQuery, priority, page]);
  const taskSearchIds = searchMatch?.page === "tasks" ? searchMatch.ids : null;
  const projectSearchIds = searchMatch?.page === "projects" ? searchMatch.ids : null;
  const shownTasks = useMemo(() => tasks.filter((task) => { if (task.parentTask || task.archivedAt) return false; const teamId = task.team?._id || task.team || null; const inScope = activeTeamId ? String(teamId) === String(activeTeamId) : !teamId; if (!inScope) return false; return !taskSearchIds || taskSearchIds.has(task._id); }), [tasks, taskSearchIds, activeTeamId]);
  const shownProjects = useMemo(() => projects.filter((project) => { if (project.archivedAt) return false; const teamId = project.team?._id || project.team || null; const inScope = activeTeamId ? String(teamId) === String(activeTeamId) : !teamId; if (!inScope) return false; return !projectSearchIds || projectSearchIds.has(project._id); }), [projects, projectSearchIds, activeTeamId]);
  const create = useCallback(async (kind, payload) => { try { const response = await api.post(`/${kind === "task" ? "tasks" : "projects"}`, { ...payload, ...(activeTeamId ? { team: activeTeamId } : {}) }); if (kind === "task") { setTasks((current) => [normalizeTeamRelation(response.data.task), ...current]); setQuery(""); setPriority("all"); } else setProjects((current) => [normalizeTeamRelation(response.data.project), ...current]); toast.success(`${kind === "task" ? "Task" : "Project"} created`); } catch (error) { toast.error(error.response?.data?.message || "Unable to save"); throw error; } }, [activeTeamId]);
  const updateTask = useCallback(async (id, patch, successMessage = "Task updated") => { try { const response = await api.put(`/tasks/${id}`, patch); setTasks((current) => current.map((item) => item._id === id ? response.data.task : item)); setSelected(response.data.task); toast.success(successMessage); } catch (error) { toast.error(error.response?.data?.message || "Unable to update task"); } }, []);
  const deleteTask = useCallback(async (task) => { if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return; try { await api.delete(`/tasks/${task._id}`); setTasks((current) => current.filter((item) => item._id !== task._id)); setSelected((current) => (current?._id === task._id ? null : current)); toast.success("Task deleted"); } catch (error) { toast.error(error.response?.data?.message || "Unable to delete task"); } }, []);
  const updateProject = useCallback(async (id, patch) => { try { const response = await api.put(`/projects/${id}`, patch); setProjects((current) => current.map((item) => item._id === id ? normalizeTeamRelation(response.data.project) : item)); if (patch.members) { const updatedTasks = new Map((response.data.tasks || []).map((task) => [task._id, normalizeTeamRelation(task)])); setTasks((current) => current.map((task) => updatedTasks.get(task._id) || task)); toast.success("Project members updated and assigned to its tasks"); } else { toast.success("Project updated"); } } catch (error) { toast.error(error.response?.data?.message || "Unable to update project"); throw error; } }, []);
  const deleteProject = useCallback(async (project) => { if (!window.confirm(`Delete "${project.title}"? Tasks linked to it will be kept but unlinked.`)) return; try { await api.delete(`/projects/${project._id}`); setProjects((current) => current.filter((item) => item._id !== project._id)); toast.success("Project deleted"); } catch (error) { toast.error(error.response?.data?.message || "Unable to delete project"); } }, []);
  const archiveProject = useCallback(async (project) => { try { const response = await api.put(`/projects/${project._id}`, { archived: true }); setProjects((current) => current.map((item) => item._id === project._id ? normalizeTeamRelation(response.data.project) : item)); toast.success("Project archived. Its tasks are kept safely."); } catch (error) { toast.error(error.response?.data?.message || "Unable to archive project"); } }, []);
  const openTask = useCallback(async (task) => { setSelected(task); try { const response = await api.get(`/tasks/${task._id}`); setSelected(response.data.task); } catch { /* keep the lightweight version already shown */ } }, []);
  const moveTask = useCallback((id, status, position) => updateTask(id, { status, ...(Number.isFinite(position) ? { position } : {}) }), [updateTask]);
  const openNewTask = useCallback((status) => setDialog({ kind: "task", ...(status ? { status } : {}) }), []);
  const openNewProject = useCallback(() => setDialog({ kind: "project" }), []);
  const editProject = useCallback((project) => setDialog({ kind: "project", id: project._id, initial: project }), []);
  const updateProjectMembers = useCallback((projectId, members) => updateProject(projectId, { members }), [updateProject]);
  const createSubtask = async (parentId, title, parentTeamId) => { try { const response = await api.post("/tasks", { title, parentTask: parentId, ...(parentTeamId ? { team: parentTeamId } : {}) }); setTasks((current) => [response.data.task, ...current]); toast.success("Subtask created"); } catch (error) { toast.error(error.response?.data?.message || "Unable to save"); } };
  const createTeam = async (name) => { try { const response = await api.post("/teams", { name }); setTeams((current) => [response.data.team, ...current]); setActiveTeamId(response.data.team._id); toast.success("Team created"); } catch (error) { toast.error(error.response?.data?.message || "Unable to create team"); throw error; } };
  const renameTeam = async (id, name) => { try { const response = await api.put(`/teams/${id}`, { name }); setTeams((current) => current.map((item) => item._id === id ? response.data.team : item)); toast.success("Team renamed"); } catch (error) { toast.error(error.response?.data?.message || "Unable to rename team"); } };
  const inviteMember = async (id, email, role = "editor") => { try { const response = await api.post(`/teams/${id}/members`, { email, role }); if (response.data.team) setTeams((current) => current.map((item) => item?._id === id ? response.data.team : item).filter(Boolean)); toast.success(response.data.message || "Invitation sent"); } catch (error) { toast.error(error.response?.data?.message || "Unable to send invitation"); } };
  const removeMember = async (id, memberId) => { try { const response = await api.delete(`/teams/${id}/members/${memberId}`); setTeams((current) => current.map((item) => item._id === id ? response.data.team : item)); if (String(memberId) === String(user.id)) { if (activeTeamId === id) setActiveTeamId(null); setTeamModal(null); } toast.success("Member removed"); } catch (error) { toast.error(error.response?.data?.message || "Unable to remove member"); } };
  const deleteTeamFn = async (id) => { if (!window.confirm("Delete this team? Its tasks and projects will become personal again.")) return; try { await api.delete(`/teams/${id}`); setTeams((current) => current.filter((item) => item._id !== id)); if (activeTeamId === id) setActiveTeamId(null); setTeamModal(null); toast.success("Team deleted"); } catch (error) { toast.error(error.response?.data?.message || "Unable to delete team"); } };
  const addComment = async (id, body) => { try { const response = await api.post(`/tasks/${id}/comments`, { body }); setTasks((current) => current.map((item) => item._id === id ? response.data.task : item)); setSelected((current) => (current?._id === id ? response.data.task : current)); } catch (error) { toast.error(error.response?.data?.message || "Unable to post comment"); } };
  const toggleWatch = async (id) => { try { const response = await api.post(`/tasks/${id}/watch`); setTasks((current) => current.map((item) => item._id === id ? response.data.task : item)); setSelected((current) => (current?._id === id ? response.data.task : current)); toast.success(response.data.watching ? "Watching task" : "Stopped watching"); } catch (error) { toast.error(error.response?.data?.message || "Unable to update watch status"); } };
  const uploadAttachment = async (id, file) => { try { const form = new FormData(); form.append("file", file); const response = await api.post(`/tasks/${id}/attachments`, form); setTasks((current) => current.map((item) => item._id === id ? { ...item, attachments: [...(item.attachments || []), response.data.attachment] } : item)); setSelected((current) => current?._id === id ? { ...current, attachments: [...(current.attachments || []), response.data.attachment] } : current); toast.success("Attachment added"); } catch (error) { toast.error(error.response?.data?.message || "Unable to upload attachment"); } };
  const removeAttachment = async (id, attachmentId) => { try { await api.delete(`/tasks/${id}/attachments/${attachmentId}`); const remove = (item) => ({ ...item, attachments: (item.attachments || []).filter((attachment) => attachment._id !== attachmentId) }); setTasks((current) => current.map((item) => item._id === id ? remove(item) : item)); setSelected((current) => current?._id === id ? remove(current) : current); toast.success("Attachment removed"); } catch (error) { toast.error(error.response?.data?.message || "Unable to remove attachment"); } };
  const archiveTask = async (task) => { await updateTask(task._id, { archived: !task.archivedAt }, task.archivedAt ? "Task restored" : "Task archived"); if (!task.archivedAt) setSelected(null); };
  const logOut = async () => { try { await api.post("/auth/logout"); } finally { clearAuth(); router.push("/auth/login"); } };
  const navItems = [{ id: "tasks", label: "Tasks", icon: LayoutGrid }, { id: "projects", label: "Projects", icon: FolderKanban }].map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setPage(id); setMobileOpen(false); }} className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium ${page === id ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}><Icon size={17} className={page === id ? "text-[hsl(var(--color-primary))]" : ""}/>{label}</button>);
  return <ProtectedRoute><div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100"><div className="flex min-h-screen">
    <aside className={`${sidebarCollapsed ? "hidden" : "hidden md:flex"} w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950`}>
      <div ref={profileMenuRef} className="relative border-b border-slate-200 p-3 dark:border-slate-800">
        <button onClick={() => setProfileOpen(!profileOpen)} className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-white dark:hover:bg-slate-900"><Avatar user={user} size="sm"/><span className="min-w-0 flex-1 truncate text-sm font-semibold">{user ? `${user.firstname} ${user.lastname}` : "Workspace"}</span><ChevronsUpDown size={15}/></button>
        {profileOpen && <div className="absolute left-3 right-3 top-14 z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="px-3 py-2"><p className="truncate text-sm font-semibold">{user ? `${user.firstname} ${user.lastname}` : "Workspace"}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p></div>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800"/>
          <button onClick={() => setProfileMenu(profileMenu === "theme" ? null : "theme")} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><span className="flex items-center gap-2"><Sun size={15}/>Change theme</span><ChevronDown size={13} className={`transition-transform ${profileMenu === "theme" ? "rotate-180" : ""}`}/></button>
          {profileMenu === "theme" && <div className="mb-1 ml-2 space-y-0.5 border-l border-slate-100 pl-2 dark:border-slate-800">{["light", "dark", "system"].map((value) => <button key={value} onClick={() => setTheme(value)} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs capitalize hover:bg-slate-100 dark:hover:bg-slate-800">{value}{theme === value && <Check size={12}/>}</button>)}</div>}
          <button onClick={() => setProfileMenu(profileMenu === "color" ? null : "color")} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full" style={{ background: `hsl(${accentPalette[accent]?.value})` }}/>Color mode</span><ChevronDown size={13} className={`transition-transform ${profileMenu === "color" ? "rotate-180" : ""}`}/></button>
          {profileMenu === "color" && <div className="mb-1 ml-2 space-y-0.5 border-l border-slate-100 pl-2 dark:border-slate-800">{Object.entries(accentPalette).map(([key, meta]) => <button key={key} onClick={() => setAccent(key)} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: `hsl(${meta.value})` }}/>{meta.label}</span>{accent === key && <Check size={12}/>}</button>)}</div>}
          <div className="my-1 border-t border-slate-100 dark:border-slate-800"/>
          <button onClick={() => router.push("/profile")} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><Settings size={15}/>Settings</button>
          <button onClick={logOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><LogOut size={15}/>Log out</button>
        </div>}
      </div>
      <button onClick={() => setWorkspaceOpen((open) => !open)} className="flex items-center gap-1.5 px-6 pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><ChevronDown size={12} className={`transition-transform ${workspaceOpen ? "" : "-rotate-90"}`}/>Workspace</button>
      {workspaceOpen && <nav className="space-y-1 px-3 pb-4">{navItems}</nav>}
      <button onClick={() => setTeamsOpen((open) => !open)} className="flex items-center gap-1.5 px-6 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><ChevronDown size={12} className={`transition-transform ${teamsOpen ? "" : "-rotate-90"}`}/>Teams</button>
      {teamsOpen && <nav className="space-y-0.5 px-3 pb-4">
        <button onClick={() => setActiveTeamId(null)} className={`flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium ${!activeTeamId ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}><UserRound size={15}/>Personal</button>
        {validTeams.map((team) => <div key={team._id} className="group flex items-center gap-0.5">
          <button onClick={() => setActiveTeamId(team._id)} className={`flex h-9 flex-1 min-w-0 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium ${activeTeamId === team._id ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}><Users size={15} className="shrink-0"/><span className="truncate">{team.name}</span></button>
          <button onClick={() => setTeamModal({ team })} aria-label={`Settings for ${team.name}`} className="flex h-9 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 hover:bg-slate-100 group-hover:opacity-100 dark:hover:bg-slate-800"><Settings size={13}/></button>
        </div>)}
        <button onClick={() => setTeamModal({ create: true })} className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"><Plus size={15}/>New team</button>
      </nav>}
      <div className="mt-auto border-t border-slate-200 p-4 text-xs leading-5 text-slate-500 dark:border-slate-800">Your data is visible only to your authenticated account and any teams you belong to.</div>
    </aside>
    {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-950/40 md:hidden" onClick={() => setMobileOpen(false)}>
      <aside ref={mobileDrawerRef} className="flex h-full w-[85vw] max-w-80 flex-col overflow-y-auto bg-white shadow-2xl dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-2"><Avatar user={user} size="sm"/><span className="min-w-0 truncate text-sm font-semibold">{user ? `${user.firstname} ${user.lastname}` : "Workspace"}</span></div>
          <IconButton label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18}/></IconButton>
        </div>
        <p className="truncate px-4 pt-3 text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>

        <div className="px-3 pt-4"><p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace</p><nav className="space-y-1">{navItems}</nav></div>

        <div className="px-3 pt-4">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Teams</p>
          <nav className="space-y-0.5">
            <button onClick={() => { setActiveTeamId(null); setMobileOpen(false); }} className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium ${!activeTeamId ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}><UserRound size={15}/>Personal</button>
            {validTeams.map((team) => <div key={team._id} className="flex items-center gap-0.5">
              <button onClick={() => { setActiveTeamId(team._id); setMobileOpen(false); }} className={`flex h-10 flex-1 min-w-0 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium ${activeTeamId === team._id ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}><Users size={15} className="shrink-0"/><span className="truncate">{team.name}</span></button>
              <button onClick={() => { setTeamModal({ team }); setMobileOpen(false); }} aria-label={`Settings for ${team.name}`} className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Settings size={14}/></button>
            </div>)}
            <button onClick={() => { setTeamModal({ create: true }); setMobileOpen(false); }} className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"><Plus size={15}/>New team</button>
          </nav>
        </div>

        <div className="mt-4 border-t border-slate-200 px-3 pt-4 dark:border-slate-800">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Theme</p>
          <div className="mb-3 grid grid-cols-3 gap-1 px-1">{["light", "dark", "system"].map((value) => <button key={value} onClick={() => setTheme(value)} className={`flex h-9 items-center justify-center rounded-md text-xs font-medium capitalize ${theme === value ? "bg-slate-100 dark:bg-slate-800" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"}`}>{value}</button>)}</div>
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Accent color</p>
          <div className="mb-3 flex flex-wrap gap-2 px-3">{Object.entries(accentPalette).map(([key, meta]) => <button key={key} onClick={() => setAccent(key)} aria-label={meta.label} title={meta.label} className={`h-8 w-8 rounded-full ring-2 ring-offset-2 dark:ring-offset-slate-950 ${accent === key ? "ring-slate-900 dark:ring-white" : "ring-transparent"}`} style={{ background: `hsl(${meta.value})` }}/>)}</div>
          <button onClick={() => { setMobileOpen(false); router.push("/profile"); }} className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"><Settings size={15}/>Settings</button>
          <button onClick={() => { setMobileOpen(false); logOut(); }} className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><LogOut size={15}/>Log out</button>
        </div>
      </aside>
    </div>}
    <main className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex min-h-16 items-center gap-2 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6"><IconButton label="Open navigation" onClick={() => setMobileOpen(true)} className="md:hidden"><Menu size={19}/></IconButton><IconButton label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"} onClick={() => setSidebarCollapsed((value) => !value)} className="hidden md:inline-flex"><PanelLeft size={18}/></IconButton><div className="hidden h-5 w-px bg-slate-200 dark:bg-slate-700 md:block"/><div className="flex min-w-0 flex-1 items-center gap-3"><h1 className="truncate text-lg font-semibold">{page === "tasks" ? "Tasks" : "Projects"}</h1><span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:inline">{activeTeam ? activeTeam.name : "Personal"}</span>{user && page === "tasks" && <span className="hidden items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 dark:border-slate-700 sm:inline-flex"><Avatar user={user} size="sm"/><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{shownTasks.length} active</span></span>}</div><div className="relative hidden sm:block"><Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-52 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-900 lg:w-72" placeholder={`Search ${page}`}/></div><NotificationButton/><div className="relative"><button onClick={() => setMenu(menu === "fields" ? null : "fields")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><SlidersHorizontal size={15}/><span className="hidden md:inline">Fields</span>{priority !== "all" && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--color-primary))]"/>}</button>{menu === "fields" && <FieldMenu view={view} setView={setView} fields={fields} setFields={setFields} priority={priority} setPriority={setPriority} page={page} close={() => setMenu(null)}/>}</div><button onClick={() => setDialog(page === "tasks" ? { kind: "task" } : { kind: "project" })} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[hsl(var(--color-primary))] px-3 text-sm font-semibold text-white hover:opacity-90"><Plus size={16}/><span>Add {page === "tasks" ? "Task" : "Project"}</span></button></header>
    <div className="px-4 py-5 sm:px-6 lg:px-8"><div className="mb-4 sm:hidden"><label className="relative block"><Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-900" placeholder={`Search ${page}`}/></label></div>{loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900"/>)}</div> : page === "tasks" ? <div className="overflow-x-auto pb-4">{view === "board" ? <TaskBoard tasks={shownTasks} fields={fields} onOpen={openTask} onMove={moveTask} onNew={openNewTask} onDelete={deleteTask}/> : <TaskList tasks={shownTasks} fields={fields} onOpen={openTask} onMove={moveTask} onNew={openNewTask} onDelete={deleteTask}/>}</div> : <ProjectTable projects={shownProjects} teams={validTeams} currentUser={user} fields={fields} onNew={openNewProject} onEdit={editProject} onDelete={deleteProject} onUpdateMembers={updateProjectMembers}/>}</div></main>
  </div>{dialog && <NewItemDialog kind={dialog.kind} initial={dialog.initial} projects={shownProjects} team={activeTeam} user={user} onClose={() => setDialog(null)} onSubmit={(payload) => dialog.id ? updateProject(dialog.id, payload) : create(dialog.kind, { ...payload, ...(dialog.status ? { status: dialog.status } : {}) })}/>} {selected && <TaskPanel key={selected._id} task={selected} tasks={tasks} teams={teams} user={user} onClose={() => setSelected(null)} onSave={updateTask} onDelete={deleteTask} onOpen={openTask} onCreateSubtask={createSubtask} onAddComment={addComment} onToggleWatch={toggleWatch} onUploadAttachment={uploadAttachment} onRemoveAttachment={removeAttachment} onArchive={archiveTask}/>} {teamModal && <TeamSettings team={teamModal.team} onClose={() => setTeamModal(null)} onCreate={createTeam} onRename={renameTeam} onInvite={inviteMember} onRemoveMember={removeMember} onDeleteTeam={deleteTeamFn} currentUserId={user?.id}/>}</div></ProtectedRoute>;
}

function MemberAvatars({ members = [], onAdd, label = "Manage members" }) {
  const visibleMembers = members.filter(Boolean).slice(0, 3);
  const remaining = Math.max(0, members.filter(Boolean).length - visibleMembers.length);
  return <div className="flex items-center"><div className="flex -space-x-1.5">{visibleMembers.map((member) => <span key={member._id || member} className="ring-2 ring-white dark:ring-slate-950"><Avatar user={member} size="sm"/></span>)}</div>{remaining > 0 && <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">+{remaining}</span>}{onAdd && <button type="button" onClick={onAdd} aria-label={label} title={label} className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-indigo-300 text-indigo-600 transition hover:border-indigo-500 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/40"><Plus size={14}/></button>}</div>;
}

function ProjectMembersDialog({ project, team, currentUser, onClose, onSave }) {
  const availableMembers = team?.members?.length ? team.members : (currentUser ? [currentUser] : []);
  const [selected, setSelected] = useState(() => (project.members || []).map((member) => String(member._id || member)));
  const [saving, setSaving] = useState(false);
  const toggleMember = (id) => setSelected((current) => current.includes(String(id)) ? current.filter((memberId) => memberId !== String(id)) : [...current, String(id)]);
  const submit = async (event) => { event.preventDefault(); setSaving(true); try { await onSave(project._id, selected); onClose(); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={onClose}><form onMouseDown={(event) => event.stopPropagation()} onSubmit={submit} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" aria-modal="true" role="dialog" aria-labelledby="project-members-title"><div className="mb-2 flex items-center justify-between"><div><h2 id="project-members-title" className="text-lg font-semibold">Project members</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose everyone working on this project.</p></div><IconButton label="Close" onClick={onClose} className="bg-rose-600 text-white shadow-sm hover:border-rose-700 hover:bg-rose-700 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-700"><X size={18}/></IconButton></div><div className="my-5 max-h-72 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">{availableMembers.map((member) => { const id = String(member._id); const checked = selected.includes(id); return <label key={id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"><input type="checkbox" checked={checked} onChange={() => toggleMember(id)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"/><Avatar user={member} size="sm"/><span className="min-w-0 flex-1 truncate text-sm font-medium">{member.firstname} {member.lastname}</span></label>; })}</div><p className="mb-5 text-xs leading-5 text-slate-500 dark:text-slate-400">People added here are assigned to existing tasks in this project and can access private project tasks.</p><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button><button disabled={saving} className="h-10 rounded-lg bg-[hsl(var(--color-primary))] px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save members"}</button></div></form></div>;
}

function ProjectActivityDialog({ project, onClose }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api.get(`/projects/${project._id}/activity`)
      .then((response) => { if (active) setActivity(response.data.activity || []); })
      .catch(() => { if (active) toast.error("Could not load project activity"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [project._id]);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={onClose}>
    <section onMouseDown={(event) => event.stopPropagation()} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="project-activity-title">
      <div className="flex items-start justify-between gap-4"><div><h2 id="project-activity-title" className="text-lg font-semibold">Project activity</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A record of changes to {project.title}.</p></div><IconButton label="Close" onClick={onClose} className="bg-rose-600 text-white shadow-sm hover:border-rose-700 hover:bg-rose-700 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-700"><X size={18}/></IconButton></div>
      <div className="mt-5 max-h-[60vh] space-y-4 overflow-y-auto pr-1">{loading ? <p className="py-8 text-center text-sm text-slate-500">Loading activity…</p> : activity.length ? activity.map((entry) => <div key={entry._id} className="flex gap-3"><Avatar user={entry.actor} size="sm"/><div className="min-w-0"><p className="text-sm font-medium">{entry.actor ? `${entry.actor.firstname || ""} ${entry.actor.lastname || ""}`.trim() : "Workspace"} <span className="font-normal text-slate-600 dark:text-slate-300">{entry.action}</span></p><p className="mt-0.5 text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</p></div></div>) : <p className="py-8 text-center text-sm text-slate-500">No project activity yet.</p>}</div>
    </section>
  </div>;
}

const ProjectCard = memo(function ProjectCard({ row, onEdit, onOpenActivity, onArchive, onDelete, onManageMembers }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { project, members, canManageMembers, totalTasks, completedTasks, progress } = row;
  return <article className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-start gap-2">
      <button onClick={onEdit} className="min-w-0 flex-1 text-left text-sm font-semibold leading-snug hover:text-indigo-600">{project.title}</button>
      <div className="relative -mr-1.5 -mt-1 shrink-0">
        <IconButton label={`More actions for ${project.title}`} onClick={() => setMenuOpen((open) => !open)} className="h-7 w-7"><Ellipsis size={16}/></IconButton>
        {menuOpen && <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)}/>
          <div onClick={(event) => event.stopPropagation()} className="absolute right-0 top-8 z-40 w-40 rounded-lg border border-slate-200 bg-white p-1 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <button onClick={() => { setMenuOpen(false); onEdit(); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Edit project</button>
            <button onClick={() => { setMenuOpen(false); onOpenActivity(); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Project activity</button>
            <button onClick={() => { setMenuOpen(false); onArchive(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"><Archive size={13}/>Archive project</button>
            <button onClick={() => { setMenuOpen(false); onDelete(); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">Delete project</button>
          </div>
        </>}
      </div>
    </div>
    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full bg-emerald-500" style={{ width: `${progress}%` }}/></span>{completedTasks}/{totalTasks}</div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <Priority value={project.priority}/>
      <MemberAvatars members={members} onAdd={canManageMembers ? onManageMembers : undefined} label={`Manage members for ${project.title}`}/>
    </div>
    {project.dueDate && <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Due {shortDate(project.dueDate)}</div>}
  </article>;
});

const ProjectTable = memo(function ProjectTable({ projects, tasks = [], teams, currentUser, fields, onNew, onEdit, onDelete, onArchive, onUpdateMembers }) {
  const [menuFor, setMenuFor] = useState(null);
  const [memberProject, setMemberProject] = useState(null);
  const [activityProject, setActivityProject] = useState(null);
  const [archivedIds, setArchivedIds] = useState([]);
  const archiveRow = async (project) => {
    if (onArchive) return onArchive(project);
    try { await api.put(`/projects/${project._id}`, { archived: true }); setArchivedIds((current) => [...current, project._id]); toast.success("Project archived. Its tasks are kept safely."); } catch (error) { toast.error(error.response?.data?.message || "Unable to archive project"); }
  };
  const colSpan = 2 + (fields.priority ? 1 : 0) + (fields.members ? 1 : 0) + (fields.dueDate ? 1 : 0);
  const rows = projects.filter((project) => !archivedIds.includes(project._id)).map((project) => {
    const members = project.members?.length ? project.members : (project.lead ? [project.lead] : []);
    const team = teams.find((item) => String(item._id) === String(project.team?._id || project.team));
    const ownerId = team?.owner?._id || team?.owner || project.user || project.lead?._id || project.lead;
    const canManageMembers = String(ownerId) === String(currentUser?.id);
    const projectTasks = tasks.length ? tasks.filter((task) => String(task.project?._id || task.project) === String(project._id) && !task.parentTask && !task.archivedAt) : Array.from({ length: project.taskSummary?.total || 0 });
    const completedTasks = tasks.length ? projectTasks.filter((task) => displayStatus(task.status) === "completed").length : project.taskSummary?.completed || 0;
    const progress = projectTasks.length ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
    return { project, members, canManageMembers, totalTasks: projectTasks.length, completedTasks, progress };
  });
  return <div>
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 lg:block">
    <table className="w-full min-w-[650px] text-left text-sm">
      <thead className="bg-slate-50 text-xs font-medium text-slate-500 dark:bg-slate-900">
        <tr>
          <th className="px-4 py-3">Project</th>
          {fields.priority && <th className="px-4 py-3">Priority</th>}
          {fields.members && <th className="px-4 py-3">Members</th>}
          {fields.dueDate && <th className="px-4 py-3">Due date</th>}
          <th className="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ project, members, canManageMembers, totalTasks, completedTasks, progress }) => {
          return <tr key={project._id} className="border-t border-slate-100 dark:border-slate-800">
            <td className="px-4 py-3"><span className="block font-medium">{project.title}</span><span className="mt-1 flex max-w-40 items-center gap-2 text-[11px] text-slate-500"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full bg-emerald-500" style={{ width: `${progress}%` }}/></span>{completedTasks}/{totalTasks}</span></td>
            {fields.priority && <td className="px-4 py-3"><Priority value={project.priority}/></td>}
            {fields.members && <td className="px-4 py-3"><MemberAvatars members={members} onAdd={canManageMembers ? () => setMemberProject(project) : undefined} label={`Manage members for ${project.title}`}/></td>}
            {fields.dueDate && <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{shortDate(project.dueDate)}</td>}
            <td className="px-4 py-3 text-right">
              <div className="relative inline-block">
                <IconButton label={`More actions for ${project.title}`} onClick={() => setMenuFor(menuFor === project._id ? null : project._id)} className="h-7 w-7"><Ellipsis size={16}/></IconButton>
                {menuFor === project._id && <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuFor(null)}/>
                  <div className="absolute right-0 top-8 z-40 w-36 rounded-lg border border-slate-200 bg-white p-1 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <button onClick={() => { setMenuFor(null); onEdit(project); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Edit project</button>
                    <button onClick={() => { setMenuFor(null); setActivityProject(project); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Project activity</button>
                    <button onClick={() => { setMenuFor(null); archiveRow(project); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"><Archive size={13}/>Archive project</button>
                    <button onClick={() => { setMenuFor(null); onDelete(project); }} className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">Delete project</button>
                  </div>
                </>}
              </div>
            </td>
          </tr>;
        })}
        {!projects.length && <tr><td colSpan={colSpan} className="px-4 py-12 text-center text-slate-500"><FolderKanban className="mx-auto mb-3"/>No projects yet.<br/><button onClick={onNew} className="mt-3 font-semibold text-indigo-600">Create your first project</button></td></tr>}
      </tbody>
    </table>
    {projects.length > 0 && <button onClick={onNew} className="flex h-10 w-full items-center gap-1.5 border-t border-slate-100 px-4 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"><Plus size={14}/>Add Project</button>}
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
      {rows.map((row) => <ProjectCard key={row.project._id} row={row} onEdit={() => onEdit(row.project)} onOpenActivity={() => setActivityProject(row.project)} onArchive={() => archiveRow(row.project)} onDelete={() => onDelete(row.project)} onManageMembers={() => setMemberProject(row.project)}/>)}
      {!projects.length && <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500 dark:border-slate-700"><FolderKanban className="mx-auto mb-3"/>No projects yet.<br/><button onClick={onNew} className="mt-3 font-semibold text-indigo-600">Create your first project</button></div>}
      {projects.length > 0 && <button onClick={onNew} className="col-span-full flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"><Plus size={14}/>Add Project</button>}
    </div>
    {memberProject && <ProjectMembersDialog project={memberProject} team={teams.find((team) => String(team._id) === String(memberProject.team?._id || memberProject.team))} currentUser={currentUser} onClose={() => setMemberProject(null)} onSave={onUpdateMembers}/>}
    {activityProject && <ProjectActivityDialog key={activityProject._id} project={activityProject} onClose={() => setActivityProject(null)}/>}
  </div>;
});
