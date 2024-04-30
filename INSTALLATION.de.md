# Installationshinweise

recapp kann auf einem herkömmlichen Linuxserver betrieben werden. Neben einem aktuellen _nodejs_ (und den zugehörigen Tools) wird auch _docker_ benötigt. Für den Betrieb des Backends empfiehlt sich die Nutzung von _PM2_.

# Installation der Software

1. Auschecken des git-Repositories auf dem Rechner

Der aktuelle Stand des Repositories soll auf dem Rechner installiert werden. Alternativ kann auch ein Archiv von github heruntergeladen und auf dem Server entpackt werden.

2. Installation der Abhängigkeiten

Im Installationsverzeichnis sind alle Softwarepakete mittels `npm install` zu installieren.

3. Konfiguration des Webservers

Wir empfehlen die Nutzung von _nginx_ als Webserver. Im Repository ist eine Beispielkonfiguration als Grundlage hinterlegt (in der Datei `nginx.example.conf`).

Für einen Betrieb mit HTTPS sind zudem auf dem in der Organisation üblichen Wege Zertifikate zu hinterlegen.

4. Anpassung der .env-Datei im Hauptverzeichnis

Basierend auf der `.env-template`-Datei aus dem Hauptverzeichnis sind alle Einstellungen für die Applikation vorzunehmen. Port und Host können in aller Regel beibehalten werden. Die Frontend- und Backend- URI sind entsprechend der gewählten Domänen und Webserver-Konfiguration zu setzen.

Die Autorisierung in recapp erfolgt über _OpenID Connect_. Ein entsprechender Server wird für den Betrieb voraus gesetzt. Die Variablen `OPENID_PROVIDER, OID_CLIENT_ID, OID_CLIENT_SECRET, ISSUER,REDIRECT_URI` sind entsprechend der Konfiguration des OID-Servers zu belegen.

Für die lokale Kommunikation (innerhalb des Servers selbst) bedient sich recapp eines API-Keys. Dies ist ein beliebiger String, wir empfehlen hier die Generierung und Nutzung einer UUID.

Alle Daten von recapp werden in einer MongoDB gespeichert, die in einem Docker-Container läuft. Die Zugangsdaten zu dieser werden ebenfalls in der ENV-Datei festgelegt.

5. Anpassung der Frontend-ENV-Datei

Im Verzeicnis `packages/frontend` liegt zur Zeit eine weitere .env-Datei in der ebenfalls noch einmal die URLs von Front- und Backend hinterlegt werden müssen. Diese ist Analog zu Schritt 4 anzupassen.

5. Starten der Datenbank

Der Datenbankcontainer kann im Hauptverzeichnis direkt mit dem Befehl `npm start:docker:dev` bzw. `npm start:docker:prod` gestartet werden. Die Daten werden direkt im Installationsverzeichnis unter `/docker/mongo` abgelegt. Sollte es nötig sein, die Datenbank zu sichern, so ist dieses Verzeichnis zu sichern. Ebenso kann dieses Verzeichnis gelöscht werden, um die Datenbank komplett zurück zu setzen. Wir emfpehlen in beiden Fällen den Datenbankcontainer anzuhalten (über `npm stop:docker:dev`), um Datenverluste zu vermeiden.

6. Erstellung des Frontends

Im Verzeichnis `/packages/frontend` kann selbiges mit dem Befehl npm run build erstellt werden. Das resultierende dist-Verzeichnis ist dann in den entsprechenden Bereich des Webservers zu kopieren. Alternativ kann man auch einen symbolischen Link von `dist` an eine Stelle legen, auf die Webserver und lokaler Nutzer Zugriff haben (z.B. `/tmp/recapp`). Auf diese Weise haben wir es auf den derzeitigen Servern gelöst.

7. Erstellung des Backends

Das Backend muss nicht erstellt werden. Es kann jedoch nach einem Update sinnvoll sein, einmal in `/packages/backend` den Befehl `npm run build` auszuführen um Programmierfehler oder fehlende Abhängigkeiten auszuschließen.

8. (Optional) Start des Backends über PM2

Wir empfehlen den Einsatz von pm2 für den Betrieb des Backends. Dieses kann mittels `pm2 startpm2 start npm --name "backend" -- run dev` bzw. `pm2 startpm2 start npm --name "backend" -- run start` direkt aus dem Verzeichnis `/packages/backend` gestartet werden. Im Falle von Updates kann man den Prozess einfach mit `pm2 restart backend` neu starten. Nach der erstmaligen Ausführung bitte nicht vergessen, mit `pm2 save` die Konfiguration zu sichern damit auch nach einem Neustart des Servers der Prozess wieder neu anläuft.
