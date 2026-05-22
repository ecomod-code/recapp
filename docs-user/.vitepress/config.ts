import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/recapp/",
  title: "Recapp User Guide",

  outDir: "../docs",
  cleanUrls: true,

  locales: {
    // root locale handles /recapp/ fallback for VitePress internals.
    // Content lives in de/ and en/ — public/index.html redirects / to the right language.
    root: {
      label: "Deutsch",
      lang: "de",
      link: "/de/",
      title: "Recapp Benutzerhandbuch",
      description: "Benutzerhandbuch für Recapp – das kollaborative Quiz-Tool",
      themeConfig: {
        nav: [
          { text: "Handbuch", link: "/de/guide/getting-started" },
          { text: "API-Referenz", link: "/recapp/api/", target: "_self" },
        ],
        sidebar: [
          {
            text: "Einführung",
            items: [
              { text: "Was ist Recapp?", link: "/de/guide/what-is-recapp" },
              { text: "Erste Schritte", link: "/de/guide/getting-started" },
              { text: "Recapp in der Praxis", link: "/de/guide/teaching-scenario" },
            ],
          },
          {
            text: "Für Lehrende",
            items: [
              { text: "Quiz erstellen", link: "/de/teachers/create-quiz" },
              { text: "Quiz verwalten", link: "/de/teachers/manage-quiz" },
              { text: "Quiz starten", link: "/de/teachers/run-quiz" },
              { text: "Statistiken", link: "/de/teachers/statistics" },
            ],
          },
          {
            text: "Für Studierende",
            items: [
              { text: "An einem Quiz teilnehmen", link: "/de/students/join-quiz" },
              { text: "Fragen erstellen", link: "/de/students/create-questions" },
              { text: "Quiz beantworten", link: "/de/students/answer-quiz" },
            ],
          },
        ],
        outlineTitle: "Auf dieser Seite",
        lastUpdatedText: "Zuletzt aktualisiert",
        docFooter: { prev: "Vorherige Seite", next: "Nächste Seite" },
        darkModeSwitchLabel: "Erscheinungsbild",
        sidebarMenuLabel: "Menü",
        returnToTopLabel: "Nach oben",
        langMenuLabel: "Sprache",
      },
    },

    en: {
      label: "English",
      lang: "en",
      link: "/en/",
      title: "Recapp User Guide",
      description: "User guide for Recapp – the collaborative quiz tool",
      themeConfig: {
        nav: [
          { text: "Guide", link: "/en/guide/getting-started" },
          { text: "API Reference", link: "/recapp/api/", target: "_self" },
        ],
        sidebar: [
          {
            text: "Introduction",
            items: [
              { text: "What is Recapp?", link: "/en/guide/what-is-recapp" },
              { text: "Getting Started", link: "/en/guide/getting-started" },
              { text: "Recapp in Practice", link: "/en/guide/teaching-scenario" },
            ],
          },
          {
            text: "For Teachers",
            items: [
              { text: "Creating a Quiz", link: "/en/teachers/create-quiz" },
              { text: "Managing a Quiz", link: "/en/teachers/manage-quiz" },
              { text: "Running a Quiz", link: "/en/teachers/run-quiz" },
              { text: "Statistics", link: "/en/teachers/statistics" },
            ],
          },
          {
            text: "For Students",
            items: [
              { text: "Joining a Quiz", link: "/en/students/join-quiz" },
              { text: "Creating Questions", link: "/en/students/create-questions" },
              { text: "Answering a Quiz", link: "/en/students/answer-quiz" },
            ],
          },
        ],
        lastUpdatedText: "Last updated",
        docFooter: { prev: "Previous page", next: "Next page" },
      },
    },
  },

  themeConfig: {
    socialLinks: [
      { icon: "github", link: "https://github.com/ecomod-code/recapp" },
    ],
    search: { provider: "local" },
  },

  lastUpdated: true,
});