import { z } from "zod";

export const MERCH_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type MerchSize = (typeof MERCH_SIZES)[number];

export const MERCH_ITEM_TYPES = [
  "tshirt",
  "hoodie",
  "cap",
  "jersey",
  "mug",
  "sticker",
  "poster",
  "tote",
  "badge",
  "other",
] as const;
export type MerchItemType = (typeof MERCH_ITEM_TYPES)[number];

export const WEARABLE_TYPES = new Set<MerchItemType>(["tshirt", "hoodie", "cap", "jersey"]);

export function isWearable(t: string): t is MerchItemType {
  return WEARABLE_TYPES.has(t as MerchItemType);
}

export type MerchItem = {
  id: string;
  name: string;
  price: number;
  item_type: MerchItemType;
  sizes: MerchSize[];
  /** Public URL from `merch-assets` bucket (optional). */
  image_url: string | null;
};

const merchSizeEnum = z.enum(MERCH_SIZES);
const merchItemTypeEnum = z.enum(MERCH_ITEM_TYPES);

const imageUrlField = z.union([z.string().url(), z.null()]).optional();

/** Full row as stored on events.merch_items (with id). */
export const merchItemSchema = z
  .object({
    id: z.string().min(1, "id required"),
    name: z.string().trim().min(1, "name required").max(200),
    price: z.number().finite().nonnegative(),
    item_type: merchItemTypeEnum,
    sizes: z.array(merchSizeEnum),
    image_url: z.union([z.string().url(), z.null()]).optional().default(null),
  })
  .superRefine((val, ctx) => {
    if (!isWearable(val.item_type) && val.sizes.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "sizes are only allowed for wearable items",
        path: ["sizes"],
      });
    }
  });

const merchItemInputBase = z.object({
  name: z.string().trim().min(1, "name required").max(200),
  price: z.coerce.number().finite().nonnegative(),
  item_type: merchItemTypeEnum,
  sizes: z.array(merchSizeEnum).default([]),
  image_url: imageUrlField,
});

/** PATCH body: any subset of fields (Zod 4: cannot use .partial() on schemas with superRefine). */
export const merchItemInputPatchSchema = merchItemInputBase.partial();

/** Organizer create payload (no id on create). */
export const merchItemInputSchema = merchItemInputBase.superRefine((val, ctx) => {
  if (!isWearable(val.item_type) && val.sizes.length > 0) {
    ctx.addIssue({
      code: "custom",
      message: "sizes are only allowed for wearable items",
      path: ["sizes"],
    });
  }
});

export type MerchItemInput = z.infer<typeof merchItemInputSchema>;

/** Parse JSON from DB / API: tolerate legacy rows, normalize. */
export function parseMerchItems(raw: unknown): MerchItem[] {
  if (!Array.isArray(raw)) return [];
  const out: MerchItem[] = [];

  for (const x of raw) {
    if (typeof x !== "object" || x === null) continue;
    const o = x as Record<string, unknown>;
    const id = String(o.id ?? "");
    if (!id.trim()) continue;

    const name = String(o.name ?? "Item").trim() || "Item";
    const priceRaw = o.price;
    const price =
      typeof priceRaw === "number" && Number.isFinite(priceRaw)
        ? Math.max(0, priceRaw)
        : Math.max(0, Number(priceRaw ?? 0) || 0);

    const typeRaw = o.item_type;
    const item_type: MerchItemType = MERCH_ITEM_TYPES.includes(typeRaw as MerchItemType)
      ? (typeRaw as MerchItemType)
      : "other";

    let sizes: string[] = [];
    if (Array.isArray(o.sizes)) {
      sizes = o.sizes
        .map((s) => String(s))
        .filter((s): s is MerchSize => (MERCH_SIZES as readonly string[]).includes(s));
    }
    if (!isWearable(item_type)) sizes = [];

    let image_url: string | null = null;
    const imgRaw = o.image_url;
    if (typeof imgRaw === "string" && imgRaw.trim()) {
      const checked = z.string().url().safeParse(imgRaw.trim());
      image_url = checked.success ? checked.data : null;
    }

    out.push({
      id,
      name,
      price,
      item_type,
      sizes: Array.from(new Set(sizes)) as MerchSize[],
      image_url,
    });
  }

  return out;
}

export function merchTypeLabel(type: MerchItemType): string {
  const labels: Record<MerchItemType, string> = {
    tshirt: "T-shirt",
    hoodie: "Hoodie",
    cap: "Cap",
    jersey: "Jersey",
    mug: "Mug",
    sticker: "Sticker",
    poster: "Poster",
    tote: "Tote bag",
    badge: "Badge",
    other: "Other",
  };
  return labels[type] ?? type;
}

export function merchItemsToJson(items: MerchItem[]): MerchItem[] {
  return items.map((m) => merchItemSchema.parse(m));
}
