import crypto from "crypto";

/** Verify HMAC-SHA256 for inbound n8n callbacks (`X-N8N-Signature`). */
export function verifyN8nSignature(
  rawBody: Buffer | string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;

  const body =
    typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");

  const provided = signatureHeader.trim().toLowerCase().replace(/^sha256=/, "");

  try {
    const a = Buffer.from(provided, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
