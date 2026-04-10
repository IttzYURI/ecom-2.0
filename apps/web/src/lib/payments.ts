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

export class StripePaymentProvider implements PaymentProvider {
  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    return {
      provider: "stripe",
      clientSecret: `pi_mock_secret_${input.orderId}`,
      externalId: `pi_mock_${input.orderId}`
    };
  }

  async refundPayment(): Promise<{ refunded: boolean }> {
    return { refunded: true };
  }
}

export function getPaymentProvider(provider: "stripe" = "stripe") {
  if (provider === "stripe") {
    return new StripePaymentProvider();
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
