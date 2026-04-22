"use client";

import { useState } from "react";

export function SiteBanner() {
  const [isVisible, setIsVisible] = useState(true);

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
        onClick={() => setIsVisible(false)}
      >
        ×
      </button>
    </div>
  );
}
