import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { PlatformShell } from "../../../components/platform-shell";
import { getPlatformSessionFromCookieStore } from "../../../lib/platform-auth";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children
}: {
  children: ReactNode;
}) {
  const session = await getPlatformSessionFromCookieStore();

  if (!session) {
    redirect("/platform/login" as never);
  }

  return <PlatformShell>{children}</PlatformShell>;
}
