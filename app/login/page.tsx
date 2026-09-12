"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage(
        "Email dan password wajib diisi."
      );
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // ==========================================
    // LOGIN
    // ==========================================

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      console.error("Login error:", error);

      setLoading(false);

      setErrorMessage(
        "Email atau password salah. Silakan periksa kembali."
      );

      return;
    }

    // ==========================================
    // USER BERHASIL LOGIN
    // ==========================================

    if (!data.user) {
      setLoading(false);

      setErrorMessage(
        "Login berhasil tetapi data user tidak ditemukan."
      );

      return;
    }

    // ==========================================
    // AMBIL ROLE USER
    // ==========================================

    const { data: profile, error: profileError } =
      await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

    if (profileError || !profile) {
      console.error(
        "Gagal mengambil role user:",
        profileError
      );

      await supabase.auth.signOut();

      setLoading(false);

      setErrorMessage(
        "Profil user tidak ditemukan. Silakan hubungi administrator."
      );

      return;
    }

    // ==========================================
    // REDIRECT BERDASARKAN ROLE
    // ==========================================

    if (profile.role === "admin") {
      router.replace("/");
    } else if (profile.role === "user") {
      router.replace("/issues/create");
    } else {
      await supabase.auth.signOut();

      setLoading(false);

      setErrorMessage(
        "Role user tidak dikenali. Silakan hubungi administrator."
      );

      return;
    }

    router.refresh();
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* LOGIN CARD */}

        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* LOGO / TITLE */}

          <div className="text-center mb-8">

            <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-md">
              <span className="text-white text-2xl font-bold">
                IM
              </span>
            </div>

            <h1 className="text-3xl font-bold text-slate-800">
              Issue Management
            </h1>

            <p className="text-sm text-slate-500 mt-2">
              Sign in to your account
            </p>

          </div>

          {/* ERROR */}

          {errorMessage && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">
                {errorMessage}
              </p>
            </div>
          )}

          {/* FORM */}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* EMAIL */}

            <div>

              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="nama@email.com"
                autoComplete="email"
                disabled={loading}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                required
              />

            </div>

            {/* PASSWORD */}

            <div>

              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Masukkan password"
                autoComplete="current-password"
                disabled={loading}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                required
              />

            </div>

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition shadow-sm"
            >
              {loading
                ? "Signing in..."
                : "Sign In"}
            </button>

          </form>

          {/* FOOTER */}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">

            <p className="text-xs text-slate-400">
              Issue Management System
            </p>

          </div>

        </div>

      </div>
    </main>
  );
}