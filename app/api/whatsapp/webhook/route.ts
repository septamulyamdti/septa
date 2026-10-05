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
  | "WAITING_ISSUE_DATA"
  | "WAITING_DESCRIPTION"
  | "WAITING_PROJECT"
  | "WAITING_LOCATION"
  | "WAITING_CATEGORY"
  | "WAITING_PRIORITY"
  | "CONFIRMING_ISSUE"
  | "EDITING_ISSUE"
  | "WAITING_ISSUE_CODE"
  | "WAITING_MY_ISSUE_SELECTION"
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

  my_issue_ids?: number[];
  my_issue_codes?: string[];

  agent_ack_sent?: boolean;
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
   CONSTANTS
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

const CONVERSATION_TIMEOUT_MS =
  30 * 60 * 1000;

/* =========================================================
   WELCOME MESSAGE
========================================================= */

function welcomeMessage() {
  return `👋 *Halo, selamat datang di Helpdesk System.*

Silakan pilih layanan:

1️⃣ 📝 Buat Issue
2️⃣ 🔍 Cek Status
3️⃣ 📋 My Issues
4️⃣ ❓ Bantuan
5️⃣ 👨‍💻 Hubungi Helpdesk

Ketik *1-5* untuk memilih.`;
}

/* =========================================================
   MAIN MENU
========================================================= */

function mainMenu() {
  return `📋 *Menu Helpdesk*

1️⃣ 📝 Buat Issue
2️⃣ 🔍 Cek Status
3️⃣ 📋 My Issues
4️⃣ ❓ Bantuan
5️⃣ 👨‍💻 Hubungi Helpdesk

Ketik *1-5*.`;
}

/* =========================================================
   HELP MESSAGE
========================================================= */

function helpMessage() {
  return `❓ *Bantuan Helpdesk*

📝 *1* — Buat laporan issue
🔍 *2* — Cek status issue
📋 *3* — Lihat My Issues
👨‍💻 *5* — Hubungi Helpdesk

Perintah cepat:
*BUAT ISSUE*
*STATUS ISS-YYYYMMDD-XXX*
*MY ISSUES*
*AGENT*
*MENU*
*BATAL*`;
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

  return (
    Date.now() - lastActivity >=
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
    "WAITING_ISSUE_DATA",
    {
      started_at:
        new Date().toISOString(),
    }
  );
}

/* =========================================================
   ISSUE DATA PROMPT
========================================================= */

function issueDataPrompt() {
  return `📝 *Buat Laporan Issue*

Kirim semua data dalam *1 pesan*:

*Issue:* Jelaskan masalah
*Project:* TAM / BPKB / STNK / Mahindra / Hyundai / LMS
*Location:* Lokasi issue
*Category:* Hardware / Software / Network / Server / Application / Other
*Priority:* Critical / High / Medium / Low

Contoh:
*Issue:* Printer CFD tidak bisa mencetak
*Project:* TAM
*Location:* NVDC Sunter
*Category:* Hardware
*Priority:* High`;
}

/* =========================================================
   PARSE ISSUE DATA
========================================================= */

function parseIssueData(text: string): {
  description: string;
  project: string;
  location: string;
  category: string;
  priority: string;
} | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const values: Record<string, string> =
    {};

  for (const line of lines) {
    const match = line.match(
      /^(Issue|Project|Location|Category|Priority)\s*:\s*(.+)$/i
    );

    if (match) {
      values[
        match[1].toLowerCase()
      ] = match[2].trim();
    }
  }

  const description =
    values.issue || "";

  const project =
    parseProject(
      values.project || ""
    );

  const category =
    parseCategory(
      values.category || ""
    );

  const priority =
    parsePriority(
      values.priority || ""
    );

  const location =
    values.location || "";

  if (
    !description ||
    !project ||
    !location ||
    !category ||
    !priority
  ) {
    return null;
  }

  return {
    description,
    project,
    location,
    category,
    priority,
  };
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
   Legacy support
========================================================= */

function projectMenu() {
  return `📁 *Pilih Project*

1️⃣ TAM
2️⃣ BPKB
3️⃣ STNK
4️⃣ Mahindra
5️⃣ Hyundai
6️⃣ LMS`;
}

/* =========================================================
   CATEGORY MENU
   Legacy support
========================================================= */

function categoryMenu() {
  return `🗂️ *Pilih Category*

1️⃣ Hardware
2️⃣ Software
3️⃣ Network
4️⃣ Server
5️⃣ Application
6️⃣ Other`;
}

/* =========================================================
   PRIORITY MENU
   Legacy support
========================================================= */

function priorityMenu() {
  return `⚡ *Pilih Priority*

1️⃣ Critical
2️⃣ High
3️⃣ Medium
4️⃣ Low`;
}

/* =========================================================
   CONFIRM ISSUE MESSAGE
========================================================= */

function confirmationMessage(
  draft: DraftData
) {
  return `📝 *Konfirmasi Issue*

📝 *Issue:* ${draft.description || "-"}
📁 *Project:* ${draft.project || "-"}
📍 *Location:* ${draft.location || "-"}
🏷️ *Category:* ${draft.category || "-"}
⚡ *Priority:* ${draft.priority || "-"}

1️⃣ Ya, Buat
2️⃣ Ubah Data
3️⃣ Batalkan

Ketik *1-3*.`;
}

/* =========================================================
   EDIT MENU
========================================================= */

function editMenu(
  draft: DraftData
) {
  return `✏️ *Ubah Data Issue*

Kirim ulang semua data dalam *1 pesan*:

*Issue:* Jelaskan masalah
*Project:* TAM / BPKB / STNK / Mahindra / Hyundai / LMS
*Location:* Lokasi issue
*Category:* Hardware / Software / Network / Server / Application / Other
*Priority:* Critical / High / Medium / Low

Data lama akan diganti.`;
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
        `
        id,
        issue_code,
        title,
        description,
        project,
        location,
        category,
        priority,
        status,
        reporter,
        assignee,
        resolution,
        created_at,
        updated_at
        `
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
  const normalizedCode =
    issueCode.trim().toUpperCase();

  const issue =
    await getIssueByCode(
      normalizedCode
    );

  if (!issue) {
    await sendWhatsAppMessage(
      phoneNumber,
      `❌ *Issue tidak ditemukan.*

*${normalizedCode}*

Pastikan Issue Code benar.

Contoh:
*ISS-20260916-022*`
    );

    return;
  }

  const {
    data: history,
    error: historyError,
  } = await supabase
    .from("issue_history")
    .select(
      `
      action,
      old_status,
      new_status,
      old_priority,
      new_priority,
      description,
      created_at
      `
    )
    .eq(
      "issue_id",
      issue.id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(5);

  if (historyError) {
    console.error(
      "GET ISSUE HISTORY ERROR:",
      historyError
    );
  }

  let historyText =
    "Belum ada riwayat perubahan.";

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
            const changes: string[] =
              [];

            if (
              item.old_status ||
              item.new_status
            ) {
              if (
                item.old_status &&
                item.new_status
              ) {
                changes.push(
                  `Status: ${item.old_status} → ${item.new_status}`
                );
              } else if (
                item.new_status
              ) {
                changes.push(
                  `Status: ${item.new_status}`
                );
              }
            }

            if (
              item.old_priority ||
              item.new_priority
            ) {
              if (
                item.old_priority &&
                item.new_priority
              ) {
                changes.push(
                  `Priority: ${item.old_priority} → ${item.new_priority}`
                );
              } else if (
                item.new_priority
              ) {
                changes.push(
                  `Priority: ${item.new_priority}`
                );
              }
            }

            if (
              item.description
            ) {
              changes.push(
                item.description
              );
            }

            const date =
              item.created_at
                ? new Date(
                    item.created_at
                  ).toLocaleString(
                    "id-ID",
                    {
                      dateStyle:
                        "medium",
                      timeStyle:
                        "short",
                    }
                  )
                : "-";

            return `*${index + 1}.* ${
              item.action ||
              "Update"
            }
${
  changes.length > 0
    ? changes.join("\n")
    : "Tidak ada detail perubahan."
}
🕐 ${date}`;
          }
        )
        .join("\n\n");
  }

  const createdAt =
    issue.created_at
      ? new Date(
          issue.created_at
        ).toLocaleString(
          "id-ID",
          {
            dateStyle:
              "medium",
            timeStyle:
              "short",
          }
        )
      : "-";

  const updatedAt =
    issue.updated_at
      ? new Date(
          issue.updated_at
        ).toLocaleString(
          "id-ID",
          {
            dateStyle:
              "medium",
            timeStyle:
              "short",
          }
        )
      : "-";

  await sendWhatsAppMessage(
    phoneNumber,
    `🔍 *DETAIL ISSUE*

*${issue.issue_code}*

📝 *Issue:* ${issue.title || "-"}
📄 *Description:* ${issue.description || "-"}
📁 *Project:* ${issue.project || "-"}
📍 *Location:* ${issue.location || "-"}
🏷️ *Category:* ${issue.category || "-"}
⚡ *Priority:* ${issue.priority || "-"}
📊 *Status:* ${issue.status || "-"}
👨‍💻 *Assignee:* ${
      issue.assignee ||
      "Belum ditugaskan"
    }
🛠️ *Resolution:* ${
      issue.resolution ||
      "Belum ada"
    }

📅 Dibuat: ${createdAt}
🔄 Update: ${updatedAt}

📜 *Riwayat*
${historyText}

Ketik *STATUS ISSUE-CODE* untuk cek issue lain.
Ketik *MY ISSUES* untuk melihat laporan.
Ketik *MENU* untuk menu utama.`
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
        `
        id,
        issue_code,
        title,
        project,
        location,
        category,
        priority,
        status,
        assignee,
        created_at,
        updated_at
        `
      )
      .eq(
        "reporter",
        phoneNumber
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(10);

  if (error) {
    console.error(
      "MY ISSUES ERROR:",
      error
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `❌ Gagal mengambil My Issues.

Coba lagi:
*MY ISSUES*`
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
      `📋 *MY ISSUES*

Belum ada issue dari nomor WhatsApp ini.

Ketik *BUAT ISSUE* untuk membuat laporan.`
    );

    return;
  }

  const issueList =
    data
      .map(
        (
          issue,
          index
        ) => {
          return `${index + 1}️⃣ *${issue.issue_code}*
📝 ${issue.title || "-"}
📁 ${issue.project || "-"} | 📍 ${issue.location || "-"}
⚡ ${issue.priority || "-"} | 📊 ${issue.status || "-"}`;
        }
      )
      .join("\n\n");

  const myIssueIds =
    data.map(
      (issue) => issue.id
    );

  const myIssueCodes =
    data.map(
      (issue) =>
        issue.issue_code
    );

  await saveConversation(
    phoneNumber,
    "WAITING_MY_ISSUE_SELECTION",
    {
      my_issue_ids:
        myIssueIds,
      my_issue_codes:
        myIssueCodes,
    }
  );

  await sendWhatsAppMessage(
    phoneNumber,
    `📋 *MY ISSUES*

${issueList}

Ketik nomor untuk melihat detail.
Contoh: *1*

Ketik *MENU* untuk kembali.`
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

Silakan coba lagi:
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
       SUCCESS
    ===================================================== */

    await sendWhatsAppMessage(
      phoneNumber,
      `✅ *Issue Berhasil Dibuat*

*${issue.issue_code}*

📝 ${issue.title || "-"}
📁 ${issue.project || "-"}
📍 ${issue.location || "-"}
🏷️ ${issue.category || "-"}
⚡ ${issue.priority || "-"}
📊 ${issue.status || "-"}

Laporan sudah masuk ke Helpdesk.

Ketik *STATUS ${issue.issue_code}* untuk melihat status.`
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
    case "1": {
      await startCreateIssue(
        phoneNumber
      );

      await sendWhatsAppMessage(
        phoneNumber,
        issueDataPrompt()
      );

      return;
    }

    case "2": {
      await saveConversation(
        phoneNumber,
        "WAITING_ISSUE_CODE",
        {}
      );

      await sendWhatsAppMessage(
        phoneNumber,
        `🔍 *Cek Status Issue*

Kirim Issue Code.

Contoh:
*STATUS ISS-20260916-022*

Atau cukup kirim:
*ISS-20260916-022*`
      );

      return;
    }

    case "3": {
      await sendMyIssues(
        phoneNumber
      );

      return;
    }

    case "4": {
      await sendWhatsAppMessage(
        phoneNumber,
        helpMessage()
      );

      return;
    }

    case "5": {
      await saveConversation(
        phoneNumber,
        "AGENT",
        {
          agent_ack_sent: false,
        }
      );

      await sendWhatsAppMessage(
        phoneNumber,
        `👨‍💻 *Hubungi Helpdesk*

Silakan kirim pesan Anda.

Pesan pertama akan mendapat konfirmasi otomatis.

Ketik *MENU* untuk kembali.`
      );

      return;
    }

    default: {
      await sendWhatsAppMessage(
        phoneNumber,
        `❌ Pilihan tidak valid.

Ketik *1-5*.`
      );

      return;
    }
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

      if (
        [
          "1",
          "2",
          "3",
          "4",
          "5",
        ].includes(text)
      ) {
        await handleMenuState(
          phoneNumber,
          text
        );

        return;
      }

      await sendWhatsAppMessage(
        phoneNumber,
        `❌ Pilihan tidak valid.

Ketik *1-5*.`
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
          `✅ Pesan ditambahkan ke issue:

*${draft.active_issue_code || "-"}*

Status:
*${draft.active_issue_status || "-"}*

Ketik *MENU* untuk kembali.`
        );

        return;
      }

      if (text === "2") {
        /*
         * Buat issue baru langsung menggunakan
         * format 5 field dalam 1 pesan.
         */
        await startCreateIssue(
          phoneNumber
        );

        await sendWhatsAppMessage(
          phoneNumber,
          issueDataPrompt()
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

1️⃣ Tambahkan ke Issue
2️⃣ Buat Issue Baru
3️⃣ Lihat Status
4️⃣ Menu`
      );

      return;
    }

    /* =====================================================
       WAITING ISSUE DATA
    ===================================================== */

    case "WAITING_ISSUE_DATA": {
      const parsed =
        parseIssueData(text);

      if (!parsed) {
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ *Data belum lengkap.*

Kirim 5 data dalam *1 pesan*:

*Issue:* ...
*Project:* ...
*Location:* ...
*Category:* ...
*Priority:* ...`
        );

        return;
      }

      const updatedDraft: DraftData = {
        ...draft,
        ...parsed,
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
       LEGACY STEP-BY-STEP STATES
    ===================================================== */

    case "WAITING_DESCRIPTION":
    case "WAITING_PROJECT":
    case "WAITING_LOCATION":
    case "WAITING_CATEGORY":
    case "WAITING_PRIORITY": {
      /*
       * Conversation lama tetap aman.
       * Semua diarahkan ke format baru.
       */

      await saveConversation(
        phoneNumber,
        "WAITING_ISSUE_DATA",
        {
          ...draft,
          started_at:
            draft.started_at ||
            new Date().toISOString(),
        }
      );

      await sendWhatsAppMessage(
        phoneNumber,
        issueDataPrompt()
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

Ketik *MENU* untuk layanan utama.`
        );

        return;
      }

      await sendWhatsAppMessage(
        phoneNumber,
        `❌ Pilihan tidak valid.

1️⃣ Buat Issue
2️⃣ Ubah Data
3️⃣ Batalkan`
      );

      return;
    }

    /* =====================================================
       EDITING ISSUE
    ===================================================== */

    case "EDITING_ISSUE": {
      const parsed =
        parseIssueData(text);

      if (parsed) {
        const updatedDraft: DraftData = {
          ...draft,
          ...parsed,
          started_at:
            draft.started_at ||
            new Date().toISOString(),
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

      if (
        text === "6" ||
        text === "KEMBALI"
      ) {
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
        `❌ *Format belum lengkap.*

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
       WAITING MY ISSUE SELECTION
    ===================================================== */

    case "WAITING_MY_ISSUE_SELECTION": {
      const selectedNumber =
        Number(text);

      const issueCodes =
        draft.my_issue_codes ||
        [];

      if (
        !Number.isInteger(
          selectedNumber
        ) ||
        selectedNumber < 1 ||
        selectedNumber >
          issueCodes.length
      ) {
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Pilihan tidak valid.

Ketik nomor issue dari daftar.
Contoh: *1*`
        );

        return;
      }

      const selectedIssueCode =
        issueCodes[
          selectedNumber - 1
        ];

      if (
        !selectedIssueCode
      ) {
        await saveConversation(
          phoneNumber,
          "MENU",
          {}
        );

        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Issue tidak ditemukan.

Ketik *MY ISSUES* untuk melihat daftar lagi.`
        );

        return;
      }

      await sendIssueStatus(
        phoneNumber,
        selectedIssueCode
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

Ketik *MENU* untuk kembali.`
        );

        return;
      }

      /*
       * Hanya pesan pertama yang mendapat
       * auto acknowledgment.
       */

      if (
        !draft.agent_ack_sent
      ) {
        await sendWhatsAppMessage(
          phoneNumber,
          `📨 *Pesan diterima Helpdesk.*

Tim Helpdesk akan menindaklanjuti.

Ketik *MENU* untuk kembali.`
        );

        await saveConversation(
          phoneNumber,
          "AGENT",
          {
            agent_ack_sent:
              true,
          }
        );
      }

      return;
    }

    /* =====================================================
       IDLE
    ===================================================== */

    case "IDLE":
    default: {
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
     CHECK TIMEOUT
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
    await saveConversation(
      phoneNumber,
      "MENU",
      {}
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `❌ *Proses dibatalkan.*

Ketik *MENU* untuk layanan utama.`
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
      issueDataPrompt()
    );

    return;
  }

  /* =====================================================
     GLOBAL COMMAND: STATUS <CODE>
     Direct status lookup
  ===================================================== */

  if (
    text.startsWith("STATUS ") ||
    text.startsWith("CEK STATUS ")
  ) {
    const issueCode =
      text
        .replace(
          /^STATUS\s+/i,
          ""
        )
        .replace(
          /^CEK STATUS\s+/i,
          ""
        )
        .trim();

    if (issueCode) {
      await sendIssueStatus(
        phoneNumber,
        issueCode
      );

      await saveConversation(
        phoneNumber,
        "MENU",
        {}
      );

      return;
    }
  }

  /* =====================================================
     GLOBAL COMMAND: ISSUE CODE DIRECT
  ===================================================== */

  if (
    /^ISS-\d{8}-\d{3}$/i.test(
      text
    )
  ) {
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

Kirim Issue Code.

Contoh:
*ISS-20260916-022*`
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
      {
        agent_ack_sent: false,
      }
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `👨‍💻 *Hubungi Helpdesk*

Silakan kirim pesan Anda.

Pesan pertama mendapat konfirmasi otomatis.

Ketik *MENU* untuk kembali.`
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