"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CreateIssuePage() {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "Medium",
    location: "",
    status: "Open",
    assignee: "",
  });

  const [userEmail, setUserEmail] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(false);

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

      setUserEmail(user.email || "");
      setLoadingUser(false);
    };

    getUser();
  }, [router]);

  // =====================================================
  // HANDLE CHANGE
  // =====================================================

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // HANDLE SUBMIT
  // =====================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userEmail) {
      alert("Session login tidak ditemukan. Silakan login kembali.");
      router.replace("/login");
      return;
    }

    if (!formData.assignee) {
      alert("Silakan pilih Assignee terlebih dahulu.");
      return;
    }

    setLoading(true);

    // =====================================================
    // GENERATE ISSUE CODE
    // =====================================================

    const dateCode = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    const sequence = Date.now().toString().slice(-3);

    const issueCode = `ISS-${dateCode}-${sequence}`;

    // =====================================================
    // INSERT ISSUE
    // =====================================================

    const { error } = await supabase.from("issues").insert([
      {
        issue_code: issueCode,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        location: formData.location,

        // Status issue baru selalu Open
        status: "Open",

        // Assignee dipilih dari form
        assignee: formData.assignee,

        // Reporter otomatis dari user yang login
        reporter: userEmail,

        resolution: null,
      },
    ]);

    setLoading(false);

    // =====================================================
    // ERROR
    // =====================================================

    if (error) {
      console.error("Supabase error:", error);

      alert(`Gagal membuat issue: ${error.message}`);

      return;
    }

    // =====================================================
    // SUCCESS
    // =====================================================

    alert(
      `Issue berhasil dibuat!\n\nIssue Code: ${issueCode}\nReporter: ${userEmail}`
    );

    // Reset form
    setFormData({
      title: "",
      description: "",
      category: "",
      priority: "Medium",
      location: "",
      status: "Open",
      assignee: "",
    });

    // Kembali ke All Issues
    router.push("/issues");
  };

  // =====================================================
  // LOADING USER
  // =====================================================

  if (loadingUser) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
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
    <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

        <div>
          <p className="text-sm text-slate-500 mb-1">
            Issue Management
          </p>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">
            Create New Issue
          </h1>

          <p className="text-slate-500 mt-2">
            Create and report a new issue
          </p>
        </div>

        <Link
          href="/issues"
          className="text-slate-600 hover:text-slate-900"
        >
          ← Back to Issues
        </Link>

      </div>

      {/* =================================================
          REPORTER INFO
      ================================================= */}

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-6">

        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
          Reporter
        </p>

        <p className="text-sm font-semibold text-blue-900 mt-1">
          {userEmail}
        </p>

        <p className="text-xs text-blue-600 mt-1">
          Reporter otomatis menggunakan akun yang sedang login.
        </p>

      </div>

      {/* =================================================
          FORM
      ================================================= */}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 sm:p-8 rounded-xl shadow space-y-6"
      >

        {/* =================================================
            ISSUE TITLE
        ================================================= */}

        <div>

          <label className="block text-sm font-medium text-slate-800 mb-2">
            Issue Title
          </label>

          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Example: Server tidak dapat diakses"
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />

        </div>

        {/* =================================================
            DESCRIPTION
        ================================================= */}

        <div>

          <label className="block text-sm font-medium text-slate-800 mb-2">
            Description
          </label>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Jelaskan detail kendala yang ditemukan..."
            rows={5}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />

        </div>

        {/* =================================================
            CATEGORY & PRIORITY
        ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CATEGORY */}

          <div>

            <label className="block text-sm font-medium text-slate-800 mb-2">
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

            <label className="block text-sm font-medium text-slate-800 mb-2">
              Priority
            </label>

            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

        {/* =================================================
            LOCATION & ASSIGNEE
        ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* LOCATION */}

          <div>

            <label className="block text-sm font-medium text-slate-800 mb-2">
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

            </select>

          </div>

          {/* ASSIGNEE */}

          <div>

            <label className="block text-sm font-medium text-slate-800 mb-2">
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

        {/* =================================================
            STATUS
        ================================================= */}

        <div>

          <label className="block text-sm font-medium text-slate-800 mb-2">
            Status
          </label>

          <select
            name="status"
            value={formData.status}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-700 bg-slate-100"
            disabled
          >

            <option value="Open">
              Open
            </option>

          </select>

          <p className="text-xs text-slate-500 mt-1">
            Issue baru selalu dibuat dengan status Open.
          </p>

        </div>

        {/* =================================================
            BUTTONS
        ================================================= */}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-slate-100">

          <Link
            href="/issues"
            className="px-5 py-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-center text-slate-700 font-medium transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg transition font-medium"
          >
            {loading ? "Creating..." : "Create Issue"}
          </button>

        </div>

      </form>

    </main>
  );
}