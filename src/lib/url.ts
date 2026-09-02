// lib/url.ts
import { headers } from "next/headers";

/** Origin do request atual (para success_url/cancel_url do Stripe Checkout, etc). */
export async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
