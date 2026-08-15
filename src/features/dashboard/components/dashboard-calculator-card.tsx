"use client";

import { Delete, Equal, Minus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  DashboardSurface,
  DashboardSurfaceHeader,
} from "@/features/dashboard/components/dashboard-surface";
import { cn } from "@/lib/utils";

type Op = "+" | "-" | "×" | "÷";

function applyOp(a: number, b: number, op: Op) {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

function formatDisplay(value: string) {
  if (value === "Error") return value;
  const num = Number(value);
  if (!Number.isFinite(num)) return "Error";
  const rounded = Math.round(num * 1e10) / 1e10;
  return String(rounded);
}

export function DashboardCalculatorCard() {
  const t = useTranslations("dashboard.private.calculator");
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);

  function inputDigit(digit: string) {
    setDisplay((current) => {
      if (fresh || current === "0" || current === "Error") {
        setFresh(false);
        return digit;
      }
      if (current.length >= 14) return current;
      return `${current}${digit}`;
    });
  }

  function inputDot() {
    setDisplay((current) => {
      if (fresh || current === "Error") {
        setFresh(false);
        return "0.";
      }
      if (current.includes(".")) return current;
      return `${current}.`;
    });
  }

  function clearAll() {
    setDisplay("0");
    setStored(null);
    setPendingOp(null);
    setFresh(true);
  }

  function backspace() {
    setDisplay((current) => {
      if (fresh || current === "Error" || current.length <= 1) {
        setFresh(true);
        return "0";
      }
      return current.slice(0, -1);
    });
  }

  function chooseOp(op: Op) {
    const current = Number(display);
    if (!Number.isFinite(current)) {
      clearAll();
      return;
    }
    if (stored != null && pendingOp && !fresh) {
      const result = applyOp(stored, current, pendingOp);
      const next = formatDisplay(String(result));
      setDisplay(next);
      setStored(Number(next) || 0);
    } else {
      setStored(current);
    }
    setPendingOp(op);
    setFresh(true);
  }

  function equals() {
    if (stored == null || !pendingOp) return;
    const current = Number(display);
    const result = applyOp(stored, current, pendingOp);
    const next = formatDisplay(String(result));
    setDisplay(next);
    setStored(null);
    setPendingOp(null);
    setFresh(true);
  }

  const keys: Array<{
    label: string;
    onClick: () => void;
    className?: string;
    icon?: typeof Plus;
  }> = [
    { label: "C", onClick: clearAll, className: "text-destructive" },
    { label: "⌫", onClick: backspace, icon: Delete },
    {
      label: "÷",
      onClick: () => chooseOp("÷"),
      className: "text-primary",
    },
    {
      label: "×",
      onClick: () => chooseOp("×"),
      className: "text-primary",
      icon: X,
    },
    { label: "7", onClick: () => inputDigit("7") },
    { label: "8", onClick: () => inputDigit("8") },
    { label: "9", onClick: () => inputDigit("9") },
    {
      label: "−",
      onClick: () => chooseOp("-"),
      className: "text-primary",
      icon: Minus,
    },
    { label: "4", onClick: () => inputDigit("4") },
    { label: "5", onClick: () => inputDigit("5") },
    { label: "6", onClick: () => inputDigit("6") },
    {
      label: "+",
      onClick: () => chooseOp("+"),
      className: "text-primary",
      icon: Plus,
    },
    { label: "1", onClick: () => inputDigit("1") },
    { label: "2", onClick: () => inputDigit("2") },
    { label: "3", onClick: () => inputDigit("3") },
    {
      label: "=",
      onClick: equals,
      className: "row-span-2 bg-primary text-primary-foreground hover:bg-primary/90",
      icon: Equal,
    },
    { label: "0", onClick: () => inputDigit("0"), className: "col-span-2" },
    { label: ".", onClick: inputDot },
  ];

  return (
    <DashboardSurface className="flex min-h-72 flex-col">
      <DashboardSurfaceHeader title={t("title")} />
      <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
        <div className="rounded-xl bg-muted/40 px-4 py-3 text-right">
          <p className="min-h-8 truncate text-2xl font-semibold tabular-nums tracking-tight">
            {display}
          </p>
        </div>
        <div className="grid flex-1 grid-cols-4 gap-1.5">
          {keys.map((key) => {
            const Icon = key.icon;
            return (
              <button
                key={key.label}
                type="button"
                onClick={key.onClick}
                className={cn(
                  "flex items-center justify-center rounded-xl bg-muted/50 text-sm font-medium transition-colors hover:bg-muted",
                  key.className?.includes("row-span")
                    ? "min-h-full"
                    : "min-h-10",
                  key.className,
                )}
              >
                {Icon && (key.label === "⌫" || key.label === "=" || key.label === "×" || key.label === "+" || key.label === "−") ? (
                  <Icon className="size-4" />
                ) : (
                  key.label
                )}
              </button>
            );
          })}
        </div>
      </div>
    </DashboardSurface>
  );
}
