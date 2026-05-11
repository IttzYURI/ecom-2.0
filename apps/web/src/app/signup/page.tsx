import { LayoutShell } from "../../components/layout-shell";
import { AuthPage } from "../../components/storefront";
import { resolveTenantFromRequest } from "../../lib/tenant";

export const dynamic = "force-dynamic";

export default async function SignupRoute() {
  const tenant = await resolveTenantFromRequest();
  const brandName = tenant?.branding?.logoText ?? tenant?.name ?? "the restaurant";

  return (
    <LayoutShell
      eyebrow={`Join ${brandName}`}
      title="Create Account"
      subtitle="Set up a customer account to speed up future orders and track previous purchases."
    >
      <AuthPage
        mode="signup"
        title="Create your customer account"
        subtitle="Save your details for quicker checkout and smoother repeat ordering."
      />
    </LayoutShell>
  );
}
