-- WerkOS: notifications + inbox (conversations)

do $$ begin
  create type public.conversation_visibility as enum ('internal', 'external');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  project_id uuid references public.projects (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_title_not_blank check (length(btrim(title)) > 0)
);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_user_id, read_at, created_at desc);
create index if not exists notifications_organization_idx
  on public.notifications (organization_id, created_at desc);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  visibility public.conversation_visibility not null default 'internal',
  subject text not null,
  created_by uuid references auth.users (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_subject_not_blank check (length(btrim(subject)) > 0)
);

create index if not exists conversations_organization_last_message_idx
  on public.conversations (organization_id, last_message_at desc);
create index if not exists conversations_project_idx
  on public.conversations (project_id);

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint conversation_messages_body_not_blank check (length(btrim(body)) > 0)
);

create index if not exists conversation_messages_conversation_idx
  on public.conversation_messages (conversation_id, created_at asc);

alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (
    recipient_user_id = auth.uid()
    and public.is_org_member(organization_id)
  );

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (
    recipient_user_id = auth.uid()
    and public.is_org_member(organization_id)
  );

drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member"
  on public.conversations for select
  using (public.is_org_member(organization_id));

drop policy if exists "conversations_insert_staff" on public.conversations;
create policy "conversations_insert_staff"
  on public.conversations for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "conversations_update_staff" on public.conversations;
create policy "conversations_update_staff"
  on public.conversations for update
  using (public.is_org_staff(organization_id));

drop policy if exists "conversation_messages_select_member" on public.conversation_messages;
create policy "conversation_messages_select_member"
  on public.conversation_messages for select
  using (public.is_org_member(organization_id));

drop policy if exists "conversation_messages_insert_staff" on public.conversation_messages;
create policy "conversation_messages_insert_staff"
  on public.conversation_messages for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "notifications_select_super_admin" on public.notifications;
create policy "notifications_select_super_admin"
  on public.notifications for select
  using (public.is_super_admin());

drop policy if exists "conversations_select_super_admin" on public.conversations;
create policy "conversations_select_super_admin"
  on public.conversations for select
  using (public.is_super_admin());

drop policy if exists "conversation_messages_select_super_admin" on public.conversation_messages;
create policy "conversation_messages_select_super_admin"
  on public.conversation_messages for select
  using (public.is_super_admin());

grant select, update on table public.notifications to authenticated;
grant select, insert, update on table public.conversations to authenticated;
grant select, insert on table public.conversation_messages to authenticated;
grant all on table public.notifications to service_role;
grant all on table public.conversations to service_role;
grant all on table public.conversation_messages to service_role;
