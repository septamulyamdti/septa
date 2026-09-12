"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// =====================================================
// PROJECT & LOCATION MAPPING
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

const PROJECTS = [
  "TAM",
  "BPKB",
  "STNK",
  "LMS",
  "Hyundai",
  "Mahindra",
];

// =====================================================
// TYPES
// =====================================================

type Role = "admin" | "user";

export default function CreateIssuePage() {
  const router = useRouter();
  const supabase = createClient();

  // =====================================================
  // FORM DATA
  // =====================================================

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "Medium",
    project: "",
    location: "",
    status: "Open",
    assignee: "",
  });

  // =====================================================
  // USER INFO
  // =====================================================

  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userProject, setUserProject] = useState("");

  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // GET LOGGED-IN USER + PROFILE
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

      // =====================================================
      // GET USER PROFILE
      // =====================================================

      const { data: profile, error: profileError } =
        await supabase
          .from("user_profiles")
          .select("role, project")
          .eq("id", user.id)
          .single();

      if (profileError || !profile) {
        console.error(
          "Gagal mengambil user profile:",
          profileError
        );

        alert(
          "Data profile user tidak ditemukan. Silakan hubungi administrator."
        );

        setLoadingUser(false);
        return;
      }

      const role = profile.role as Role;
      const project = profile.project || "";

      setUserRole(role);
      setUserProject(project);

      // =====================================================
      // USER
      // Project otomatis dari user_profiles
      // =====================================================

      if (role === "user") {
        setFormData((prev) => ({
          ...prev,
          project,
          location: "",
          assignee: "",
        }));
      }

      setLoadingUser(false);
    };

    getUser();
  }, [router, supabase]);

  // =====================================================
  // GET AVAILABLE LOCATIONS
  // =====================================================

  const availableLocations =
    formData.project &&
    PROJECT_LOCATIONS[formData.project]
      ? PROJECT_LOCATIONS[formData.project]
      : [];

  // =====================================================
  // HANDLE CHANGE
  // =====================================================

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    // =====================================================
    // PROJECT CHANGE
    // Hanya admin yang bisa mengubah project
    // Location harus di-reset ketika project berubah
    // =====================================================

    if (name === "project") {
      setFormData((prev) => ({
        ...prev,
        project: value,
        location: "",
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // HANDLE SUBMIT
  // =====================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    // =====================================================
    // VALIDASI USER
    // =====================================================

    if (!userEmail) {
      alert(
        "Session login tidak ditemukan. Silakan login kembali."
      );

      router.replace("/login");
      return;
    }

    // =====================================================
    // VALIDASI PROJECT
    // =====================================================

    if (!formData.project) {
      alert("Project belum ditentukan.");
      return;
    }

    // =====================================================
    // VALIDASI PROJECT USER
    // =====================================================

    if (
      userRole === "user" &&
      formData.project !== userProject
    ) {
      alert(
        "Project tidak sesuai dengan project akun Anda."
      );
      return;
    }

    // =====================================================
    // VALIDASI LOCATION
    // =====================================================

    if (!formData.location) {
      alert("Silakan pilih Location terlebih dahulu.");
      return;
    }

    if (
      !PROJECT_LOCATIONS[formData.project]?.includes(
        formData.location
      )
    ) {
      alert(
        "Location tidak sesuai dengan Project yang dipilih."
      );
      return;
    }

    // =====================================================
    // VALIDASI ASSIGNEE ADMIN
    // =====================================================

    if (
      userRole === "admin" &&
      !formData.assignee
    ) {
      alert(
        "Silakan pilih Assignee terlebih dahulu."
      );
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

    const sequence = Date.now()
      .toString()
      .slice(-3);

    const issueCode = `ISS-${dateCode}-${sequence}`;

    // =====================================================
    // INSERT ISSUE
    // =====================================================

    const { error } = await supabase
      .from("issues")
      .insert([
        {
          issue_code: issueCode,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,

          // Project otomatis / pilihan admin
          project: formData.project,

          // Location sesuai project
          location: formData.location,

          // Issue baru selalu Open
          status: "Open",

          // Admin bisa pilih Assignee
          // User otomatis NULL
          assignee:
            userRole === "admin"
              ? formData.assignee
              : null,

          // Reporter otomatis dari akun login
          reporter: userEmail,

          resolution: null,
        },
      ]);

    setLoading(false);

    // =====================================================
    // ERROR
    // =====================================================

    if (error) {
      console.error(
        "Supabase error:",
        error
      );

      alert(
        `Gagal membuat issue: ${error.message}`
      );

      return;
    }

    // =====================================================
    // SUCCESS
    // =====================================================

    alert(
      `Issue berhasil dibuat!\n\nIssue Code: ${issueCode}\nProject: ${formData.project}\nLocation: ${formData.location}\nReporter: ${userEmail}`
    );

    // =====================================================
    // RESET FORM
    // =====================================================

    setFormData({
      title: "",
      description: "",
      category: "",
      priority: "Medium",
      project:
        userRole === "user"
          ? userProject
          : "",
      location: "",
      status: "Open",
      assignee: "",
    });

    // =====================================================
    // KEMBALI KE ALL ISSUES
    // =====================================================

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
  // PROFILE ERROR
  // =====================================================

  if (!userRole) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <p className="text-red-600 font-medium">
            Data profile user tidak ditemukan.
          </p>

          <p className="text-sm text-slate-500 mt-2">
            Silakan hubungi administrator.
          </p>

          <Link
            href="/login"
            className="inline-block mt-5 px-5 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Kembali ke Login
          </Link>
        </div>
      </main>
    );
  }

  // =====================================================
  // USER BELUM MEMILIKI PROJECT
  // =====================================================

  if (
    userRole === "user" &&
    !userProject
  ) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <p className="text-red-600 font-medium">
            Project akun belum ditentukan.
          </p>

          <p className="text-sm text-slate-500 mt-2">
            Silakan hubungi administrator untuk menentukan project akun Anda.
          </p>
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

        {userRole === "admin" ? (
  <Link
    href="/issues"
    className="text-slate-600 hover:text-slate-900"
  >
    ← Back to Issues
  </Link>
) : (
  <button
    type="button"
    onClick={async () => {
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    }}
    className="text-red-600 hover:text-red-700 font-medium"
  >
    Logout
  </button>
)}

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
            PROJECT & LOCATION
        ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* PROJECT */}

          <div>

            <label className="block text-sm font-medium text-slate-800 mb-2">
              Project
            </label>

            {userRole === "user" ? (
              <>
                <input
                  type="text"
                  value={formData.project}
                  disabled
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-700 bg-slate-100"
                />

                <p className="text-xs text-slate-500 mt-1">
                  Project otomatis berdasarkan project akun Anda.
                </p>
              </>
            ) : (
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

                {PROJECTS.map((project) => (
                  <option
                    key={project}
                    value={project}
                  >
                    {project}
                  </option>
                ))}

              </select>
            )}

          </div>

          {/* LOCATION */}

          <div>

            <label className="block text-sm font-medium text-slate-800 mb-2">
              Location
            </label>

            <select
              name="location"
              value={formData.location}
              onChange={handleChange}
              disabled={!formData.project}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              required
            >

              <option value="">
                {formData.project
                  ? "Select Location"
                  : "Select Project First"}
              </option>

              {availableLocations.map(
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

            {formData.project && (
              <p className="text-xs text-slate-500 mt-1">
                Location hanya menampilkan lokasi yang sesuai dengan project{" "}
                <span className="font-medium">
                  {formData.project}
                </span>
                .
              </p>
            )}

          </div>

        </div>

        {/* =================================================
            ASSIGNEE
            HANYA ADMIN
        ================================================= */}

        {userRole === "admin" && (
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
        )}

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
            {loading
              ? "Creating..."
              : "Create Issue"}
          </button>

        </div>

      </form>

    </main>
  );
}