import { contact, copy } from './content.js';

// Every outbound contact link, for a given language.
export function links(lang) {
  const [lng, lat] = contact.coords;
  const message = encodeURIComponent(copy[lang].ui.whatsappMessage);
  return {
    whatsapp: `https://wa.me/${contact.whatsapp}?text=${message}`,
    tel: `tel:${contact.phoneHref}`,
    sms: `sms:${contact.phoneHref}`,
    mailto: `mailto:${contact.email}`,
    maps: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  };
}
