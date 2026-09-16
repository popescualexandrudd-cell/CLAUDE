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

  const rem = mk('reminder'), mon = mk('monthly'), fin = mk('reminder_final');
  A('Subiect memento conține luna și prenumele', /SEPTEMBRIE 2026/.test(rem.subiect) && /CASIAN|ANDREI/i.test(rem.subiect));
  A('Subiect lună nouă diferă de memento', rem.subiect !== mon.subiect);

  ['POPESCU ANDREI','RO38BRDE441SV00151174410','Asociația Clubul Sportiv Tenis Masters','Următorul antrenament','De achitat','luna septembrie 2026']
    .forEach(s => A('HTML conține „'+s.slice(0,42)+'"', rem.html.indexOf(s) > -1));

  A('HTML este bine format (doctype + html închis)', /^<!DOCTYPE html>/.test(rem.html) && /<\/html>$/.test(rem.html));
  A('Fără stylesheet EXTERN (emailurile îl ignoră)', rem.html.indexOf('<link') === -1);
  A('Stilurile esențiale sunt inline, nu în <style>', rem.html.indexOf('style="background:#111111') > -1);
  A('Animațiile respectă prefers-reduced-motion', rem.html.indexOf('prefers-reduced-motion') > -1);
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

  A('Mementoul final avertizează privind suspendarea participării',
    /suspend/i.test(fin.html) && /suspend/i.test(fin.text));
  A('Mementoul final are subiect distinct', /neachitat/i.test(fin.subiect) && fin.subiect !== rem.subiect);
  A('Salutul de lună nouă NU conține avertizarea', !/suspend/i.test(mon.html));
  A('Bară de progres pe tabele (nu div cu width animat)', mon.html.indexOf('class="mx-bar"') > -1 || rem.html.indexOf('class="mx-bar"') > -1);
  A('Text de previzualizare ascuns pentru inbox', rem.html.indexOf('max-height:0') > -1);

  fs.writeFileSync(__dirname + '/../livrare/exemplu-email-plata.html', rem.html);
  fs.writeFileSync(__dirname + '/../livrare/exemplu-email-luna-noua.html', mon.html);
  fs.writeFileSync(__dirname + '/../livrare/exemplu-email-restanta.html', fin.html);
  ok('3 exemple salvate în livrare/');
}

console.log('\n\x1b[1mP. Calendarul pe săptămâni complete\x1b[0m');
{
  const G = (y,m) => vm.runInContext(`monthGridDays_(new Date(${y},${m},1),[1,2,3,4,5]).map(function(d){return d.getDate();})`, ctx);
  const W = (y,m) => vm.runInContext(`numarSaptamani_(new Date(${y},${m},1))`, ctx);

  A('Septembrie 2026 → 25 coloane, exact ca în foaia existentă',
    G(2026,8).join(' ') === '31 1 2 3 4 7 8 9 10 11 14 15 16 17 18 21 22 23 24 25 28 29 30 1 2');
  A('Septembrie 2026 → 5 săptămâni', W(2026,8) === 5);
  A('Februarie 2027 (luni→duminică fix) → 4 săptămâni, 20 zile', W(2027,1) === 4 && G(2027,1).length === 20);
  A('Noiembrie 2026 începe duminică → nu se adaugă o săptămână goală', W(2026,10) === 5 && G(2026,10)[0] === 2);
  A('Fiecare lună are 4 sau 5 săptămâni',
    [0,1,2,3,4,5,6,7,8,9,10,11].every(m => [4,5].indexOf(W(2026,m)) > -1));
  A('Numărul de coloane este mereu multiplu de 5 (luni–vineri complete)',
    [0,1,2,3,4,5,6,7,8,9,10,11].every(m => G(2026,m).length % 5 === 0));
  A('Prima zi din grilă este întotdeauna o luni',
    [0,1,2,3,4,5,6,7,8,9,10,11].every(m => vm.runInContext(`primaLuniGrila_(new Date(2026,${m},1)).getDay()`, ctx) === 1));
  A('monthDays_ (strict în lună) a rămas neschimbată',
    vm.runInContext('monthDays_(new Date(2026,8,1),[1,2,3,4,5]).length', ctx) === 22);
}

console.log('\n\x1b[1mQ. Programarea automată a mementourilor\x1b[0m');
{
  const iso = d => d.toISOString().slice(0,10);
  const P = (y,m) => {
    const r = vm.runInContext(`(function(){var p=emailPlanLuna_(new Date(${y},${m},1));function f(d){return [d.getFullYear(),d.getMonth(),d.getDate()];}return {salut:f(p.ziSalut),prima:f(p.primaZi),memento:f(p.ziMemento)};})()`, ctx);
    const mk = a => new Date(a[0], a[1], a[2]);
    return { salut: mk(r.salut), prima: mk(r.prima), memento: mk(r.memento) };
  };

  // „Prima zi" = LUNEA care deschide prima săptămână a grilei, chiar dacă e în luna
  // precedentă — este ziua în care începe efectiv abonamentul lunii respective.
  const sep = P(2026,8);
  A('Septembrie: prima săptămână începe luni 31 august ('+iso(sep.prima)+')', iso(sep.prima) === '2026-08-31');
  A('Salutul pleacă cu 2 zile înainte → 29 august ('+iso(sep.salut)+')',       iso(sep.salut) === '2026-08-29');
  A('Mementoul de plată în ultima zi a primei săptămâni → 4 sept ('+iso(sep.memento)+')', iso(sep.memento) === '2026-09-04');

  const feb = P(2027,1);
  A('Februarie 2027 începe chiar luni 1 februarie', iso(feb.prima) === '2027-02-01');
  A('Salutul → 30 ianuarie (trece corect în luna anterioară)', iso(feb.salut) === '2027-01-30');
  A('Mementoul → vineri 5 februarie', iso(feb.memento) === '2027-02-05');

  const ian = P(2026,0);
  A('Ianuarie 2026: prima săptămână începe în decembrie 2025 ('+iso(ian.prima)+')', iso(ian.prima) === '2025-12-29');
  A('Salutul trece corect peste anul calendaristic ('+iso(ian.salut)+')',            iso(ian.salut) === '2025-12-27');

  const nov = P(2026,10);
  A('Noiembrie: prima săptămână începe luni 2 noiembrie', iso(nov.prima) === '2026-11-02');
  A('Mementoul → vineri 6 noiembrie', iso(nov.memento) === '2026-11-06');

  const luni = [0,1,2,3,4,5,6,7,8,9,10,11].map(m => P(2026,m));
  A('Prima zi este mereu o luni',                    luni.every(p => p.prima.getDay() === 1));
  A('Salutul cade mereu înaintea primei zile',       luni.every(p => p.salut < p.prima));
  A('Salutul este exact cu 2 zile înainte',          luni.every(p => Math.round((p.prima - p.salut)/86400000) === 2));
  A('Mementoul cade mereu după prima zi',            luni.every(p => p.memento >= p.prima));
  A('Mementoul este în prima săptămână (max. 6 zile)', luni.every(p => Math.round((p.memento - p.prima)/86400000) <= 6));
  A('Mementoul cade vineri (ultima zi lucrătoare)',  luni.every(p => p.memento.getDay() === 5));
}

console.log(fail ? '\n\x1b[31m'+fail+' eșec(uri)\x1b[0m\n' : '\n\x1b[32mToate testele de email au trecut.\x1b[0m\n');
process.exit(fail?1:0);
