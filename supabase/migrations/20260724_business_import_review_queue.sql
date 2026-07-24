-- Business import review queue for publicly discovered listings.
-- Run in Supabase SQL Editor before deploying the Studio UI update.

alter table public.local_businesses
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists import_batch text,
  add column if not exists imported_at timestamptz,
  add column if not exists review_notes text;

create index if not exists local_businesses_status_import_batch_idx
  on public.local_businesses (status, import_batch);

with seed(name, address, website, category, source_name, source_url) as (
  values
    ('Kanishka Cuisine of India', '16651 Redmond Way, Redmond, WA', 'https://www.kanishkaredmond.com', 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Redmond'),
    ('Araya''s Place', '31 Bellevue Way NE, Bellevue, WA 98004', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Bhojan Express', '1105 Bellevue Way NE, Suite A4, Bellevue, WA 98004', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Bombay House', '15100 SE 38th St, Suite 305A, Bellevue, WA 98006', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Chutneys', '938 110th Ave NE, Bellevue, WA 98004', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Curry Point 2Go', '14510 NE 20th St, Bellevue, WA 98007', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Farzi Cafe', '515 Bellevue Square, Bellevue, WA 98004', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('India Gate Restaurant', '3080 148th Ave SE, Bellevue, WA', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('India King', '1411 156th Ave NE, Bellevue, WA 98007', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Mayuri Indian Cuisine', '15400 NE 20th St, Suite 6, Bellevue, WA', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Moghul Palace India Cuisine', '677 120th Ave NE, Bellevue, WA 98005', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Moksha Indian Cuisine', '515 Bellevue Square, Bellevue, WA 98004', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Ruchi Indian Restaurant', '1360 156th Ave NE, Bellevue, WA 98007', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Spice Route', '2241 148th Ave NE, Bellevue, WA 98007', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Taj Palace', '2331 140th Ave NE, Bellevue, WA 98005', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Tamarindos Indian Restaurant', '15100 SE 38th St, Bellevue, WA 98006', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Udupi Cafe and Chaat Corner', '14625 NE 24th St, Bellevue, WA 98007', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Bellevue'),
    ('Paradise Biryani House', '16564 Cleveland St, Suite S, Redmond, WA 98052', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=1&city=Redmond'),
    ('Pabla Indian Cuisine', '364 Renton Center Way SW, Suite C60, Renton, WA', 'https://www.pablacuisine.com', 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businesslist.asp?catid=1&city=seattle&showtype=a&sub_cat=31'),
    ('Ammi''s Pakwan', '510 Broadway E, Seattle, WA 98102', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businesslist.asp?catid=1&city=seattle&showtype=a&sub_cat=31'),
    ('Clay Pit Cuisine of India', '15418 Main St, Suite M107, Mill Creek, WA 98012', null, 'Restaurant', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businesslist.asp?catid=1&city=Mill+Creek&sub_cat=31'),
    ('Apna Bazar', '2245 148th Ave NE, Bellevue, WA 98007', null, 'Indian Grocery', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=2&city=Bellevue'),
    ('Desi Halal Mart', '14508 NE 20th St, Suite 101, Bellevue, WA 98007', null, 'Indian Grocery', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=2&city=Bellevue'),
    ('India Metro Hypermarket', '653 156th Ave NE, Bellevue, WA 98007', null, 'Indian Grocery', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=2&city=Bellevue'),
    ('India Super Market', '14625 NE 20th St, Bellevue, WA 98007', null, 'Indian Grocery', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=2&city=Bellevue'),
    ('Swagath Food & Groceries', '14504 NE 20th St, Bellevue, WA 98007', null, 'Indian Grocery', 'SeattleIndian.com', 'https://www.seattleindian.com/seattle/businessList.asp?catid=2&city=Bellevue')
)
insert into public.local_businesses (
  name, address, website, category, status, approved,
  source_name, source_url, import_batch, imported_at, review_notes
)
select
  seed.name,
  seed.address,
  seed.website,
  seed.category,
  'pending',
  false,
  seed.source_name,
  seed.source_url,
  'greater-seattle-2026-07-24-01',
  now(),
  'Publicly discovered listing. Verify current business name, address, website and operating status before approval.'
from seed
where not exists (
  select 1
  from public.local_businesses existing
  where lower(trim(existing.name)) = lower(trim(seed.name))
    and lower(trim(coalesce(existing.address, ''))) = lower(trim(seed.address))
);
