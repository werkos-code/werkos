-- Fix: service_role needs table grants (admin client uses service role key).
-- Run this if administratie returns "permission denied for table platform_operating_costs".

grant all on table public.platform_audit_log to service_role;
grant all on table public.platform_operating_costs to service_role;

grant select, insert, update, delete on table public.platform_audit_log to authenticated;
grant select, insert, update, delete on table public.platform_operating_costs to authenticated;
