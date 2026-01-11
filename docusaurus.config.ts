import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import prefixes from './static/data/items/prefixes.json';
import suffixes from './static/data/items/suffixes.json';


// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Gladiatus Fansite',
  tagline: 'Best Gladiatus fansite in the world',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://gladiatus.gamerz-bg.com/',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'Djongov', // Usually your GitHub org/user name.
  projectName: 'gladiatus-fansite', // Usually your repo name.

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: false,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  staticDirectories: ['static'],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  titleDelimiter: '-',

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/Djongov/gladiatus-fansite/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    function itemPagesPlugin() {
      return {
        name: 'item-pages-plugin',
        async contentLoaded({ actions }) {
          const { addRoute } = actions;

          const prefixes = require('./static/data/items/prefixes.json');
          const suffixes = require('./static/data/items/suffixes.json');

          const slugify = (value?: string) =>
            typeof value === 'string'
              ? value.toLowerCase().replace(/\s+/g, '-')
              : '';

          for (const item of prefixes) {
            if (!item.name || item.name.includes('*')) continue;
            const slug = slugify(item.name);
            addRoute({
              path: `/items/prefix/${slug}`,
              component: '@site/src/templates/itemPage.tsx',
              exact: true,
              // Don't pass context or modules - instead we'll pass data via props
            });
          }

          for (const item of suffixes) {
            if (!item.name || item.name.includes('*')) continue;
            const slug = slugify(item.name);
            addRoute({
              path: `/items/suffix/${slug}`,
              component: '@site/src/templates/itemPage.tsx',
              exact: true,
              // Don't pass context or modules - instead we'll pass data via props
            });
          }
        },
      };
    },
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Gladiatus Fansite',
      logo: {
        alt: 'Gladiatus Fansite Logo',
        src: 'img/logo_gladiatus.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/calculators',
          position: 'left',
          label: 'Calculators',
        },
        {
          to: '/contributing',
          position: 'left',
          label: 'Contribute',
        },
        {
          to: '/about-me',
          position: 'left',
          label: 'About Me',
        },
        {
          href: 'https://github.com/Djongov/gladiatus-fansite',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      copyright: `This is a non-profit unofficial fansite of Gameforge's browser game - <a href="https://en.gladiatus.gameforge.com/" target="_blank" rel="noopener noreferrer">Gladiatus</a>`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
