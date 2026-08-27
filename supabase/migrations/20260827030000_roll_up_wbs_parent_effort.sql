-- Keep parent effort as a read-only rollup of all leaf tasks below it.
create or replace function public.roll_up_wbs_parent_effort()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_project uuid;
begin
  affected_project := case when tg_op = 'DELETE' then old.project_id else new.project_id end;

  -- Updates made by this function also fire the trigger; one pass already computes
  -- every ancestor from leaf values, so nested trigger calls can be skipped.
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  with recursive descendants as (
    select parent.id as ancestor_id, child.id as descendant_id
    from public.wbs_items parent
    join public.wbs_items child on child.parent_id = parent.id
    where parent.project_id = affected_project
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

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger wbs_items_roll_up_parent_effort
after insert or delete or update of parent_id, project_id, estimate_hours, actual_hours
on public.wbs_items
for each row execute function public.roll_up_wbs_parent_effort();

-- Bring existing parent tasks in line immediately when the migration is applied.
with recursive descendants as (
  select parent.id as ancestor_id, child.id as descendant_id
  from public.wbs_items parent
  join public.wbs_items child on child.parent_id = parent.id
  union all
  select descendants.ancestor_id, child.id
  from descendants
  join public.wbs_items child on child.parent_id = descendants.descendant_id
), leaf_rollups as (
  select descendants.ancestor_id,
    coalesce(sum(leaf.estimate_hours), 0)::numeric(10,2) as estimate_hours,
    coalesce(sum(leaf.actual_hours), 0)::numeric(10,2) as actual_hours
  from descendants
  join public.wbs_items leaf on leaf.id = descendants.descendant_id
  where not exists (select 1 from public.wbs_items child where child.parent_id = leaf.id)
  group by descendants.ancestor_id
)
update public.wbs_items parent
set estimate_hours = rollup.estimate_hours,
    actual_hours = rollup.actual_hours
from leaf_rollups rollup
where parent.id = rollup.ancestor_id;
