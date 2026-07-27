-- WerkOS Materiaal fase E+: direct materiaal op werkbon (zonder werkzaamheid)

create table if not exists public.work_order_material_usages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  article_id uuid references public.articles (id) on delete set null,
  title text not null,
  quantity numeric(18, 4) not null,
  unit text not null default 'st',
  location_id uuid references public.stock_locations (id) on delete set null,
  stock_movement_id uuid references public.stock_movements (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete restrict,
  work_date date not null default (timezone('europe/amsterdam', now()))::date,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint work_order_material_usages_title_not_blank check (length(btrim(title)) > 0),
  constraint work_order_material_usages_qty_positive check (quantity > 0)
);

create index if not exists work_order_material_usages_work_order_id_idx
  on public.work_order_material_usages (work_order_id);
create index if not exists work_order_material_usages_project_id_idx
  on public.work_order_material_usages (project_id);
create index if not exists work_order_material_usages_org_id_idx
  on public.work_order_material_usages (organization_id);

create or replace function public.enforce_work_order_material_usage_links()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
  wo_project uuid;
  wo_org uuid;
  article_org uuid;
begin
  select organization_id into project_org
  from public.projects
  where id = new.project_id;

  if project_org is null or project_org <> new.organization_id then
    raise exception 'work_order_material_usage_project_org_mismatch';
  end if;

  select organization_id, project_id into wo_org, wo_project
  from public.work_orders
  where id = new.work_order_id;

  if wo_org is null or wo_org <> new.organization_id then
    raise exception 'work_order_material_usage_work_order_org_mismatch';
  end if;

  if wo_project is null or wo_project <> new.project_id then
    raise exception 'work_order_material_usage_work_order_project_mismatch';
  end if;

  if new.article_id is not null then
    select organization_id into article_org
    from public.articles
    where id = new.article_id;

    if article_org is null or article_org <> new.organization_id then
      raise exception 'work_order_material_usage_article_org_mismatch';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists work_order_material_usages_enforce_links
  on public.work_order_material_usages;
create trigger work_order_material_usages_enforce_links
  before insert or update of organization_id, project_id, work_order_id, article_id
  on public.work_order_material_usages
  for each row execute function public.enforce_work_order_material_usage_links();

alter table public.work_order_material_usages enable row level security;

drop policy if exists work_order_material_usages_select_member
  on public.work_order_material_usages;
create policy work_order_material_usages_select_member
  on public.work_order_material_usages for select
  using (public.is_org_member(organization_id));

drop policy if exists work_order_material_usages_insert_staff
  on public.work_order_material_usages;
create policy work_order_material_usages_insert_staff
  on public.work_order_material_usages for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists work_order_material_usages_delete_staff
  on public.work_order_material_usages;
create policy work_order_material_usages_delete_staff
  on public.work_order_material_usages for delete
  using (public.is_org_staff(organization_id));

grant select, insert, delete on table public.work_order_material_usages to authenticated;
grant all on table public.work_order_material_usages to service_role;
