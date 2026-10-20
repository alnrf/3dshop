import { getPaymentSettingsAction } from "@/app/admin/actions/settings";
import { getActiveStoreId } from "@/lib/tenant";
import { PaymentSettingsForm } from "./payment-settings-form";

export default async function ConfiguracoesPagamentosPage() {
  const storeId = await getActiveStoreId(); // acesso já barrado no layout do admin
  const config = await getPaymentSettingsAction();
  return <PaymentSettingsForm config={config} storeId={storeId} />;
}
