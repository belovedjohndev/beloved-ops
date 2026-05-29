alter table clients
add column company_name text,
add column website_url text,
add column source_lead_id uuid,
add column status text not null default 'active';

update clients
set company_name = null,
    website_url = null,
    status = 'active';

alter table clients
add constraint clients_status_valid check (status in ('active', 'inactive', 'archived')),
add constraint clients_source_lead_tenant_fk foreign key (tenant_id, source_lead_id) references leads (tenant_id, id);

create unique index clients_tenant_source_lead_unique_idx
on clients (tenant_id, source_lead_id)
where source_lead_id is not null;

create index clients_tenant_status_idx on clients (tenant_id, status);

create table client_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null,
  name text not null,
  email citext,
  phone text,
  role text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_contacts_client_tenant_fk foreign key (tenant_id, client_id) references clients (tenant_id, id) on delete cascade,
  constraint client_contacts_name_not_blank check (length(trim(name)) > 0),
  constraint client_contacts_email_shape check (email is null or position('@' in email::text) > 1)
);

create unique index client_contacts_one_primary_per_client_idx
on client_contacts (tenant_id, client_id)
where is_primary = true;

create index client_contacts_tenant_client_idx on client_contacts (tenant_id, client_id);
create index client_contacts_tenant_email_idx on client_contacts (tenant_id, email);

create trigger client_contacts_set_updated_at
before update on client_contacts
for each row
execute function set_updated_at();

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
    'lead_converted_to_client'
  )
);
