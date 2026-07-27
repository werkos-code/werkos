-- WerkOS Materiaal fase F: leveranciersfacturen + 3-way match (PO / ontvangst / factuur)

do $$ begin
  create type public.supplier_invoice_status as enum (
    'draft',
    'matched',
    'variance'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  purchase_order_id uuid not null references public.purchase_orders (id) on delete restrict,
  invoice_number text not null,
  invoice_date date not null default (timezone('europe/amsterdam', now()))::date,
  status public.supplier_invoice_status not null default 'draft',
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_invoices_number_not_blank check (length(btrim(invoice_number)) > 0)
);

create index if not exists supplier_invoices_org_id_idx
  on public.supplier_invoices (organization_id);
create index if not exists supplier_invoices_po_id_idx
  on public.supplier_invoices (purchase_order_id);
create index if not exists supplier_invoices_supplier_id_idx
  on public.supplier_invoices (supplier_id);

drop trigger if exists supplier_invoices_set_updated_at on public.supplier_invoices;
create trigger supplier_invoices_set_updated_at
  before update on public.supplier_invoices
  for each row execute function public.set_updated_at();

create table if not exists public.supplier_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  supplier_invoice_id uuid not null references public.supplier_invoices (id) on delete cascade,
  purchase_order_line_id uuid not null references public.purchase_order_lines (id) on delete restrict,
  quantity numeric(14, 3) not null,
  unit_cost_cents integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint supplier_invoice_lines_qty_positive check (quantity > 0),
  constraint supplier_invoice_lines_cost_nonneg
    check (unit_cost_cents is null or unit_cost_cents >= 0)
);

create index if not exists supplier_invoice_lines_invoice_id_idx
  on public.supplier_invoice_lines (supplier_invoice_id);
create index if not exists supplier_invoice_lines_po_line_id_idx
  on public.supplier_invoice_lines (purchase_order_line_id);

create or replace function public.enforce_supplier_invoice_links()
returns trigger
language plpgsql
as $$
declare
  po_org uuid;
  po_supplier uuid;
  supplier_org uuid;
begin
  select organization_id, supplier_id into po_org, po_supplier
  from public.purchase_orders
  where id = new.purchase_order_id;

  if po_org is null or po_org <> new.organization_id then
    raise exception 'supplier_invoice_po_org_mismatch';
  end if;

  if po_supplier is null or po_supplier <> new.supplier_id then
    raise exception 'supplier_invoice_po_supplier_mismatch';
  end if;

  select organization_id into supplier_org
  from public.suppliers
  where id = new.supplier_id;

  if supplier_org is null or supplier_org <> new.organization_id then
    raise exception 'supplier_invoice_supplier_org_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists supplier_invoices_enforce_links on public.supplier_invoices;
create trigger supplier_invoices_enforce_links
  before insert or update of organization_id, supplier_id, purchase_order_id
  on public.supplier_invoices
  for each row execute function public.enforce_supplier_invoice_links();

create or replace function public.enforce_supplier_invoice_line_links()
returns trigger
language plpgsql
as $$
declare
  invoice_org uuid;
  invoice_po uuid;
  line_org uuid;
  line_po uuid;
begin
  select organization_id, purchase_order_id into invoice_org, invoice_po
  from public.supplier_invoices
  where id = new.supplier_invoice_id;

  if invoice_org is null or invoice_org <> new.organization_id then
    raise exception 'supplier_invoice_line_invoice_org_mismatch';
  end if;

  select organization_id, purchase_order_id into line_org, line_po
  from public.purchase_order_lines
  where id = new.purchase_order_line_id;

  if line_org is null or line_org <> new.organization_id then
    raise exception 'supplier_invoice_line_po_line_org_mismatch';
  end if;

  if line_po is null or line_po <> invoice_po then
    raise exception 'supplier_invoice_line_po_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists supplier_invoice_lines_enforce_links
  on public.supplier_invoice_lines;
create trigger supplier_invoice_lines_enforce_links
  before insert or update of organization_id, supplier_invoice_id, purchase_order_line_id
  on public.supplier_invoice_lines
  for each row execute function public.enforce_supplier_invoice_line_links();

alter table public.supplier_invoices enable row level security;
alter table public.supplier_invoice_lines enable row level security;

drop policy if exists supplier_invoices_select_member on public.supplier_invoices;
create policy supplier_invoices_select_member
  on public.supplier_invoices for select
  using (public.is_org_member(organization_id));

drop policy if exists supplier_invoices_insert_staff on public.supplier_invoices;
create policy supplier_invoices_insert_staff
  on public.supplier_invoices for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists supplier_invoices_update_staff on public.supplier_invoices;
create policy supplier_invoices_update_staff
  on public.supplier_invoices for update
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists supplier_invoices_delete_staff on public.supplier_invoices;
create policy supplier_invoices_delete_staff
  on public.supplier_invoices for delete
  using (public.is_org_staff(organization_id));

drop policy if exists supplier_invoice_lines_select_member on public.supplier_invoice_lines;
create policy supplier_invoice_lines_select_member
  on public.supplier_invoice_lines for select
  using (public.is_org_member(organization_id));

drop policy if exists supplier_invoice_lines_insert_staff on public.supplier_invoice_lines;
create policy supplier_invoice_lines_insert_staff
  on public.supplier_invoice_lines for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists supplier_invoice_lines_delete_staff on public.supplier_invoice_lines;
create policy supplier_invoice_lines_delete_staff
  on public.supplier_invoice_lines for delete
  using (public.is_org_staff(organization_id));

grant select, insert, update, delete on table public.supplier_invoices to authenticated;
grant select, insert, delete on table public.supplier_invoice_lines to authenticated;
grant all on table public.supplier_invoices to service_role;
grant all on table public.supplier_invoice_lines to service_role;
