create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_name_not_blank check (length(trim(name)) > 0),
  constraint tenants_slug_not_blank check (length(trim(slug::text)) > 0)
);

create trigger tenants_set_updated_at
before update on tenants
for each row
execute function set_updated_at();

create table users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_display_name_not_blank check (length(trim(display_name)) > 0),
  constraint users_email_shape check (position('@' in email::text) > 1)
);

create trigger users_set_updated_at
before update on users
for each row
execute function set_updated_at();

create table tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_memberships_role_valid check (role in ('owner', 'admin', 'member', 'viewer')),
  constraint tenant_memberships_unique_user_per_tenant unique (tenant_id, user_id)
);

create index tenant_memberships_user_id_idx on tenant_memberships (user_id);
create index tenant_memberships_tenant_role_idx on tenant_memberships (tenant_id, role);

create trigger tenant_memberships_set_updated_at
before update on tenant_memberships
for each row
execute function set_updated_at();

create table clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_name_not_blank check (length(trim(name)) > 0),
  constraint clients_tenant_id_id_unique unique (tenant_id, id)
);

create index clients_tenant_name_idx on clients (tenant_id, name);

create trigger clients_set_updated_at
before update on clients
for each row
execute function set_updated_at();

create table leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  source text,
  client_name text,
  contact_name text,
  contact_email citext,
  contact_phone text,
  company_name text,
  website_url text,
  platform_url text,
  budget_min integer,
  budget_max integer,
  currency char(3) not null default 'USD',
  fit_score integer not null default 3,
  stage text not null default 'new',
  priority text not null default 'medium',
  next_follow_up_at timestamptz,
  lost_reason text,
  won_client_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_tenant_id_id_unique unique (tenant_id, id),
  constraint leads_title_not_blank check (length(trim(title)) > 0),
  constraint leads_contact_email_shape check (contact_email is null or position('@' in contact_email::text) > 1),
  constraint leads_budget_min_non_negative check (budget_min is null or budget_min >= 0),
  constraint leads_budget_max_non_negative check (budget_max is null or budget_max >= 0),
  constraint leads_budget_range_valid check (budget_min is null or budget_max is null or budget_min <= budget_max),
  constraint leads_currency_valid check (currency ~ '^[A-Z]{3}$'),
  constraint leads_fit_score_valid check (fit_score between 1 and 5),
  constraint leads_stage_valid check (stage in ('new', 'qualified', 'proposal_sent', 'replied', 'interview_scheduled', 'won', 'lost', 'archived')),
  constraint leads_priority_valid check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint leads_lost_reason_required check (stage <> 'lost' or length(trim(coalesce(lost_reason, ''))) > 0),
  constraint leads_won_client_tenant_fk foreign key (tenant_id, won_client_id) references clients (tenant_id, id)
);

create index leads_tenant_stage_idx on leads (tenant_id, stage);
create index leads_tenant_priority_idx on leads (tenant_id, priority);
create index leads_tenant_next_follow_up_idx on leads (tenant_id, next_follow_up_at);
create index leads_tenant_created_at_idx on leads (tenant_id, created_at desc);
create index leads_tenant_search_idx on leads (tenant_id, title, client_name, company_name, contact_name);

create trigger leads_set_updated_at
before update on leads
for each row
execute function set_updated_at();

create table lead_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  lead_id uuid not null,
  author_user_id uuid not null references users(id),
  note_type text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_notes_lead_tenant_fk foreign key (tenant_id, lead_id) references leads (tenant_id, id) on delete cascade,
  constraint lead_notes_type_valid check (note_type in ('general', 'client_message', 'call_summary', 'proposal_note', 'decision', 'risk', 'scope_change', 'follow_up')),
  constraint lead_notes_body_not_blank check (length(trim(body)) > 0)
);

create index lead_notes_tenant_lead_created_at_idx on lead_notes (tenant_id, lead_id, created_at desc);

create trigger lead_notes_set_updated_at
before update on lead_notes
for each row
execute function set_updated_at();

create table lead_follow_ups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  lead_id uuid not null,
  title text not null,
  due_at timestamptz not null,
  completed_at timestamptz,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_follow_ups_lead_tenant_fk foreign key (tenant_id, lead_id) references leads (tenant_id, id) on delete cascade,
  constraint lead_follow_ups_title_not_blank check (length(trim(title)) > 0)
);

create index lead_follow_ups_tenant_lead_due_at_idx on lead_follow_ups (tenant_id, lead_id, due_at);
create index lead_follow_ups_tenant_due_open_idx on lead_follow_ups (tenant_id, due_at) where completed_at is null;

create trigger lead_follow_ups_set_updated_at
before update on lead_follow_ups
for each row
execute function set_updated_at();

create table activity_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_user_id uuid not null references users(id),
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_events_entity_type_valid check (entity_type in ('lead')),
  constraint activity_events_event_type_valid check (event_type in ('lead.created', 'lead.stage_changed', 'lead.note_added', 'lead.follow_up_scheduled', 'lead.follow_up_completed', 'lead.marked_won', 'lead.marked_lost'))
);

create index activity_events_tenant_entity_idx on activity_events (tenant_id, entity_type, entity_id, created_at desc);
create index activity_events_tenant_created_at_idx on activity_events (tenant_id, created_at desc);

insert into tenants (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Beloved John Dev', 'beloved-john-dev')
on conflict (id) do nothing;

insert into users (id, email, display_name)
values ('00000000-0000-0000-0000-000000000002', 'john@belovedjohndev.local', 'Beloved John Dev')
on conflict (id) do nothing;

insert into tenant_memberships (tenant_id, user_id, role)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'owner')
on conflict (tenant_id, user_id) do nothing;
