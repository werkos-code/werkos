import { PageCard } from "@/features/shell/components/page-card";

type ComingSoonPanelProps = {
  message: string;
};

export function ComingSoonPanel({ message }: ComingSoonPanelProps) {
  return (
    <PageCard className="px-5 py-10 text-sm text-muted-foreground">
      {message}
    </PageCard>
  );
}
