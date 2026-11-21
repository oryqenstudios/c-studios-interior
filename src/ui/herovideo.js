// Hero: a clip that plays by itself once the page has opened, then holds on its last
// frame. Its text floats in and out on the clip's own clock (data-from / data-to are
// fractions of the clip's length). With reduced motion the clip does not play: the
// finished room is shown as a still.
const FADE = 0.06;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function initHeroVideo({ reducedMotion }) {
  const hero = document.getElementById('hero');
  const video = hero?.querySelector('.film__video');
  if (!video) return null;
  const scrim = hero.querySelector('.film__scrim');
  const lines = [...hero.querySelectorAll('[data-from]')].map((el) => ({ el, from: Number(el.dataset.from), to: Number(el.dataset.to) }));
  const tall = window.innerWidth / window.innerHeight < 0.8;
  const version = __ASSET_VERSION__;
  const file = (name, ext) => `/film/hero/${name}-${tall ? 'tall' : 'wide'}.${ext}?v=${version}`;

  function apply(progress) {
    let strongest = 0;
    for (const { el, from, to } of lines) {
      const fadeIn = from <= 0 ? 1 : clamp01((progress - from) / FADE);
      const fadeOut = to >= 1 ? 1 : clamp01((to - progress) / FADE);
      const opacity = Math.min(fadeIn, fadeOut);
      el.style.opacity = opacity;
      // The block holding the page's main heading only fades, so screen readers can
      // always reach it; the other lines are hidden outright when off screen.
      if (!el.querySelector('h1')) el.style.visibility = opacity > 0 ? 'visible' : 'hidden';
      if (!reducedMotion) {
        const life = clamp01((progress - from) / (to - from));
        el.style.setProperty('--float-y', `${((1 - fadeIn) * 56 - (1 - fadeOut) * 40 - life * 14).toFixed(1)}px`);
      }
      strongest = Math.max(strongest, opacity);
    }
    if (scrim) scrim.style.opacity = strongest;
  }

  if (reducedMotion) {
    // The finished room as a still, with the studio name over it.
    video.poster = file('final', 'jpg');
    apply(0);
    return { play() {} };
  }

  video.poster = file('poster', 'jpg');
  video.src = file('hero', 'mp4');
  apply(0);

  let frame = 0;
  const tick = () => {
    apply(video.duration ? video.currentTime / video.duration : 0);
    if (!video.paused && !video.ended) frame = requestAnimationFrame(tick);
  };
  video.addEventListener('play', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  });
  video.addEventListener('ended', () => apply(1));

  let played = false;
  const play = () => {
    played = true;
    video.currentTime = 0;
    // Autoplay can be refused (for example in a low-power mode). The poster and the
    // title stay in place if so, and the clip starts on the first tap.
    video.play().catch(() => hero.addEventListener('pointerdown', () => video.play().catch(() => {}), { once: true }));
  };

  // Play again when the visitor comes back up to the top after having left the hero.
  let away = false;
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) away = true;
    else if (away && played && video.ended) {
      away = false;
      play();
    }
  }).observe(hero);

  return { play };
}
