"use client";

import { useId, useState, useTransition } from "react";
import { deleteTransaction, saveTransaction } from "@/app/(app)/transactions/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CATEGORIES, DEFAULT_CATEGORY, type Category } from "@/lib/categories";
import type { ISODate } from "@/lib/dates";
import { merchantKey } from "@/lib/merchant";
import { centsToDecimalString, parseCents } from "@/lib/money";
import type { TransactionInput } from "@/lib/schemas";
import { suggestCategory, type Transaction } from "@/lib/transactions";

export function TransactionForm({
  transaction,
  today,
  remembered,
  onDone,
  onSubmit,
}: {
  transaction?: Transaction;
  today: ISODate;
  remembered: Record<string, Category>;
  onDone: () => void;
  /** Takes over saving a new transaction, e.g. to update the page optimistically. */
  onSubmit?: (input: TransactionInput) => void;
}) {
  const id = useId();
  const [amount, setAmount] = useState(transaction ? centsToDecimalString(transaction.amountCents) : "");
  const [occurredOn, setOccurredOn] = useState(transaction?.occurredOn ?? today);
  const [description, setDescription] = useState(transaction?.description ?? "");
  // Follow the remembered category for the merchant until the user picks one.
  const [pickedCategory, setPickedCategory] = useState<Category | null>(transaction?.category ?? null);
  const [isOneOff, setIsOneOff] = useState(transaction?.isOneOff ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const category =
    pickedCategory ?? suggestCategory(merchantKey(description), remembered) ?? DEFAULT_CATEGORY;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const amountCents = parseCents(amount);
    if (amountCents === null || amountCents === 0) {
      setError("Enter an amount, like 12.50. Use a minus sign for refunds.");
      return;
    }
    const input: TransactionInput = { occurredOn, amountCents, description, category, isOneOff };
    if (onSubmit && !transaction) {
      onSubmit(input);
      return;
    }
    startTransition(async () => {
      const result = await saveTransaction(transaction?.id ?? null, input);
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  function remove() {
    if (!transaction || !confirm("Delete this transaction?")) return;
    startTransition(async () => {
      const result = await deleteTransaction(transaction.id);
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-amount`}>Amount</Label>
        <Input
          id={`${id}-amount`}
          inputMode="decimal"
          data-autofocus={!transaction || undefined}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          aria-describedby={`${id}-amount-help`}
        />
        <p id={`${id}-amount-help`} className="text-xs text-muted-foreground">
          Use a minus sign for refunds, like -12.50.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-description`}>Merchant or note</Label>
        <Input
          id={`${id}-description`}
          value={description}
          maxLength={200}
          onChange={(e) => setDescription(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-date`}>Date</Label>
          <Input
            id={`${id}-date`}
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-category`}>Category</Label>
          <Select
            id={`${id}-category`}
            value={category}
            onChange={(e) => setPickedCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id={`${id}-oneoff`}
          checked={isOneOff}
          onChange={(e) => setIsOneOff(e.target.checked)}
          aria-describedby={`${id}-oneoff-help`}
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-oneoff`}>One-off</Label>
          <p id={`${id}-oneoff-help`} className="text-xs text-muted-foreground">
            A big planned purchase like rent or a flight. It counts toward your budget but
            won&apos;t break your streak.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {transaction && (
          <Button type="button" variant="outline" onClick={remove} disabled={pending}>
            Delete
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "Saving…" : transaction ? "Save changes" : "Add"}
        </Button>
      </div>
    </form>
  );
}
