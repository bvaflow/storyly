"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <div className="mt-8 rounded-lg border border-amber-200/30 bg-amber-200/2 p-4 text-sm text-amber-100">
        Lien envoyé. Vérifiez votre boîte mail.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="vous@email.com"
        className="w-full rounded-lg border border-zinc-800 bg-transparent px-4 py-3 text-zinc-100 outline-none focus:border-zinc-600"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-full bg-zinc-100 px-6 py-3 text-sm font-medium text-black transition hover:bg-amber-200 disabled:opacity-50"
      >
        {status === "sending" ? "Envoi..." : "Recevoir le lien"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
