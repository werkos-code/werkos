import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { InboxWorkspace } from "@/features/inbox/components/inbox-workspace";
import {
  getConversation,
  listConversations,
  listProjectOptionsForInbox,
} from "@/features/inbox/inbox-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string; conversationId: string }>;
};

export default async function InboxConversationPage({ params }: Props) {
  const { locale, conversationId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("inbox");
  const [conversationsResult, projectsResult, detailResult] = await Promise.all([
    listConversations(),
    listProjectOptionsForInbox(),
    getConversation(conversationId),
  ]);

  if (detailResult.error === "not_found" || !detailResult.conversation) {
    notFound();
  }

  return (
    <ShellPage title={t("title")} backHref="/inbox">
      {conversationsResult.error ? (
        <p className="text-sm text-destructive">{conversationsResult.error}</p>
      ) : (
        <InboxWorkspace
          conversations={conversationsResult.conversations ?? []}
          projects={projectsResult.projects ?? []}
          selectedId={conversationId}
          selectedConversation={detailResult.conversation}
          selectedMessages={detailResult.messages ?? []}
        />
      )}
    </ShellPage>
  );
}
