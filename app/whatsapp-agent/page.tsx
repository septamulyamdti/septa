"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Conversation = {
  id: number;
  phone_number: string;
  state: string;
  draft_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_message: string;
  last_message_at: string;
  message_count: number;
};

type WhatsAppMessage = {
  id: number;
  message_id: string;
  phone_number: string;
  direction: string;
  message_type: string;
  message_text: string;
  created_at: string;
  issue_id?: number | null;
};

type AgentResponse = {
  success: boolean;
  conversations: Conversation[];
  messages: WhatsAppMessage[];
  error?: string;
};

export default function WhatsAppAgentPage() {
  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [messages, setMessages] =
    useState<WhatsAppMessage[]>([]);

  const [selectedPhone, setSelectedPhone] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [closingConversation, setClosingConversation] =
    useState(false);

  const [sendingMessage, setSendingMessage] =
    useState(false);

  const [messageInput, setMessageInput] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  /* =======================================================
     MESSAGE SCROLL
  ======================================================= */

  const messagesContainerRef =
    useRef<HTMLDivElement | null>(null);

  const shouldAutoScrollRef =
    useRef(true);

  const handleMessagesScroll = () => {
    const element =
      messagesContainerRef.current;

    if (!element) {
      return;
    }

    const distanceFromBottom =
      element.scrollHeight -
      element.scrollTop -
      element.clientHeight;

    shouldAutoScrollRef.current =
      distanceFromBottom < 100;
  };

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const element =
        messagesContainerRef.current;

      if (!element) {
        return;
      }

      element.scrollTo({
        top: element.scrollHeight,
        behavior,
      });
    },
    []
  );

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadData = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        const response =
          await fetch(
            "/api/whatsapp/agent",
            {
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as AgentResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              "Gagal mengambil data WhatsApp."
          );
        }

        const nextConversations =
          result.conversations || [];

        const nextMessages =
          result.messages || [];

        setConversations(
          nextConversations
        );

        setMessages(nextMessages);

        setError(null);

        /* =================================================
           AUTO SELECT FIRST CHAT
        ================================================= */

        if (
          !selectedPhone &&
          nextConversations.length
        ) {
          setSelectedPhone(
            nextConversations[0]
              .phone_number
          );

          shouldAutoScrollRef.current =
            true;
        }

        /* =================================================
           IF SELECTED CHAT DISAPPEARS
        ================================================= */

        if (
          selectedPhone &&
          !nextConversations.some(
            (conversation) =>
              conversation.phone_number ===
              selectedPhone
          )
        ) {
          setSelectedPhone(
            nextConversations[0]
              ?.phone_number || null
          );

          shouldAutoScrollRef.current =
            true;
        }
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan."
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedPhone]
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  /* =======================================================
     AUTO REFRESH
  ======================================================= */

  useEffect(() => {
    const interval =
      setInterval(() => {
        loadData(false);
      }, 5000);

    return () =>
      clearInterval(interval);
  }, [loadData]);

  /* =======================================================
     SELECTED CONVERSATION
  ======================================================= */

  const selectedConversation =
    useMemo(() => {
      return (
        conversations.find(
          (conversation) =>
            conversation.phone_number ===
            selectedPhone
        ) || null
      );
    }, [
      conversations,
      selectedPhone,
    ]);

  /* =======================================================
     SELECTED MESSAGES
  ======================================================= */

  const selectedMessages =
    useMemo(() => {
      if (!selectedPhone) {
        return [];
      }

      return messages.filter(
        (message) =>
          message.phone_number ===
          selectedPhone
      );
    }, [
      messages,
      selectedPhone,
    ]);

  /* =======================================================
     AUTO SCROLL SAAT PILIH CUSTOMER
  ======================================================= */

  useEffect(() => {
    shouldAutoScrollRef.current =
      true;

    requestAnimationFrame(() => {
      scrollToBottom("auto");
    });
  }, [
    selectedPhone,
    scrollToBottom,
  ]);

  /* =======================================================
     AUTO SCROLL SAAT PESAN BERUBAH
  ======================================================= */

  useEffect(() => {
    if (
      shouldAutoScrollRef.current
    ) {
      requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
    }
  }, [
    selectedMessages.length,
    selectedPhone,
    scrollToBottom,
  ]);

  /* =======================================================
     FORMAT PHONE
  ======================================================= */

  function formatPhone(
    phone: string
  ) {
    if (
      phone.startsWith("62")
    ) {
      return `+${phone}`;
    }

    return phone;
  }

  /* =======================================================
     FORMAT DATE
  ======================================================= */

  function formatDate(
    value: string
  ) {
    try {
      return new Intl.DateTimeFormat(
        "id-ID",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(new Date(value));
    } catch {
      return value;
    }
  }

  /* =======================================================
     FORMAT TIME ONLY
  ======================================================= */

  function formatTime(
    value: string
  ) {
    try {
      return new Intl.DateTimeFormat(
        "id-ID",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(new Date(value));
    } catch {
      return "";
    }
  }

  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  const handleSendMessage =
    async () => {
      if (
        !selectedConversation ||
        sendingMessage ||
        closingConversation
      ) {
        return;
      }

      const message =
        messageInput.trim();

      if (!message) {
        return;
      }

      const phoneNumber =
        selectedConversation.phone_number;

      try {
        setSendingMessage(true);
        setError(null);

        /*
         * Kirim ke API Agent.
         */

        const response =
          await fetch(
            "/api/whatsapp/agent",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                action:
                  "send_message",

                phone_number:
                  phoneNumber,

                message,
              }),
            }
          );

        const result =
          (await response.json()) as {
            success: boolean;
            message?: string;
            warning?: string;
            error?: string;
            data?: WhatsAppMessage;
          };

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              "Gagal mengirim pesan."
          );
        }

        /*
         * Kosongkan input setelah berhasil.
         */

        setMessageInput("");

        /*
         * Kalau API berhasil menyimpan pesan,
         * langsung masukkan ke tampilan agar
         * Agent tidak perlu menunggu polling 5 detik.
         */

        if (result.data) {
          setMessages(
            (currentMessages) => {
              /*
               * Hindari duplicate apabila polling
               * sudah lebih dulu mengambil pesan.
               */

              const alreadyExists =
                currentMessages.some(
                  (item) =>
                    item.message_id ===
                    result.data?.message_id
                );

              if (
                alreadyExists
              ) {
                return currentMessages;
              }

              return [
                ...currentMessages,
                result.data!,
              ];
            }
          );
        }

        /*
         * Pastikan posisi kembali ke pesan terbaru
         * setelah Agent mengirim pesan.
         */

        shouldAutoScrollRef.current =
          true;

        requestAnimationFrame(() => {
          scrollToBottom("smooth");
        });

        /*
         * Warning hanya dicatat ke console.
         *
         * Contoh:
         * pesan berhasil dikirim Meta,
         * tetapi gagal disimpan ke DB.
         */

        if (result.warning) {
          console.warn(
            result.warning
          );
        }
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Gagal mengirim pesan."
        );
      } finally {
        setSendingMessage(false);
      }
    };

  /* =======================================================
     ENTER TO SEND
  ======================================================= */

  const handleMessageKeyDown =
    (
      event: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        handleSendMessage();
      }
    };

  /* =======================================================
     CLOSE / COMPLETE CONVERSATION
  ======================================================= */

  const handleCloseConversation =
    async () => {
      if (
        !selectedConversation ||
        closingConversation
      ) {
        return;
      }

      const phoneNumber =
        selectedConversation.phone_number;

      const confirmed =
        window.confirm(
          `Selesaikan percakapan dengan ${formatPhone(
            phoneNumber
          )}?\n\nCustomer akan dikeluarkan dari daftar WhatsApp Agent dan status conversation akan dikembalikan ke IDLE.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setClosingConversation(true);
        setError(null);

        const response =
          await fetch(
            "/api/whatsapp/agent",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                action: "close",

                phone_number:
                  phoneNumber,
              }),
            }
          );

        const result =
          (await response.json()) as {
            success: boolean;
            message?: string;
            error?: string;
          };

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              "Gagal menyelesaikan percakapan."
          );
        }

        /*
         * Refresh data langsung setelah conversation
         * berhasil diubah menjadi IDLE.
         */

        await loadData(false);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Gagal menyelesaikan percakapan."
        );
      } finally {
        setClosingConversation(false);
      }
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 p-4 md:p-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-4 shrink-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          <div>
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-2xl">
                💬
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  WhatsApp Agent
                </h1>

                <p className="text-sm text-slate-500">
                  Kelola percakapan customer
                  dengan Helpdesk Agent.
                </p>
              </div>

            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              loadData(true)
            }
            disabled={
              loading ||
              closingConversation ||
              sendingMessage
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>↻</span>
            Refresh
          </button>

        </div>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="mb-4 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="mb-4 grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Menunggu / Aktif
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {conversations.length}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Conversation dengan status AGENT
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total Pesan
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {messages.length}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Pesan dalam conversation agent
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Status Sistem
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />

            <span className="text-sm font-semibold text-green-700">
              Online
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            Auto refresh setiap 5 detik
          </p>
        </div>

      </div>

      {/* =================================================
          CHAT AREA
      ================================================= */}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[360px_minmax(0,1fr)]">

        {/* =================================================
            LEFT — CUSTOMER LIST
        ================================================= */}

        <div className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">

          <div className="shrink-0 border-b border-slate-200 px-5 py-4">

            <div className="flex items-center justify-between">

              <div>
                <h2 className="font-bold text-slate-900">
                  Customer
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Percakapan yang membutuhkan Agent
                </p>
              </div>

              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                {conversations.length}
              </span>

            </div>

          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">

            {loading &&
            conversations.length === 0 ? (
              <div className="p-5 text-center text-sm text-slate-500">
                Memuat conversation...
              </div>
            ) : conversations.length ===
              0 ? (
              <div className="flex h-full min-h-[250px] flex-col items-center justify-center px-6 text-center">

                <div className="mb-3 text-4xl">
                  💬
                </div>

                <p className="font-semibold text-slate-700">
                  Belum ada customer
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Customer yang memilih
                  Hubungi Helpdesk akan muncul
                  di sini.
                </p>

              </div>
            ) : (
              <div className="divide-y divide-slate-100">

                {conversations.map(
                  (conversation) => {
                    const isSelected =
                      conversation.phone_number ===
                      selectedPhone;

                    return (
                      <button
                        key={
                          conversation.phone_number
                        }
                        type="button"
                        onClick={() => {
                          shouldAutoScrollRef.current =
                            true;

                          setSelectedPhone(
                            conversation.phone_number
                          );
                        }}
                        className={`w-full px-5 py-4 text-left transition ${
                          isSelected
                            ? "bg-slate-100"
                            : "hover:bg-slate-50"
                        }`}
                      >

                        <div className="flex items-start gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                            {conversation.phone_number
                              .slice(-2)}
                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex items-center justify-between gap-2">

                              <p className="truncate text-sm font-bold text-slate-900">
                                {formatPhone(
                                  conversation.phone_number
                                )}
                              </p>

                              <span className="shrink-0 text-[11px] text-slate-400">
                                {formatTime(
                                  conversation.last_message_at
                                )}
                              </span>

                            </div>

                            <div className="mt-1 flex items-center gap-2">

                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">

                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

                                AGENT

                              </span>

                              <span className="text-[11px] text-slate-400">
                                {
                                  conversation.message_count
                                }{" "}
                                pesan
                              </span>

                            </div>

                            <p className="mt-2 truncate text-xs text-slate-500">
                              {conversation.last_message ||
                                "Belum ada pesan"}
                            </p>

                          </div>
                        </div>

                      </button>
                    );
                  }
                )}

              </div>
            )}

          </div>
        </div>

        {/* =================================================
            RIGHT — CHAT
        ================================================= */}

        <div className="flex min-h-0 min-w-0 flex-col bg-slate-50">

          {!selectedConversation ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">

              <div className="mb-4 text-5xl">
                💬
              </div>

              <h2 className="text-lg font-bold text-slate-800">
                Pilih customer
              </h2>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Pilih conversation di sebelah
                kiri untuk melihat riwayat chat.
              </p>

            </div>
          ) : (
            <>
              {/* =================================================
                  CHAT HEADER
              ================================================= */}

              <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">

                <div className="flex items-center justify-between gap-3">

                  <div className="flex min-w-0 items-center gap-3">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                      {selectedConversation.phone_number.slice(
                        -2
                      )}
                    </div>

                    <div className="min-w-0">

                      <h2 className="truncate font-bold text-slate-900">
                        {formatPhone(
                          selectedConversation.phone_number
                        )}
                      </h2>

                      <div className="mt-1 flex items-center gap-2">

                        <span className="h-2 w-2 rounded-full bg-green-500" />

                        <span className="text-xs font-medium text-green-700">
                          Menunggu Agent
                        </span>

                      </div>

                    </div>

                  </div>

                  <div className="flex shrink-0 items-center gap-3">

                    <div className="hidden text-right sm:block">
                      <p className="text-xs text-slate-400">
                        Last activity
                      </p>

                      <p className="text-xs font-semibold text-slate-600">
                        {formatDate(
                          selectedConversation.updated_at
                        )}
                      </p>
                    </div>

                    {/* =========================================
                        SELESAIKAN PERCAKAPAN
                    ========================================= */}

                    <button
                      type="button"
                      onClick={
                        handleCloseConversation
                      }
                      disabled={
                        closingConversation ||
                        sendingMessage
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>
                        {closingConversation
                          ? "⏳"
                          : "✓"}
                      </span>

                      <span className="hidden sm:inline">
                        {closingConversation
                          ? "Menyelesaikan..."
                          : "Selesaikan"}
                      </span>

                      <span className="sm:hidden">
                        {closingConversation
                          ? "..."
                          : "Selesai"}
                      </span>
                    </button>

                  </div>

                </div>

              </div>

              {/* =================================================
                  MESSAGES
              ================================================= */}

              <div
                ref={messagesContainerRef}
                onScroll={
                  handleMessagesScroll
                }
                className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6"
              >

                {selectedMessages.length ===
                0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Belum ada pesan.
                  </div>
                ) : (
                  <div className="space-y-3">

                    {selectedMessages.map(
                      (message) => {
                        const isIncoming =
                          message.direction ===
                          "incoming";

                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              isIncoming
                                ? "justify-start"
                                : "justify-end"
                            }`}
                          >

                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                                isIncoming
                                  ? "rounded-tl-md border border-slate-200 bg-white"
                                  : "rounded-tr-md bg-slate-900 text-white"
                              }`}
                            >

                              <div
                                className={`mb-1 text-[10px] font-bold uppercase ${
                                  isIncoming
                                    ? "text-slate-400"
                                    : "text-slate-300"
                                }`}
                              >
                                {isIncoming
                                  ? "Customer"
                                  : "Agent"}
                              </div>

                              <p
                                className={`whitespace-pre-wrap break-words text-sm leading-6 ${
                                  isIncoming
                                    ? "text-slate-700"
                                    : "text-white"
                                }`}
                              >
                                {
                                  message.message_text
                                }
                              </p>

                              <div
                                className={`mt-1 text-right text-[10px] ${
                                  isIncoming
                                    ? "text-slate-400"
                                    : "text-slate-300"
                                }`}
                              >
                                {formatTime(
                                  message.created_at
                                )}
                              </div>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>
                )}

              </div>

              {/* =================================================
                  INPUT — ACTIVE
              ================================================= */}

              <div className="shrink-0 border-t border-slate-200 bg-white p-4">

                <div className="flex items-center gap-3">

                  <input
                    type="text"
                    value={messageInput}
                    onChange={(event) =>
                      setMessageInput(
                        event.target.value
                      )
                    }
                    onKeyDown={
                      handleMessageKeyDown
                    }
                    disabled={
                      sendingMessage ||
                      closingConversation
                    }
                    placeholder="Ketik balasan untuk customer..."
                    className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    onClick={
                      handleSendMessage
                    }
                    disabled={
                      sendingMessage ||
                      closingConversation ||
                      !messageInput.trim()
                    }
                    className="h-11 shrink-0 rounded-xl bg-green-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {sendingMessage
                      ? "Mengirim..."
                      : "Kirim"}
                  </button>

                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Tekan Enter untuk mengirim
                  pesan.
                </p>

              </div>

            </>
          )}

        </div>
      </div>
    </div>
  );
}