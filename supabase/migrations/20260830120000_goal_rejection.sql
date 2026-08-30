-- Goal rejection workflow: extra statuses + mandatory rejection note column.
-- Existing draft/submitted/approved/sent_back values stay for the SMART-goal cycle.

alter type public.goal_status add value if not exists 'pending';
alter type public.goal_status add value if not exists 'accepted';
alter type public.goal_status add value if not exists 'rejected';
alter type public.goal_status add value if not exists 'completed';

alter table public.goals
  add column if not exists rejection_reason text;

create index if not exists goals_status_idx on public.goals (status);
