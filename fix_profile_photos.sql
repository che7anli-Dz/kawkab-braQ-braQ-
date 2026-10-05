-- ============================================
-- 🔧 إصلاح حفظ صور البروفايل والغلاف
-- المشكلة: UPDATE يرجع بلا خطأ بصح ما يحفظش
-- ============================================

-- 1) تأكد الأعمدة كاينة
alter table kb_profiles add column if not exists avatar_url text;
alter table kb_profiles add column if not exists cover_url text;

-- 2) امحي كل سياسات kb_profiles وعاود اصنعهم صحاح
drop policy if exists "kb_profiles_read" on kb_profiles;
drop policy if exists "kb_profiles_insert" on kb_profiles;
drop policy if exists "kb_profiles_update" on kb_profiles;
drop policy if exists "kb_profiles_owner" on kb_profiles;

create policy "kb_profiles_read" on kb_profiles
  for select to authenticated using (true);

create policy "kb_profiles_insert" on kb_profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "kb_profiles_update" on kb_profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "kb_profiles_owner" on kb_profiles
  for all to authenticated using (kb_is_owner());

-- 3) تأكد bucket الصور كاين
insert into storage.buckets (id, name, public)
values ('kb-avatars','kb-avatars', true)
on conflict (id) do nothing;

-- 4) تحقق: شوف السياسات دروك
select policyname, cmd from pg_policies where tablename = 'kb_profiles';
