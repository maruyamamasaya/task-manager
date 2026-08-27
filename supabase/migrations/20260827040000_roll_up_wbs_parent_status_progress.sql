-- Parent state and progress are derived from their immediate children.
create or replace function public.roll_up_wbs_parent_status_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cursor_id uuid;
  next_cursor_id uuid;
  start_ids uuid[];
  rolled_status text;
  rolled_progress integer;
begin
  -- Updates performed below fire this trigger too; the outer invocation already
  -- walks every affected ancestor in bottom-up order.
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'INSERT' then
    start_ids := array[new.parent_id];
  elsif tg_op = 'DELETE' then
    start_ids := array[old.parent_id];
  else
    start_ids := array[new.parent_id, old.parent_id];
  end if;

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

      -- A task whose final child was removed becomes a leaf again. Keep its last
      -- values rather than replacing them with values from an empty child set.
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

create trigger wbs_items_roll_up_parent_status_progress
after insert or delete or update of parent_id, project_id, status, progress
on public.wbs_items
for each row execute function public.roll_up_wbs_parent_status_progress();

-- Normalize existing trees from the deepest parents upward so every parent uses
-- already-rolled-up values from child tasks that are themselves parents.
do $$
declare
  parent_row record;
begin
  for parent_row in
    with recursive tree as (
      select id, parent_id, 0 as depth from public.wbs_items where parent_id is null
      union all
      select child.id, child.parent_id, tree.depth + 1
      from public.wbs_items child
      join tree on child.parent_id = tree.id
    )
    select tree.id
    from tree
    where exists (select 1 from public.wbs_items child where child.parent_id = tree.id)
    order by tree.depth desc
  loop
    update public.wbs_items parent
    set status = rollup.status,
        progress = rollup.progress
    from (
      select
        case
          when bool_and(status = 'completed') then 'completed'
          when bool_or(status = 'in_progress') then 'in_progress'
          else 'not_started'
        end as status,
        round(avg(progress))::integer as progress
      from public.wbs_items
      where parent_id = parent_row.id
    ) rollup
    where parent.id = parent_row.id;
  end loop;
end;
$$;
