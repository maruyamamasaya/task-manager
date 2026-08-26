begin;

create table public.wbs_projects (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200), description text check (description is null or char_length(description)<=5000),
  status text not null default 'active' check(status in ('active','completed','archived')),
  share_code text not null unique check (share_code ~ '^WBSP-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  join_mode text not null default 'approval' check(join_mode in ('disabled','approval','viewer','editor')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.wbs_project_members (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.wbs_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role text not null default 'viewer' check(role in ('editor','viewer')),
  joined_at timestamptz not null default now(), created_at timestamptz not null default now(), unique(project_id,user_id)
);
create table public.wbs_join_requests (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.wbs_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, requested_role text not null default 'viewer' check(requested_role in ('viewer','editor')),
  status text not null default 'pending' check(status in ('pending','approved','rejected')), created_at timestamptz not null default now(), responded_at timestamptz,
  unique(project_id,user_id)
);
create table public.wbs_items (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.wbs_projects(id) on delete cascade,
  parent_id uuid references public.wbs_items(id) on delete cascade, wbs_code text, name text not null check(char_length(name) between 1 and 500),
  description text check(description is null or char_length(description)<=10000), start_date date, end_date date,
  owner_name text check(owner_name is null or char_length(owner_name)<=200), status text not null default 'not_started' check(status in ('not_started','in_progress','completed','on_hold')),
  progress integer not null default 0 check(progress between 0 and 100), estimate_hours numeric(10,2) check(estimate_hours is null or estimate_hours>=0),
  actual_hours numeric(10,2) check(actual_hours is null or actual_hours>=0), sort_order integer not null default 0,
  note text check(note is null or char_length(note)<=10000), created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(end_date is null or start_date is null or end_date>=start_date),
  unique(project_id,id)
);
alter table public.wbs_items add constraint wbs_items_parent_same_project foreign key(project_id,parent_id) references public.wbs_items(project_id,id) on delete cascade;
create table public.wbs_dependencies (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.wbs_projects(id) on delete cascade,
  predecessor_item_id uuid not null, successor_item_id uuid not null,
  dependency_type text not null default 'FS' check(dependency_type in ('FS','SS','FF','SF')), lag_days integer not null default 0, created_at timestamptz not null default now(),
  unique(predecessor_item_id,successor_item_id,dependency_type), check(predecessor_item_id<>successor_item_id),
  foreign key(project_id,predecessor_item_id) references public.wbs_items(project_id,id) on delete cascade,
  foreign key(project_id,successor_item_id) references public.wbs_items(project_id,id) on delete cascade
);

create index wbs_projects_owner_idx on public.wbs_projects(owner_user_id); create index wbs_projects_share_code_idx on public.wbs_projects(share_code);
create index wbs_project_members_user_idx on public.wbs_project_members(user_id); create index wbs_project_members_project_idx on public.wbs_project_members(project_id);
create index wbs_join_requests_project_idx on public.wbs_join_requests(project_id); create index wbs_join_requests_user_idx on public.wbs_join_requests(user_id);
create index wbs_items_project_idx on public.wbs_items(project_id); create index wbs_items_parent_idx on public.wbs_items(parent_id);
create index wbs_items_project_sort_idx on public.wbs_items(project_id,parent_id,sort_order); create index wbs_dependencies_project_idx on public.wbs_dependencies(project_id);
create trigger wbs_projects_updated_at before update on public.wbs_projects for each row execute function public.set_updated_at();
create trigger wbs_items_updated_at before update on public.wbs_items for each row execute function public.set_updated_at();

create function public.is_wbs_project_owner(p_project_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.wbs_projects p where p.id=p_project_id and p.owner_user_id=(select auth.uid())); $$;
create function public.can_view_wbs_project(p_project_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_wbs_project_owner(p_project_id) or exists(select 1 from public.wbs_project_members m where m.project_id=p_project_id and m.user_id=(select auth.uid())); $$;
create function public.can_edit_wbs_project(p_project_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_wbs_project_owner(p_project_id) or exists(select 1 from public.wbs_project_members m where m.project_id=p_project_id and m.user_id=(select auth.uid()) and m.role='editor'); $$;

create function public.validate_wbs_item_tree() returns trigger language plpgsql set search_path='' as $$
declare cursor_id uuid; cursor_project uuid; begin
 if new.parent_id is null then return new; end if; if new.parent_id=new.id then raise exception 'WBS item cannot parent itself'; end if;
 cursor_id:=new.parent_id; while cursor_id is not null loop
   select project_id,parent_id into cursor_project,cursor_id from public.wbs_items where id=cursor_id;
   if cursor_project<>new.project_id then raise exception 'WBS parent belongs to another project'; end if;
   if cursor_id=new.id then raise exception 'WBS hierarchy cycle detected'; end if;
 end loop; return new; end; $$;
create trigger wbs_items_validate_tree before insert or update of parent_id,project_id on public.wbs_items for each row execute function public.validate_wbs_item_tree();

create function public.join_wbs_project(p_share_code text) returns text language plpgsql security definer set search_path='' as $$
declare p public.wbs_projects; uid uuid:=(select auth.uid()); normalized text:=upper(trim(p_share_code)); begin
 if uid is null then raise exception 'authentication_required'; end if;
 select * into p from public.wbs_projects where share_code=normalized; if not found then raise exception 'project_not_found'; end if;
 if p.owner_user_id=uid then raise exception 'already_owner'; end if;
 if exists(select 1 from public.wbs_project_members where project_id=p.id and user_id=uid) then raise exception 'already_member'; end if;
 if p.join_mode='disabled' then raise exception 'join_disabled';
 elsif p.join_mode='approval' then
   insert into public.wbs_join_requests(project_id,user_id,requested_role) values(p.id,uid,'viewer')
   on conflict(project_id,user_id) do update set status='pending',requested_role='viewer',created_at=now(),responded_at=null where public.wbs_join_requests.status='rejected';
   if not found then raise exception 'request_pending'; end if; return 'pending';
 else insert into public.wbs_project_members(project_id,user_id,role) values(p.id,uid,p.join_mode); return p.join_mode; end if;
end; $$;
create function public.respond_wbs_join_request(p_request_id uuid,p_approve boolean,p_role text default 'viewer') returns void language plpgsql security definer set search_path='' as $$
declare r public.wbs_join_requests; begin select * into r from public.wbs_join_requests where id=p_request_id for update;
 if not found or r.status<>'pending' then raise exception 'request_not_pending'; end if; if not public.is_wbs_project_owner(r.project_id) then raise exception 'permission_denied'; end if;
 if p_approve then if p_role not in ('viewer','editor') then raise exception 'invalid_role'; end if; insert into public.wbs_project_members(project_id,user_id,role) values(r.project_id,r.user_id,p_role) on conflict(project_id,user_id) do update set role=excluded.role; end if;
 update public.wbs_join_requests set status=case when p_approve then 'approved' else 'rejected' end,requested_role=case when p_approve then p_role else requested_role end,responded_at=now() where id=r.id; end; $$;

alter table public.wbs_projects enable row level security; alter table public.wbs_project_members enable row level security; alter table public.wbs_join_requests enable row level security; alter table public.wbs_items enable row level security; alter table public.wbs_dependencies enable row level security;
create policy wbs_projects_select on public.wbs_projects for select to authenticated using(public.can_view_wbs_project(id));
create policy wbs_projects_insert on public.wbs_projects for insert to authenticated with check(owner_user_id=(select auth.uid()));
create policy wbs_projects_update on public.wbs_projects for update to authenticated using(public.is_wbs_project_owner(id)) with check(public.is_wbs_project_owner(id));
create policy wbs_projects_delete on public.wbs_projects for delete to authenticated using(public.is_wbs_project_owner(id));
create policy wbs_members_select on public.wbs_project_members for select to authenticated using(public.can_view_wbs_project(project_id));
create policy wbs_members_owner_insert on public.wbs_project_members for insert to authenticated with check(public.is_wbs_project_owner(project_id));
create policy wbs_members_owner_update on public.wbs_project_members for update to authenticated using(public.is_wbs_project_owner(project_id)) with check(public.is_wbs_project_owner(project_id));
create policy wbs_members_owner_delete on public.wbs_project_members for delete to authenticated using(public.is_wbs_project_owner(project_id));
create policy wbs_requests_select on public.wbs_join_requests for select to authenticated using(user_id=(select auth.uid()) or public.is_wbs_project_owner(project_id));
create policy wbs_requests_owner_update on public.wbs_join_requests for update to authenticated using(public.is_wbs_project_owner(project_id)) with check(public.is_wbs_project_owner(project_id));
create policy wbs_items_select on public.wbs_items for select to authenticated using(public.can_view_wbs_project(project_id));
create policy wbs_items_insert on public.wbs_items for insert to authenticated with check(public.can_edit_wbs_project(project_id) and created_by=(select auth.uid()));
create policy wbs_items_update on public.wbs_items for update to authenticated using(public.can_edit_wbs_project(project_id)) with check(public.can_edit_wbs_project(project_id));
create policy wbs_items_delete on public.wbs_items for delete to authenticated using(public.can_edit_wbs_project(project_id));
create policy wbs_dependencies_select on public.wbs_dependencies for select to authenticated using(public.can_view_wbs_project(project_id));
create policy wbs_dependencies_insert on public.wbs_dependencies for insert to authenticated with check(public.can_edit_wbs_project(project_id));
create policy wbs_dependencies_update on public.wbs_dependencies for update to authenticated using(public.can_edit_wbs_project(project_id)) with check(public.can_edit_wbs_project(project_id));
create policy wbs_dependencies_delete on public.wbs_dependencies for delete to authenticated using(public.can_edit_wbs_project(project_id));

grant select,insert,update,delete on public.wbs_projects,public.wbs_project_members,public.wbs_join_requests,public.wbs_items,public.wbs_dependencies to authenticated;
revoke all on function public.is_wbs_project_owner(uuid),public.can_view_wbs_project(uuid),public.can_edit_wbs_project(uuid),public.join_wbs_project(text),public.respond_wbs_join_request(uuid,boolean,text) from public;
grant execute on function public.is_wbs_project_owner(uuid),public.can_view_wbs_project(uuid),public.can_edit_wbs_project(uuid),public.join_wbs_project(text),public.respond_wbs_join_request(uuid,boolean,text) to authenticated;
commit;
