import { POLICY_NUMBERS, SUPPORT_HOURS } from "@/lib/store-policies";

export type FaqItem = { question: string; answer: string };

const { lagosDays, outsideLagosDays, returnWindowDays } = POLICY_NUMBERS;

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How long does delivery take?",
    answer: `Lagos: ${lagosDays} working days. Outside Lagos: ${outsideLagosDays} working days. You'll see the timeline for your address at checkout.`,
  },
  {
    question: "How much is delivery?",
    answer:
      "The fee depends on where your order is going. It's shown at checkout, before you pay. Store pickup is free.",
  },
  {
    question: "Are your products genuine?",
    answer:
      "Yes. We sell genuine products. Each product page shows the brand, the model and the warranty details.",
  },
  {
    question: "How can I pay?",
    answer:
      "Pay by card, bank or USSD through Paystack, or by bank transfer. For bank transfers, our account details appear after you place your order.",
  },
  {
    question: "Is my card information safe?",
    answer:
      "Yes. You enter your card details on Paystack's secure page. We never see or store your card number.",
  },
  {
    question: "I paid by bank transfer. What now?",
    answer:
      "Send your proof of payment on WhatsApp with your order number. We confirm your order once the transfer arrives.",
  },
  {
    question: "Can I pick up my order?",
    answer:
      "Yes. Choose Store Pickup at checkout, then pick a store. The store locator shows addresses, opening hours and directions.",
  },
  {
    question: "How do I track my order?",
    answer:
      "Use Track an order with your order number and the email you used at checkout.",
  },
  {
    question: "Can I cancel or change my order?",
    answer:
      "Contact us as soon as possible. We can cancel an order before it has been shipped. Once it's on its way, see the returns and refunds policy.",
  },
  {
    question: "What if my product is faulty?",
    answer: `Contact us within ${returnWindowDays} days of delivery with your order number and a photo or video of the problem. The returns and refunds policy has the details.`,
  },
  {
    question: "Do your products come with a warranty?",
    answer:
      "Most products carry a manufacturer warranty, and the period is shown on the product page. The warranty policy explains what's covered.",
  },
  {
    question: "Do I need an account to buy?",
    answer:
      "No. You can check out as a guest. An account lets you see your orders, save addresses and keep your wishlist.",
  },
  {
    question: "Do you sell in bulk?",
    answer:
      "Yes. Visit the bulk sales page, tell us what you need and how many, and we'll come back to you.",
  },
  {
    question: "When can I reach you?",
    answer: `Our team is available ${SUPPORT_HOURS}. Messages sent outside those hours are answered when we're back.`,
  },
];
