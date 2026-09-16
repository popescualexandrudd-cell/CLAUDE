const fs = require('fs'), vm = require('vm'), crypto = require('crypto');
const SCRATCH = process.argv[2];

/* ── Foaie SURSĂ (registrul brut al antrenorilor) ── */
function srcSheet(name, ath) {
  const W = 45, blank = () => new Array(W).fill('');
  const rows = [], bgs = [], push = (r,b) => { rows.push(r); bgs.push(b || blank().map(()=> '#ffffff')); };
  let r = blank(); r[0] = 'PORTOCALIU SI VERDE'; push(r);
  r = blank(); r[3]='NUME/PRENUME'; r[4]='CONTACT'; [1,2,3,4,5].forEach((d,i)=> r[5+i]=d); r[10]='ZILE FIXE'; push(r);
  ath.forEach(a => {
    const row = blank();
    row[1]=a.perWeek; row[2]=a.coach; row[3]=a.nume; row[4]=a.contact;
    a.marks.forEach((m,i)=> row[5+i]=m);
    row[10]=a.zileFixe; row[41]=a.metoda;
    const bg = blank().map(()=> '#ffffff');
    if (a.bgPresent != null) bg[5+a.bgPresent] = '#d9f2d9';
    push(row, bg);
  });
  const o = { _reads: {cells:0}, getName: ()=> name, getLastRow: ()=> rows.length, getLastColumn: ()=> W,
    getDataRange: ()=> ({ getValues: ()=> { o._reads.cells += rows.length*W; return rows; },
                          getBackgrounds: ()=> { o._reads.cells += rows.length*W; return bgs; } }),
    getRange: (r1,c1,nR,nC)=> ({
      getValues: ()=> { o._reads.cells += nR*nC; return rows.slice(r1-1,r1-1+nR).map(x=> x.slice(c1-1,c1-1+nC)); },
      getBackgrounds: ()=> { o._reads.cells += nR*nC; return bgs.slice(r1-1,r1-1+nR).map(x=> x.slice(c1-1,c1-1+nC)); } }) };
  return o;
}

/* ── Foaie ȚINTĂ (grila din spreadsheet-ul intermediar) — înregistrează tot ── */
function targetSheet(name) {
  const NR = 80, NC = 20; const OPS = {n:0};
  const V = Array.from({length:NR}, ()=> new Array(NC).fill(''));
  const BG = Array.from({length:NR}, ()=> new Array(NC).fill(''));
  const FC = Array.from({length:NR}, ()=> new Array(NC).fill(''));
  V[10] = ['Nr.','Antrenor','Inițială Nume','Prenume','Abonament', 'L','Ma','Mi','J','V', 'Zile\nFixe', ...new Array(9).fill('')];
  V[11] = ['','','','','', 1,2,3,4,5, '', ...new Array(9).fill('')];
  const api = {
    getName: ()=> name, getLastColumn: ()=> NC, getMaxRows: ()=> NR, getLastRow: ()=> NR,
    insertRowsAfter: ()=> api,
    getRange: (r,c,nR,nC)=> { nR=nR||1; nC=nC||1; OPS.n++;
      const g = {
        getValues: ()=> { const o=[]; for(let i=0;i<nR;i++) o.push(V[r-1+i].slice(c-1,c-1+nC)); return o; },
        setValues: v => { for(let i=0;i<nR;i++) for(let j=0;j<nC;j++) V[r-1+i][c-1+j]=v[i][j]; return g; },
        setValue: v => g.setValues(Array.from({length:nR},()=> new Array(nC).fill(v))),
        clearContent: ()=> { for(let i=0;i<nR;i++) for(let j=0;j<nC;j++) V[r-1+i][c-1+j]=''; return g; },
        setBackground: v => { for(let i=0;i<nR;i++) for(let j=0;j<nC;j++) BG[r-1+i][c-1+j]=v; return g; },
        setBackgrounds: v => { for(let i=0;i<nR;i++) for(let j=0;j<nC;j++) BG[r-1+i][c-1+j]=v[i][j]; return g; },
        setFontColor: v => { for(let i=0;i<nR;i++) for(let j=0;j<nC;j++) FC[r-1+i][c-1+j]=v; return g; },
        setFontColors: v => { for(let i=0;i<nR;i++) for(let j=0;j<nC;j++) FC[r-1+i][c-1+j]=v[i][j]; return g; },
        setFontWeight: ()=> g
      };
      return g; },
    _ops: ()=> OPS.n,
    _dump: ()=> ({ V: V.slice(12,20), BG: BG.slice(12,20).map(r=>r.slice(2,4)), FC: FC.slice(12,20).map(r=>r.slice(2,4)) })
  };
  return api;
}

const ATH = [
  { nume:'POPESCU ANDREI', coach:'DANIEL', contact:'0723 028 164', perWeek:2, marks:['P','','AB','E',''], bgPresent:1, zileFixe:'LUNI/MIERCURI', metoda:'ACHITAT BANCA' },
  { nume:'IONESCU MARIA',  coach:'BIANCA', contact:'0744 111 222', perWeek:1, marks:['','P','P','','R'],  zileFixe:'',             metoda:'' },
  { nume:'VLAD TUDOR',     coach:'DANIEL', contact:'0755 333 444', perWeek:3, marks:['V','P','P','P','P'], zileFixe:'MARTI/JOI',   metoda:'ACHITAT CASH' }
];

function run(file) {
  const target = targetSheet('PORTOCALIU • 19-20');
  const src = srcSheet('SEPTEMBRIE 2026_PREZENTA', ATH);
  const dp = {}, cache = {};
  const bag = { getProperty: k=> (k in dp ? dp[k] : null), setProperty: (k,v)=> { dp[k]=String(v); } };
  const alerts = [];
  const ctx = vm.createContext({ console,
    SpreadsheetApp: {
      openById: ()=> ({ getSheets: ()=> [src], getSheetByName: ()=> null }),
      getActiveSpreadsheet: ()=> ({ getId: ()=> 'X', getSheetByName: n=> (n === 'PORTOCALIU • 19-20' ? target : null), getSheets: ()=> [target], insertSheet: ()=> target, toast: ()=>{} }),
      getUi: ()=> ({ alert: m => alerts.push(m), createMenu: ()=> ({ addItem(){return this}, addSeparator(){return this}, addSubMenu(){return this}, addToUi(){} }) })
    },
    PropertiesService: { getDocumentProperties: ()=> bag, getScriptProperties: ()=> bag },
    CacheService: { getScriptCache: ()=> ({ get: k=> (k in cache?cache[k]:null), put:(k,v)=>{cache[k]=String(v);}, putAll: m=> Object.keys(m).forEach(k=>cache[k]=String(m[k])), getAll: ks=>{const o={};ks.forEach(k=>{if(k in cache)o[k]=cache[k];});return o;}, remove:k=>{delete cache[k];}, removeAll: ks=> ks.forEach(k=>delete cache[k]) }) },
    Utilities: { base64Encode: b=>Buffer.from(b).toString('base64'), base64Decode: s=>Array.from(Buffer.from(s,'base64')),
      newBlob: d=>({getBytes:()=> (typeof d==='string'?Array.from(Buffer.from(d,'utf8')):d), getDataAsString:()=> (typeof d==='string'?d:Buffer.from(d).toString('utf8'))}),
      gzip: b=>({getBytes:()=>b.getBytes()}), ungzip: b=>({getDataAsString:()=>Buffer.from(b.getBytes()).toString('utf8')}),
      getUuid: ()=> 'u', computeDigest: (a,t)=> Array.from(Buffer.from(crypto.createHash('sha256').update(String(t)).digest())),
      DigestAlgorithm:{SHA_256:1}, Charset:{UTF_8:1} },
    ScriptApp: { getService: ()=> ({getUrl: ()=> ''}), getProjectTriggers: ()=> [] },
    DriveApp: { getFileById: ()=> ({ getLastUpdated: ()=> new Date(0), getName: ()=> 'X' }) },
    LockService: { getScriptLock: ()=> ({ tryLock: ()=> true, waitLock: ()=> true, releaseLock: ()=> {} }) },
    UrlFetchApp:{}, HtmlService:{}, MailApp:{} });
  vm.runInContext(fs.readFileSync(file,'utf8'), ctx, { filename: file });
  vm.runInContext('importDataCore(SpreadsheetApp.getActiveSpreadsheet(), false);', ctx);
  return { grid: target._dump(), alerts, ops: target._ops(), srcReads: src._reads };
}

const A = run(SCRATCH + '/_cod.gs.original.js');
const B = run('cod.gs.txt');

const sameV  = JSON.stringify(A.grid.V)  === JSON.stringify(B.grid.V);
const sameBG = JSON.stringify(A.grid.BG) === JSON.stringify(B.grid.BG);
const sameFC = JSON.stringify(A.grid.FC) === JSON.stringify(B.grid.FC);

console.log('\n\x1b[1mE. Sincronizare: scriere celulă-cu-celulă (vechi) vs în bloc (nou)\x1b[0m');
console.log((sameV ?'  \x1b[32m✔\x1b[0m':'  \x1b[31m✘\x1b[0m') + ' Conținutul grilei este identic');
console.log((sameBG?'  \x1b[32m✔\x1b[0m':'  \x1b[31m✘\x1b[0m') + ' Culorile de fundal sunt identice');
console.log((sameFC?'  \x1b[32m✔\x1b[0m':'  \x1b[31m✘\x1b[0m') + ' Culorile de text sunt identice');
console.log('  Raport vechi: ' + JSON.stringify(A.alerts));
console.log('  Raport nou  : ' + JSON.stringify(B.alerts));
if (!sameV)  { console.log('\n  VECHI:'); console.table(A.grid.V.slice(0,3)); console.log('  NOU:'); console.table(B.grid.V.slice(0,3)); }
if (!sameBG) { console.log('\n  BG vechi: '+JSON.stringify(A.grid.BG)+'\n  BG nou  : '+JSON.stringify(B.grid.BG)); }
console.log('\n  Apeluri getRange pe foaia țintă:  vechi = ' + A.ops + '   nou = ' + B.ops + '   (-' + Math.round((1-B.ops/A.ops)*100) + '%)');
console.log('  Celule citite din registrul brut: vechi = ' + A.srcReads.cells + '   nou = ' + B.srcReads.cells + '   (-' + Math.round((1-B.srcReads.cells/A.srcReads.cells)*100) + '%)');
console.log('');
process.exit(sameV && sameBG && sameFC ? 0 : 1);
