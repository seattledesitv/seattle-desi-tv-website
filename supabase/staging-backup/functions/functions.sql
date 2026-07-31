-- Functions captured from production.

CREATE OR REPLACE FUNCTION public.is_sdtv_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
      and role in ('pm_admin', 'super_admin')
  );
$function$;

CREATE OR REPLACE FUNCTION public.mark_volunteer_onboarding_submitted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.user_role_requests
  set status = 'awaiting_team_role_access'
  where id = new.volunteer_request_id
    and requested_role = 'volunteer'
    and status = 'awaiting_onboarding';

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;
