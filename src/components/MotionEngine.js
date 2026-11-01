/**
 * High Performance Motion & Interaction Engine
 * Matches exact physics: [0.22, 1, 0.36, 1] + spring tension
 */

export class MotionEngine {
  constructor() {
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.init();
  }

  init() {
    this.setupIntersectionObservers();
    this.setupViewfinderLens();
    this.setupParallaxTilt();
    this.setupStaggerText();
    this.setupCountUps();
    this.setupKeyboardShortcuts();
    this.setupHeroHorizontalMotion();
  }

  /**
   * Dual-Direction Scroll Velocity Controller for Hero Moving Headline (Web + Mobile)
   */
  setupHeroHorizontalMotion() {
    const row1 = document.getElementById('hero-move-row-1');
    const row2 = document.getElementById('hero-move-row-2');
    if (!row1 || !row2) return;

    let lastScrollY = window.scrollY;
    let scrollOffset = 0;
    let targetOffset = 0;
    let isTicking = false;

    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;

      // Scroll down accelerates Row 1 left, and Row 2 right
      targetOffset += delta * 0.65;

      if (!isTicking) {
        requestAnimationFrame(updateOffsets);
        isTicking = true;
      }
    };

    const updateOffsets = () => {
      scrollOffset += (targetOffset - scrollOffset) * 0.15;

      row1.style.marginLeft = `${-scrollOffset}px`;
      row2.style.marginLeft = `${scrollOffset}px`;

      if (Math.abs(targetOffset - scrollOffset) > 0.1) {
        requestAnimationFrame(updateOffsets);
      } else {
        isTicking = false;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /**
   * IntersectionObserver for DropIn, Pop, and Reveal elements
   */
  setupIntersectionObservers() {
    if (this.prefersReducedMotion) return;

    // threshold 0: reveal as soon as any part is on screen. A ratio threshold
    // (previously 0.1) needs 10% of the element visible, which for a ~4000px
    // stack of cards on a phone means scrolling deep into blank space first.
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -8% 0px',
      threshold: 0,
    };

    const inViewObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const motionType = el.dataset.motion;
          const delay = parseFloat(el.dataset.delay || 0);

          setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'none';
          }, delay * 1000);

          observer.unobserve(el);
        }
      });
    }, observerOptions);

    // Register motion elements
    document.querySelectorAll('[data-motion]').forEach((el) => {
      const type = el.dataset.motion;
      const initialRotation = el.dataset.rotate || 0;

      el.style.transition = 'opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1), transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.opacity = '0';
      el.style.willChange = 'opacity, transform';

      if (type === 'drop-in') {
        el.style.transform = `translateY(-30px) rotate(${initialRotation}deg) scale(0.92)`;
      } else if (type === 'pop') {
        el.style.transform = 'scale(0.88)';
      } else if (type === 'reveal') {
        el.style.transform = 'translateY(24px)';
      }

      inViewObserver.observe(el);
    });
  }

  /**
   * Fluid, requestAnimationFrame-driven Viewfinder Lens Cursor Tracking
   * Dead-accurate cursor centering inside the interactive target container
   */
  setupViewfinderLens() {
    if (window.innerWidth < 1024) return;

    const targets = document.querySelectorAll('[data-viewfinder-target]');
    
    targets.forEach((target) => {
      const lens = target.querySelector('.viewfinder-lens');
      if (!lens) return;

      let mouseX = 0;
      let mouseY = 0;
      let targetX = 0;
      let targetY = 0;
      let isHovering = false;
      let rafId = null;

      const updateLensPosition = () => {
        if (!isHovering) return;
        
        // Crisp, fluid interpolation (0.35 tension)
        targetX += (mouseX - targetX) * 0.35;
        targetY += (mouseY - targetY) * 0.35;

        lens.style.left = `${targetX}px`;
        lens.style.top = `${targetY}px`;

        if (Math.abs(mouseX - targetX) > 0.05 || Math.abs(mouseY - targetY) > 0.05) {
          rafId = requestAnimationFrame(updateLensPosition);
        } else {
          rafId = null;
        }
      };

      const computeCoords = (e) => {
        const rect = target.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
      };

      target.addEventListener('mouseenter', (e) => {
        isHovering = true;
        computeCoords(e);
        targetX = mouseX;
        targetY = mouseY;
        lens.style.left = `${targetX}px`;
        lens.style.top = `${targetY}px`;
        lens.style.opacity = '1';
        lens.style.transform = 'translate(-50%, -50%) scale(1)';
        if (!rafId) rafId = requestAnimationFrame(updateLensPosition);
      });

      target.addEventListener('mousemove', (e) => {
        computeCoords(e);
        if (!rafId) rafId = requestAnimationFrame(updateLensPosition);
      });

      target.addEventListener('mouseleave', () => {
        isHovering = false;
        lens.style.opacity = '0';
        lens.style.transform = 'translate(-50%, -50%) scale(0.4)';
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      });
    });
  }

  /**
   * Subtle Tactile Parallax Tilt on Hover for Polaroids & Preview Frames
   */
  setupParallaxTilt() {
    if (window.innerWidth < 1024 || this.prefersReducedMotion) return;

    const tiltElements = document.querySelectorAll('figure, .aspect-video, article [data-project]');

    tiltElements.forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        el.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-2px)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  /**
   * Letter-by-Letter Staggered Reveal Animation
   */
  setupStaggerText() {
    const textEls = document.querySelectorAll('[data-stagger-text]');

    textEls.forEach((el) => {
      const text = el.textContent.trim();
      el.innerHTML = '';

      // Screen readers get the whole word once; the per-letter spans are visual only.
      const srText = document.createElement('span');
      srText.className = 'sr-only';
      srText.textContent = text;
      el.appendChild(srText);

      [...text].forEach((char, idx) => {
        const span = document.createElement('span');
        span.setAttribute('aria-hidden', 'true');
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.style.display = 'inline-block';
        span.style.transition = `transform 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 0.025}s, opacity 0.4s ease ${idx * 0.025}s`;
        span.style.opacity = '1';
        el.appendChild(span);
      });
    });
  }

  /**
   * High Impact CountUp Animation for Commercial Metrics
   */
  setupCountUps() {
    const countEls = document.querySelectorAll('[data-count]');

    const countObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = el.dataset.count;
          el.textContent = target;
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    countEls.forEach((el) => countObserver.observe(el));
  }

  /**
   * Global Keyboard Shortcuts
   */
  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('caseModal');
        if (modal && !modal.classList.contains('opacity-0')) {
          window.closeModal();
        }
      }
    });
  }
}
