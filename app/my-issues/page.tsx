"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Issue = {
  id: number;
  issue_code: string;
  title: string;
  project?: string | null;
  category: string;
  priority: string;
  location: string;
  status: string;
  reporter: string;
  assignee?: string;
  description?: string;
  resolution?: string;
  created_at?: string;
  updated_at?: string;
};

export default function MyIssuesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");

  // =====================================================
  // PROJECT LIST
  // =====================================================

  const projects = [
    "TAM",
    "BPKB",
    "STNK",
    "Mahindra",
    "Hyundai",
    "LMS",
  ];

  // =====================================================
  // GET LOGGED-IN USER
  // =====================================================

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (!user.email) {
        alert("Email user tidak ditemukan.");
        router.replace("/login");
        return;
      }

      setUserEmail(user.email);
      setLoading(false);
    };

    getUser();
  }, [router]);

  // =====================================================
  // GET MY ISSUES
  // =====================================================

  useEffect(() => {
    if (!userEmail) {
      return;
    }

    const fetchMyIssues = async () => {
      setLoadingIssues(true);

      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .eq("reporter", userEmail)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error("Get my issues error:", error);

        alert(`Gagal mengambil My Issues: ${error.message}`);

        setIssues([]);
      } else {
        setIssues(data || []);
      }

      setLoadingIssues(false);
    };

    fetchMyIssues();
  }, [userEmail]);

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

  const getProjectClass = (project?: string | null) => {
    switch (project) {
      case "TAM":
        return "bg-blue-100 text-blue-700";

      case "BPKB":
        return "bg-purple-100 text-purple-700";

      case "STNK":
        return "bg-indigo-100 text-indigo-700";

      case "Mahindra":
        return "bg-orange-100 text-orange-700";

      case "Hyundai":
        return "bg-green-100 text-green-700";

      case "LMS":
        return "bg-pink-100 text-pink-700";

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

    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
  // FILTER ISSUES
  // =====================================================

  const filteredIssues = issues.filter((issue) => {
    const searchValue = search.toLowerCase().trim();

    const searchMatch =
      searchValue === "" ||
      issue.issue_code
        .toLowerCase()
        .includes(searchValue) ||
      issue.title
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

    return (
      searchMatch &&
      statusMatch &&
      priorityMatch &&
      locationMatch &&
      projectMatch
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
  };

  // =====================================================
  // INITIAL LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">
          Loading user...
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
            My Issues
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Daftar issue yang kamu buat.
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
          USER INFO
      ================================================= */}

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-6">

        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
          Logged in as
        </p>

        <p className="text-sm font-semibold text-blue-900 mt-1 break-all">
          {userEmail}
        </p>

      </div>

      {/* =================================================
          FILTER
      ================================================= */}

      <div className="bg-white rounded-xl shadow mb-6 p-4 sm:p-5">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          {/* SEARCH */}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Search
            </label>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Issue code atau judul..."
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* PROJECT */}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Project
            </label>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

        {/* HEADER */}

        <div className="px-4 sm:px-6 py-4 border-b bg-slate-50">

          <h2 className="font-bold text-slate-800">
            My Issue List
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            {filteredIssues.length} issue ditemukan
          </p>

        </div>

        {/* =================================================
            LOADING ISSUES
        ================================================= */}

        {loadingIssues ? (

          <div className="p-10 text-center text-slate-500">
            Loading your issues...
          </div>

        ) : filteredIssues.length === 0 ? (

          /* =================================================
             EMPTY
          ================================================= */

          <div className="p-10 text-center">

            <div className="text-4xl mb-3">
              📋
            </div>

            <h3 className="font-semibold text-slate-700">
              Belum ada issue
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Belum ada issue yang dibuat menggunakan akun ini.
            </p>

            <Link
              href="/issues/create"
              className="inline-flex mt-4 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
            >
              + Create Issue
            </Link>

          </div>

        ) : (

          <div>

            {/* =================================================
                DESKTOP HEADER
            ================================================= */}

            <div className="hidden lg:grid grid-cols-[1.35fr_1fr_1.1fr_1.2fr_1.1fr_1fr_150px] gap-4 px-6 py-3 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase">

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

                <div className="hidden lg:grid grid-cols-[1.35fr_1fr_1.1fr_1.2fr_1.1fr_1fr_150px] gap-4 items-center px-6 py-4">

                  {/* ISSUE CODE */}

                  <div className="min-w-0">

                    <p className="font-semibold text-slate-800 truncate">
                      {issue.issue_code}
                    </p>

                    <p
                      className="text-xs text-slate-500 truncate mt-1"
                      title={issue.title}
                    >
                      {issue.title}
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

                    <p
                      className="text-xs text-slate-500 truncate mt-1"
                      title={issue.title}
                    >
                      {issue.title}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-2">

                      <span className="text-xs text-slate-500">
                        {formatDate(issue.created_at)}
                      </span>

                      {/* PROJECT */}

                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getProjectClass(
                          issue.project
                        )}`}
                      >
                        {issue.project || "-"}
                      </span>

                      {/* LOCATION */}

                      <span className="text-xs text-slate-500 truncate max-w-[180px]">
                        {issue.location || "-"}
                      </span>

                      {/* STATUS */}

                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                          issue.status
                        )}`}
                      >
                        {issue.status}
                      </span>

                      {/* PRIORITY */}

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

                      <p
                        className="text-xs text-slate-500 mt-1 truncate"
                        title={issue.title}
                      >
                        {issue.title}
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

                  {/* PROJECT + LOCATION */}

                  <div className="flex flex-wrap items-center gap-2 mt-3">

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getProjectClass(
                        issue.project
                      )}`}
                    >
                      {issue.project || "-"}
                    </span>

                    <p
                      className="text-sm text-slate-600 truncate flex-1 min-w-0"
                      title={issue.location}
                    >
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

                  {/* ACTION */}

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