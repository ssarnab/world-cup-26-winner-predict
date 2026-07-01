"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { ChatMessage, loadMessages, sendMessage, Identity } from "@/lib/db";

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chat({ identity }: { identity: Identity }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [online, setOnline] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    loadMessages().then(setMessages);

    const channel = supabase
      .channel("chat-room", {
        config: { presence: { key: identity.uid } },
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
        }
      )
      .on("presence", { event: "sync" }, () => {
        setOnline(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ uid: identity.uid, name: identity.name });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [identity.uid, identity.name]);

  // auto-scroll to newest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    setInput("");
    const { error } = await sendMessage(identity, body);
    if (error) {
      setError(error);
      setInput(body); // restore on failure
    }
    setSending(false);
  };

  if (!isSupabaseConfigured) {
    return (
      <p className="mx-auto max-w-2xl rounded-xl border border-border bg-surface p-5 text-center text-sm text-fg-subtle">
        Chat needs Supabase configured.
      </p>
    );
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
          💬 Live chat
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          {online} online
        </span>
      </div>

      {/* messages */}
      <div className="flex h-[60vh] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-surface p-4">
        {messages.length === 0 ? (
          <p className="m-auto text-sm text-fg-subtle">
            No messages yet — say hi! 👋
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === identity.uid;
            return (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${mine ? "flex-row-reverse" : ""}`}
              >
                {m.user_photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.user_photo}
                    alt=""
                    width={28}
                    height={28}
                    className="mt-0.5 h-7 w-7 shrink-0 rounded-full ring-1 ring-border"
                  />
                ) : (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-border text-xs font-bold text-fg-muted">
                    {m.user_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`max-w-[75%] ${mine ? "text-right" : ""}`}>
                  <div className="mb-0.5 flex items-center gap-2 text-[11px] text-fg-subtle">
                    <span className="font-semibold text-fg-muted">
                      {mine ? "You" : m.user_name}
                    </span>
                    <span>{timeLabel(m.created_at)}</span>
                  </div>
                  <div
                    className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-pick-soft text-fg"
                        : "border border-border bg-surface text-fg"
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          maxLength={500}
          placeholder="Type a message…"
          className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none placeholder:text-fg-subtle focus:border-emerald-400/60"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-40"
        >
          Send
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <p className="mt-2 px-1 text-[11px] text-fg-subtle">
        Be nice — messages are public to everyone on the site.
      </p>
    </section>
  );
}
