export type TenantStatus = "active" | "suspended" | "archived";
export type FulfillmentType = "delivery" | "collection";
export type OrderStatus =
  | "pending_payment"
  | "placed"
  | "accepted"
  | "preparing"
  | "completed"
  | "cancelled"
  | "refunded";
export type DeliveryStatus =
  | "awaiting_dispatch"
  | "driver_assigned"
  | "out_for_delivery"
  | "arriving"
  | "delivered"
  | "delivery_failed";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type BookingStatus = "pending" | "accepted" | "rejected" | "cancelled";
export type DeliveryTrackingEventType =
  | "order_confirmed"
  | "preparing"
  | "ready_for_dispatch"
  | "driver_assigned"
  | "driver_unassigned"
  | "out_for_delivery"
  | "arriving"
  | "eta_updated"
  | "delivered"
  | "delivery_failed";

export interface TenantBranding {
  primaryColor: string;
  accentColor: string;
  logoText: string;
  heroImage: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  status: TenantStatus;
  cuisine: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  branding: TenantBranding;
  deliveryPostcodes: string[];
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string;
  parentCategoryId?: string;
  sortOrder: number;
  visible: boolean;
}

export interface MenuOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface OptionGroup {
  id: string;
  tenantId: string;
  name: string;
  required: boolean;
  selectionType: "single" | "multiple";
  minSelect: number;
  maxSelect: number;
  options: MenuOption[];
}

export interface MenuItem {
  id: string;
  tenantId: string;
  categoryIds: string[];
  name: string;
  slug: string;
  description: string;
  image: string;
  basePrice: number;
  featured: boolean;
  bestSeller: boolean;
  available: boolean;
  optionGroupIds: string[];
}

export interface Promotion {
  id: string;
  tenantId: string;
  name: string;
  type: "percentage" | "fixed" | "bogo" | "conditional";
  summary: string;
  active: boolean;
}

export interface Review {
  id: string;
  tenantId: string;
  author: string;
  rating: number;
  content: string;
}

export interface Booking {
  id: string;
  tenantId: string;
  customerName: string;
  email: string;
  phone: string;
  partySize: number;
  bookingDate: string;
  bookingTime: string;
  notes?: string;
  status: BookingStatus;
}

export interface OrderLineOptionSelection {
  optionGroupId: string;
  optionIds: string[];
}

export interface OrderLine {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedOptions: OrderLineOptionSelection[];
  note?: string;
}

export interface DriverLocationSnapshot {
  lat: number;
  lng: number;
  capturedAt: string;
  accuracyMeters: number;
}

export interface DeliveryTrackingEvent {
  id: string;
  type: DeliveryTrackingEventType;
  label: string;
  description?: string;
  createdAt: string;
}

export interface DeliveryTracking {
  trackingToken: string;
  deliveryStatus: DeliveryStatus;
  estimatedReadyAt?: string;
  estimatedDeliveredAt?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  dispatchedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  lastKnownLocation?: DriverLocationSnapshot;
  trackingEvents: DeliveryTrackingEvent[];
  lastUpdatedAt: string;
}

export interface Order {
  id: string;
  tenantId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentType: FulfillmentType;
  address?: string;
  items: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryTracking?: DeliveryTracking | null;
  createdAt: string;
}

export interface Role {
  id: string;
  tenantId?: string;
  name: string;
  permissions: string[];
}

export interface StaffMember {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  roleIds: string[];
  orderEmailsEnabled: boolean;
}

export interface Driver {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  active: boolean;
  vehicleLabel: string;
}

export interface PlatformMetric {
  label: string;
  value: string;
}

export interface StorefrontContent {
  heroTitle: string;
  heroSubtitle: string;
  about: string;
  galleryImages?: string[];
  faq: Array<{ question: string; answer: string }>;
}

export interface TenantBundle {
  tenant: Tenant;
  content: StorefrontContent;
  categories: Category[];
  optionGroups: OptionGroup[];
  menuItems: MenuItem[];
  promotions: Promotion[];
  reviews: Review[];
  bookings: Booking[];
  orders: Order[];
  drivers: Driver[];
  roles: Role[];
  staff: StaffMember[];
}
