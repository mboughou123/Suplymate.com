// Automated notices shown in a conversation with a supplier that has not
// claimed its profile.
//
// This module used to generate replies written in the supplier's own voice and
// insert them into the thread — the opening one attributed to `senderType:
// "supplier"`, so it rendered as a chat bubble from the named company. They
// promised things nobody had agreed to: a formal quotation "within 24 hours",
// samples shipping in "3-5 business days" with a refundable fee, a "typical lead
// time of 10-18 days", and, in reply to any question about quality, "we hold ISO
// 9001 certification and can provide compliance documentation (CE, test
// reports)". These are real companies compiled from public business records that
// do not know they are listed, so every one of those sentences was both a
// fabricated commercial commitment and an impersonation.
//
// What replaces them says who is speaking (Suplymate, not the supplier), states
// that the company has not registered, and makes no promise on its behalf. Both
// functions must be written from Suplymate's point of view and must be stored
// with `senderType: "system"` so the UI renders them as a notice rather than a
// message from the company.

/** Notice posted when a buyer opens a conversation with an unclaimed profile. */
export function firstContactNotice(supplierName: string): string {
  return (
    `${supplierName} has not registered with Suplymate, so nobody from the ` +
    `company is reading this thread yet. Write your request here and we will ` +
    `pass it on using the contact details on the profile. We cannot promise a ` +
    `reply. For anything urgent, contact the company directly.`
  );
}

/**
 * Notice posted after a buyer sends a message to an unclaimed profile. Tailored
 * to what the buyer asked for, but only to explain what happens next — it never
 * answers on the company's behalf.
 */
export function autoReplyNotice(supplierName: string, buyerMessage: string): string {
  const m = buyerMessage.toLowerCase();
  const tail =
    `Suplymate has not confirmed any of this with ${supplierName}, and the ` +
    `company has not agreed to any terms.`;

  if (/\b(price|quote|cost|pricing|rfq|quotation)\b/.test(m)) {
    return (
      `Your quote request is saved. We will forward it to ${supplierName} using ` +
      `the contact details on file. Prices, minimum order quantities and lead ` +
      `times have to come from the company itself. ${tail}`
    );
  }
  if (/\b(sample|samples)\b/.test(m)) {
    return (
      `Your sample request is saved and will be forwarded to ${supplierName}. ` +
      `Whether samples are available, what they cost and how long they take are ` +
      `for the company to answer. ${tail}`
    );
  }
  if (/\b(moq|minimum order|minimum quantity)\b/.test(m)) {
    return (
      `We do not hold a minimum order quantity for ${supplierName}. Your ` +
      `question is saved and will be forwarded. ${tail}`
    );
  }
  if (/\b(lead time|delivery|shipping|when)\b/.test(m)) {
    return (
      `We do not hold lead times or shipping terms for ${supplierName}. Your ` +
      `question is saved and will be forwarded. ${tail}`
    );
  }
  if (/\b(certificat|iso|ce|compliance|quality)\b/.test(m)) {
    return (
      `Suplymate holds no certification documents for ${supplierName}. Any ` +
      `certificate shown on the profile is a claim from the company's own ` +
      `website that we have not verified — ask for current certificates ` +
      `directly. Your question is saved and will be forwarded. ${tail}`
    );
  }
  return (
    `Your message is saved and will be forwarded to ${supplierName} using the ` +
    `contact details on file. ${tail}`
  );
}
