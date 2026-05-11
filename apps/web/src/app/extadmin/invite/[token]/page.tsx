import Link from "next/link";

import { getExtAdminInviteByToken } from "../../../../lib/extadmin-invite-store";
import { PlatformAdminService } from "../../../../lib/platform-admin-service";

export const dynamic = "force-dynamic";

export default async function ExtAdminInvitePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ token }, rawSearchParams] = await Promise.all([params, searchParams]);
  const invite = await getExtAdminInviteByToken(token);
  const restaurant = invite ? await new PlatformAdminService().getRestaurant(invite.tenantId) : null;
  const error = Array.isArray(rawSearchParams.error) ? rawSearchParams.error[0] : rawSearchParams.error;
  const isValidInvite = Boolean(invite && invite.status === "pending" && restaurant);

  return (
    <main className="page-shell admin-login-shell">
      <section className="admin-login-card">
        <div className="admin-login-hero">
          <p className="eyebrow">Owner invite</p>
          <h1>
            {restaurant?.tenant.name ?? "Restaurant invite"} owner setup
          </h1>
          <p>
            {isValidInvite
              ? "Set password, activate owner account, enter restaurant admin."
              : "Invite invalid, expired, or already used."}
          </p>
          <div className="admin-login-points">
            <div>
              <strong>Account</strong>
              <span>{invite?.email ?? "Unknown invite"}</span>
            </div>
            <div>
              <strong>Expires</strong>
              <span>{invite ? new Date(invite.expiresAt).toLocaleString() : "Unavailable"}</span>
            </div>
          </div>
        </div>

        <section className="admin-login-form">
          <div>
            <p className="eyebrow">Accept invite</p>
            <h2>{isValidInvite ? "Create owner password" : "Invite unavailable"}</h2>
            <p>
              {isValidInvite
                ? "Password must match both fields. Successful submit logs owner into restaurant admin."
                : "Ask platform super admin to generate fresh owner invite."}
            </p>
          </div>

          {isValidInvite ? (
            <form className="form-grid" method="post" action="/api/v1/extadmin/invite/accept">
              <input type="hidden" name="token" value={token} />
              <input name="password" type="password" placeholder="New password" minLength={8} required />
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                minLength={8}
                required
              />
              <button type="submit" className="button-primary admin-submit-button">
                Activate owner account
              </button>
              {error ? <p className="form-error">{error.replaceAll("_", " ").toLowerCase()}</p> : null}
            </form>
          ) : (
            <div className="form-grid">
              <Link href="/extadmin/login" className="button-primary admin-submit-button">
                Go to owner login
              </Link>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
