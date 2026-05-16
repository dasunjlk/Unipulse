/** Stored WhatsApp numbers use Sri Lanka country prefix digits-only (no +): ^94\d{9}$ */

export const INVALID_PHONE_CODE = "invalid_phone";

export function normalizeLkWhatsapp(input: string): string {
  const d = input.replace(/\D/g, "");
  if (/^94\d{9}$/.test(d)) return d;
  if (/^0\d{9}$/.test(d)) return `94${d.slice(1)}`;
  if (/^\d{9}$/.test(d)) return `94${d}`;
  throw new Error(INVALID_PHONE_CODE);
}

/** 94771234567 -> 0771234567 for display in forms */
export function storedWhatsappToDisplay(stored: string | null | undefined): string {
  if (!stored || !/^94\d{9}$/.test(stored)) return "";
  return `0${stored.slice(2)}`;
}
