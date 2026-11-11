import { PGlite } from './node_modules/@electric-sql/pglite/dist/index.js';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated;
create table app_settings(key text primary key,value text,updated_at timestamptz);
create table students(id text primary key,points integer not null default 0,updated_at timestamptz default now());
create table point_transactions(id text primary key,student_id text references students(id),amount integer,type text,reason text,previous_points integer,new_points integer,created_at timestamptz);
insert into students(id,points) values('start',0),('catchup',0),('expired',0),('overlap',0),('failure',0),('config',0);
insert into app_settings(key,value) values('login_xp_start_time','00:00'),('login_xp_end_time','23:59'),('login_xp_per_minute','2'),('login_xp_confirmation_minutes','10');`);
const sql = readFileSync('supabase/login_xp.sql','utf8'); await db.exec(sql); await db.exec(sql);
const call = async (fn,id) => (await db.query(`select public.${fn}($1) as value`,[id])).rows[0].value;
const balance = async id => (await db.query('select points from students where id=$1',[id])).rows[0].points;
const fixture = async (student,elapsed,limit=10) => (await db.query(`insert into login_xp_sessions(student_id,started_at,last_confirmed_at,next_award_at,active_until,xp_per_minute)
values($1,clock_timestamp()-make_interval(secs=>$2),clock_timestamp()-make_interval(secs=>$2),clock_timestamp()-make_interval(secs=>$2)+interval '1 minute',clock_timestamp()-make_interval(secs=>$2)+make_interval(mins=>$3),2) returning session_id`,[student,elapsed,limit])).rows[0].session_id;
const starts = await Promise.all(Array.from({length:30},()=>call('start_login_xp_session','start')));
assert.equal(new Set(starts.map(r=>r.sessionId)).size,1); assert.equal(await balance('start'),0);
const beforeUntil = starts[0].activeUntil; await call('confirm_login_xp_activity',starts[0].sessionId); const afterConfirm=await call('get_login_xp_session_status','start'); assert.equal(afterConfirm.activeUntil,beforeUntil);
assert.equal((await call('claim_login_xp',starts[0].sessionId)).reason,'too_early');
const catchupId=await fixture('catchup',242), catchup=await call('claim_login_xp',catchupId);
assert.equal(catchup.amount,8); assert.equal(catchup.creditedMinutes,4); assert.equal(await balance('catchup'),8);
const replays=await Promise.all(Array.from({length:40},()=>call('claim_login_xp',catchupId)));
assert.ok(replays.every(r=>!r.awarded)); assert.equal(await balance('catchup'),8);
const expiredId=await fixture('expired',602), expired=await call('claim_login_xp',expiredId);
assert.equal(expired.amount,20); assert.equal(expired.closed,true); assert.equal(await balance('expired'),20);
assert.equal((await call('claim_login_xp',expiredId)).awarded,false);
const overlapping1=await fixture('overlap',242), overlapping2=await fixture('overlap',242);
await Promise.all([call('claim_login_xp',overlapping1),call('claim_login_xp',overlapping2)]);
assert.equal(await balance('overlap'),8);
// A failed ledger insert must roll back the balance AND session cursor.
const failureId=await fixture('failure',122);
await db.exec(`create function fail_ledger() returns trigger language plpgsql as $$ begin if new.student_id='failure' then raise exception 'ledger unavailable'; end if; return new; end; $$;
create trigger simulate_ledger_failure before insert on point_transactions for each row execute function fail_ledger();`);
await assert.rejects(()=>call('claim_login_xp',failureId)); assert.equal(await balance('failure'),0);
await db.exec('drop trigger simulate_ledger_failure on point_transactions;'); assert.equal((await call('claim_login_xp',failureId)).amount,4);
// Expired credit is settled before a new presence window starts.
await db.exec(`insert into students(id,points) values('restart',0);`); const restartOld=await fixture('restart',602); const restart=await call('start_login_xp_session','restart');
assert.notEqual(restart.sessionId,restartOld); assert.equal(restart.points,20); assert.equal(await balance('restart'),20);
assert.equal((await call('claim_login_xp',restartOld)).awarded,false);
// Rate is captured when the session starts, not multiplied by changed settings.
await db.exec(`update app_settings set value='3' where key='login_xp_per_minute';`);
const configStart=await call('start_login_xp_session','config'); assert.equal(configStart.xpPerMinute,3);
await db.exec(`update app_settings set value='999999999999' where key='login_xp_per_minute'; update app_settings set value='invalid' where key='login_xp_confirmation_minutes';`);
const clean=(await db.query('select public.login_xp_config() as value')).rows[0].value; assert.equal(clean.xpPerMinute,2);assert.equal(clean.confirmationMinutes,10);
await db.exec(sql); assert.equal(await balance('expired'),20);assert.equal(await balance('catchup'),8);
assert.equal((await db.query(`select has_function_privilege('anon','public.login_xp_snapshot(uuid)','execute') as allowed`)).rows[0].allowed,false);
console.log(JSON.stringify({sqlReapplies:true,parallelStarts:30,replayedClaims:40,noDuplicateCredit:true,delayedMinutesRecovered:true,lastMinutePaid:true,overlappingSessionsSafe:true,transactionRollback:true,restartSettlesPrevious:true,rateSnapshot:true,invalidSettingsSafe:true,privateHelper:true}));
await db.close();
