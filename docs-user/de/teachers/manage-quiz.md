<!-- REVIEW: Markierte UI-Begriffe (<mark>…</mark>) müssen gegen die deutsche Benutzeroberfläche geprüft werden -->

# Quiz verwalten <Badge type="tip" text="Lehrende" />

## Quizstatus

Jedes Quiz befindet sich stets in einem von vier Zuständen, der oben rechts in der Quizansicht sowie auf jeder Karte im Dashboard angezeigt wird.

| Status | Lehrende können… | Studierende können… |
|---|---|---|
| <Badge type="warning" text="EDITING" /> (Teilnehmendenfragen an) | Fragen hinzufügen/bearbeiten, Einstellungen anpassen, teilen, exportieren, löschen | Eigene Fragen hinzufügen und bearbeiten |
| <Badge type="warning" text="EDITING" /> (Teilnehmendenfragen aus) | Fragen kuratieren, Fragen hinzufügen, Einstellungen anpassen, teilen, exportieren, löschen | Nur eigene Fragen einsehen |
| <Badge type="tip" text="STARTED" /> | Fragen und Live-Statistiken einsehen | Fragen beantworten; Ergebnisse nach Abschluss sehen (wenn erlaubt) |
| <Badge type="danger" text="STOPPED" /> | Fragen und Statistiken einsehen, exportieren, löschen/archivieren | Fragen und Statistiken einsehen (wenn erlaubt) |

Ein neu erstelltes Quiz startet im Status <Badge type="warning" text="EDITING" />. Sie steuern die Übergänge über die Schaltflächen <mark>Quiz starten</mark>, <mark>Quiz stoppen</mark> und die Kurationsfunktion.

::: tip Statistiken zurücksetzen
Statistiken werden automatisch zurückgesetzt, wenn das Quiz in den Bearbeitungsmodus zurückversetzt wird. Sie können sie auch manuell im gestoppten Modus zurücksetzen — siehe [Statistiken](./statistics#statistiken-zurücksetzen).
:::

## Fragen hinzufügen

Klicken Sie im Tab **<mark>Quizfragen</mark>** auf **<mark>+ Neue Frage</mark>**. Ein Fragenfenster öffnet sich.

1. **Fragetyp wählen** — nur in den Quizeinstellungen aktivierte Typen stehen zur Auswahl (Freitext, Einfachauswahl, Mehrfachauswahl).
2. **Fragetext verfassen** — der Editor ist Markdown-basiert. Nutzen Sie die Symbolleiste zur Formatierung oder klicken Sie auf **?** für Syntaxoptionen.
3. **Antwortoptionen hinzufügen** (nur bei Auswahlaufgaben) — klicken Sie auf **<mark>Antwort hinzufügen</mark>** für jede Option und haken Sie die richtigen Antworten ab. Nutzen Sie die Pfeile zur Neuanordnung.
4. **Hinweistext hinzufügen** (optional) — ein kurzer Hinweis, der Studierenden bei der Interpretation der Frage hilft.
5. Klicken Sie auf **<mark>Frage speichern</mark>**.

Um eine bestehende Frage zu bearbeiten, klicken Sie auf das **Stift-Symbol** auf der Fragenkarte.

::: info Markdown-Tipps
**Bild einfügen:** `![Alternativtext](https://url-zum-bild.jpg "optionaler Titel")`  
**Zeilenumbruch:** Zeile mit zwei Leerzeichen beenden, dann Enter drücken.
:::

::: warning Gleichzeitiges Bearbeiten
Lehrende und Studierende können gleichzeitig Fragen hinzufügen. Das gleichzeitige Bearbeiten derselben Frage kann zu Konflikten führen.
:::

## Quiz kuratieren

Im Kurationsmodus können Sie die von Studierenden eingereichten Fragen prüfen und finalisieren, bevor das Quiz gestartet wird. Um ihn zu aktivieren, klicken Sie im Tab <mark>Quizfragen</mark> auf **<mark>Teilnehmendenfragen</mark>** — die Schaltfläche wird weiß, um den aktiven Kurationsmodus anzuzeigen.

Im Kurationsmodus können Studierende keine Fragen mehr hinzufügen oder bearbeiten. Sie können:

**Fragen anzeigen oder ausblenden** — Klicken Sie auf das Augensymbol auf einer Fragenkarte, um sie ein- oder auszuschließen. Nutzen Sie **<mark>Alle Fragen anzeigen</mark>** / **<mark>Alle Fragen ausblenden</mark>**, um alle Fragen gleichzeitig zu ändern. Ausgeblendete Fragen werden beim Start des Quiz nicht berücksichtigt. Fragen müssen ausgeblendet sein, bevor sie gelöscht werden können.

**Fragen neu anordnen** — Nutzen Sie die Auf/Ab-Pfeile links neben jeder Fragenkarte. Diese Reihenfolge gilt, wenn „Fragen mischen" deaktiviert ist.

**Fragen bearbeiten** — Klicken Sie auf das Stift-Symbol, nehmen Sie Änderungen vor, klicken Sie auf <mark>Frage speichern</mark>.

**Fragen löschen** — Nur ausgeblendete Fragen können gelöscht werden.

::: tip Wann ist der Kurationsmodus aktiv?
Wenn Sie in den Einstellungen „<mark>Teilnehmenden erlauben, Fragen zu stellen</mark>" deaktiviert haben, startet das Quiz direkt im Kurationsmodus — es gibt keine Bearbeitungsphase für Studierende.
:::

## Quiz teilen

Um Studierende einzuladen, teilen Sie einen **Link** oder **QR-Code**. Beides ist über **<mark>QR-Code anzeigen</mark>** im Tab <mark>Quizfragen</mark> oder über das Teilen-Symbol im Dashboard erreichbar.

Studierende können auf zwei Arten beitreten:
- **Mit Universitätskonto** — das Quiz erscheint im Dashboard und kann jederzeit erneut aufgerufen werden.
- **Ohne Anmeldung** — es wird ein temporäres Konto erstellt. Die Teilnahme ist an die aktuelle Browser-Sitzung gebunden.

Teilen Sie das Quiz im Status <Badge type="warning" text="EDITING" />, wenn Studierende zunächst Fragen einreichen sollen. Teilen Sie es im Status <Badge type="tip" text="STARTED" />, wenn Studierende direkt antworten sollen.

## Kommentare

Kommentare ermöglichen es Lehrenden und Studierenden, einzelne Fragen (oder das Quiz insgesamt) zu kommentieren. Sie sind nach Datum und Anzahl der Upvotes sortiert.

**Lehrende können:**
- Kommentare in jedem Quizmodus hinterlassen
- Kommentare als bestätigt (grün) oder ignoriert (grau) markieren — ignorierte Kommentare sind für Studierende nicht sichtbar
- Alle Kommentare löschen

**Studierende können:**
- Kommentare nur im gestarteten Modus hinterlassen, und zwar nur zur aktuell angezeigten Frage
- Kommentare mit einem Daumen-hoch bewerten
- Eigene Kommentare löschen

Das Kommentarfeld kann jederzeit über **<mark>Kommentare anzeigen/ausblenden</mark>** ein- oder ausgeklappt werden. Um Kommentare dauerhaft für alle auszublenden, aktivieren Sie **<mark>Kommentarliste ausblenden</mark>** in den Quizeinstellungen.

## Teilnehmeransicht

Klicken Sie auf **<mark>Teilnehmeransicht</mark>** (oben rechts im Tab <mark>Quizdaten</mark> oder <mark>Quizfragen</mark>), um eine Vorschau des Quiz aus der Perspektive der Studierenden zu sehen.

## Duplizieren, exportieren, archivieren und löschen

Diese Aktionen finden sich im Tab **<mark>Quizdaten</mark>** oder über das Papierkorb-Symbol im Dashboard.

| Aktion | Wirkung |
|---|---|
| **<mark>Quiz duplizieren</mark>** | Erstellt eine Kopie im Dashboard. Nützlich, um ein Quiz jedes Semester erneut zu verwenden. |
| **<mark>Daten exportieren</mark>** | Lädt eine `.json`-Datei mit allen Einstellungen und Fragen herunter (ohne Teilnehmendennamen). Kann später erneut importiert werden. |
| **<mark>Quiz archivieren</mark>** | Blendet das Quiz im Dashboard aus, aber es bleibt über den ursprünglichen Link und QR-Code erreichbar. Mit **<mark>Archivierte Quizze anzeigen</mark>** im Dashboard können archivierte Quizze wieder eingeblendet werden. |
| **<mark>Quiz löschen</mark>** | Löscht das Quiz dauerhaft. Dieser Vorgang kann nicht rückgängig gemacht werden. |
