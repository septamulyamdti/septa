"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Issue = {
  id: number;
  issue_code: string;
  title: string;
  category: string;
  location: string;
  priority: string;
  status: string;
  reporter?: string;
  created_at?: string;
  updated_at?: string;
};

type FilterType =
  | "Status"
  | "Priority"
  | "Category"
  | "Location";

export default function DashboardPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const [chartFilter, setChartFilter] =
    useState<FilterType>("Status");

  // =====================================================
  // GET ISSUES
  // =====================================================

  const fetchIssues = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Dashboard error:", error);
      setIssues([]);
      setLoading(false);
      return;
    }

    setIssues(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  // =====================================================
  // KPI
  // =====================================================

  const totalIssues = issues.length;

  const openIssues = issues.filter(
    (issue) => issue.status === "Open"
  ).length;

  const progressIssues = issues.filter(
    (issue) => issue.status === "On Progress"
  ).length;

  const resolvedIssues = issues.filter(
    (issue) => issue.status === "Resolved"
  ).length;

  const closedIssues = issues.filter(
    (issue) => issue.status === "Closed"
  ).length;

  const criticalIssues = issues.filter(
    (issue) => issue.priority === "Critical"
  ).length;

  // =====================================================
  // GET ISSUE AGE
  // =====================================================

  const now = new Date();

  const getIssueAge = (createdAt?: string) => {
    if (!createdAt) {
      return 0;
    }

    const createdDate = new Date(createdAt);

    const diffMs =
      now.getTime() - createdDate.getTime();

    return Math.floor(
      diffMs / (1000 * 60 * 60 * 24)
    );
  };

  // =====================================================
  // AGING ISSUES
  // =====================================================

  const agingIssues = issues.filter((issue) => {
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

    return age > 3;
  });

  // =====================================================
  // AGING 3 DAYS
  // 4 - 7 DAYS
  // =====================================================

  const aging3Days = issues.filter((issue) => {
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

    return age > 3 && age <= 7;
  }).length;

  // =====================================================
  // AGING 7 DAYS
  // 8 - 14 DAYS
  // =====================================================

  const aging7Days = issues.filter((issue) => {
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

    return age > 7 && age <= 14;
  }).length;

  // =====================================================
  // AGING 14 DAYS
  // 15 DAYS+
  // =====================================================

  const aging14Days = issues.filter((issue) => {
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

    return age > 14;
  }).length;

  // =====================================================
  // CHART DATA
  // =====================================================

  const chartData = useMemo(() => {
    let values: string[] = [];

    if (chartFilter === "Status") {
      values = [
        "Open",
        "On Progress",
        "Resolved",
        "Closed",
      ];
    } else if (chartFilter === "Priority") {
      values = [
        "Critical",
        "High",
        "Medium",
        "Low",
      ];
    } else if (chartFilter === "Category") {
      values = [
        "Hardware",
        "Software",
        "Network",
        "Server",
        "Application",
        "Other",
      ];
    } else if (chartFilter === "Location") {
      values = [
        "NVDC Karawang",
        "NVDC Sunter",
        "NVDC Cibitung",
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
        "Lampung",
        "Jabar",
        "BACY",
        "Hyundai Cikarang",
        "Mahindra Cikarang",
      ];
    }

    return values.map((value) => {
      let count = 0;

      if (chartFilter === "Status") {
        count = issues.filter(
          (issue) => issue.status === value
        ).length;
      } else if (chartFilter === "Priority") {
        count = issues.filter(
          (issue) => issue.priority === value
        ).length;
      } else if (chartFilter === "Category") {
        count = issues.filter(
          (issue) => issue.category === value
        ).length;
      } else if (chartFilter === "Location") {
        count = issues.filter(
          (issue) =>
            issue.location?.trim().toLowerCase() ===
            value.trim().toLowerCase()
        ).length;
      }

      const percentage =
        totalIssues > 0
          ? Math.round(
              (count / totalIssues) * 100
            )
          : 0;

      return {
        name: value,
        count,
        percentage,
      };
    });
  }, [issues, chartFilter, totalIssues]);

  // =====================================================
  // BAR COLOR
  // =====================================================

  const getBarClass = (name: string) => {
    if (chartFilter === "Status") {
      switch (name) {
        case "Open":
          return "bg-blue-500";

        case "On Progress":
          return "bg-yellow-500";

        case "Resolved":
          return "bg-green-500";

        case "Closed":
          return "bg-slate-500";

        default:
          return "bg-blue-500";
      }
    }

    if (chartFilter === "Priority") {
      switch (name) {
        case "Critical":
          return "bg-red-500";

        case "High":
          return "bg-orange-500";

        case "Medium":
          return "bg-yellow-500";

        case "Low":
          return "bg-green-500";

        default:
          return "bg-blue-500";
      }
    }

    if (chartFilter === "Category") {
      return "bg-indigo-500";
    }

    if (chartFilter === "Location") {
      return "bg-purple-500";
    }

    return "bg-blue-500";
  };

  // =====================================================
  // PRIORITY CLASS
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
  // STATUS CLASS
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
  // PAGE
  // =====================================================

  return (
    <main className="p-2.5 sm:p-3 lg:p-4 max-w-7xl mx-auto">

      {/* =================================================
          STICKY DASHBOARD HEADER + KPI
      ================================================= */}

      <div
        className="
          sticky top-0 z-30
          -mx-2.5 sm:-mx-3 lg:-mx-4
          px-2.5 sm:px-3 lg:px-4
          pt-0 pb-2.5
          bg-slate-50
        "
      >

        {/* HEADER */}

        <div
          className="
            flex flex-col lg:flex-row
            lg:justify-between lg:items-center
            gap-2.5
            mb-2.5
          "
        >

          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">
              Dashboard
            </h1>

            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
              Monitor and manage all reported issues
            </p>
          </div>

          <div className="flex gap-2">

            <Link
              href="/issues"
              className="
                h-8
                px-3
                rounded-lg
                border border-slate-300
                hover:bg-slate-100
                text-xs
                text-slate-700
                flex items-center
                justify-center
              "
            >
              View All Issues
            </Link>

            <Link
              href="/issues/create"
              className="
                h-8
                px-3
                rounded-lg
                bg-blue-600
                text-white
                hover:bg-blue-700
                text-xs
                flex items-center
                justify-center
              "
            >
              + Create Issue
            </Link>

          </div>

        </div>

        {/* KPI CARDS */}

        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">

            {/* TOTAL */}

            <Link
              href="/issues"
              className="
                bg-white
                rounded-lg
                shadow-sm
                border border-slate-100
                p-3
                hover:shadow
                hover:bg-slate-50
                transition
              "
            >
              <p className="text-[11px] font-semibold text-slate-800">
                Total Issues
              </p>

              <p className="text-xl font-bold text-slate-800 mt-0.5">
                {totalIssues}
              </p>

              <p className="text-[10px] text-blue-500 mt-1">
                View all issues →
              </p>
            </Link>

            {/* OPEN */}

            <Link
              href="/issues?status=Open"
              className="
                bg-white
                rounded-lg
                shadow-sm
                border border-slate-100
                p-3
                hover:shadow
                hover:bg-blue-50
                transition
              "
            >
              <p className="text-[11px] font-semibold text-slate-800">
                Open
              </p>

              <p className="text-xl font-bold text-blue-600 mt-0.5">
                {openIssues}
              </p>

              <p className="text-[10px] text-blue-500 mt-1">
                View Open issues →
              </p>
            </Link>

            {/* ON PROGRESS */}

            <Link
              href="/issues?status=On%20Progress"
              className="
                bg-white
                rounded-lg
                shadow-sm
                border border-slate-100
                p-3
                hover:shadow
                hover:bg-yellow-50
                transition
              "
            >
              <p className="text-[11px] font-semibold text-slate-800">
                On Progress
              </p>

              <p className="text-xl font-bold text-yellow-600 mt-0.5">
                {progressIssues}
              </p>

              <p className="text-[10px] text-yellow-600 mt-1">
                View On Progress →
              </p>
            </Link>

            {/* RESOLVED */}

            <Link
              href="/issues?status=Resolved"
              className="
                bg-white
                rounded-lg
                shadow-sm
                border border-slate-100
                p-3
                hover:shadow
                hover:bg-green-50
                transition
              "
            >
              <p className="text-[11px] font-semibold text-slate-800">
                Resolved
              </p>

              <p className="text-xl font-bold text-green-600 mt-0.5">
                {resolvedIssues}
              </p>

              <p className="text-[10px] text-green-600 mt-1">
                View Resolved →
              </p>
            </Link>

            {/* CLOSED */}

            <Link
              href="/issues?status=Closed"
              className="
                bg-white
                rounded-lg
                shadow-sm
                border border-slate-100
                p-3
                hover:shadow
                hover:bg-slate-50
                transition
              "
            >
              <p className="text-[11px] font-semibold text-slate-800">
                Closed
              </p>

              <p className="text-xl font-bold text-slate-600 mt-0.5">
                {closedIssues}
              </p>

              <p className="text-[10px] text-slate-500 mt-1">
                View Closed →
              </p>
            </Link>

            {/* CRITICAL */}

            <Link
              href="/issues?priority=Critical"
              className="
                bg-white
                rounded-lg
                shadow-sm
                border border-slate-100
                p-3
                hover:shadow
                hover:bg-red-50
                transition
              "
            >
              <p className="text-[11px] font-semibold text-slate-800">
                Critical
              </p>

              <p className="text-xl font-bold text-red-600 mt-0.5">
                {criticalIssues}
              </p>

              <p className="text-[10px] text-red-500 mt-1">
                View Critical →
              </p>
            </Link>

          </div>
        )}

      </div>

      {/* =================================================
          LOADING
      ================================================= */}

      {loading ? (

        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-sm text-slate-500">
          Loading dashboard...
        </div>

      ) : (

        <div className="space-y-2.5">

          {/* =================================================
              AGING ISSUES
          ================================================= */}

          <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-3">

            <div
              className="
                flex flex-col
                md:flex-row
                md:justify-between
                md:items-center
                gap-2
                mb-3
              "
            >

              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Aging Issues
                </h2>

                <p className="text-[10px] text-slate-500 mt-0.5">
                  Issue yang belum selesai berdasarkan umur laporan
                </p>
              </div>

              <Link
                href="/issues"
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Issues →
              </Link>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">

              {/* > 3 DAYS */}

              <Link
                href="/issues?aging=3"
                className="
                  border border-orange-200
                  bg-orange-50
                  rounded-lg
                  p-3
                  hover:shadow-sm
                  transition
                "
              >
                <p className="text-[11px] text-orange-600 font-medium">
                  Aging &gt; 3 Days
                </p>

                <p className="text-2xl font-bold text-orange-700 mt-1">
                  {aging3Days}
                </p>

                <p className="text-[10px] text-orange-500 mt-1">
                  Issue belum selesai lebih dari 3 hari →
                </p>
              </Link>

              {/* > 7 DAYS */}

              <Link
                href="/issues?aging=7"
                className="
                  border border-red-200
                  bg-red-50
                  rounded-lg
                  p-3
                  hover:shadow-sm
                  transition
                "
              >
                <p className="text-[11px] text-red-600 font-medium">
                  Aging &gt; 7 Days
                </p>

                <p className="text-2xl font-bold text-red-700 mt-1">
                  {aging7Days}
                </p>

                <p className="text-[10px] text-red-500 mt-1">
                  Issue belum selesai lebih dari 7 hari →
                </p>
              </Link>

              {/* > 14 DAYS */}

              <Link
                href="/issues?aging=14"
                className="
                  border border-red-300
                  bg-red-100
                  rounded-lg
                  p-3
                  hover:shadow-sm
                  transition
                "
              >
                <p className="text-[11px] text-red-700 font-medium">
                  Aging &gt; 14 Days
                </p>

                <p className="text-2xl font-bold text-red-800 mt-1">
                  {aging14Days}
                </p>

                <p className="text-[10px] text-red-600 mt-1">
                  Issue sangat lama belum diselesaikan →
                </p>
              </Link>

            </div>

          </div>

          {/* =================================================
              AGING DETAIL
          ================================================= */}

          <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">

            <div
              className="
                p-3
                border-b
                flex flex-col
                md:flex-row
                md:justify-between
                md:items-center
                gap-2
              "
            >

              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Aging Issue Detail
                </h2>

                <p className="text-[10px] text-slate-500 mt-0.5">
                  Daftar issue aktif yang sudah lebih dari 3 hari
                </p>
              </div>

              <span className="text-[10px] bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full w-fit">
                {agingIssues.length} aging issues
              </span>

            </div>

            {agingIssues.length === 0 ? (

              <div className="p-6 text-center">

                <p className="text-sm text-green-600 font-medium">
                  Tidak ada aging issue.
                </p>

                <p className="text-[11px] text-slate-500 mt-0.5">
                  Semua issue aktif masih dalam batas waktu normal.
                </p>

              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-slate-100 text-left">

                    <tr>

                      <th className="p-2.5 text-[11px] font-semibold text-slate-800">
                        Issue
                      </th>

                      <th className="p-2.5 text-[11px] font-semibold text-slate-800">
                        Title
                      </th>

                      <th className="p-2.5 text-[11px] font-semibold text-slate-800">
                        Location
                      </th>

                      <th className="p-2.5 text-[11px] font-semibold text-slate-800">
                        Priority
                      </th>

                      <th className="p-2.5 text-[11px] font-semibold text-slate-800">
                        Status
                      </th>

                      <th className="p-2.5 text-[11px] font-semibold text-slate-800">
                        Age
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {agingIssues
                      .sort((a, b) => {
                        return (
                          getIssueAge(b.created_at) -
                          getIssueAge(a.created_at)
                        );
                      })
                      .slice(0, 10)
                      .map((issue) => {

                        const age = getIssueAge(
                          issue.created_at
                        );

                        return (
                          <tr
                            key={issue.id}
                            className="border-t hover:bg-slate-50"
                          >

                            <td className="p-2.5">

                              <Link
                                href={`/issues/${issue.id}`}
                                className="text-[11px] font-semibold text-blue-600 hover:underline"
                              >
                                {issue.issue_code}
                              </Link>

                            </td>

                            <td className="p-2.5 text-[11px] text-slate-800 font-medium">
                              {issue.title}
                            </td>

                            <td className="p-2.5 text-[11px] text-slate-800 font-medium whitespace-nowrap">
                              {issue.location}
                            </td>

                            <td className="p-2.5">

                              <span
                                className={`
                                  px-2
                                  py-0.5
                                  rounded-full
                                  text-[10px]
                                  ${getPriorityClass(
                                    issue.priority
                                  )}
                                `}
                              >
                                {issue.priority}
                              </span>

                            </td>

                            <td className="p-2.5">

                              <span
                                className={`
                                  px-2
                                  py-0.5
                                  rounded-full
                                  text-[10px]
                                  ${getStatusClass(
                                    issue.status
                                  )}
                                `}
                              >
                                {issue.status}
                              </span>

                            </td>

                            <td className="p-2.5">

                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-100 text-orange-700 font-semibold whitespace-nowrap">
                                {age} days
                              </span>

                            </td>

                          </tr>
                        );
                      })}

                  </tbody>

                </table>

              </div>

            )}

          </div>

          {/* =================================================
              MAIN ANALYTICS
          ================================================= */}

          <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-3">

            <div
              className="
                flex flex-col
                md:flex-row
                md:justify-between
                md:items-center
                gap-2.5
                mb-3
              "
            >

              <div>

                <h2 className="text-sm font-bold text-slate-800">
                  Issues Overview
                </h2>

                <p className="text-[10px] text-slate-500 mt-0.5">
                  Analyze issues berdasarkan kategori yang dipilih
                </p>

              </div>

              <select
                value={chartFilter}
                onChange={(e) =>
                  setChartFilter(
                    e.target.value as FilterType
                  )
                }
                className="
                  h-8
                  border border-slate-300
                  rounded-lg
                  px-2.5
                  text-xs
                  bg-white
                  w-full md:w-auto
                "
              >

                <option value="Status">
                  Status
                </option>

                <option value="Priority">
                  Priority
                </option>

                <option value="Category">
                  Category
                </option>

                <option value="Location">
                  Location
                </option>

              </select>

            </div>

            {/* SUMMARY */}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">

              <div className="bg-slate-50 rounded-lg p-2.5">

                <p className="text-[10px] text-slate-500">
                  Total
                </p>

                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {totalIssues}
                </p>

              </div>

              <div className="bg-blue-50 rounded-lg p-2.5">

                <p className="text-[10px] text-slate-500">
                  Category View
                </p>

                <p className="text-lg font-bold text-blue-600 mt-0.5">
                  {chartData.length}
                </p>

              </div>

              <div className="bg-green-50 rounded-lg p-2.5">

                <p className="text-[10px] text-slate-500">
                  Highest
                </p>

                <p className="text-lg font-bold text-green-600 mt-0.5">

                  {chartData.length > 0
                    ? Math.max(
                        ...chartData.map(
                          (item) => item.count
                        )
                      )
                    : 0}

                </p>

              </div>

              <div className="bg-yellow-50 rounded-lg p-2.5">

                <p className="text-[10px] text-slate-500">
                  Filter
                </p>

                <p className="text-lg font-bold text-yellow-600 mt-0.5">
                  {chartFilter}
                </p>

              </div>

            </div>

            {/* BAR CHART */}

            <div className="space-y-2.5">

              {chartData.map((item) => (

                <div key={item.name}>

                  <div className="flex justify-between items-center mb-1">

                    <span className="text-[11px] font-medium text-slate-600">
                      {item.name}
                    </span>

                    <div className="flex items-center gap-2">

                      <span className="text-[10px] text-slate-400">
                        {item.percentage}%
                      </span>

                      <span className="text-[11px] font-bold text-slate-800 w-7 text-right">
                        {item.count}
                      </span>

                    </div>

                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2">

                    <div
                      className={`
                        ${getBarClass(item.name)}
                        h-2
                        rounded-full
                        transition-all
                        duration-500
                      `}
                      style={{
                        width:
                          totalIssues > 0
                            ? `${item.percentage}%`
                            : "0%",
                      }}
                    />

                  </div>

                </div>

              ))}

            </div>

          </div>

          {/* =================================================
              RECENT ISSUES
          ================================================= */}

          <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">

            <div
              className="
                p-3
                border-b
                flex
                justify-between
                items-center
              "
            >

              <div>

                <h2 className="text-sm font-bold text-slate-800">
                  Recent Issues
                </h2>

                <p className="text-[10px] text-slate-500 mt-0.5">
                  Latest reported issues
                </p>

              </div>

              <Link
                href="/issues"
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
              >
                View All →
              </Link>

            </div>

            {issues.length === 0 ? (

              <div className="p-6 text-center text-[11px] text-slate-500">
                Belum ada issue.
              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-slate-100 text-left">

                    <tr>

                      <th className="p-2.5 text-[11px] font-semibold text-slate-800">
                        Issue
                      </th>

                      <th className="p-2.5 text-[11px] font-semibold text-slate-800">
                        Title
                      </th>

                      <th className="p-2.5 text-[11px] font-semibold text-slate-800">
                        Location
                      </th>

                      <th className="p-2.5 text-[11px] font-semibold text-slate-800">
                        Priority
                      </th>

                      <th className="p-2.5 text-[11px] font-semibold text-slate-800">
                        Status
                      </th>

                      <th className="p-2.5 text-[11px] font-semibold text-slate-800">
                        Date
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {issues
                      .slice(0, 5)
                      .map((issue) => (

                        <tr
                          key={issue.id}
                          className="border-t hover:bg-slate-50"
                        >

                          <td className="p-2.5">

                            <Link
                              href={`/issues/${issue.id}`}
                              className="text-[11px] font-medium text-blue-600 hover:underline"
                            >
                              {issue.issue_code}
                            </Link>

                          </td>

                          <td className="p-2.5 text-[11px] text-slate-800 font-medium">
                            {issue.title}
                          </td>

                          <td className="p-2.5 text-[11px] text-slate-800 font-medium whitespace-nowrap">
                            {issue.location}
                          </td>

                          <td className="p-2.5">

                            <span
                              className={`
                                px-2
                                py-0.5
                                rounded-full
                                text-[10px]
                                ${getPriorityClass(
                                  issue.priority
                                )}
                              `}
                            >
                              {issue.priority}
                            </span>

                          </td>

                          <td className="p-2.5">

                            <span
                              className={`
                                px-2
                                py-0.5
                                rounded-full
                                text-[10px]
                                ${getStatusClass(
                                  issue.status
                                )}
                              `}
                            >
                              {issue.status}
                            </span>

                          </td>

                          <td className="p-2.5 text-[10px] text-slate-700 font-medium whitespace-nowrap">
                            {formatDate(
                              issue.created_at
                            )}
                          </td>

                        </tr>

                      ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </div>

      )}

    </main>
  );
}