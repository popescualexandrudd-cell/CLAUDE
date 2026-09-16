# Portal Părinți — Club Tenis Masters
## Ghid de instalare (Fazele 1–3)

---

## 1. Copiază fișierele în Apps Script

| Fișier din repo | Unde se lipește în Apps Script |
|---|---|
| `cod.gs.txt` | fișierul `cod.gs` (Cod) |
| `index.html.txt` | fișierul HTML numit **`Index`** (exact acest nume — `doGet` îl caută așa) |

Înlocuiește **tot** conținutul, nu adăuga la final.

## 2. Publică o versiune NOUĂ

`Implementare → Gestionează implementările → ✏️ → Versiune: Versiune nouă → Implementează`

> ⚠️ Fără acest pas, Apps Script continuă să servească varianta veche. Aici se blochează
> cel mai des instalările.

Verifică setările implementării:
- **Executare ca:** *Eu*
- **Cine are acces:** *Oricine*

Dacă accesul e setat pe „oricine cu cont Google", linkul personal nu va funcționa pe iPhone.

## 3. Inițializează

1. Deschide o dată spreadsheet-ul MASTERS în browser — meniul `🎾 MASTERS` se încarcă și
   memorează automat identificatorul registrului (necesar pentru foaia de sesiuni).
2. `🎾 MASTERS → 🔐 Portal Părinți → 🩺 Diagnostic portal` — verifică accesul la registrul brut.
3. `🎾 MASTERS → 🔐 Portal Părinți → 🔁 Reconstruiește memoria cache`.

Foaia `_SESIUNI` se creează singură, ascunsă, la prima autentificare.

## 4. Schimbă intervalul de sincronizare

Sincronizarea la 5 minute rula importul complet de 288 de ori pe zi și epuiza cota
zilnică de execuție (90 min/zi pe un cont Gmail obișnuit). Acum importul se sare
automat dacă registrul brut nu s-a modificat, dar recomandarea rămâne:

`🎾 MASTERS → 🔄 Sincronizare Automată → ⏱️ ACTIVEAZĂ Sync la 5 MINUTE`

…iar apoi, din `Declanșatoare` (ceasul din bara laterală), schimbă `liveSyncWorker`
pe **15 minute**.

## 5. Testează

| Pas | Rezultat așteptat |
|---|---|
| Deschide `/exec` într-o fereastră privată | ecran de login cu 2 câmpuri |
| Telefon corect + prenume greșit | „Prenumele sportivului nu corespunde…" |
| Telefon + prenume corecte | dashboard; apare invitația de instalare |
| Apasă **🔗 Deschide linkul meu personal** | URL-ul devine `/exec?t=…` |
| „Adaugă pe ecranul principal", apoi deschide scurtătura | **intră direct, fără login, fără GDPR** |
| Închide și redeschide de 5 ori | la fel de fiecare dată |

---

## Ce se schimbă pentru părinții existenți

La prima deschidere după actualizare, **fiecare părinte se autentifică o singură dată**
(telefon + prenumele copilului) și își reinstalează scurtătura prin butonul
„Deschide linkul meu personal". După aceea rămâne conectat permanent.

Merită anunțat în grupurile de WhatsApp, altfel pare o defecțiune.

---

## Revocarea accesului unui dispozitiv

Deschide foaia ascunsă `_SESIUNI` (`Afișează → Foi ascunse`) și pune `FALSE` pe
coloana `activ`. Accesul încetează în maximum 6 ore (durata memoriei cache);
pentru efect imediat, rulează și `🔁 Reconstruiește memoria cache`.

Coloana `tokenHash` conține doar amprenta SHA-256 a tokenului — cine vede foaia
**nu** poate impersona pe nimeni.

## Reînnoirea acordului GDPR pentru toți

În `cod.gs`, modifică `CFG.GDPR_VERSION` (ex. `'2026.1'` → `'2027.1'`) și republică.
Fereastra de acord reapare o singură dată pentru fiecare părinte, iar data și
versiunea acceptată se înregistrează în `_SESIUNI`.

---

# Faza 4 — funcții noi

Trei foi noi se creează automat în registrul intermediar, la prima utilizare.
**Fișierul-mamă al antrenorilor nu este atins niciodată.**

| Foaie | Rol | Vizibilă |
|---|---|---|
| `CERERI PĂRINȚI` | absențele și vacanțele anunțate din portal | da |
| `ANUNȚURI` | textul benzii derulante | da |
| `_SESIUNI` | sesiunile active (Faza 1) | ascunsă |

## Cereri de absență / vacanță

Butoanele de WhatsApp existente fac acum două lucruri: deschid WhatsApp **ca până acum**
și înregistrează cererea în `CERERI PĂRINȚI`. Părintele vede imediat
`✅ Anunțat · ÎN AȘTEPTARE`, în locul butonului.

Eligibilitatea se calculează automat:
- **absență** — eligibilă dacă e anunțată cu cel puțin `CFG.CERERE_MIN_ORE` (24h) înainte;
- **vacanță** — eligibilă dacă e anunțată cu cel puțin 7 zile înainte.

Deschide lista din `🎾 MASTERS → 🔐 Portal Părinți → 📋 Cereri de la părinți`.
Antrenorul rămâne singurul care scrie codul de prezență în fișierul-mamă;
portalul doar îl anunță. Nicio sincronizare nu poate suprascrie o cerere.

## Portofel de recuperări

În cardul sportivului apare un rând nou, doar când soldul e pozitiv:

> 🪃 RECUPERĂRI DISPONIBILE: **2** · prima expiră 1 octombrie

Calculul e `E + B + AC` minus `R`, pe lunile încărcate, cu expirare la
`CFG.REC_VALABIL_ZILE` (60 zile). Este **informativ** — decizia rămâne a antrenorului.

## Acordul GDPR citit din formular

Adaugă în Google Form un câmp **„Telefon"** (și, ideal, **„Email"**).
Coloanele sunt găsite automat după antet — nu trebuie să atingi codul.

Potrivirea se face în două trepte, fiindcă numărul completat de părinte în
formular este adesea altul decât cel scris de antrenor în coloana CONTACT:

1. **după telefon** — se încearcă *toate* numerele din celula CONTACT;
2. **după numele sportivului** — inclusiv cu ordinea inversată
   („Ionescu Casian" ≡ „Casian Ionescu").

De aceea contează ca numele completat în formular să fie scris la fel ca în
registrul antrenorilor. Dacă diferă complet (poreclă, prenume lipsă), potrivirea
nu se poate face — iar previzualizarea de email îți listează exact acei sportivi.

De atunci, fereastra de acord nu mai apare părinților care chiar au completat
formularul. Contează răspunsurile de după `CFG.GDPR_FORM_FROM`.

> Fără câmpul „Telefon", totul funcționează exact ca înainte: acordurile colectate
> pur și simplu nu pot fi atribuite unui sportiv anume.

## Centru GDPR

Link nou în subsol: **🔒 Datele mele & acordurile**. Arată ce acorduri sunt
înregistrate, când, ce versiune, câte dispozitive sunt conectate — și permite
retragerea acordului (revocă toate dispozitivele și lasă o solicitare în
`CERERI PĂRINȚI`).

## Anunțuri editabile

`🎾 MASTERS → 🔐 Portal Părinți → 📣 Anunțuri afișate în portal`.
Scrii textul, pui `DA`/`NU` pe coloana ACTIV, salvezi. Portalul le preia în
maximum 10 minute — **fără republicare**. Dacă foaia e goală, rămâne textul
implicit din `index.html`.

## Memento de plată prin email

`🎾 MASTERS → 🔐 Portal Părinți → ✉️ EMAIL: memento plată`.

Pornește în **mod testare**: îți arată previzualizarea, nu trimite nimic.
Pentru trimitere reală, pune `CFG.EMAIL_ON = true`.

Necesită coloana „Email" în formular. Folosește `MailApp` (gratuit, ~100
destinatari/zi pe un cont Gmail obișnuit — suficient pentru 100 de familii).

**Înainte de prima trimitere reală**, rulează
`✉️ Verifică trimiterea de email`. Îți arată cota rămasă, contul care trimite,
și îți trimite ție un email de test. Tot aici se declanșează dialogul de
autorizare pentru `MailApp`, dacă nu a fost acordat încă.

Dacă o trimitere eșuează, raportul îți arată adresa, sportivul și **motivul
exact** al erorii.

### Ce conține emailul

HTML pe tabele, cu stiluri inline — singura formă care se afișează corect în
Gmail, Outlook, Apple Mail și pe telefon. Fiecare mesaj are și o variantă text
simplu, pentru clienții care nu afișează HTML.

Secțiuni, în ordine:

| Secțiune | Sursa datelor |
|---|---|
| Sportiv: grupă, antrenor, program, ședințe în lună | registrul brut |
| **Următorul antrenament**: zi, dată, oră | calculat din „Zile Fixe" |
| **De achitat**: sumă, termen, IBAN, referința de plată | coloana TARIF + `CFG.BANK` |
| Situația lunii: prezențe / absențe / recuperate | grila de prezențe |
| Recuperări disponibile | calculat |
| Mesaj de la antrenor | coloana „Informații activitate" |
| Buton către portal | — |

Pentru un sportiv deja achitat, secțiunea de plată devine o confirmare verde,
fără date bancare. Dacă în registru **nu există tarif**, emailul nu inventează
nicio sumă — scrie că suma este comunicată de antrenor.

Vezi cum arată, pe date reale, fără să trimiți nimic:
`🎾 MASTERS → 🔐 Portal Părinți → 👁️ Previzualizează șablonul de email`.

Datele bancare sunt în `CFG.BANK`, iar ziua scadentă în `CFG.ZI_SCADENTA`.
Textele se modifică în `emailCompune_`.

---

# Meniul 🎾 MASTERS

Sus stau doar acțiunile de zi cu zi; configurarea, întreținerea și diagnosticul
sunt în **⚙️ Avansat**. Nicio funcție nu a fost eliminată.

```
🎾 MASTERS
├ 📥 IMPORTĂ PREZENȚELE din registrul brut
├ 📅 Setează luna de lucru
├ ✉️ Emailuri către părinți ▸
│   ├ 👁️ Previzualizează șablonul
│   ├ Trimite memento de plată
│   ├ Trimite salut de lună nouă
│   ├ 📅 Plan trimiteri automate
│   ├ ⏰ ACTIVEAZĂ trimiterea automată
│   └ ⏹️ OPREȘTE trimiterea automată
├ 📋 Cereri de la părinți
├ 📣 Anunțuri afișate în portal
└ ⚙️ Avansat ▸
    ├ 🔁 Reconstruiește memoria cache
    ├ 🩺 Diagnostic portal
    ├ ✉️ Verifică trimiterea de email
    ├ 🧹 Curăță sesiunile expirate
    ├ 🔄 Sincronizare automată ▸
    ├ 📐 Recalculează zilele din calendar
    ├ 💬 Notificări WhatsApp (inactiv) ▸
    ├ 📤 Instrucțiuni distribuire
    └ 🏗️ RECONSTRUIEȘTE TOT SISTEMUL
```

`🏗️ RECONSTRUIEȘTE TOT SISTEMUL` cere acum o confirmare: șterge prezențele din
grile (numele sportivilor se păstrează) și trebuie urmată de o sincronizare.

---

# Calendarul lunii

Grila din foile de grupă acoperă **săptămâni întregi** (luni→vineri) care conțin
zile de antrenament din lună — **4 sau 5, după lună**. Așa coincide cu registrul
brut al antrenorilor, care include și zilele de la granița lunii.

Exemple: septembrie 2026 → 5 săptămâni, 25 de coloane (`31 aug … 2 oct`);
februarie 2027 → 4 săptămâni, 20 de coloane.

Zilele din altă lună apar cu bandă estompată, iar între săptămâni există o linie
verticală groasă. Titlul de sus arată luna, numărul de săptămâni și numărul de zile.

**`2. Setează luna de lucru`** întreabă acum dacă recalculează imediat calendarul.
Numele sportivilor se păstrează; prezențele se reimportă din registrul brut.

> ⚠️ Înainte de această versiune, `3. Recalculează zilele din calendar` genera
> doar zilele **din** lună (22 pentru septembrie, nu 25) și ar fi rupt
> corespondența cu registrul brut la zilele de graniță.

---

# Trimitere automată a emailurilor

`🎾 MASTERS → 🔐 Portal Părinți`:

| Articol | Ce face |
|---|---|
| `📅 Plan trimiteri automate` | arată datele calculate pentru luna de lucru |
| `⏰ ACTIVEAZĂ trimiterea automată` | creează declanșatorul zilnic (ora 9) |
| `⏹️ OPREȘTE trimiterea automată` | îl șterge |

Calendarul, pentru fiecare lună:

- **Salut de lună nouă** — cu `CFG.EMAIL_ZILE_INAINTE` (2) zile înainte de
  **lunea care deschide prima săptămână** de abonament. Pentru septembrie 2026,
  prima săptămână începe luni 31 august, deci salutul pleacă sâmbătă 29 august.
- **Memento de plată** — în **ultima zi lucrătoare a primei săptămâni** (vineri),
  doar celor care nu figurează achitat. Acest mesaj conține avertizarea că
  participarea se suspendă până la regularizare.

Fiecare tip pleacă **o singură dată pe lună** (marcaj în proprietățile
documentului). Trimiterea reală cere **și** `CFG.EMAIL_ON = true` — altfel
declanșatorul rulează în gol.

## Cele trei șabloane

| Tip | Când | Particularitate |
|---|---|---|
| `monthly` | salut de lună nouă | fără avertizare |
| `reminder` | manual, din meniu | ton neutru |
| `reminder_final` | automat, finalul primei săptămâni | bloc roșu: participarea se suspendă |

## Despre animații

Casetele apar cu o intrare discretă, butonul pulsează, iar bara de progres crește.
Acestea sunt **decorative** și funcționează în Apple Mail, iOS Mail și Outlook for
Mac. Gmail web și Outlook pe Windows ignoră `<style>` — acolo mesajul arată
identic, doar static. Tot ce este esențial (culori, relief, spațiere) este în
stiluri inline, deci nu depinde de animații. Se respectă și
`prefers-reduced-motion`.

> Singura animație care merge peste tot în email este un GIF. Dacă vrei un
> element animat garantat vizibil în Gmail, trebuie un GIF găzduit.

---

## Ce NU este inclus

**Rezervarea de recuperări (self-booking).** Îmi lipsesc două informații pe care
nu le pot deduce din date: **capacitatea fiecărei grupe** și regulile de
recuperare (se poate doar în grupa proprie? în cât timp expiră?). Fără ele,
sloturile libere nu pot fi calculate. Spune-mi valorile și o adaug.

**Separarea notelor interne de mesajele către părinte.** Ar necesita o coloană
nouă în fișierul-mamă, la care nu ai acces. Momentan, tot conținutul coloanei
„Informații activitate" ajunge la părinte, ca și până acum.

---

## Teste

```sh
sh teste/ruleaza.sh
```

Compară automat varianta veche (`teste/_cod.gs.original.js`) cu cea nouă și verifică
autentificarea, persistența GDPR, sincronizarea și `doGet`. Rulează-le înainte de
orice modificare viitoare.
