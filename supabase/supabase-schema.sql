create table if not exists public.catalog_state (
  id text primary key,
  categories jsonb not null default '[]'::jsonb,
  products jsonb not null default '[]'::jsonb,
  store_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.catalog_state enable row level security;
revoke all on table public.catalog_state from anon, authenticated;
grant select on table public.catalog_state to anon;
grant select, insert, update, delete on table public.catalog_state to authenticated;

drop policy if exists "catalog public read" on public.catalog_state;
create policy "catalog public read" on public.catalog_state for select to anon, authenticated using (true);

drop policy if exists "catalog authenticated insert" on public.catalog_state;
create policy "catalog authenticated insert" on public.catalog_state for insert to authenticated with check (true);

drop policy if exists "catalog authenticated update" on public.catalog_state;
create policy "catalog authenticated update" on public.catalog_state for update to authenticated using (true) with check (true);

drop policy if exists "catalog authenticated delete" on public.catalog_state;
create policy "catalog authenticated delete" on public.catalog_state for delete to authenticated using (true);

insert into public.catalog_state (id) values ('main') on conflict (id) do nothing;
