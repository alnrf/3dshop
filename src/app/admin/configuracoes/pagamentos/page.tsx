import { getPaymentSettingsAction } from "@/app/admin/actions/settings";
import { PaymentSettingsForm } from "./payment-settings-form";

export default async function ConfiguracoesPagamentosPage() {
  const config = await getPaymentSettingsAction(); // acesso já barrado no layout do admin
  return <PaymentSettingsForm config={config} />;
}
