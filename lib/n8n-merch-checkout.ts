/**
 * Phase 3: outbound webhook when a student completes merch checkout.
 * Production: https://dasunjlk.app.n8n.cloud/webhook/merch-checkout
 */

export type MerchCheckoutWebhookPayload = {
  eventId: string;
  eventTitle: string;
  buyerName: string;
  buyerEmail: string;
  item: string;
  size: string;
  quantity: number;
  totalPrice: number;
  orderedAt: string;
};

const DEFAULT_URL = "https://dasunjlk.app.n8n.cloud/webhook/merch-checkout";

/**
 * Fire-and-forget POST. Never throws; logs success or failure for debugging.
 */
export function notifyMerchCheckout(payload: MerchCheckoutWebhookPayload): void {
  const url = process.env.N8N_MERCH_CHECKOUT_URL?.replace(/\/+$/, "") ?? DEFAULT_URL;
  const body = JSON.stringify(payload);

  void (async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15_000);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: ctrl.signal,
      });

      clearTimeout(t);

      const text = await res.text().catch(() => "");

      if (res.ok) {
        console.log(
          `[n8n] merch-checkout success: HTTP ${res.status} eventId=${payload.eventId} orderedAt=${payload.orderedAt}`,
        );
        if (text) console.log(`[n8n] merch-checkout response body: ${text.slice(0, 500)}`);
      } else {
        console.warn(
          `[n8n] merch-checkout failed: HTTP ${res.status} eventId=${payload.eventId} body=${text.slice(0, 300)}`,
        );
      }
    } catch (e) {
      console.warn(`[n8n] merch-checkout network error eventId=${payload.eventId}`, e);
    }
  })();
}
