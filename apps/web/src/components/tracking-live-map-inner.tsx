"use client";

import { Circle, MapContainer, Polyline, TileLayer } from "react-leaflet";
import { useMap } from "react-leaflet/hooks";

function FitBounds({
  points
}: {
  points: Array<[number, number]>;
}) {
  const map = useMap();

  if (points.length) {
    map.fitBounds(points, { padding: [30, 30] });
  }

  return null;
}

export function TrackingLiveMapInner({
  driverLocation,
  destinationLocation,
  restaurantLocation
}: {
  driverLocation: { lat: number; lng: number };
  destinationLocation: { lat: number; lng: number };
  restaurantLocation: { lat: number; lng: number };
}) {
  const points: Array<[number, number]> = [
    [driverLocation.lat, driverLocation.lng],
    [destinationLocation.lat, destinationLocation.lng],
    [restaurantLocation.lat, restaurantLocation.lng]
  ];

  return (
    <div className="tracking-live-map-shell">
      <MapContainer center={points[0]} zoom={13} scrollWheelZoom={false} className="tracking-live-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={points} pathOptions={{ color: "#af3e2a", weight: 4, opacity: 0.65 }} />
        <Circle center={points[2]} radius={120} pathOptions={{ color: "#18352f", fillOpacity: 0.2 }} />
        <Circle center={points[1]} radius={140} pathOptions={{ color: "#d4a95f", fillOpacity: 0.2 }} />
        <Circle center={points[0]} radius={90} pathOptions={{ color: "#af3e2a", fillOpacity: 0.35 }} />
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
