import { contact, copy, studios } from './content.js';

const mail = (subject) => `mailto:${contact.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
const directions = ({ street, postcode }) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${street}, ${postcode} Stockholm`)}`;

// Every outbound link, for a given language (only the email subjects change).
export function links(lang) {
  const { offers } = copy[lang];
  return {
    book: contact.bokadirekt,
    mailto: mail(),
    academy: mail(offers.academySubject),
    corporate: mail(offers.corporateSubject),
    instagram: contact.instagramUrl,
    facebook: contact.facebookUrl,
    directions0: directions(studios[0]),
    directions1: directions(studios[1]),
  };
}
