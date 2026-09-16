const fs=require('fs'), vm=require('vm'), crypto=require('crypto');
const SCRATCH=process.argv[2];
const H=require(__dirname+'/_lib.js');
const ctx=H.load('cod.gs.txt');
let fail=0; const ok=m=>console.log('  \x1b[32m✔\x1b[0m '+m); const bad=m=>{fail++;console.log('  \x1b[31m✘\x1b[0m '+m);};

console.log('\n\x1b[1mG. doGet — injectarea datelor direct în pagină\x1b[0m');

const noTok = vm.runInContext('JSON.parse(lastTemplate(doGet({parameter:{}})))', ctx);
ok('Fără token → pagină de login (' + JSON.stringify({token:noTok.token, data:noTok.data}) + ')');
if (noTok.token !== '' || noTok.data !== null) bad('ar fi trebuit token gol și date nule');

const bad1 = vm.runInContext('JSON.parse(lastTemplate(doGet({parameter:{t:"token-inventat"}})))', ctx);
bad1.token === '' && bad1.data === null ? ok('Token invalid → ignorat, pagină de login') : bad('token invalid acceptat!');

const tok = vm.runInContext('portalLogin("0723028164","Andrei","ua").token', ctx);
const good = vm.runInContext(`JSON.parse(lastTemplate(doGet({parameter:{t:${JSON.stringify(tok)}}})))`, ctx);
good.token === tok ? ok('Token valid → sesiune recunoscută pe server') : bad('token valid nerecunoscut');
(good.data && good.data.length === 2) ? ok('Datele ambilor frați sunt injectate în pagină (0 apeluri suplimentare)') : bad('datele nu au fost injectate: '+JSON.stringify(good.data && good.data.length));
good.gdprOk === false ? ok('Starea GDPR vine de la server (false inițial)') : bad('gdprOk gresit');
good.installUrl.indexOf('?t=') > -1 ? ok('installUrl pentru scurtătura de pe ecranul principal') : bad('installUrl lipsă');

vm.runInContext(`portalAcceptGdpr(${JSON.stringify(tok)})`, ctx);
const after = vm.runInContext(`JSON.parse(lastTemplate(doGet({parameter:{t:${JSON.stringify(tok)}}})))`, ctx);
after.gdprOk === true ? ok('După acceptare, GDPR rămâne true la relansare (persistă)') : bad('GDPR nu persistă!');

const raw = vm.runInContext(`lastTemplate(doGet({parameter:{t:${JSON.stringify(tok)}}}))`, ctx);
raw.indexOf('<') === -1 ? ok('Serializarea nu conține "<" — imposibil de închis tagul <script>') : bad('serializare nesigură');

console.log(fail ? '\n\x1b[31m'+fail+' eșec(uri)\x1b[0m\n' : '\n\x1b[32mToate testele doGet au trecut.\x1b[0m\n');
process.exit(fail?1:0);
