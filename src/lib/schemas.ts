// Zod schemas shared by forms and server actions.

import { z } from "zod";
import { CATEGORIES } from "./categories";
import { isValidISODate, isValidTimeZone } from "./dates";
import { DATE_FORMATS } from "./csv/dates";
import { MAX_CSV_ROWS } from "./csv/parse";

const cents = z.number().int().refine(Number.isSafeInteger, "Amount is too large");
const isoDate = z.string().refine(isValidISODate, "Invalid date");

export const transactionInput = z.object({
  occurredOn: isoDate,
  amountCents: cents.refine((v) => v !== 0, "Amount can't be zero"),
  description: z.string().trim().max(200),
  category: z.enum(CATEGORIES),
  isOneOff: z.boolean(),
});
export type TransactionInput = z.infer<typeof transactionInput>;

export const budgetInput = z.object({
  amountCents: cents.positive("Budget must be more than zero"),
});

export const profileInput = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code"),
  timezone: z.string().refine(isValidTimeZone, "Unknown timezone"),
});

export const onboardingInput = profileInput.extend(budgetInput.shape);

export const columnMapping = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  dateFormat: z.enum(DATE_FORMATS),
  amount: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("single"), column: z.string().min(1), negativeIsSpending: z.boolean() }),
    z.object({ kind: z.literal("split"), debit: z.string().min(1), credit: z.string().min(1) }),
  ]),
});

export const importInput = z.object({
  filename: z.string().trim().min(1).max(255),
  rowCount: z.number().int().min(0).max(MAX_CSV_ROWS),
  mapping: columnMapping,
  rows: z.array(transactionInput).max(MAX_CSV_ROWS),
});
export type ImportInput = z.infer<typeof importInput>;
