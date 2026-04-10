import { LayoutShell } from "../../components/layout-shell";
import { AuthPage } from "../../components/storefront";

export default function SignupRoute() {
  return (
    <LayoutShell
      eyebrow="Join Bella Roma"
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
