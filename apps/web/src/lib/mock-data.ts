import type {
  Booking,
  Category,
  Driver,
  MenuItem,
  OptionGroup,
  Order,
  PlatformMetric,
  Promotion,
  Review,
  Role,
  StaffMember,
  StorefrontContent,
  Tenant,
  TenantBundle
} from "@rcc/contracts";

const tenants: Tenant[] = [
  {
    id: "tenant_bella",
    name: "Bella Roma",
    slug: "bella-roma",
    subdomain: "bella",
    status: "active",
    cuisine: "Italian",
    description: "Wood-fired pizza, fresh pasta, and quick delivery.",
    phone: "+44 20 1234 5678",
    email: "hello@bellaroma.test",
    address: "10 Market Street, London",
    deliveryPostcodes: ["E1 1AA", "E1 1AB", "E1 1AC"],
    branding: {
      primaryColor: "#9d2f2f",
      accentColor: "#f5d9a6",
      logoText: "Bella Roma",
      heroImage:
        "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80"
    }
  },
  {
    id: "tenant_spice",
    name: "Spice Garden",
    slug: "spice-garden",
    subdomain: "spice",
    status: "active",
    cuisine: "Indian",
    description: "Bold curries, grills, and family meal deals.",
    phone: "+44 20 9876 5432",
    email: "team@spicegarden.test",
    address: "22 High Road, London",
    deliveryPostcodes: ["SW1A 1AA", "SW1A 1AB"],
    branding: {
      primaryColor: "#0f5c4d",
      accentColor: "#f7d06e",
      logoText: "Spice Garden",
      heroImage:
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80"
    }
  }
];

const storefrontContent: Record<string, StorefrontContent> = {
  tenant_bella: {
    heroTitle: "Restaurant-quality food, ordered direct.",
    heroSubtitle: "Delivery and collection with no marketplace detour.",
    about:
      "Bella Roma serves fast-moving, premium Italian comfort food with a focus on direct ordering and repeat customers.",
    galleryImages: [
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80"
    ],
    faq: [
      {
        question: "How long does delivery take?",
        answer: "Typical delivery time is 30 to 45 minutes depending on postcode."
      },
      {
        question: "Do you support collection?",
        answer: "Yes, collection is available every day during opening hours."
      }
    ]
  },
  tenant_spice: {
    heroTitle: "Freshly prepared Indian classics, built for repeat orders.",
    heroSubtitle: "Collections, delivery, meal deals, and bold flavors.",
    about:
      "Spice Garden combines neighborhood reliability with a premium online ordering experience.",
    galleryImages: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=900&q=80"
    ],
    faq: [
      {
        question: "Can I request spice levels?",
        answer: "Yes, many dishes support modifier options and special notes."
      },
      {
        question: "Do you accept cash?",
        answer: "Yes, both cash and online card payments are supported."
      }
    ]
  }
};

const categories: Category[] = [
  {
    id: "cat_pizza",
    tenantId: "tenant_bella",
    name: "Pizza",
    slug: "pizza",
    description: "Stone-baked classics and house specials.",
    sortOrder: 1,
    visible: true
  },
  {
    id: "cat_pasta",
    tenantId: "tenant_bella",
    name: "Pasta",
    slug: "pasta",
    description: "Fresh pasta and baked favorites.",
    sortOrder: 2,
    visible: true
  },
  {
    id: "cat_curries",
    tenantId: "tenant_spice",
    name: "Curries",
    slug: "curries",
    description: "House curries and chef specials.",
    sortOrder: 1,
    visible: true
  }
];

const optionGroups: OptionGroup[] = [
  {
    id: "grp_size",
    tenantId: "tenant_bella",
    name: "Choose size",
    required: true,
    selectionType: "single",
    minSelect: 1,
    maxSelect: 1,
    options: [
      { id: "opt_regular", name: "Regular", priceDelta: 0 },
      { id: "opt_large", name: "Large", priceDelta: 3 }
    ]
  },
  {
    id: "grp_toppings",
    tenantId: "tenant_bella",
    name: "Extra toppings",
    required: false,
    selectionType: "multiple",
    minSelect: 0,
    maxSelect: 3,
    options: [
      { id: "opt_olives", name: "Olives", priceDelta: 1.5 },
      { id: "opt_pepperoni", name: "Pepperoni", priceDelta: 2 },
      { id: "opt_mushrooms", name: "Mushrooms", priceDelta: 1.5 }
    ]
  },
  {
    id: "grp_heat",
    tenantId: "tenant_spice",
    name: "Spice level",
    required: true,
    selectionType: "single",
    minSelect: 1,
    maxSelect: 1,
    options: [
      { id: "opt_mild", name: "Mild", priceDelta: 0 },
      { id: "opt_medium", name: "Medium", priceDelta: 0 },
      { id: "opt_hot", name: "Hot", priceDelta: 0 }
    ]
  }
];

const menuItems: MenuItem[] = [
  {
    id: "item_margherita",
    tenantId: "tenant_bella",
    categoryIds: ["cat_pizza"],
    name: "Margherita",
    slug: "margherita",
    description: "San Marzano tomato, basil, and Fior di Latte mozzarella.",
    image:
      "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=900&q=80",
    basePrice: 11.5,
    featured: true,
    bestSeller: true,
    available: true,
    optionGroupIds: ["grp_size", "grp_toppings"]
  },
  {
    id: "item_lasagne",
    tenantId: "tenant_bella",
    categoryIds: ["cat_pasta"],
    name: "Lasagne al Forno",
    slug: "lasagne-al-forno",
    description: "Slow-cooked beef ragu, bechamel, parmesan.",
    image:
      "https://images.unsplash.com/photo-1619895092538-128341789043?auto=format&fit=crop&w=900&q=80",
    basePrice: 13.9,
    featured: true,
    bestSeller: false,
    available: true,
    optionGroupIds: []
  },
  {
    id: "item_butter_chicken",
    tenantId: "tenant_spice",
    categoryIds: ["cat_curries"],
    name: "Butter Chicken",
    slug: "butter-chicken",
    description: "Creamy tomato curry, tandoori chicken, fenugreek.",
    image:
      "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80",
    basePrice: 12.5,
    featured: true,
    bestSeller: true,
    available: true,
    optionGroupIds: ["grp_heat"]
  }
];

const promotions: Promotion[] = [
  {
    id: "promo_bella",
    tenantId: "tenant_bella",
    name: "Midweek 15% Off",
    type: "percentage",
    summary: "15% off orders above GBP 25 every Tuesday to Thursday.",
    active: true
  },
  {
    id: "promo_spice",
    tenantId: "tenant_spice",
    name: "Free Popadoms",
    type: "conditional",
    summary: "Free popadoms on delivery orders above GBP 20.",
    active: true
  }
];

const reviews: Review[] = [
  {
    id: "review_1",
    tenantId: "tenant_bella",
    author: "James",
    rating: 5,
    content: "Fast delivery, excellent pizza, and much better than ordering through a marketplace."
  },
  {
    id: "review_2",
    tenantId: "tenant_spice",
    author: "Aisha",
    rating: 5,
    content: "The online ordering flow is quick and the curry quality is consistently strong."
  }
];

const bookings: Booking[] = [
  {
    id: "booking_1",
    tenantId: "tenant_bella",
    customerName: "Mia Turner",
    email: "mia@example.com",
    phone: "+44 7700 900111",
    partySize: 4,
    bookingDate: "2026-04-13",
    bookingTime: "19:30",
    notes: "Window seat if possible",
    status: "pending"
  }
];

const orders: Order[] = [
  {
    id: "order_4",
    tenantId: "tenant_bella",
    orderNumber: "BR-1058",
    customerName: "Noah Carter",
    customerEmail: "noah@example.com",
    customerPhone: "+44 7700 900222",
    fulfillmentType: "delivery",
    address: "12 Baker Street, London",
    items: [
      {
        menuItemId: "item_lasagne",
        name: "Lasagne al Forno",
        quantity: 1,
        unitPrice: 13.9,
        selectedOptions: []
      },
      {
        menuItemId: "item_margherita",
        name: "Margherita",
        quantity: 1,
        unitPrice: 11.5,
        selectedOptions: []
      }
    ],
    subtotal: 25.4,
    deliveryFee: 3.5,
    discount: 0,
    total: 28.9,
    orderStatus: "accepted",
    paymentStatus: "paid",
    deliveryTracking: {
      trackingToken: "track_br_1058",
      deliveryStatus: "driver_assigned",
      estimatedReadyAt: "2026-04-17T19:30:00.000Z",
      estimatedDeliveredAt: "2026-04-17T19:55:00.000Z",
      assignedDriverId: "driver_1",
      assignedDriverName: "Marco Bell",
      trackingEvents: [
        {
          id: "tracking_1058_1",
          type: "order_confirmed",
          label: "Order Confirmed",
          description: "The restaurant has received the delivery order.",
          createdAt: "2026-04-17T19:10:00.000Z"
        },
        {
          id: "tracking_1058_2",
          type: "preparing",
          label: "Preparing",
          description: "The kitchen has started preparing the order.",
          createdAt: "2026-04-17T19:16:00.000Z"
        },
        {
          id: "tracking_1058_3",
          type: "driver_assigned",
          label: "Driver Assigned",
          description: "Marco Bell has been assigned to this delivery.",
          createdAt: "2026-04-17T19:24:00.000Z"
        }
      ],
      lastUpdatedAt: "2026-04-17T19:24:00.000Z"
    },
    createdAt: "2026-04-17T19:10:00.000Z"
  },
  {
    id: "order_3",
    tenantId: "tenant_bella",
    orderNumber: "BR-1051",
    customerName: "Noah Carter",
    customerEmail: "noah@example.com",
    customerPhone: "+44 7700 900222",
    fulfillmentType: "collection",
    items: [
      {
        menuItemId: "item_margherita",
        name: "Margherita",
        quantity: 1,
        unitPrice: 11.5,
        selectedOptions: []
      }
    ],
    subtotal: 11.5,
    deliveryFee: 0,
    discount: 0,
    total: 11.5,
    orderStatus: "cancelled",
    paymentStatus: "failed",
    deliveryTracking: null,
    createdAt: "2026-04-15T18:20:00.000Z"
  },
  {
    id: "order_2",
    tenantId: "tenant_bella",
    orderNumber: "BR-1047",
    customerName: "Noah Carter",
    customerEmail: "noah@example.com",
    customerPhone: "+44 7700 900222",
    fulfillmentType: "delivery",
    address: "12 Baker Street, London",
    items: [
      {
        menuItemId: "item_lasagne",
        name: "Lasagne al Forno",
        quantity: 2,
        unitPrice: 13.9,
        selectedOptions: []
      }
    ],
    subtotal: 27.8,
    deliveryFee: 3.5,
    discount: 4,
    total: 27.3,
    orderStatus: "completed",
    paymentStatus: "paid",
    deliveryTracking: {
      trackingToken: "track_br_1047",
      deliveryStatus: "delivered",
      estimatedReadyAt: "2026-04-13T21:05:00.000Z",
      estimatedDeliveredAt: "2026-04-13T21:30:00.000Z",
      assignedDriverId: "driver_2",
      assignedDriverName: "Nina Cole",
      dispatchedAt: "2026-04-13T21:07:00.000Z",
      pickedUpAt: "2026-04-13T21:07:00.000Z",
      deliveredAt: "2026-04-13T21:31:00.000Z",
      trackingEvents: [
        {
          id: "tracking_1047_1",
          type: "order_confirmed",
          label: "Order Confirmed",
          description: "The restaurant has received the delivery order.",
          createdAt: "2026-04-13T20:45:00.000Z"
        },
        {
          id: "tracking_1047_2",
          type: "preparing",
          label: "Preparing",
          description: "The kitchen has started preparing the order.",
          createdAt: "2026-04-13T20:52:00.000Z"
        },
        {
          id: "tracking_1047_3",
          type: "ready_for_dispatch",
          label: "Ready For Dispatch",
          description: "The order is packed and ready to leave the restaurant.",
          createdAt: "2026-04-13T21:05:00.000Z"
        },
        {
          id: "tracking_1047_4",
          type: "driver_assigned",
          label: "Driver Assigned",
          description: "Nina Cole has been assigned to this delivery.",
          createdAt: "2026-04-13T21:06:00.000Z"
        },
        {
          id: "tracking_1047_5",
          type: "out_for_delivery",
          label: "Out For Delivery",
          description: "The order has left the restaurant.",
          createdAt: "2026-04-13T21:07:00.000Z"
        },
        {
          id: "tracking_1047_6",
          type: "delivered",
          label: "Delivered",
          description: "The order has been delivered.",
          createdAt: "2026-04-13T21:31:00.000Z"
        }
      ],
      lastKnownLocation: {
        lat: 51.523,
        lng: -0.158,
        capturedAt: "2026-04-13T21:20:00.000Z",
        accuracyMeters: 80
      },
      lastUpdatedAt: "2026-04-13T21:31:00.000Z"
    },
    createdAt: "2026-04-13T20:45:00.000Z"
  },
  {
    id: "order_1",
    tenantId: "tenant_bella",
    orderNumber: "BR-1042",
    customerName: "Noah Carter",
    customerEmail: "noah@example.com",
    customerPhone: "+44 7700 900222",
    fulfillmentType: "delivery",
    address: "12 Baker Street, London",
    items: [
      {
        menuItemId: "item_margherita",
        name: "Margherita",
        quantity: 2,
        unitPrice: 14.5,
        selectedOptions: [
          {
            optionGroupId: "grp_size",
            optionIds: ["opt_large"]
          }
        ]
      }
    ],
    subtotal: 29,
    deliveryFee: 3.5,
    discount: 0,
    total: 32.5,
    orderStatus: "refunded",
    paymentStatus: "refunded",
    deliveryTracking: {
      trackingToken: "track_br_1042",
      deliveryStatus: "delivery_failed",
      estimatedReadyAt: "2026-04-11T10:50:00.000Z",
      estimatedDeliveredAt: "2026-04-11T11:15:00.000Z",
      trackingEvents: [
        {
          id: "tracking_1042_1",
          type: "order_confirmed",
          label: "Order Confirmed",
          description: "The restaurant has received the delivery order.",
          createdAt: "2026-04-11T10:30:00.000Z"
        },
        {
          id: "tracking_1042_2",
          type: "delivery_failed",
          label: "Delivery Failed",
          description: "The delivery could not be completed.",
          createdAt: "2026-04-11T11:02:00.000Z"
        }
      ],
      lastUpdatedAt: "2026-04-11T11:02:00.000Z"
    },
    createdAt: "2026-04-11T10:30:00.000Z"
  }
];

const drivers: Driver[] = [
  {
    id: "driver_1",
    tenantId: "tenant_bella",
    name: "Marco Bell",
    phone: "+44 7700 900301",
    active: true,
    vehicleLabel: "Red scooter"
  },
  {
    id: "driver_2",
    tenantId: "tenant_bella",
    name: "Nina Cole",
    phone: "+44 7700 900302",
    active: true,
    vehicleLabel: "Black hatchback"
  },
  {
    id: "driver_3",
    tenantId: "tenant_bella",
    name: "Omar Shah",
    phone: "+44 7700 900303",
    active: false,
    vehicleLabel: "Silver bicycle"
  }
];

const roles: Role[] = [
  {
    id: "role_owner",
    tenantId: "tenant_bella",
    name: "Owner",
    permissions: [
      "menu.items.write",
      "orders.update_status",
      "settings.delivery.write",
      "staff.manage",
      "financials.manage"
    ]
  },
  {
    id: "role_manager",
    tenantId: "tenant_bella",
    name: "Manager",
    permissions: ["menu.items.write", "orders.update_status", "bookings.review"]
  }
];

const staff: StaffMember[] = [
  {
    id: "staff_1",
    tenantId: "tenant_bella",
    name: "Luca Romano",
    email: "luca@bellaroma.test",
    roleIds: ["role_owner"],
    orderEmailsEnabled: true
  },
  {
    id: "staff_2",
    tenantId: "tenant_bella",
    name: "Sara Dean",
    email: "sara@bellaroma.test",
    roleIds: ["role_manager"],
    orderEmailsEnabled: false
  }
];

export const platformMetrics: PlatformMetric[] = [
  { label: "Active tenants", value: "2" },
  { label: "Orders today", value: "148" },
  { label: "GMV today", value: "GBP 4,920" },
  { label: "Pending support issues", value: "3" }
];

export function getTenantBySlug(slug: string): Tenant | undefined {
  return tenants.find((tenant) => tenant.slug === slug || tenant.subdomain === slug);
}

export function getDefaultTenant(): Tenant {
  return tenants[0];
}

export function getDefaultTenantCopy(tenantId: string): Tenant {
  const tenant = tenants.find((entry) => entry.id === tenantId);

  if (!tenant) {
    throw new Error(`Unknown tenant: ${tenantId}`);
  }

  return JSON.parse(JSON.stringify(tenant)) as Tenant;
}

export function getDefaultStorefrontContent(tenantId: string): StorefrontContent {
  const content = storefrontContent[tenantId];

  if (!content) {
    throw new Error(`Unknown storefront content for tenant: ${tenantId}`);
  }

  return JSON.parse(JSON.stringify(content)) as StorefrontContent;
}

export function getTenantBundle(
  tenantId: string,
  contentOverride?: StorefrontContent,
  categoriesOverride?: Category[],
  menuItemsOverride?: MenuItem[],
  tenantOverride?: Tenant
): TenantBundle {
  const tenant = tenantOverride ?? tenants.find((entry) => entry.id === tenantId);

  if (!tenant) {
    throw new Error(`Unknown tenant: ${tenantId}`);
  }

  return {
    tenant,
    content: contentOverride ?? storefrontContent[tenantId],
    categories: categoriesOverride ?? categories.filter((entry) => entry.tenantId === tenantId),
    optionGroups: optionGroups.filter((entry) => entry.tenantId === tenantId),
    menuItems: menuItemsOverride ?? menuItems.filter((entry) => entry.tenantId === tenantId),
    promotions: promotions.filter((entry) => entry.tenantId === tenantId),
    reviews: reviews.filter((entry) => entry.tenantId === tenantId),
    bookings: bookings.filter((entry) => entry.tenantId === tenantId),
    orders: orders.filter((entry) => entry.tenantId === tenantId),
    drivers: drivers.filter((entry) => entry.tenantId === tenantId),
    roles: roles.filter((entry) => entry.tenantId === tenantId),
    staff: staff.filter((entry) => entry.tenantId === tenantId)
  };
}

export function listTenants(): Tenant[] {
  return tenants;
}

export function getDefaultCategories(tenantId: string): Category[] {
  return JSON.parse(
    JSON.stringify(categories.filter((entry) => entry.tenantId === tenantId))
  ) as Category[];
}

export function getDefaultMenuItems(tenantId: string): MenuItem[] {
  return JSON.parse(
    JSON.stringify(menuItems.filter((entry) => entry.tenantId === tenantId))
  ) as MenuItem[];
}

export function getDefaultRoles(tenantId: string): Role[] {
  return JSON.parse(
    JSON.stringify(roles.filter((entry) => entry.tenantId === tenantId))
  ) as Role[];
}

export function getDefaultStaff(tenantId: string): StaffMember[] {
  return JSON.parse(
    JSON.stringify(staff.filter((entry) => entry.tenantId === tenantId))
  ) as StaffMember[];
}

export function getDefaultDrivers(tenantId: string): Driver[] {
  return JSON.parse(
    JSON.stringify(drivers.filter((entry) => entry.tenantId === tenantId))
  ) as Driver[];
}
