-- Recalculate every derived parent value whenever a child task changes.
-- A single trigger keeps status, progress, and effort in sync in one transaction.
drop trigger if exists wbs_items_roll_up_parent_effort on public.wbs_items;
drop trigger if exists wbs_items_roll_up_parent_status_progress on public.wbs_items;

create or replace function public.recalculate_wbs_parents_on_child_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cursor_id uuid;
  next_cursor_id uuid;
  start_ids uuid[];
  affected_projects uuid[];
  rolled_status text;
  rolled_progress integer;
begin
  -- The updates below also touch wbs_items. The outer call already recalculates
  -- the complete affected tree, so do not start another recursive pass.
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'INSERT' then
    start_ids := array[new.parent_id];
    affected_projects := array[new.project_id];
  elsif tg_op = 'DELETE' then
    start_ids := array[old.parent_id];
    affected_projects := array[old.project_id];
  else
    start_ids := array[new.parent_id, old.parent_id];
    affected_projects := array[new.project_id, old.project_id];
  end if;

  -- Effort is the sum of leaf tasks. Recompute every parent in both projects so
  -- moving a subtree also removes its effort from the former ancestors.
  with recursive descendants as (
    select parent.id as ancestor_id, child.id as descendant_id
    from public.wbs_items parent
    join public.wbs_items child on child.parent_id = parent.id
    where parent.project_id = any(affected_projects)
    union all
    select descendants.ancestor_id, child.id
    from descendants
    join public.wbs_items child on child.parent_id = descendants.descendant_id
  ), leaf_rollups as (
    select
      descendants.ancestor_id,
      coalesce(sum(leaf.estimate_hours), 0)::numeric(10,2) as estimate_hours,
      coalesce(sum(leaf.actual_hours), 0)::numeric(10,2) as actual_hours
    from descendants
    join public.wbs_items leaf on leaf.id = descendants.descendant_id
    where not exists (
      select 1 from public.wbs_items child where child.parent_id = leaf.id
    )
    group by descendants.ancestor_id
  )
  update public.wbs_items parent
  set estimate_hours = rollup.estimate_hours,
      actual_hours = rollup.actual_hours
  from leaf_rollups rollup
  where parent.id = rollup.ancestor_id
    and (parent.estimate_hours is distinct from rollup.estimate_hours
      or parent.actual_hours is distinct from rollup.actual_hours);

  -- State and progress use immediate children. Walking upward makes each level
  -- consume the freshly recalculated value of the level below it.
  foreach cursor_id in array start_ids loop
    while cursor_id is not null loop
      select parent_id into next_cursor_id
      from public.wbs_items
      where id = cursor_id;

      select
        case
          when bool_and(status = 'completed') then 'completed'
          when bool_or(status = 'in_progress') then 'in_progress'
          else 'not_started'
        end,
        round(avg(progress))::integer
      into rolled_status, rolled_progress
      from public.wbs_items
      where parent_id = cursor_id;

      -- If the final child was deleted, this task is a leaf again and retains
      -- its last manually entered state, progress, and effort.
      if rolled_progress is not null then
        update public.wbs_items
        set status = rolled_status,
            progress = rolled_progress
        where id = cursor_id
          and (status is distinct from rolled_status
            or progress is distinct from rolled_progress);
      end if;

      cursor_id := next_cursor_id;
    end loop;
  end loop;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger wbs_items_recalculate_parents_on_child_change
after insert or delete or update
on public.wbs_items
for each row execute function public.recalculate_wbs_parents_on_child_change();

