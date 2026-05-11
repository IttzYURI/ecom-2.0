export type TenantStatus = "active" | "suspended" | "archived";
export type FulfillmentType = "delivery" | "collection";
export type PaymentMethod = "cash" | "stripe";
export type OrderStatus =
  | "pending_payment"
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
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
export type PrintPaperWidth = "58mm" | "80mm";
export type PrintJobStatus =
  | "pending"
  | "claimed"
  | "printing"
  | "printed"
  | "failed"
  | "cancelled";
export type PrintCopyType = "kitchen" | "receipt" | "dispatch";
export type PrintTriggerType = "auto" | "manual_reprint";
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
  logoUrl?: string;
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

export interface OrderPrintState {
  orderId: string;
  tenantId: string;
  hasKitchenPrint: boolean;
  firstPrintedAt?: string;
  lastPrintedAt?: string;
  printCount: number;
  reprintCount: number;
  lastPrintJobId?: string;
  lastStationId?: string;
  lastPrintStatus?: PrintJobStatus;
  lastPrintError?: string;
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
  paymentMethod?: PaymentMethod;
  printState?: OrderPrintState;
  deliveryTracking?: DeliveryTracking | null;
  createdAt: string;
}

export interface PrintStation {
  id: string;
  tenantId: string;
  name: string;
  tokenHash: string;
  enabled: boolean;
  deviceId?: string;
  printerName?: string;
  paperWidth: PrintPaperWidth;
  autoPrintEnabled: boolean;
  appVersion?: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
  lastActivityAt?: string;
  lastActivityMessage?: string;
}

export interface PrintJobPayload {
  restaurantName: string;
  tenantId: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  fulfillmentType: FulfillmentType;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address?: string;
  items: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  printCount: number;
  stationName?: string;
}

export interface PrintJob {
  id: string;
  tenantId: string;
  orderId: string;
  orderNumber: string;
  jobKey: string;
  stationId?: string;
  copyType: PrintCopyType;
  triggerType: PrintTriggerType;
  status: PrintJobStatus;
  attemptCount: number;
  copiesPrinted: number;
  lastError?: string;
  printerName?: string;
  claimedAt?: string;
  startedPrintingAt?: string;
  printedAt?: string;
  lastFailedAt?: string;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  payload: PrintJobPayload;
}

export interface RegisterPrintStationRequest {
  tenantId: string;
  name: string;
  deviceId?: string;
  printerName?: string;
  paperWidth?: PrintPaperWidth;
  autoPrintEnabled?: boolean;
}

export interface RegisterPrintStationResponse {
  stationId: string;
  token: string;
  name: string;
}

export interface PrintStationHeartbeatRequest {
  printerName?: string;
  paperWidth?: PrintPaperWidth;
  appVersion?: string;
  autoPrintEnabled?: boolean;
  lastActivityMessage?: string;
}

export interface PrintStationHeartbeatResponse {
  stationId: string;
  serverTime: string;
}

export interface PrintJobAckRequest {
  stationId?: string;
}

export interface PrintJobPrintedRequest {
  printerName?: string;
  copiesPrinted?: number;
}

export interface PrintJobFailedRequest {
  error: string;
}

export interface ReprintOrderRequest {
  copyType?: PrintCopyType;
  reason?: string;
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
