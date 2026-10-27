import { defineConfig } from 'vite';
import { siInstagram } from 'simple-icons';
import { contact, copy, DEFAULT_LANG } from './src/content.js';
import { lookup } from './src/i18n-lookup.js';
import { links } from './src/links.js';

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
// the Instagram icon at build time, so it has real content before any
// JavaScript runs. The same data-* hooks are reused by src/i18n.js at runtime.
function prerenderCopy() {
  const strings = copy[DEFAULT_LANG];
  const hrefs = links(DEFAULT_LANG);
  const icon = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${siInstagram.path}"/></svg>`;

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
        .replace(/<span class="ig-icon"><\/span>/g, `<span class="ig-icon">${icon}</span>`)
        .replace(/<html lang="[^"]*"/, `<html lang="${DEFAULT_LANG}"`);
    },
  };
}

export default defineConfig({
  // Relative asset paths, so the build works under /bella-website/ on GitHub
  // Pages and on a custom domain later.
  base: './',
  plugins: [prerenderCopy()],
  worker: { format: 'es' },
  // MapLibre is a ~1.1 MB chunk, but it is lazy-loaded near the contact section.
  build: { chunkSizeWarningLimit: 1200 },
});
