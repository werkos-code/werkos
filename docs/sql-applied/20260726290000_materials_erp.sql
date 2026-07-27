-- WerkOS: materials ERP foundation (articles, stock, project BOM/usages)

do $$ begin
  create type public.stock_location_kind as enum (
    'warehouse',
    'vehicle',
    'project_site',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.stock_movement_type as enum (
    'receipt',
    'issue',
    'transfer',
    'adjustment',
    'return'
  );
exception when duplicate_object then null;
end $$;

-- A. Articles (master data)
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text,
  name text not null,
  description text,
  unit text not null default 'st',
  category text,
  barcode text,
  track_stock boolean not null default true,
  purchase_price_cents integer,
  sale_price_cents integer,
  is_active boolean not null default true,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_name_not_blank check (length(btrim(name)) > 0),
  constraint articles_unit_not_blank check (length(btrim(unit)) > 0),
  constraint articles_prices_nonneg check (
    (purchase_price_cents is null or purchase_price_cents >= 0)
    and (sale_price_cents is null or sale_price_cents >= 0)
  )
);

create unique index if not exists articles_org_code_uidx
  on public.articles (organization_id, lower(code))
  where code is not null and length(btrim(code)) > 0;

create index if not exists articles_organization_id_idx
  on public.articles (organization_id);
create index if not exists articles_name_idx
  on public.articles (organization_id, name);
create index if not exists articles_category_idx
  on public.articles (organization_id, category);
create index if not exists articles_active_idx
  on public.articles (organization_id, is_active);

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

create table if not exists public.article_supplier_prices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  supplier_name text not null,
  supplier_sku text,
  unit_cost_cents integer,
  lead_time_days integer,
  is_preferred boolean not null default false,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint article_supplier_prices_name_not_blank
    check (length(btrim(supplier_name)) > 0),
  constraint article_supplier_prices_cost_nonneg
    check (unit_cost_cents is null or unit_cost_cents >= 0),
  constraint article_supplier_prices_lead_nonneg
    check (lead_time_days is null or lead_time_days >= 0)
);

create index if not exists article_supplier_prices_article_id_idx
  on public.article_supplier_prices (article_id);
create index if not exists article_supplier_prices_org_id_idx
  on public.article_supplier_prices (organization_id);

drop trigger if exists article_supplier_prices_set_updated_at
  on public.article_supplier_prices;
create trigger article_supplier_prices_set_updated_at
  before update on public.article_supplier_prices
  for each row execute function public.set_updated_at();

create or replace function public.enforce_article_supplier_price_links()
returns trigger
language plpgsql
as $$
declare
  article_org uuid;
begin
  select organization_id into article_org
  from public.articles
  where id = new.article_id;

  if article_org is null or article_org <> new.organization_id then
    raise exception 'article_supplier_price_org_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists article_supplier_prices_enforce_links
  on public.article_supplier_prices;
create trigger article_supplier_prices_enforce_links
  before insert or update of organization_id, article_id
  on public.article_supplier_prices
  for each row execute function public.enforce_article_supplier_price_links();

-- B. Stock locations, balances, movements
create table if not exists public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  kind public.stock_location_kind not null default 'warehouse',
  project_id uuid references public.projects (id) on delete set null,
  is_active boolean not null default true,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_locations_name_not_blank check (length(btrim(name)) > 0)
);

create index if not exists stock_locations_organization_id_idx
  on public.stock_locations (organization_id);
create index if not exists stock_locations_project_id_idx
  on public.stock_locations (project_id);

drop trigger if exists stock_locations_set_updated_at on public.stock_locations;
create trigger stock_locations_set_updated_at
  before update on public.stock_locations
  for each row execute function public.set_updated_at();

create or replace function public.enforce_stock_location_links()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
begin
  if new.project_id is not null then
    select organization_id into project_org
    from public.projects
    where id = new.project_id;

    if project_org is null or project_org <> new.organization_id then
      raise exception 'stock_location_project_org_mismatch';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists stock_locations_enforce_links on public.stock_locations;
create trigger stock_locations_enforce_links
  before insert or update of organization_id, project_id
  on public.stock_locations
  for each row execute function public.enforce_stock_location_links();

create table if not exists public.stock_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  location_id uuid not null references public.stock_locations (id) on delete cascade,
  quantity numeric(18, 4) not null default 0,
  reserved_quantity numeric(18, 4) not null default 0,
  min_quantity numeric(18, 4),
  max_quantity numeric(18, 4),
  updated_at timestamptz not null default now(),
  constraint stock_balances_qty_ok check (quantity >= 0 and reserved_quantity >= 0),
  constraint stock_balances_minmax_ok check (
    min_quantity is null or max_quantity is null or min_quantity <= max_quantity
  ),
  constraint stock_balances_article_location_uidx unique (article_id, location_id)
);

create index if not exists stock_balances_organization_id_idx
  on public.stock_balances (organization_id);
create index if not exists stock_balances_location_id_idx
  on public.stock_balances (location_id);

drop trigger if exists stock_balances_set_updated_at on public.stock_balances;
create trigger stock_balances_set_updated_at
  before update on public.stock_balances
  for each row execute function public.set_updated_at();

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete restrict,
  movement_type public.stock_movement_type not null,
  quantity numeric(18, 4) not null,
  from_location_id uuid references public.stock_locations (id) on delete restrict,
  to_location_id uuid references public.stock_locations (id) on delete restrict,
  work_date date not null default (timezone('europe/amsterdam', now()))::date,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_movements_qty_positive check (quantity > 0),
  constraint stock_movements_locations_check check (
    (
      movement_type = 'receipt'
      and to_location_id is not null
      and from_location_id is null
    )
    or (
      movement_type = 'issue'
      and from_location_id is not null
      and to_location_id is null
    )
    or (
      movement_type = 'transfer'
      and from_location_id is not null
      and to_location_id is not null
      and from_location_id <> to_location_id
    )
    or (
      movement_type = 'adjustment'
      and to_location_id is not null
      and from_location_id is null
    )
    or (
      movement_type = 'return'
      and to_location_id is not null
      and from_location_id is null
    )
  )
);

create index if not exists stock_movements_organization_id_idx
  on public.stock_movements (organization_id);
create index if not exists stock_movements_article_id_idx
  on public.stock_movements (article_id);
create index if not exists stock_movements_work_date_idx
  on public.stock_movements (organization_id, work_date desc);

-- C. Project BOM + usages (ad-hoc title OR article)
create table if not exists public.project_material_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  work_item_id uuid references public.work_items (id) on delete set null,
  article_id uuid references public.articles (id) on delete set null,
  title text not null,
  estimated_quantity numeric(18, 4) not null default 0,
  unit text not null default 'st',
  notes text,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_material_lines_title_not_blank check (length(btrim(title)) > 0),
  constraint project_material_lines_qty_nonneg check (estimated_quantity >= 0)
);

create index if not exists project_material_lines_project_id_idx
  on public.project_material_lines (project_id);
create index if not exists project_material_lines_work_item_id_idx
  on public.project_material_lines (work_item_id);

drop trigger if exists project_material_lines_set_updated_at
  on public.project_material_lines;
create trigger project_material_lines_set_updated_at
  before update on public.project_material_lines
  for each row execute function public.set_updated_at();

create or replace function public.enforce_project_material_line_links()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
  item_project uuid;
  item_is_group boolean;
  article_org uuid;
begin
  select organization_id into project_org
  from public.projects
  where id = new.project_id;

  if project_org is null or project_org <> new.organization_id then
    raise exception 'project_material_line_project_org_mismatch';
  end if;

  if new.work_item_id is not null then
    select project_id, is_group into item_project, item_is_group
    from public.work_items
    where id = new.work_item_id;

    if item_project is null or item_project <> new.project_id then
      raise exception 'project_material_line_work_item_mismatch';
    end if;

    if coalesce(item_is_group, false) then
      raise exception 'project_material_line_on_group_not_allowed';
    end if;
  end if;

  if new.article_id is not null then
    select organization_id into article_org
    from public.articles
    where id = new.article_id;

    if article_org is null or article_org <> new.organization_id then
      raise exception 'project_material_line_article_org_mismatch';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists project_material_lines_enforce_links
  on public.project_material_lines;
create trigger project_material_lines_enforce_links
  before insert or update of organization_id, project_id, work_item_id, article_id
  on public.project_material_lines
  for each row execute function public.enforce_project_material_line_links();

create table if not exists public.material_usages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  material_line_id uuid references public.project_material_lines (id) on delete set null,
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
  constraint material_usages_title_not_blank check (length(btrim(title)) > 0),
  constraint material_usages_qty_positive check (quantity > 0)
);

create index if not exists material_usages_work_item_id_idx
  on public.material_usages (work_item_id);
create index if not exists material_usages_project_id_idx
  on public.material_usages (project_id);

create or replace function public.enforce_material_usage_links()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
  item_project uuid;
  item_is_group boolean;
begin
  select organization_id into project_org
  from public.projects
  where id = new.project_id;

  if project_org is null or project_org <> new.organization_id then
    raise exception 'material_usage_project_org_mismatch';
  end if;

  select project_id, is_group into item_project, item_is_group
  from public.work_items
  where id = new.work_item_id;

  if item_project is null or item_project <> new.project_id then
    raise exception 'material_usage_work_item_mismatch';
  end if;

  if coalesce(item_is_group, false) then
    raise exception 'material_usage_on_group_not_allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists material_usages_enforce_links on public.material_usages;
create trigger material_usages_enforce_links
  before insert or update of organization_id, project_id, work_item_id
  on public.material_usages
  for each row execute function public.enforce_material_usage_links();

-- RLS helpers
do $$
declare
  t text;
begin
  foreach t in array array[
    'articles',
    'article_supplier_prices',
    'stock_locations',
    'stock_balances',
    'stock_movements',
    'project_material_lines',
    'material_usages'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select_member', t);
    execute format(
      'create policy %I on public.%I for select using (public.is_org_member(organization_id))',
      t || '_select_member', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_insert_staff', t);
    execute format(
      'create policy %I on public.%I for insert with check (public.is_org_staff(organization_id))',
      t || '_insert_staff', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_update_staff', t);
    execute format(
      'create policy %I on public.%I for update using (public.is_org_staff(organization_id))',
      t || '_update_staff', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_delete_staff', t);
    execute format(
      'create policy %I on public.%I for delete using (public.is_org_staff(organization_id))',
      t || '_delete_staff', t
    );

    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      t
    );
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;
