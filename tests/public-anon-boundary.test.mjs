import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../supabase/migrations/20261017083434_public_anon_boundary.sql", import.meta.url), "utf8");
const signatures = [
  "apply_messenger_message_receipts(text,text)", "claim_crm_follow_up_alert_pushes(text,text)",
  "complete_crm_follow_up_alert_pushes(text,text)", "ingest_facebook_comments_webhook(text,text)",
  "ingest_instagram_webhook(text,text)", "ingest_line_webhook(text,text)",
  "ingest_messenger_webhook(text,text)", "ingest_meta_ad_daily_snapshots(text,text)",
  "ingest_website_chat_webhook(text,text,text)", "list_messenger_push_targets(text,text,text)",
];
const db = new PGlite();
after(() => db.close());
const query = async (sql) => (await db.query(sql)).rows;
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create role supabase_admin; create role test_harness superuser;
  set session authorization test_harness;
  create role migration_runner;
  grant postgres to migration_runner;
  grant create on schema public to migration_runner;
  set role migration_runner;
  create table public.private_inventory(id int, secret text, published boolean, status text);
  insert into public.private_inventory values (1,'private',true,'available'),(2,'sold',true,'sold'),(3,'unpublished',false,'available');
  alter table public.private_inventory enable row level security;
  create policy owner_policy on public.private_inventory to postgres using (true);
  create view public.public_vehicle_listings with (security_barrier=true) as select id,status from public.private_inventory where published and status in ('available','reserved');
  create view public.public_approved_articles with (security_barrier=true) as select 1 as id;
  create table public.column_only(secret text, another text);
  create sequence public.private_seq;
  grant all on public.private_inventory, public.public_vehicle_listings, public.public_approved_articles to public, anon;
  grant select(secret),update(another) on public.column_only to public, anon;
  grant all on public.private_seq to public, anon;
  grant select,update on public.private_inventory to authenticated with grant option;
  grant all on public.private_inventory to service_role;
  create function public.internal_rpc() returns int language sql as 'select 1';
  create function public.restricted_rpc() returns int language sql as 'select 1';
  revoke all on function public.restricted_rpc() from public;
  grant execute on function public.restricted_rpc() to service_role with grant option;
  create function public.ingest_line_webhook(int) returns int language sql as 'select 1';
  alter default privileges for role postgres grant all on tables to public, anon;
  alter default privileges for role postgres grant all on sequences to public, anon;
  alter default privileges for role postgres grant execute on functions to anon;
  alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges for role postgres in schema public grant execute on functions to public, anon, authenticated, service_role;
`);
for (const signature of signatures) await db.exec(`create function public.${signature} returns int language sql security definer as 'select 1'`);
// These fixtures test ACLs only, not the production HMAC implementations.
const effective = () => query(`
  select role, c.relname as object, privilege, has_table_privilege(role,c.oid,privilege) as allowed
  from pg_class c join pg_namespace n on n.oid=c.relnamespace,
  (values ('authenticated'),('service_role')) r(role), (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('SELECT WITH GRANT OPTION'),('UPDATE WITH GRANT OPTION')) p(privilege)
  where n.nspname='public' and c.relkind in ('r','v')
  union all
  select role, p.oid::regprocedure::text, privilege, has_function_privilege(role,p.oid,privilege)
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace,
  (values ('authenticated'),('service_role')) r(role), (values ('EXECUTE'),('EXECUTE WITH GRANT OPTION')) x(privilege)
  where n.nspname='public'
  union all
  select role, c.relname, privilege, has_sequence_privilege(role,c.oid,privilege)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace,
  (values ('authenticated'),('service_role')) r(role), (values ('SELECT'),('USAGE'),('UPDATE')) x(privilege)
  where n.nspname='public' and c.relkind='S'
  union all
  select role, 'column_only.'||a.attname, privilege, has_column_privilege(role,a.attrelid,a.attnum,privilege)
  from pg_attribute a, (values ('authenticated'),('service_role')) r(role), (values ('SELECT'),('UPDATE'),('INSERT'),('REFERENCES')) x(privilege)
  where a.attrelid='public.column_only'::regclass and a.attnum>0
  order by 1,2,3
`);
const before = await effective();
const definitions = () => query(`select c.relname, pg_get_viewdef(c.oid) as definition, c.reloptions from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v' order by 1`);
const viewsBefore = await definitions();
const policiesBefore = await query("select * from pg_policies order by policyname");
const docs = readFileSync(new URL("../docs/PUBLIC-ANON-BOUNDARY.md", import.meta.url), "utf8");
const rollbackGenerator = docs.match(/<!-- rollback-generator -->\s*```sql\n([\s\S]*?)\n```/)[1];
const rollback = (await query(rollbackGenerator))[0].rollback_sql;

test("migration is idempotent and skips inaccessible platform-owner defaults", async () => {
  assert.equal((await query("select pg_has_role(current_user,'supabase_admin','MEMBER') as member"))[0].member, false);
  await db.exec(migration);
  await db.exec(migration);
  assert.deepEqual(await effective(), before);
  assert.deepEqual(await definitions(), viewsBefore);
  assert.deepEqual(await query("select * from pg_policies order by policyname"), policiesBefore);
  assert.equal((await query("select count(*)::int as n from public.private_inventory"))[0].n, 3);
});

test("anon reads only the two owner-backed views; no table, column or sequence writes", async () => {
  const objects = await query(`select c.oid,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v')`);
  for (const { oid, relname } of objects) {
    const safe = ["public_vehicle_listings", "public_approved_articles"].includes(relname);
    assert.equal((await query(`select has_table_privilege('anon',${oid},'SELECT') as ok`))[0].ok, safe);
    for (const privilege of ["INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"])
      assert.equal((await query(`select has_table_privilege('anon',${oid},'${privilege}') as ok`))[0].ok, false);
  }
  await db.exec("set role anon");
  try {
    assert.deepEqual(await query("select * from public.public_vehicle_listings"), [{ id: 1, status: "available" }]);
    await query("select * from public.public_approved_articles");
    for (const sql of ["select * from public.private_inventory", "select secret from public.column_only", "update public.column_only set another='x'", "insert into public.public_vehicle_listings(id,status) values (4,'available')", "select nextval('public.private_seq')", "select * from public.private_seq"])
      await assert.rejects(() => query(sql), /permission denied/);
  } finally { await db.exec("set role migration_runner"); }
});

test("only exact signed RPC signatures remain executable by anon", async () => {
  const allowed = await query("select p.oid::regprocedure::text as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and has_function_privilege('anon',p.oid,'EXECUTE') order by 1");
  assert.deepEqual(allowed.map((r) => r.signature), [...signatures].sort());
  assert.equal((await query("select has_function_privilege('anon','public.ingest_line_webhook(int)','EXECUTE') as ok"))[0].ok, false);
});

test("future postgres objects get no anon/PUBLIC grants but retain trusted defaults", async () => {
  await db.exec("set role postgres; create table public.future_private(id int); create sequence public.future_seq; create function public.future_rpc() returns int language sql as 'select 1'; set role migration_runner");
  for (const role of ["anon", "authenticated", "service_role"]) {
    const expected = role !== "anon";
    for (const expr of ["has_table_privilege(ROLE,'public.future_private','SELECT,INSERT,UPDATE,DELETE')", "has_sequence_privilege(ROLE,'public.future_seq','USAGE,SELECT,UPDATE')", "has_function_privilege(ROLE,'public.future_rpc()','EXECUTE')"])
      assert.equal((await query(`select ${expr.replace("ROLE", `'${role}'`)} as ok`))[0].ok, expected);
  }
  assert.equal((await query("select count(*)::int as n from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a where d.defaclrole='postgres'::regrole and d.defaclobjtype in ('r','S','f') and d.defaclnamespace in (0,'public'::regnamespace) and a.grantee in (0,'anon'::regrole)"))[0].n, 0);
});

test("supabase_admin defaults are hardened when membership is available", async () => {
  await db.exec(`reset role; grant supabase_admin to migration_runner; grant create on schema public to supabase_admin;
    alter default privileges for role supabase_admin in schema public grant all on tables to public, anon, authenticated, service_role;
    alter default privileges for role supabase_admin in schema public grant all on sequences to public, anon, authenticated, service_role;
    alter default privileges for role supabase_admin in schema public grant execute on functions to public, anon, authenticated, service_role;
    set role migration_runner;`);
  await db.exec(migration);
  await db.exec("set role supabase_admin; create table public.platform_future(id int); create sequence public.platform_seq; create function public.platform_rpc() returns int language sql as 'select 1'; set role migration_runner");
  for (const expression of ["has_table_privilege('anon','public.platform_future','SELECT,INSERT')", "has_sequence_privilege('anon','public.platform_seq','USAGE,SELECT,UPDATE')", "has_function_privilege('anon','public.platform_rpc()','EXECUTE')"])
    assert.equal((await query(`select ${expression} as ok`))[0].ok, false);
});

test("missing signed RPC aborts migration without partial changes", async () => {
  await db.exec("drop function public.ingest_line_webhook(text,text); grant select on public.private_inventory to anon");
  await assert.rejects(() => db.exec(migration), /Required signed RPC missing/);
  await db.exec("rollback");
  assert.equal((await query("select has_table_privilege('anon','public.private_inventory','SELECT') as ok"))[0].ok, true);
  await db.exec("create function public.ingest_line_webhook(text,text) returns int language sql security definer as 'select 1'");
  await db.exec(migration);
});

test("unexpected inherited anon access aborts instead of silently weakening the boundary", async () => {
  await db.exec("reset role; create role legacy_reader; grant legacy_reader to anon; grant select on public.private_inventory to legacy_reader; set role migration_runner");
  await assert.rejects(() => db.exec(migration), /Unexpected inherited anon privileges/);
  await db.exec("rollback; reset role; revoke legacy_reader from anon; set role migration_runner");
  await db.exec(migration);
});

test("documented pre-change rollback generator restores the removed ACL boundary", async () => {
  await db.exec(rollback);
  assert.equal((await query("select has_table_privilege('anon','public.private_inventory','INSERT') as ok"))[0].ok, true);
  assert.equal((await query("select has_column_privilege('anon','public.column_only','secret','SELECT') as ok"))[0].ok, true);
  assert.equal((await query("select has_function_privilege('anon','public.internal_rpc()','EXECUTE') as ok"))[0].ok, true);
  assert.equal((await query("select has_sequence_privilege('anon','public.private_seq','USAGE') as ok"))[0].ok, true);
  // Undo rollback inside this disposable database only; never contact production.
  await db.exec(migration);
});
