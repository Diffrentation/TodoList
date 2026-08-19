"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    api.get("/auth/profile")
      .then((response) => {
        if (active) router.replace(response.data.success ? "/dashboard" : "/auth/login");
      })
      .catch(() => {
        if (active) router.replace("/auth/login");
      });
    return () => { active = false; };
  }, [router]);

  return <main className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950" aria-label="Loading workspace">
    <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" aria-hidden="true"/>
  </main>;
}
