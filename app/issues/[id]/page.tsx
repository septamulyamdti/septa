"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Issue = {
  id: number;
  issue_code: string;
  title: string;
  description: string | null;
  project: string | null;
  category: string;
  priority: string;
  location: string;
  status: string;
  assignee: string | null;
  reporter: string | null;
  resolution: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type History = {
  id: number;
  issue_id: number;
  action: string;
  old_status: string | null;
  new_status: string | null;
  old_priority: string | null;
  new_priority: string | null;
  description: string | null;
  created_at: string | null;
  changed_by: string | null;
};

export default function IssueDetailPage() {
  const params = useParams();

  const issueId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [issue, setIssue] = useState<Issue | null>(null);
  const [history, setHistory] = useState<History[]>([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [historyError, setHistoryError] = useState<string | null>(null);

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date?: string | null) => {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // =====================================================
  // STATUS STYLE
  // =====================================================

  const getStatusClass = (status?: string | null) => {
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

  const getPriorityClass = (priority?: string | null) => {
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
  // GET ISSUE + HISTORY
  // =====================================================

  const fetchIssue = useCallback(async () => {
    if (!issueId) {
      console.error("Issue ID tidak ditemukan.");

      setLoading(false);
      setHistoryLoading(false);

      return;
    }

    setLoading(true);
    setHistoryLoading(true);
    setHistoryError(null);

    // ===================================================
    // GET ISSUE
    // ===================================================

    const {
      data: issueData,
      error: issueError,
    } = await supabase
      .from("issues")
      .select("*")
      .eq("id", issueId)
      .single();

    if (issueError) {
      console.error("GET ISSUE ERROR:", issueError);

      setIssue(null);
      setHistory([]);
      setHistoryError(issueError.message);

      setLoading(false);
      setHistoryLoading(false);

      return;
    }

    setIssue(issueData);
    setLoading(false);

    // ===================================================
    // GET HISTORY
    // ===================================================

    const {
      data: historyData,
      error: historyFetchError,
    } = await supabase
      .from("issue_history")
      .select(`
        id,
        issue_id,
        action,
        old_status,
        new_status,
        old_priority,
        new_priority,
        description,
        created_at,
        changed_by
      `)
      .eq("issue_id", issueData.id)
      .order("created_at", {
        ascending: false,
      });

    // ===================================================
    // HISTORY ERROR
    // ===================================================

    if (historyFetchError) {
      console.error(
        "GET HISTORY ERROR:",
        historyFetchError
      );

      setHistory([]);
      setHistoryError(historyFetchError.message);

      setHistoryLoading(false);

      return;
    }

    // ===================================================
    // HISTORY SUCCESS
    // ===================================================

    setHistory((historyData as History[]) || []);
    setHistoryError(null);

    setHistoryLoading(false);
  }, [issueId]);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  // =====================================================
  // WORKFLOW
  // =====================================================

  const workflowSteps = [
    {
      label: "Open",
      description: "Issue dibuat dan menunggu penanganan.",
    },
    {
      label: "On Progress",
      description: "Issue sedang ditangani.",
    },
    {
      label: "Resolved",
      description: "Solusi sudah diterapkan.",
    },
    {
      label: "Closed",
      description: "Issue telah ditutup.",
    },
  ];

  const currentStep = workflowSteps.findIndex(
    (step) => step.label === issue?.status
  );

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="p-2.5 sm:p-3 lg:p-4 max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-5 text-center text-xs text-slate-500">
          Loading issue...
        </div>
      </main>
    );
  }

  // =====================================================
  // NOT FOUND
  // =====================================================

  if (!issue) {
    return (
      <main className="p-2.5 sm:p-3 lg:p-4 max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <h1 className="text-lg font-bold text-slate-800">
            Issue Tidak Ditemukan
          </h1>

          <p className="text-xs text-slate-500 mt-1.5">
            Data issue tidak tersedia.
          </p>

          <Link
            href="/issues"
            className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs"
          >
            ← Kembali ke Issues
          </Link>
        </div>
      </main>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="p-2.5 sm:p-3 lg:p-4 max-w-6xl mx-auto">

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2.5 mb-3">

        <div>
          <p className="text-[10px] text-slate-500 mb-0.5">
            Issue Detail
          </p>

          <h1 className="text-lg sm:text-xl font-bold text-slate-800">
            {issue.issue_code}
          </h1>

          <p className="text-xs text-slate-600 mt-0.5">
            {issue.title}
          </p>
        </div>

        <div className="flex gap-1.5">

          <Link
            href="/issues"
            className="px-2.5 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] transition"
          >
            ← Back
          </Link>

          <Link
            href={`/issues/${issue.id}/edit`}
            className="px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] transition"
          >
            Edit Issue
          </Link>

        </div>

      </div>

      {/* WORKFLOW */}

      <div className="bg-white rounded-lg shadow-sm mb-3 p-3 sm:p-4">

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">

          <div>
            <h2 className="text-sm sm:text-[15px] font-bold text-slate-800">
              Issue Workflow
            </h2>

            <p className="text-[11px] text-slate-500 mt-0.5">
              Current status: {issue.status}
            </p>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold w-fit ${getStatusClass(
              issue.status
            )}`}
          >
            {issue.status}
          </span>

        </div>

        <div className="relative">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

            {workflowSteps.map((step, index) => {

              const isCompleted =
                currentStep >= 0 &&
                index < currentStep;

              const isCurrent =
                index === currentStep;

              const isPending =
                currentStep < 0 ||
                index > currentStep;

              return (
                <div
                  key={step.label}
                  className="relative flex flex-col items-center text-center"
                >

                  {index < workflowSteps.length - 1 && (
                    <div
                      className={`hidden md:block absolute top-4 left-[calc(50%+16px)] w-[calc(100%-32px)] h-0.5 ${
                        index < currentStep
                          ? "bg-green-500"
                          : "bg-slate-200"
                      }`}
                    />
                  )}

                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm z-10 ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? "bg-green-500 text-white ring-2 ring-green-100"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isCompleted || isCurrent
                      ? "✓"
                      : index + 1}
                  </div>

                  <p
                    className={`mt-1.5 text-xs font-semibold ${
                      isPending
                        ? "text-slate-400"
                        : "text-slate-800"
                    }`}
                  >
                    {step.label}
                  </p>

                  <p
                    className={`text-[10px] mt-0.5 max-w-[170px] ${
                      isPending
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  >
                    {step.description}
                  </p>

                </div>
              );
            })}

          </div>

        </div>

      </div>

      {/* ISSUE INFORMATION */}

      <div className="bg-white rounded-lg shadow-sm mb-3">

        <div className="px-3 py-2.5 sm:px-4 border-b border-slate-200">
          <h2 className="text-sm sm:text-[15px] font-bold text-slate-800">
            Issue Information
          </h2>
        </div>

        <div className="p-3 sm:p-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">

            {/* ISSUE CODE */}

            <div>
              <p className="text-[10px] text-slate-500">
                Issue Code
              </p>

              <p className="font-semibold text-xs text-slate-800 mt-0.5">
                {issue.issue_code}
              </p>
            </div>

            {/* PROJECT */}

            <div>
              <p className="text-[10px] text-slate-500">
                Project
              </p>

              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium">
                {issue.project || "-"}
              </span>
            </div>

            {/* CATEGORY */}

            <div>
              <p className="text-[10px] text-slate-500">
                Category
              </p>

              <p className="font-semibold text-xs text-slate-800 mt-0.5">
                {issue.category || "-"}
              </p>
            </div>

            {/* LOCATION */}

            <div>
              <p className="text-[10px] text-slate-500">
                Location
              </p>

              <p className="font-semibold text-xs text-slate-800 mt-0.5">
                {issue.location || "-"}
              </p>
            </div>

            {/* ASSIGNEE */}

            <div>
              <p className="text-[10px] text-slate-500">
                Assignee
              </p>

              <p className="font-semibold text-xs text-slate-800 mt-0.5">
                {issue.assignee || "Belum ditentukan"}
              </p>
            </div>

            {/* REPORTER */}

            <div>
              <p className="text-[10px] text-slate-500">
                Reporter
              </p>

              <p className="font-semibold text-xs text-slate-800 mt-0.5 break-all">
                {issue.reporter || "-"}
              </p>
            </div>

            {/* PRIORITY */}

            <div>
              <p className="text-[10px] text-slate-500">
                Priority
              </p>

              <span
                className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${getPriorityClass(
                  issue.priority
                )}`}
              >
                {issue.priority || "-"}
              </span>
            </div>

            {/* CREATED */}

            <div>
              <p className="text-[10px] text-slate-500">
                Created
              </p>

              <p className="font-semibold text-xs text-slate-800 mt-0.5">
                {formatDate(issue.created_at)}
              </p>
            </div>

            {/* UPDATED */}

            <div>
              <p className="text-[10px] text-slate-500">
                Last Updated
              </p>

              <p className="font-semibold text-xs text-slate-800 mt-0.5">
                {formatDate(issue.updated_at)}
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* DESCRIPTION */}

      <div className="bg-white rounded-lg shadow-sm mb-3">

        <div className="px-3 py-2.5 sm:px-4 border-b border-slate-200">
          <h2 className="text-sm sm:text-[15px] font-bold text-slate-800">
            Description
          </h2>
        </div>

        <div className="p-3 sm:p-4">

          {issue.description ? (
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {issue.description}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              Belum ada description.
            </p>
          )}

        </div>

      </div>

      {/* RESOLUTION */}

      <div className="bg-white rounded-lg shadow-sm mb-3">

        <div className="px-3 py-2.5 sm:px-4 border-b border-slate-200">
          <h2 className="text-sm sm:text-[15px] font-bold text-slate-800">
            Resolution
          </h2>
        </div>

        <div className="p-3 sm:p-4">

          {issue.resolution ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {issue.resolution}
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3">

              <p className="text-[11px] text-slate-500 italic">
                Resolution belum tersedia.
              </p>

              {(issue.status === "Resolved" ||
                issue.status === "Closed") && (
                <p className="text-[10px] text-red-500 mt-1.5">
                  Status sudah {issue.status},
                  tetapi resolution belum diisi.
                </p>
              )}

            </div>
          )}

        </div>

      </div>

      {/* HISTORY */}

      <div className="bg-white rounded-lg shadow-sm">

        <div className="px-3 py-2.5 sm:px-4 border-b border-slate-200">

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">

            <div>
              <h2 className="text-sm sm:text-[15px] font-bold text-slate-800">
                History
              </h2>

              <p className="text-[10px] text-slate-500 mt-0.5">
                Riwayat perubahan issue.
              </p>
            </div>

            <div className="flex items-center gap-2">

              {!historyLoading && (
                <span className="text-[10px] text-slate-500">
                  {history.length} perubahan
                </span>
              )}

              <button
                type="button"
                onClick={fetchIssue}
                disabled={historyLoading}
                className="px-2.5 py-1.5 text-[11px] rounded-md border border-slate-300 hover:bg-slate-100 disabled:opacity-50"
              >
                Refresh
              </button>

            </div>

          </div>

        </div>

        <div className="p-3 sm:p-4">

          {historyLoading ? (

            <div className="text-center py-6">
              <p className="text-[11px] text-slate-400">
                Loading history...
              </p>
            </div>

          ) : historyError ? (

            <div className="bg-red-50 border border-red-200 rounded-md p-3">

              <p className="font-semibold text-xs text-red-700">
                Gagal mengambil history
              </p>

              <p className="text-[10px] text-red-600 mt-1.5 break-words">
                {historyError}
              </p>

              <button
                type="button"
                onClick={fetchIssue}
                className="mt-3 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[11px]"
              >
                Coba Lagi
              </button>

            </div>

          ) : history.length === 0 ? (

            <div className="text-center py-6">

              <div className="text-3xl mb-2">
                📋
              </div>

              <p className="text-[11px] text-slate-400">
                Belum ada history perubahan.
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {history.map((item) => (

                <div
                  key={item.id}
                  className="border border-slate-200 rounded-lg p-3 hover:shadow-sm transition"
                >

                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1.5">

                    <div>

                      <p className="font-semibold text-xs text-slate-800">
                        {item.action || "Issue Updated"}
                      </p>

                      {item.changed_by && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Changed by: {item.changed_by}
                        </p>
                      )}

                    </div>

                    <p className="text-[10px] text-slate-400">
                      {formatDate(item.created_at)}
                    </p>

                  </div>

                  {/* STATUS CHANGE */}

                  {(item.old_status || item.new_status) && (

                    <div className="mt-2.5 bg-slate-50 rounded-md p-2.5">

                      <p className="text-[10px] font-medium text-slate-500 mb-1.5">
                        Status Change
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${getStatusClass(
                            item.old_status
                          )}`}
                        >
                          {item.old_status || "-"}
                        </span>

                        <span className="text-slate-400 font-semibold text-xs">
                          →
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${getStatusClass(
                            item.new_status
                          )}`}
                        >
                          {item.new_status || "-"}
                        </span>

                      </div>

                    </div>

                  )}

                  {/* PRIORITY CHANGE */}

                  {(item.old_priority || item.new_priority) && (

                    <div className="mt-2.5 bg-slate-50 rounded-md p-2.5">

                      <p className="text-[10px] font-medium text-slate-500 mb-1.5">
                        Priority Change
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${getPriorityClass(
                            item.old_priority
                          )}`}
                        >
                          {item.old_priority || "-"}
                        </span>

                        <span className="text-slate-400 font-semibold text-xs">
                          →
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${getPriorityClass(
                            item.new_priority
                          )}`}
                        >
                          {item.new_priority || "-"}
                        </span>

                      </div>

                    </div>

                  )}

                  {/* DESCRIPTION */}

                  {item.description && (

                    <div className="mt-2.5">

                      <p className="text-[11px] text-slate-600 whitespace-pre-wrap">
                        {item.description}
                      </p>

                    </div>

                  )}

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </main>
  );
}