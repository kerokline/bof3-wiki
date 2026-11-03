import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';
import mermaid from 'astro-mermaid';
import nav from './nav.json' with { type: 'json' };
import redirects from './redirects.json' with { type: 'json' };
import redirectStubs from './integrations/redirect-stubs.mjs';

const site = 'https://raulcorreia7.github.io';
const base = '/bof3-wiki';
const repository = 'https://github.com/raulcorreia7/bof3-wiki';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [
    redirectStubs({ redirects, base }),
    // astro-mermaid must come before Starlight.
    mermaid({ autoTheme: true, enableLog: false }),
    starlight({
      title: 'Breath of Fire III',
      favicon: '/favicon.svg',
      description:
        'Independent research on the file formats, memory layouts and runtime of Breath of Fire III (US, PlayStation).',
      social: [{ icon: 'github', label: 'GitHub', href: repository }],
      editLink: { baseUrl: `${repository}/edit/main/` },
      lastUpdated: true,
      customCss: ['./src/styles/wiki.css'],
      head: [{ tag: 'script', attrs: { src: `${base}/wiki.js`, defer: true } }],
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      sidebar: [
        { slug: 'index' },
        ...nav.map(({ label, items }) => ({ label, items: items.map((slug) => ({ slug })) })),
      ],
      plugins: [
        starlightLinksValidator({ errorOnRelativeLinks: false, errorOnInvalidHashes: true }),
        starlightLlmsTxt({
          projectName: 'Breath of Fire III specifications',
          description:
            'File formats, memory layouts and runtime behavior of Breath of Fire III (US, PlayStation), from reading the retail code and data.',
          customSets: [
            { label: 'Concepts', paths: ['concepts/**'], description: 'Notation, memory map, frame loop, scheduler and loading.' },
            { label: 'Systems', paths: ['systems/**'], description: 'How each part of the game runs.' },
            { label: 'Formats', paths: ['formats/**'], description: 'Byte layouts of the files on the disc.' },
            { label: 'Data tables', paths: ['data/**'], description: 'Row layouts of the tables in RAM and in the archives.' },
            { label: 'Guides', paths: ['guides/**'], description: 'How to change each kind of data and what to keep intact.' },
            { label: 'Appendix', paths: ['appendix/**'], description: 'Glossary, open questions, coverage and sources.' },
          ],
        }),
      ],
    }),
  ],
});
