import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-900 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
          strory.fun
        </p>
        <h1 className="mt-4 text-3xl font-light text-zinc-50">Connexion</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Entrez votre email — nous vous enverrons un lien magique.
        </p>
        <Suspense
          fallback={
            <div className="mt-8 h-12 animate-pulse rounded-lg bg-zinc-900" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
