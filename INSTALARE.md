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
