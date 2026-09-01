"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Issue = {
  id: number;
  issue_code: string;
  title: string;
  category: string;
  priority: string;
  location: string;
  status: string;
  assignee?: string;
  description?: string;
  resolution?: string;
  created_at?: string;
  updated_at?: string;
};

function IssuesPageContent() {
  const searchParams = useSearchParams();

  const statusFromUrl = searchParams.get("status");

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    statusFromUrl || "All"
  );
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  // =====================================================
  // GET ISSUES
  // =====================================================

  const fetchIssues = async () => {
    setLoading(true);

    let query = supabase
      .from("issues")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    // Filter berdasarkan status dari Dashboard
    if (
      statusFromUrl &&
      [
        "Open",
        "On Progress",
        "Resolved",
        "Closed",
      ].includes(statusFromUrl)
    ) {
      query = query.eq("status", statusFromUrl);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get issues error:", error);
      setIssues([]);
    } else {
      setIssues(data || []);
    }

    setLoading(false);
  };

  // =====================================================
  // FETCH WHEN URL STATUS CHANGES
  // =====================================================

  useEffect(() => {
    setStatusFilter(statusFromUrl || "All");
    fetchIssues();
  }, [statusFromUrl]);

  // =====================================================
  // STATUS STYLE
  // =====================================================

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-700";

      case "On Progress":
        return "bg-yellow-100 text-yellow-700";

      case "Resolved":
        return "bg-green-100 text-green-700";

      case "Closed":
        return "bg-slate-200 text-slate-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  // =====================================================
  // PRIORITY STYLE
  // =====================================================

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "bg-red-100 text-red-700";

      case "High":
        return "bg-orange-100 text-orange-700";

      case "Medium":
        return "bg-yellow-100 text-yellow-700";

      case "Low":
        return "bg-green-100 text-green-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date?: string) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // =====================================================
  // LOCATION LIST
  // =====================================================

  const locations = useMemo(() => {
    const uniqueLocations = Array.from(
      new Set(
        issues
          .map((issue) => issue.location)
          .filter(Boolean)
      )
    );

    return uniqueLocations.sort();
  }, [issues]);

  // =====================================================
  // FILTER LIST
  // =====================================================

  const filteredIssues = issues.filter((issue) => {
    const searchValue = search
      .toLowerCase()
      .trim();

    const searchMatch =
      searchValue === "" ||
      issue.issue_code
        .toLowerCase()
        .includes(searchValue);

    const statusMatch =
      statusFilter === "All" ||
      issue.status === statusFilter;

    const priorityMatch =
      priorityFilter === "All" ||
      issue.priority === priorityFilter;

    const locationMatch =
      locationFilter === "All" ||
      issue.location === locationFilter;

    return (
      searchMatch &&
      statusMatch &&
      priorityMatch &&
      locationMatch
    );
  });

  // =====================================================
  // RESET FILTER
  // =====================================================

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setLocationFilter("All");

    window.history.replaceState(
      null,
      "",
      "/issues"
    );

    fetchIssues();
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">
          Loading issues...
        </div>
      </main>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">

        <div>
          <p className="text-sm text-slate-500 mb-1">
            Issue Management
          </p>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            All Issues
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Daftar seluruh issue yang tercatat.
          </p>
        </div>

        <Link
          href="/issues/create"
          className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
        >
          + Create Issue
        </Link>

      </div>

      {/* =================================================
          ACTIVE STATUS FROM DASHBOARD
      ================================================= */}

      {statusFromUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <div>
            <p className="text-sm text-blue-700 font-medium">
              Menampilkan issue dengan status:
            </p>

            <p className="text-lg font-bold text-blue-800">
              {statusFromUrl}
            </p>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            Tampilkan Semua Issue
          </button>

        </div>
      )}

      {/* =================================================
          FILTER
      ================================================= */}

      <div className="bg-white rounded-xl shadow mb-6 p-4 sm:p-5">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* SEARCH */}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Search Issue Code
            </label>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Contoh: ISS-0001"
              className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* STATUS */}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Status
            </label>

            <select
              value={statusFilter}
              onChange={(e) => {
                const value = e.target.value;

                setStatusFilter(value);

                if (value === "All") {
                  window.history.replaceState(
                    null,
                    "",
                    "/issues"
                  );
                } else {
                  window.history.replaceState(
                    null,
                    "",
                    `/issues?status=${encodeURIComponent(
                      value
                    )}`
                  );
                }

                fetchIssues();
              }}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="All">
                All Status
              </option>

              <option value="Open">
                Open
              </option>

              <option value="On Progress">
                On Progress
              </option>

              <option value="Resolved">
                Resolved
              </option>

              <option value="Closed">
                Closed
              </option>
            </select>
          </div>

          {/* PRIORITY */}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Priority
            </label>

            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value)
              }
              className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="All">
                All Priority
              </option>

              <option value="Critical">
                Critical
              </option>

              <option value="High">
                High
              </option>

              <option value="Medium">
                Medium
              </option>

              <option value="Low">
                Low
              </option>
            </select>
          </div>

          {/* LOCATION */}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Location
            </label>

            <select
              value={locationFilter}
              onChange={(e) =>
                setLocationFilter(e.target.value)
              }
              className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="All">
                All Location
              </option>

              {locations.map((location) => (
                <option
                  key={location}
                  value={location}
                >
                  {location}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* RESET */}

        <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">

          <button
            type="button"
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Reset Filter
          </button>

        </div>

      </div>

      {/* =================================================
          ISSUE LIST
      ================================================= */}

      <div className="bg-white rounded-xl shadow overflow-hidden">

        <div className="px-4 sm:px-6 py-4 border-b bg-slate-50">

          <h2 className="font-bold text-slate-800">
            Issue List
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            {filteredIssues.length} issue ditemukan
          </p>

        </div>

        {/* =================================================
            EMPTY
        ================================================= */}

        {filteredIssues.length === 0 ? (

          <div className="p-10 text-center">

            <div className="text-4xl mb-3">
              📋
            </div>

            <h3 className="font-semibold text-slate-700">
              Tidak ada issue
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Tidak ditemukan issue berdasarkan filter yang dipilih.
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Reset Filter
            </button>

          </div>

        ) : (

          <div>

            {/* =================================================
                DESKTOP HEADER
            ================================================= */}

            <div className="hidden lg:grid grid-cols-[1.4fr_1.1fr_1.3fr_1.1fr_1fr_150px] gap-4 px-6 py-3 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase">

              <div>
                Issue Code
              </div>

              <div>
                Date
              </div>

              <div>
                Location
              </div>

              <div>
                Current Status
              </div>

              <div>
                Priority
              </div>

              <div className="text-right">
                Action
              </div>

            </div>

            {/* =================================================
                ROWS
            ================================================= */}

            {filteredIssues.map((issue) => (

              <div
                key={issue.id}
                className="border-b last:border-b-0 hover:bg-slate-50 transition"
              >

                {/* =================================================
                    DESKTOP
                ================================================= */}

                <div className="hidden lg:grid grid-cols-[1.4fr_1.1fr_1.3fr_1.1fr_1fr_150px] gap-4 items-center px-6 py-4">

                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {issue.issue_code}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-600 whitespace-nowrap">
                      {formatDate(issue.created_at)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p
                      className="text-sm text-slate-700 truncate"
                      title={issue.location}
                    >
                      {issue.location || "-"}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusClass(
                        issue.status
                      )}`}
                    >
                      {issue.status}
                    </span>
                  </div>

                  <div>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getPriorityClass(
                        issue.priority
                      )}`}
                    >
                      {issue.priority}
                    </span>
                  </div>

                  <div className="flex justify-end gap-2">

                    <Link
                      href={`/issues/${issue.id}`}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-sm font-medium text-slate-700 transition"
                    >
                      View
                    </Link>

                    <Link
                      href={`/issues/${issue.id}/edit`}
                      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
                    >
                      Edit
                    </Link>

                  </div>

                </div>

                {/* =================================================
                    TABLET
                ================================================= */}

                <div className="hidden md:flex lg:hidden items-center justify-between gap-4 px-5 py-4">

                  <div className="min-w-0 flex-1">

                    <p className="font-semibold text-slate-800">
                      {issue.issue_code}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-2">

                      <span className="text-xs text-slate-500">
                        {formatDate(issue.created_at)}
                      </span>

                      <span className="text-xs text-slate-500 truncate max-w-[180px]">
                        {issue.location || "-"}
                      </span>

                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                          issue.status
                        )}`}
                      >
                        {issue.status}
                      </span>

                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getPriorityClass(
                          issue.priority
                        )}`}
                      >
                        {issue.priority}
                      </span>

                    </div>

                  </div>

                  <div className="flex gap-2 shrink-0">

                    <Link
                      href={`/issues/${issue.id}`}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-sm font-medium text-slate-700"
                    >
                      View
                    </Link>

                    <Link
                      href={`/issues/${issue.id}/edit`}
                      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                    >
                      Edit
                    </Link>

                  </div>

                </div>

                {/* =================================================
                    MOBILE
                ================================================= */}

                <div className="md:hidden p-4">

                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">

                      <p className="font-semibold text-slate-800 truncate">
                        {issue.issue_code}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(issue.created_at)}
                      </p>

                    </div>

                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                        issue.status
                      )}`}
                    >
                      {issue.status}
                    </span>

                  </div>

                  <div className="flex items-center justify-between gap-3 mt-3">

                    <p className="text-sm text-slate-600 truncate">
                      {issue.location || "-"}
                    </p>

                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${getPriorityClass(
                        issue.priority
                      )}`}
                    >
                      {issue.priority}
                    </span>

                  </div>

                  <div className="flex gap-2 mt-4">

                    <Link
                      href={`/issues/${issue.id}`}
                      className="flex-1 text-center px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-sm font-medium text-slate-700"
                    >
                      View
                    </Link>

                    <Link
                      href={`/issues/${issue.id}/edit`}
                      className="flex-1 text-center px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                    >
                      Edit
                    </Link>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </main>
  );
}

// =====================================================
// SUSPENSE WRAPPER
// =====================================================

export default function IssuesPage() {
  return (
    <Suspense
      fallback={
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">
            Loading issues...
          </div>
        </main>
      }
    >
      <IssuesPageContent />
    </Suspense>
  );
}