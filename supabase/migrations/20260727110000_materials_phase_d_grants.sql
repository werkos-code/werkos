-- Fix: GRANT on fase D tables (suppliers, purchase_orders, purchase_order_lines)
-- Without these, both authenticated and service_role get "permission denied".

grant select, insert, update, delete on table public.suppliers to authenticated;
grant select, insert, update, delete on table public.purchase_orders to authenticated;
grant select, insert, update, delete on table public.purchase_order_lines to authenticated;

grant all on table public.suppliers to service_role;
grant all on table public.purchase_orders to service_role;
grant all on table public.purchase_order_lines to service_role;
