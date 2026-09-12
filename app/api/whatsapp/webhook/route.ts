import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const verifyToken =
  process.env.WHATSAPP_VERIFY_TOKEN!;

const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

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

    /**
     * Pastikan event dari
     * WhatsApp Business Account.
     */
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

    /**
     * Meta membutuhkan response
     * 200 agar event dianggap
     * berhasil diterima.
     */
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

    /**
     * Tetap return 200 setelah
     * event diterima untuk
     * menghindari retry berulang
     * saat debugging.
     */
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
   * 1. CEK DUPLIKAT PESAN
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
   * 2. AMBIL NAMA CUSTOMER
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
   * 3. AMBIL ISI PESAN
   * ===================================================
   */
  let messageText: string | null =
    null;

  if (
    messageType ===
    "text"
  ) {
    messageText =
      message.text?.body ??
      null;
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

  /**
   * Contact baru.
   */
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
   * Update nama jika berubah.
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
  }

  /**
   * ===================================================
   * 5. CARI ISSUE WHATSAPP AKTIF
   * ===================================================
   */
  const activeStatuses = [
    "Open",
    "On Progress",
    "Resolved",
  ];

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
   * 6. SIMPAN PESAN
   * ===================================================
   *
   * Jika sudah ada Issue aktif,
   * langsung hubungkan pesan ke Issue tersebut.
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

    return;
  }

  /**
   * ===================================================
   * 7. BELUM ADA ISSUE
   * ===================================================
   *
   * Untuk sementara pesan disimpan
   * tanpa issue_id.
   *
   * Issue baru TIDAK dibuat dulu karena
   * project/location belum tentu diketahui.
   */
  await saveWhatsAppMessage({
    issueId:
      null,

    phoneNumber,

    messageId,

    messageType,

    messageText,
  });

  console.log(
    "Pesan WhatsApp disimpan sebagai pesan baru."
  );

  /**
   * ===================================================
   * 8. DEBUG INFO
   * ===================================================
   */
  console.log({
    phoneNumber,
    contactName,
    project:
      contact.project ??
      null,
    messageType,
    messageText,
  });

  /**
   * ===================================================
   * TODO:
   *
   * Tahap berikutnya:
   *
   * - Deteksi project
   * - Deteksi location
   * - Jika project belum diketahui → tanyakan
   * - Jika location belum diketahui → tanyakan
   * - Jika sudah lengkap → create issue
   * - Kirim balasan WhatsApp
   * ===================================================
   */
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