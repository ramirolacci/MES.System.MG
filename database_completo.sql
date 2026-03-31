-- =========================================================
-- MES.MG - SQL COMPLETO (Arquitectura final con division por Turnos)
-- =========================================================

-- 1) Extensión para UUID
create extension if not exists pgcrypto;

-- 2) TABLA: PROGRAMMING (Planificación por Turno)
-- Esta tabla ya estaba bien, pero aseguramos la columna shift_type y la unicidad.
create table if not exists public.programming (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  sector text not null,
  product text not null,
  shift_type text not null default 'Mañana',
  planned_kg numeric not null default 0,
  created_at timestamptz not null default now(),
  unique(date, sector, product, shift_type)
);

-- 3) TABLA: PRODUCTION (Carga en tiempo real por Turno)
-- CORRECCIÓN: Se añade shift_type para que la producción no sea un acumulado diario,
-- sino que se registre independientemente por cada turno.
drop table if exists public.production;
create table public.production (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  sector text not null,
  product text not null,
  shift_type text not null default 'Mañana', -- NUEVO: división por turno
  planned numeric not null default 0,
  produced numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(date, sector, product, shift_type)
);

-- 4) TABLA: HISTORY (Registros Finalizados)
-- CORRECCIÓN: Se elimina 'Completo' como valor por defecto para asegurar trazabilidad.
drop table if exists public.history;
create table public.history (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  sector text not null,
  product text not null,
  shift_type text not null, -- Sin default 'Completo' para forzar el valor real
  planned numeric not null default 0,
  produced numeric not null default 0,
  difference numeric not null default 0,
  status text not null,
  created_at timestamptz not null default now()
);

-- 5) TABLA: SHIFTS (Snapshots de turnos)
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  shift_type text not null,
  sector text not null,
  product text not null,
  planned numeric not null default 0,
  produced numeric not null default 0,
  difference numeric not null default 0,
  status text not null,
  "timestamp" timestamptz not null default now()
);

-- 6) ÍNDICES OPTIMIZADOS
create index if not exists idx_programming_full on public.programming(date, sector, shift_type);
create index if not exists idx_production_full on public.production(date, sector, shift_type);
create index if not exists idx_history_full on public.history(date, sector, shift_type);
create index if not exists idx_shifts_full on public.shifts(date, sector, shift_type);

-- 7) FUNCIÓN Y TRIGGER PARA UPDATED_AT
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_production_updated_at
before update on public.production
for each row
execute function public.update_updated_at_column();

-- 8) RLS (SEGURIDAD ABIERTA)
alter table public.programming enable row level security;
alter table public.production enable row level security;
alter table public.history enable row level security;
alter table public.shifts enable row level security;

-- 9) POLÍTICAS SIN LOGIN (Públicas)
drop policy if exists "Public access programming" on public.programming;
create policy "Public access programming" on public.programming for all to public using (true) with check (true);

drop policy if exists "Public access production" on public.production;
create policy "Public access production" on public.production for all to public using (true) with check (true);

drop policy if exists "Public access history" on public.history;
create policy "Public access history" on public.history for all to public using (true) with check (true);

drop policy if exists "Public access shifts" on public.shifts;
create policy "Public access shifts" on public.shifts for all to public using (true) with check (true);
