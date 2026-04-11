import { ExtAdminLoginCard } from "../../../components/extadmin";

export const metadata = {
  title: "Bella Roma Owner Login"
};

export default async function ExtAdminLoginRoute({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return <ExtAdminLoginCard error={error === "invalid" ? "Invalid owner credentials." : null} />;
}
