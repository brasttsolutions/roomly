import { z } from "zod";

const postgresUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export const createBookingSchema = z
  .object({
    roomId: postgresUuid,
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    paymentMethod: z.enum(["pix", "card"]),
    cardToken: z.string().min(20).max(300).optional(),
    paymentMethodId: z.string().min(1).max(100).optional(),
    issuerId: z.string().min(1).max(100).optional(),
    installments: z.number().int().min(1).max(12).optional(),
    idempotencyKey: z.string().min(16).max(120),
  })
  .superRefine((value, context) => {
    const start = new Date(value.startAt);
    const end = new Date(value.endAt);
    if (start >= end)
      context.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "O horário final deve ser posterior ao inicial.",
      });
    if (start <= new Date())
      context.addIssue({
        code: "custom",
        path: ["startAt"],
        message: "A reserva deve começar no futuro.",
      });
    if ((end.getTime() - start.getTime()) / 60_000 > 240)
      context.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "A reserva não pode ultrapassar 4 horas.",
      });
  });

export const paymentWebhookSchema = z.object({
  id: z.string().min(1),
  type: z.literal("payment.updated"),
  data: z.object({
    id: z.string().min(1),
    status: z.enum(["approved", "rejected", "cancelled", "refunded"]),
    bookingId: z.string().min(1),
    amountCents: z.number().int().positive(),
  }),
});

export const mercadoPagoNotificationSchema = z.object({
  id: z.union([z.string(), z.number()]),
  type: z.string().min(1),
  action: z.string().min(1),
  data: z.object({ id: z.union([z.string(), z.number()]) }),
});
