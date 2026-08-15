-- Complete onboarding without Stripe / without app service-role.
-- Authenticated user provisions own org from onboarding_drafts (security definer).
-- Run in Supabase SQL Editor.

create or replace function public.slugify_company_name(name text)
returns text
language plpgsql
immutable
as $$
declare
  base text;
begin
  base := lower(coalesce(name, ''));
  base := regexp_replace(base, '[àáâãäåāăą]', 'a', 'g');
  base := regexp_replace(base, '[èéêëēėę]', 'e', 'g');
  base := regexp_replace(base, '[ìíîïīį]', 'i', 'g');
  base := regexp_replace(base, '[òóôõöøōő]', 'o', 'g');
  base := regexp_replace(base, '[ùúûüūůű]', 'u', 'g');
  base := regexp_replace(base, '[ýÿ]', 'y', 'g');
  base := regexp_replace(base, '[ñń]', 'n', 'g');
  base := regexp_replace(base, '[çćč]', 'c', 'g');
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  base := left(base, 48);
  if base is null or base = '' then
    return 'bedrijf';
  end if;
  return base;
end;
$$;

create or replace function public.complete_onboarding(
  p_office_seats integer default 0,
  p_field_seats integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_draft public.onboarding_drafts%rowtype;
  v_org_id uuid;
  v_slug text;
  v_base text;
  v_attempt integer := 0;
  v_industry text;
  v_office integer := greatest(coalesce(p_office_seats, 0), 0);
  v_field integer := greatest(coalesce(p_field_seats, 0), 0);
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  select m.organization_id
    into v_org_id
  from public.organization_memberships m
  where m.user_id = v_user_id
    and m.role = 'owner'
  limit 1;

  if v_org_id is not null then
    delete from public.onboarding_drafts where user_id = v_user_id;
    return v_org_id;
  end if;

  select *
    into v_draft
  from public.onboarding_drafts
  where user_id = v_user_id;

  if not found or v_draft.company_name is null or btrim(v_draft.company_name) = '' then
    raise exception 'incomplete_draft';
  end if;

  update public.onboarding_drafts
  set
    office_seats = v_office,
    field_seats = v_field,
    step = 'complete',
    updated_at = now()
  where user_id = v_user_id;

  if v_draft.industry = 'other' then
    v_industry := nullif(btrim(coalesce(v_draft.industry_other, '')), '');
  else
    v_industry := nullif(btrim(coalesce(v_draft.industry, '')), '');
  end if;

  v_base := public.slugify_company_name(v_draft.company_name);
  v_slug := v_base;

  while exists (
    select 1 from public.organizations o where o.slug = v_slug
  ) loop
    v_attempt := v_attempt + 1;
    if v_attempt >= 20 then
      v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      exit;
    end if;
    v_slug := v_base || '-' || (v_attempt + 1)::text;
  end loop;

  insert into public.organizations (name, slug, industry, created_by)
  values (btrim(v_draft.company_name), v_slug, v_industry, v_user_id)
  returning id into v_org_id;

  insert into public.organization_memberships (organization_id, user_id, role)
  values (v_org_id, v_user_id, 'owner');

  insert into public.subscriptions (
    organization_id,
    status,
    trial_ends_at,
    office_seats,
    field_seats,
    cancel_at_period_end
  )
  values (
    v_org_id,
    'trialing',
    now() + interval '14 days',
    v_office,
    v_field,
    false
  );

  delete from public.onboarding_drafts where user_id = v_user_id;

  return v_org_id;
end;
$$;

revoke all on function public.complete_onboarding(integer, integer) from public;
grant execute on function public.complete_onboarding(integer, integer) to authenticated;
grant execute on function public.complete_onboarding(integer, integer) to service_role;
