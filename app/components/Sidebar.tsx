"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type UserInfo = {
  email: string;
  name: string;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // =====================================================
  // GET LOGGED-IN USER
  // =====================================================

  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User";

        setUser({
          email: user.email || "",
          name,
        });
      } else {
        setUser(null);
      }

      setLoadingUser(false);
    };

    getUser();

    // =====================================================
    // LISTEN AUTH STATE
    // =====================================================

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const authUser = session.user;

          const name =
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            authUser.email?.split("@")[0] ||
            "User";

          setUser({
            email: authUser.email || "",
            name,
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    setLoggingOut(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);

      alert(`Gagal logout: ${error.message}`);

      setLoggingOut(false);

      return;
    }

    router.push("/login");
    router.refresh();
  };

  // =====================================================
  // MENU
  // =====================================================

  const menuItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: "📊",
    },
    {
      name: "All Issues",
      href: "/issues",
      icon: "📋",
    },
    {
      name: "Create Issue",
      href: "/issues/create",
      icon: "➕",
    },
    {
      name: "My Issues",
      href: "/my-issues",
      icon: "👤",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: "⚙️",
    },
  ];

  // =====================================================
  // ACTIVE MENU
  // =====================================================

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  };

  // =====================================================
  // SIDEBAR
  // =====================================================

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white p-6 flex flex-col">

      {/* =================================================
          LOGO
      ================================================= */}

      <div className="mb-8">
        <h1 className="text-xl font-bold">
          Issue Management
        </h1>

        <p className="text-xs text-slate-400 mt-1">
          Helpdesk System
        </p>
      </div>

      {/* =================================================
          LOGGED-IN USER
      ================================================= */}

      <div className="mb-8 p-4 rounded-xl bg-slate-800 border border-slate-700">

        <div className="flex items-center gap-3">

          {/* AVATAR */}

          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white uppercase">
            {loadingUser
              ? "..."
              : user?.name?.charAt(0) || "U"}
          </div>

          {/* USER INFO */}

          <div className="min-w-0 flex-1">

            <p className="text-sm font-semibold text-white truncate">
              {loadingUser
                ? "Loading..."
                : user?.name || "User"}
            </p>

            <p className="text-xs text-slate-400 truncate">
              {loadingUser
                ? "..."
                : user?.email || "No email"}
            </p>

          </div>

        </div>

      </div>

      {/* =================================================
          MENU
      ================================================= */}

      <nav className="space-y-2">

        {menuItems.map((item) => {

          const active = isActive(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                active
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >

              <span className="text-lg">
                {item.icon}
              </span>

              <span className="font-medium">
                {item.name}
              </span>

            </Link>
          );

        })}

      </nav>

      {/* =================================================
          LOGOUT
      ================================================= */}

      <div className="mt-4">

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-red-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
        >

          <span className="text-lg">
            🚪
          </span>

          <span className="font-medium">
            {loggingOut
              ? "Logging out..."
              : "Logout"}
          </span>

        </button>

      </div>

      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="mt-auto pt-6 border-t border-slate-700">

        <p className="text-xs text-slate-500">
          Issue Management System
        </p>

        <p className="text-xs text-slate-600 mt-1">
          Helpdesk & Monitoring
        </p>

      </div>

    </aside>
  );
}