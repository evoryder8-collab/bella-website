import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { siFacebook, siInstagram } from 'simple-icons';
import { contact, copy, DEFAULT_LANG } from './src/content.js';
import { lookup } from './src/i18n-lookup.js';
import { links } from './src/links.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
// Every page of the site; the home page is index.html, the others live in folders.
const PAGES = ['index.html', 'om/index.html', 'behandlingar/index.html', 'akademi/index.html', 'kontakt/index.html'];

// Pulls the shared parts (src/partials/*.html) into each page where it says
// <!-- @include name -->, with {{root}} as the relative path back to the site root.
function includePartials() {
  return {
    name: 'include-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html, { filename }) {
        const back = relative(dirname(filename), ROOT).replace(/\\/g, '/');
        const root = back ? `${back}/` : './';
        return html
          .replace(/<!-- @include ([a-z-]+) -->/g, (_, name) => readFileSync(resolve(ROOT, 'src/partials', `${name}.html`), 'utf8'))
          .replaceAll('{{root}}', root);
      },
    },
    // Editing a partial reloads the page in development.
    configureServer(server) {
      server.watcher.add(resolve(ROOT, 'src/partials'));
      server.watcher.on('change', (file) => file.includes('/src/partials/') && server.ws.send({ type: 'full-reload' }));
    },
  };
}

const escapeAttr = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function setAttr(tag, attr, value) {
  const re = new RegExp(`\\s${attr}="[^"]*"`);
  const next = ` ${attr}="${escapeAttr(value)}"`;
  return re.test(tag) ? tag.replace(re, next) : tag.replace(/^(<[a-z0-9]+)/, `$1${next}`);
}

function required(value, what) {
  if (value === undefined) throw new Error(`prerender-copy: missing ${what}`);
  return value;
}

// Fills the page with the default language, contact details, link targets and
// the Instagram and Facebook icons at build time, so it has real content before any
// JavaScript runs. The same data-* hooks are reused by src/i18n.js at runtime.
function prerenderCopy() {
  const strings = copy[DEFAULT_LANG];
  const hrefs = links(DEFAULT_LANG);
  const svg = ({ path }) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;

  return {
    name: 'prerender-copy',
    transformIndexHtml(html) {
      return html
        .replace(
          /(<([a-z0-9]+)\b[^>]*\sdata-(i18n|contact)="([^"]+)"[^>]*>)[\s\S]*?(<\/\2>)/g,
          (match, open, tag, kind, key, close) => {
            const value = kind === 'i18n' ? lookup(strings, key) : contact[key];
            return open + required(value, `${kind} "${key}"`) + close;
          },
        )
        .replace(/<[a-z0-9]+\b[^>]*\sdata-(?:i18n-attr|link)="[^"]+"[^>]*>/g, (tag) => {
          let out = tag;
          const spec = tag.match(/\sdata-i18n-attr="([^"]+)"/);
          if (spec) {
            for (const pair of spec[1].split(',')) {
              const [attr, key] = pair.split(':').map((s) => s.trim());
              out = setAttr(out, attr, required(lookup(strings, key), `i18n "${key}"`));
            }
          }
          const link = tag.match(/\sdata-link="([^"]+)"/);
          if (link) out = setAttr(out, 'href', required(hrefs[link[1]], `link "${link[1]}"`));
          return out;
        })
        .replace(/<span class="ig-icon"><\/span>/g, `<span class="ig-icon">${svg(siInstagram)}</span>`)
        .replace(/<span class="fb-icon"><\/span>/g, `<span class="fb-icon">${svg(siFacebook)}</span>`)
        .replace(/<html lang="[^"]*"/, `<html lang="${DEFAULT_LANG}"`);
    },
  };
}

export default defineConfig({
  // Relative asset paths, so the build works under /bella-website/ on GitHub
  // Pages and on a custom domain later.
  base: './',
  plugins: [includePartials(), prerenderCopy()],
  worker: { format: 'es' },
  build: {
    // MapLibre is a ~1.1 MB chunk, but it is lazy-loaded near the map.
    chunkSizeWarningLimit: 1200,
    rollupOptions: { input: Object.fromEntries(PAGES.map((page) => [dirname(page) === '.' ? 'home' : dirname(page), resolve(ROOT, page)])) },
  },
});
