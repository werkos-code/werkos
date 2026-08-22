"use client";

import { CircleHelp } from "lucide-react";

type CockpitSourceHintProps = {
  text: string;
};

export function CockpitSourceHint({ text }: CockpitSourceHintProps) {
  return (
    <span className="group/hint absolute top-3 right-3 z-30">
      <button
        type="button"
        className="rounded-full p-0.5 text-slate-500 transition-colors hover:text-cyan-400 focus-visible:text-cyan-400"
        aria-label={text}
      >
        <CircleHelp className="size-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full right-0 z-[200] mt-2 w-max max-w-[18rem] rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-left text-[11px] leading-snug font-normal tracking-normal whitespace-normal text-slate-300 normal-case opacity-0 shadow-xl backdrop-blur-sm transition-opacity group-hover/hint:opacity-100 group-focus-within/hint:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
