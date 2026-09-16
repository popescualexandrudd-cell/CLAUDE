const vm=require('vm'), fs=require('fs');
const LIB=require(__dirname+'/_lib.js');
let fail=0;
const ok=m=>console.log('  \x1b[32m✔\x1b[0m '+m);
const bad=m=>{fail++;console.log('  \x1b[31m✘\x1b[0m '+m);};
const A=(m,c)=>c?ok(m):bad(m);

/* Funcțiile de plată din index.html, extrase și rulate izolat. */
const html = fs.readFileSync(__dirname+'/../index.html.txt','utf8');
const jsCtx = vm.createContext({ console, document: { createElement: ()=>({style:{}}), body:{appendChild(){},removeChild(){}}, execCommand:()=>true }, navigator: {} });
['sumaDinTarif','epcPayload'].forEach(fn => {
  const i = html.indexOf('function ' + fn + '(');
  const j = html.indexOf('\n      }', i) + 8;
  vm.runInContext(html.slice(i, j), jsCtx);
});

console.log('\n\x1b[1mR. Plată rapidă — cod QR EPC\x1b[0m');
{
  const S = t => vm.runInContext(`sumaDinTarif(${JSON.stringify(t)})`, jsCtx);
  A('„700" → 700',            S('700') === '700');
  A('„700 lei" → 700',        S('700 lei') === '700');
  A('„250,50" → 250.50',      S('250,50') === '250.50');
  A('„1.250" → 1.25 (zecimale, nu mii) — limitare cunoscută', S('1.250') === '1.25');
  A('Gol → fără sumă',        S('') === '');
  A('Text fără cifre → fără sumă', S('de stabilit') === '');

  const p = vm.runInContext(`epcPayload("Asociatia Clubul Sportiv Tenis Masters","RO38 BRDE 441S V001 5117 4410","300","POPESCU ANDREI – luna septembrie 2026")`, jsCtx);
  const L = p.split('\n');
  A('Antet BCD (identificatorul standardului)', L[0] === 'BCD');
  A('Versiune 002, codificare 1, schemă SCT',   L[1] === '002' && L[2] === '1' && L[3] === 'SCT');
  A('Beneficiarul pe linia 6',                  L[5] === 'Asociatia Clubul Sportiv Tenis Masters');
  A('IBAN fără spații (cerință a standardului)', L[6] === 'RO38BRDE441SV00151174410');
  A('Suma cu moneda: RON300',                    L[7] === 'RON300');
  A('Referința de plată pe ultima linie',        L[10].indexOf('POPESCU ANDREI') === 0);
  A('Exact 11 linii, cât cere formatul',         L.length === 11);

  const fs2 = vm.runInContext(`epcPayload("Club","RO38BRDE441SV00151174410","","REF")`, jsCtx);
  A('Fără tarif → câmpul sumei rămâne gol, nu „RON"', fs2.split('\n')[7] === '');

  const lung = vm.runInContext(`epcPayload("${'X'.repeat(120)}","RO38","10","${'Y'.repeat(200)}")`, jsCtx);
  A('Numele se taie la 70 de caractere',      lung.split('\n')[5].length === 70);
  A('Referința se taie la 140 de caractere',  lung.split('\n')[10].length === 140);
}

console.log('\n\x1b[1mS. Acordul GDPR este obligatoriu\x1b[0m');
{
  A('Fereastra nu mai are buton de amânare', html.indexOf('Voi completa mai târziu') === -1);
  A('Există butonul de reverificare', html.indexOf('AM COMPLETAT — VERIFICĂ') > -1);
  A('Declarația pe proprie răspundere este ascunsă implicit',
    /id="gdpr-fallback"[^>]*display:none/.test(html));
  A('closeModal nu mai poate închide fără acord',
    /function closeModal[\s\S]{0,400}if \(!SESSION\.gdprOk\)/.test(html));

  const ctx = LIB.load('cod.gs.txt', {});
  const tok = vm.runInContext('portalLogin("0723028164","Andrei","ua").token', ctx);
  A('La autentificare, fără formular completat → acord necesar',
    vm.runInContext(`portalRefresh(${JSON.stringify(tok)})`, ctx).gdprOk === false);
  A('Reverificarea răspunde fără acord dacă formularul lipsește',
    vm.runInContext(`portalGdprVerifica(${JSON.stringify(tok)})`, ctx).gdprOk === false);
  A('Reverificarea cu token invalid este respinsă',
    vm.runInContext('portalGdprVerifica("fals")', ctx).error === 'SESIUNE_EXPIRATA');

  vm.runInContext(`portalAcceptGdpr(${JSON.stringify(tok)})`, ctx);
  A('După declarația în portal, acordul este valabil',
    vm.runInContext(`portalRefresh(${JSON.stringify(tok)})`, ctx).gdprOk === true);
  const info = vm.runInContext(`portalGdprInfo(${JSON.stringify(tok)})`, ctx);
  A('Registrul marchează acordul ca declarat, nu dovedit prin formular ('+info.versiune+')',
    info.versiune.indexOf('declarat') > -1);

  // dovedit prin formular → recunoscut imediat, fără declarație
  const FORM = [['Marcaj de timp','Nume și Prenume Sportiv (Copil)','Telefon','Email'],
                ['16.09.2026 12:00:00','Popescu Andrei','0723 028 164','a@b.ro']];
  const cu = LIB.load('cod.gs.txt', { 'Form_Responses': FORM });
  A('Cu formular completat → acordul e recunoscut fără nicio declarație',
    vm.runInContext('portalLogin("0723028164","Andrei","ua").gdprOk', cu) === true);
}

console.log(fail ? '\n\x1b[31m'+fail+' eșec(uri)\x1b[0m\n' : '\n\x1b[32mToate testele au trecut.\x1b[0m\n');
process.exit(fail?1:0);
