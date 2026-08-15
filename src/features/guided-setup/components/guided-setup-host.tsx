"use client";

import { useEffect, useState } from "react";

import { GuidedSetupChecklist } from "@/features/guided-setup/components/guided-setup-checklist";
import { GuidedSetupIntroSheet } from "@/features/guided-setup/components/guided-setup-intro-sheet";
import type { GuidedSetupState } from "@/features/guided-setup/guided-setup-actions";

type GuidedSetupHostProps = {
  state: GuidedSetupState;
  /** Force-open intro (e.g. ?welcome=1 or Help restart). */
  forceIntro?: boolean;
};

export function GuidedSetupHost({ state, forceIntro }: GuidedSetupHostProps) {
  const [introOpen, setIntroOpen] = useState(
    Boolean(forceIntro || state.showIntro),
  );

  useEffect(() => {
    if (forceIntro || state.showIntro) {
      setIntroOpen(true);
    }
  }, [forceIntro, state.showIntro]);

  return (
    <>
      <GuidedSetupChecklist state={state} />
      <GuidedSetupIntroSheet open={introOpen} onOpenChange={setIntroOpen} />
    </>
  );
}
