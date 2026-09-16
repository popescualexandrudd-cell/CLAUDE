const fs=require('fs'), vm=require('vm'), crypto=require('crypto');
const SCRATCH=process.argv[2];
const N_ATH=30, N_MONTHS=6, W=46, N_DAYS=20;

function srcSheet(name, counter){
  const blank=()=> new Array(W).fill('');
  const rows=[], bgs=[];
  let r=blank(); r[0]='PORTOCALIU SI VERDE'; rows.push(r); bgs.push(blank().map(()=> '#ffffff'));
  r=blank(); r[3]='NUME/PRENUME'; r[4]='CONTACT';
  for(let d=0;d<N_DAYS;d++) r[5+d]=d+1;
  r[5+N_DAYS]='ZILE FIXE'; rows.push(r); bgs.push(blank().map(()=> '#ffffff'));
  for(let i=0;i<N_ATH;i++){
    const row=blank();
    row[1]=2; row[2]='DANIEL'; row[3]='FAMILIA'+i+' COPIL'+i; row[4]='07'+String(20000000+i);
    for(let d=0;d<N_DAYS;d++) row[5+d] = (d%4===0?'P':(d%4===1?'AB':(d%4===2?'E':'')));
    rows.push(row); bgs.push(blank().map(()=> '#ffffff'));
  }
  const o={ getName:()=>name, getLastRow:()=>rows.length, getLastColumn:()=>W,
    getDataRange:()=>({ getValues:()=>{counter.cells+=rows.length*W; counter.calls++; return rows;},
                        getBackgrounds:()=>{counter.cells+=rows.length*W; counter.calls++; return bgs;} }),
    getRange:(r1,c1,nR,nC)=>({ getValues:()=>{counter.cells+=nR*nC; counter.calls++; return rows.slice(r1-1,r1-1+nR).map(x=>x.slice(c1-1,c1-1+nC));},
                               getBackgrounds:()=>{counter.cells+=nR*nC; counter.calls++; return bgs.slice(r1-1,r1-1+nR).map(x=>x.slice(c1-1,c1-1+nC));} }) };
  return o;
}
const LUNI=['APRILIE','MAI','IUNIE','IULIE','AUGUST','SEPTEMBRIE'];

function ctxFor(file, counter){
  const sheets = LUNI.slice(0,N_MONTHS).map(m=> srcSheet(m+' 2026_PREZENTA', counter));
  const dp={}, cache={};
  const bag={getProperty:k=>(k in dp?dp[k]:null), setProperty:(k,v)=>{dp[k]=String(v);}};
  const ctx=vm.createContext({ console,
    SpreadsheetApp:{ openById:()=>({getSheets:()=>sheets,getSheetByName:()=>null}), getActiveSpreadsheet:()=>null },
    PropertiesService:{getDocumentProperties:()=>bag,getScriptProperties:()=>bag},
    CacheService:{getScriptCache:()=>({get:k=>(k in cache?cache[k]:null),put:(k,v)=>{cache[k]=String(v);},putAll:m=>Object.keys(m).forEach(k=>cache[k]=String(m[k])),getAll:ks=>{const o={};ks.forEach(k=>{if(k in cache)o[k]=cache[k];});return o;},remove:k=>{delete cache[k];},removeAll:ks=>ks.forEach(k=>delete cache[k])})},
    Utilities:{ base64Encode:b=>Buffer.from(b).toString('base64'), base64Decode:s=>Array.from(Buffer.from(s,'base64')),
      newBlob:d=>({getBytes:()=>(typeof d==='string'?Array.from(Buffer.from(d,'utf8')):d),getDataAsString:()=>(typeof d==='string'?d:Buffer.from(d).toString('utf8'))}),
      gzip:b=>({getBytes:()=>b.getBytes()}), ungzip:b=>({getDataAsString:()=>Buffer.from(b.getBytes()).toString('utf8')}),
      getUuid:()=>'u', computeDigest:(a,t)=>Array.from(Buffer.from(crypto.createHash('sha256').update(String(t)).digest())),
      DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1}},
    ScriptApp:{getService:()=>({getUrl:()=>''}),getProjectTriggers:()=>[]},
    DriveApp:{getFileById:()=>({getLastUpdated:()=>new Date(0),getName:()=>'X'})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,waitLock:()=>true,releaseLock:()=>{}})},
    UrlFetchApp:{},HtmlService:{},MailApp:{} });
  vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
  vm.runInContext("CFG.SOURCE_SHEET='SEPTEMBRIE 2026_PREZENTA';",ctx);
  return ctx;
}

function measure(file, logins){
  const c={cells:0,calls:0};
  const ctx=ctxFor(file,c);
  const t0=process.hrtime.bigint();
  for(let i=0;i<logins;i++) vm.runInContext(`getAthleteData("07${20000000+(i%N_ATH)}")`,ctx);
  const ms=Number(process.hrtime.bigint()-t0)/1e6;
  return {...c, ms};
}

const LOGINS=20;
const A=measure(SCRATCH+'/_cod.gs.original.js',LOGINS);
const B=measure('cod.gs.txt',LOGINS);

console.log(`\n\x1b[1mF. Cale de login — ${N_ATH} sportivi × ${N_MONTHS} luni × ${N_DAYS} zile, ${LOGINS} autentificări\x1b[0m\n`);
const row=(l,a,b)=>console.log('  '+l.padEnd(34)+String(a).padStart(12)+String(b).padStart(12)+('  −'+Math.round((1-b/a)*100)+'%').padStart(10));
console.log('  '+''.padEnd(34)+'VECHI'.padStart(12)+'NOU'.padStart(12)+'CÂȘTIG'.padStart(10));
console.log('  '+'─'.repeat(68));
row('Apeluri API Sheets',      A.calls, B.calls);
row('Celule citite',           A.cells, B.cells);
row('Timp CPU parsare (ms)',   A.ms.toFixed(0), B.ms.toFixed(0));
console.log('\n  La ' + LOGINS + ' autentificări, vechiul cod reface ' + A.calls + ' citiri din registrul brut;');
console.log('  noul cod face ' + B.calls + ' — restul sunt servite din memoria cache.\n');
console.log('  Notă: în Apps Script fiecare apel API costă ~50–400 ms de latență de rețea,');
console.log('  latență pe care acest test (rulat local) NU o simulează. Câștigul real este mai mare.\n');
