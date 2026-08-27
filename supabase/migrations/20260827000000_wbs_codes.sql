begin;

-- Give existing rows stable hierarchy numbers before making the number unique.
with recursive ranked as (
  select item.*, row_number() over (partition by item.project_id,item.parent_id order by item.sort_order,item.created_at,item.id) as sibling_number
  from public.wbs_items item
), numbered as (
  select item.id, item.project_id, item.sibling_number::text as code
  from ranked item where item.parent_id is null
  union all
  select child.id, child.project_id, numbered.code||'.'||child.sibling_number::text
  from ranked child join numbered on numbered.id=child.parent_id
)
update public.wbs_items item set wbs_code=numbered.code from numbered where item.id=numbered.id and item.wbs_code is null;

alter table public.wbs_items alter column wbs_code set not null;
alter table public.wbs_items add constraint wbs_items_code_format check (wbs_code ~ '^[1-9][0-9]*(\.[1-9][0-9]*)*$');
create unique index wbs_items_project_code_unique on public.wbs_items(project_id,wbs_code);

commit;
