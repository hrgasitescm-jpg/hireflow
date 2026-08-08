-- Shim lanjutan: Supabase otomatis memberi privilege tabel ke role anon/authenticated.
-- Di PostgreSQL polos kita harus melakukannya manual, SETELAH migrasi jalan.
-- (Privilege tabel dan RLS adalah dua lapis berbeda: privilege menentukan
--  "boleh menyentuh tabel ini?", RLS menentukan "baris mana yang terlihat?".)

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
