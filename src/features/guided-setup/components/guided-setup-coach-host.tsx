import { GuidedSetupCoach } from "@/features/guided-setup/components/guided-setup-coach";
import { getGuidedSetupFlags } from "@/features/guided-setup/guided-setup-actions";

/** Server loader so the floating coach can sit in the app shell. */
export async function GuidedSetupCoachHost() {
  const result = await getGuidedSetupFlags();
  if (!result.flags || result.flags.coachHidden) return null;
  return <GuidedSetupCoach flags={result.flags} />;
}
