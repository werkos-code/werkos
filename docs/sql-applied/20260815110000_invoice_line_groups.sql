-- WerkOS: invoice line groups (max 1 level deep)

alter table public.invoice_lines
  add column if not exists is_group boolean not null default false;

comment on column public.invoice_lines.is_group is
  'Section/group header; children nest via parent_id (max one level)';

-- Groups are always roots; priced lines may nest under a group.
alter table public.invoice_lines
  drop constraint if exists invoice_lines_group_is_root;

alter table public.invoice_lines
  add constraint invoice_lines_group_is_root
  check (not is_group or parent_id is null);
