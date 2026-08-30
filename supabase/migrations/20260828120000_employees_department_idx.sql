-- Faster department isolation filters on employees.
create index if not exists employees_department_idx on public.employees (department);
