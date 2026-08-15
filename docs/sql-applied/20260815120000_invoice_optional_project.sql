-- WerkOS: allow invoices without a project (customer required instead)

alter table public.invoices
  alter column project_id drop not null;

alter table public.invoices
  add column if not exists customer_id uuid references public.customers (id) on delete set null;

comment on column public.invoices.customer_id is
  'Bill-to customer; required when project_id is null, otherwise copied from the project';

-- Backfill from linked projects
update public.invoices as i
set customer_id = p.customer_id
from public.projects as p
where i.project_id = p.id
  and i.customer_id is null
  and p.customer_id is not null;

create index if not exists invoices_customer_id_idx
  on public.invoices (customer_id);

alter table public.invoices
  drop constraint if exists invoices_project_or_customer;

alter table public.invoices
  add constraint invoices_project_or_customer
  check (project_id is not null or customer_id is not null);

-- Keep title = invoice number when no explicit title is provided
create or replace function public.invoices_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invoice_number is null or btrim(new.invoice_number) = '' then
    new.invoice_number := public.next_invoice_number(new.organization_id);
  end if;
  if new.sequence_number is null or new.sequence_number <= 0 then
    new.sequence_number := public.next_invoice_sequence(new.organization_id);
  end if;
  if new.title is null or btrim(new.title) = '' then
    new.title := new.invoice_number;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_invoice_links()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
  project_customer uuid;
  quote_org uuid;
  quote_project uuid;
  customer_org uuid;
begin
  if new.project_id is not null then
    select organization_id, customer_id
      into project_org, project_customer
    from public.projects
    where id = new.project_id;

    if project_org is null then
      raise exception 'project not found';
    end if;
    if project_org <> new.organization_id then
      raise exception 'project must belong to the same organization';
    end if;

    if new.customer_id is null then
      new.customer_id := project_customer;
    end if;
  end if;

  if new.customer_id is not null then
    select organization_id into customer_org
    from public.customers
    where id = new.customer_id;

    if customer_org is null then
      raise exception 'customer not found';
    end if;
    if customer_org <> new.organization_id then
      raise exception 'customer must belong to the same organization';
    end if;
  end if;

  if new.project_id is null and new.customer_id is null then
    raise exception 'invoice requires a project or a customer';
  end if;

  if new.quote_id is not null then
    select organization_id, project_id into quote_org, quote_project
    from public.quotes
    where id = new.quote_id;

    if quote_org is null then
      raise exception 'quote not found';
    end if;
    if quote_org <> new.organization_id then
      raise exception 'quote must belong to the same organization';
    end if;
    if new.project_id is null or quote_project <> new.project_id then
      raise exception 'quote must belong to the selected project';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_enforce_links on public.invoices;
create trigger invoices_enforce_links
  before insert or update of organization_id, project_id, quote_id, customer_id
  on public.invoices
  for each row execute function public.enforce_invoice_links();
