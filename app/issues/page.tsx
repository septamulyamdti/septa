"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Issue = {
  id: number;
  issue_code: string;
  title: string;
  project: string;
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
  const agingFromUrl = searchParams.get("aging");

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    statusFromUrl || "All"
  );
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");

  // =====================================================
  // PROJECT & LOCATION MASTER
  // =====================================================

  const PROJECT_LOCATIONS: Record<string, string[]> = {
    TAM: [
      "NVDC Karawang",
      "NVDC Sunter",
      "NVDC Cibitung",
    ],

    BPKB: [
      "Kepri",
      "Riau",
      "Sulut",
      "Sulteng",
      "Sulsel",
      "Sultra",
      "Bulukumba",
      "Kalteng",
      "Kalsel",
      "Sumenep",
      "Jogja",
    ],

    STNK: [
      "Lampung",
      "Jabar",
    ],

    LMS: [
      "BACY",
    ],

    Hyundai: [
      "Hyundai Cikarang",
    ],

    Mahindra: [
      "Mahindra Cikarang",
    ],
  };

  const PROJECTS = Object.keys(PROJECT_LOCATIONS);

  // =====================================================
  // GET ISSUE AGE
  // =====================================================

  const getIssueAge = (createdAt?: string) => {
    if (!createdAt) {
      return 0;
    }

    const createdDate = new Date(createdAt);
    const now = new Date();

    const diffMs =
      now.getTime() - createdDate.getTime();

    return Math.floor(
      diffMs / (1000 * 60 * 60 * 24)
    );
  };

  // =====================================================
  // AGING FILTER
  // =====================================================

  const matchesAgingFilter = (issue: Issue) => {
    if (!agingFromUrl) {
      return true;
    }

    // Resolved dan Closed tidak termasuk aging
    if (
      issue.status === "Resolved" ||
      issue.status === "Closed"
    ) {
      return false;
    }

    if (!issue.created_at) {
      return false;
    }

    const age = getIssueAge(issue.created_at);

    // Aging > 3 Days
    // Hanya umur 4 - 7 hari
    if (agingFromUrl === "3") {
      return age > 3 && age <= 7;
    }

    // Aging > 7 Days
    // Hanya umur 8 - 14 hari
    if (agingFromUrl === "7") {
      return age > 7 && age <= 14;
    }

    // Aging > 14 Days
    // Umur 15 hari ke atas
    if (agingFromUrl === "14") {
      return age > 14;
    }

    return true;
  };

  // =====================================================
  // AGING LABEL
  // =====================================================

  const getAgingLabel = () => {
    switch (agingFromUrl) {
      case "3":
        return "Aging > 3 Days (4–7 hari)";

      case "7":
        return "Aging > 7 Days (8–14 hari)";

      case "14":
        return "Aging > 14 Days (15+ hari)";

      default:
        return "";
    }
  };

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
  // FETCH WHEN URL STATUS / AGING CHANGES
  // =====================================================

  useEffect(() => {
    setStatusFilter(statusFromUrl || "All");
    fetchIssues();
  }, [statusFromUrl, agingFromUrl]);

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
  // PROJECT STYLE
  // =====================================================

  const getProjectClass = (project: string) => {
    switch (project) {
      case "TAM":
        return "bg-blue-100 text-blue-700";

      case "BPKB":
        return "bg-purple-100 text-purple-700";

      case "STNK":
        return "bg-green-100 text-green-700";

      case "Mahindra":
        return "bg-orange-100 text-orange-700";

      case "Hyundai":
        return "bg-red-100 text-red-700";

      case "LMS":
        return "bg-cyan-100 text-cyan-700";

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
    if (
      projectFilter !== "All" &&
      PROJECT_LOCATIONS[projectFilter]
    ) {
      return PROJECT_LOCATIONS[projectFilter];
    }

    const uniqueLocations = Array.from(
      new Set(
        issues
          .map((issue) => issue.location)
          .filter(Boolean)
      )
    );

    return uniqueLocations.sort();
  }, [issues, projectFilter]);

  // =====================================================
  // PROJECT LIST
  // =====================================================

  const projects = PROJECTS;

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

    const projectMatch =
      projectFilter === "All" ||
      issue.project === projectFilter;

    const agingMatch =
      matchesAgingFilter(issue);

    return (
      searchMatch &&
      statusMatch &&
      priorityMatch &&
      locationMatch &&
      projectMatch &&
      agingMatch
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
    setProjectFilter("All");

    window.history.replaceState(
      null,
      "",
      "/issues"
    );

    fetchIssues();
  };

  // =====================================================
  // CHANGE STATUS FILTER
  // =====================================================

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);

    const params = new URLSearchParams();

    if (value !== "All") {
      params.set(
        "status",
        value
      );
    }

    // Tetap pertahankan aging jika sedang aktif
    if (
      agingFromUrl === "3" ||
      agingFromUrl === "7" ||
      agingFromUrl === "14"
    ) {
      params.set(
        "aging",
        agingFromUrl
      );
    }

    const queryString =
      params.toString();

    window.history.replaceState(
      null,
      "",
      queryString
        ? `/issues?${queryString}`
        : "/issues"
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
          STICKY HEADER + STATUS + AGING + FILTER
      ================================================= */}

      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-0 pb-4 bg-slate-50 rounded-2xl">

        {/* HEADER */}

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

        {/* ACTIVE STATUS FROM DASHBOARD */}

        {statusFromUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

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

        {/* ACTIVE AGING FROM DASHBOARD */}

        {(
          agingFromUrl === "3" ||
          agingFromUrl === "7" ||
          agingFromUrl === "14"
        ) && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div>
              <p className="text-sm text-orange-700 font-medium">
                Menampilkan issue berdasarkan aging:
              </p>

              <p className="text-lg font-bold text-orange-800">
                {getAgingLabel()}
              </p>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-medium text-orange-700 hover:text-orange-900"
            >
              Tampilkan Semua Issue
            </button>

          </div>
        )}

        {/* FILTER */}

        <div className="bg-white rounded-xl shadow p-4 sm:p-5">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

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

            {/* PROJECT */}

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Project
              </label>

              <select
                value={projectFilter}
                onChange={(e) => {
                  const value =
                    e.target.value;

                  setProjectFilter(value);
                  setLocationFilter("All");
                }}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All">
                  All Project
                </option>

                {projects.map((project) => (
                  <option
                    key={project}
                    value={project}
                  >
                    {project}
                  </option>
                ))}

              </select>
            </div>

            {/* STATUS */}

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) =>
                  handleStatusChange(
                    e.target.value
                  )
                }
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
                  setPriorityFilter(
                    e.target.value
                  )
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
                  setLocationFilter(
                    e.target.value
                  )
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

        {/* EMPTY */}

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

            <div className="hidden lg:grid grid-cols-[1.3fr_1fr_1.1fr_1.3fr_1.1fr_1fr_150px] gap-4 px-6 py-3 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase">

              <div>
                Issue Code
              </div>

              <div>
                Date
              </div>

              <div>
                Project
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

            {/* ROWS */}

            {filteredIssues.map((issue) => (

              <div
                key={issue.id}
                className="border-b last:border-b-0 hover:bg-slate-50 transition"
              >

                {/* =================================================
                    DESKTOP
                ================================================= */}

                <div className="hidden lg:grid grid-cols-[1.3fr_1fr_1.1fr_1.3fr_1.1fr_1fr_150px] gap-4 items-center px-6 py-4">

                  {/* ISSUE CODE */}

                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {issue.issue_code}
                    </p>
                  </div>

                  {/* DATE */}

                  <div>
                    <p className="text-sm text-slate-600 whitespace-nowrap">
                      {formatDate(issue.created_at)}
                    </p>
                  </div>

                  {/* PROJECT */}

                  <div>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getProjectClass(
                        issue.project
                      )}`}
                    >
                      {issue.project || "-"}
                    </span>
                  </div>

                  {/* LOCATION */}

                  <div className="min-w-0">
                    <p
                      className="text-sm text-slate-700 truncate"
                      title={issue.location}
                    >
                      {issue.location || "-"}
                    </p>
                  </div>

                  {/* STATUS */}

                  <div>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusClass(
                        issue.status
                      )}`}
                    >
                      {issue.status}
                    </span>
                  </div>

                  {/* PRIORITY */}

                  <div>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getPriorityClass(
                        issue.priority
                      )}`}
                    >
                      {issue.priority}
                    </span>
                  </div>

                  {/* ACTION */}

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

                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {issue.project || "-"}
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

                  <div className="mt-3 flex items-center justify-between gap-3">

                    <div className="flex flex-wrap items-center gap-2">

                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getProjectClass(
                          issue.project
                        )}`}
                      >
                        {issue.project || "-"}
                      </span>

                      <span className="text-sm text-slate-600 truncate">
                        {issue.location || "-"}
                      </span>

                    </div>

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