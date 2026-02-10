-- Workshop backend hardening migration
-- - Normalizes comments payload compatibility (`content` + `comment_text`)
-- - Rebuilds RLS to match workshop collaboration requirements
-- - Locks completed pieces as read-only for edits/comments

-- -----------------------------------------------------------------------------
-- 1) Schema compatibility helpers
-- -----------------------------------------------------------------------------

alter table public.comments
  add column if not exists comment_text text;

alter table public.comments
  add column if not exists status text;

update public.comments
set status = 'draft'
where status is null or status not in ('draft', 'submitted');

alter table public.comments
  alter column status set default 'draft';

alter table public.comments
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_status_check'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_status_check
      check (status in ('draft', 'submitted'))
      not valid;
  end if;
end $$;

alter table public.comments
  validate constraint comments_status_check;

update public.comments
set comment_text = coalesce(comment_text, content)
where comment_text is null or comment_text <> coalesce(content, '');

create or replace function public.sync_comment_content_fields()
returns trigger
language plpgsql
as $$
begin
  if new.content is null and new.comment_text is not null then
    new.content := new.comment_text;
  end if;

  if new.comment_text is null and new.content is not null then
    new.comment_text := new.content;
  end if;

  -- Keep a single source of truth in app code while remaining backward-compatible.
  if new.content is not null then
    new.comment_text := new.content;
  end if;

  return new;
end;
$$;

drop trigger if exists comments_sync_content_fields_trg on public.comments;
create trigger comments_sync_content_fields_trg
before insert or update on public.comments
for each row
execute function public.sync_comment_content_fields();

-- Remove duplicate invites before adding a uniqueness index.
with ranked_collaborators as (
  select
    ctid,
    row_number() over (
      partition by piece_id, lower(invitee_email)
      order by created_at asc nulls last, ctid
    ) as rn
  from public.collaborators
  where invitee_email is not null
)
delete from public.collaborators c
using ranked_collaborators r
where c.ctid = r.ctid
  and r.rn > 1;

create unique index if not exists collaborators_piece_email_uq
  on public.collaborators (piece_id, lower(invitee_email));

-- -----------------------------------------------------------------------------
-- 2) RLS helper functions
-- -----------------------------------------------------------------------------

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce((auth.jwt() ->> 'email'), ''));
$$;

create or replace function public.is_piece_owner(target_piece_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.pieces p
    where p.id = target_piece_id
      and p.owner_id = auth.uid()
  );
$$;

create or replace function public.can_access_piece(target_piece_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.pieces p
    where p.id = target_piece_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.collaborators c
          where c.piece_id = p.id
            and lower(c.invitee_email) = public.current_user_email()
        )
      )
  );
$$;

create or replace function public.is_piece_open(target_piece_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.pieces p
    where p.id = target_piece_id
      and p.status <> 'completed'
  );
$$;

grant execute on function public.current_user_email() to anon, authenticated;
grant execute on function public.is_piece_owner(uuid) to anon, authenticated;
grant execute on function public.can_access_piece(uuid) to anon, authenticated;
grant execute on function public.is_piece_open(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3) Drop existing policies on workshop tables
-- -----------------------------------------------------------------------------

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'pieces',
        'versions',
        'comments',
        'collaborators',
        'version_chains',
        'projects'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 4) Ensure RLS is enabled
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.pieces enable row level security;
alter table public.versions enable row level security;
alter table public.comments enable row level security;
alter table public.collaborators enable row level security;

do $$
begin
  if to_regclass('public.version_chains') is not null then
    execute 'alter table public.version_chains enable row level security';
  end if;

  if to_regclass('public.projects') is not null then
    execute 'alter table public.projects enable row level security';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 5) Policies: profiles
-- -----------------------------------------------------------------------------

create policy profiles_select_authenticated
on public.profiles
for select
to authenticated
using (true);

create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_delete_self
on public.profiles
for delete
to authenticated
using (id = auth.uid());

-- -----------------------------------------------------------------------------
-- 6) Policies: pieces
-- -----------------------------------------------------------------------------

create policy pieces_select_accessible
on public.pieces
for select
to authenticated
using (public.can_access_piece(id));

create policy pieces_insert_owner
on public.pieces
for insert
to authenticated
with check (owner_id = auth.uid());

create policy pieces_update_owner_open
on public.pieces
for update
to authenticated
using (
  owner_id = auth.uid()
  and status <> 'completed'
)
with check (owner_id = auth.uid());

create policy pieces_delete_owner
on public.pieces
for delete
to authenticated
using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 7) Policies: collaborators
-- -----------------------------------------------------------------------------

create policy collaborators_select_owner_or_invitee
on public.collaborators
for select
to authenticated
using (
  public.is_piece_owner(piece_id)
  or lower(invitee_email) = public.current_user_email()
);

create policy collaborators_insert_owner_only
on public.collaborators
for insert
to authenticated
with check (
  public.is_piece_owner(piece_id)
  and public.is_piece_open(piece_id)
);

create policy collaborators_update_owner_only
on public.collaborators
for update
to authenticated
using (
  public.is_piece_owner(piece_id)
  and public.is_piece_open(piece_id)
)
with check (
  public.is_piece_owner(piece_id)
  and public.is_piece_open(piece_id)
);

create policy collaborators_delete_owner_only
on public.collaborators
for delete
to authenticated
using (
  public.is_piece_owner(piece_id)
  and public.is_piece_open(piece_id)
);

-- -----------------------------------------------------------------------------
-- 8) Policies: comments
-- -----------------------------------------------------------------------------

create policy comments_select_piece_access
on public.comments
for select
to authenticated
using (public.can_access_piece(piece_id));

create policy comments_insert_piece_access_open
on public.comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.can_access_piece(piece_id)
  and public.is_piece_open(piece_id)
);

create policy comments_update_own_open
on public.comments
for update
to authenticated
using (
  author_id = auth.uid()
  and public.is_piece_open(piece_id)
)
with check (
  author_id = auth.uid()
  and public.can_access_piece(piece_id)
  and public.is_piece_open(piece_id)
);

create policy comments_delete_own_open
on public.comments
for delete
to authenticated
using (
  author_id = auth.uid()
  and public.is_piece_open(piece_id)
);

-- -----------------------------------------------------------------------------
-- 9) Policies: versions
-- -----------------------------------------------------------------------------

create policy versions_select_piece_access
on public.versions
for select
to authenticated
using (public.can_access_piece(piece_id));

create policy versions_insert_owner_open
on public.versions
for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.is_piece_owner(piece_id)
  and public.is_piece_open(piece_id)
);

create policy versions_update_own_open
on public.versions
for update
to authenticated
using (
  author_id = auth.uid()
  and public.is_piece_open(piece_id)
)
with check (
  author_id = auth.uid()
  and public.is_piece_open(piece_id)
);

create policy versions_delete_own_open
on public.versions
for delete
to authenticated
using (
  author_id = auth.uid()
  and public.is_piece_open(piece_id)
);

-- -----------------------------------------------------------------------------
-- 10) Policies: version_chains + projects (optional tables)
-- -----------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.version_chains') is not null then
    execute $sql$
      create policy version_chains_select_owner_email
      on public.version_chains
      for select
      to authenticated
      using (lower(coalesce(author_email, '')) = public.current_user_email())
    $sql$;

    execute $sql$
      create policy version_chains_insert_owner_email
      on public.version_chains
      for insert
      to authenticated
      with check (lower(coalesce(author_email, '')) = public.current_user_email())
    $sql$;

    execute $sql$
      create policy version_chains_update_owner_email
      on public.version_chains
      for update
      to authenticated
      using (lower(coalesce(author_email, '')) = public.current_user_email())
      with check (lower(coalesce(author_email, '')) = public.current_user_email())
    $sql$;

    execute $sql$
      create policy version_chains_delete_owner_email
      on public.version_chains
      for delete
      to authenticated
      using (lower(coalesce(author_email, '')) = public.current_user_email())
    $sql$;
  end if;

  if to_regclass('public.projects') is not null then
    execute $sql$
      create policy projects_select_owner
      on public.projects
      for select
      to authenticated
      using (user_id = auth.uid())
    $sql$;

    execute $sql$
      create policy projects_insert_owner
      on public.projects
      for insert
      to authenticated
      with check (user_id = auth.uid())
    $sql$;

    execute $sql$
      create policy projects_update_owner
      on public.projects
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid())
    $sql$;

    execute $sql$
      create policy projects_delete_owner
      on public.projects
      for delete
      to authenticated
      using (user_id = auth.uid())
    $sql$;
  end if;
end $$;
