"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

const TrackingLeafletMap = dynamic(() => import("./tracking-live-map-inner").then((mod) => mod.TrackingLiveMapInner), {
  ssr: false
});

export function TrackingLiveMap({
  driverLocation,
  destinationLocation,
  restaurantLocation
}: {
  driverLocation: { lat: number; lng: number };
  destinationLocation: { lat: number; lng: number };
  restaurantLocation: { lat: number; lng: number };
}) {
  const points = useMemo(
    () => ({
      driverLocation,
      destinationLocation,
      restaurantLocation
    }),
    [destinationLocation, driverLocation, restaurantLocation]
  );

  return <TrackingLeafletMap {...points} />;
}
