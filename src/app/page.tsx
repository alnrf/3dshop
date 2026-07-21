// Raiz: com loja única, redireciona para a vitrine. Quando houver mais lojas,
// vira a landing da plataforma.
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/loja/minha-loja");
}
