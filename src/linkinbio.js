import { contact, copy, studios } from './content.js';
import { currentLang } from './i18n.js';
import { whoosh } from './sound.js';

// The link in bio (linkinbio/): its opening, the selector that turns the 3D
// figure between the three methods, the save-my-contact card and the buttons
// that copy a studio's address.

export function initLinkInBio(main, { signal } = {}) {
  if (main?.dataset.page !== 'links') return;
  opening(main.querySelector('[data-lb-hero]'), signal);
  methods(main.querySelector('[data-lb-methods]'), main, signal);
  saveContact(main.querySelector('[data-lb-vcard]'), signal);
  for (const button of main.querySelectorAll('[data-lb-copy]')) copyAddress(button, signal);
}

// The dark opens on her portrait like an arch of light, then her name, the
// award and her honours rise one after another. On a first visit it waits for
// the sound and language choice to close.
function opening(hero, signal) {
  if (!hero) return;
  hero.querySelectorAll('[data-lb-rise]').forEach((el, i) => el.style.setProperty('--delay', `${0.85 + i * 0.13}s`));
  const html = document.documentElement;
  const open = () => {
    if (signal?.aborted) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        hero.classList.add('is-open');
        whoosh(0.8, { long: true, peakIn: 0.8 });
      }),
    );
  };
  if (!html.classList.contains('portal-open')) return open();
  const wait = new MutationObserver(() => {
    if (html.classList.contains('portal-open')) return;
    wait.disconnect();
    setTimeout(open, 500);
  });
  wait.observe(html, { attributes: true, attributeFilter: ['class'] });
  signal?.addEventListener('abort', () => wait.disconnect());
}

// Face, Signature TCM or Body: the 3D figure (src/sculpture) follows, and the
// method's few words beneath change with it.
function methods(root, main, signal) {
  if (!root) return;
  const chips = [...root.querySelectorAll('[data-method]')];
  const leads = [...main.querySelectorAll('[data-method-lead]')];
  root.addEventListener(
    'click',
    (event) => {
      const chip = event.target.closest('[data-method]');
      if (!chip || chip.getAttribute('aria-pressed') === 'true') return;
      const method = chip.dataset.method;
      for (const c of chips) c.setAttribute('aria-pressed', String(c === chip));
      for (const lead of leads) lead.classList.toggle('is-shown', lead.dataset.methodLead === method);
      whoosh(0.45);
      document.dispatchEvent(new CustomEvent('treatmentgroup', { detail: Number(method) }));
    },
    { signal },
  );
}

// A vCard of Bella, made when tapped, so phones offer to add her to contacts.
function saveContact(link, signal) {
  if (!link) return;
  const site = new URL('../', location.href).href;
  const line = (text) => text.replace(/[\\;,]/g, (c) => `\\${c}`);
  link.addEventListener(
    'click',
    () => {
      const note = currentLang() === 'sv' ? `Boka på Bokadirekt: ${contact.bokadirekt}` : `Book on Bokadirekt: ${contact.bokadirekt}`;
      const card = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N:Bayar;Bella;;;',
        'FN:Bella Bayar',
        'ORG:BE BEAUTY Salon & Academy',
        'TITLE:Face Sculptor',
        `EMAIL;TYPE=INTERNET:${contact.email}`,
        `URL:${site}`,
        ...studios.map(({ street, postcode }) => `ADR;TYPE=WORK:;;${line(street)};Stockholm;;${postcode};Sweden`),
        `X-SOCIALPROFILE;TYPE=instagram:${contact.instagramUrl}`,
        `NOTE:${line(note)}`,
        'END:VCARD',
      ].join('\r\n');
      URL.revokeObjectURL(link.href);
      link.href = URL.createObjectURL(new Blob([card], { type: 'text/vcard;charset=utf-8' }));
      link.download = 'Bella Bayar.vcf';
    },
    { signal },
  );
}

// Copies "Street, postcode Stockholm", and says so for a moment.
function copyAddress(button, signal) {
  const { street, postcode } = studios[Number(button.dataset.lbCopy)];
  let reset = 0;
  button.addEventListener(
    'click',
    () => {
      navigator.clipboard
        ?.writeText(`${street}, ${postcode} Stockholm`)
        .then(() => {
          const words = copy[currentLang()].pages.links;
          button.textContent = words.copied;
          clearTimeout(reset);
          reset = setTimeout(() => (button.textContent = copy[currentLang()].pages.links.copy), 1800);
        })
        .catch(() => {});
    },
    { signal },
  );
}
