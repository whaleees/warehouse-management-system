/**
 * Augments purchase-order items with derived `received` / `remaining`
 * quantities computed from their goods-receipt lines. Pure, synchronous,
 * shared by the PO read endpoints and the inbound detail endpoint so the
 * projection lives in exactly one place.
 */
export function withReceivedRemaining<
  T extends { quantity: number; receiptLines: { quantity: number }[] },
>(items: T[]) {
  return items.map((item) => {
    const received = item.receiptLines.reduce((sum, ln) => sum + ln.quantity, 0);
    return {
      ...item,
      received,
      remaining: Math.max(item.quantity - received, 0),
    };
  });
}
