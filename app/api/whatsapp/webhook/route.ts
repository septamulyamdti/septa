import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const verifyToken =
  process.env.WHATSAPP_VERIFY_TOKEN!;

const whatsappAccessToken =
  process.env.WHATSAPP_ACCESS_TOKEN!;

const whatsappPhoneNumberId =
  process.env.WHATSAPP_PHONE_NUMBER_ID!;

const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

/**
 * =====================================================
 * CONFIG
 * =====================================================
 */

const PROJECTS = [
  "TAM",
  "BPKB",
  "STNK",
  "Mahindra",
  "Hyundai",
  "LMS",
];

const activeStatuses = [
  "Open",
  "On Progress",
  "Resolved",
];

/**
 * =====================================================
 * TYPES
 * =====================================================
 */

type WhatsAppMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: {
    body?: string;
  };
};

type WhatsAppValue = {
  contacts?: {
    wa_id?: string;
    profile?: {
      name?: string;
    };
  }[];
  messages?: WhatsAppMessage[];
};

/**
 * =====================================================
 * GET
 * =====================================================
 *
 * Digunakan Meta untuk verifikasi webhook.
 */
export async function GET(
  request: NextRequest
) {
  const { searchParams } =
    new URL(request.url);

  const mode =
    searchParams.get("hub.mode");

  const token =
    searchParams.get(
      "hub.verify_token"
    );

  const challenge =
    searchParams.get(
      "hub.challenge"
    );

  if (
    mode === "subscribe" &&
    token === verifyToken &&
    challenge
  ) {
    return new NextResponse(
      challenge,
      {
        status: 200,
      }
    );
  }

  return NextResponse.json(
    {
      error:
        "Webhook verification failed",
    },
    {
      status: 403,
    }
  );
}

/**
 * =====================================================
 * POST
 * =====================================================
 *
 * Menerima pesan dari WhatsApp.
 */
export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    console.log(
      "================================="
    );

    console.log(
      "WHATSAPP WEBHOOK RECEIVED"
    );

    console.log(
      JSON.stringify(
        body,
        null,
        2
      )
    );

    console.log(
      "================================="
    );

    if (
      body?.object !==
      "whatsapp_business_account"
    ) {
      return NextResponse.json(
        {
          received: false,
        },
        {
          status: 400,
        }
      );
    }

    const entries =
      body.entry ?? [];

    for (
      const entry of entries
    ) {
      const changes =
        entry.changes ?? [];

      for (
        const change of changes
      ) {
        const value =
          change.value as
            | WhatsAppValue
            | undefined;

        if (!value) {
          continue;
        }

        const messages =
          value.messages ?? [];

        for (
          const message of messages
        ) {
          await processIncomingMessage(
            message,
            value
          );
        }
      }
    }

    return NextResponse.json(
      {
        received: true,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "WhatsApp webhook error:",
      error
    );

    return NextResponse.json(
      {
        received: true,
        error:
          "Processing failed",
      },
      {
        status: 200,
      }
    );
  }
}

/**
 * =====================================================
 * PROCESS INCOMING MESSAGE
 * =====================================================
 */
async function processIncomingMessage(
  message: WhatsAppMessage,
  value: WhatsAppValue
) {
  const phoneNumber =
    message.from;

  const messageId =
    message.id;

  const messageType =
    message.type ?? "unknown";

  if (!phoneNumber) {
    console.log(
      "Nomor pengirim tidak ditemukan."
    );

    return;
  }

  /**
   * ===================================================
   * 1. CEK DUPLIKAT
   * ===================================================
   */
  if (messageId) {
    const {
      data: existingMessage,
      error:
        duplicateCheckError,
    } = await supabase
      .from(
        "whatsapp_messages"
      )
      .select("id")
      .eq(
        "message_id",
        messageId
      )
      .maybeSingle();

    if (duplicateCheckError) {
      throw duplicateCheckError;
    }

    if (existingMessage) {
      console.log(
        "Pesan sudah diproses:",
        messageId
      );

      return;
    }
  }

  /**
   * ===================================================
   * 2. NAMA CONTACT
   * ===================================================
   */
  const whatsappContact =
    value.contacts?.find(
      (contact) =>
        contact.wa_id ===
        phoneNumber
    );

  const contactName =
    whatsappContact
      ?.profile?.name ??
    null;

  /**
   * ===================================================
   * 3. ISI PESAN
   * ===================================================
   */
  let messageText: string | null =
    null;

  if (
    messageType ===
    "text"
  ) {
    messageText =
      message.text?.body?.trim() ??
      null;
  }

  if (!messageText) {
    await saveWhatsAppMessage({
      issueId:
        null,

      phoneNumber,

      messageId,

      messageType,

      messageText,
    });

    return;
  }

  /**
   * ===================================================
   * 4. CARI / BUAT CONTACT
   * ===================================================
   */
  let contact: any =
    null;

  const {
    data: existingContact,
    error:
      contactSearchError,
  } = await supabase
    .from(
      "whatsapp_contacts"
    )
    .select("*")
    .eq(
      "phone_number",
      phoneNumber
    )
    .maybeSingle();

  if (contactSearchError) {
    throw contactSearchError;
  }

  contact =
    existingContact;

  if (!contact) {
    const {
      data: newContact,
      error:
        createContactError,
    } = await supabase
      .from(
        "whatsapp_contacts"
      )
      .insert({
        phone_number:
          phoneNumber,

        name:
          contactName,

        project:
          null,
      })
      .select()
      .single();

    if (createContactError) {
      throw createContactError;
    }

    contact =
      newContact;
  }

  /**
   * Update nama contact
   */
  if (
    contactName &&
    contact.name !==
      contactName
  ) {
    const {
      error:
        updateContactError,
    } = await supabase
      .from(
        "whatsapp_contacts"
      )
      .update({
        name:
          contactName,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        contact.id
      );

    if (updateContactError) {
      throw updateContactError;
    }

    contact.name =
      contactName;
  }

  /**
   * ===================================================
   * 5. CARI ISSUE WHATSAPP AKTIF
   * ===================================================
   */
  const {
    data: activeIssues,
    error:
      issueSearchError,
  } = await supabase
    .from("issues")
    .select(
      `
        id,
        issue_code,
        title,
        status,
        project,
        location
      `
    )
    .eq(
      "source",
      "WhatsApp"
    )
    .eq(
      "reporter",
      phoneNumber
    )
    .in(
      "status",
      activeStatuses
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(1);

  if (issueSearchError) {
    throw issueSearchError;
  }

  const activeIssue =
    activeIssues?.[0] ??
    null;

  /**
   * ===================================================
   * 6. JIKA SUDAH ADA ISSUE AKTIF
   * ===================================================
   */
  if (activeIssue) {
    await saveWhatsAppMessage({
      issueId:
        activeIssue.id,

      phoneNumber,

      messageId,

      messageType,

      messageText,
    });

    console.log(
      "Pesan ditambahkan ke Issue:",
      activeIssue.issue_code
    );

    await sendWhatsAppMessage(
      phoneNumber,
      `Pesan Anda sudah ditambahkan ke laporan ${activeIssue.issue_code}.\n\nStatus saat ini: ${activeIssue.status}.`
    );

    return;
  }

  /**
   * ===================================================
   * 7. CEK APAKAH PESAN ADALAH PROJECT
   * ===================================================
   */
  const detectedProject =
    detectProject(
      messageText
    );

  /**
   * ===================================================
   * 8. JIKA CONTACT BELUM PUNYA PROJECT
   * ===================================================
   */
  if (!contact.project) {

    /**
     * Kalau pesan merupakan project,
     * langsung simpan project.
     */
    if (detectedProject) {

      await updateContactProject(
        contact.id,
        detectedProject
      );

      await saveWhatsAppMessage({
        issueId:
          null,

        phoneNumber,

        messageId,

        messageType,

        messageText,
      });

      await sendWhatsAppMessage(
        phoneNumber,
        `Project ${detectedProject} berhasil dipilih.\n\nSekarang silakan kirim lokasi/unit tempat masalah terjadi.`
      );

      return;
    }

    /**
     * Pesan pertama dianggap sebagai
     * keluhan/laporan.
     */
    await saveWhatsAppMessage({
      issueId:
        null,

      phoneNumber,

      messageId,

      messageType,

      messageText,
    });

    await sendWhatsAppMessage(
      phoneNumber,
      `Baik, kami bantu buatkan laporan.\n\nSilakan pilih Project:\n\n1. TAM\n2. BPKB\n3. STNK\n4. Mahindra\n5. Hyundai\n6. LMS\n\nBalas dengan nama project atau nomor pilihannya.`
    );

    return;
  }

  /**
   * ===================================================
   * 9. PROJECT SUDAH ADA
   * ===================================================
   *
   * Berarti pesan berikutnya dianggap
   * sebagai lokasi.
   */
  await saveWhatsAppMessage({
    issueId:
      null,

    phoneNumber,

    messageId,

    messageType,

    messageText,
  });

  const location =
    messageText.trim();

  if (!location) {
    await sendWhatsAppMessage(
      phoneNumber,
      "Mohon kirim lokasi/unit tempat masalah terjadi."
    );

    return;
  }

  /**
   * ===================================================
   * 10. CARI PESAN KELUHAN PERTAMA
   * ===================================================
   *
   * Ambil pesan incoming yang belum
   * terhubung ke issue.
   */
  const {
    data: pendingMessages,
    error:
      pendingMessageError,
  } = await supabase
    .from(
      "whatsapp_messages"
    )
    .select(
      `
        id,
        message_text,
        message_type,
        created_at
      `
    )
    .eq(
      "phone_number",
      phoneNumber
    )
    .eq(
      "direction",
      "incoming"
    )
    .is(
      "issue_id",
      null
    )
    .eq(
      "message_type",
      "text"
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    )
    .limit(20);

  if (pendingMessageError) {
    throw pendingMessageError;
  }

  /**
   * Jangan gunakan pesan project
   * atau nomor pilihan sebagai keluhan.
   */
  const complaintMessage =
    pendingMessages?.find(
      (item) => {
        const text =
          item.message_text
            ?.trim()
            .toUpperCase();

        if (!text) {
          return false;
        }

        if (
          detectProject(text)
        ) {
          return false;
        }

        if (
          [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
          ].includes(text)
        ) {
          return false;
        }

        return true;
      }
    ) ?? null;

  if (!complaintMessage) {
    await sendWhatsAppMessage(
      phoneNumber,
      "Keluhan belum ditemukan. Silakan kirim kembali masalah yang ingin dilaporkan."
    );

    return;
  }

  /**
   * ===================================================
   * 11. GENERATE ISSUE CODE
   * ===================================================
   */
  const issueCode =
    await generateIssueCode();

  /**
   * ===================================================
   * 12. CREATE ISSUE
   * ===================================================
   */
  const {
    data: newIssue,
    error:
      createIssueError,
  } = await supabase
    .from("issues")
    .insert({
      issue_code:
        issueCode,

      title:
        complaintMessage.message_text,

      description:
        complaintMessage.message_text,

      category:
        "Other",

      priority:
        "Medium",

      location:
        location,

      status:
        "Open",

      reporter:
        phoneNumber,

      project:
        contact.project,

      source:
        "WhatsApp",

      created_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    })
    .select(
      `
        id,
        issue_code,
        title,
        project,
        location,
        status,
        priority
      `
    )
    .single();

  if (createIssueError) {
    throw createIssueError;
  }

  /**
   * ===================================================
   * 13. HUBUNGKAN PESAN KELUHAN
   * ===================================================
   */
  const {
    error:
      linkComplaintError,
  } = await supabase
    .from(
      "whatsapp_messages"
    )
    .update({
      issue_id:
        newIssue.id,
    })
    .eq(
      "id",
      complaintMessage.id
    );

  if (linkComplaintError) {
    throw linkComplaintError;
  }

  /**
   * ===================================================
   * 14. HUBUNGKAN PESAN LOCATION
   * ===================================================
   */
  if (messageId) {
    const {
      error:
        linkLocationError,
    } = await supabase
      .from(
        "whatsapp_messages"
      )
      .update({
        issue_id:
          newIssue.id,
      })
      .eq(
        "message_id",
        messageId
      );

    if (linkLocationError) {
      console.error(
        "Gagal menghubungkan pesan lokasi:",
        linkLocationError
      );
    }
  }

  /**
   * ===================================================
   * 15. RESET PROJECT CONTACT
   * ===================================================
   */
  await updateContactProject(
    contact.id,
    null
  );

  /**
   * ===================================================
   * 16. BALAS WHATSAPP
   * ===================================================
   */
  await sendWhatsAppMessage(
    phoneNumber,
    `Laporan berhasil dibuat. ✅\n\nKode Issue: ${newIssue.issue_code}\nProject: ${newIssue.project}\nLokasi: ${newIssue.location}\nPrioritas: ${newIssue.priority}\nStatus: ${newIssue.status}\n\nTim Helpdesk akan menindaklanjuti laporan Anda.`
  );

  console.log(
    "================================="
  );

  console.log(
    "ISSUE BERHASIL DIBUAT"
  );

  console.log({
    issueId:
      newIssue.id,

    issueCode:
      newIssue.issue_code,

    project:
      newIssue.project,

    location:
      newIssue.location,

    reporter:
      phoneNumber,
  });

  console.log(
    "================================="
  );
}

/**
 * =====================================================
 * DETECT PROJECT
 * =====================================================
 */
function detectProject(
  text: string
): string | null {
  const normalized =
    text
      .trim()
      .toUpperCase();

  const projectNumbers: Record<
    string,
    string
  > = {
    "1": "TAM",
    "2": "BPKB",
    "3": "STNK",
    "4": "Mahindra",
    "5": "Hyundai",
    "6": "LMS",
  };

  if (
    projectNumbers[
      normalized
    ]
  ) {
    return projectNumbers[
      normalized
    ];
  }

  const exactProject =
    PROJECTS.find(
      (project) =>
        project.toUpperCase() ===
        normalized
    );

  if (exactProject) {
    return exactProject;
  }

  return null;
}

/**
 * =====================================================
 * UPDATE CONTACT PROJECT
 * =====================================================
 */
async function updateContactProject(
  contactId: number,
  project: string | null
) {
  const {
    error,
  } = await supabase
    .from(
      "whatsapp_contacts"
    )
    .update({
      project:
        project,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      contactId
    );

  if (error) {
    throw error;
  }
}

/**
 * =====================================================
 * GENERATE ISSUE CODE
 * =====================================================
 *
 * Format:
 * ISS-YYYYMMDD-001
 */
async function generateIssueCode() {
  const now =
    new Date();

  const year =
    now.getUTCFullYear();

  const month =
    String(
      now.getUTCMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getUTCDate()
    ).padStart(2, "0");

  const prefix =
    `ISS-${year}${month}${day}-`;

  const {
    data,
    error,
  } = await supabase
    .from("issues")
    .select(
      "issue_code"
    )
    .like(
      "issue_code",
      `${prefix}%`
    )
    .order(
      "issue_code",
      {
        ascending: false,
      }
    )
    .limit(1);

  if (error) {
    throw error;
  }

  let nextNumber =
    1;

  if (
    data &&
    data.length > 0
  ) {
    const lastCode =
      data[0]
        .issue_code;

    const lastNumber =
      Number(
        lastCode
          .split("-")
          .pop()
      );

    if (
      !Number.isNaN(
        lastNumber
      )
    ) {
      nextNumber =
        lastNumber + 1;
    }
  }

  return (
    prefix +
    String(
      nextNumber
    ).padStart(3, "0")
  );
}

/**
 * =====================================================
 * SAVE WHATSAPP MESSAGE
 * =====================================================
 */
async function saveWhatsAppMessage({
  issueId,
  phoneNumber,
  messageId,
  messageType,
  messageText,
}: {
  issueId: number | null;
  phoneNumber: string;
  messageId?: string;
  messageType: string;
  messageText: string | null;
}) {
  const {
    error,
  } = await supabase
    .from(
      "whatsapp_messages"
    )
    .insert({
      issue_id:
        issueId,

      phone_number:
        phoneNumber,

      message_id:
        messageId ??
        null,

      conversation_id:
        phoneNumber,

      direction:
        "incoming",

      message_type:
        messageType,

      message_text:
        messageText,

      created_at:
        new Date().toISOString(),
    });

  if (error) {
    throw error;
  }
}

/**
 * =====================================================
 * SEND WHATSAPP MESSAGE
 * =====================================================
 */
async function sendWhatsAppMessage(
  phoneNumber: string,
  messageText: string
) {
  if (
    !whatsappAccessToken ||
    !whatsappPhoneNumberId
  ) {
    console.error(
      "WhatsApp credentials belum lengkap."
    );

    return;
  }

  try {
    const response =
      await fetch(
        `https://graph.facebook.com/v23.0/${whatsappPhoneNumberId}/messages`,
        {
          method:
            "POST",

          headers: {
            "Authorization":
              `Bearer ${whatsappAccessToken}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              messaging_product:
                "whatsapp",

              recipient_type:
                "individual",

              to:
                phoneNumber,

              type:
                "text",

              text: {
                preview_url:
                  false,

                body:
                  messageText,
              },
            }),
        }
      );

    const result =
      await response.json();

    if (
      !response.ok
    ) {
      console.error(
        "WhatsApp send error:",
        result
      );

      return;
    }

    console.log(
      "WhatsApp reply berhasil dikirim:",
      result
    );
  } catch (error) {
    console.error(
      "WhatsApp reply error:",
      error
    );
  }
}