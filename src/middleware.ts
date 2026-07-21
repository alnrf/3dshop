// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

// Roda no Edge: extrai o slug da loja do path (/loja/<slug>/...) e o injeta nos
// headers do REQUEST (não do response), para o server lê-lo via headers().
// Trocar por subdomínio depois = ler req.nextUrl.hostname aqui; nada mais muda.
export function middleware(req: NextRequest) {
  const slug = req.nextUrl.pathname.match(/^\/loja\/([^/]+)/)?.[1];
  const headers = new Headers(req.headers);
  if (slug) headers.set("x-store-slug", slug);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/loja/:path*"],
};
