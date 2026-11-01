/**
 * Smooth scrolling for mouse wheels and trackpads (Lenis).
 * Mouse wheels move the page in ~100px jumps; this eases those jumps so the
 * text and the 3D camera glide together. Touch screens keep native scrolling.
 *
 * Source file. The browser loads src/app/scroll.bundle.js — rebuild with
 * `npm run build:scroll` after editing.
 */
import Lenis from 'lenis';

export function createSmoothScroll({ headerOffset = () => 76 } = {}) {
  const lenis = new Lenis({ lerp: 0.11, smoothWheel: true, syncTouch: false, wheelMultiplier: 1 });

  let raf = 0;
  const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);

  // In-page links (#work, #contact, …) glide to their section, clearing the fixed header.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('skip-link')) return;   // the skip link keeps native focus behaviour
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: id === 'top' ? 0 : -headerOffset(), duration: 1.4 });
    history.replaceState(null, '', `#${id}`);
    // Move keyboard focus to the section, as a normal anchor jump would.
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  return {
    stop: () => lenis.stop(),
    start: () => lenis.start(),
    destroy: () => { cancelAnimationFrame(raf); lenis.destroy(); },
  };
}
