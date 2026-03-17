-- GenbaSnap 初期スキーマ
-- organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

-- users
create table public.users (
  id uuid primary key references auth.users(id),
  org_id uuid not null references public.organizations(id),
  email text not null,
  name text not null,
  role text not null default 'member' check (role in ('admin', 'manager', 'member')),
  created_at timestamptz not null default now()
);

-- projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  name text not null,
  code text,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  address text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

-- construction_types（工種）
create table public.construction_types (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- construction_parts（部位）
create table public.construction_parts (
  id uuid primary key default gen_random_uuid(),
  type_id uuid not null references public.construction_types(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- photos
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type_id uuid references public.construction_types(id),
  part_id uuid references public.construction_parts(id),
  storage_path text not null,
  thumbnail_path text,
  original_filename text,
  taken_at timestamptz,
  lat double precision,
  lng double precision,
  description text,
  ai_analysis jsonb default '{}',
  blackboard_ocr jsonb default '{}',
  status text not null default 'pending' check (status in ('pending', 'analyzed', 'confirmed')),
  uploaded_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- schedules（工程）
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type_id uuid references public.construction_types(id),
  name text not null,
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ledger_templates
create table public.ledger_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  name text not null,
  layout_config jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- RLS有効化
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.construction_types enable row level security;
alter table public.construction_parts enable row level security;
alter table public.photos enable row level security;
alter table public.schedules enable row level security;
alter table public.ledger_templates enable row level security;

-- organizations ポリシー
create policy "Users can view own org"
  on public.organizations for select
  using (id = (select org_id from public.users where id = auth.uid()));

create policy "Admins can update org"
  on public.organizations for update
  using (id = (select org_id from public.users where id = auth.uid())
    and (select role from public.users where id = auth.uid()) = 'admin');

-- users ポリシー
create policy "Users can view own org members"
  on public.users for select
  using (org_id = (select org_id from public.users where id = auth.uid()));

create policy "Users can update own profile"
  on public.users for update
  using (id = auth.uid());

-- projects ポリシー
create policy "Users can view own org projects"
  on public.projects for select
  using (org_id = (select org_id from public.users where id = auth.uid()));

create policy "Admins and managers can insert projects"
  on public.projects for insert
  with check (
    org_id = (select org_id from public.users where id = auth.uid())
    and (select role from public.users where id = auth.uid()) in ('admin', 'manager')
  );

create policy "Admins and managers can update projects"
  on public.projects for update
  using (
    org_id = (select org_id from public.users where id = auth.uid())
    and (select role from public.users where id = auth.uid()) in ('admin', 'manager')
  );

-- construction_types ポリシー
create policy "Users can view construction types"
  on public.construction_types for select
  using (
    project_id in (
      select id from public.projects
      where org_id = (select org_id from public.users where id = auth.uid())
    )
  );

create policy "Admins and managers can manage construction types"
  on public.construction_types for all
  using (
    project_id in (
      select id from public.projects
      where org_id = (select org_id from public.users where id = auth.uid())
    )
    and (select role from public.users where id = auth.uid()) in ('admin', 'manager')
  );

-- construction_parts ポリシー
create policy "Users can view construction parts"
  on public.construction_parts for select
  using (
    type_id in (
      select ct.id from public.construction_types ct
      join public.projects p on p.id = ct.project_id
      where p.org_id = (select org_id from public.users where id = auth.uid())
    )
  );

create policy "Admins and managers can manage construction parts"
  on public.construction_parts for all
  using (
    type_id in (
      select ct.id from public.construction_types ct
      join public.projects p on p.id = ct.project_id
      where p.org_id = (select org_id from public.users where id = auth.uid())
    )
    and (select role from public.users where id = auth.uid()) in ('admin', 'manager')
  );

-- photos ポリシー
create policy "Users can view own org photos"
  on public.photos for select
  using (
    project_id in (
      select id from public.projects
      where org_id = (select org_id from public.users where id = auth.uid())
    )
  );

create policy "Users can insert photos"
  on public.photos for insert
  with check (
    project_id in (
      select id from public.projects
      where org_id = (select org_id from public.users where id = auth.uid())
    )
  );

create policy "Users can update own org photos"
  on public.photos for update
  using (
    project_id in (
      select id from public.projects
      where org_id = (select org_id from public.users where id = auth.uid())
    )
  );

-- schedules ポリシー
create policy "Users can view own org schedules"
  on public.schedules for select
  using (
    project_id in (
      select id from public.projects
      where org_id = (select org_id from public.users where id = auth.uid())
    )
  );

create policy "Admins and managers can manage schedules"
  on public.schedules for all
  using (
    project_id in (
      select id from public.projects
      where org_id = (select org_id from public.users where id = auth.uid())
    )
    and (select role from public.users where id = auth.uid()) in ('admin', 'manager')
  );

-- ledger_templates ポリシー
create policy "Users can view own org templates"
  on public.ledger_templates for select
  using (org_id = (select org_id from public.users where id = auth.uid()));

create policy "Admins can manage templates"
  on public.ledger_templates for all
  using (
    org_id = (select org_id from public.users where id = auth.uid())
    and (select role from public.users where id = auth.uid()) in ('admin', 'manager')
  );

-- インデックス
create index idx_photos_project on public.photos(project_id);
create index idx_photos_type on public.photos(type_id);
create index idx_photos_taken_at on public.photos(taken_at);
create index idx_photos_status on public.photos(status);
create index idx_schedules_project on public.schedules(project_id);
create index idx_projects_org on public.projects(org_id);
create index idx_users_org on public.users(org_id);

-- ユーザー新規登録時に自動的にusersレコードを作成するトリガー
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  new_org_id uuid;
begin
  -- メタデータからorg_idがあればそれを使用、なければ新規組織を作成
  if new.raw_user_meta_data->>'org_id' is not null then
    new_org_id := (new.raw_user_meta_data->>'org_id')::uuid;
  else
    insert into public.organizations (name)
    values (coalesce(new.raw_user_meta_data->>'company_name', '未設定'))
    returning id into new_org_id;
  end if;

  insert into public.users (id, org_id, email, name, role)
  values (
    new.id,
    new_org_id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
