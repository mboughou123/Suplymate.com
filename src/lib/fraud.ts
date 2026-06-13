// Lightweight heuristic "AI" fraud/scam detection for messages.
// Flags common B2B sourcing red flags so the UI can warn the buyer.

type RiskRule = {
  re: RegExp;
  flag: string;
  label: string;
};

const RULES: RiskRule[] = [
  {
    re: /\b(western union|moneygram|wire transfer|bitcoin|btc|crypto|usdt|gift card)\b/i,
    flag: "off_platform_payment",
    label: "Requests an untraceable / off-platform payment method.",
  },
  {
    re: /\b(whatsapp|telegram|wechat|skype)\b/i,
    flag: "off_platform_contact",
    label: "Tries to move the conversation off Suplymate.",
  },
  {
    re: /\bpay (me )?(directly|in advance)|personal (bank|account|email)|advance payment only\b/i,
    flag: "advance_payment",
    label: "Pressures for direct or advance payment outside escrow.",
  },
  {
    re: /\b(100% guarantee|guaranteed (profit|returns)|too good to be true|double your)\b/i,
    flag: "unrealistic_promise",
    label: "Makes unrealistic guarantees.",
  },
  {
    re: /\b(ssn|social security|bank login|password|otp|verification code)\b/i,
    flag: "sensitive_request",
    label: "Asks for sensitive credentials.",
  },
];

export type RiskResult = { flag: string; label: string } | null;

export function detectRisk(text: string): RiskResult {
  for (const rule of RULES) {
    if (rule.re.test(text)) return { flag: rule.flag, label: rule.label };
  }
  return null;
}
