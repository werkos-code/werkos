-- Remove temporary onboarding bypass RPC (Stripe checkout is live).
drop function if exists public.temp_provision_organization_from_draft();
