import type { Order } from "@rcc/contracts";

const TENANT_BASE_COORDS: Record<string, { lat: number; lng: number }> = {
  tenant_bella: { lat: 51.512, lng: -0.102 },
  tenant_spice: { lat: 51.501, lng: -0.141 }
};

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

export function getRestaurantCoordinate(tenantId: string) {
  return TENANT_BASE_COORDS[tenantId] ?? TENANT_BASE_COORDS.tenant_bella;
}

export function getApproximateDestinationCoordinate(order: Pick<Order, "tenantId" | "address" | "id">) {
  const origin = getRestaurantCoordinate(order.tenantId);
  const seed = hashText(order.address || order.id);
  const latOffset = ((seed % 11) - 5) * 0.0045;
  const lngOffset = (((Math.floor(seed / 11) % 11) - 5) * 0.0065);

  return {
    lat: Number((origin.lat + latOffset).toFixed(4)),
    lng: Number((origin.lng + lngOffset).toFixed(4))
  };
}

function haversineKm(start: { lat: number; lng: number }, end: { lat: number; lng: number }) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDiff = toRadians(end.lat - start.lat);
  const lngDiff = toRadians(end.lng - start.lng);
  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(toRadians(start.lat)) * Math.cos(toRadians(end.lat)) * Math.sin(lngDiff / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function estimateDeliveryEtaMinutes(
  order: Pick<Order, "tenantId" | "address" | "id">,
  driverLocation: { lat: number; lng: number }
) {
  const destination = getApproximateDestinationCoordinate(order);
  const distanceKm = haversineKm(driverLocation, destination);
  const urbanCourierSpeedKmh = 18;
  return Math.max(4, Math.round((distanceKm / urbanCourierSpeedKmh) * 60));
}
