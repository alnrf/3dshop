// Home da plataforma. Antes redirecionava direto pra loja única; agora que
// existe cadastro self-service de tenants, vira a landing (mínima) da
// plataforma, com o convite para cadastrar uma nova loja.
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-dvh bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="text-sm font-medium">Minha Loja 3D</span>
          <div className="flex items-center gap-3">
            <Link
              href="/entrar"
              className="inline-flex h-9 items-center rounded-lg border border-neutral-300 px-4 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Login
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex h-9 items-center rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Cadastre sua loja
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-3xl font-medium">Venda suas impressões 3D online</h1>
        <p className="mt-3 text-neutral-600">
          Cadastre sua loja, configure seus produtos e comece a vender.
        </p>
      </main>
    </div>
  );
}
