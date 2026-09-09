// app/loja/[slug]/pedido/[id]/order-stepper.tsx
// Passos variam por pedido: "printing" só existe pra encomenda (madeToOrder) —
// pronta entrega pula direto de "paid" pra "shipped", já que o item já existe.
const STEP_LABELS: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pagamento aprovado",
  printing: "Em impressão",
  shipped: "Enviado",
  delivered: "Entregue",
};

export function OrderStepper({
  status,
  madeToOrder,
}: {
  status: string;
  madeToOrder: boolean;
}) {
  if (status === "canceled") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        Pedido cancelado
      </div>
    );
  }

  const steps = madeToOrder
    ? ["awaiting_payment", "paid", "printing", "shipped", "delivered"]
    : ["awaiting_payment", "paid", "shipped", "delivered"];
  const currentIndex = Math.max(steps.indexOf(status), 0);

  return (
    <ol className="flex items-start">
      {steps.map((step, i) => {
        const done = i <= currentIndex;
        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex w-16 flex-col items-center gap-1.5 sm:w-24">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  done ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-500"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`text-center text-[11px] leading-tight ${
                  done ? "font-medium text-stone-900" : "text-stone-400"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 ${i < currentIndex ? "bg-stone-900" : "bg-stone-200"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
