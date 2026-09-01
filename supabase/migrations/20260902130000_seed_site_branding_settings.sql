-- Public, non-secret branding used by shared navigation, footer and contact UI.

update public.sites
set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
  'contact_email', 'info@seattledesitv.com',
  'whatsapp_number', '+14254397388',
  'phone_display', '+1 (425) 439-7388',
  'whatsapp_group_url', 'https://chat.whatsapp.com/JLcTwKowPeDFySvoNv5sXm',
  'logo_url', '/sdtv-logo.png',
  'youtube_url', 'https://www.youtube.com/@SeattleDesiTV',
  'instagram_url', 'https://instagram.com/seattledesitv',
  'facebook_url', 'https://facebook.com/seattledesitv',
  'region_description', 'Community media, culture, events, radio, interviews, and stories across the Pacific Northwest.'
), updated_at = now()
where code = 'sea';

update public.sites
set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
  'region_description', 'Community media, culture, events, radio, interviews, and stories for the San Francisco Bay Area.'
), updated_at = now()
where code = 'sfo';

update public.sites
set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
  'region_description', 'Community media, culture, events, radio, interviews, and stories for Dallas–Fort Worth.'
), updated_at = now()
where code = 'dal';
