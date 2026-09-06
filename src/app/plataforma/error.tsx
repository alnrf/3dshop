// app/plataforma/error.tsx — mesma rede de segurança do /admin/error.tsx.
"use client";

export default function PlataformaError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-sm px-6 py-16 text-center">
      <h1 className="text-xl font-medium">Algo deu errado</h1>
      <p className="mt-3 text-sm text-neutral-600">
        Não foi possível carregar esta página. Tente de novo — se persistir, saia e entre outra vez.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white"
        >
          Tentar de novo
        </button>
        <a
          href="/entrar"
          className="h-10 rounded-lg border border-neutral-300 px-4 text-sm font-medium leading-10 text-neutral-700 hover:bg-neutral-50"
        >
          Ir para o login
        </a>
      </div>
    </main>
  );
}
