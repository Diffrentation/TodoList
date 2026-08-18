"use client";

import toast, { ToastBar, Toaster } from "react-hot-toast";

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerStyle={{ top: 20, right: 20 }}
      toastOptions={{
        duration: 3600,
        style: {
          background: "transparent",
          boxShadow: "none",
          color: "inherit",
          maxWidth: "calc(100vw - 32px)",
          padding: 0,
        },
        success: { duration: 2800 },
        error: { duration: 4600 },
        ariaProps: { role: "status", "aria-live": "polite" },
      }}
    >
      {(notification) => (
        <ToastBar toast={notification}>
          {({ icon, message }) => {
            const isError = notification.type === "error";
            const isSuccess = notification.type === "success";
            const accent = isError
              ? "bg-rose-500"
              : isSuccess
                ? "bg-emerald-500"
                : "bg-indigo-500";
            return (
              <div
                className={`flex w-[min(22rem,calc(100vw-2rem))] items-center gap-3 overflow-hidden rounded-xl border bg-white p-3 shadow-lg shadow-slate-950/10 dark:bg-slate-950 ${
                  isError
                    ? "border-rose-200 text-slate-900 dark:border-rose-900/70 dark:text-slate-100"
                    : isSuccess
                      ? "border-emerald-200 text-slate-900 dark:border-emerald-900/70 dark:text-slate-100"
                      : "border-slate-200 text-slate-900 dark:border-slate-700 dark:text-slate-100"
                }`}
              >
                <span className={`h-9 w-1 shrink-0 rounded-full ${accent}`} aria-hidden />
                <span className="shrink-0" aria-hidden>{icon}</span>
                <div className="min-w-0 flex-1 pr-1">
                  <p className="text-sm font-medium leading-5 text-slate-700 dark:text-slate-200">{message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toast.dismiss(notification.id)}
                  aria-label="Dismiss notification"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <span aria-hidden>×</span>
                </button>
              </div>
            );
          }}
        </ToastBar>
      )}
    </Toaster>
  );
}
