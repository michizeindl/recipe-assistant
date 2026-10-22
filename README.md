# Recipe Assistant

Eigenständige Web-App mit neun Profilbereichen, Energieabschätzung, Wochenplan, Rezeptsuche und Einkaufsliste. Die Berechnung läuft im Browser. Es ist kein KI-Schlüssel und kein Benutzerkonto erforderlich.

## Lokal öffnen

1. ZIP in einen eigenen Ordner entpacken.
2. `Starten.cmd` öffnen. Auf diesem PC ist Node.js bereits vorhanden.
3. Die App öffnet sich unter `http://127.0.0.1:4173`.

Alternativ im Projektordner `npm start` aufrufen und die angezeigte Adresse öffnen. Zum Beenden das zugehörige Terminal schließen. Es werden keine Pakete aus dem Internet installiert.

## Was enthalten ist

- Neun Profilbereiche entsprechend dem Fragenkatalog; Bereich 1 anfangs geöffnet, Startstatus 0/9.
- Berechnung auch ohne vollständige Angaben. Fehlende Körperdaten führen zu einem ausdrücklich benannten Referenzwert, nicht zu erfundenen persönlichen Daten.
- Energieabschätzung mit Mifflin-St Jeor und grobem Aktivitätsrahmen.
- 4.000 Vollrezepte zum Suchen und Lesen.
- 18 vorbereitete, berechenbare vollständige Mahlzeiten: 14 Hauptmahlzeiten und vier Frühstücks-/Snackkombinationen. Der große Rezeptbestand wird nicht ohne belastbare Nährwerte automatisch verplant.
- Zutatenbasierte Nährwertberechnung aus einer dokumentierten CoFID-Auswahl.
- Ausschlüsse für bekannte Allergene einschließlich hinterlegter möglicher Allergene; individuelle ungeklärte Allergien führen zu fehlenden Mahlzeiten statt vorgetäuschter Sicherheit. Die Energieabschätzung bleibt verfügbar.
- Ernährungsform, Vorlieben, Personenzahl, aktive Mahlzeiten, vorhandene Zutaten und Restelogik werden berücksichtigt.
- Beilagen und Ergänzungen zählen zu Nährwerten und Einkauf. Vorratsmengen ohne Mengenangabe werden nicht abgezogen.
- Optionales Speichern nur auf dem eigenen Gerät, Profilimport/-export, Plan- und Einkaufsdownload sowie Druckansicht für alle sieben Tage.

## Grenzen

Die App ersetzt keine medizinische Diagnostik oder Ernährungstherapie. Energie und Nährwerte sind Schätzungen. Zeiten fehlen in den Rezeptquellen; ausgewählte Zeitgrenzen werden deshalb nicht als erfüllt ausgegeben. Jod und Vitamin D sind nicht vollständig bilanziert. Weitere Haushaltsmitglieder erhalten dieselbe Portion; deren individuelle Bedarfe sind nicht bekannt. Es werden keine aktuellen Ladenpreise abgerufen und keine konkreten Budgetkosten zugesichert. Ayurvedisch bleibt eine kulinarische Orientierung. Kein B12-Deckungsversprechen für vegane Pläne.

Kategorien mit Bewertung 1 werden beim berechenbaren Bestand weggelassen; andere Bewertungen steuern die Auswahl. Individuelle Ernährungsformen im Freitext werden gespeichert, aber nur die ausdrücklich vorhandenen Filter werden automatisch geprüft.

## Datenschutz

Die ausgelieferte App enthält kein persönliches Startprofil, keine Kontodaten, keine Zugangsschlüssel, keine Analyse- oder Werbedienste und keine externe Schrift. Browseranfragen laden ausschließlich die statischen App-Dateien vom selben Server. Die verlinkten Quellen öffnen sich erst beim Anklicken.

Eingaben bleiben zunächst im Arbeitsspeicher des Browsers. Erst „Profil merken“ speichert sie im lokalen Browserspeicher. Exportierte Profildateien enthalten persönliche Daten und gehören nicht ins Repository. Plan und Häkchen der Einkaufsliste bleiben während der Sitzung erhalten; nur das Profil wird auf Wunsch dauerhaft gespeichert.

## Eigenes GitHub-Repository

Vorgesehenes Ziel: **ausschließlich `michizeindl/recipe-assistant`**. An „Gas & Spaß“ oder anderen Repositories wurde nichts geändert. Es wurde nichts hochgeladen.

Der bestehende GitHub-CLI-Zugang besitzt weitreichende Rechte. Für dieses Projekt darf er nicht verwendet werden. Kein `gh auth login` mit diesem Zugang und keinen vorhandenen Token auslesen oder weitergeben.

1. Bei GitHub ein neues, leeres Repository `michizeindl/recipe-assistant` anlegen. Die Sichtbarkeit bewusst wählen.
2. Einen neuen **Fine-grained Personal Access Token** anlegen: Resource owner `michizeindl`, „Only select repositories“, ausschließlich `recipe-assistant` auswählen.
3. Für Quellcode genügt `Contents: Read and write`; für die mitgelieferte Datei unter `.github/workflows` zusätzlich `Workflows: Read and write`. Andere Repository-Berechtigungen nicht pauschal freigeben. Metadata wird von GitHub benötigt.
4. Den Token lokal sicher hinterlegen. Nie in den Chat, eine Datei im Repository, eine URL oder die Befehlszeile schreiben. Die App selbst braucht diesen Token nicht.

Der tatsächliche Upload wurde bewusst nicht mit dem vorhandenen Vollzugriff ausgeführt. Der Ordner ist so vorbereitet, dass eine sichere, auf dieses neue Ziel begrenzte Übergabe möglich ist. Eine fehlende eingeschränkte Verbindung ist die einzige offene Voraussetzung für den GitHub-Upload.

GitHub-Dokumentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

## Optional auf GitHub Pages veröffentlichen

Die App ist statisch. Der veröffentlichbare Ordner ist `dist`, alle Verweise sind relativ und damit für `https://michizeindl.github.io/recipe-assistant/` vorbereitet. Diese Adresse ist ein mögliches künftiges Ziel und wurde **nicht** veröffentlicht.

Ein manuell auslösbarer GitHub-Actions-Workflow liegt bei. Er läuft ausschließlich, wenn der Repositoryname exakt `michizeindl/recipe-assistant` lautet. Er testet die Berechnung, lädt nur `dist` als Pages-Artefakt und veröffentlicht nur nach manueller Auslösung. Er greift nicht auf andere Repositories zu. In den Repository-Einstellungen zuerst Pages auf GitHub Actions stellen.

Private Repositories und die Verfügbarkeit von Pages hängen vom GitHub-Tarif ab. Ein privates Repository bedeutet nicht automatisch eine privat zugängliche Pages-Webseite. Die App enthält deshalb kein persönliches Startprofil. Dokumentation: https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages

## Prüfen

`npm test` führt die Tests für fehlende Daten, Energieformel, Allergenausschlüsse auch in Beilagen, vegane Auswahl, ungeklärte individuelle Allergien, leere Wochenmatrix, Personenskalierung, Vorräte, Restemengen und Fleischobergrenze aus.

Die Laufzeit benötigt keine externen Pakete. `prepare_data.py` ist ausschließlich das Entwicklungswerkzeug für den lokalen Projektquellbestand; die fertige App braucht weder Python noch die Ausgangstabellen.

## Quellen

- Projektdateien `fragenkatalog.md`, `profilmaske-app.md` und `rezeptlogik.md` wurden als unveränderte Referenzen verwendet. Die neue Anforderung „auch mit fehlenden Angaben berechnen“ hebt ausschließlich die bisherige Abschlusssperre auf.
- Rezepte: bereitgestellter Vollrezeptbestand mit 4.000 Einträgen. Der jeweilige Ausgangsdateiname bleibt in `dist/catalog.json` dokumentiert.
- Nährwerte: CoFID 2021, siehe `NOTICE.md` und die Codes in `dist/data.js`. Keine BLS-Auswertung.
- Energieformel: https://pubmed.ncbi.nlm.nih.gov/2305711/
- Aktivitätsrahmen: https://www.dge.de/gesunde-ernaehrung/faq/energiezufuhr/
- Ernährungsempfehlungen: https://www.dge.de/gesunde-ernaehrung/gut-essen-und-trinken/dge-ernaehrungskreis/
