"use client";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <p className="text-sm text-slate-500 mb-1">
            System Configuration
          </p>

          <h1 className="text-3xl font-bold text-slate-800">
            Settings
          </h1>

          <p className="text-slate-500 mt-1">
            Manage your account and application settings
          </p>
        </div>

        <Link
          href="/"
          className="px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-sm text-slate-700 transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="space-y-6">
        {/* =================================================
            PROFILE
        ================================================= */}

        <section className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">
              Profile
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              User information for the current account
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* NAME */}

              <div>
                <p className="text-sm text-slate-500">
                  Name
                </p>

                <p className="font-semibold text-slate-800 mt-1">
                  Septa Mulya
                </p>
              </div>

              {/* ROLE */}

              <div>
                <p className="text-sm text-slate-500">
                  Role
                </p>

                <p className="font-semibold text-slate-800 mt-1">
                  Administrator
                </p>
              </div>

              {/* EMAIL */}

              <div>
                <p className="text-sm text-slate-500">
                  Email
                </p>

                <p className="font-semibold text-slate-800 mt-1">
                  Not configured
                </p>
              </div>

              {/* ACCOUNT STATUS */}

              <div>
                <p className="text-sm text-slate-500">
                  Account Status
                </p>

                <span className="inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            APPLICATION
        ================================================= */}

        <section className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">
              Application
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              General information about this application
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* APPLICATION NAME */}

              <div>
                <p className="text-sm text-slate-500">
                  Application Name
                </p>

                <p className="font-semibold text-slate-800 mt-1">
                  Issue Management System
                </p>
              </div>

              {/* VERSION */}

              <div>
                <p className="text-sm text-slate-500">
                  Version
                </p>

                <p className="font-semibold text-slate-800 mt-1">
                  1.0.0
                </p>
              </div>

              {/* DESCRIPTION */}

              <div className="md:col-span-2">
                <p className="text-sm text-slate-500">
                  Description
                </p>

                <p className="text-slate-700 mt-1">
                  Issue and Helpdesk Management System
                  untuk monitoring, tracking, dan
                  penyelesaian issue.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            APPEARANCE
        ================================================= */}

        <section className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">
              Appearance
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Current application appearance settings
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* FONT */}

              <div>
                <p className="text-sm text-slate-500">
                  Font
                </p>

                <p className="font-semibold text-slate-800 mt-1">
                  Century Gothic
                </p>
              </div>

              {/* THEME */}

              <div>
                <p className="text-sm text-slate-500">
                  Theme
                </p>

                <span className="inline-flex items-center mt-1 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                  Light
                </span>
              </div>

              {/* UI STYLE */}

              <div>
                <p className="text-sm text-slate-500">
                  Interface Style
                </p>

                <p className="font-semibold text-slate-800 mt-1">
                  Clean & Professional
                </p>
              </div>

              {/* STATUS */}

              <div>
                <p className="text-sm text-slate-500">
                  Appearance Status
                </p>

                <span className="inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            SYSTEM INFORMATION
        ================================================= */}

        <section className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">
              System Information
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Technical information about the application
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DATABASE */}

              <div>
                <p className="text-sm text-slate-500">
                  Database
                </p>

                <p className="font-semibold text-slate-800 mt-1">
                  Supabase
                </p>
              </div>

              {/* FRAMEWORK */}

              <div>
                <p className="text-sm text-slate-500">
                  Framework
                </p>

                <p className="font-semibold text-slate-800 mt-1">
                  Next.js
                </p>
              </div>

              {/* FRONTEND */}

              <div>
                <p className="text-sm text-slate-500">
                  Frontend
                </p>

                <p className="font-semibold text-slate-800 mt-1">
                  React + Tailwind CSS
                </p>
              </div>

              {/* SYSTEM STATUS */}

              <div>
                <p className="text-sm text-slate-500">
                  System Status
                </p>

                <span className="inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Operational
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            INFORMATION
        ================================================= */}

        <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
              i
            </div>

            <div>
              <h2 className="font-bold text-slate-800">
                About Issue Management System
              </h2>

              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Sistem ini digunakan untuk mencatat,
                memonitor, dan mengelola issue dari
                proses pelaporan sampai issue selesai
                dan ditutup.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}