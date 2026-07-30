// lib/mail.ts — envio de e-mail transacional. Sem provedor real configurado
// ainda: só loga no console. Trocar a implementação aqui (Resend/SMTP/SES)
// quando houver, sem mexer em quem chama sendMail.
export async function sendMail({ to, subject, body }: { to: string; subject: string; body: string }) {
  console.log(
    `\n─── e-mail (stub, sem provedor configurado) ───\nPara: ${to}\nAssunto: ${subject}\n\n${body}\n────────────────────────────────────────────────\n`,
  );
}
