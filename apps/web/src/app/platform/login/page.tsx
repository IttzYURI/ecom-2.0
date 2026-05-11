import { LayoutShell } from "../../../components/layout-shell";

export const dynamic = "force-dynamic";

export default async function PlatformLoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <LayoutShell
      eyebrow="Protected platform access"
      title="Platform super admin login"
      subtitle="Use the platform administrator credentials to access global tenant controls."
    >
      <section className="panel">
        <form className="form-grid" action="/api/v1/platform/login" method="post">
          <input name="email" type="email" placeholder="admin@example.com" />
          <input name="password" type="password" placeholder="Password" />
          <button type="submit" className="button-primary">Open platform console</button>
          {error ? <p className="form-error">Platform login failed. Check the configured credentials.</p> : null}
        </form>
      </section>
    </LayoutShell>
  );
}
