# RECAPP

## Setup instructions

Run `npm install`und init your repo with `lerna bootstrap`. Note that this repo uses _npm workspaces_, so make sure to always add packages with `-w MODULE` to the individual projects.

## Model generator

There is simple generator for new data schemas/models if needed. It can be called via `npx pinion generators/model.template.ts`.
