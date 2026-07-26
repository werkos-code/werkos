-- Platform role for WerkOS super admins

do $$ begin
  create type public.platform_role as enum ('super_admin');
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists platform_role public.platform_role;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.platform_role = 'super_admin'
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- Super admin may list platform data (writes still via service role)
drop policy if exists "profiles_select_super_admin" on public.profiles;
create policy "profiles_select_super_admin"
  on public.profiles for select
  using (public.is_super_admin());

drop policy if exists "organizations_select_super_admin" on public.organizations;
create policy "organizations_select_super_admin"
  on public.organizations for select
  using (public.is_super_admin());

drop policy if exists "memberships_select_super_admin" on public.organization_memberships;
create policy "memberships_select_super_admin"
  on public.organization_memberships for select
  using (public.is_super_admin());

drop policy if exists "subscriptions_select_super_admin" on public.subscriptions;
create policy "subscriptions_select_super_admin"
  on public.subscriptions for select
  using (public.is_super_admin());

-- Promote first super admin (safe to re-run)
update public.profiles p
set platform_role = 'super_admin'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('e.jorissen@hotmail.nl');
