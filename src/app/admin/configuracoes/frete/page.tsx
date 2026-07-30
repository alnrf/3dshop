import { getShippingSettingsAction } from "@/app/admin/actions/settings";
import { ShippingSettingsForm } from "./shipping-settings-form";

export default async function ConfiguracoesFretePage() {
  const config = await getShippingSettingsAction(); // acesso já barrado no layout do admin
  return <ShippingSettingsForm config={config} />;
}
