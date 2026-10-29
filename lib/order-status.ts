/** Plain-language status labels. Shared by the account page and order tracking. */
const STATUS_TEXT: Record<string, { label: string; detail: string }> = {
  pending_payment: {
    label: "Payment pending",
    detail: "We're waiting for your payment to be confirmed.",
  },
  awaiting_transfer: {
    label: "Awaiting bank transfer",
    detail: "Make your transfer, then send proof of payment on WhatsApp.",
  },
  paid: {
    label: "Paid",
    detail: "Payment received. We're preparing your order.",
  },
  processing: {
    label: "Being prepared",
    detail: "Your order is being packed.",
  },
  shipped: {
    label: "On its way",
    detail: "Your order has left us, or it's ready for you to collect.",
  },
  delivered: {
    label: "Delivered",
    detail: "Your order has been delivered.",
  },
  cancelled: {
    label: "Cancelled",
    detail: "This order was cancelled. Message us on WhatsApp if you have questions.",
  },
  refunded: {
    label: "Refunded",
    detail: "This order was refunded.",
  },
};

export function statusInfo(status: string): { label: string; detail: string } {
  return STATUS_TEXT[status] ?? { label: status, detail: "" };
}
