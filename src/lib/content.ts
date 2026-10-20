// Marketing copy shared by several pages.

export const HERO_IMAGE = "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=2000&q=75";
export const AUTH_IMAGE = "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1400&q=75";

export const FAQS = [
  {
    q: "What is a distressed off-plan unit?",
    a: "An off-plan property whose original buyer wants to exit before handover — usually because the payment plan no longer fits. You pay the seller for the equity they've already paid in and take over the remaining developer instalments.",
  },
  {
    q: "How is the asking price calculated?",
    a: "The asking price is what you pay the seller now, for the amount they've already paid the developer. Many sellers accept less than they paid to exit quickly. The remaining balance keeps going to the developer on the original plan.",
  },
  {
    q: "Who handles the developer NOC and DLD transfer?",
    a: "We do. Our transactions team requests the developer NOC, prepares the assignment, books the DLD trustee appointment and updates the Oqood into your name.",
  },
  {
    q: "What does it cost?",
    a: "A flat 2% of the sale value + 5% VAT, paid by the buyer only when the transfer completes. Listing is free for sellers. DLD and developer fees are charged by those authorities and shown as estimates on every deal.",
  },
  {
    q: "How is my money protected?",
    a: "Nothing is paid to the seller until the developer has issued the NOC. Payment is made by manager's cheque at the DLD trustee office at the moment ownership moves to you, and your future instalments continue into the project's RERA escrow account.",
  },
  {
    q: "Can every off-plan unit be resold?",
    a: "Most developers only allow a resale once a minimum share of the price has been paid — often 30–40%. We check the developer's policy for each unit, and deals marked “NOC eligible” already meet it.",
  },
  {
    q: "Can I get a mortgage?",
    a: "Some developers allow financing of the remaining balance close to handover. Tell us when you make an offer and we'll introduce you to partner banks for pre-approval.",
  },
];

export const SELLER_STEPS = [
  { icon: "upload", t: "Verify", d: "Upload your SPA, Oqood and statement of account. We confirm them with the developer." },
  { icon: "badge", t: "List", d: "Your unit goes live with a verified badge in front of buyers searching for off-plan deals." },
  { icon: "handshake", t: "Match", d: "Receive offers, counter or accept. We qualify buyers and negotiate for you." },
  { icon: "key", t: "Transfer", d: "We handle the developer NOC, assignment and DLD transfer. You're paid at the trustee office." },
] as const;

export const BUYER_STEPS = [
  { icon: "search", t: "Discover", d: "Filter by community, upfront cash, % paid and handover date." },
  { icon: "file", t: "Review", d: "Every listing shows the payment plan and a true-cost breakdown against launch price." },
  { icon: "sign", t: "Offer", d: "Make an offer in two minutes. We negotiate with the seller on your behalf." },
  { icon: "key", t: "Take over", d: "Step into the remaining payment plan with your name on the Oqood." },
] as const;
