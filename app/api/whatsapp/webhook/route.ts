import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* =========================================================
   ENV
========================================================= */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

/* =========================================================
   MASTER DATA
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

const ACTIVE_STATUSES = [
  "Open",
  "On Progress",
  "Resolved",
];

/* =========================================================
   TYPES
========================================================= */

type ConversationState =
  | "IDLE"
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

type DraftIssue = {
  description?: string;
  project?: string;
  location?: string;
  category?: string;
  priority?: string;

  started_at?: string;

  editing_field?:
    | "description"
    | "project"
    | "location"
    | "category"
    | "priority";

  active_issue_id?: number;
  active_issue_code?: string;
  active_issue_status?: string;

  pending_message_id?: number | null;
  pending_message_text?: string;
};

type WhatsAppMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: {
    body: string;
  };
};

type WhatsAppValue = {
  messages?: WhatsAppMessage[];
};

type WhatsAppConversation = {
  id: number;
  phone_number: string;
  state: ConversationState;
  draft_data: DraftIssue;
  created_at: string;
  updated_at: string;
};

/* =========================================================
   GET - META WEBHOOK VERIFICATION
========================================================= */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge ?? "", {
      status: 200,
    });
  }

  return new NextResponse("Forbidden", {
    status: 403,
  });
}

/* =========================================================
   POST - RECEIVE WHATSAPP MESSAGE
========================================================= */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("WHATSAPP WEBHOOK RECEIVED");

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json(
        { success: false },
        { status: 404 }
      );
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value: WhatsAppValue = change.value;

        for (const message of value.messages ?? []) {
          await processIncomingMessage(message);
        }
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PROCESS INCOMING MESSAGE
========================================================= */

async function processIncomingMessage(
  message: WhatsAppMessage
) {
  const phoneNumber = message.from;
  const metaMessageId = message.id;

  /* -------------------------------------------------------
     DUPLICATE CHECK
  ------------------------------------------------------- */

  const { data: existingMessage } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("message_id", metaMessageId)
    .maybeSingle();

  if (existingMessage) {
    console.log(
      "Duplicate WhatsApp message:",
      metaMessageId
    );

    return;
  }

  /* -------------------------------------------------------
     SAVE CONTACT
  ------------------------------------------------------- */

  await getOrCreateContact(phoneNumber);

  /* -------------------------------------------------------
     SAVE MESSAGE FIRST
  ------------------------------------------------------- */

  const receivedAt = new Date().toISOString();

  const savedMessageId = await saveWhatsAppMessage({
    message,
    phoneNumber,
  });

  /* -------------------------------------------------------
     NON TEXT
  ------------------------------------------------------- */

  if (
    message.type !== "text" ||
    !message.text?.body
  ) {
    await sendWhatsAppMessage(
      phoneNumber,
      `📩 Pesan diterima.

Saat ini Helpdesk Bot memproses pesan teks terlebih dahulu.

Silakan kirim pesan dalam bentuk teks atau ketik *MENU*.`
    );

    return;
  }

  const rawText = message.text.body;
  const text = normalizeText(rawText);

  /* -------------------------------------------------------
     GET CONVERSATION
  ------------------------------------------------------- */

  let conversation = await getConversation(phoneNumber);

  /* -------------------------------------------------------
     GLOBAL COMMAND
  ------------------------------------------------------- */

  if (
    text === "BATAL" ||
    text === "CANCEL"
  ) {
    await resetConversation(phoneNumber);

    await sendWhatsAppMessage(
      phoneNumber,
      `❌ Proses dibatalkan.

Tidak ada laporan yang dibuat.

Ketik *MENU* untuk melihat pilihan.`
    );

    return;
  }

  if (text === "MENU") {
    await resetConversation(phoneNumber);

    await sendWhatsAppMessage(
      phoneNumber,
      mainMenu()
    );

    return;
  }

  if (
    text === "BUAT ISSUE" ||
    text === "BUAT LAPORAN" ||
    text === "CREATE ISSUE"
  ) {
    await startCreateIssue(phoneNumber);

    await sendWhatsAppMessage(
      phoneNumber,
      `📝 *Buat Laporan Issue*

Silakan jelaskan masalah yang ingin dilaporkan.

Contoh:
*Printer CFD tidak bisa mencetak dokumen.*`
    );

    return;
  }

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
*ISS-20260916-022*`
    );

    return;
  }

  if (
    text === "MY ISSUES" ||
    text === "MY ISSUE" ||
    text === "RIWAYAT"
  ) {
    await sendMyIssues(phoneNumber);
    return;
  }

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

  if (
    text === "AGENT" ||
    text === "HELPDESK" ||
    text === "HUBUNGI HELPDESK"
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

Ketik *BATAL* untuk kembali.`
    );

    return;
  }

  /* -------------------------------------------------------
     REFRESH CONVERSATION
  ------------------------------------------------------- */

  conversation = await getConversation(phoneNumber);

  /* -------------------------------------------------------
     ACTIVE CONVERSATION
  ------------------------------------------------------- */

  if (conversation.state !== "IDLE") {
    await handleConversationState(
      conversation,
      phoneNumber,
      text,
      savedMessageId
    );

    return;
  }

  /* =======================================================
     IDLE + ACTIVE ISSUE
     
     IMPORTANT:
     JANGAN LANGSUNG LINK PESAN KE ISSUE AKTIF.
     
     Tampilkan pilihan terlebih dahulu.
  ======================================================= */

  const activeIssue = await findActiveIssue(
    phoneNumber
  );

  if (activeIssue) {
    const draft: DraftIssue = {
      active_issue_id: activeIssue.id,
      active_issue_code: activeIssue.issue_code,
      active_issue_status: activeIssue.status,
      pending_message_id: savedMessageId,
      pending_message_text: rawText,
      started_at: receivedAt,
    };

    await saveConversation(
      phoneNumber,
      "CONFIRMING_ACTIVE_ISSUE",
      draft
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `📋 *Anda masih memiliki laporan aktif*

🎫 Issue:
*${activeIssue.issue_code}*

📊 Status:
*${activeIssue.status}*

Pesan Anda:
"${rawText}"

Apa yang ingin Anda lakukan?

1️⃣ Tambahkan pesan ke issue tersebut
2️⃣ Buat laporan issue baru
3️⃣ Cek status issue
4️⃣ Kembali ke menu

Ketik *1, 2, 3,* atau *4*.

Ketik *BATAL* untuk membatalkan.`
    );

    return;
  }

  /* -------------------------------------------------------
     NO ACTIVE ISSUE
     
     Pesan biasa dianggap sebagai awal laporan.
  ------------------------------------------------------- */

  const draft: DraftIssue = {
    description: rawText,
    started_at: receivedAt,
  };

  await saveConversation(
    phoneNumber,
    "WAITING_PROJECT",
    draft
  );

  await sendWhatsAppMessage(
    phoneNumber,
    `📝 Deskripsi issue diterima.

Sekarang pilih *Project*:

1️⃣ TAM
2️⃣ BPKB
3️⃣ STNK
4️⃣ Mahindra
5️⃣ Hyundai
6️⃣ LMS

Ketik nomor atau nama project.`
  );
}

/* =========================================================
   HANDLE CONVERSATION STATE
========================================================= */

async function handleConversationState(
  conversation: WhatsAppConversation,
  phoneNumber: string,
  text: string,
  savedMessageId: number | null
) {
  const draft = conversation.draft_data ?? {};

  switch (conversation.state) {
    /* =====================================================
       ACTIVE ISSUE CHOICE
    ===================================================== */

    case "CONFIRMING_ACTIVE_ISSUE": {
      if (text === "1") {
        if (
          draft.active_issue_id &&
          savedMessageId
        ) {
          await linkMessageToIssue(
            savedMessageId,
            draft.active_issue_id
          );
        }

        await resetConversation(phoneNumber);

        await sendWhatsAppMessage(
          phoneNumber,
          `💬 Pesan Anda sudah ditambahkan ke laporan.

🎫 Issue:
*${draft.active_issue_code}*

📊 Status saat ini:
*${draft.active_issue_status}*

Ketik *MENU* untuk pilihan lainnya.`
        );

        return;
      }

      if (text === "2") {
        const newDraft: DraftIssue = {
          description:
            draft.pending_message_text ?? "",
          started_at:
            draft.started_at ??
            new Date().toISOString(),
        };

        await saveConversation(
          phoneNumber,
          "WAITING_PROJECT",
          newDraft
        );

        await sendWhatsAppMessage(
          phoneNumber,
          `🆕 *Membuat Issue Baru*

Pesan Anda akan digunakan sebagai deskripsi issue:

"${newDraft.description}"

Sekarang pilih *Project*:

1️⃣ TAM
2️⃣ BPKB
3️⃣ STNK
4️⃣ Mahindra
5️⃣ Hyundai
6️⃣ LMS

Ketik nomor atau nama project.`
        );

        return;
      }

      if (text === "3") {
        if (draft.active_issue_code) {
          await sendIssueStatus(
            phoneNumber,
            draft.active_issue_code
          );
        } else {
          await sendWhatsAppMessage(
            phoneNumber,
            `Issue aktif tidak ditemukan.

Ketik *STATUS* untuk mencari issue berdasarkan Issue Code.`
          );
        }

        await resetConversation(phoneNumber);

        return;
      }

      if (text === "4" || text === "BACK") {
        await resetConversation(phoneNumber);

        await sendWhatsAppMessage(
          phoneNumber,
          mainMenu()
        );

        return;
      }

      await sendWhatsAppMessage(
        phoneNumber,
        `Pilihan tidak valid.

Silakan pilih:

1️⃣ Tambahkan ke issue lama
2️⃣ Buat issue baru
3️⃣ Cek status
4️⃣ Menu

Ketik *1, 2, 3,* atau *4*.`
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
          `Mohon tuliskan deskripsi issue terlebih dahulu.`
        );

        return;
      }

      draft.description = text;
      draft.started_at =
        draft.started_at ??
        new Date().toISOString();

      await saveConversation(
        phoneNumber,
        "WAITING_PROJECT",
        draft
      );

      await sendWhatsAppMessage(
        phoneNumber,
        `✅ Deskripsi diterima.

Pilih *Project*:

1️⃣ TAM
2️⃣ BPKB
3️⃣ STNK
4️⃣ Mahindra
5️⃣ Hyundai
6️⃣ LMS

Ketik nomor atau nama project.`
      );

      return;
    }

    /* =====================================================
       WAITING PROJECT
    ===================================================== */

    case "WAITING_PROJECT": {
      const project = parseProject(text);

      if (!project) {
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Project tidak valid.

Pilih:

1️⃣ TAM
2️⃣ BPKB
3️⃣ STNK
4️⃣ Mahindra
5️⃣ Hyundai
6️⃣ LMS`
        );

        return;
      }

      draft.project = project;

      await saveConversation(
        phoneNumber,
        "WAITING_LOCATION",
        draft
      );

      await sendWhatsAppMessage(
        phoneNumber,
        `✅ Project: *${project}*

Sekarang masukkan *Lokasi*.

Contoh:
*NVDC Cibitung*
*NVDC Sunter*
*NVDC Karawang*`
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
          `Mohon masukkan lokasi issue.`
        );

        return;
      }

      draft.location = text;

      await saveConversation(
        phoneNumber,
        "WAITING_CATEGORY",
        draft
      );

      await sendWhatsAppMessage(
        phoneNumber,
        `📍 Lokasi: *${text}*

Pilih *Category*:

1️⃣ Hardware
2️⃣ Software
3️⃣ Network
4️⃣ Server
5️⃣ Application
6️⃣ Other`
      );

      return;
    }

    /* =====================================================
       WAITING CATEGORY
    ===================================================== */

    case "WAITING_CATEGORY": {
      const category = parseCategory(text);

      if (!category) {
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Category tidak valid.

Pilih:

1️⃣ Hardware
2️⃣ Software
3️⃣ Network
4️⃣ Server
5️⃣ Application
6️⃣ Other`
        );

        return;
      }

      draft.category = category;

      await saveConversation(
        phoneNumber,
        "WAITING_PRIORITY",
        draft
      );

      await sendWhatsAppMessage(
        phoneNumber,
        `📂 Category: *${category}*

Pilih *Priority*:

1️⃣ Critical
2️⃣ High
3️⃣ Medium
4️⃣ Low`
      );

      return;
    }

    /* =====================================================
       WAITING PRIORITY
    ===================================================== */

    case "WAITING_PRIORITY": {
      const priority = parsePriority(text);

      if (!priority) {
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Priority tidak valid.

Pilih:

1️⃣ Critical
2️⃣ High
3️⃣ Medium
4️⃣ Low`
        );

        return;
      }

      draft.priority = priority;

      await saveConversation(
        phoneNumber,
        "CONFIRMING_ISSUE",
        draft
      );

      await sendWhatsAppMessage(
        phoneNumber,
        confirmationMessage(draft)
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
          {
            ...draft,
            editing_field: undefined,
          }
        );

        await sendWhatsAppMessage(
          phoneNumber,
          `✏️ *Ubah Data*

Pilih data yang ingin diubah:

1️⃣ Deskripsi
2️⃣ Project
3️⃣ Lokasi
4️⃣ Category
5️⃣ Priority
6️⃣ Kembali ke konfirmasi`
        );

        return;
      }

      if (
        text === "3" ||
        text === "BATAL"
      ) {
        await resetConversation(phoneNumber);

        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Pembuatan issue dibatalkan.

Ketik *MENU* untuk pilihan lainnya.`
        );

        return;
      }

      await sendWhatsAppMessage(
        phoneNumber,
        `Pilihan tidak valid.

1️⃣ Ya, Buat Laporan
2️⃣ Ubah Data
3️⃣ Batalkan`
      );

      return;
    }

    /* =====================================================
       EDIT ISSUE
    ===================================================== */

    case "EDITING_ISSUE": {
      if (!draft.editing_field) {
        if (text === "1") {
          draft.editing_field = "description";

          await saveConversation(
            phoneNumber,
            "EDITING_ISSUE",
            draft
          );

          await sendWhatsAppMessage(
            phoneNumber,
            `✏️ Masukkan deskripsi baru.`
          );

          return;
        }

        if (text === "2") {
          draft.editing_field = "project";

          await saveConversation(
            phoneNumber,
            "EDITING_ISSUE",
            draft
          );

          await sendWhatsAppMessage(
            phoneNumber,
            `✏️ Pilih Project baru:

1️⃣ TAM
2️⃣ BPKB
3️⃣ STNK
4️⃣ Mahindra
5️⃣ Hyundai
6️⃣ LMS`
          );

          return;
        }

        if (text === "3") {
          draft.editing_field = "location";

          await saveConversation(
            phoneNumber,
            "EDITING_ISSUE",
            draft
          );

          await sendWhatsAppMessage(
            phoneNumber,
            `✏️ Masukkan lokasi baru.`
          );

          return;
        }

        if (text === "4") {
          draft.editing_field = "category";

          await saveConversation(
            phoneNumber,
            "EDITING_ISSUE",
            draft
          );

          await sendWhatsAppMessage(
            phoneNumber,
            `✏️ Pilih Category baru:

1️⃣ Hardware
2️⃣ Software
3️⃣ Network
4️⃣ Server
5️⃣ Application
6️⃣ Other`
          );

          return;
        }

        if (text === "5") {
          draft.editing_field = "priority";

          await saveConversation(
            phoneNumber,
            "EDITING_ISSUE",
            draft
          );

          await sendWhatsAppMessage(
            phoneNumber,
            `✏️ Pilih Priority baru:

1️⃣ Critical
2️⃣ High
3️⃣ Medium
4️⃣ Low`
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
            confirmationMessage(draft)
          );

          return;
        }

        await sendWhatsAppMessage(
          phoneNumber,
          `Pilihan tidak valid.

1️⃣ Deskripsi
2️⃣ Project
3️⃣ Lokasi
4️⃣ Category
5️⃣ Priority
6️⃣ Kembali`
        );

        return;
      }

      /* ---------------------------------------------------
         SAVE EDITED FIELD
      --------------------------------------------------- */

      switch (draft.editing_field) {
        case "description":
          draft.description = text;
          break;

        case "project": {
          const project = parseProject(text);

          if (!project) {
            await sendWhatsAppMessage(
              phoneNumber,
              `Project tidak valid.

Pilih 1-6.`
            );

            return;
          }

          draft.project = project;
          break;
        }

        case "location":
          draft.location = text;
          break;

        case "category": {
          const category = parseCategory(text);

          if (!category) {
            await sendWhatsAppMessage(
              phoneNumber,
              `Category tidak valid.

Pilih 1-6.`
            );

            return;
          }

          draft.category = category;
          break;
        }

        case "priority": {
          const priority = parsePriority(text);

          if (!priority) {
            await sendWhatsAppMessage(
              phoneNumber,
              `Priority tidak valid.

Pilih 1-4.`
            );

            return;
          }

          draft.priority = priority;
          break;
        }
      }

      draft.editing_field = undefined;

      await saveConversation(
        phoneNumber,
        "EDITING_ISSUE",
        draft
      );

      await sendWhatsAppMessage(
        phoneNumber,
        `✅ Data berhasil diperbarui.

Pilih data lain yang ingin diubah:

1️⃣ Deskripsi
2️⃣ Project
3️⃣ Lokasi
4️⃣ Category
5️⃣ Priority
6️⃣ Kembali ke konfirmasi`
      );

      return;
    }

    /* =====================================================
       WAITING ISSUE CODE
    ===================================================== */

    case "WAITING_ISSUE_CODE": {
      const issueCode = text.toUpperCase();

      await sendIssueStatus(
        phoneNumber,
        issueCode
      );

      await resetConversation(phoneNumber);

      return;
    }

    /* =====================================================
       AGENT
    ===================================================== */

    case "AGENT": {
      await sendWhatsAppMessage(
        phoneNumber,
        `👨‍💻 Pesan Anda sudah diterima oleh Helpdesk.

Pesan:
"${text}"

Tim Helpdesk akan menindaklanjuti.

Ketik *MENU* untuk kembali ke menu utama.`
      );

      return;
    }

    default:
      await resetConversation(phoneNumber);

      await sendWhatsAppMessage(
        phoneNumber,
        mainMenu()
      );

      return;
  }
}

/* =========================================================
   CREATE ISSUE
========================================================= */

async function createIssueFromDraft(
  phoneNumber: string,
  draft: DraftIssue
) {
  if (
    !draft.description ||
    !draft.project ||
    !draft.location ||
    !draft.category ||
    !draft.priority
  ) {
    await sendWhatsAppMessage(
      phoneNumber,
      `❌ Data issue belum lengkap.

Ketik *BUAT ISSUE* untuk memulai kembali.`
    );

    return;
  }

  const issueCode = await generateIssueCode();

  const now = new Date().toISOString();

  const title =
    draft.description.length > 100
      ? draft.description.substring(0, 100)
      : draft.description;

  const { data: issue, error } = await supabase
    .from("issues")
    .insert({
      issue_code: issueCode,
      title,
      description: draft.description,
      project: draft.project,
      location: draft.location,
      category: draft.category,
      priority: draft.priority,
      status: "Open",
      reporter: phoneNumber,
      source: "WhatsApp",
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !issue) {
    console.error(
      "Create issue error:",
      error
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `❌ Maaf, laporan gagal dibuat.

Silakan coba lagi dengan mengetik *BUAT ISSUE*.`
    );

    return;
  }

  /* -------------------------------------------------------
     LINK UNLINKED WHATSAPP MESSAGES
  ------------------------------------------------------- */

  const startedAt =
    draft.started_at ?? now;

  const { error: linkError } = await supabase
    .from("whatsapp_messages")
    .update({
      issue_id: issue.id,
    })
    .eq("phone_number", phoneNumber)
    .is("issue_id", null)
    .gte("created_at", startedAt);

  if (linkError) {
    console.error(
      "Link WhatsApp messages error:",
      linkError
    );
  }

  /* -------------------------------------------------------
     RESET CONVERSATION
  ------------------------------------------------------- */

  await resetConversation(phoneNumber);

  /* -------------------------------------------------------
     CLEAR CONTACT PROJECT
  ------------------------------------------------------- */

  await supabase
    .from("whatsapp_contacts")
    .update({
      project: null,
      updated_at: now,
    })
    .eq("phone_number", phoneNumber);

  /* -------------------------------------------------------
     SEND SUCCESS
  ------------------------------------------------------- */

  await sendWhatsAppMessage(
    phoneNumber,
    `✅ *Laporan berhasil dibuat!*

🎫 Issue Code:
*${issueCode}*

📝 Issue:
${draft.description}

📁 Project:
*${draft.project}*

📍 Location:
*${draft.location}*

📂 Category:
*${draft.category}*

⚡ Priority:
*${draft.priority}*

📊 Status:
*Open*

Tim Helpdesk akan menindaklanjuti laporan Anda.

Ketik:
*STATUS* untuk cek status
*MY ISSUES* untuk melihat laporan Anda
*MENU* untuk menu utama.`
  );
}

/* =========================================================
   FIND ACTIVE ISSUE
========================================================= */

async function findActiveIssue(
  phoneNumber: string
) {
  const { data, error } = await supabase
    .from("issues")
    .select(`
      id,
      issue_code,
      status,
      title,
      project,
      location,
      category,
      priority,
      created_at
    `)
    .eq("source", "WhatsApp")
    .eq("reporter", phoneNumber)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Find active issue error:",
      error
    );

    return null;
  }

  return data;
}

/* =========================================================
   STATUS ISSUE
========================================================= */

async function sendIssueStatus(
  phoneNumber: string,
  issueCode: string
) {
  const { data: issue, error } = await supabase
    .from("issues")
    .select(`
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
      created_at,
      updated_at
    `)
    .eq("issue_code", issueCode)
    .maybeSingle();

  if (error || !issue) {
    await sendWhatsAppMessage(
      phoneNumber,
      `❌ Issue *${issueCode}* tidak ditemukan.

Pastikan Issue Code benar.

Contoh:
*ISS-20260916-022*`
    );

    return;
  }

  const { data: history } = await supabase
    .from("issue_history")
    .select(`
      action,
      old_status,
      new_status,
      old_priority,
      new_priority,
      description,
      created_at
    `)
    .eq("issue_id", issue.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(3);

  let historyText = "";

  if (history && history.length > 0) {
    historyText =
      "\n\n📜 *Update Terakhir:*\n";

    for (const item of history) {
      const statusText =
        item.new_status
          ? `${item.old_status ?? "-"} → ${item.new_status}`
          : "";

      historyText +=
        `• ${item.action}` +
        (statusText
          ? ` (${statusText})`
          : "") +
        "\n";
    }
  }

  await sendWhatsAppMessage(
    phoneNumber,
    `🔍 *Status Issue*

🎫 Issue:
*${issue.issue_code}*

📝 ${issue.title}

📁 Project:
*${issue.project ?? "-"}*

📍 Location:
*${issue.location ?? "-"}*

📂 Category:
*${issue.category ?? "-"}*

⚡ Priority:
*${issue.priority ?? "-"}*

📊 Status:
*${issue.status}*

📅 Dibuat:
${formatDate(issue.created_at)}

🔄 Update:
${formatDate(issue.updated_at)}
${historyText}

Ketik *MENU* untuk kembali.`
  );
}

/* =========================================================
   MY ISSUES
========================================================= */

async function sendMyIssues(
  phoneNumber: string
) {
  const { data, error } = await supabase
    .from("issues")
    .select(`
      issue_code,
      title,
      project,
      status,
      priority,
      created_at
    `)
    .eq("reporter", phoneNumber)
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  if (error) {
    console.error(
      "My issues error:",
      error
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `❌ Gagal mengambil data laporan.

Silakan coba lagi.`
    );

    return;
  }

  if (!data || data.length === 0) {
    await sendWhatsAppMessage(
      phoneNumber,
      `📋 *My Issues*

Belum ada laporan yang dibuat melalui WhatsApp.

Ketik *BUAT ISSUE* untuk membuat laporan baru.`
    );

    return;
  }

  let message =
    `📋 *My Issues*\n\n`;

  data.forEach((issue, index) => {
    message +=
      `${index + 1}. 🎫 *${issue.issue_code}*\n` +
      `   ${issue.title}\n` +
      `   Project: ${issue.project ?? "-"}\n` +
      `   Status: *${issue.status}*\n` +
      `   Priority: ${issue.priority ?? "-"}\n\n`;
  });

  message +=
    `Ketik *STATUS* untuk melihat detail issue.`;

  await sendWhatsAppMessage(
    phoneNumber,
    message
  );
}

/* =========================================================
   CONVERSATION
========================================================= */

async function getConversation(
  phoneNumber: string
): Promise<WhatsAppConversation> {
  const { data } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (data) {
    return data as WhatsAppConversation;
  }

  const { data: created } = await supabase
    .from("whatsapp_conversations")
    .insert({
      phone_number: phoneNumber,
      state: "IDLE",
      draft_data: {},
    })
    .select()
    .single();

  return created as WhatsAppConversation;
}

async function saveConversation(
  phoneNumber: string,
  state: ConversationState,
  draft: DraftIssue
) {
  const { error } = await supabase
    .from("whatsapp_conversations")
    .upsert(
      {
        phone_number: phoneNumber,
        state,
        draft_data: draft,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "phone_number",
      }
    );

  if (error) {
    console.error(
      "Save conversation error:",
      error
    );
  }
}

async function resetConversation(
  phoneNumber: string
) {
  await supabase
    .from("whatsapp_conversations")
    .upsert(
      {
        phone_number: phoneNumber,
        state: "IDLE",
        draft_data: {},
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "phone_number",
      }
    );
}

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
   CONTACT
========================================================= */

async function getOrCreateContact(
  phoneNumber: string
) {
  const { data: existing } = await supabase
    .from("whatsapp_contacts")
    .select("id")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data } = await supabase
    .from("whatsapp_contacts")
    .insert({
      phone_number: phoneNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  return data;
}

/* =========================================================
   SAVE WHATSAPP MESSAGE
========================================================= */

async function saveWhatsAppMessage({
  message,
  phoneNumber,
}: {
  message: WhatsAppMessage;
  phoneNumber: string;
}): Promise<number | null> {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .insert({
      message_id: message.id,
      phone_number: phoneNumber,
      direction: "incoming",
      message_type: message.type,
      message_text:
        message.text?.body ?? null,
      created_at:
        message.timestamp
          ? new Date(
              Number(message.timestamp) * 1000
            ).toISOString()
          : new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error(
      "Save WhatsApp message error:",
      error
    );

    return null;
  }

  return data?.id ?? null;
}

/* =========================================================
   LINK MESSAGE TO ISSUE
========================================================= */

async function linkMessageToIssue(
  messageId: number,
  issueId: number
) {
  const { error } = await supabase
    .from("whatsapp_messages")
    .update({
      issue_id: issueId,
    })
    .eq("id", messageId);

  if (error) {
    console.error(
      "Link message to issue error:",
      error
    );
  }
}

/* =========================================================
   ISSUE CODE
========================================================= */

async function generateIssueCode() {
  const today = new Date();

  const yyyy = today.getFullYear();
  const mm = String(
    today.getMonth() + 1
  ).padStart(2, "0");
  const dd = String(
    today.getDate()
  ).padStart(2, "0");

  const prefix =
    `ISS-${yyyy}${mm}${dd}-`;

  const { data } = await supabase
    .from("issues")
    .select("issue_code")
    .like("issue_code", `${prefix}%`)
    .order("issue_code", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  let sequence = 1;

  if (data?.issue_code) {
    const lastNumber =
      Number(
        data.issue_code.split("-").pop()
      ) || 0;

    sequence = lastNumber + 1;
  }

  return (
    prefix +
    String(sequence).padStart(3, "0")
  );
}

/* =========================================================
   PARSERS
========================================================= */

function parseProject(
  text: string
): string | null {
  const value = normalizeText(text);

  const map: Record<string, string> = {
    "1": "TAM",
    "2": "BPKB",
    "3": "STNK",
    "4": "Mahindra",
    "5": "Hyundai",
    "6": "LMS",

    TAM: "TAM",
    BPKB: "BPKB",
    STNK: "STNK",
    MAHINDRA: "Mahindra",
    HYUNDAI: "Hyundai",
    LMS: "LMS",
  };

  return map[value] ?? null;
}

function parseCategory(
  text: string
): string | null {
  const value = normalizeText(text);

  const map: Record<string, string> = {
    "1": "Hardware",
    "2": "Software",
    "3": "Network",
    "4": "Server",
    "5": "Application",
    "6": "Other",

    HARDWARE: "Hardware",
    SOFTWARE: "Software",
    NETWORK: "Network",
    SERVER: "Server",
    APPLICATION: "Application",
    OTHER: "Other",
  };

  return map[value] ?? null;
}

function parsePriority(
  text: string
): string | null {
  const value = normalizeText(text);

  const map: Record<string, string> = {
    "1": "Critical",
    "2": "High",
    "3": "Medium",
    "4": "Low",

    CRITICAL: "Critical",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
  };

  return map[value] ?? null;
}

/* =========================================================
   NORMALIZE
========================================================= */

function normalizeText(
  text: string
): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

/* =========================================================
   MAIN MENU
========================================================= */

function mainMenu() {
  return `👋 *Helpdesk System*

Selamat datang di Helpdesk.

Silakan pilih menu:

1️⃣ 📝 Buat Laporan Issue
2️⃣ 🔍 Cek Status Issue
3️⃣ 📋 My Issues
4️⃣ ❓ Bantuan
5️⃣ 👨‍💻 Hubungi Helpdesk

Ketik nomor atau nama menu.

Contoh:
*1*
atau
*BUAT ISSUE*`;
}

/* =========================================================
   HELP
========================================================= */

function helpMessage() {
  return `❓ *Bantuan Helpdesk*

Anda dapat menggunakan:

📝 *BUAT ISSUE*
Membuat laporan issue baru.

🔍 *STATUS*
Mengecek status issue berdasarkan Issue Code.

📋 *MY ISSUES*
Melihat daftar laporan Anda.

❓ *BANTUAN*
Melihat bantuan.

👨‍💻 *AGENT*
Menghubungi Helpdesk.

🏠 *MENU*
Kembali ke menu utama.

❌ *BATAL*
Membatalkan proses yang sedang berjalan.`;
}

/* =========================================================
   CONFIRMATION MESSAGE
========================================================= */

function confirmationMessage(
  draft: DraftIssue
) {
  return `📋 *Konfirmasi Laporan*

📝 Issue:
${draft.description ?? "-"}

📁 Project:
*${draft.project ?? "-"}*

📍 Location:
*${draft.location ?? "-"}*

📂 Category:
*${draft.category ?? "-"}*

⚡ Priority:
*${draft.priority ?? "-"}*

Status:
*Open*

Apakah data sudah benar?

1️⃣ Ya, Buat Laporan
2️⃣ Ubah Data
3️⃣ Batalkan`;
}

/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(
  value: string | null
) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString(
      "id-ID",
      {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  } catch {
    return value;
  }
}

/* =========================================================
   SEND WHATSAPP MESSAGE
========================================================= */

async function sendWhatsAppMessage(
  phoneNumber: string,
  text: string
) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "text",
          text: {
            preview_url: false,
            body: text,
          },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error(
        "WhatsApp send error:",
        result
      );

      return;
    }

    console.log(
      "WhatsApp message sent:",
      result
    );

    /* -----------------------------------------------------
       SAVE OUTGOING MESSAGE
    ----------------------------------------------------- */

    await supabase
      .from("whatsapp_messages")
      .insert({
        message_id:
          result?.messages?.[0]?.id ??
          `out-${Date.now()}`,
        phone_number: phoneNumber,
        direction: "outgoing",
        message_type: "text",
        message_text: text,
        created_at:
          new Date().toISOString(),
      });
  } catch (error) {
    console.error(
      "sendWhatsAppMessage error:",
      error
    );
  }
}