-- Enable pgcrypto for encryption functions
create extension if not exists "pgcrypto";

-- Create enum for environments
create type public.environment_type as enum ('production', 'development', 'staging');

-- Create enum for user roles
create type public.app_role as enum ('admin', 'user');

-- Create profiles table for additional user info
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Create user_roles table (security best practice)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone not null default now(),
  unique (user_id, role)
);

-- Create api_keys table with encrypted secrets
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  provider text not null,
  environment environment_type not null default 'production',
  encrypted_secret text not null,
  tags text[] default array[]::text[],
  notes text,
  expires_at timestamp with time zone,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  is_deleted boolean not null default false
);

-- Create key_audit table for logging reveals and actions
create table public.key_audit (
  id uuid primary key default gen_random_uuid(),
  key_id uuid references public.api_keys(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  action text not null,
  ip_address inet,
  user_agent text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.api_keys enable row level security;
alter table public.key_audit enable row level security;

-- Create security definer function for role checking
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS Policies for profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- RLS Policies for user_roles
create policy "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "Admins can manage all roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for api_keys
create policy "Users can view their own keys"
  on public.api_keys for select
  using (auth.uid() = user_id and is_deleted = false);

create policy "Users can insert their own keys"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own keys"
  on public.api_keys for update
  using (auth.uid() = user_id);

create policy "Users can delete their own keys"
  on public.api_keys for delete
  using (auth.uid() = user_id);

-- RLS Policies for key_audit
create policy "Users can view their own audit logs"
  on public.key_audit for select
  using (auth.uid() = user_id);

create policy "System can insert audit logs"
  on public.key_audit for insert
  with check (auth.uid() = user_id);

-- Create function to update timestamps
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for automatic timestamp updates
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at_column();

create trigger update_api_keys_updated_at
  before update on public.api_keys
  for each row
  execute function public.update_updated_at_column();

-- Create function to create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create indexes for better performance
create index idx_api_keys_user_id on public.api_keys(user_id);
create index idx_api_keys_environment on public.api_keys(environment);
create index idx_api_keys_tags on public.api_keys using gin(tags);
create index idx_key_audit_key_id on public.key_audit(key_id);
create index idx_key_audit_user_id on public.key_audit(user_id);
create index idx_user_roles_user_id on public.user_roles(user_id);