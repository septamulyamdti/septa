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
      <main className="p-2.5 sm:p-3 lg:p-4 max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-5 text-center text-xs text-slate-500">
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
      <main className="p-2.5 sm:p-3 lg:p-4 max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-sm text-red-600 font-medium">
            Data profile user tidak ditemukan.
          </p>

          <p className="text-xs text-slate-500 mt-1.5">
            Silakan hubungi administrator.
          </p>

          <Link
            href="/login"
            className="
              inline-block
              mt-4
              px-3
              py-1.5
              rounded-md
              bg-blue-600
              hover:bg-blue-700
              text-white
              text-xs
              font-medium
            "
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
      <main className="p-2.5 sm:p-3 lg:p-4 max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-sm text-red-600 font-medium">
            Project akun belum ditentukan.
          </p>

          <p className="text-xs text-slate-500 mt-1.5">
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
    <main className="p-2.5 sm:p-3 lg:p-4 max-w-5xl mx-auto">

      {/* =================================================
          STICKY TOP SECTION
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

        {/* =================================================
            HEADER
        ================================================= */}

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
              Create New Issue
            </h1>

            <p className="text-[11px] text-slate-500 mt-0.5">
              Create and report a new issue
            </p>
          </div>

          {userRole === "admin" ? (
            <Link
              href="/issues"
              className="
                inline-flex
                items-center
                justify-center
                px-3
                py-1.5
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
              className="
                inline-flex
                items-center
                justify-center
                px-3
                py-1.5
                rounded-md
                border border-red-200
                bg-white
                hover:bg-red-50
                text-[11px]
                font-medium
                text-red-600
                transition
              "
            >
              Logout
            </button>
          )}
        </div>

        {/* =================================================
            REPORTER INFO
        ================================================= */}

        <div
          className="
            bg-blue-50
            border border-blue-200
            rounded-lg
            px-3
            py-2
            mb-2
          "
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">
                Reporter
              </p>

              <p className="text-xs font-semibold text-blue-900 mt-0.5">
                {userEmail}
              </p>
            </div>

            <p className="text-[10px] text-blue-600">
              Reporter otomatis menggunakan akun yang sedang login.
            </p>
          </div>
        </div>
      </div>

      {/* =================================================
          FORM
      ================================================= */}

      <form
        onSubmit={handleSubmit}
        className="
          bg-white
          p-3 sm:p-4
          rounded-lg
          shadow-sm
          space-y-3
        "
      >

        {/* =================================================
            ISSUE TITLE
        ================================================= */}

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Issue Title
          </label>

          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Example: Server tidak dapat diakses"
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
            required
          />
        </div>

        {/* =================================================
            DESCRIPTION
        ================================================= */}

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Description
          </label>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Jelaskan detail kendala yang ditemukan..."
            rows={4}
            className="
              w-full
              border border-slate-300
              rounded-md
              px-2.5
              py-2
              text-xs
              font-medium
              text-slate-800
              placeholder:text-slate-400
              bg-white
              outline-none
              resize-y
              focus:ring-2
              focus:ring-blue-500
              focus:border-blue-500
            "
            required
          />
        </div>

        {/* =================================================
            CATEGORY & PRIORITY
        ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* CATEGORY */}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Category
            </label>

            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
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
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Priority
            </label>

            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* PROJECT */}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Project
            </label>

            {userRole === "user" ? (
              <>
                <input
                  type="text"
                  value={formData.project}
                  disabled
                  className="
                    w-full
                    h-8
                    border border-slate-300
                    rounded-md
                    px-2.5
                    text-xs
                    font-medium
                    text-slate-700
                    bg-slate-100
                  "
                />

                <p className="text-[10px] text-slate-500 mt-1">
                  Project otomatis berdasarkan project akun Anda.
                </p>
              </>
            ) : (
              <select
                name="project"
                value={formData.project}
                onChange={handleChange}
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
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Location
            </label>

            <select
              name="location"
              value={formData.location}
              onChange={handleChange}
              disabled={!formData.project}
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
                disabled:bg-slate-100
                disabled:text-slate-500
              "
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
              <p className="text-[10px] text-slate-500 mt-1">
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
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Assignee
            </label>

            <select
              name="assignee"
              value={formData.assignee}
              onChange={handleChange}
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

              <option value="Alung">
                Alung
              </option>

              <option value="Syahrul">
                syahrul
              </option>

              <option value="Hagi">
                Hagi
              </option>

              <option value="Sadam">
                Sadam
              </option>

              <option value="Fadil">
                Fadil
              </option>

              <option value="Ino">
                Ino
              </option>

              <option value="Wildan">
                Wildan
              </option>
            </select>
          </div>
        )}

        {/* =================================================
            STATUS
        ================================================= */}

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Status
          </label>

          <select
            name="status"
            value={formData.status}
            className="
              w-full
              h-8
              border border-slate-300
              rounded-md
              px-2.5
              text-xs
              font-medium
              text-slate-700
              bg-slate-100
            "
            disabled
          >
            <option value="Open">
              Open
            </option>
          </select>

          <p className="text-[10px] text-slate-500 mt-1">
            Issue baru selalu dibuat dengan status Open.
          </p>
        </div>

        {/* =================================================
            BUTTONS
        ================================================= */}

        <div
          className="
            flex
            flex-col-reverse
            sm:flex-row
            justify-end
            gap-2
            pt-3
            border-t
            border-slate-100
          "
        >
          <Link
            href="/issues"
            className="
              px-3
              py-1.5
              rounded-md
              border border-slate-300
              hover:bg-slate-100
              text-center
              text-[11px]
              font-medium
              text-slate-700
              transition
            "
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="
              px-3
              py-1.5
              rounded-md
              bg-blue-600
              hover:bg-blue-700
              disabled:bg-blue-300
              text-white
              text-[11px]
              font-medium
              transition
            "
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