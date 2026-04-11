import Stripe from "stripe";

export interface PaymentIntentInput {
  tenantId: string;
  orderId: string;
  amount: number;
  currency: string;
}

export interface PaymentIntentResult {
  provider: string;
  clientSecret: string;
  externalId: string;
}

export interface PaymentProvider {
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  refundPayment(paymentId: string, amount?: number): Promise<{ refunded: boolean }>;
}

function getStripeClient() {
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return new Stripe(apiKey, {
    apiVersion: "2026-03-25.dahlia"
  });
}

export class StripePaymentProvider implements PaymentProvider {
  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const stripe = getStripeClient();

    if (stripe) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(input.amount),
        currency: input.currency,
        automatic_payment_methods: {
          enabled: true
        },
        metadata: {
          tenantId: input.tenantId,
          orderId: input.orderId
        }
      });

      return {
        provider: "stripe",
        clientSecret: paymentIntent.client_secret ?? "",
        externalId: paymentIntent.id
      };
    }

    return {
      provider: "stripe",
      clientSecret: `pi_mock_secret_${input.orderId}`,
      externalId: `pi_mock_${input.orderId}`
    };
  }

  async refundPayment(paymentId: string, amount?: number): Promise<{ refunded: boolean }> {
    const stripe = getStripeClient();

    if (stripe) {
      await stripe.refunds.create({
        payment_intent: paymentId,
        ...(amount ? { amount: Math.round(amount) } : {})
      });
    }

    return { refunded: true };
  }
}

export function getPaymentProvider(provider: "stripe" = "stripe") {
  if (provider === "stripe") {
    return new StripePaymentProvider();
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export async function verifyStripeWebhook(
  payload: string,
  signature: string | null
) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const stripe = getStripeClient();

  if (stripe && secret && signature) {
    return stripe.webhooks.constructEventAsync(payload, signature, secret);
  }

  return JSON.parse(payload) as {
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
}
