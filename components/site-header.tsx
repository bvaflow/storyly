import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-zinc-900 px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link
          href="/"
          className="text-sm uppercase tracking-[0.3em] text-zinc-300 hover:text-zinc-100"
        >
          strory.fun
        </Link>
        <nav className="flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/gallery" className="hover:text-zinc-100">
            Galerie
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-zinc-100">
                Mes albums
              </Link>
              <Link
                href="/create"
                className="rounded-full bg-zinc-100 px-4 py-1.5 text-black hover:bg-amber-200"
              >
                Créer
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Se déconnecter
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-zinc-800 px-4 py-1.5 hover:border-zinc-600"
            >
              Connexion
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
