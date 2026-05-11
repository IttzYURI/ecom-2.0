import { LayoutShell } from "../../components/layout-shell";
import { AuthPage } from "../../components/storefront";
import { resolveTenantFromRequest } from "../../lib/tenant";

export const dynamic = "force-dynamic";

export default async function LoginRoute() {
  const tenant = await resolveTenantFromRequest();

  return (
    <LayoutShell
      eyebrow="Customer account"
      title="Customer Login"
      subtitle="Return to your account for order history, saved details, and faster checkout."
    >
      <AuthPage
        mode="login"
        title="Log in to your customer account"
        subtitle="Use your account for faster reordering and easier access to previous purchases."
      />
    </LayoutShell>
  );
}
