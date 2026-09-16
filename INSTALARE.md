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

## Teste

```sh
sh teste/ruleaza.sh
```

Compară automat varianta veche (`teste/_cod.gs.original.js`) cu cea nouă și verifică
autentificarea, persistența GDPR, sincronizarea și `doGet`. Rulează-le înainte de
orice modificare viitoare.
