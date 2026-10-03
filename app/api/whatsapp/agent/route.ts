import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const whatsappAccessToken =
  process.env.WHATSAPP_ACCESS_TOKEN;

const whatsappPhoneNumberId =
  process.env.WHATSAPP_PHONE_NUMBER_ID;

/*
 * Bisa diganti melalui environment variable:
 *
 * WHATSAPP_GRAPH_API_VERSION=v23.0
 *
 * Jika belum ada, sementara menggunakan v23.0.
 */
const whatsappGraphApiVersion =
  process.env.WHATSAPP_GRAPH_API_VERSION ||
  "v23.0";

const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

/* =======================================================
   GET
   Mengambil conversation yang sedang menunggu Agent
======================================================= */

export async function GET() {
  try {
    /*
     * Ambil conversation dengan state AGENT.
     */

    const {
      data: conversationsData,
      error: conversationsError,
    } = await supabase
      .from("whatsapp_conversations")
      .select(
        `
        id,
        phone_number,
        state,
        draft_data,
        created_at,
        updated_at
        `
      )
      .eq("state", "AGENT")
      .order("updated_at", {
        ascending: false,
      });

    if (conversationsError) {
      console.error(
        "GET conversations error:",
        conversationsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            conversationsError.message,
        },
        { status: 500 }
      );
    }

    const conversations =
      conversationsData || [];

    /*
     * Ambil semua message.
     */

    const {
      data: messagesData,
      error: messagesError,
    } = await supabase
      .from("whatsapp_messages")
      .select(
        `
        id,
        message_id,
        phone_number,
        direction,
        message_type,
        message_text,
        created_at,
        issue_id
        `
      )
      .order("created_at", {
        ascending: true,
      });

    if (messagesError) {
      console.error(
        "GET messages error:",
        messagesError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            messagesError.message,
        },
        { status: 500 }
      );
    }

    const allMessages =
      messagesData || [];

    /*
     * Hanya tampilkan message dari customer
     * yang sedang berada di AGENT.
     */

    const activePhoneNumbers =
      new Set(
        conversations.map(
          (conversation) =>
            conversation.phone_number
        )
      );

    const activeMessages =
      allMessages.filter(
        (message) =>
          activePhoneNumbers.has(
            message.phone_number
          )
      );

    /*
     * Bentuk data conversation dengan:
     * - last_message
     * - last_message_at
     * - message_count
     */

    const resultConversations =
      conversations.map(
        (conversation) => {
          const conversationMessages =
            activeMessages.filter(
              (message) =>
                message.phone_number ===
                conversation.phone_number
            );

          const lastMessage =
            conversationMessages[
              conversationMessages.length - 1
            ];

          return {
            ...conversation,

            last_message:
              lastMessage?.message_text ||
              "",

            last_message_at:
              lastMessage?.created_at ||
              conversation.updated_at,

            message_count:
              conversationMessages.length,
          };
        }
      );

    return NextResponse.json({
      success: true,
      conversations:
        resultConversations,
      messages: activeMessages,
    });
  } catch (error) {
    console.error(
      "GET /api/whatsapp/agent error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data WhatsApp Agent.",
      },
      { status: 500 }
    );
  }
}

/* =======================================================
   POST
   Action:
   1. Send message
   2. Close conversation
======================================================= */

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as {
        action?: string;
        phone_number?: string;
        message?: string;
      };

    const action =
      body.action || "close";

    const phoneNumber =
      body.phone_number?.trim();

    /* =================================================
       VALIDASI PHONE NUMBER
    ================================================= */

    if (!phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Nomor WhatsApp customer tidak ditemukan.",
        },
        { status: 400 }
      );
    }

    /* =================================================
       ACTION: SEND MESSAGE
    ================================================= */

    if (action === "send_message") {
      const message =
        body.message?.trim();

      if (!message) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Pesan tidak boleh kosong.",
          },
          { status: 400 }
        );
      }

      /*
       * Pastikan conversation masih AGENT.
       */

      const {
        data: conversation,
        error:
          conversationError,
      } = await supabase
        .from("whatsapp_conversations")
        .select(
          `
          id,
          phone_number,
          state
          `
        )
        .eq(
          "phone_number",
          phoneNumber
        )
        .maybeSingle();

      if (conversationError) {
        console.error(
          "Conversation lookup error:",
          conversationError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              conversationError.message,
          },
          { status: 500 }
        );
      }

      if (!conversation) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Conversation customer tidak ditemukan.",
          },
          { status: 404 }
        );
      }

      if (
        conversation.state !==
        "AGENT"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Conversation ini sudah tidak berada di mode Agent.",
          },
          { status: 409 }
        );
      }

      /*
       * Pastikan environment WhatsApp tersedia.
       */

      if (
        !whatsappAccessToken ||
        !whatsappPhoneNumberId
      ) {
        console.error(
          "WhatsApp environment variables are missing."
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Konfigurasi WhatsApp belum lengkap di server.",
          },
          { status: 500 }
        );
      }

      /* ===============================================
         KIRIM KE WHATSAPP CLOUD API
      =============================================== */

      const whatsappResponse =
        await fetch(
          `https://graph.facebook.com/${whatsappGraphApiVersion}/${whatsappPhoneNumberId}/messages`,
          {
            method: "POST",

            headers: {
              Authorization: `Bearer ${whatsappAccessToken}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              messaging_product:
                "whatsapp",

              recipient_type:
                "individual",

              to: phoneNumber,

              type: "text",

              text: {
                preview_url:
                  false,

                body: message,
              },
            }),
          }
        );

      const whatsappResult =
        (await whatsappResponse.json()) as {
          messages?: Array<{
            id?: string;
          }>;
          error?: {
            message?: string;
            type?: string;
            code?: number;
            error_data?: unknown;
          };
        };

      /*
       * Kalau Meta gagal mengirim,
       * jangan simpan sebagai outgoing message.
       */

      if (!whatsappResponse.ok) {
        console.error(
          "WhatsApp Cloud API error:",
          whatsappResult
        );

        return NextResponse.json(
          {
            success: false,
            error:
              whatsappResult.error?.message ||
              "Gagal mengirim pesan WhatsApp.",
          },
          {
            status:
              whatsappResponse.status >= 400
                ? whatsappResponse.status
                : 500,
          }
        );
      }

      /*
       * Ambil WhatsApp message ID dari response Meta.
       */

      const whatsappMessageId =
        whatsappResult.messages?.[0]?.id ||
        `agent-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

      /* ===============================================
         SIMPAN OUTGOING MESSAGE
      =============================================== */

      const {
        data: savedMessage,
        error:
          saveMessageError,
      } = await supabase
        .from("whatsapp_messages")
        .insert({
          message_id:
            whatsappMessageId,

          phone_number:
            phoneNumber,

          direction:
            "outgoing",

          message_type:
            "text",

          message_text:
            message,

          issue_id:
            null,
        })
        .select(
          `
          id,
          message_id,
          phone_number,
          direction,
          message_type,
          message_text,
          created_at,
          issue_id
          `
        )
        .single();

      if (saveMessageError) {
        /*
         * Pesan sebenarnya sudah berhasil dikirim
         * ke customer, tetapi gagal disimpan ke DB.
         *
         * Jangan menganggap pengiriman WhatsApp gagal.
         */

        console.error(
          "Save outgoing message error:",
          saveMessageError
        );

        return NextResponse.json({
          success: true,

          warning:
            "Pesan berhasil dikirim ke WhatsApp customer, tetapi gagal disimpan ke database.",

          message:
            savedMessage ||
            null,
        });
      }

      /*
       * Update activity conversation.
       *
       * State tetap AGENT karena percakapan
       * masih ditangani Agent.
       */

      const {
        error:
          updateConversationError,
      } = await supabase
        .from("whatsapp_conversations")
        .update({
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "phone_number",
          phoneNumber
        )
        .eq(
          "state",
          "AGENT"
        );

      if (updateConversationError) {
        console.error(
          "Update conversation activity error:",
          updateConversationError
        );
      }

      return NextResponse.json({
        success: true,

        message:
          "Pesan berhasil dikirim.",

        data: savedMessage,
      });
    }

    /* =================================================
       ACTION: CLOSE CONVERSATION
    ================================================= */

    if (action === "close") {
      /*
       * Pastikan conversation memang AGENT.
       */

      const {
        data: conversation,
        error:
          conversationError,
      } = await supabase
        .from("whatsapp_conversations")
        .select(
          `
          id,
          phone_number,
          state
          `
        )
        .eq(
          "phone_number",
          phoneNumber
        )
        .maybeSingle();

      if (conversationError) {
        console.error(
          "Conversation lookup error:",
          conversationError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              conversationError.message,
          },
          { status: 500 }
        );
      }

      if (!conversation) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Conversation tidak ditemukan.",
          },
          { status: 404 }
        );
      }

      if (
        conversation.state !==
        "AGENT"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Conversation ini sudah tidak berada di mode Agent.",
          },
          { status: 409 }
        );
      }

      /*
       * Kembalikan conversation ke IDLE.
       */

      const now =
        new Date().toISOString();

      const {
        data: updatedConversation,
        error:
          updateError,
      } = await supabase
        .from("whatsapp_conversations")
        .update({
          state: "IDLE",
          updated_at: now,
        })
        .eq(
          "phone_number",
          phoneNumber
        )
        .eq(
          "state",
          "AGENT"
        )
        .select(
          `
          id,
          phone_number,
          state,
          draft_data,
          created_at,
          updated_at
          `
        )
        .maybeSingle();

      if (updateError) {
        console.error(
          "Close conversation error:",
          updateError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              updateError.message,
          },
          { status: 500 }
        );
      }

      if (!updatedConversation) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Conversation sudah berubah atau sudah diselesaikan.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,

        message:
          "Percakapan berhasil diselesaikan.",

        conversation:
          updatedConversation,
      });
    }

    /* =================================================
       UNKNOWN ACTION
    ================================================= */

    return NextResponse.json(
      {
        success: false,
        error:
          "Action tidak dikenali.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "POST /api/whatsapp/agent error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada WhatsApp Agent.",
      },
      { status: 500 }
    );
  }
}