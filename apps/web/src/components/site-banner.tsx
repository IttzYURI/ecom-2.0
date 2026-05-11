"use client";

import { useEffect, useState } from "react";

const BANNER_KEY = "bella-roma-banner-dismissed";

export function SiteBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(!sessionStorage.getItem(BANNER_KEY));
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="site-banner" role="status">
      <span>Direct ordering available for delivery and collection today.</span>
      <button
        type="button"
        className="site-banner-close"
        aria-label="Dismiss announcement"
        onClick={() => {
          sessionStorage.setItem(BANNER_KEY, "1");
          setIsVisible(false);
        }}
      >
        ×
      </button>
    </div>
  );
}
