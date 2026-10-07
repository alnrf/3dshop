import { getShippingSettingsAction, getFlatShippingAction } from "@/app/admin/actions/settings";
import { FlatShippingForm } from "./flat-shipping-form";
import { ShippingSettingsForm } from "./shipping-settings-form";

export default async function ConfiguracoesFretePage() {
  // acesso já barrado no layout do admin
  const [shippingConfig, flatShipping] = await Promise.all([
    getShippingSettingsAction(),
    getFlatShippingAction(),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-medium">Frete</h1>

      <div className="mt-6 space-y-8">
        <FlatShippingForm
          flatShippingCents={flatShipping.flatShippingCents}
          freeShippingThresholdCents={flatShipping.freeShippingThresholdCents}
        />
        <ShippingSettingsForm config={shippingConfig} />
      </div>
    </main>
  );
}
