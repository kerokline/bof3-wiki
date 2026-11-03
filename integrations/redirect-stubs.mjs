// Write a small redirect page for every old URL in redirects.json, so that links to the previous
// site (for example /systems/boot.html) keep working and keep their #fragment.
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export default function redirectStubs({ redirects, base }) {
  return {
    name: 'redirect-stubs',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const root = fileURLToPath(dir);
        for (const [from, to] of Object.entries(redirects)) {
          const target = JSON.stringify(`${base}${to}`);
          const html = `<!doctype html>
<meta charset="utf-8">
<title>Page moved</title>
<meta name="robots" content="noindex">
<link rel="canonical" href=${target}>
<meta http-equiv="refresh" content="0; url=${base}${to}">
<script>location.replace(${target} + location.hash.replace(/^#gaps$/, '#open-questions'));</script>
<body data-pagefind-ignore>
<p>This page moved to <a href=${target}>${base}${to}</a>.</p>
`;
          const file = join(root, from);
          // A real page that already serves this URL wins over a stub.
          if (await access(file).then(() => true, () => false)) continue;
          await mkdir(dirname(file), { recursive: true });
          await writeFile(file, html);
        }
      },
    },
  };
}
