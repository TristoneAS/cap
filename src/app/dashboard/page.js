"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "@/app/components/Dashboard";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const admin = localStorage.getItem("isAdmin") === "true";
    if (!admin) {
      router.replace("/dashboard/auditorias");
    }
  }, [router]);

  return <Dashboard />;
}
