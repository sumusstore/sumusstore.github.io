import { SITE } from "@/lib/site-config";
import { POLICY_NUMBERS } from "@/lib/store-policies";

export type PolicySection = {
  heading: string;
  paragraphs: string[];
  items?: string[];
};

export type PolicyDocument = {
  title: string;
  intro: string;
  sections: PolicySection[];
};

type PolicyKey = "shipping" | "returns" | "warranty" | "privacy" | "terms";

// DRAFT WORDING. Read every page before launch and change anything that doesn't match how you operate.
const { lagosDays, outsideLagosDays, returnWindowDays, pickupHoldDays } = POLICY_NUMBERS;

export const POLICIES: Record<PolicyKey, PolicyDocument> = {
  shipping: {
    title: "Shipping and delivery",
    intro: "How we deliver your order, how long it takes, and what to expect.",
    sections: [
      {
        heading: "Where we deliver",
        paragraphs: [
          `We deliver across Nigeria. Orders to Lagos state arrive in ${lagosDays} working days. Orders to other states arrive in ${outsideLagosDays} working days.`,
          "The delivery fee for your address is shown at checkout, before you pay.",
        ],
      },
      {
        heading: "Store pickup",
        paragraphs: [
          "You can collect your order from any of our stores. Choose Store Pickup at checkout, then pick the store that suits you. Pickup is free.",
          `We'll message you when your order is ready. Please collect it within ${pickupHoldDays} days, bringing your order number and a valid means of identification.`,
        ],
      },
      {
        heading: "When the timeline starts",
        paragraphs: [
          "Delivery times start once we've confirmed your payment. For card payments, that's when Paystack confirms the payment. For bank transfers, it's when the transfer reaches our account.",
          "Working days are Monday to Friday, excluding public holidays.",
        ],
      },
      {
        heading: "Delays",
        paragraphs: [
          "Public holidays, severe weather, and other events outside our control can delay deliveries. If your order is held up, we'll contact you using the phone number or email you gave us.",
        ],
      },
      {
        heading: "Your address and missed deliveries",
        paragraphs: [
          "Please check your address and phone number before you pay. If the driver can't reach you or can't find the address, we'll contact you to arrange another attempt.",
        ],
      },
      {
        heading: "Tracking your order",
        paragraphs: [
          "Use Track an order with your order number and the email you used at checkout to see where your order is.",
        ],
      },
    ],
  },

  returns: {
    title: "Returns and refunds",
    intro: "What to do if something is wrong with your order, and how refunds work.",
    sections: [
      {
        heading: "Faulty, damaged or wrong items",
        paragraphs: [
          `If an item arrives faulty, damaged or not as ordered, contact us within ${returnWindowDays} days of delivery. Include your order number and a photo or short video of the problem.`,
          "We'll arrange a replacement or a return at no cost to you, and we'll confirm the next steps by phone, WhatsApp or email.",
        ],
      },
      {
        heading: "Changing your mind, and items we can't take back",
        paragraphs: [
          "We don't accept returns for a change of mind on items that have been opened, used or set up.",
          `Unopened items in their original packaging may be considered if you contact us within ${returnWindowDays} days of delivery. We'll confirm whether we can accept the return before you send anything back.`,
          "We can't accept items that are damaged through misuse, or that are missing their original box, accessories or seals, unless the item is faulty. Please check your order when it arrives and tell us straight away if something is wrong.",
        ],
      },
      {
        heading: "Cancelling an order",
        paragraphs: [
          "You can cancel an order by contacting us before it has been shipped. Once an order has left us, follow the return process above.",
        ],
      },
      {
        heading: "How refunds work",
        paragraphs: [
          "We refund once the returned item has been checked. Card payments go back to the original card. Bank transfer refunds go to the bank account you give us.",
          "Delivery fees are refunded when the fault or mistake was ours. Refunds can take several working days to show in your account, depending on your bank.",
        ],
      },
    ],
  },

  warranty: {
    title: "Warranty",
    intro: "The warranty that comes with your purchase, and how we help you use it.",
    sections: [
      {
        heading: "Manufacturer warranty",
        paragraphs: [
          "Most products come with a manufacturer warranty. The warranty period is shown on the product page. Where the manufacturer's warranty applies, claims are handled through the manufacturer's service network, and we help you through the process.",
        ],
      },
      {
        heading: "What we do",
        paragraphs: [
          "We check your product, help you make a warranty claim, and follow up until the issue is resolved. Reach us on WhatsApp, by phone or by email, and include your order number.",
        ],
      },
      {
        heading: "What the warranty doesn't cover",
        paragraphs: ["The warranty doesn't cover:"],
        items: [
          "Physical damage, such as cracked screens or dents",
          "Water or liquid damage",
          "Damage from power surges, lightning, or the wrong power supply",
          "Repairs or changes made by anyone not authorised by the manufacturer",
          "Normal wear over time, such as a battery losing capacity",
          "Use for purposes the product isn't designed for",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Nothing in this policy limits your rights under Nigerian consumer law.",
        ],
      },
    ],
  },

  privacy: {
    title: "Privacy policy",
    intro: "How Sumus collects, uses and protects your personal information, in line with the Nigeria Data Protection Act 2023.",
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          `${SITE.name} operates this website. You can contact us at ${SITE.email}, or write to ${SITE.address}.`,
        ],
      },
      {
        heading: "What we collect",
        paragraphs: ["We collect:"],
        items: [
          "The details you give us to place an order: name, email, phone number, delivery address and what you bought",
          "Account details, if you create an account: email, name, phone number, and a password that is stored in a form we can't read",
          "Payment references from Paystack. We don't receive or store your card number",
          "Messages you send through our contact form, bulk sales form or WhatsApp",
          "Your email address, if you sign up for our newsletter",
          "Information stored on your device: your cart, your wishlist, and your login session if you sign in",
        ],
      },
      {
        heading: "How we use it",
        paragraphs: ["We use your information to:"],
        items: [
          "Process and deliver your orders, and confirm your payments",
          "Send order updates by email, SMS or WhatsApp",
          "Answer your enquiries",
          "Send our newsletter, if you've signed up. You can unsubscribe at any time",
          "Keep the records the law requires, and prevent fraud",
          "Run and improve the website",
        ],
      },
      {
        heading: "Who we share it with",
        paragraphs: [
          "We share only what's needed with the businesses that help us run the store: our payment provider Paystack, our database and hosting providers, our delivery partners (who receive your name, address and phone number), and our email and messaging providers.",
          "We don't sell your information.",
        ],
      },
      {
        heading: "Maps",
        paragraphs: [
          "The store locator shows a Google Map. Google may set cookies and process data when the map loads. Google's privacy policy explains how.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "We keep order records for as long as needed for accounting and legal obligations. We keep account details until you ask us to delete them, unless the law requires us to keep them longer.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          `Under the Nigeria Data Protection Act 2023, you can ask for a copy of your information, ask us to correct or delete it, withdraw consent for newsletters, and object to some uses. To do any of this, email ${SITE.email}. You can also complain to the Nigeria Data Protection Commission.`,
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "We use secure connections (HTTPS), limit access to customer information to authorised staff, and use providers that have their own security controls. No system is completely secure, so please keep your password private.",
        ],
      },
      {
        heading: "Children",
        paragraphs: ["Our services aren't aimed at children under 18."],
      },
      {
        heading: "Changes to this policy",
        paragraphs: [
          "We may update this policy. The date at the top of the page shows when it last changed.",
        ],
      },
    ],
  },

  terms: {
    title: "Terms and conditions",
    intro: "The rules for using this website and buying from Sumus.",
    sections: [
      {
        heading: "About us",
        paragraphs: [
          `This website is operated by ${SITE.name} at ${SITE.address}. By using the site or placing an order, you agree to these terms.`,
        ],
      },
      {
        heading: "Prices and products",
        paragraphs: [
          "Prices are shown in Nigerian naira (₦). We try to keep product descriptions and photos accurate, but colours can look slightly different on screen.",
          "If we make a pricing or product error, we may cancel the order and tell you straight away. If you've already paid, we'll refund you in full.",
        ],
      },
      {
        heading: "Placing an order",
        paragraphs: [
          "Your order is accepted once we confirm your payment, or receive your bank transfer, and send you an order number.",
          "We may refuse or cancel an order if an item is out of stock, the price is wrong, or we suspect fraud. If we cancel after you've paid, we refund you in full.",
        ],
      },
      {
        heading: "Payment",
        paragraphs: [
          "We accept card, bank and USSD payments through Paystack, and bank transfers. Bank transfer orders are confirmed once the funds reach our account.",
        ],
      },
      {
        heading: "Delivery, warranty, returns and refunds",
        paragraphs: [
          "Delivery times and fees are set out in our shipping and delivery policy. Warranty, returns and refunds are covered in the warranty and returns policies.",
        ],
      },
      {
        heading: "Your account",
        paragraphs: [
          "Keep your login details secure. Tell us straight away if you think someone else has used your account. You're responsible for activity under your account.",
        ],
      },
      {
        heading: "Reviews and content",
        paragraphs: [
          "Reviews are checked before they appear on the site. Don't post anything that is unlawful, abusive or misleading.",
        ],
      },
      {
        heading: "Our responsibility",
        paragraphs: [
          "We are responsible for the products we sell in line with Nigerian consumer law. To the extent the law allows, we're not liable for indirect losses, such as lost profit.",
          "Nothing in these terms limits any right you have under Nigerian consumer law.",
        ],
      },
      {
        heading: "Changes to these terms",
        paragraphs: [
          "We may update these terms. Changes apply from the date they are posted on this page.",
        ],
      },
      {
        heading: "Governing law",
        paragraphs: ["These terms are governed by the laws of the Federal Republic of Nigeria."],
      },
      {
        heading: "Contact us",
        paragraphs: [
          `Questions? Email ${SITE.email} or call ${SITE.phoneDisplay}.`,
        ],
      },
    ],
  },
};
