-- TEMPORARY: onboarding bypass without Stripe / service role.
-- Remove this function when Stripe checkout provisioning is live.

create or replace function public.temp_provision_organization_from_draft()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_draft public.onboarding_drafts%rowtype;
  v_org_id uuid;
  v_existing_org uuid;
  v_slug text;
  v_base_slug text;
  v_industry text;
  v_attempt int := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select om.organization_id
    into v_existing_org
  from public.organization_memberships om
  where om.user_id = v_user_id
    and om.role = 'owner'
  limit 1;

  if v_existing_org is not null then
    delete from public.onboarding_drafts where user_id = v_user_id;
    return v_existing_org;
  end if;

  select * into v_draft
  from public.onboarding_drafts
  where user_id = v_user_id;

  if v_draft.user_id is null or v_draft.company_name is null or length(trim(v_draft.company_name)) = 0 then
    raise exception 'incomplete draft';
  end if;

  if v_draft.industry = 'other' then
    v_industry := nullif(trim(coalesce(v_draft.industry_other, '')), '');
  else
    v_industry := nullif(trim(coalesce(v_draft.industry, '')), '');
  end if;

  v_base_slug := lower(trim(both '-' from regexp_replace(
    regexp_replace(
      translate(
        lower(v_draft.company_name),
        'àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ',
        'aaaaaaaceeeeiiiinoooooouuuuyy'
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    ),
    '(^-|-$)',
    '',
    'g'
  )));
  if v_base_slug is null or v_base_slug = '' then
    v_base_slug := 'bedrijf';
  end if;
  v_base_slug := left(v_base_slug, 48);
  v_slug := v_base_slug;

  while exists (select 1 from public.organizations o where o.slug = v_slug) loop
    v_attempt := v_attempt + 1;
    v_slug := v_base_slug || '-' || (v_attempt + 1)::text;
    if v_attempt > 20 then
      v_slug := v_base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      exit;
    end if;
  end loop;

  insert into public.organizations (name, slug, industry, created_by)
  values (v_draft.company_name, v_slug, v_industry, v_user_id)
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
  ) values (
    v_org_id,
    'trialing',
    now() + interval '14 days',
    coalesce(v_draft.office_seats, 0),
    coalesce(v_draft.field_seats, 0),
    false
  );

  delete from public.onboarding_drafts where user_id = v_user_id;

  return v_org_id;
end;
$$;

revoke all on function public.temp_provision_organization_from_draft() from public;
grant execute on function public.temp_provision_organization_from_draft() to authenticated;
