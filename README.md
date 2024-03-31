# RECAPP

## Setup instructions

Run `npm install`und init your repo with `lerna bootstrap`. Note that this repo uses _npm workspaces_, so make sure to always add packages with `-w MODULE` to the individual projects.

Also make sure to create a `.env.development` (or `.env.production`) file from the `.env.template` in the repo.

Make sure to edit the `.env` file in the frontend project to the proper URIs.

## Model generator

There is simple generator for new data schemas/models if needed. It can be called via `npx pinion generators/model.template.ts`.

## ENTWICKLUNG UND FÖRDERUNG

Die Entwicklung von RECAPP wurde mit Mitteln des Niedersächsischen Ministeriums für Wissenschaft und Kultur gefördert. Die initiale Entwicklung erfolgte an der Georg-August-Universität Göttingen.
