-- Fix: tables created via SQL Editor are owned by postgres and do not
-- automatically grant DML to the authenticated role. RLS alone is not enough.

grant usage on schema public to anon, authenticated;

grant select, update on table public.profiles to authenticated;

grant select on table public.organizations to authenticated;
grant select on table public.organization_memberships to authenticated;
grant select on table public.subscriptions to authenticated;

grant select, insert, update, delete on table public.onboarding_drafts to authenticated;

-- Keep service_role fully capable (webhooks / admin client)
grant all on table public.profiles to service_role;
grant all on table public.organizations to service_role;
grant all on table public.organization_memberships to service_role;
grant all on table public.subscriptions to service_role;
grant all on table public.onboarding_drafts to service_role;

-- Bypass RPC used during temporary onboarding skip
grant execute on function public.temp_provision_organization_from_draft() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.user_has_organization() to authenticated;
