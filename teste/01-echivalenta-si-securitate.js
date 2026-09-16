const fs = require('fs'), vm = require('vm'), crypto = require('crypto');
const SCRATCH = process.argv[2];

function mkSheet(name, ath) {
  const W = 45, blank = () => new Array(W).fill('');
  const rows = [], bgs = [], push = (r, b) => { rows.push(r); bgs.push(b || blank().map(() => '#ffffff')); };
  let r = blank(); r[0] = 'PORTOCALIU SI VERDE  LUNI/MIERCURI 19:00-20:00'; push(r);
  r = blank(); r[0]='SAPT'; r[1]='ABO'; r[2]='ANTR'; r[3]='NUME/PRENUME'; r[4]='CONTACT';
  [1,2,3,4,5].forEach((d,i) => r[5+i] = d); r[10] = 'ZILE FIXE'; push(r);
  ath.forEach(a => {
    const row = blank();
    row[1]=a.perWeek; row[2]=a.coach; row[3]=a.nume; row[4]=a.contact;
    a.marks.forEach((m,i) => row[5+i] = m);
    row[10]=a.zileFixe; row[31]=a.tarif; row[32]=a.dataPlata; row[41]=a.metoda; row[42]=a.info;
    const bg = blank().map(() => '#ffffff');
    if (a.bgPresent != null) bg[5 + a.bgPresent] = '#d9f2d9';
    push(row, bg);
  });
  return { getName: () => name, getLastRow: () => rows.length, getLastColumn: () => W,
    getDataRange: () => ({ getValues: () => rows, getBackgrounds: () => bgs }),
    getRange: (r1,c1,nR,nC) => ({
      getValues: () => rows.slice(r1-1,r1-1+nR).map(x => x.slice(c1-1,c1-1+nC)),
      getBackgrounds: () => bgs.slice(r1-1,r1-1+nR).map(x => x.slice(c1-1,c1-1+nC)) }) };
}

/* Set CURAT: formate pe care și codul vechi le trata corect => echivalență strictă */
const CLEAN_SEP = [
  { nume:'POPESCU ANDREI', coach:'DANIEL', contact:'0723 028 164', perWeek:2, marks:['P','','AB','E',''], bgPresent:1, zileFixe:'LUNI/MIERCURI 19:00-20:00', tarif:'300', dataPlata:'05.09.2026', metoda:'ACHITAT BANCA', info:'Anuntat din timp' },
  { nume:'POPESCU MARIA',  coach:'BIANCA', contact:'0723 028 164', perWeek:1, marks:['P','P','','','R'], zileFixe:'MARTI/JOI', tarif:'200', dataPlata:'', metoda:'', info:'' },
  { nume:'IONESCU RARES',  coach:'DANIEL', contact:'0744 111 222', perWeek:3, marks:['V','P','P','P','P'], zileFixe:'', tarif:'400', dataPlata:'', metoda:'ACHITAT CASH', info:'' }
];
const CLEAN_AUG = [
  { nume:'POPESCU ANDREI', coach:'DANIEL', contact:'0723 028 164', perWeek:2, marks:['P','P','P','AB',''], zileFixe:'LUNI/MIERCURI 19:00-20:00', tarif:'300', dataPlata:'03.08.2026', metoda:'ACHITAT POS', info:'' }
];

/* Set MURDAR: formate reale din fișierul-mamă (puncte, două numere, celulă scurtă) */
const MESSY_SEP = [
  { nume:'POPESCU ANDREI', coach:'DANIEL', contact:'0723.028.164', perWeek:2, marks:['P','P','','',''], zileFixe:'', tarif:'300', dataPlata:'', metoda:'ACHITAT BANCA', info:'' },
  { nume:'VLAD TUDOR',     coach:'BIANCA', contact:'0744 111 222 / 0755 333 444', perWeek:1, marks:['P','','','',''], zileFixe:'', tarif:'200', dataPlata:'', metoda:'', info:'' },
  { nume:'SECRET COPIL',   coach:'DANIEL', contact:'072', perWeek:1, marks:['P','','','',''], zileFixe:'', tarif:'100', dataPlata:'', metoda:'', info:'' }
];

/* Registru de sesiuni în memorie (simulează spreadsheet-ul containerului) */
function memSheet(name) {
  const cells = [];
  const at = (r,c) => { while (cells.length < r) cells.push([]); const row = cells[r-1]; while (row.length < c) row.push(''); return row; };
  const api = {
    getName: () => name,
    getLastRow: () => cells.length,
    setFrozenRows: () => api, hideSheet: () => api,
    appendRow: v => { cells.push(v.slice()); },
    deleteRow: r => { cells.splice(r-1,1); },
    getRange: (r,c,nR,nC) => {
      nR = nR||1; nC = nC||1;
      const g = {
        getValues: () => { const o=[]; for(let i=0;i<nR;i++){ const row=at(r+i,c+nC-1); o.push(row.slice(c-1,c-1+nC)); } return o; },
        setValues: v => { for(let i=0;i<nR;i++){ const row=at(r+i,c+nC-1); for(let j=0;j<nC;j++) row[c-1+j]=v[i][j]; } return g; },
        setValue: v => g.setValues([[v]]),
        setFontWeight: () => g, setBackground: () => g, setFontColor: () => g
      };
      return g;
    }
  };
  return api;
}

function makeSandbox(sheets) {
  const cache = {}, dp = {}, container = {};
  const bag = { getProperty: k => (k in dp ? dp[k] : null), setProperty: (k,v) => { dp[k] = String(v); } };
  return { console,
    SpreadsheetApp: {
      openById: () => ({ getSheets: () => sheets, getSheetByName: () => null }),
      getActiveSpreadsheet: () => ({
        getId: () => 'CONTAINER_ID',
        getSheetByName: n => container[n] || null,
        insertSheet: n => (container[n] = memSheet(n)),
        getSheets: () => Object.keys(container).map(k => container[k])
      })
    },
    PropertiesService: { getDocumentProperties: () => bag, getScriptProperties: () => bag },
    CacheService: { getScriptCache: () => ({
      get: k => (k in cache ? cache[k] : null), put: (k,v) => { cache[k] = String(v); },
      putAll: m => Object.keys(m).forEach(k => cache[k] = String(m[k])),
      getAll: ks => { const o = {}; ks.forEach(k => { if (k in cache) o[k] = cache[k]; }); return o; },
      remove: k => { delete cache[k]; }, removeAll: ks => ks.forEach(k => delete cache[k]) }) },
    Utilities: {
      base64Encode: b => Buffer.from(b).toString('base64'),
      base64Decode: s => Array.from(Buffer.from(s,'base64')),
      newBlob: d => ({ getBytes: () => (typeof d === 'string' ? Array.from(Buffer.from(d,'utf8')) : d),
                       getDataAsString: () => (typeof d === 'string' ? d : Buffer.from(d).toString('utf8')) }),
      gzip: b => ({ getBytes: () => b.getBytes() }),
      ungzip: b => ({ getDataAsString: () => Buffer.from(b.getBytes()).toString('utf8') }),
      getUuid: () => 'u' + Math.random().toString(16).slice(2),
      computeDigest: (a,t) => Array.from(Buffer.from(crypto.createHash('sha256').update(String(t)).digest())),
      DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 } },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' }), getProjectTriggers: () => [] },
    DriveApp: { getFileById: () => ({ getLastUpdated: () => new Date(0), getName: () => 'PREZENTA CURSURI' }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    UrlFetchApp: {}, HtmlService: {}, MailApp: {} };
}

const T = new Date(2026, 8, 3, 12, 0, 0).getTime();
function load(file, sheets) {
  const ctx = vm.createContext(makeSandbox(sheets));
  vm.runInContext(fs.readFileSync(file,'utf8'), ctx, { filename: file });
  vm.runInContext(`Date = (function(R,T){ function D(...a){ return a.length ? new R(...a) : new R(T); } D.prototype=R.prototype; D.now=()=>T; return D; })(Date, ${T});`, ctx);
  return ctx;
}

let fail = 0;
const okmsg = m => console.log('  \x1b[32m✔\x1b[0m ' + m);
const bad   = m => { fail++; console.log('  \x1b[31m✘\x1b[0m ' + m); };
function eq(label, a, b) { JSON.stringify(a) === JSON.stringify(b) ? okmsg(label) : bad(label + '  (ieșiri diferite)'); }
function assert(label, cond) { cond ? okmsg(label) : bad(label); }
const names = r => (r && r.data ? r.data.map(x => x.nume).sort() : (r && r.error ? ['ERR:' + r.error] : []));

/* ══ A. ECHIVALENȚĂ pe date curate ══ */
console.log('\n\x1b[1mA. Echivalență VECHI ↔ NOU (date curate, 2 luni, 2 frați)\x1b[0m');
{
  const sheets = [mkSheet('SEPTEMBRIE 2026_PREZENTA', CLEAN_SEP), mkSheet('AUGUST 2026_PREZENTA', CLEAN_AUG)];
  const O = load(SCRATCH + '/_cod.gs.original.js', sheets), N = load('cod.gs.txt', sheets);
  ['0723028164', '0723 028 164', '+40723028164', '0040723028164', '0744111222', '0799999999', '123']
    .forEach(p => eq('getAthleteData("' + p + '")',
        vm.runInContext(`getAthleteData(${JSON.stringify(p)})`, O),
        vm.runInContext(`getAthleteData(${JSON.stringify(p)})`, N)));
}

/* ══ B. CORECTURI intenționate pe date murdare ══ */
console.log('\n\x1b[1mB. Corecturi de securitate/normalizare (date murdare)\x1b[0m');
{
  const sheets = [mkSheet('SEPTEMBRIE 2026_PREZENTA', MESSY_SEP)];
  const O = load(SCRATCH + '/_cod.gs.original.js', sheets), N = load('cod.gs.txt', sheets);
  const oldR = p => names(vm.runInContext(`getAthleteData(${JSON.stringify(p)})`, O));
  const newR = p => names(vm.runInContext(`getAthleteData(${JSON.stringify(p)})`, N));

  assert('B1 vechi: celula scurtă "072" expune copilul altei familii → ' + JSON.stringify(oldR('0723028164')),
         oldR('0723028164').indexOf('SECRET COPIL') > -1);
  assert('B1 nou : scurgerea este eliminată → ' + JSON.stringify(newR('0723028164')),
         newR('0723028164').indexOf('SECRET COPIL') === -1 && newR('0723028164').indexOf('POPESCU ANDREI') > -1);

  assert('B5 vechi: numărul cu puncte "0723.028.164" NU este găsit',
         oldR('0723028164').indexOf('POPESCU ANDREI') === -1);
  assert('B5 nou : numărul cu puncte este găsit corect',
         newR('0723028164').indexOf('POPESCU ANDREI') > -1);

  assert('Două numere în aceeași celulă — primul  → ' + JSON.stringify(newR('0744111222')), newR('0744111222').indexOf('VLAD TUDOR') > -1);
  assert('Două numere în aceeași celulă — al doilea → ' + JSON.stringify(newR('0755333444')), newR('0755333444').indexOf('VLAD TUDOR') > -1);
}

/* ══ C. Autentificare cu telefon + prenume ══ */
console.log('\n\x1b[1mC. Al doilea factor (prenumele sportivului)\x1b[0m');
{
  const sheets = [mkSheet('SEPTEMBRIE 2026_PREZENTA', CLEAN_SEP)];
  const N = load('cod.gs.txt', sheets);
  const L = (p, n) => vm.runInContext(`portalLogin(${JSON.stringify(p)}, ${JSON.stringify(n)}, "test")`, N);

  assert('Prenume corect → autentificat, primește token',           L('0723028164','Andrei').success === true && !!L('0723028164','Andrei').token);
  assert('Fără diacritice / altă grafie ("MARIA") → acceptat',      L('0723028164','MARIA').success === true);
  assert('Prenumele fratelui → acceptat (un cont, mai mulți copii)',L('0723028164','Maria').data.length === 2);
  assert('Prenume greșit → respins',                                !!L('0723028164','Gheorghe').error);
  assert('Telefon inexistent → respins',                            !!L('0788888888','Andrei').error);
  assert('Prenume gol → respins',                                   !!L('0723028164','').error);

  const t = L('0723028164','Andrei').token;
  assert('Token valid → portalRefresh întoarce datele',   vm.runInContext(`portalRefresh(${JSON.stringify(t)})`, N).success === true);
  assert('GDPR inițial = false',                          vm.runInContext(`portalRefresh(${JSON.stringify(t)})`, N).gdprOk === false);
  vm.runInContext(`portalAcceptGdpr(${JSON.stringify(t)})`, N);
  assert('După acceptare, GDPR = true (stare de server)', vm.runInContext(`portalRefresh(${JSON.stringify(t)})`, N).gdprOk === true);
  vm.runInContext(`portalLogout(${JSON.stringify(t)})`, N);
  assert('După logout, sesiunea este revocată',           vm.runInContext(`portalRefresh(${JSON.stringify(t)})`, N).error === 'SESIUNE_EXPIRATA');
  assert('Token inventat → respins',                      vm.runInContext('portalRefresh("token-fals-123")', N).error === 'SESIUNE_EXPIRATA');
  assert('installUrl conține tokenul',                    L('0723028164','Andrei').installUrl.indexOf('?t=') > -1);
}

/* ══ D. Rate limiting ══ */
console.log('\n\x1b[1mD. Limitare încercări\x1b[0m');
{
  const sheets = [mkSheet('SEPTEMBRIE 2026_PREZENTA', CLEAN_SEP)];
  const N = load('cod.gs.txt', sheets);
  for (let i = 0; i < 11; i++) vm.runInContext('portalLogin("0723028164","Gresit","t")', N);
  const r = vm.runInContext('portalLogin("0723028164","Andrei","t")', N);
  assert('După 10 încercări greșite, numărul este blocat temporar', !!r.error && r.error.indexOf('Prea multe') > -1);
}

console.log(fail ? '\n\x1b[31m' + fail + ' test(e) eșuat(e)\x1b[0m\n' : '\n\x1b[32mToate testele au trecut.\x1b[0m\n');
process.exit(fail ? 1 : 0);
