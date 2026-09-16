const vm=require('vm'), fs=require('fs');
const LIB=require(__dirname+'/_lib.js');
let fail=0;
const ok=m=>console.log('  \x1b[32m✔\x1b[0m '+m);
const bad=m=>{fail++;console.log('  \x1b[31m✘\x1b[0m '+m);};
const A=(m,c)=>c?ok(m):bad(m);

const ctx=LIB.load('cod.gs.txt', {});

console.log('\n\x1b[1mM. Zile de antrenament din „Zile Fixe"\x1b[0m');
{
  const Z = t => vm.runInContext(`zileFixeWeekdays_(${JSON.stringify(t)}, null)`, ctx);
  A('„LUNI/MIERCURI" → [1,3]',        JSON.stringify(Z('LUNI/MIERCURI')) === '[1,3]');
  A('„LUNI/MIE" → [1,3]  (era doar [1])', JSON.stringify(Z('LUNI/MIE')) === '[1,3]');
  A('„MARTI/JO" → [2,4]  (era doar [2])', JSON.stringify(Z('MARTI/JO')) === '[2,4]');
  A('„LUNI/VI" → [1,5]   (era doar [1])', JSON.stringify(Z('LUNI/VI')) === '[1,5]');
  A('Cu oră inclusă: „LUNI/MIE 19:00-20:00" → [1,3]', JSON.stringify(Z('LUNI/MIE 19:00-20:00')) === '[1,3]');
  A('„L-V" → toată săptămâna',       JSON.stringify(Z('L-V')) === '[1,2,3,4,5]');
  A('Dar „MARTI-JOI" rămâne listă de 2 zile, nu interval', JSON.stringify(Z('MARTI-JOI')) === '[2,4]');
  A('Gol, fără grupă → []',          JSON.stringify(Z('')) === '[]');
  A('Portalul afișează acum corect „Luni, Miercuri"',
    vm.runInContext(`formatZileFixe_('LUNI/MIE 19:00-20:00')`, ctx) === 'Luni, Miercuri');
}

console.log('\n\x1b[1mN. Următorul antrenament\x1b[0m');
{
  // „azi" este fixat la joi, 3 septembrie 2026 (vezi _lib.js)
  const U = z => vm.runInContext(`urmatorulAntrenament_({zileFixe:${JSON.stringify(z)}}, {days:[1,2,3,4,5],time:'19:00-20:00'}, new Date())`, ctx);
  const luniMi = U('LUNI/MIE 19:00-20:00');
  A('Joi 3 sept, program Luni/Miercuri → luni 7 septembrie ('+luniMi.zi+' '+luniMi.data+')',
    luniMi.zi === 'Luni' && luniMi.data === '7 septembrie');
  A('Ora este extrasă din „Zile Fixe" ('+luniMi.ora+')', luniMi.ora === '19:00-20:00');
  const joi = U('JOI');
  A('Program joi, azi e joi → „astăzi" (peste '+joi.peste+' zile)', joi.peste === 0);
  A('Fără „Zile Fixe" → se revine la programul grupei (azi e joi)', U('').zi === 'Joi');
  A('Fără program ȘI fără grupă → null',
    vm.runInContext("urmatorulAntrenament_({zileFixe:''}, null, new Date())", ctx) === null);
}

console.log('\n\x1b[1mO. Conținutul emailului\x1b[0m');
{
  const snap = vm.runInContext('getSnapshot_(false)', ctx);
  const luna = snap.months.filter(m=>m.name===snap.curSheet)[0];
  const A0 = luna.ath.filter(a=>a.numeComplet==='POPESCU ANDREI')[0];
  const mk = t => vm.runInContext(`emailCompune_(${JSON.stringify(t)}, ${JSON.stringify(A0)}, ${JSON.stringify(luna)}, 'SEPTEMBRIE 2026')`, ctx);

  const rem = mk('reminder'), mon = mk('monthly');
  A('Subiect memento conține luna și prenumele', /SEPTEMBRIE 2026/.test(rem.subiect) && /CASIAN|ANDREI/i.test(rem.subiect));
  A('Subiect lună nouă diferă de memento', rem.subiect !== mon.subiect);

  ['POPESCU ANDREI','RO38BRDE441SV00151174410','Asociația Clubul Sportiv Tenis Masters','Următorul antrenament','De achitat','luna septembrie 2026']
    .forEach(s => A('HTML conține „'+s.slice(0,42)+'"', rem.html.indexOf(s) > -1));

  A('HTML este bine format (doctype + html închis)', /^<!DOCTYPE html>/.test(rem.html) && /<\/html>$/.test(rem.html));
  A('Fără stylesheet extern (emailurile îl ignoră)', rem.html.indexOf('<link') === -1 && rem.html.indexOf('</style>') === -1);
  A('Layout pe tabele, nu flex/grid', rem.html.indexOf('display:flex') === -1 && rem.html.indexOf('display:grid') === -1);
  A('Lățime limitată la 600px', rem.html.indexOf('max-width:600px') > -1);
  A('Buton către portal', rem.html.indexOf('Vezi portalul') > -1);

  A('Varianta text conține IBAN-ul', rem.text.indexOf('RO38BRDE441SV00151174410') > -1);
  A('Varianta text NU conține HTML', rem.text.indexOf('<') === -1);
  A('Referința de plată este explicită', rem.text.indexOf('Detalii plată: POPESCU ANDREI – luna septembrie 2026') > -1);

  // escapare: un nume cu caractere speciale nu trebuie să rupă emailul
  const rau = Object.assign({}, A0, { numeComplet: 'X <script>alert(1)</script>', infoInterne: 'note "cu ghilimele" & <b>' });
  const h = vm.runInContext(`emailCompune_('reminder', ${JSON.stringify(rau)}, ${JSON.stringify(luna)}, 'SEPTEMBRIE 2026')`, ctx).html;
  A('Text din fișierul-mamă este escapat în HTML', h.indexOf('<script>alert') === -1 && h.indexOf('&lt;script&gt;') > -1);

  // sportiv achitat -> secțiune verde, nu bancă
  const achitat = Object.assign({}, A0, { plata: 'Achitat', dataPlata: '05.09.2026' });
  const hm = vm.runInContext(`emailCompune_('monthly', ${JSON.stringify(achitat)}, ${JSON.stringify(luna)}, 'SEPTEMBRIE 2026')`, ctx).html;
  A('Sportiv achitat → confirmare, fără date bancare', hm.indexOf('Achitat</strong>') > -1 && hm.indexOf('RO38BRDE') === -1);

  // fără tarif -> nu inventăm sume
  const faraTarif = Object.assign({}, A0, { tarif: '' });
  const ht = vm.runInContext(`emailCompune_('reminder', ${JSON.stringify(faraTarif)}, ${JSON.stringify(luna)}, 'SEPTEMBRIE 2026')`, ctx).html;
  A('Fără tarif în registru → nu se inventează nicio sumă', ht.indexOf('Suma exactă vă este comunicată') > -1);

  fs.writeFileSync(__dirname + '/../livrare/exemplu-email.html', rem.html);
  ok('Exemplu salvat: livrare/exemplu-email.html');
}

console.log(fail ? '\n\x1b[31m'+fail+' eșec(uri)\x1b[0m\n' : '\n\x1b[32mToate testele de email au trecut.\x1b[0m\n');
process.exit(fail?1:0);
