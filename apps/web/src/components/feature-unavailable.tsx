export function FeatureUnavailablePage({ feature }: { feature?: string }) {
  const label = feature
    ? feature.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
    : "This feature";

  return (
    <main className="page-shell tenant-unavailable-shell">
      <section className="tenant-unavailable-card">
        <h1>{label} is not available</h1>
        <p>This feature is currently not enabled for this restaurant.</p>
      </section>
    </main>
  );
}
