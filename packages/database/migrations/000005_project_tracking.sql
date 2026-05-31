create table projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null,
  source_lead_id uuid,
  name text not null,
  status text not null default 'discovery',
  description text,
  scope_summary text,
  budget_amount integer,
  currency char(3) not null default 'USD',
  start_date date,
  target_launch_date date,
  launched_at timestamptz,
  completed_at timestamptz,
  repo_url text,
  staging_url text,
  production_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_tenant_id_id_unique unique (tenant_id, id),
  constraint projects_client_tenant_fk foreign key (tenant_id, client_id) references clients (tenant_id, id) on delete cascade,
  constraint projects_source_lead_tenant_fk foreign key (tenant_id, source_lead_id) references leads (tenant_id, id),
  constraint projects_name_not_blank check (length(trim(name)) > 0),
  constraint projects_status_valid check (
    status in (
      'discovery',
      'scope_approved',
      'in_progress',
      'client_review',
      'revision',
      'ready_to_launch',
      'launched',
      'maintenance',
      'completed',
      'paused',
      'cancelled'
    )
  ),
  constraint projects_budget_amount_non_negative check (budget_amount is null or budget_amount >= 0),
  constraint projects_currency_valid check (currency ~ '^[A-Z]{3}$'),
  constraint projects_target_launch_after_start check (
    start_date is null or target_launch_date is null or target_launch_date >= start_date
  )
);

create index projects_tenant_client_idx on projects (tenant_id, client_id);
create index projects_tenant_status_idx on projects (tenant_id, status);
create index projects_tenant_target_launch_idx on projects (tenant_id, target_launch_date);
create index projects_tenant_created_at_idx on projects (tenant_id, created_at desc);

create trigger projects_set_updated_at
before update on projects
for each row
execute function set_updated_at();

alter table activity_events
drop constraint activity_events_entity_type_valid;

alter table activity_events
add constraint activity_events_entity_type_valid check (entity_type in ('lead', 'project'));

alter table activity_events
drop constraint activity_events_event_type_valid;

alter table activity_events
add constraint activity_events_event_type_valid check (
  event_type in (
    'lead.created',
    'lead.stage_changed',
    'lead.note_added',
    'lead.follow_up_scheduled',
    'lead.follow_up_completed',
    'lead.marked_won',
    'lead.marked_lost',
    'lead_converted_to_client',
    'project_created',
    'project_status_changed'
  )
);
