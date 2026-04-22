"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ExtAdminOrdersLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/v1/extadmin/orders/stream");

    source.onmessage = () => {
      router.refresh();
    };

    return () => {
      source.close();
    };
  }, [router]);

  return null;
}
