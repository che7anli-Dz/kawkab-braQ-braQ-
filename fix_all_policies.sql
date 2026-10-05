-- ============================================
-- 🔧 إصلاح جذري: مسح كل سياسات kb_profiles
-- (حتى المخفية) وإعادة الصحاح
-- ============================================

-- 1) شوف السياسات الحالية قبل المسح
select policyname, cmd, permissive from pg_policies where tablename = 'kb_profiles';

-- 2) امسح كل السياسات بلا استثناء
do $$
declare r record;
begin
  for r in select policyname from pg_policies where tablename = 'kb_profiles' loop
    execute format('drop policy if exists %I on kb_profiles', r.policyname);
  end loop;
end $$;

-- 3) عاود اصنع غير الصحاح
create policy "kb_profiles_read" on kb_profiles
  for select to authenticated using (true);

create policy "kb_profiles_insert" on kb_profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "kb_profiles_update" on kb_profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4) سياسة المالك (إذا الدالة كاينة)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'kb_is_owner') then
    create policy "kb_profiles_owner" on kb_profiles
      for all to authenticated using (kb_is_owner());
  end if;
end $$;

-- 5) تحقق
select policyname, cmd, permissive from pg_policies where tablename = 'kb_profiles';
