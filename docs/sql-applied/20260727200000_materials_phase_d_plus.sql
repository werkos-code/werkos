-- WerkOS Materiaal ERP fase D+: levernota + reserveringen

create table if not exists public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders (id) on delete restrict,
  location_id uuid not null references public.stock_locations (id) on delete restrict,
  receipt_date date not null default (timezone('europe/amsterdam', now()))::date,
  reference text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists purchase_receipts_po_id_idx
  on public.purchase_receipts (purchase_order_id);
create index if not exists purchase_receipts_org_id_idx
  on public.purchase_receipts (organization_id);

create or replace function public.enforce_purchase_receipt_links()
returns trigger
language plpgsql
as $$
declare
  po_org uuid;
  loc_org uuid;
begin
  select organization_id into po_org
  from public.purchase_orders
  where id = new.purchase_order_id;

  if po_org is null or po_org <> new.organization_id then
    raise exception 'purchase_receipt_po_org_mismatch';
  end if;

  select organization_id into loc_org
  from public.stock_locations
  where id = new.location_id;

  if loc_org is null or loc_org <> new.organization_id then
    raise exception 'purchase_receipt_location_org_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists purchase_receipts_enforce_links on public.purchase_receipts;
create trigger purchase_receipts_enforce_links
  before insert or update of organization_id, purchase_order_id, location_id
  on public.purchase_receipts
  for each row execute function public.enforce_purchase_receipt_links();

create table if not exists public.purchase_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  purchase_receipt_id uuid not null references public.purchase_receipts (id) on delete cascade,
  purchase_order_line_id uuid not null references public.purchase_order_lines (id) on delete restrict,
  quantity numeric(14, 3) not null,
  stock_movement_id uuid references public.stock_movements (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint purchase_receipt_lines_qty_positive check (quantity > 0)
);

create index if not exists purchase_receipt_lines_receipt_id_idx
  on public.purchase_receipt_lines (purchase_receipt_id);

create or replace function public.enforce_purchase_receipt_line_links()
returns trigger
language plpgsql
as $$
declare
  receipt_org uuid;
  line_org uuid;
begin
  select organization_id into receipt_org
  from public.purchase_receipts
  where id = new.purchase_receipt_id;

  if receipt_org is null or receipt_org <> new.organization_id then
    raise exception 'purchase_receipt_line_receipt_org_mismatch';
  end if;

  select organization_id into line_org
  from public.purchase_order_lines
  where id = new.purchase_order_line_id;

  if line_org is null or line_org <> new.organization_id then
    raise exception 'purchase_receipt_line_po_line_org_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists purchase_receipt_lines_enforce_links
  on public.purchase_receipt_lines;
create trigger purchase_receipt_lines_enforce_links
  before insert or update of organization_id, purchase_receipt_id, purchase_order_line_id
  on public.purchase_receipt_lines
  for each row execute function public.enforce_purchase_receipt_line_links();

create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete restrict,
  location_id uuid not null references public.stock_locations (id) on delete restrict,
  project_id uuid references public.projects (id) on delete set null,
  material_line_id uuid references public.project_material_lines (id) on delete set null,
  quantity numeric(14, 3) not null,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  constraint stock_reservations_qty_positive check (quantity > 0)
);

create index if not exists stock_reservations_org_id_idx
  on public.stock_reservations (organization_id);
create index if not exists stock_reservations_article_location_idx
  on public.stock_reservations (article_id, location_id);
create index if not exists stock_reservations_active_idx
  on public.stock_reservations (organization_id)
  where released_at is null;

create or replace function public.enforce_stock_reservation_links()
returns trigger
language plpgsql
as $$
declare
  article_org uuid;
  loc_org uuid;
  project_org uuid;
begin
  select organization_id into article_org
  from public.articles
  where id = new.article_id;

  if article_org is null or article_org <> new.organization_id then
    raise exception 'stock_reservation_article_org_mismatch';
  end if;

  select organization_id into loc_org
  from public.stock_locations
  where id = new.location_id;

  if loc_org is null or loc_org <> new.organization_id then
    raise exception 'stock_reservation_location_org_mismatch';
  end if;

  if new.project_id is not null then
    select organization_id into project_org
    from public.projects
    where id = new.project_id;

    if project_org is null or project_org <> new.organization_id then
      raise exception 'stock_reservation_project_org_mismatch';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists stock_reservations_enforce_links on public.stock_reservations;
create trigger stock_reservations_enforce_links
  before insert or update of organization_id, article_id, location_id, project_id
  on public.stock_reservations
  for each row execute function public.enforce_stock_reservation_links();

-- RLS + grants
do $$
declare
  t text;
begin
  foreach t in array array[
    'purchase_receipts',
    'purchase_receipt_lines',
    'stock_reservations'
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

    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      t
    );
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;
