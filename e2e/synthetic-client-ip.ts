/**
 * The auth endpoints rate-limit by client IP (getClientIp reads the first
 * x-forwarded-for entry). Repeated local runs from ::1 accumulate against one
 * key and eventually 429 ("Too many registration attempts"), making the suite
 * flaky. Each spec file that exercises auth flows identifies as a fresh
 * synthetic client instead:
 *
 *   test.use({ extraHTTPHeaders: { 'x-forwarded-for': syntheticClientIp() } });
 */
export function syntheticClientIp(): string {
  const octet = () => 1 + Math.floor(Math.random() * 254);
  return `10.${octet()}.${octet()}.${octet()}`;
}
