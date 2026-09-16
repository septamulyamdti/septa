"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
  created_at: string;
  updated_at: string | null;
};

type HistoryRecord = {
  issue_id: number;
  action: string;
  old_status: string | null;
  new_status: string | null;
  old_priority: string | null;
  new_priority: string | null;
  description: string | null;
};

export default function EditIssuePage() {
  const params = useParams();
  const router = useRouter();

  const supabase = createClient();

  const issueId = params.id as string;

  const [issue, setIssue] = useState<Issue | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project: "",
    category: "",
    priority: "Medium",
    location: "",
    status: "Open",
    assignee: "",
    resolution: "",
  });

  // =====================================================
  // GET ISSUE
  // =====================================================

  useEffect(() => {
    const fetchIssue = async () => {
      if (!issueId) {
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .eq("id", issueId)
        .single();

      if (error) {
        console.error(
          "Get issue error:",
          error.message
        );

        setIssue(null);
        setLoading(false);

        alert("Issue tidak ditemukan.");

        router.push("/issues");

        return;
      }

      setIssue(data);

      setFormData({
        title: data.title || "",
        description: data.description || "",
        project: data.project || "",
        category: data.category || "",
        priority: data.priority || "Medium",
        location: data.location || "",
        status: data.status || "Open",
        assignee: data.assignee || "",
        resolution: data.resolution || "",
      });

      setLoading(false);
    };

    fetchIssue();
  }, [issueId, router]);

  // =====================================================
  // HANDLE CHANGE
  // =====================================================

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement |
      HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // UPDATE ISSUE
  // =====================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!issue) {
      return;
    }

    setSaving(true);

    // ===================================================
    // DETECT CHANGES
    // ===================================================

    const changes: string[] = [];

    if (issue.title !== formData.title) {
      changes.push("Title");
    }

    if (
      (issue.description || "") !==
      formData.description
    ) {
      changes.push("Description");
    }

    if (
      (issue.project || "") !==
      formData.project
    ) {
      changes.push("Project");
    }

    if (issue.category !== formData.category) {
      changes.push("Category");
    }

    if (issue.priority !== formData.priority) {
      changes.push("Priority");
    }

    if (issue.location !== formData.location) {
      changes.push("Location");
    }

    if (issue.status !== formData.status) {
      changes.push("Status");
    }

    if (
      (issue.assignee || "") !==
      formData.assignee
    ) {
      changes.push("Assignee");
    }

    if (
      (issue.resolution || "") !==
      formData.resolution
    ) {
      changes.push("Resolution");
    }

    // ===================================================
    // NO CHANGES
    // ===================================================

    if (changes.length === 0) {
      setSaving(false);

      alert(
        "Tidak ada perubahan yang dilakukan."
      );

      return;
    }

    // ===================================================
    // CREATE HISTORY DATA
    // ===================================================

    const historyRecords: HistoryRecord[] = [];

    // ===================================================
    // STATUS CHANGE
    // ===================================================

    if (issue.status !== formData.status) {
      historyRecords.push({
        issue_id: issue.id,
        action: "Status Changed",
        old_status: issue.status,
        new_status: formData.status,
        old_priority: null,
        new_priority: null,
        description:
          `Status berubah dari "${issue.status}" menjadi "${formData.status}"`,
      });
    }

    // ===================================================
    // PRIORITY CHANGE
    // ===================================================

    if (issue.priority !== formData.priority) {
      historyRecords.push({
        issue_id: issue.id,
        action: "Priority Changed",
        old_status: null,
        new_status: null,
        old_priority: issue.priority,
        new_priority: formData.priority,
        description:
          `Priority berubah dari "${issue.priority}" menjadi "${formData.priority}"`,
      });
    }

    // ===================================================
    // OTHER CHANGES
    // ===================================================

    const otherChanges: string[] = [];

    if (issue.title !== formData.title) {
      otherChanges.push("Title");
    }

    if (
      (issue.description || "") !==
      formData.description
    ) {
      otherChanges.push("Description");
    }

    if (
      (issue.project || "") !==
      formData.project
    ) {
      otherChanges.push("Project");
    }

    if (issue.category !== formData.category) {
      otherChanges.push("Category");
    }

    if (issue.location !== formData.location) {
      otherChanges.push("Location");
    }

    if (
      (issue.assignee || "") !==
      formData.assignee
    ) {
      otherChanges.push("Assignee");
    }

    if (
      (issue.resolution || "") !==
      formData.resolution
    ) {
      otherChanges.push("Resolution");
    }

    if (otherChanges.length > 0) {
      historyRecords.push({
        issue_id: issue.id,
        action: "Issue Updated",
        old_status: null,
        new_status: null,
        old_priority: null,
        new_priority: null,
        description:
          `${otherChanges.join(", ")} diperbarui`,
      });
    }

    // ===================================================
    // UPDATE ISSUE
    // ===================================================

    const {
      data: updatedIssue,
      error: updateError,
    } = await supabase
      .from("issues")
      .update({
        title: formData.title,
        description: formData.description,
        project: formData.project || null,
        category: formData.category,
        priority: formData.priority,
        location: formData.location,
        status: formData.status,
        assignee: formData.assignee || null,
        resolution: formData.resolution || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", issue.id)
      .select()
      .single();

    if (updateError) {
      console.error(
        "Update issue error:",
        {
          code: updateError.code,
          message: updateError.message,
        }
      );

      setSaving(false);

      alert(
        `Gagal memperbarui issue: ${updateError.message}`
      );

      return;
    }

    // ===================================================
    // INSERT HISTORY
    // ===================================================

    if (historyRecords.length > 0) {
      const {
        data: historyData,
        error: historyError,
      } = await supabase
        .from("issue_history")
        .insert(historyRecords)
        .select();

      if (historyError) {
        console.error(
          "Create history error:",
          {
            code: historyError.code,
            message: historyError.message,
          }
        );

        setSaving(false);

        alert(
          `Issue berhasil diperbarui, tetapi history gagal dibuat: ${historyError.message}`
        );

        router.push(`/issues/${issue.id}`);

        return;
      }

      console.log(
        "History berhasil dibuat:",
        historyData
      );
    }

    // ===================================================
    // SUCCESS
    // ===================================================

    setSaving(false);

    setIssue(updatedIssue);

    alert(
      "Issue berhasil diperbarui dan history berhasil dicatat."
    );

    router.push(`/issues/${issue.id}`);
    router.refresh();
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">
          Loading issue...
        </div>
      </main>
    );
  }

  // =====================================================
  // ISSUE NOT FOUND
  // =====================================================

  if (!issue) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8 text-center">

          <h1 className="text-xl font-bold text-slate-800">
            Issue tidak ditemukan
          </h1>

          <p className="text-slate-500 mt-2">
            Data issue tidak tersedia.
          </p>

          <Link
            href="/issues"
            className="inline-block mt-4 text-blue-600 hover:text-blue-700"
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
    <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

        <div>

          <p className="text-sm text-slate-500 mb-1">
            Issue Management
          </p>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Edit Issue
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            {issue.issue_code}
          </p>

        </div>

        <Link
          href={`/issues/${issue.id}`}
          className="text-slate-600 hover:text-slate-900"
        >
          ← Back to Issue
        </Link>

      </div>

      {/* FORM */}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 sm:p-8 rounded-xl shadow space-y-6"
      >

        {/* ISSUE CODE */}

        <div>

          <label className="block text-sm font-medium text-slate-700 mb-2">
            Issue Code
          </label>

          <input
            type="text"
            value={issue.issue_code || ""}
            disabled
            className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-slate-100 text-slate-500"
          />

          <p className="text-xs text-slate-500 mt-1">
            Issue Code tidak dapat diubah.
          </p>

        </div>

        {/* PROJECT */}

        <div>

          <label className="block text-sm font-medium text-slate-700 mb-2">
            Project
          </label>

          <select
            name="project"
            value={formData.project}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >

            <option value="">
              Select Project
            </option>

            <option value="TAM">
              TAM
            </option>

            <option value="BPKB">
              BPKB
            </option>

            <option value="STNK">
              STNK
            </option>

            <option value="Mahindra">
              Mahindra
            </option>

            <option value="Hyundai">
              Hyundai
            </option>

            <option value="LMS">
              LMS
            </option>

          </select>

        </div>

        {/* TITLE */}

        <div>

          <label className="block text-sm font-medium text-slate-700 mb-2">
            Issue Title
          </label>

          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Masukkan judul issue"
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />

        </div>

        {/* DESCRIPTION */}

        <div>

          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description
          </label>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Jelaskan detail issue..."
            rows={6}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />

        </div>

        {/* CATEGORY & PRIORITY */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CATEGORY */}

          <div>

            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category
            </label>

            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >

              <option value="">
                Select Category
              </option>

              <option value="Hardware">
                Hardware
              </option>

              <option value="Software">
                Software
              </option>

              <option value="Network">
                Network
              </option>

              <option value="Server">
                Server
              </option>

              <option value="Application">
                Application
              </option>

              <option value="Other">
                Other
              </option>

            </select>

          </div>

          {/* PRIORITY */}

          <div>

            <label className="block text-sm font-medium text-slate-700 mb-2">
              Priority
            </label>

            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >

              <option value="Low">
                Low
              </option>

              <option value="Medium">
                Medium
              </option>

              <option value="High">
                High
              </option>

              <option value="Critical">
                Critical
              </option>

            </select>

          </div>

        </div>

        {/* LOCATION & ASSIGNEE */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* LOCATION */}

          <div>

            <label className="block text-sm font-medium text-slate-700 mb-2">
              Location
            </label>

            <select
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >

              <option value="">
                Select Location
              </option>

              <option value="NVDC Cibitung">
                NVDC Cibitung
              </option>

              <option value="NVDC Sunter">
                NVDC Sunter
              </option>

              <option value="NVDC Karawang">
                NVDC Karawang
              </option>

              <option value="BPKB Makassar">
                BPKB Makassar
              </option>

              <option value="BPKB Palangkaraya">
                BPKB Palangkaraya
              </option>

              <option value="BPKB Banjarbaru">
                BPKB Banjarbaru
              </option>

              <option value="LMS BACY">
                LMS BACY
              </option>

            </select>

          </div>

          {/* ASSIGNEE */}

          <div>

            <label className="block text-sm font-medium text-slate-700 mb-2">
              Assignee
            </label>

            <select
              name="assignee"
              value={formData.assignee}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >

              <option value="">
                Select Assignee
              </option>

              <option value="Septa Mulya">
                Septa Mulya
              </option>

              <option value="Eriansyah">
                Eriansyah
              </option>

              <option value="Rizqy F Akbar">
                Rizqy F Akbar
              </option>

              <option value="Pak Zandi">
                Pak Zandi
              </option>

              <option value="Pak Alex">
                Pak Alex
              </option>

              <option value="Pak Bona">
                Pak Bona
              </option>

            </select>

          </div>

        </div>

        {/* STATUS */}

        <div>

          <label className="block text-sm font-medium text-slate-700 mb-2">
            Status
          </label>

          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >

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

        {/* RESOLUTION */}

        <div>

          <label className="block text-sm font-medium text-slate-700 mb-2">
            Resolution
          </label>

          <textarea
            name="resolution"
            value={formData.resolution}
            onChange={handleChange}
            placeholder="Masukkan solusi atau resolution issue..."
            rows={5}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <p className="text-xs text-slate-500 mt-1">
            Isi resolution jika issue sudah ditangani atau diselesaikan.
          </p>

        </div>

        {/* REPORTER */}

        <div>

          <label className="block text-sm font-medium text-slate-700 mb-2">
            Reporter
          </label>

          <input
            type="text"
            value={issue.reporter || ""}
            disabled
            className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-slate-100 text-slate-500"
          />

          <p className="text-xs text-slate-500 mt-1">
            Reporter tidak dapat diubah.
          </p>

        </div>

        {/* BUTTONS */}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 border-t border-slate-200">

          <Link
            href={`/issues/${issue.id}`}
            className="px-5 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium text-center transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium transition"
          >
            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>

        </div>

      </form>

    </main>
  );
}