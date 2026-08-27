begin;

-- The first version of this RPC was committed in 20260827010000, but some
-- deployed databases do not have that migration in their migration history.
-- Keep this migration self-contained so it can repair those databases too.
drop index if exists public.wbs_items_project_code_unique;
alter table public.wbs_items
  drop constraint if exists wbs_items_project_code_unique;
alter table public.wbs_items
  add constraint wbs_items_project_code_unique
  unique (project_id, wbs_code) deferrable initially immediate;

drop function if exists public.swap_wbs_siblings(uuid, uuid, uuid);
create function public.swap_wbs_siblings(
  p_project_id uuid,
  p_source_id uuid,
  p_target_id uuid
)
returns setof public.wbs_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_item public.wbs_items;
  target_item public.wbs_items;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not public.can_edit_wbs_project(p_project_id) then
    raise exception 'permission_denied' using errcode = '42501';
  end if;

  -- Always acquire both row locks in UUID order so concurrent swaps cannot
  -- deadlock by locking the same siblings in opposite directions.
  perform 1
  from public.wbs_items
  where project_id = p_project_id
    and id in (p_source_id, p_target_id)
  order by id
  for update;

  select * into source_item
  from public.wbs_items
  where project_id = p_project_id and id = p_source_id;
  select * into target_item
  from public.wbs_items
  where project_id = p_project_id and id = p_target_id;

  if source_item.id is null or target_item.id is null then
    raise exception 'items_not_found';
  end if;
  if source_item.id = target_item.id then
    return query select * from public.wbs_items where id = source_item.id;
    return;
  end if;
  if source_item.parent_id is distinct from target_item.parent_id then
    raise exception 'siblings_required';
  end if;

  -- Code prefixes and root sort_order values move together. Deferring the
  -- project/code constraint prevents a transient collision during the swap.
  set constraints wbs_items_project_code_unique deferred;
  return query
  update public.wbs_items item
  set wbs_code = case
        when item.wbs_code = source_item.wbs_code
          or item.wbs_code like source_item.wbs_code || '.%'
          then target_item.wbs_code
            || substr(item.wbs_code, char_length(source_item.wbs_code) + 1)
        else source_item.wbs_code
          || substr(item.wbs_code, char_length(target_item.wbs_code) + 1)
      end,
      sort_order = case
        when item.id = source_item.id then target_item.sort_order
        when item.id = target_item.id then source_item.sort_order
        else item.sort_order
      end
  where item.project_id = p_project_id
    and (
      item.wbs_code = source_item.wbs_code
      or item.wbs_code like source_item.wbs_code || '.%'
      or item.wbs_code = target_item.wbs_code
      or item.wbs_code like target_item.wbs_code || '.%'
    )
  returning item.*;
end;
$$;

revoke all on function public.swap_wbs_siblings(uuid, uuid, uuid) from public;
grant execute on function public.swap_wbs_siblings(uuid, uuid, uuid) to authenticated;

commit;
