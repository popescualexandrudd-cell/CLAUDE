const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
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
  { nume:'POPESCU ANDREI', coach:'DANIEL', contact:'0723 028 164', perWeek:2, marks:['P','E','E','R','P'], zileFixe:'LUNI/MIERCURI 19:00-20:00', tarif:'300', dataPlata:'03.08.2026', metoda:'ACHITAT POS', info:'' }
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
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => true, releaseLock: () => {} }) },
    UrlFetchApp: {}, HtmlService: {}, MailApp: {} };
}

const T = new Date(2026, 8, 3, 12, 0, 0).getTime();
function load(file, sheets) {
  const ctx = vm.createContext(makeSandbox(sheets));
  vm.runInContext(fs.readFileSync(file,'utf8'), ctx, { filename: file });
  vm.runInContext(`Date = (function(R,T){ function D(...a){ return a.length ? new R(...a) : new R(T); } D.prototype=R.prototype; D.now=()=>T; return D; })(Date, ${T});`, ctx);
  return ctx;
}


const SHEETS=[mkSheet('SEPTEMBRIE 2026_PREZENTA', CLEAN_SEP), mkSheet('AUGUST 2026_PREZENTA', CLEAN_AUG)];
/* Foaie în memorie, suficientă pentru foile proprii ale portalului. */
function memSheet2(name, seed){
  const cells = (seed || []).map(r => r.slice());
  const at = (r,c) => { while (cells.length < r) cells.push([]); const row = cells[r-1]; while (row.length < c) row.push(''); return row; };
  const api = {
    getName: () => name,
    getLastRow: () => cells.length,
    getLastColumn: () => cells.reduce((m,r)=> Math.max(m, r.length), 0),
    setFrozenRows: ()=>api, hideSheet: ()=>api, showSheet: ()=>api,
    setColumnWidth: ()=>api, setColumnWidths: ()=>api,
    appendRow: v => { cells.push(v.slice()); },
    deleteRow: r => { cells.splice(r-1,1); },
    getRange: (r,c,nR,nC) => { nR=nR||1; nC=nC||1;
      const g = {
        getValues: () => { const o=[]; for(let i=0;i<nR;i++){ at(r+i,c+nC-1); o.push(cells[r+i-1].slice(c-1,c-1+nC)); } return o; },
        setValues: v => { for(let i=0;i<nR;i++){ const row=at(r+i,c+nC-1); for(let j=0;j<nC;j++) row[c-1+j]=v[i][j]; } return g; },
        setValue: v => g.setValues(Array.from({length:nR},()=> new Array(nC).fill(v))),
        setFontWeight:()=>g, setBackground:()=>g, setFontColor:()=>g,
        setHorizontalAlignment:()=>g, setDataValidation:()=>g
      };
      return g; }
  };
  return api;
}
module.exports.memSheet2 = memSheet2;

module.exports.load = function(file, containerSeed){
  const sb = makeSandbox(SHEETS);
  const cont = {};
  Object.keys(containerSeed || {}).forEach(k => cont[k] = memSheet2(k, containerSeed[k]));
  sb.SpreadsheetApp.getActiveSpreadsheet = () => ({
    getId: () => 'CONTAINER_ID',
    getSheetByName: n => cont[n] || null,
    insertSheet: n => (cont[n] = memSheet2(n, [])),
    getSheets: () => Object.keys(cont).map(k => cont[k]),
    setActiveSheet: ()=>{}, toast: ()=>{}
  });
  sb.SpreadsheetApp.newDataValidation = () => ({ requireValueInList(){return this;}, setAllowInvalid(){return this;}, build(){return {};} });
  sb.__cont = cont;
  sb.HtmlService = {
    createTemplateFromFile: () => ({ BOOT:'', evaluate(){ sb.__LAST__ = this.BOOT; const o={setTitle:()=>o,setFaviconUrl:()=>o,addMetaTag:()=>o,setXFrameOptionsMode:()=>o}; return o; } }),
    XFrameOptionsMode:{ALLOWALL:1}
  };
  const ctx=vm.createContext(sb);
  vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
  const T = new Date(2026, 8, 3, 12, 0, 0).getTime();
  vm.runInContext(`Date = (function(R,T){ function D(...a){ return a.length ? new R(...a) : new R(T); } D.prototype=R.prototype; D.now=()=>T; return D; })(Date, ${T});`, ctx);
  vm.runInContext('function lastTemplate(x){ return __LAST__; }',ctx);
  return ctx;
};
