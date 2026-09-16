import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;
const whatsappAccessToken =
  process.env.WHATSAPP_ACCESS_TOKEN!;
const whatsappPhoneNumberId =
  process.env.WHATSAPP_PHONE_NUMBER_ID!;
const whatsappVerifyToken =
  process.env.WHATSAPP_VERIFY_TOKEN!;

const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

/* =========================================================
   TYPES
========================================================= */

type ConversationState =
  | "IDLE"
  | "WELCOME"
  | "MENU"
  | "WAITING_DESCRIPTION"
  | "WAITING_PROJECT"
  | "WAITING_LOCATION"
  | "WAITING_CATEGORY"
  | "WAITING_PRIORITY"
  | "CONFIRMING_ISSUE"
  | "EDITING_ISSUE"
  | "WAITING_ISSUE_CODE"
  | "CONFIRMING_ACTIVE_ISSUE"
  | "AGENT";

type DraftData = {
  started_at?: string;

  description?: string;
  project?: string;
  location?: string;
  category?: string;
  priority?: string;

  active_issue_id?: number;
  active_issue_code?: string;
  active_issue_status?: string;

  pending_message_id?: number;
  pending_message_text?: string;
};

type Conversation = {
  id?: number;
  phone_number: string;
  state: ConversationState;
  draft_data: DraftData;
  created_at?: string;
  updated_at?: string;
};

type WhatsAppMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
  image?: {
    id?: string;
    caption?: string;
  };
  document?: {
    id?: string;
    filename?: string;
    caption?: string;
  };
};

type WhatsAppWebhookBody = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppMessage[];
      };
    }>;
  }>;
};

/* =========================================================
   MENU / CONSTANTS
========================================================= */

const PROJECTS = [
  "TAM",
  "BPKB",
  "STNK",
  "Mahindra",
  "Hyundai",
  "LMS",
];

const CATEGORIES = [
  "Hardware",
  "Software",
  "Network",
  "Server",
  "Application",
  "Other",
];

const PRIORITIES = [
  "Critical",
  "High",
  "Medium",
  "Low",
];

/* =========================================================
   CONVERSATION TIMEOUT
========================================================= */

const CONVERSATION_TIMEOUT_MS =
  30 * 60 * 1000;

/* =========================================================
   WELCOME MESSAGE
========================================================= */

function welcomeMessage() {
  return `👋 *Halo, selamat datang di Helpdesk System.*

Pesan Anda telah diterima.

Untuk melihat layanan yang tersedia dan melanjutkan proses, silakan ketik:

👉 *MENU*

Kami siap membantu Anda.`;
}

/* =========================================================
   MAIN MENU
========================================================= */

function mainMenu() {
  return `📋 *Menu Helpdesk*

Silakan pilih layanan yang Anda butuhkan:

1️⃣ 📝 Buat Laporan Issue
2️⃣ 🔍 Cek Status Issue
3️⃣ 📋 My Issues
4️⃣ ❓ Bantuan
5️⃣ 👨‍💻 Hubungi Helpdesk

Ketik angka *1-5* untuk memilih.

Contoh:
*1*

Ketik *MENU* kapan saja untuk kembali ke menu utama.
Ketik *BATAL* untuk membatalkan proses.`;
}

/* =========================================================
   HELP MESSAGE
========================================================= */

function helpMessage() {
  return `❓ *Bantuan Helpdesk*

Berikut layanan yang tersedia:

📝 *Buat Laporan Issue*
Untuk membuat laporan masalah baru.

🔍 *Cek Status Issue*
Untuk mengecek status berdasarkan Issue Code.

📋 *My Issues*
Untuk melihat laporan issue yang dibuat melalui WhatsApp.

👨‍💻 *Hubungi Helpdesk*
Untuk menghubungi tim Helpdesk.

Perintah yang bisa digunakan:

*MENU* → Menu utama
*BATAL* → Batalkan proses
*STATUS* → Cek status issue
*MY ISSUES* → Lihat issue Anda
*BUAT ISSUE* → Buat issue baru
*AGENT* → Hubungi Helpdesk`;
}

/* =========================================================
   NORMALIZE TEXT
========================================================= */

function normalizeText(
  value: string | undefined | null
) {
  return (value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

/* =========================================================
   SEND WHATSAPP MESSAGE
========================================================= */

async function sendWhatsAppMessage(
  to: string,
  message: string
) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${whatsappPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: {
            preview_url: false,
            body: message,
          },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error(
        "WHATSAPP SEND ERROR:",
        result
      );
    }

    return result;
  } catch (error) {
    console.error(
      "WHATSAPP SEND EXCEPTION:",
      error
    );

    return null;
  }
}

/* =========================================================
   SAVE WHATSAPP MESSAGE
========================================================= */

async function saveWhatsAppMessage(
  phoneNumber: string,
  message: WhatsAppMessage
) {
  try {
    const messageId =
      message.id || null;

    if (!messageId) {
      return null;
    }

    /* Duplicate check */

    const { data: existing } =
      await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq(
          "message_id",
          messageId
        )
        .maybeSingle();

    if (existing) {
      return existing.id;
    }

    let messageText = "";

    if (message.type === "text") {
      messageText =
        message.text?.body || "";
    } else if (
      message.type === "image"
    ) {
      messageText =
        message.image?.caption ||
        "[IMAGE]";
    } else if (
      message.type === "document"
    ) {
      messageText =
        message.document?.caption ||
        message.document?.filename ||
        "[DOCUMENT]";
    } else {
      messageText =
        `[${message.type || "UNKNOWN"}]`;
    }

    const createdAt =
      message.timestamp
        ? new Date(
            Number(message.timestamp) *
              1000
          ).toISOString()
        : new Date().toISOString();

    const { data, error } =
      await supabase
        .from("whatsapp_messages")
        .insert({
          message_id: messageId,
          phone_number: phoneNumber,
          direction: "incoming",
          message_type:
            message.type || "unknown",
          message_text: messageText,
          created_at: createdAt,
        })
        .select("id")
        .single();

    if (error) {
      console.error(
        "SAVE WHATSAPP MESSAGE ERROR:",
        error
      );

      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error(
      "SAVE WHATSAPP MESSAGE EXCEPTION:",
      error
    );

    return null;
  }
}

/* =========================================================
   GET CONVERSATION
========================================================= */

async function getConversation(
  phoneNumber: string
): Promise<Conversation> {
  const { data, error } =
    await supabase
      .from(
        "whatsapp_conversations"
      )
      .select("*")
      .eq(
        "phone_number",
        phoneNumber
      )
      .maybeSingle();

  if (error) {
    console.error(
      "GET CONVERSATION ERROR:",
      error
    );
  }

  if (!data) {
    return {
      phone_number: phoneNumber,
      state: "IDLE",
      draft_data: {},
    };
  }

  return {
    ...data,
    draft_data:
      data.draft_data || {},
  };
}

/* =========================================================
   SAVE CONVERSATION
========================================================= */

async function saveConversation(
  phoneNumber: string,
  state: ConversationState,
  draftData: DraftData = {}
) {
  const { error } =
    await supabase
      .from(
        "whatsapp_conversations"
      )
      .upsert(
        {
          phone_number: phoneNumber,
          state,
          draft_data: draftData,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "phone_number",
        }
      );

  if (error) {
    console.error(
      "SAVE CONVERSATION ERROR:",
      error
    );
  }
}

/* =========================================================
   CHECK CONVERSATION TIMEOUT
========================================================= */

function isConversationExpired(
  conversation: Conversation
) {
  if (!conversation.updated_at) {
    return false;
  }

  const lastActivity =
    new Date(
      conversation.updated_at
    ).getTime();

  if (
    Number.isNaN(lastActivity)
  ) {
    return false;
  }

  const now = Date.now();

  return (
    now - lastActivity >=
    CONVERSATION_TIMEOUT_MS
  );
}

/* =========================================================
   START CREATE ISSUE
========================================================= */

async function startCreateIssue(
  phoneNumber: string
) {
  await saveConversation(
    phoneNumber,
    "WAITING_DESCRIPTION",
    {
      started_at:
        new Date().toISOString(),
    }
  );
}

/* =========================================================
   PROJECT PARSER
========================================================= */

function parseProject(
  text: string
): string | null {
  const normalized =
    normalizeText(text);

  const number = Number(
    normalized
  );

  if (
    Number.isInteger(number) &&
    number >= 1 &&
    number <= PROJECTS.length
  ) {
    return PROJECTS[number - 1];
  }

  const found =
    PROJECTS.find(
      (project) =>
        project.toUpperCase() ===
        normalized
    );

  return found || null;
}

/* =========================================================
   CATEGORY PARSER
========================================================= */

function parseCategory(
  text: string
): string | null {
  const normalized =
    normalizeText(text);

  const number = Number(
    normalized
  );

  if (
    Number.isInteger(number) &&
    number >= 1 &&
    number <= CATEGORIES.length
  ) {
    return CATEGORIES[number - 1];
  }

  const found =
    CATEGORIES.find(
      (category) =>
        category.toUpperCase() ===
        normalized
    );

  return found || null;
}

/* =========================================================
   PRIORITY PARSER
========================================================= */

function parsePriority(
  text: string
): string | null {
  const normalized =
    normalizeText(text);

  const number = Number(
    normalized
  );

  if (
    Number.isInteger(number) &&
    number >= 1 &&
    number <= PRIORITIES.length
  ) {
    return PRIORITIES[number - 1];
  }

  const found =
    PRIORITIES.find(
      (priority) =>
        priority.toUpperCase() ===
        normalized
    );

  return found || null;
}

/* =========================================================
   PROJECT MENU
========================================================= */

function projectMenu() {
  return `📁 *Pilih Project*

1️⃣ TAM
2️⃣ BPKB
3️⃣ STNK
4️⃣ Mahindra
5️⃣ Hyundai
6️⃣ LMS

Silakan ketik angka *1-6* atau nama project.`;
}

/* =========================================================
   CATEGORY MENU
========================================================= */

function categoryMenu() {
  return `🗂️ *Pilih Category*

1️⃣ Hardware
2️⃣ Software
3️⃣ Network
4️⃣ Server
5️⃣ Application
6️⃣ Other

Silakan ketik angka *1-6* atau nama category.`;
}

/* =========================================================
   PRIORITY MENU
========================================================= */

function priorityMenu() {
  return `⚡ *Pilih Priority*

1️⃣ Critical
2️⃣ High
3️⃣ Medium
4️⃣ Low

Silakan ketik angka *1-4* atau nama priority.`;
}

/* =========================================================
   CONFIRM ISSUE MESSAGE
========================================================= */

function confirmationMessage(
  draft: DraftData
) {
  return `📝 *Konfirmasi Laporan Issue*

Silakan periksa data berikut:

*Issue:*
${draft.description || "-"}

*Project:*
${draft.project || "-"}

*Location:*
${draft.location || "-"}

*Category:*
${draft.category || "-"}

*Priority:*
${draft.priority || "-"}

Apakah data sudah benar?

1️⃣ Ya, Buat Laporan
2️⃣ Ubah Data
3️⃣ Batalkan

Ketik angka *1-3*.`;
}

/* =========================================================
   EDIT MENU
========================================================= */

function editMenu(
  draft: DraftData
) {
  return `✏️ *Ubah Data Issue*

Pilih data yang ingin diubah:

1️⃣ Deskripsi
2️⃣ Project
3️⃣ Location
4️⃣ Category
5️⃣ Priority
6️⃣ Kembali ke Konfirmasi

Ketik angka *1-6*.`;
}

/* =========================================================
   FIND ACTIVE ISSUE
========================================================= */

async function findActiveIssue(
  phoneNumber: string
) {
  try {
    const { data, error } =
      await supabase
        .from("issues")
        .select(
          "id, issue_code, title, description, project, location, category, priority, status, reporter, created_at, updated_at"
        )
        .eq(
          "reporter",
          phoneNumber
        )
        .in("status", [
          "Open",
          "On Progress",
        ])
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(
        "FIND ACTIVE ISSUE ERROR:",
        error
      );

      return null;
    }

    return data || null;
  } catch (error) {
    console.error(
      "FIND ACTIVE ISSUE EXCEPTION:",
      error
    );

    return null;
  }
}

/* =========================================================
   GET ISSUE BY CODE
========================================================= */

async function getIssueByCode(
  issueCode: string
) {
  const normalizedCode =
    issueCode
      .trim()
      .toUpperCase();

  const { data, error } =
    await supabase
      .from("issues")
      .select(
        "id, issue_code, title, description, project, location, category, priority, status, reporter, created_at, updated_at"
      )
      .ilike(
        "issue_code",
        normalizedCode
      )
      .maybeSingle();

  if (error) {
    console.error(
      "GET ISSUE BY CODE ERROR:",
      error
    );

    return null;
  }

  return data || null;
}

/* =========================================================
   SEND ISSUE STATUS
========================================================= */

async function sendIssueStatus(
  phoneNumber: string,
  issueCode: string
) {
  const issue =
    await getIssueByCode(
      issueCode
    );

  if (!issue) {
    await sendWhatsAppMessage(
      phoneNumber,
      `❌ *Issue tidak ditemukan.*

Pastikan Issue Code yang Anda masukkan sudah benar.

Contoh:
*ISS-20260916-022*

Ketik *STATUS* untuk mencoba lagi.`
    );

    return;
  }

  const { data: history } =
    await supabase
      .from("issue_history")
      .select(
        "action, old_status, new_status, old_priority, new_priority, description, created_at"
      )
      .eq(
        "issue_id",
        issue.id
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(5);

  let historyText = "";

  if (
    history &&
    history.length > 0
  ) {
    historyText =
      history
        .map(
          (
            item,
            index
          ) => {
            const statusText =
              item.new_status
                ? `Status: ${item.new_status}`
                : "";

            const priorityText =
              item.new_priority
                ? `Priority: ${item.new_priority}`
                : "";

            const description =
              item.description ||
              "";

            return `${index + 1}. ${item.action || "Update"}
${statusText}
${priorityText}
${description}`.trim();
          }
        )
        .join("\n\n");
  } else {
    historyText =
      "Belum ada riwayat perubahan.";
  }

  await sendWhatsAppMessage(
    phoneNumber,
    `🔍 *Status Issue*

*Issue Code:*
${issue.issue_code}

*Issue:*
${issue.title || issue.description || "-"}

*Project:*
${issue.project || "-"}

*Location:*
${issue.location || "-"}

*Category:*
${issue.category || "-"}

*Priority:*
${issue.priority || "-"}

*Status:*
${issue.status || "-"}

━━━━━━━━━━━━━━

📜 *Riwayat Terakhir*

${historyText}

━━━━━━━━━━━━━━

Ketik *MENU* untuk kembali ke menu utama.`
  );
}

/* =========================================================
   MY ISSUES
========================================================= */

async function sendMyIssues(
  phoneNumber: string
) {
  const { data, error } =
    await supabase
      .from("issues")
      .select(
        "id, issue_code, title, project, location, category, priority, status, created_at"
      )
      .eq(
        "reporter",
        phoneNumber
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(10);

  if (error) {
    console.error(
      "MY ISSUES ERROR:",
      error
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `❌ Terjadi kesalahan saat mengambil data issue.

Silakan coba lagi.`
    );

    return;
  }

  if (
    !data ||
    data.length === 0
  ) {
    await saveConversation(
      phoneNumber,
      "MENU",
      {}
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `📋 *My Issues*

Belum ada issue yang dibuat melalui WhatsApp.

${mainMenu()}`
    );

    return;
  }

  const issueList =
    data
      .map(
        (
          issue,
          index
        ) =>
          `${index + 1}. *${issue.issue_code}*
${issue.title || "-"}
Project: ${issue.project || "-"}
Status: ${issue.status || "-"}
Priority: ${issue.priority || "-"}`
      )
      .join("\n\n");

  await saveConversation(
    phoneNumber,
    "MENU",
    {}
  );

  await sendWhatsAppMessage(
    phoneNumber,
    `📋 *My Issues*

${issueList}

━━━━━━━━━━━━━━

${mainMenu()}`
  );
}

/* =========================================================
   GENERATE ISSUE CODE
========================================================= */

async function generateIssueCode() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  const datePrefix =
    `ISS-${year}${month}${day}-`;

  const { data, error } =
    await supabase
      .from("issues")
      .select("issue_code")
      .like(
        "issue_code",
        `${datePrefix}%`
      )
      .order("issue_code", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    console.error(
      "GENERATE ISSUE CODE ERROR:",
      error
    );
  }

  let nextNumber = 1;

  if (data?.issue_code) {
    const lastPart =
      data.issue_code
        .split("-")
        .pop();

    const lastNumber =
      Number(lastPart);

    if (
      Number.isFinite(
        lastNumber
      )
    ) {
      nextNumber =
        lastNumber + 1;
    }
  }

  return `${datePrefix}${String(
    nextNumber
  ).padStart(3, "0")}`;
}

/* =========================================================
   CREATE ISSUE FROM DRAFT
========================================================= */

async function createIssueFromDraft(
  phoneNumber: string,
  draft: DraftData
) {
  try {
    const issueCode =
      await generateIssueCode();

    const description =
      draft.description?.trim() ||
      "Issue dari WhatsApp";

    const title =
      description.length > 100
        ? `${description.substring(
            0,
            97
          )}...`
        : description;

    const {
      data: issue,
      error,
    } = await supabase
      .from("issues")
      .insert({
        issue_code:
          issueCode,
        title,
        description,
        project:
          draft.project ||
          null,
        location:
          draft.location ||
          null,
        category:
          draft.category ||
          "Other",
        priority:
          draft.priority ||
          "Medium",
        status: "Open",
        reporter:
          phoneNumber,
        source: "WhatsApp",
        created_at:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      })
      .select(
        "id, issue_code, title, project, location, category, priority, status"
      )
      .single();

    if (
      error ||
      !issue
    ) {
      console.error(
        "CREATE ISSUE ERROR:",
        error
      );

      await sendWhatsAppMessage(
        phoneNumber,
        `❌ *Gagal membuat issue.*

Terjadi kesalahan saat menyimpan laporan.

Silakan coba lagi dengan mengetik:
*BUAT ISSUE*`
      );

      return false;
    }

    /* =====================================================
       LINK PENDING MESSAGE
    ===================================================== */

    if (
      draft.pending_message_id
    ) {
      const {
        error: linkError,
      } = await supabase
        .from(
          "whatsapp_messages"
        )
        .update({
          issue_id:
            issue.id,
        })
        .eq(
          "id",
          draft.pending_message_id
        );

      if (linkError) {
        console.error(
          "LINK PENDING MESSAGE ERROR:",
          linkError
        );
      }
    }

    /* =====================================================
       LINK OTHER RECENT UNLINKED MESSAGES
    ===================================================== */

    if (
      draft.started_at
    ) {
      const {
        error:
          bulkLinkError,
      } = await supabase
        .from(
          "whatsapp_messages"
        )
        .update({
          issue_id:
            issue.id,
        })
        .eq(
          "phone_number",
          phoneNumber
        )
        .is(
          "issue_id",
          null
        )
        .gte(
          "created_at",
          draft.started_at
        );

      if (bulkLinkError) {
        console.error(
          "BULK LINK WHATSAPP MESSAGE ERROR:",
          bulkLinkError
        );
      }
    }

    /* =====================================================
       SEND SUCCESS
    ===================================================== */

    await sendWhatsAppMessage(
      phoneNumber,
      `✅ *Laporan Issue Berhasil Dibuat*

*Issue Code:*
${issue.issue_code}

*Issue:*
${issue.title || "-"}

*Project:*
${issue.project || "-"}

*Location:*
${issue.location || "-"}

*Category:*
${issue.category || "-"}

*Priority:*
${issue.priority || "-"}

*Status:*
${issue.status || "-"}

━━━━━━━━━━━━━━

Laporan sudah masuk ke sistem Helpdesk.

Ketik *STATUS* untuk mengecek status issue.

Ketik *MENU* untuk kembali ke menu utama.`
    );

    await saveConversation(
      phoneNumber,
      "MENU",
      {}
    );

    return true;
  } catch (error) {
    console.error(
      "CREATE ISSUE EXCEPTION:",
      error
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `❌ Terjadi kesalahan saat membuat issue.

Silakan coba lagi.`
    );

    return false;
  }
}

/* =========================================================
   HANDLE MENU STATE
========================================================= */

async function handleMenuState(
  phoneNumber: string,
  text: string
) {
  switch (text) {
    case "1":
      await startCreateIssue(
        phoneNumber
      );

      await sendWhatsAppMessage(
        phoneNumber,
        `📝 *Buat Laporan Issue*

Silakan jelaskan masalah yang ingin dilaporkan.

Contoh:
*Printer CFD tidak bisa mencetak dokumen.*

Ketik *BATAL* jika ingin membatalkan.`
      );

      return;

    case "2":
      await saveConversation(
        phoneNumber,
        "WAITING_ISSUE_CODE",
        {}
      );

      await sendWhatsAppMessage(
        phoneNumber,
        `🔍 *Cek Status Issue*

Masukkan *Issue Code*.

Contoh:
*ISS-20260916-022*

Ketik *BATAL* untuk kembali.`
      );

      return;

    case "3":
      await sendMyIssues(
        phoneNumber
      );

      return;

    case "4":
      await sendWhatsAppMessage(
        phoneNumber,
        helpMessage()
      );

      return;

    case "5":
      await saveConversation(
        phoneNumber,
        "AGENT",
        {}
      );

      await sendWhatsAppMessage(
        phoneNumber,
        `👨‍💻 *Hubungi Helpdesk*

Silakan jelaskan kebutuhan Anda.

Tim Helpdesk akan menindaklanjuti pesan Anda.

Ketik *BATAL* jika ingin membatalkan.`
      );

      return;

    default:
      await sendWhatsAppMessage(
        phoneNumber,
        `❌ *Pilihan tidak valid.*

Silakan pilih angka *1-5*.

${mainMenu()}`
      );

      return;
  }
}

/* =========================================================
   HANDLE CONVERSATION STATE
========================================================= */

async function handleConversationState(
  phoneNumber: string,
  conversation: Conversation,
  text: string,
  messageId: number | null
) {
  const state =
    conversation.state;

  const draft =
    conversation.draft_data ||
    {};

  switch (state) {
    /* =====================================================
       WELCOME
    ===================================================== */

    case "WELCOME": {
      if (text === "MENU") {
        await saveConversation(
          phoneNumber,
          "MENU",
          {}
        );

        await sendWhatsAppMessage(
          phoneNumber,
          mainMenu()
        );

        return;
      }

      await sendWhatsAppMessage(
        phoneNumber,
        `Untuk melanjutkan layanan Helpdesk, silakan ketik:

👉 *MENU*

Setelah itu Anda dapat memilih layanan yang tersedia.`
      );

      return;
    }

    /* =====================================================
       MENU
    ===================================================== */

    case "MENU": {
      await handleMenuState(
        phoneNumber,
        text
      );

      return;
    }

    /* =====================================================
       ACTIVE ISSUE CONFIRMATION
    ===================================================== */

    case "CONFIRMING_ACTIVE_ISSUE": {
      if (text === "1") {
        const activeIssueId =
          draft.active_issue_id;

        if (
          activeIssueId &&
          messageId
        ) {
          const {
            error,
          } = await supabase
            .from(
              "whatsapp_messages"
            )
            .update({
              issue_id:
                activeIssueId,
            })
            .eq(
              "id",
              messageId
            );

          if (error) {
            console.error(
              "LINK ACTIVE ISSUE MESSAGE ERROR:",
              error
            );
          }
        }

        await saveConversation(
          phoneNumber,
          "MENU",
          {}
        );

        await sendWhatsAppMessage(
          phoneNumber,
          `✅ Pesan Anda berhasil ditambahkan ke issue:

*${draft.active_issue_code || "-"}*

Status saat ini:
*${draft.active_issue_status || "-"}*

Ketik *MENU* untuk kembali ke menu utama.`
        );

        return;
      }

      if (text === "2") {
        await saveConversation(
          phoneNumber,
          "WAITING_PROJECT",
          {
            description:
              draft.pending_message_text ||
              "",
            pending_message_id:
              draft.pending_message_id ||
              messageId ||
              undefined,
            started_at:
              draft.started_at ||
              new Date().toISOString(),
          }
        );

        await sendWhatsAppMessage(
          phoneNumber,
          `📝 *Buat Laporan Issue Baru*

Pesan Anda akan digunakan sebagai deskripsi issue.

Silakan pilih project:

${projectMenu()}`
        );

        return;
      }

      if (text === "3") {
        if (
          draft.active_issue_code
        ) {
          await sendIssueStatus(
            phoneNumber,
            draft.active_issue_code
          );
        }

        await saveConversation(
          phoneNumber,
          "MENU",
          {}
        );

        return;
      }

      if (
        text === "4" ||
        text === "BACK"
      ) {
        await saveConversation(
          phoneNumber,
          "MENU",
          {}
        );

        await sendWhatsAppMessage(
          phoneNumber,
          mainMenu()
        );

        return;
      }

      await sendWhatsAppMessage(
        phoneNumber,
        `❌ Pilihan tidak valid.

Silakan pilih:

1️⃣ Tambahkan ke Issue
2️⃣ Buat Issue Baru
3️⃣ Lihat Status Issue
4️⃣ Kembali ke Menu`
      );

      return;
    }

    /* =====================================================
       WAITING DESCRIPTION
    ===================================================== */

    case "WAITING_DESCRIPTION": {
      if (!text) {
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Deskripsi tidak boleh kosong.

Silakan jelaskan masalah yang ingin dilaporkan.`
        );

        return;
      }

      await saveConversation(
        phoneNumber,
        "WAITING_PROJECT",
        {
          ...draft,
          description:
            text,
          started_at:
            draft.started_at ||
            new Date().toISOString(),
          pending_message_id:
            draft.pending_message_id ||
            messageId ||
            undefined,
          pending_message_text:
            draft.pending_message_text ||
            text,
        }
      );

      await sendWhatsAppMessage(
        phoneNumber,
        projectMenu()
      );

      return;
    }

    /* =====================================================
       WAITING PROJECT
    ===================================================== */

    case "WAITING_PROJECT": {
      const project =
        parseProject(text);

      if (!project) {
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Project tidak valid.

${projectMenu()}`
        );

        return;
      }

      await saveConversation(
        phoneNumber,
        "WAITING_LOCATION",
        {
          ...draft,
          project,
        }
      );

      await sendWhatsAppMessage(
        phoneNumber,
        `📍 *Location*

Silakan masukkan lokasi issue.

Contoh:
*NVDC Cibitung*
*NVDC Sunter*
*NVDC Karawang*
*BPKB Makassar*

Ketik nama lokasi secara langsung.`
      );

      return;
    }

    /* =====================================================
       WAITING LOCATION
    ===================================================== */

    case "WAITING_LOCATION": {
      if (!text) {
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Location tidak boleh kosong.

Silakan masukkan lokasi issue.`
        );

        return;
      }

      await saveConversation(
        phoneNumber,
        "WAITING_CATEGORY",
        {
          ...draft,
          location:
            text,
        }
      );

      await sendWhatsAppMessage(
        phoneNumber,
        categoryMenu()
      );

      return;
    }

    /* =====================================================
       WAITING CATEGORY
    ===================================================== */

    case "WAITING_CATEGORY": {
      const category =
        parseCategory(text);

      if (!category) {
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Category tidak valid.

${categoryMenu()}`
        );

        return;
      }

      await saveConversation(
        phoneNumber,
        "WAITING_PRIORITY",
        {
          ...draft,
          category,
        }
      );

      await sendWhatsAppMessage(
        phoneNumber,
        priorityMenu()
      );

      return;
    }

    /* =====================================================
       WAITING PRIORITY
    ===================================================== */

    case "WAITING_PRIORITY": {
      const priority =
        parsePriority(text);

      if (!priority) {
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Priority tidak valid.

${priorityMenu()}`
        );

        return;
      }

      const updatedDraft:
        DraftData = {
          ...draft,
          priority,
        };

      await saveConversation(
        phoneNumber,
        "CONFIRMING_ISSUE",
        updatedDraft
      );

      await sendWhatsAppMessage(
        phoneNumber,
        confirmationMessage(
          updatedDraft
        )
      );

      return;
    }

    /* =====================================================
       CONFIRMING ISSUE
    ===================================================== */

    case "CONFIRMING_ISSUE": {
      if (
        text === "1" ||
        text === "YA" ||
        text === "YES"
      ) {
        await createIssueFromDraft(
          phoneNumber,
          draft
        );

        return;
      }

      if (text === "2") {
        await saveConversation(
          phoneNumber,
          "EDITING_ISSUE",
          draft
        );

        await sendWhatsAppMessage(
          phoneNumber,
          editMenu(draft)
        );

        return;
      }

      if (
        text === "3" ||
        text === "BATAL" ||
        text === "CANCEL"
      ) {
        await saveConversation(
          phoneNumber,
          "MENU",
          {}
        );

        await sendWhatsAppMessage(
          phoneNumber,
          `❌ *Pembuatan issue dibatalkan.*

Tidak ada laporan yang dibuat.

Untuk kembali ke layanan utama, ketik:

👉 *MENU*`
        );

        return;
      }

      await sendWhatsAppMessage(
        phoneNumber,
        `❌ Pilihan tidak valid.

${confirmationMessage(
  draft
)}`
      );

      return;
    }

    /* =====================================================
       EDITING ISSUE
    ===================================================== */

    case "EDITING_ISSUE": {
      if (text === "1") {
        await saveConversation(
          phoneNumber,
          "WAITING_DESCRIPTION",
          draft
        );

        await sendWhatsAppMessage(
          phoneNumber,
          `✏️ *Ubah Deskripsi*

Silakan masukkan deskripsi issue yang baru.`
        );

        return;
      }

      if (text === "2") {
        await saveConversation(
          phoneNumber,
          "WAITING_PROJECT",
          draft
        );

        await sendWhatsAppMessage(
          phoneNumber,
          `✏️ *Ubah Project*

${projectMenu()}`
        );

        return;
      }

      if (text === "3") {
        await saveConversation(
          phoneNumber,
          "WAITING_LOCATION",
          draft
        );

        await sendWhatsAppMessage(
          phoneNumber,
          `✏️ *Ubah Location*

Silakan masukkan lokasi yang baru.`
        );

        return;
      }

      if (text === "4") {
        await saveConversation(
          phoneNumber,
          "WAITING_CATEGORY",
          draft
        );

        await sendWhatsAppMessage(
          phoneNumber,
          `✏️ *Ubah Category*

${categoryMenu()}`
        );

        return;
      }

      if (text === "5") {
        await saveConversation(
          phoneNumber,
          "WAITING_PRIORITY",
          draft
        );

        await sendWhatsAppMessage(
          phoneNumber,
          `✏️ *Ubah Priority*

${priorityMenu()}`
        );

        return;
      }

      if (text === "6") {
        await saveConversation(
          phoneNumber,
          "CONFIRMING_ISSUE",
          draft
        );

        await sendWhatsAppMessage(
          phoneNumber,
          confirmationMessage(
            draft
          )
        );

        return;
      }

      await sendWhatsAppMessage(
        phoneNumber,
        `❌ Pilihan tidak valid.

${editMenu(draft)}`
      );

      return;
    }

    /* =====================================================
       WAITING ISSUE CODE
    ===================================================== */

    case "WAITING_ISSUE_CODE": {
      if (!text) {
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Issue Code tidak boleh kosong.

Contoh:
*ISS-20260916-022*`
        );

        return;
      }

      await sendIssueStatus(
        phoneNumber,
        text
      );

      await saveConversation(
        phoneNumber,
        "MENU",
        {}
      );

      return;
    }

    /* =====================================================
       AGENT
    ===================================================== */

    case "AGENT": {
      if (
        text === "BATAL" ||
        text === "BACK"
      ) {
        await saveConversation(
          phoneNumber,
          "MENU",
          {}
        );

        await sendWhatsAppMessage(
          phoneNumber,
          `❌ *Proses dibatalkan.*

Tidak ada laporan yang dibuat.

Untuk kembali ke layanan utama, ketik:

👉 *MENU*`
        );

        return;
      }

      await sendWhatsAppMessage(
        phoneNumber,
        `📨 Pesan Anda sudah diterima oleh Helpdesk.

Tim Helpdesk akan menindaklanjuti pesan Anda.

Ketik *BATAL* jika ingin membatalkan.`
      );

      return;
    }

    /* =====================================================
       IDLE
    ===================================================== */

    case "IDLE":
    default: {
      /*
       * User belum pernah memulai percakapan
       * atau conversation sudah kembali ke IDLE.
       *
       * Jangan langsung tampilkan menu.
       * Arahkan user untuk mengetik MENU.
       */

      await saveConversation(
        phoneNumber,
        "WELCOME",
        {}
      );

      await sendWhatsAppMessage(
        phoneNumber,
        welcomeMessage()
      );

      return;
    }
  }
}

/* =========================================================
   PROCESS INCOMING MESSAGE
========================================================= */

async function processIncomingMessage(
  message: WhatsAppMessage
) {
  const phoneNumber =
    message.from;

  if (!phoneNumber) {
    console.error(
      "MESSAGE WITHOUT PHONE NUMBER"
    );

    return;
  }

  /* =====================================================
     SAVE MESSAGE
  ===================================================== */

  const savedMessageId =
    await saveWhatsAppMessage(
      phoneNumber,
      message
    );

  /* =====================================================
     GET MESSAGE TEXT
  ===================================================== */

  let rawText = "";

  if (message.type === "text") {
    rawText =
      message.text?.body ||
      "";
  } else if (
    message.type === "image"
  ) {
    rawText =
      message.image?.caption ||
      "[IMAGE]";
  } else if (
    message.type === "document"
  ) {
    rawText =
      message.document?.caption ||
      message.document?.filename ||
      "[DOCUMENT]";
  } else {
    rawText =
      `[${message.type || "UNKNOWN"}]`;
  }

  const text =
    normalizeText(rawText);

  /* =====================================================
     GET CONVERSATION
  ===================================================== */

  let conversation =
    await getConversation(
      phoneNumber
    );

  /* =====================================================
     CHECK 30 MINUTE INACTIVITY
  ===================================================== */

  if (
    isConversationExpired(
      conversation
    )
  ) {
    console.log(
      "WHATSAPP CONVERSATION EXPIRED:",
      phoneNumber
    );

    /*
     * Sesi lama dianggap selesai.
     *
     * Tidak menghapus:
     * - issues
     * - issue_history
     * - whatsapp_messages
     *
     * Hanya mereset conversation:
     * - state -> IDLE
     * - draft_data -> {}
     */

    await saveConversation(
      phoneNumber,
      "IDLE",
      {}
    );

    conversation = {
      ...conversation,
      state: "IDLE",
      draft_data: {},
      updated_at:
        new Date().toISOString(),
    };
  }

  /* =====================================================
     GLOBAL COMMAND: BATAL
  ===================================================== */

  if (
    text === "BATAL" ||
    text === "CANCEL"
  ) {
    /*
     * BATAL tidak menampilkan menu.
     *
     * User diarahkan untuk mengetik MENU
     * apabila ingin kembali ke layanan utama.
     */

    await saveConversation(
      phoneNumber,
      "MENU",
      {}
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `❌ *Proses dibatalkan.*

Tidak ada laporan yang dibuat.

Untuk kembali ke layanan utama, ketik:

👉 *MENU*`
    );

    return;
  }

  /* =====================================================
     GLOBAL COMMAND: MENU
  ===================================================== */

  if (text === "MENU") {
    await saveConversation(
      phoneNumber,
      "MENU",
      {}
    );

    await sendWhatsAppMessage(
      phoneNumber,
      mainMenu()
    );

    return;
  }

  /* =====================================================
     GLOBAL COMMAND: BUAT ISSUE
  ===================================================== */

  if (
    text === "BUAT ISSUE" ||
    text === "BUAT LAPORAN" ||
    text === "CREATE ISSUE"
  ) {
    await startCreateIssue(
      phoneNumber
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `📝 *Buat Laporan Issue*

Silakan jelaskan masalah yang ingin dilaporkan.

Contoh:
*Printer CFD tidak bisa mencetak dokumen.*

Ketik *BATAL* jika ingin membatalkan.`
    );

    return;
  }

  /* =====================================================
     GLOBAL COMMAND: STATUS
  ===================================================== */

  if (
    text === "STATUS" ||
    text === "CEK STATUS"
  ) {
    await saveConversation(
      phoneNumber,
      "WAITING_ISSUE_CODE",
      {}
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `🔍 *Cek Status Issue*

Masukkan *Issue Code*.

Contoh:
*ISS-20260916-022*

Ketik *BATAL* untuk membatalkan.`
    );

    return;
  }

  /* =====================================================
     GLOBAL COMMAND: MY ISSUES
  ===================================================== */

  if (
    text === "MY ISSUES" ||
    text === "MY ISSUE" ||
    text === "RIWAYAT"
  ) {
    await sendMyIssues(
      phoneNumber
    );

    return;
  }

  /* =====================================================
     GLOBAL COMMAND: BANTUAN
  ===================================================== */

  if (
    text === "BANTUAN" ||
    text === "HELP"
  ) {
    await sendWhatsAppMessage(
      phoneNumber,
      helpMessage()
    );

    return;
  }

  /* =====================================================
     GLOBAL COMMAND: AGENT
  ===================================================== */

  if (
    text === "AGENT" ||
    text === "HELPDESK"
  ) {
    await saveConversation(
      phoneNumber,
      "AGENT",
      {}
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `👨‍💻 *Hubungi Helpdesk*

Silakan jelaskan kebutuhan Anda.

Tim Helpdesk akan menindaklanjuti pesan Anda.

Ketik *BATAL* jika ingin membatalkan.`
    );

    return;
  }

  /* =====================================================
     HANDLE CURRENT STATE
  ===================================================== */

  await handleConversationState(
    phoneNumber,
    conversation,
    text,
    savedMessageId
  );
}

/* =========================================================
   GET WEBHOOK VERIFICATION
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const searchParams =
      request.nextUrl.searchParams;

    const mode =
      searchParams.get(
        "hub.mode"
      );

    const token =
      searchParams.get(
        "hub.verify_token"
      );

    const challenge =
      searchParams.get(
        "hub.challenge"
      );

    console.log(
      "WHATSAPP WEBHOOK VERIFY:",
      {
        mode,
        tokenReceived:
          !!token,
        challengeReceived:
          !!challenge,
      }
    );

    if (
      mode === "subscribe" &&
      token ===
        whatsappVerifyToken
    ) {
      console.log(
        "WHATSAPP WEBHOOK VERIFIED"
      );

      return new NextResponse(
        challenge || "",
        {
          status: 200,
        }
      );
    }

    return new NextResponse(
      "Forbidden",
      {
        status: 403,
      }
    );
  } catch (error) {
    console.error(
      "WEBHOOK GET ERROR:",
      error
    );

    return new NextResponse(
      "Internal Server Error",
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST WEBHOOK
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    console.log(
      "WHATSAPP WEBHOOK RECEIVED"
    );

    const body =
      (await request.json()) as WhatsAppWebhookBody;

    console.log(
      "WHATSAPP WEBHOOK BODY:",
      JSON.stringify(body)
    );

    if (
      body.object !==
      "whatsapp_business_account"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid webhook object",
        },
        {
          status: 400,
        }
      );
    }

    const entries =
      body.entry || [];

    for (
      const entry of entries
    ) {
      const changes =
        entry.changes || [];

      for (
        const change of changes
      ) {
        const messages =
          change.value
            ?.messages || [];

        for (
          const message of messages
        ) {
          try {
            await processIncomingMessage(
              message
            );
          } catch (error) {
            console.error(
              "PROCESS INCOMING MESSAGE ERROR:",
              error
            );
          }
        }
      }
    }

    /*
     * Meta membutuhkan response 200.
     */

    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "WHATSAPP WEBHOOK POST ERROR:",
      error
    );

    /*
     * Tetap response 200 supaya Meta
     * tidak terus melakukan retry terhadap webhook.
     */

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 200,
      }
    );
  }
}