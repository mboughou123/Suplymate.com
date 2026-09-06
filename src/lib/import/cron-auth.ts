// Bearer-token check for Vercel Cron invocations. Vercel sends
// `Authorization: Bearer ${CRON_SECRET}` automatically when the CRON_SECRET env
// var is set on the project. When it is NOT set we refuse everything rather than
// exposing an unauthenticated import trigger.

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isAuthorizedCron(request: Request, secret: string | undefined = process.env.CRON_SECRET): boolean {
  const expected = secret?.trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  return timingSafeEqual(m[1].trim(), expected);
}
