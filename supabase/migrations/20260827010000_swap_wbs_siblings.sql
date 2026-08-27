begin;

-- Deferrable uniqueness allows two complete code subtrees to exchange their
-- prefixes in one UPDATE without a transient duplicate during row processing.
drop index public.wbs_items_project_code_unique;
alter table public.wbs_items add constraint wbs_items_project_code_unique
  unique(project_id,wbs_code) deferrable initially immediate;

create function public.swap_wbs_siblings(p_project_id uuid, p_source_id uuid, p_target_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  source_item public.wbs_items;
  target_item public.wbs_items;
begin
  if not public.can_edit_wbs_project(p_project_id) then raise exception 'permission_denied'; end if;
  if p_source_id=p_target_id then return; end if;

  select * into source_item from public.wbs_items where id=p_source_id and project_id=p_project_id for update;
  select * into target_item from public.wbs_items where id=p_target_id and project_id=p_project_id for update;
  if not found or source_item.id is null or source_item.parent_id is distinct from target_item.parent_id then
    raise exception 'siblings_required';
  end if;

  -- A single statement keeps the unique WBS-code constraint valid while swapping
  -- both roots and every descendant prefix atomically.
  update public.wbs_items
  set wbs_code=case
        when wbs_code=source_item.wbs_code or wbs_code like source_item.wbs_code||'.%'
          then target_item.wbs_code||substr(wbs_code,char_length(source_item.wbs_code)+1)
        else source_item.wbs_code||substr(wbs_code,char_length(target_item.wbs_code)+1)
      end,
      sort_order=case
        when id=source_item.id then target_item.sort_order
        when id=target_item.id then source_item.sort_order
        else sort_order
      end
  where project_id=p_project_id
    and (wbs_code=source_item.wbs_code or wbs_code like source_item.wbs_code||'.%'
      or wbs_code=target_item.wbs_code or wbs_code like target_item.wbs_code||'.%');
end;
$$;

revoke all on function public.swap_wbs_siblings(uuid,uuid,uuid) from public;
grant execute on function public.swap_wbs_siblings(uuid,uuid,uuid) to authenticated;

commit;
