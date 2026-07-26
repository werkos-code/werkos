-- Distinguish structural groups from leaf work items
alter table public.work_items
  add column if not exists is_group boolean not null default false;

create index if not exists work_items_is_group_idx
  on public.work_items (project_id, is_group);
