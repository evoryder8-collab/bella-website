// The Hudterapeuten cover comes alive the first time it scrolls fully into
// view: it opens, riffles through its pages and shuts (src/magazine/book.js).
// The three.js code and the painted pages load only once the cover is near,
// and the photo stays as it is if WebGL is missing.

export function initMagazine(figure) {
  if (!figure || navigator.connection?.saveData) return;
  const img = figure.querySelector('img');
  let book = null;
  const load = () =>
    (book ??= import('./magazine/book.js')
      .then(({ createBook }) => createBook(figure, img))
      .catch((error) => {
        console.warn('Magazine unavailable:', error);
        return null;
      }));

  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      near.disconnect();
      load();
    },
    { rootMargin: '120% 0px' },
  );
  near.observe(img);

  const seen = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.intersectionRatio >= 0.75)) return;
      seen.disconnect();
      load().then((ready) => ready && setTimeout(() => ready.play(), 180));
    },
    { threshold: 0.75 },
  );
  seen.observe(img);
}
