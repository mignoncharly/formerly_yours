import "server-only";

// §10.2 — provider abstraction so we don't couple the product to DHL/Colissimo.
// A real provider (createLabel/track/cancelLabel/getStatus) plugs in later; the
// mock lets the flow work end-to-end in the test environment.
export interface ShippingLabel {
  trackingNumber: string;
  labelUrl: string | null;
}

export interface ShippingProvider {
  createLabel(orderId: string): Promise<ShippingLabel>;
  getStatus(trackingNumber: string): Promise<string>;
  cancelLabel(trackingNumber: string): Promise<void>;
}

class MockShippingProvider implements ShippingProvider {
  async createLabel(orderId: string): Promise<ShippingLabel> {
    return { trackingNumber: `MOCK-${orderId.slice(0, 8).toUpperCase()}`, labelUrl: null };
  }
  async getStatus(): Promise<string> {
    return "in_transit";
  }
  async cancelLabel(): Promise<void> {}
}

export function shippingProvider(): ShippingProvider {
  // Swap here when a real carrier is integrated (env-selected).
  return new MockShippingProvider();
}
