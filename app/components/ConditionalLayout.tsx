"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { createClient } from "@/lib/supabase/client";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // =====================================================
  // CEK ROLE USER
  // =====================================================

  useEffect(() => {
    const supabase = createClient();

    const getRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRole(null);
        setLoadingRole(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        console.error(
          "Gagal mengambil role user:",
          error
        );

        setRole(null);
      } else {
        setRole(profile.role);
      }

      setLoadingRole(false);
    };

    getRole();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      getRole();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // =====================================================
  // LOGIN PAGE
  // =====================================================

  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  // =====================================================
  // LOADING ROLE
  // =====================================================

  if (loadingRole) {
    return (
      <div className="min-h-screen bg-gray-100">
        {children}
      </div>
    );
  }

  // =====================================================
  // USER ROLE
  // TIDAK MENGGUNAKAN SIDEBAR
  // =====================================================

  if (role === "user") {
    return (
      <div className="min-h-screen bg-gray-100">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    );
  }

  // =====================================================
  // ADMIN ROLE
  // MENGGUNAKAN SIDEBAR
  // =====================================================

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />

      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}