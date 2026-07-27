"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  hoursInputToMinutes,
  minutesToHoursInput,
} from "@/features/time/lib/time-entry";
import { cn } from "@/lib/utils";

export function centsToDraft(cents: number | null): string {
  if (cents === null || Number.isNaN(cents)) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function draftToCents(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

function parseQuantity(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

export function MoneyField({
  cents,
  disabled,
  className,
  onCommit,
}: {
  cents: number | null;
  disabled?: boolean;
  className?: string;
  onCommit: (cents: number | null) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(centsToDraft(cents));

  useEffect(() => {
    if (!focused) setDraft(centsToDraft(cents));
  }, [cents, focused]);

  return (
    <Input
      inputMode="decimal"
      disabled={disabled}
      value={focused ? draft : centsToDraft(cents)}
      className={cn(
        "h-8 border-border/70 bg-background font-mono text-right tabular-nums",
        className,
      )}
      onFocus={() => {
        setFocused(true);
        setDraft(centsToDraft(cents));
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        onCommit(draftToCents(draft));
      }}
    />
  );
}

export function QuantityField({
  value,
  disabled,
  onCommit,
}: {
  value: number | null;
  disabled?: boolean;
  onCommit: (value: number | null) => void;
}) {
  const display =
    value === null || value === undefined ? "" : String(value).replace(".", ",");
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(display);

  useEffect(() => {
    if (!focused) setDraft(display);
  }, [display, focused]);

  return (
    <Input
      inputMode="decimal"
      disabled={disabled}
      value={focused ? draft : display}
      className="h-8 w-full border-border/70 bg-background font-mono text-right tabular-nums"
      onFocus={() => {
        setFocused(true);
        setDraft(display);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        onCommit(parseQuantity(draft));
      }}
    />
  );
}

export function HoursField({
  minutes,
  disabled,
  onCommit,
}: {
  minutes: number | null;
  disabled?: boolean;
  onCommit: (minutes: number | null) => void;
}) {
  const display = minutesToHoursInput(minutes).replace(".", ",");
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(display);

  useEffect(() => {
    if (!focused) setDraft(display);
  }, [display, focused]);

  return (
    <Input
      inputMode="decimal"
      disabled={disabled}
      value={focused ? draft : display}
      className="h-8 w-full border-border/70 bg-background font-mono text-right tabular-nums"
      onFocus={() => {
        setFocused(true);
        setDraft(display);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        onCommit(hoursInputToMinutes(draft.replace(",", ".")));
      }}
    />
  );
}

export function VatRateField({
  bps,
  disabled,
  onCommit,
}: {
  bps: number;
  disabled?: boolean;
  onCommit: (bps: number) => void;
}) {
  const display = (bps / 100).toFixed(2).replace(".", ",");
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(display);

  useEffect(() => {
    if (!focused) setDraft(display);
  }, [display, focused]);

  return (
    <Input
      inputMode="decimal"
      disabled={disabled}
      value={focused ? draft : display}
      className="h-8 w-full border-border/70 bg-background font-mono text-right tabular-nums"
      onFocus={() => {
        setFocused(true);
        setDraft(display);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const n = Number(draft.replace(",", "."));
        onCommit(Number.isNaN(n) ? 2100 : Math.round(n * 100));
      }}
    />
  );
}
