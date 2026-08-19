"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function PageReloadButton() {
  const [reloading, setReloading] = useState(false);
  const reload = () => {
    if (reloading) return;
    setReloading(true);
    window.location.reload();
  };

  return <button
    type="button"
    onClick={reload}
    aria-label="Reload current page"
    title="Reload page"
    className="fixed bottom-4 right-4 z-[60] inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-600 shadow-sm backdrop-blur transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-wait dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
    disabled={reloading}
  >
    <RefreshCw size={17} className={reloading ? "animate-spin" : ""}/>
  </button>;
}
