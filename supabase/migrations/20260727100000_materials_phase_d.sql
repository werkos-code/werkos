-- WerkOS Materiaal ERP fase D: leveranciers, inkoop, supplier FK

do $$ begin
  create type public.purchase_order_status as enum (
    'draft',
    'sent',
    'partially_received',
    'received',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  kvk_number text,
  payment_terms_days integer,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_name_not_blank check (length(btrim(name)) > 0),
  constraint suppliers_payment_terms_nonneg
    check (payment_terms_days is null or payment_terms_days >= 0)
);

create index if not exists suppliers_organization_id_idx
  on public.suppliers (organization_id);
create index if not exists suppliers_organization_name_idx
  on public.suppliers (organization_id, name);

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

alter table public.article_supplier_prices
  add column if not exists supplier_id uuid references public.suppliers (id) on delete restrict;

create index if not exists article_supplier_prices_supplier_id_idx
  on public.article_supplier_prices (supplier_id);

alter table public.article_supplier_prices
  drop constraint if exists article_supplier_prices_name_not_blank;

alter table public.article_supplier_prices
  alter column supplier_name drop not null;

alter table public.article_supplier_prices
  drop constraint if exists article_supplier_prices_supplier_ref;
alter table public.article_supplier_prices
  add constraint article_supplier_prices_supplier_ref
  check (
    supplier_id is not null
    or (supplier_name is not null and length(btrim(supplier_name)) > 0)
  );

create or replace function public.sync_article_supplier_price_name()
returns trigger
language plpgsql
as $$
declare
  linked_name text;
begin
  if new.supplier_id is not null then
    select name into linked_name
    from public.suppliers
    where id = new.supplier_id;

    if linked_name is null then
      raise exception 'article_supplier_price_supplier_not_found';
    end if;

    new.supplier_name := linked_name;
  end if;

  return new;
end;
$$;

drop trigger if exists article_supplier_prices_sync_name
  on public.article_supplier_prices;
create trigger article_supplier_prices_sync_name
  before insert or update of supplier_id
  on public.article_supplier_prices
  for each row execute function public.sync_article_supplier_price_name();

create or replace function public.enforce_article_supplier_price_supplier_org()
returns trigger
language plpgsql
as $$
declare
  supplier_org uuid;
begin
  if new.supplier_id is null then
    return new;
  end if;

  select organization_id into supplier_org
  from public.suppliers
  where id = new.supplier_id;

  if supplier_org is null or supplier_org <> new.organization_id then
    raise exception 'article_supplier_price_supplier_org_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists article_supplier_prices_enforce_supplier_org
  on public.article_supplier_prices;
create trigger article_supplier_prices_enforce_supplier_org
  before insert or update of organization_id, supplier_id
  on public.article_supplier_prices
  for each row execute function public.enforce_article_supplier_price_supplier_org();

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  reference text,
  status public.purchase_order_status not null default 'draft',
  order_date date not null default (timezone('europe/amsterdam', now()))::date,
  expected_date date,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchase_orders_organization_id_idx
  on public.purchase_orders (organization_id);
create index if not exists purchase_orders_supplier_id_idx
  on public.purchase_orders (supplier_id);
create index if not exists purchase_orders_status_idx
  on public.purchase_orders (organization_id, status);

drop trigger if exists purchase_orders_set_updated_at on public.purchase_orders;
create trigger purchase_orders_set_updated_at
  before update on public.purchase_orders
  for each row execute function public.set_updated_at();

create or replace function public.enforce_purchase_order_supplier_org()
returns trigger
language plpgsql
as $$
declare
  supplier_org uuid;
begin
  select organization_id into supplier_org
  from public.suppliers
  where id = new.supplier_id;

  if supplier_org is null or supplier_org <> new.organization_id then
    raise exception 'purchase_order_supplier_org_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists purchase_orders_enforce_supplier_org on public.purchase_orders;
create trigger purchase_orders_enforce_supplier_org
  before insert or update of organization_id, supplier_id
  on public.purchase_orders
  for each row execute function public.enforce_purchase_order_supplier_org();

create table if not exists public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  article_id uuid references public.articles (id) on delete set null,
  title text not null,
  quantity numeric(14, 3) not null default 0,
  unit text not null default 'st',
  unit_cost_cents integer,
  received_quantity numeric(14, 3) not null default 0,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_order_lines_title_not_blank check (length(btrim(title)) > 0),
  constraint purchase_order_lines_qty_positive check (quantity > 0),
  constraint purchase_order_lines_received_nonneg check (received_quantity >= 0),
  constraint purchase_order_lines_cost_nonneg
    check (unit_cost_cents is null or unit_cost_cents >= 0)
);

create index if not exists purchase_order_lines_po_id_idx
  on public.purchase_order_lines (purchase_order_id);

drop trigger if exists purchase_order_lines_set_updated_at
  on public.purchase_order_lines;
create trigger purchase_order_lines_set_updated_at
  before update on public.purchase_order_lines
  for each row execute function public.set_updated_at();

create or replace function public.enforce_purchase_order_line_links()
returns trigger
language plpgsql
as $$
declare
  po_org uuid;
begin
  select organization_id into po_org
  from public.purchase_orders
  where id = new.purchase_order_id;

  if po_org is null or po_org <> new.organization_id then
    raise exception 'purchase_order_line_org_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists purchase_order_lines_enforce_links
  on public.purchase_order_lines;
create trigger purchase_order_lines_enforce_links
  before insert or update of organization_id, purchase_order_id
  on public.purchase_order_lines
  for each row execute function public.enforce_purchase_order_line_links();

-- RLS
do $$
declare
  t text;
begin
  foreach t in array array[
    'suppliers',
    'purchase_orders',
    'purchase_order_lines'
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
      'create policy %I on public.%I for update using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id))',
      t || '_update_staff', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_delete_staff', t);
    execute format(
      'create policy %I on public.%I for delete using (public.is_org_staff(organization_id))',
      t || '_delete_staff', t
    );
  end loop;
end $$;
