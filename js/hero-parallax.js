/**
 * Layered hero parallax controller.
 *
 * Drives three CSS custom properties on the layered hero section:
 *   --hero-px : pointer X, normalized to [-1, 1]
 *   --hero-py : pointer Y, normalized to [-1, 1]
 *   --hero-sp : scroll progress through the outer scroll container, [0, 1]
 *
 * The properties are set on `.hero-section--layered` (the section root) so
 * both `.hero-stage` (the hero slide) and `.hero-supporting` (the next slide)
 * can read them via inheritance. The handoff is intentionally simple: a
 * scroll-linked crossfade, like a presentation fade transition.
 *
 * Design constraints:
 *   - rAF-throttled, single loop per channel.
 *   - Gated by IntersectionObserver so we do nothing while the hero is offscreen.
 *   - Honors prefers-reduced-motion (no listeners attached).
 *   - Pointer parallax only on hover-capable, fine pointers (skips touch).
 *   - No layout reads inside the rAF loop except a single getBoundingClientRect
 *     on the scroll container (cheap, composited transforms are the only writes).
 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const section = document.querySelector('.hero-section--layered');
  const stage = document.querySelector('[data-hero-stage]');
  const scroller = stage ? stage.closest('.hero-scroll') : null;
  if (!section || !stage || !scroller) return;

  const reduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const finePointer =
    window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Shared visibility flag — both channels short-circuit when offscreen.
  let visible = false;

  // ---- Pointer parallax (eased toward target each frame) ----
  let targetPx = 0;
  let targetPy = 0;
  let currPx = 0;
  let currPy = 0;
  let pointerFrame = 0;

  const PX_EASE = 0.085; // critical-damp-ish smoothing factor
  const PX_EPS = 0.001; // settle threshold

  function tickPointer() {
    pointerFrame = 0;
    currPx += (targetPx - currPx) * PX_EASE;
    currPy += (targetPy - currPy) * PX_EASE;
    section.style.setProperty('--hero-px', currPx.toFixed(3));
    section.style.setProperty('--hero-py', currPy.toFixed(3));
    if (visible && (Math.abs(currPx - targetPx) > PX_EPS || Math.abs(currPy - targetPy) > PX_EPS)) {
      pointerFrame = requestAnimationFrame(tickPointer);
    }
  }

  function onPointerMove(e) {
    // Use viewport coordinates against the (sticky) stage rect.
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const nx = (e.clientX - cx) / (rect.width / 2);
    const ny = (e.clientY - cy) / (rect.height / 2);
    targetPx = nx < -1 ? -1 : nx > 1 ? 1 : nx;
    targetPy = ny < -1 ? -1 : ny > 1 ? 1 : ny;
    if (!pointerFrame && visible) pointerFrame = requestAnimationFrame(tickPointer);
  }

  if (finePointer) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
  }

  // ---- Scroll progress ----
  // sp remains available for small scroll-linked details, while the hero
  // itself now hands off through normal document flow rather than a crossfade.
  let scrollFrame = 0;

  function tickScroll() {
    scrollFrame = 0;
    const rect = scroller.getBoundingClientRect();
    const total = rect.height; // parallax range (height of placeholder)
    let progress = total > 0 ? -rect.top / total : 0;
    if (progress < 0) progress = 0;
    else if (progress > 1) progress = 1;
    section.style.setProperty('--hero-sp', progress.toFixed(3));
  }

  function onScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(tickScroll);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // ---- Visibility gating ----
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        visible = entry.isIntersecting;
        if (visible) {
          // Re-sync immediately so we don't paint a stale frame.
          if (!scrollFrame) scrollFrame = requestAnimationFrame(tickScroll);
        } else if (pointerFrame) {
          // Drift the pointer back to neutral while offscreen.
          targetPx = 0;
          targetPy = 0;
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0 }
    );
    io.observe(scroller);
  } else {
    visible = true;
  }

  // Prime initial values so the stage isn't unstyled until first interaction.
  tickScroll();
})();
