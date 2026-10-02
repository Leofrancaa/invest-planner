create table if not exists public.portfolio_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.portfolio_plans enable row level security;
grant select, insert, update, delete on public.portfolio_plans to authenticated;
revoke all on public.portfolio_plans from anon;
create policy "Users read their plan" on public.portfolio_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their plan" on public.portfolio_plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their plan" on public.portfolio_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete their plan" on public.portfolio_plans for delete to authenticated using ((select auth.uid()) = user_id);
