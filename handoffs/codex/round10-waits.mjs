import {connectDatabase} from '../../database/customer/src/index.ts';
import {loadProfile} from '../../shared/testing/src/config.ts';
const p=connectDatabase(loadProfile()).pool;
try {console.log((await p.query("select datname,pid,state,wait_event_type,wait_event,left(query,200) as query,pg_blocking_pids(pid) as blockers from pg_stat_activity where state <> 'idle' and pid<>pg_backend_pid()")).rows);} finally {await p.end();}
