-- Performance Management System — core schema
-- Run in the Supabase SQL editor or via the Supabase CLI.

create type public.employee_role as enum ('employee', 'manager', 'hr_admin');
create type public.cycle_status as enum ('draft', 'open', 'closed');
create type public.goal_status as enum ('draft', 'submitted', 'approved', 'sent_back');
create type public.review_status as enum (
  'draft',
  'self_submitted',
  'reviewed',
  'completed'
);

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  full_name text not null,
  email text not null unique,
  designation text,
  department text,
  date_of_joining date,
  manager_id uuid,
  role public.employee_role not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  -- FK: this employee's current line manager (null for top of the tree).
  constraint employees_manager_id_fkey
    foreign key (manager_id) references public.employees (id)
    on delete set null
);

create index employees_manager_id_idx on public.employees (manager_id);

-- ---------------------------------------------------------------------------
-- review_cycles
-- ---------------------------------------------------------------------------
create table public.review_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  status public.cycle_status not null default 'draft',
  created_by uuid not null,

  constraint review_cycles_dates_check check (end_date >= start_date),

  -- FK: HR/admin employee who created this cycle.
  constraint review_cycles_created_by_fkey
    foreign key (created_by) references public.employees (id)
    on delete restrict
);

create index review_cycles_created_by_idx on public.review_cycles (created_by);

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null,
  cycle_id uuid not null,
  title text not null,
  description text,
  weightage numeric(5, 2) not null default 0,
  target_date date,
  status public.goal_status not null default 'draft',
  manager_comment text,

  constraint goals_weightage_check check (weightage >= 0 and weightage <= 100),

  -- FK: employee this goal is assigned to.
  constraint goals_employee_id_fkey
    foreign key (employee_id) references public.employees (id)
    on delete cascade,

  -- FK: review cycle this goal belongs to.
  constraint goals_cycle_id_fkey
    foreign key (cycle_id) references public.review_cycles (id)
    on delete cascade
);

create index goals_employee_id_idx on public.goals (employee_id);
create index goals_cycle_id_idx on public.goals (cycle_id);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null,
  manager_id uuid not null,
  cycle_id uuid not null,
  status public.review_status not null default 'draft',
  overall_self_rating numeric(3, 1),
  overall_manager_rating numeric(3, 1),
  manager_summary text,
  submitted_at timestamptz,
  reviewed_at timestamptz,

  constraint reviews_self_rating_check
    check (overall_self_rating is null or (overall_self_rating >= 1 and overall_self_rating <= 5)),
  constraint reviews_manager_rating_check
    check (overall_manager_rating is null or (overall_manager_rating >= 1 and overall_manager_rating <= 5)),
  constraint reviews_employee_cycle_unique unique (employee_id, cycle_id),

  -- FK: employee being reviewed.
  constraint reviews_employee_id_fkey
    foreign key (employee_id) references public.employees (id)
    on delete cascade,

  -- FK: manager who owns this review (snapshot, not current org-chart manager).
  constraint reviews_manager_id_fkey
    foreign key (manager_id) references public.employees (id)
    on delete restrict,

  -- FK: cycle this review is part of.
  constraint reviews_cycle_id_fkey
    foreign key (cycle_id) references public.review_cycles (id)
    on delete cascade
);

create index reviews_employee_id_idx on public.reviews (employee_id);
create index reviews_manager_id_idx on public.reviews (manager_id);
create index reviews_cycle_id_idx on public.reviews (cycle_id);

-- ---------------------------------------------------------------------------
-- goal_ratings
-- ---------------------------------------------------------------------------
create table public.goal_ratings (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null,
  goal_id uuid not null,
  self_comment text,
  self_rating numeric(3, 1),
  manager_comment text,
  manager_rating numeric(3, 1),

  constraint goal_ratings_self_rating_check
    check (self_rating is null or (self_rating >= 1 and self_rating <= 5)),
  constraint goal_ratings_manager_rating_check
    check (manager_rating is null or (manager_rating >= 1 and manager_rating <= 5)),
  constraint goal_ratings_review_goal_unique unique (review_id, goal_id),

  -- FK: review that this per-goal score belongs to.
  constraint goal_ratings_review_id_fkey
    foreign key (review_id) references public.reviews (id)
    on delete cascade,

  -- FK: goal being scored in that review.
  constraint goal_ratings_goal_id_fkey
    foreign key (goal_id) references public.goals (id)
    on delete restrict
);

create index goal_ratings_review_id_idx on public.goal_ratings (review_id);
create index goal_ratings_goal_id_idx on public.goal_ratings (goal_id);
