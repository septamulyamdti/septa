"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusFromUrl = searchParams.get("status");
  const priorityFromUrl = searchParams.get("priority");
  const agingFromUrl = searchParams.get("aging");

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState(
    statusFromUrl || "All"
  );

  const [priorityFilter, setPriorityFilter] = useState(
    priorityFromUrl || "All"
  );

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
  // NORMALIZE LOCATION
  // =====================================================

  const normalizeLocation = (value?: string) => {
    return (value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  };

  // =====================================================
  // DISPLAY LOCATION
  // =====================================================

  const getDisplayLocation = (location: string) => {
    const normalized = normalizeLocation(location);

    const masterLocation = Object.values(
      PROJECT_LOCATIONS
    )
      .flat()
      .find(
        (master) =>
          normalizeLocation(master) === normalized
      );

    return masterLocation || location;
  };

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

    if (agingFromUrl === "3") {
      return age > 3 && age <= 7;
    }

    if (agingFromUrl === "7") {
      return age > 7 && age <= 14;
    }

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

    if (
      statusFromUrl &&
      [
        "Open",
        "On Progress",
        "Resolved",
        "Closed",
      ].includes(statusFromUrl)
    ) {
      query = query.eq(
        "status",
        statusFromUrl
      );
    }

    if (
      priorityFromUrl &&
      [
        "Critical",
        "High",
        "Medium",
        "Low",
      ].includes(priorityFromUrl)
    ) {
      query = query.eq(
        "priority",
        priorityFromUrl
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "Get issues error:",
        error
      );

      setIssues([]);
    } else {
      setIssues(data || []);
    }

    setLoading(false);
  };

  // =====================================================
  // FETCH WHEN URL FILTER CHANGES
  // =====================================================

  useEffect(() => {
    setStatusFilter(
      statusFromUrl || "All"
    );

    setPriorityFilter(
      priorityFromUrl || "All"
    );

    fetchIssues();
  }, [
    statusFromUrl,
    priorityFromUrl,
    agingFromUrl,
  ]);

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
    let sourceLocations: string[] = [];

    if (
      projectFilter !== "All" &&
      PROJECT_LOCATIONS[projectFilter]
    ) {
      sourceLocations =
        PROJECT_LOCATIONS[projectFilter];
    } else {
      sourceLocations = issues
        .map((issue) => issue.location)
        .filter(Boolean);
    }

    // Gabungkan lokasi yang berbeda kapitalisasi.
    // Contoh:
    // NVDC SUNTER
    // NVDC Sunter
    // nvdc sunter
    // akan menjadi satu pilihan: NVDC Sunter
    const uniqueLocations =
      new Map<string, string>();

    sourceLocations.forEach((location) => {
      const normalized =
        normalizeLocation(location);

      if (!normalized) {
        return;
      }

      const masterLocation =
        Object.values(PROJECT_LOCATIONS)
          .flat()
          .find(
            (master) =>
              normalizeLocation(master) ===
              normalized
          );

      const displayLocation =
        masterLocation || location.trim();

      if (!uniqueLocations.has(normalized)) {
        uniqueLocations.set(
          normalized,
          displayLocation
        );
      }
    });

    return Array.from(
      uniqueLocations.values()
    ).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [
    issues,
    projectFilter,
  ]);

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

    // Case-insensitive location matching
    const locationMatch =
      locationFilter === "All" ||
      normalizeLocation(issue.location) ===
        normalizeLocation(locationFilter);

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

    router.replace("/issues");
  };

  // =====================================================
  // CHANGE STATUS FILTER
  // =====================================================

  const handleStatusChange = (
    value: string
  ) => {
    setStatusFilter(value);

    const params = new URLSearchParams();

    if (value !== "All") {
      params.set(
        "status",
        value
      );
    }

    if (
      priorityFilter !== "All"
    ) {
      params.set(
        "priority",
        priorityFilter
      );
    }

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

    router.replace(
      queryString
        ? `/issues?${queryString}`
        : "/issues"
    );
  };

  // =====================================================
  // CHANGE PRIORITY FILTER
  // =====================================================

  const handlePriorityChange = (
    value: string
  ) => {
    setPriorityFilter(value);

    const params = new URLSearchParams();

    if (
      statusFilter !== "All"
    ) {
      params.set(
        "status",
        statusFilter
      );
    }

    if (value !== "All") {
      params.set(
        "priority",
        value
      );
    }

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

    router.replace(
      queryString
        ? `/issues?${queryString}`
        : "/issues"
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="p-2.5 sm:p-3 lg:p-4 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-4 text-center text-xs text-slate-500">
          Loading issues...
        </div>
      </main>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="p-2.5 sm:p-3 lg:p-4 max-w-7xl mx-auto">

      {/* =================================================
          STICKY HEADER + FILTER
      ================================================= */}

      <div
        className="
          sticky top-0 z-30
          -mx-2.5 sm:-mx-3 lg:-mx-4
          px-2.5 sm:px-3 lg:px-4
          pt-0 pb-2
          bg-slate-50
          rounded-xl
        "
      >

        {/* HEADER */}

        <div
          className="
            flex flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-2
            mb-2.5
          "
        >
          <div>
            <p className="text-[11px] text-slate-500 mb-0.5">
              Issue Management
            </p>

            <h1 className="text-lg sm:text-xl font-bold leading-tight text-slate-800">
              All Issues
            </h1>

            <p className="text-[11px] text-slate-500 mt-0.5">
              Daftar seluruh issue yang tercatat.
            </p>
          </div>

          <Link
            href="/issues/create"
            className="
              inline-flex
              items-center
              justify-center
              px-3
              py-1.5
              rounded-md
              bg-blue-600
              hover:bg-blue-700
              text-white
              text-xs
              font-medium
              transition
            "
          >
            + Create Issue
          </Link>
        </div>

        {/* ACTIVE STATUS */}

        {statusFromUrl && (
          <div
            className="
              bg-blue-50
              border border-blue-200
              rounded-md
              px-2.5 py-1.5
              mb-2
              flex flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-1.5
            "
          >
            <div>
              <p className="text-[10px] text-blue-700 font-medium">
                Menampilkan issue dengan status:
              </p>

              <p className="text-xs font-bold text-blue-800">
                {statusFromUrl}
              </p>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] font-medium text-blue-700 hover:text-blue-900"
            >
              Tampilkan Semua Issue
            </button>
          </div>
        )}

        {/* ACTIVE PRIORITY */}

        {priorityFromUrl && (
          <div
            className="
              bg-red-50
              border border-red-200
              rounded-md
              px-2.5 py-1.5
              mb-2
              flex flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-1.5
            "
          >
            <div>
              <p className="text-[10px] text-red-700 font-medium">
                Menampilkan issue dengan priority:
              </p>

              <p className="text-xs font-bold text-red-800">
                {priorityFromUrl}
              </p>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] font-medium text-red-700 hover:text-red-900"
            >
              Tampilkan Semua Issue
            </button>
          </div>
        )}

        {/* ACTIVE AGING */}

        {(
          agingFromUrl === "3" ||
          agingFromUrl === "7" ||
          agingFromUrl === "14"
        ) && (
          <div
            className="
              bg-orange-50
              border border-orange-200
              rounded-md
              px-2.5 py-1.5
              mb-2
              flex flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-1.5
            "
          >
            <div>
              <p className="text-[10px] text-orange-700 font-medium">
                Menampilkan issue berdasarkan aging:
              </p>

              <p className="text-xs font-bold text-orange-800">
                {getAgingLabel()}
              </p>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] font-medium text-orange-700 hover:text-orange-900"
            >
              Tampilkan Semua Issue
            </button>
          </div>
        )}

        {/* FILTER */}

        <div className="bg-white rounded-lg shadow-sm p-2.5 sm:p-3">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">

            {/* SEARCH */}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Search Issue Code
              </label>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Contoh: ISS-0001"
                className="
                  w-full
                  h-8
                  border border-slate-300
                  rounded-md
                  px-2.5
                  text-xs
                  font-medium
                  text-slate-800
                  placeholder:text-slate-400
                  bg-white
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:border-blue-500
                "
              />
            </div>

            {/* PROJECT */}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                className="
                  w-full
                  h-8
                  border border-slate-300
                  rounded-md
                  px-2.5
                  text-xs
                  font-medium
                  text-slate-800
                  bg-white
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:border-blue-500
                "
              >
                <option value="All">
                  All Project
                </option>

                {projects.map(
                  (project) => (
                    <option
                      key={project}
                      value={project}
                    >
                      {project}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* STATUS */}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) =>
                  handleStatusChange(
                    e.target.value
                  )
                }
                className="
                  w-full
                  h-8
                  border border-slate-300
                  rounded-md
                  px-2.5
                  text-xs
                  font-medium
                  text-slate-800
                  bg-white
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:border-blue-500
                "
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
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Priority
              </label>

              <select
                value={priorityFilter}
                onChange={(e) =>
                  handlePriorityChange(
                    e.target.value
                  )
                }
                className="
                  w-full
                  h-8
                  border border-slate-300
                  rounded-md
                  px-2.5
                  text-xs
                  font-medium
                  text-slate-800
                  bg-white
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:border-blue-500
                "
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
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Location
              </label>

              <select
                value={locationFilter}
                onChange={(e) =>
                  setLocationFilter(
                    e.target.value
                  )
                }
                className="
                  w-full
                  h-8
                  border border-slate-300
                  rounded-md
                  px-2.5
                  text-xs
                  font-medium
                  text-slate-800
                  bg-white
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:border-blue-500
                "
              >
                <option value="All">
                  All Location
                </option>

                {locations.map(
                  (location) => (
                    <option
                      key={location}
                      value={location}
                    >
                      {location}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* RESET */}

          <div className="flex justify-end mt-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={resetFilters}
              className="
                text-[11px]
                text-blue-600
                hover:text-blue-700
                font-medium
              "
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* =================================================
          ISSUE LIST
      ================================================= */}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">

        <div className="px-4 py-2.5 border-b bg-slate-50">
          <h2 className="text-xs font-bold text-slate-800">
            Issue List
          </h2>

          <p className="text-[11px] text-slate-500 mt-0.5">
            {filteredIssues.length} issue ditemukan
          </p>
        </div>

        {/* EMPTY */}

        {filteredIssues.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-2xl mb-1.5">
              📋
            </div>

            <h3 className="text-xs font-semibold text-slate-700">
              Tidak ada issue
            </h3>

            <p className="text-[11px] text-slate-500 mt-1">
              Tidak ditemukan issue berdasarkan filter yang dipilih.
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 text-[11px] text-blue-600 hover:text-blue-700 font-medium"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div>

            {/* =================================================
                DESKTOP HEADER
            ================================================= */}

            <div
              className="
                hidden lg:grid
                grid-cols-[1.3fr_1fr_1.1fr_1.3fr_1.1fr_1fr_135px]
                gap-2
                px-4
                py-2
                bg-slate-50
                border-b
                text-[10px]
                font-semibold
                text-slate-500
                uppercase
              "
            >
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

            {filteredIssues.map(
              (issue) => (
                <div
                  key={issue.id}
                  className="
                    border-b
                    last:border-b-0
                    hover:bg-slate-50
                    transition
                  "
                >

                  {/* =================================================
                      DESKTOP
                  ================================================= */}

                  <div
                    className="
                      hidden lg:grid
                      grid-cols-[1.3fr_1fr_1.1fr_1.3fr_1.1fr_1fr_135px]
                      gap-2
                      items-center
                      px-4
                      py-2
                    "
                  >

                    {/* ISSUE CODE */}

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {issue.issue_code}
                      </p>
                    </div>

                    {/* DATE */}

                    <div>
                      <p className="text-[11px] text-slate-600 whitespace-nowrap">
                        {formatDate(
                          issue.created_at
                        )}
                      </p>
                    </div>

                    {/* PROJECT */}

                    <div>
                      <span
                        className={`
                          inline-flex
                          px-2
                          py-0.5
                          rounded-full
                          text-[10px]
                          font-semibold
                          whitespace-nowrap
                          ${getProjectClass(
                            issue.project
                          )}
                        `}
                      >
                        {issue.project || "-"}
                      </span>
                    </div>

                    {/* LOCATION */}

                    <div className="min-w-0">
                      <p
                        className="
                          text-[11px]
                          text-slate-700
                          truncate
                        "
                        title={issue.location}
                      >
                        {getDisplayLocation(
                          issue.location
                        ) || "-"}
                      </p>
                    </div>

                    {/* STATUS */}

                    <div>
                      <span
                        className={`
                          inline-flex
                          px-2
                          py-0.5
                          rounded-full
                          text-[10px]
                          font-semibold
                          whitespace-nowrap
                          ${getStatusClass(
                            issue.status
                          )}
                        `}
                      >
                        {issue.status}
                      </span>
                    </div>

                    {/* PRIORITY */}

                    <div>
                      <span
                        className={`
                          inline-flex
                          px-2
                          py-0.5
                          rounded-full
                          text-[10px]
                          font-semibold
                          whitespace-nowrap
                          ${getPriorityClass(
                            issue.priority
                          )}
                        `}
                      >
                        {issue.priority}
                      </span>
                    </div>

                    {/* ACTION */}

                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/issues/${issue.id}`}
                        className="
                          px-2
                          py-1
                          rounded-md
                          border border-slate-300
                          bg-white
                          hover:bg-slate-100
                          text-[11px]
                          font-medium
                          text-slate-700
                          transition
                        "
                      >
                        View
                      </Link>

                      <Link
                        href={`/issues/${issue.id}/edit`}
                        className="
                          px-2
                          py-1
                          rounded-md
                          bg-blue-600
                          hover:bg-blue-700
                          text-white
                          text-[11px]
                          font-medium
                          transition
                        "
                      >
                        Edit
                      </Link>
                    </div>
                  </div>

                  {/* =================================================
                      TABLET
                  ================================================= */}

                  <div
                    className="
                      hidden md:flex lg:hidden
                      items-center
                      justify-between
                      gap-2
                      px-3
                      py-2.5
                    "
                  >
                    <div className="min-w-0 flex-1">

                      <p className="text-xs font-semibold text-slate-800">
                        {issue.issue_code}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1">

                        <span className="text-[10px] text-slate-500">
                          {formatDate(
                            issue.created_at
                          )}
                        </span>

                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {issue.project || "-"}
                        </span>

                        <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          {getDisplayLocation(
                            issue.location
                          ) || "-"}
                        </span>

                        <span
                          className={`
                            px-1.5
                            py-0.5
                            rounded-full
                            text-[10px]
                            font-semibold
                            ${getStatusClass(
                              issue.status
                            )}
                          `}
                        >
                          {issue.status}
                        </span>

                        <span
                          className={`
                            px-1.5
                            py-0.5
                            rounded-full
                            text-[10px]
                            font-semibold
                            ${getPriorityClass(
                              issue.priority
                            )}
                          `}
                        >
                          {issue.priority}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <Link
                        href={`/issues/${issue.id}`}
                        className="
                          px-2
                          py-1
                          rounded-md
                          border border-slate-300
                          bg-white
                          hover:bg-slate-100
                          text-[11px]
                          font-medium
                          text-slate-700
                        "
                      >
                        View
                      </Link>

                      <Link
                        href={`/issues/${issue.id}/edit`}
                        className="
                          px-2
                          py-1
                          rounded-md
                          bg-blue-600
                          hover:bg-blue-700
                          text-white
                          text-[11px]
                          font-medium
                        "
                      >
                        Edit
                      </Link>
                    </div>
                  </div>

                  {/* =================================================
                      MOBILE
                  ================================================= */}

                  <div className="md:hidden p-2.5">

                    <div className="flex items-start justify-between gap-2">

                      <div className="min-w-0">

                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {issue.issue_code}
                        </p>

                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {formatDate(
                            issue.created_at
                          )}
                        </p>

                      </div>

                      <span
                        className={`
                          shrink-0
                          px-1.5
                          py-0.5
                          rounded-full
                          text-[10px]
                          font-semibold
                          ${getStatusClass(
                            issue.status
                          )}
                        `}
                      >
                        {issue.status}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-2">

                      <div className="flex flex-wrap items-center gap-1">

                        <span
                          className={`
                            px-1.5
                            py-0.5
                            rounded-full
                            text-[10px]
                            font-semibold
                            ${getProjectClass(
                              issue.project
                            )}
                          `}
                        >
                          {issue.project || "-"}
                        </span>

                        <span className="text-[11px] text-slate-600 truncate">
                          {getDisplayLocation(
                            issue.location
                          ) || "-"}
                        </span>
                      </div>

                      <span
                        className={`
                          shrink-0
                          px-1.5
                          py-0.5
                          rounded-full
                          text-[10px]
                          font-semibold
                          ${getPriorityClass(
                            issue.priority
                          )}
                        `}
                      >
                        {issue.priority}
                      </span>
                    </div>

                    <div className="flex gap-1 mt-2">

                      <Link
                        href={`/issues/${issue.id}`}
                        className="
                          flex-1
                          text-center
                          px-2
                          py-1
                          rounded-md
                          border border-slate-300
                          bg-white
                          hover:bg-slate-100
                          text-[11px]
                          font-medium
                          text-slate-700
                        "
                      >
                        View
                      </Link>

                      <Link
                        href={`/issues/${issue.id}/edit`}
                        className="
                          flex-1
                          text-center
                          px-2
                          py-1
                          rounded-md
                          bg-blue-600
                          hover:bg-blue-700
                          text-white
                          text-[11px]
                          font-medium
                        "
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              )
            )}
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
        <main className="p-2.5 sm:p-3 lg:p-4 max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-4 text-center text-xs text-slate-500">
            Loading issues...
          </div>
        </main>
      }
    >
      <IssuesPageContent />
    </Suspense>
  );
}