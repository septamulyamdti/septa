"use client";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="p-2.5 sm:p-3 lg:p-4 max-w-7xl mx-auto">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="sticky top-0 z-30 -mx-2.5 sm:-mx-3 lg:-mx-4 px-2.5 sm:px-3 lg:px-4 pt-0 pb-2 bg-slate-50">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

          <div className="min-w-0">
            <p className="text-[10px] text-slate-500">
              System Configuration
            </p>

            <h1 className="text-lg sm:text-xl font-bold text-slate-800">
              Settings
            </h1>

            <p className="text-[11px] text-slate-500">
              Manage your account and application settings
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            ← Back to Dashboard
          </Link>

        </div>
      </div>

      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="space-y-2.5">

        {/* =================================================
            PROFILE
        ================================================= */}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-3 py-2.5">
            <h2 className="text-sm font-bold text-slate-800">
              Profile
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-500">
              User information for the current account
            </p>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

              {/* NAME */}

              <div>
                <p className="text-[10px] text-slate-500">
                  Name
                </p>

                <p className="mt-0.5 text-xs font-semibold text-slate-800">
                  Septa Mulya
                </p>
              </div>

              {/* ROLE */}

              <div>
                <p className="text-[10px] text-slate-500">
                  Role
                </p>

                <p className="mt-0.5 text-xs font-semibold text-slate-800">
                  Administrator
                </p>
              </div>

              {/* EMAIL */}

              <div>
                <p className="text-[10px] text-slate-500">
                  Email
                </p>

                <p className="mt-0.5 text-xs font-semibold text-slate-800">
                  Not configured
                </p>
              </div>

              {/* ACCOUNT STATUS */}

              <div>
                <p className="text-[10px] text-slate-500">
                  Account Status
                </p>

                <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Active
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* =================================================
            APPLICATION
        ================================================= */}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-3 py-2.5">
            <h2 className="text-sm font-bold text-slate-800">
              Application
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-500">
              General information about this application
            </p>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

              {/* APPLICATION NAME */}

              <div>
                <p className="text-[10px] text-slate-500">
                  Application Name
                </p>

                <p className="mt-0.5 text-xs font-semibold text-slate-800">
                  Helpdesk System
                </p>
              </div>

              {/* VERSION */}

              <div>
                <p className="text-[10px] text-slate-500">
                  Version
                </p>

                <p className="mt-0.5 text-xs font-semibold text-slate-800">
                  1.0.0
                </p>
              </div>

              {/* DESCRIPTION */}

              <div className="md:col-span-2">
                <p className="text-[10px] text-slate-500">
                  Description
                </p>

                <p className="mt-0.5 text-xs leading-5 text-slate-700">
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

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-3 py-2.5">
            <h2 className="text-sm font-bold text-slate-800">
              Appearance
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-500">
              Current application appearance settings
            </p>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

              {/* FONT */}

              <div>
                <p className="text-[10px] text-slate-500">
                  Font
                </p>

                <p className="mt-0.5 text-xs font-semibold text-slate-800">
                  Century Gothic
                </p>
              </div>

              {/* THEME */}

              <div>
                <p className="text-[10px] text-slate-500">
                  Theme
                </p>

                <span className="mt-0.5 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                  Light
                </span>
              </div>

              {/* UI STYLE */}

              <div>
                <p className="text-[10px] text-slate-500">
                  Interface Style
                </p>

                <p className="mt-0.5 text-xs font-semibold text-slate-800">
                  Clean & Professional
                </p>
              </div>

              {/* STATUS */}

              <div>
                <p className="text-[10px] text-slate-500">
                  Appearance Status
                </p>

                <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Active
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* =================================================
            SYSTEM INFORMATION
        ================================================= */}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-3 py-2.5">
            <h2 className="text-sm font-bold text-slate-800">
              System Information
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-500">
              Technical information about the application
            </p>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

              {/* DATABASE */}

              <div>
                <p className="text-[10px] text-slate-500">
                  Database
                </p>

                <p className="mt-0.5 text-xs font-semibold text-slate-800">
                  Supabase
                </p>
              </div>

              {/* FRAMEWORK */}

              <div>
                <p className="text-[10px] text-slate-500">
                  Framework
                </p>

                <p className="mt-0.5 text-xs font-semibold text-slate-800">
                  Next.js
                </p>
              </div>

              {/* FRONTEND */}

              <div>
                <p className="text-[10px] text-slate-500">
                  Frontend
                </p>

                <p className="mt-0.5 text-xs font-semibold text-slate-800">
                  React + Tailwind CSS
                </p>
              </div>

              {/* SYSTEM STATUS */}

              <div>
                <p className="text-[10px] text-slate-500">
                  System Status
                </p>

                <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Operational
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* =================================================
            INFORMATION
        ================================================= */}

        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">

          <div className="flex gap-2.5">

            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              i
            </div>

            <div className="min-w-0">

              <h2 className="text-xs font-bold text-slate-800">
                About Helpdesk System
              </h2>

              <p className="mt-0.5 text-[11px] leading-5 text-slate-600">
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