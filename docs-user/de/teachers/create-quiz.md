<!-- REVIEW: Markierte UI-Begriffe (<mark>…</mark>) müssen gegen die deutsche Benutzeroberfläche geprüft werden -->

# Quiz erstellen <Badge type="tip" text="Lehrende" />

## Neues Quiz anlegen

Klicken Sie im Dashboard oben rechts auf **<mark>+ Neues Quiz</mark>**. Es öffnet sich eine Einstellungsseite, auf der Sie das Quiz konfigurieren können. Mindestens ein **Titel** ist erforderlich — alle anderen Einstellungen haben sinnvolle Standardwerte und können jederzeit geändert werden, solange das Quiz im Bearbeitungsmodus ist.

Klicken Sie auf **<mark>Quiz erstellen</mark>**, um zu bestätigen. Sie werden direkt zum Tab **<mark>Quizfragen</mark>** des neuen Quiz weitergeleitet und können sofort Fragen hinzufügen oder das Quiz mit Studierenden teilen.

## Bestehendes Quiz importieren

Wenn Sie ein Quiz zuvor exportiert haben (siehe [Ergebnisse exportieren](./run-quiz#ergebnisse-exportieren)), können Sie es als neues Quiz importieren. Klicken Sie im Dashboard auf **<mark>Quiz importieren</mark>**, wählen Sie die `.json`-Datei aus und klicken Sie auf **<mark>Importieren</mark>**.

Alle Einstellungen und Fragen werden importiert. Der Name der importierenden Lehrperson erscheint als Autor bei allen importierten Fragen, unabhängig davon, wer sie ursprünglich verfasst hat.

## Quizeinstellungen

Die Quizeinstellungen befinden sich im Tab **<mark>Quizdaten</mark>** und können jederzeit angepasst werden, solange das Quiz im Bearbeitungs- oder Kurationsmodus ist. Studierende sehen lediglich Titel und Beschreibung — alle übrigen Einstellungen sind nur für Lehrende sichtbar.

### Grundlegende Informationen

**Titel** (erforderlich)  
Erscheint im Dashboard und ist für Studierende im Tab <mark>Quizdaten</mark> sichtbar. Maximal 150 Zeichen.

**Beschreibung** (optional)  
Zusätzliche Informationen zum Quiz. Ebenfalls für Studierende sichtbar.

### Lehrende

Das Feld „Lehrende" listet alle Personen mit Lehrenden-Zugang auf. Um eine weitere Lehrperson oder eine Tutorin/einen Tutor hinzuzufügen, klicken Sie auf **<mark>Teilen</mark>** neben dem Feld, suchen Sie nach E-Mail-Adresse oder Name und klicken Sie auf **<mark>Mit bestätigten Nutzenden teilen</mark>**.

::: warning Lehrende hinzufügen
Hinzugefügt werden können nur Personen, die sich mindestens einmal in Recapp angemeldet haben. Wenn jemand sich noch nie angemeldet hat, senden Sie dieser Person zunächst den Quiz-Link und fügen Sie sie nach ihrer ersten Anmeldung hinzu.
:::

### Berechtigungen für Studierende

| Einstellung | Standard | Funktion |
|---|---|---|
| <mark>Teilnehmerkommentare erlauben</mark> | **An** | Studierende können im gestarteten Quiz Kommentare zu Fragen hinterlassen |
| <mark>Teilnehmenden erlauben, Fragen zu stellen</mark> | **An** | Studierende können im Bearbeitungsmodus Fragen hinzufügen und bearbeiten |
| <mark>Teilnehmende können Statistiken einsehen</mark> | **Aus** | Studierende können die Ergebnisse nach Abschluss des Quiz sehen |
| <mark>Kommentarliste ausblenden</mark> | **Aus** | Wenn aktiviert, sind Kommentare für alle unsichtbar |

### Teilnahmeoptionen

Legt fest, welchen Namen Studierende beim Einreichen von Fragen und Kommentaren verwenden können. Standardmäßig sind alle drei Optionen aktiviert, sodass Studierende frei wählen können. Deaktivierte Optionen stehen nicht zur Auswahl.

- **Anonym** — kein Name wird angezeigt
- **Pseudonym** — der in den Kontoeinstellungen festgelegte Anzeigename
- **Klarname** — der Name des Universitätskontos

Lehrende nehmen stets unter ihrem Klarnamen teil.

### Fragetypen

Legt fest, welche Frageformate verfügbar sind. Standardmäßig sind alle drei aktiviert.

| Typ | Beschreibung |
|---|---|
| **<mark>Freitext</mark>** | Studierende schreiben eine eigene Antwort; keine automatische Bewertung |
| **<mark>Einfachauswahl</mark>** | Eine richtige Antwort unter mehreren Optionen |
| **<mark>Mehrfachauswahl</mark>** | Mehrere Antworten können richtig sein |

### Reihenfolge und Zufallsmischung

| Einstellung | Standard | Wirkung |
|---|---|---|
| <mark>Fragen im Quizmodus mischen</mark> | **An** | Jede/r Studierende erhält die Fragen in einer anderen zufälligen Reihenfolge |
| <mark>Antworten mischen</mark> | **Aus** | Wenn aktiviert, erscheinen Antwortoptionen in zufälliger Reihenfolge |

Wenn die Zufallsmischung deaktiviert ist, werden die Fragen in der im Tab <mark>Quizfragen</mark> festgelegten Reihenfolge angezeigt. Siehe [Quiz kuratieren](./manage-quiz#quiz-kuratieren), um diese Reihenfolge einzustellen.
