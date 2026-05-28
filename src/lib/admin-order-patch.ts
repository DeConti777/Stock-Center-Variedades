import { z } from "zod";
import { SHIPPING_DISPATCH_MODES } from "@/lib/shipping-dispatch";

/** Campos opcionais de URL no admin — aceita vazio; nao bloqueia salvar por URL incompleta. */
const optionalAdminUrl = z
  .string()
  .max(2000)
  .optional()
  .nullable()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const adminOrderPatchSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(2),
  shippingCode: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((value) => {
      const trimmed = (value ?? "").trim();
      return trimmed.length > 0 ? trimmed : null;
    }),
  shippingCarrier: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((value) => {
      const trimmed = (value ?? "").trim();
      return trimmed.length > 0 ? trimmed : null;
    }),
  shippingDispatchMode: z.enum(SHIPPING_DISPATCH_MODES).optional(),
  trackingUrl: optionalAdminUrl,
  invoiceUrl: optionalAdminUrl,
});

export type AdminOrderPatchInput = z.infer<typeof adminOrderPatchSchema>;

export function formatAdminOrderPatchError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) {
    return "Dados invalidos para atualizar pedido.";
  }
  return `Dados invalidos: ${first.path.join(".") || "pedido"} — ${first.message}`;
}
