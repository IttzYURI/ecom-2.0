import type { PublicTenantStatus } from "../lib/tenant";

const STATUS_MESSAGES: Record<PublicTenantStatus, { title: string; body: string }> = {
  suspended: {
    title: "This restaurant is currently unavailable",
    body: "The restaurant has been temporarily paused. Please check back later."
  },
  archived: {
    title: "This restaurant is no longer available",
    body: "The restaurant has been removed from our platform."
  },
  missing: {
    title: "Restaurant not found",
    body: "We could not find a restaurant at this address. Please check the URL and try again."
  },
  active: {
    title: "",
    body: ""
  }
};

export function TenantUnavailablePage({ status }: { status: PublicTenantStatus }) {
  const { title, body } = STATUS_MESSAGES[status] ?? STATUS_MESSAGES.missing;

  return (
    <main className="page-shell tenant-unavailable-shell">
      <section className="tenant-unavailable-card">
        <h1>{title}</h1>
        <p>{body}</p>
      </section>
    </main>
  );
}
