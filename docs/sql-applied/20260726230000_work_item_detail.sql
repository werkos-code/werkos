-- WerkOS: work item detail fields (priority + labels)

alter table public.work_items
  add column if not exists priority text not null default 'normal',
  add column if not exists labels text[] not null default '{}';

alter table public.work_items
  drop constraint if exists work_items_priority_check;

alter table public.work_items
  add constraint work_items_priority_check
  check (priority in ('low', 'normal', 'high'));
