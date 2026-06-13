// Generates believable supplier auto-replies (demo behavior until suppliers
// have real accounts). If OPENAI_API_KEY is set elsewhere this can be swapped
// for a model call; for now it's deterministic + context-aware.

export function firstContactReply(supplierName: string): string {
  return (
    `Hello, and thank you for contacting ${supplierName}. ` +
    `We've received your inquiry and a sales representative will respond shortly. ` +
    `To speed things up, please share: product, quantity, destination, and target lead time.`
  );
}

export function autoReply(supplierName: string, buyerMessage: string): string {
  const m = buyerMessage.toLowerCase();

  if (/\b(price|quote|cost|pricing|rfq|quotation)\b/.test(m)) {
    return (
      `Thanks for the details. We can prepare a formal quotation within 24 hours. ` +
      `Could you confirm the quantity and delivery destination so we can include freight and lead time? ` +
      `We also offer volume discounts above MOQ.`
    );
  }
  if (/\b(sample|samples)\b/.test(m)) {
    return (
      `We'd be glad to send samples. Samples typically ship in 3–5 business days; ` +
      `sample cost is refundable against your first bulk order. Please share your shipping address and preferred courier.`
    );
  }
  if (/\b(moq|minimum order|minimum quantity)\b/.test(m)) {
    return (
      `Our standard MOQ is flexible depending on specification. ` +
      `Tell us your target volume and we'll confirm pricing tiers and the best MOQ for your needs.`
    );
  }
  if (/\b(lead time|delivery|shipping|when)\b/.test(m)) {
    return (
      `Typical lead time is 10–18 days after order confirmation, depending on quantity and customization. ` +
      `Express options are available. Where should we quote delivery to?`
    );
  }
  if (/\b(certificat|iso|ce|compliance|quality)\b/.test(m)) {
    return (
      `Yes — we hold ISO 9001 certification and can provide compliance documentation (CE, test reports) on request. ` +
      `Would you like these attached to the quotation?`
    );
  }
  return (
    `Thank you for your message. Our team will review the details and follow up with a tailored proposal. ` +
    `Is there a specific quantity, specification, or deadline we should prioritize?`
  );
}
