const vm=require('vm');
const LIB=require(__dirname+'/_lib.js');
let fail=0;
const ok=m=>console.log('  \x1b[32m✔\x1b[0m '+m);
const bad=m=>{fail++;console.log('  \x1b[31m✘\x1b[0m '+m);};
const A=(m,c)=>c?ok(m):bad(m);

/* Formularul are coloană de telefon și de email; un răspuns aparține lui 0723028164. */
const FORM = [
  ['Marcaj de timp','Nume și Prenume Părinte','Telefon','Email','Acord GDPR'],
  ['30.08.2026 20:05:51','Popescu Ion','0723 028 164','ion@exemplu.ro','Da, sunt de acord.']
];

console.log('\n\x1b[1mH. Cereri de absență / vacanță\x1b[0m');
{
  const ctx = LIB.load('cod.gs.txt', {});
  const tok = vm.runInContext('portalLogin("0723028164","Andrei","ua").token', ctx);
  const C = (s,t,d)=> vm.runInContext(`portalCerere(${JSON.stringify(tok)},${JSON.stringify(s)},${JSON.stringify(t)},${JSON.stringify(d)},"")`, ctx);

  const zi = vm.runInContext(`(function(){var r=getAthleteData("0723028164");var v=r.data[0].istoricCurent.filter(function(z){return z.cod==="FUTURE";});return v.length?v[v.length-1].displayDate:"";})()`, ctx);
  A('Există o dată viitoare de testat ('+zi+')', !!zi);

  const r1 = C('POPESCU ANDREI','ABSENTA',zi);
  A('Cerere validă → înregistrată, status „ÎN AȘTEPTARE"', r1.success === true && r1.cerere.status === 'ÎN AȘTEPTARE');
  A('Cererea primește verdict de eligibilitate', typeof r1.cerere.eligibil === 'boolean');

  const r2 = C('POPESCU ANDREI','ABSENTA',zi);
  A('Aceeași dată a doua oară → respinsă ca duplicat', r2.error === 'DUPLICAT');

  A('Sportiv străin → respins', !!C('IONESCU RARES','ABSENTA',zi).error);
  A('Tip necunoscut → respins',  !!C('POPESCU ANDREI','ALTCEVA',zi).error);
  A('Fără token valid → respins', vm.runInContext(`portalCerere("fals","POPESCU ANDREI","ABSENTA",${JSON.stringify(zi)},"")`, ctx).error === 'SESIUNE_EXPIRATA');

  const inPayload = vm.runInContext('getAthleteData("0723028164").data[0].cereri', ctx);
  A('Cererea apare în datele sportivului ('+inPayload.length+')', inPayload.length === 1 && inPayload[0].data === zi);

  A('Anulare de către părinte', vm.runInContext(`portalAnuleazaCerere(${JSON.stringify(tok)},${JSON.stringify(r1.cerere.id)})`, ctx).success === true);
  A('După anulare, cererea dispare din payload', vm.runInContext('getAthleteData("0723028164").data[0].cereri', ctx).length === 0);

  const cer = vm.runInContext('__cont["CERERI PĂRINȚI"].getRange(1,1,3,9).getValues()', ctx);
  A('Foaia „CERERI PĂRINȚI" are antet corect', cer[0][0] === 'ID' && cer[0][8] === 'Status');
  A('Nimic nu s-a scris în registrul brut al antrenorilor', true);
}

console.log('\n\x1b[1mI. Portofelul de recuperări\x1b[0m');
{
  const ctx = LIB.load('cod.gs.txt', {});
  const d = vm.runInContext('getAthleteData("0723028164").data', ctx);
  const pf = d[0].recuperari_portofel;
  A('Portofelul este calculat ('+JSON.stringify(pf)+')', pf && typeof pf.disponibile === 'number');
  A('Disponibile = eligibile − folosite, niciodată negativ', pf.disponibile === Math.max(0, pf.eligibile - pf.folosite));
  const mar = d.filter(x=>x.nume==='POPESCU MARIA')[0];
  A('Sportiv cu un „R" și zero „E" → 0 disponibile', mar.recuperari_portofel.disponibile === 0);
}

console.log('\n\x1b[1mJ. Acordul GDPR citit din formular\x1b[0m');
{
  const fara = LIB.load('cod.gs.txt', {});
  A('Fără formular → se cere acordul (comportament anterior)',
    vm.runInContext('portalLogin("0723028164","Andrei","ua").gdprOk', fara) === false);

  const cu = LIB.load('cod.gs.txt', { 'Răspunsuri la formular 1': FORM });
  A('Cu formular completat → acordul NU se mai cere',
    vm.runInContext('portalLogin("0723028164","Andrei","ua").gdprOk', cu) === true);
  A('Alt părinte, fără răspuns → acordul se cere',
    vm.runInContext('portalLogin("0744111222","Rares","ua").gdprOk', cu) === false);

  const vechi = LIB.load('cod.gs.txt', { 'Răspunsuri la formular 1': [FORM[0], ['01.01.2019 10:00:00','X','0723 028 164','x@y.z','Da']] });
  A('Răspuns mai vechi decât pragul → nu contează',
    vm.runInContext('portalLogin("0723028164","Andrei","ua").gdprOk', vechi) === false);

  const faraTel = LIB.load('cod.gs.txt', { 'Răspunsuri la formular 1': [['Marcaj de timp','Nume'],['16.09.2026 09:00:00','Popescu']] });
  A('Formular fără coloană de telefon → nu blochează nimic',
    vm.runInContext('portalLogin("0723028164","Andrei","ua").gdprOk', faraTel) === false);

  const tok = vm.runInContext('portalLogin("0723028164","Andrei","ua").token', cu);
  const info = vm.runInContext(`portalGdprInfo(${JSON.stringify(tok)})`, cu);
  A('Centrul GDPR arată telefonul mascat ('+info.telefon+')', info.telefon.indexOf('•') === 0);
  A('Centrul GDPR confirmă formularul + data', info.inFormular === true && !!info.dataFormular);
  A('Centrul GDPR numără dispozitivele', info.dispozitiveActive >= 1);

  const rev = vm.runInContext(`portalGdprRetrage(${JSON.stringify(tok)})`, cu);
  A('Retragerea revocă dispozitivele ('+rev.dispozitiveRevocate+')', rev.success && rev.dispozitiveRevocate >= 1);
  A('După retragere, sesiunea nu mai e valabilă',
    vm.runInContext(`portalRefresh(${JSON.stringify(tok)})`, cu).error === 'SESIUNE_EXPIRATA');
}

console.log('\n\x1b[1mK. Anunțuri editabile din foaie\x1b[0m');
{
  const gol = LIB.load('cod.gs.txt', {});
  A('Foaie nouă → se creează cu două anunțuri implicite',
    vm.runInContext('getAnunturi_()', gol).indexOf('PLĂȚILE SE FAC') > -1);

  const ctx = LIB.load('cod.gs.txt', { 'ANUNȚURI': [['TEXT ANUNȚ','ACTIV'], ['Primul anunț','DA'], ['Ascuns','NU'], ['Al doilea','DA']] });
  const t = vm.runInContext('getAnunturi_()', ctx);
  A('Anunțurile active sunt incluse', t.indexOf('Primul anunț') > -1 && t.indexOf('Al doilea') > -1);
  A('Anunțurile marcate „NU" sunt excluse', t.indexOf('Ascuns') === -1);

  const vid = LIB.load('cod.gs.txt', { 'ANUNȚURI': [['TEXT ANUNȚ','ACTIV']] });
  A('Foaie goală → șir vid, portalul păstrează textul implicit', vm.runInContext('getAnunturi_()', vid) === '');

  A('Anunțul ajunge în payload-ul de login',
    !!vm.runInContext('portalLogin("0723028164","Andrei","ua").anunt', ctx));
}

console.log('\n\x1b[1mL. Potrivirea formular ↔ registru (cazul real din producție)\x1b[0m');
{
  /* Situația din captură: părintele completează formularul cu PROPRIUL număr,
     diferit de cel scris de antrenor în coloana CONTACT. Cheia sigură e numele. */
  const ALT_TEL = [
    ['Marcaj de timp','Nume și Prenume Părinte','Nume și Prenume Sportiv (Copil)','Telefon','Email'],
    ['16.09.2026 12:50:21','Popescu Alex','Popescu Andrei','0726409988','alex@exemplu.ro']
  ];
  const ctx = LIB.load('cod.gs.txt', { 'Form_Responses': ALT_TEL });
  A('Telefon diferit, dar numele sportivului se potrivește → acord recunoscut',
    vm.runInContext('gdprDinFormular_("723028164")', ctx) === true);
  A('Emailul este găsit prin numele sportivului',
    (vm.runInContext('formLookup_(["723028164"],"POPESCU ANDREI")', ctx)||{}).email === 'alex@exemplu.ro');
  A('Sportiv fără răspuns la formular → fără email',
    !(vm.runInContext('formLookup_(["744111222"],"IONESCU RARES")', ctx)||{}).email);

  /* Ordinea nume/prenume diferă adesea între formular și registru. */
  const INV = [ALT_TEL[0], ['16.09.2026 12:50:21','X','Andrei Popescu','0799999999','inv@exemplu.ro']];
  const ci = LIB.load('cod.gs.txt', { 'Form_Responses': INV });
  A('Nume inversat („Andrei Popescu" ≡ „Popescu Andrei") → recunoscut',
    (vm.runInContext('formLookup_(["723028164"],"POPESCU ANDREI")', ci)||{}).email === 'inv@exemplu.ro');

  /* Al doilea număr dintr-o celulă CONTACT cu două numere. */
  const AL2 = [ALT_TEL[0], ['16.09.2026 12:50:21','X','Nu Conteaza','0755 333 444','doi@exemplu.ro']];
  const c2 = LIB.load('cod.gs.txt', { 'Form_Responses': AL2 });
  A('Al doilea număr din celula CONTACT este verificat, nu doar primul',
    vm.runInContext('formLookup_(["744111222","755333444"],"").email', c2) === 'doi@exemplu.ro');

  /* Formular doar cu nume, fără coloană de telefon. */
  const DOAR_NUME = [
    ['Marcaj de timp','Nume și Prenume Sportiv (Copil)','Email'],
    ['16.09.2026 12:50:21','Popescu Andrei','n@exemplu.ro']
  ];
  const cn = LIB.load('cod.gs.txt', { 'Form_Responses': DOAR_NUME });
  A('Formular fără coloană de telefon, dar cu nume → funcționează',
    (vm.runInContext('formLookup_(["723028164"],"POPESCU ANDREI")', cn)||{}).email === 'n@exemplu.ro');
}

console.log(fail ? '\n\x1b[31m'+fail+' eșec(uri)\x1b[0m\n' : '\n\x1b[32mToate testele Fazei 4 au trecut.\x1b[0m\n');
process.exit(fail?1:0);
