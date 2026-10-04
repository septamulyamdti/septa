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
  const [userId, setUserId] = useState<string | null>(null);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [whatsappNotificationCount, setWhatsappNotificationCount] =
    useState(0);

  const [whatsappAgentCount, setWhatsappAgentCount] = useState(0);

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

        setUserId(user.id);
      } else {
        setUser(null);
        setUserId(null);
      }

      setLoadingUser(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

        setUserId(authUser.id);
      } else {
        setUser(null);
        setUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // =====================================================
  // WHATSAPP ISSUE NOTIFICATION
  // =====================================================

  useEffect(() => {
    if (!userId) {
      setWhatsappNotificationCount(0);
      return;
    }

    const supabase = createClient();

    let isMounted = true;

    // ===================================================
    // GET LAST SEEN
    // ===================================================

    const getLastSeen = async () => {
      const { data, error } = await supabase
        .from("issue_notification_reads")
        .select("last_seen_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error(
          "GET NOTIFICATION LAST SEEN ERROR:",
          error
        );

        return null;
      }

      return data?.last_seen_at || null;
    };

    // ===================================================
    // CREATE / UPDATE LAST SEEN
    // ===================================================

    const updateLastSeen = async () => {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("issue_notification_reads")
        .upsert(
          {
            user_id: userId,
            last_seen_at: now,
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) {
        console.error(
          "UPDATE NOTIFICATION LAST SEEN ERROR:",
          error
        );

        return;
      }

      if (isMounted) {
        setWhatsappNotificationCount(0);
      }
    };

    // ===================================================
    // GET NOTIFICATION COUNT
    // ===================================================

    const loadNotificationCount = async () => {
      /*
       * HANYA halaman All Issues yang dianggap
       * sudah melihat notification.
       */

      if (pathname === "/issues") {
        await updateLastSeen();
        return;
      }

      const lastSeen = await getLastSeen();

      /*
       * Jika belum pernah ada record last_seen,
       * gunakan waktu sekarang sebagai titik awal.
       */

      if (!lastSeen) {
        await updateLastSeen();
        return;
      }

      const { count, error } = await supabase
        .from("issues")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("source", "WhatsApp")
        .gt("created_at", lastSeen);

      if (error) {
        console.error(
          "GET WHATSAPP NOTIFICATION COUNT ERROR:",
          error
        );

        return;
      }

      if (isMounted) {
        setWhatsappNotificationCount(count || 0);
      }
    };

    loadNotificationCount();

    // ===================================================
    // REALTIME: NEW WHATSAPP ISSUE
    // ===================================================

    const channel = supabase
      .channel(
        `whatsapp-issue-notifications-${userId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "issues",
        },
        (payload) => {
          const newIssue = payload.new as {
            id?: number;
            source?: string;
            created_at?: string;
          };

          if (newIssue.source !== "WhatsApp") {
            return;
          }

          if (pathname === "/issues") {
            return;
          }

          setWhatsappNotificationCount(
            (current) => current + 1
          );
        }
      )
      .subscribe((status) => {
        console.log(
          "WHATSAPP ISSUE REALTIME STATUS:",
          status
        );
      });

    // ===================================================
    // POLLING FALLBACK
    // ===================================================

    const interval = window.setInterval(() => {
      loadNotificationCount();
    }, 10000);

    return () => {
      isMounted = false;

      window.clearInterval(interval);

      supabase.removeChannel(channel);
    };
  }, [userId, pathname]);

  // =====================================================
  // WHATSAPP AGENT NOTIFICATION
  // =====================================================

  useEffect(() => {
    if (!userId) {
      setWhatsappAgentCount(0);
      return;
    }

    const supabase = createClient();

    let isMounted = true;

    // ===================================================
    // GET AGENT CONVERSATION COUNT
    // ===================================================

    const loadAgentCount = async () => {
      /*
       * Hitung SEMUA conversation yang saat ini
       * berada pada state AGENT.
       *
       * Badge tetap ditampilkan di semua halaman,
       * termasuk halaman /whatsapp-agent.
       */

      const { count, error } = await supabase
        .from("whatsapp_conversations")
        .select("phone_number", {
          count: "exact",
          head: true,
        })
        .eq("state", "AGENT");

      if (error) {
        console.error(
          "GET WHATSAPP AGENT COUNT ERROR:",
          error
        );

        return;
      }

      if (isMounted) {
        setWhatsappAgentCount(count || 0);
      }
    };

    loadAgentCount();

    // ===================================================
    // REALTIME: WHATSAPP AGENT CONVERSATION
    // ===================================================

    const channel = supabase
      .channel(
        `whatsapp-agent-notifications-${userId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_conversations",
        },
        () => {
          /*
           * Jangan langsung menambah / mengurangi angka.
           *
           * Kita ambil ulang jumlah AGENT dari database
           * supaya angka selalu sesuai kondisi sebenarnya.
           */

          loadAgentCount();
        }
      )
      .subscribe((status) => {
        console.log(
          "WHATSAPP AGENT REALTIME STATUS:",
          status
        );
      });

    // ===================================================
    // POLLING FALLBACK
    // ===================================================

    const interval = window.setInterval(() => {
      loadAgentCount();
    }, 5000);

    return () => {
      isMounted = false;

      window.clearInterval(interval);

      supabase.removeChannel(channel);
    };
  }, [userId, pathname]);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    setLoggingOut(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(
        "Logout error:",
        error
      );

      alert(
        `Gagal logout: ${error.message}`
      );

      setLoggingOut(false);

      return;
    }

    setWhatsappNotificationCount(0);
    setWhatsappAgentCount(0);

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
      name: "WhatsApp Agent",
      href: "/whatsapp-agent",
      icon: "💬",
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
    <aside
      className="
        fixed left-0 top-0 z-50
        flex h-screen w-64 flex-col
        bg-slate-900
        px-4 py-4
        text-white
      "
    >
      {/* =================================================
          LOGO
      ================================================= */}

      <div className="mb-4 shrink-0 px-1">
        <h1 className="text-lg font-bold tracking-tight">
          Helpdesk System
        </h1>

        <p className="mt-0.5 text-[11px] text-slate-400">
          Helpdesk System
        </p>
      </div>

      {/* =================================================
          LOGGED-IN USER
      ================================================= */}

      <div
        className="
          mb-4 shrink-0
          rounded-lg
          border border-slate-700
          bg-slate-800/80
          px-3 py-2.5
        "
      >
        <div className="flex items-center gap-2.5">
          <div
            className="
              flex h-8 w-8 shrink-0
              items-center justify-center
              rounded-full
              bg-blue-600
              text-xs font-bold uppercase
              text-white
            "
          >
            {loadingUser
              ? "..."
              : user?.name?.charAt(0) || "U"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {loadingUser
                ? "Loading..."
                : user?.name || "User"}
            </p>

            <p className="truncate text-[11px] text-slate-400">
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

      <nav
        className="
          flex-1
          space-y-0.5
          overflow-y-auto
          pr-0.5

          [scrollbar-width:thin]
          [scrollbar-color:#334155_transparent]

          [&::-webkit-scrollbar]:w-1
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-slate-700
          hover:[&::-webkit-scrollbar-thumb]:bg-slate-600
        "
      >
        {menuItems.map((item) => {
          const active = isActive(item.href);

          const isAllIssues =
            item.href === "/issues";

          const isWhatsAppAgent =
            item.href === "/whatsapp-agent";

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center gap-2.5
                rounded-lg
                px-3 py-2
                text-sm
                transition

                ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }
              `}
            >
              <span className="flex w-5 shrink-0 items-center justify-center text-sm">
                {item.icon}
              </span>

              <span className="flex-1 font-medium">
                {item.name}
              </span>

              {/* =========================================
                  ALL ISSUES WHATSAPP NOTIFICATION
              ========================================= */}

              {isAllIssues &&
                whatsappNotificationCount > 0 && (
                  <span
                    className="
                      flex h-5 min-w-5
                      items-center justify-center
                      rounded-full
                      bg-red-600
                      px-1.5
                      text-[10px]
                      font-bold
                      text-white
                      shadow-sm
                    "
                    title={`${whatsappNotificationCount} issue baru dari WhatsApp`}
                  >
                    {whatsappNotificationCount}
                  </span>
                )}

              {/* =========================================
                  WHATSAPP AGENT NOTIFICATION
              ========================================= */}

              {isWhatsAppAgent &&
                whatsappAgentCount > 0 && (
                  <span
                    className={`
                      flex h-5 min-w-5
                      items-center justify-center
                      rounded-full
                      bg-red-600
                      px-1.5
                      text-[10px]
                      font-bold
                      text-white
                      shadow-sm

                      ${
                        !active
                          ? "animate-pulse"
                          : ""
                      }
                    `}
                    title={`${whatsappAgentCount} customer menunggu Agent`}
                  >
                    {whatsappAgentCount}
                  </span>
                )}
            </Link>
          );
        })}
      </nav>

      {/* =================================================
          LOGOUT
      ================================================= */}

      <div className="mt-2 shrink-0 border-t border-slate-700 pt-2">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="
            flex w-full items-center gap-2.5
            rounded-lg
            px-3 py-2
            text-sm
            text-slate-300
            transition
            hover:bg-red-600
            hover:text-white
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <span className="flex w-5 shrink-0 items-center justify-center text-sm">
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

      <div className="mt-2 shrink-0 border-t border-slate-700 pt-2.5 px-1">
        <p className="text-[11px] text-slate-500">
          Helpdesk System
        </p>

        <p className="mt-0.5 text-[11px] text-slate-600">
          Helpdesk & Monitoring
        </p>
      </div>
    </aside>
  );
}