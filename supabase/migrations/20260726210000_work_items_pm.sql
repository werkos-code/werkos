-- WerkOS: work items as hierarchical PM objects

do $$ begin
  alter type public.work_item_status add value if not exists 'in_progress';
exception when duplicate_object then null;
end $$;

alter table public.work_items
  add column if not exists parent_id uuid references public.work_items (id) on delete cascade,
  add column if not exists description text,
  add column if not exists category text,
  add column if not exists assignee_user_id uuid references auth.users (id) on delete set null,
  add column if not exists planned_start date,
  add column if not exists planned_end date,
  add column if not exists estimated_minutes integer;

create index if not exists work_items_parent_id_idx
  on public.work_items (parent_id);

create index if not exists work_items_assignee_user_id_idx
  on public.work_items (assignee_user_id);

create or replace function public.enforce_work_item_parent()
returns trigger
language plpgsql
as $$
declare
  parent_project uuid;
  parent_org uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'work item cannot be its own parent';
  end if;

  select organization_id, project_id
  into parent_org, parent_project
  from public.work_items
  where id = new.parent_id;

  if parent_project is null then
    raise exception 'parent work item not found';
  end if;

  if parent_org <> new.organization_id or parent_project <> new.project_id then
    raise exception 'parent must belong to the same project and organization';
  end if;

  return new;
end;
$$;

drop trigger if exists work_items_enforce_parent on public.work_items;
create trigger work_items_enforce_parent
  before insert or update of parent_id, organization_id, project_id on public.work_items
  for each row execute function public.enforce_work_item_parent();

alter table public.work_items
  drop constraint if exists work_items_estimated_minutes_nonneg;

alter table public.work_items
  add constraint work_items_estimated_minutes_nonneg
  check (estimated_minutes is null or estimated_minutes >= 0);
