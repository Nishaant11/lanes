-- Lanes: database schema
-- Run this once in the Supabase SQL editor (or `supabase db push`).
-- Every table carries user_id and is locked down with RLS, so an anonymous
-- guest only ever sees rows they created.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (char_length(description) <= 5000),
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority    text not null default 'normal'
              check (priority in ('low', 'normal', 'high')),
  due_date    date,
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- lets child tables reference (id, user_id) so a row can never point at
  -- somebody else's task, even if RLS were misconfigured
  unique (id, user_id)
);

create table public.members (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  color      text not null default '#5b6cf0' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.labels (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 32),
  color      text not null default '#8a8f98' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index labels_user_name_key on public.labels (user_id, lower(name));

create table public.task_assignees (
  task_id   uuid not null,
  member_id uuid not null,
  user_id   uuid not null default auth.uid(),
  primary key (task_id, member_id),
  foreign key (task_id, user_id)   references public.tasks (id, user_id)   on delete cascade,
  foreign key (member_id, user_id) references public.members (id, user_id) on delete cascade
);

create table public.task_labels (
  task_id  uuid not null,
  label_id uuid not null,
  user_id  uuid not null default auth.uid(),
  primary key (task_id, label_id),
  foreign key (task_id, user_id)  references public.tasks (id, user_id)  on delete cascade,
  foreign key (label_id, user_id) references public.labels (id, user_id) on delete cascade
);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null,
  user_id    uuid not null default auth.uid(),
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);

-- Written only by triggers below. Clients can read it but not insert,
-- so the history can't be faked from the browser.
create table public.task_activity (
  id         bigint generated always as identity primary key,
  task_id    uuid not null,
  user_id    uuid not null,
  kind       text not null,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);

create index tasks_board_idx       on public.tasks (user_id, status, position);
create index members_user_idx      on public.members (user_id);
create index task_assignees_member on public.task_assignees (member_id);
create index task_labels_label     on public.task_labels (label_id);
create index comments_task_idx     on public.comments (task_id, created_at);
create index activity_task_idx     on public.task_activity (task_id, created_at);

-- ---------------------------------------------------------------------------
-- triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger tasks_touch
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- security definer so it can write past the (missing) insert policy on
-- task_activity. search_path is pinned, as Supabase's linter recommends.
create or replace function public.log_task_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into task_activity (task_id, user_id, kind, meta)
    values (new.id, new.user_id, 'created', jsonb_build_object('status', new.status));
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into task_activity (task_id, user_id, kind, meta)
    values (new.id, new.user_id, 'status', jsonb_build_object('from', old.status, 'to', new.status));
  end if;

  if new.title is distinct from old.title then
    insert into task_activity (task_id, user_id, kind, meta)
    values (new.id, new.user_id, 'title', jsonb_build_object('from', old.title, 'to', new.title));
  end if;

  if new.priority is distinct from old.priority then
    insert into task_activity (task_id, user_id, kind, meta)
    values (new.id, new.user_id, 'priority', jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;

  if new.due_date is distinct from old.due_date then
    insert into task_activity (task_id, user_id, kind, meta)
    values (new.id, new.user_id, 'due_date', jsonb_build_object('from', old.due_date, 'to', new.due_date));
  end if;

  if coalesce(new.description, '') is distinct from coalesce(old.description, '') then
    insert into task_activity (task_id, user_id, kind, meta)
    values (new.id, new.user_id, 'description', '{}'::jsonb);
  end if;

  return new;
end $$;

create trigger tasks_log
  after insert or update on public.tasks
  for each row execute function public.log_task_change();

-- Assignee / label links. Names are copied into meta so the timeline still
-- reads correctly after a member or label is renamed or removed.
create or replace function public.log_task_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec       record;
  item_name text;
  item_kind text;
begin
  rec := case when tg_op = 'DELETE' then old else new end;

  -- the whole task is being deleted (cascade) - nothing to log against
  if not exists (select 1 from tasks where id = rec.task_id) then
    return null;
  end if;

  if tg_table_name = 'task_assignees' then
    select name into item_name from members where id = rec.member_id;
    item_kind := 'assignee';
  else
    select name into item_name from labels where id = rec.label_id;
    item_kind := 'label';
  end if;

  -- member/label itself was deleted, which cascades here; skip the noise
  if item_name is null then
    return null;
  end if;

  insert into task_activity (task_id, user_id, kind, meta)
  values (
    rec.task_id,
    rec.user_id,
    item_kind || case when tg_op = 'INSERT' then '_added' else '_removed' end,
    jsonb_build_object('name', item_name)
  );
  return null;
end $$;

create trigger task_assignees_log
  after insert or delete on public.task_assignees
  for each row execute function public.log_task_link();

create trigger task_labels_log
  after insert or delete on public.task_labels
  for each row execute function public.log_task_link();

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------

alter table public.tasks          enable row level security;
alter table public.members        enable row level security;
alter table public.labels         enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_labels    enable row level security;
alter table public.comments       enable row level security;
alter table public.task_activity  enable row level security;

-- (select auth.uid()) instead of auth.uid() so Postgres evaluates it once per
-- query rather than once per row.

create policy "own tasks" on public.tasks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own members" on public.members
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own labels" on public.labels
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own assignees" on public.task_assignees
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own task labels" on public.task_labels
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "read own comments" on public.comments
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "write own comments" on public.comments
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "delete own comments" on public.comments
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "read own activity" on public.task_activity
  for select to authenticated
  using (user_id = (select auth.uid()));

-- anon (signed-out) role gets nothing at all
revoke all on public.tasks, public.members, public.labels, public.task_assignees,
              public.task_labels, public.comments, public.task_activity from anon;

-- ---------------------------------------------------------------------------
-- realtime: lets a second tab / device see moves without a refresh
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.tasks;
