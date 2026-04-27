/**
 * Modern JavaScript enhancements for Mahdiyar Molahasani's website
 */

class WebsiteEnhancer {
  constructor() {
    this.init();
  }

  init() {
    this.setupThemeToggle();
    this.setupTypingAnimation();
    this.setupPerformanceOptimizations();
    this.setupAccessibilityFeatures();
    this.setupModernInteractions();
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const segments = Array.from(themeToggle.querySelectorAll('[data-theme-value]'));
    const validValues = ['light', 'auto', 'dark'];
    const stored = localStorage.getItem('theme');
    let userTheme = validValues.includes(stored) ? stored : 'auto';

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const resolveEffective = (choice) => {
      if (choice === 'auto') return mediaQuery.matches ? 'dark' : 'light';
      return choice;
    };

    const refreshSegments = () => {
      segments.forEach((seg) => {
        const isActive = seg.dataset.themeValue === userTheme;
        seg.setAttribute('aria-checked', String(isActive));
        seg.tabIndex = isActive ? 0 : -1;
      });
      const srLabel = document.getElementById('theme-toggle-label');
      if (srLabel) {
        const eff = resolveEffective(userTheme);
        const desc = userTheme === 'auto' ? `auto (currently ${eff})` : userTheme;
        srLabel.textContent = `Theme: ${desc}. Use arrow keys to choose light, auto, or dark.`;
      }
    };

    const applyChoice = (choice, opts = {}) => {
      userTheme = choice;
      try {
        localStorage.setItem('theme', choice);
      } catch (_) {}
      this.setTheme(resolveEffective(choice));
      refreshSegments();
      if (opts.announce) {
        const eff = resolveEffective(choice);
        const msg =
          choice === 'auto'
            ? `Theme set to auto (currently ${eff} mode)`
            : `Theme set to ${choice} mode`;
        this.announce(msg);
      }
    };

    segments.forEach((seg) => {
      seg.addEventListener('click', (e) => {
        e.preventDefault();
        applyChoice(seg.dataset.themeValue, { announce: true });
        seg.focus();
      });
      seg.addEventListener('keydown', (e) => {
        const idx = segments.indexOf(seg);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = segments[(idx + 1) % segments.length];
          applyChoice(next.dataset.themeValue, { announce: true });
          next.focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = segments[(idx - 1 + segments.length) % segments.length];
          applyChoice(prev.dataset.themeValue, { announce: true });
          prev.focus();
        } else if (e.key === 'Home') {
          e.preventDefault();
          applyChoice(segments[0].dataset.themeValue, { announce: true });
          segments[0].focus();
        } else if (e.key === 'End') {
          e.preventDefault();
          const last = segments[segments.length - 1];
          applyChoice(last.dataset.themeValue, { announce: true });
          last.focus();
        }
      });
    });

    mediaQuery.addEventListener('change', () => {
      if (userTheme === 'auto') {
        this.setTheme(resolveEffective('auto'));
        refreshSegments();
      }
    });

    applyChoice(userTheme);
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    try {
      if (window.pJSDom && window.pJSDom.length > 0) {
        const particles = window.pJSDom[0];

        if (particles && particles.pJS && particles.pJS.particles) {
          if (theme === 'dark') {
            particles.pJS.particles.color.value = '#007acc';
            particles.pJS.particles.line_linked.color = '#007acc';
            particles.pJS.particles.line_linked.opacity = 0.3;
            particles.pJS.particles.opacity.value = 0.8;
          } else {
            particles.pJS.particles.color.value = '#000000';
            particles.pJS.particles.line_linked.color = '#000000';
            particles.pJS.particles.line_linked.opacity = 0.4;
            particles.pJS.particles.opacity.value = 0.6;
          }
        }

        if (particles.pJS.fn && particles.pJS.fn.particlesRefresh) {
          particles.pJS.fn.particlesRefresh();
        }

        if (particles.pJS.canvas && particles.pJS.canvas.el) {
          const isIndustryHome = document.body.classList.contains('industry-home');
          particles.pJS.canvas.el.style.backgroundColor =
            theme === 'dark' ? (isIndustryHome ? '#252526' : '#1e1e1e') : '#ffffff';
        }
      }
    } catch (error) {
      // Silently handle particles update errors
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    }
  }

  setupTypingAnimation() {
    const typingElement = document.getElementById('typing-text');
    if (!typingElement) return;

    const fallbackTexts = [
      'ML Researcher II at Captura',
      'Applied AI & Computer Vision',
      'Federated Learning Researcher',
      "PhD from Queen's University",
      'Top Reviewer, NeurIPS 2024',
    ];
    let texts = fallbackTexts;

    if (typingElement.dataset.typingTexts) {
      try {
        const configuredTexts = JSON.parse(typingElement.dataset.typingTexts);
        if (
          Array.isArray(configuredTexts) &&
          configuredTexts.every((text) => typeof text === 'string')
        ) {
          texts = configuredTexts;
        }
      } catch (error) {
        texts = fallbackTexts;
      }
    }

    let textIndex = 0;
    let charIndex = texts[0].length;
    let isDeleting = true;
    let typeSpeed = 100;
    const deleteSpeed = 50;
    const pauseTime = 2000;
    typingElement.textContent = texts[0];

    document.addEventListener('sitedata:typing', (e) => {
      const incoming = e?.detail?.texts;
      if (
        Array.isArray(incoming) &&
        incoming.length &&
        incoming.every((t) => typeof t === 'string')
      ) {
        texts = incoming;
        if (textIndex >= texts.length) textIndex = 0;
      }
    });

    const type = () => {
      const currentText = texts[textIndex];

      if (isDeleting) {
        typingElement.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
        typeSpeed = deleteSpeed;
      } else {
        typingElement.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
        typeSpeed = 100;
      }

      if (!isDeleting && charIndex === currentText.length) {
        typeSpeed = pauseTime;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
        typeSpeed = 500;
      }

      setTimeout(type, typeSpeed);
    };

    setTimeout(type, pauseTime);
  }

  setupPerformanceOptimizations() {
    this.lazyLoadImages();
    this.optimizeScrollPerformance();
  }

  lazyLoadImages() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.classList.remove('lazy');
              observer.unobserve(img);
            }
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach((img) => {
        imageObserver.observe(img);
      });
    }
  }

  optimizeScrollPerformance() {
    let ticking = false;

    const updateScrollEffects = () => {
      this.updateHeaderOnScroll();
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(updateScrollEffects);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  updateHeaderOnScroll() {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  }

  setupAccessibilityFeatures() {
    this.setupKeyboardNavigation();
    this.setupReducedMotionSupport();
  }

  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });

    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === 'r') {
        e.preventDefault();
        window.location.href = '/research';
      }
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        window.location.href = '/';
      }
    });
  }

  announce(message) {
    const liveRegion =
      document.getElementById('sr-announcer') || document.querySelector('.sr-only[aria-live]');
    if (!liveRegion) return;
    liveRegion.textContent = '';
    requestAnimationFrame(() => {
      liveRegion.textContent = message;
    });
  }

  setupReducedMotionSupport() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleMotionChange = (e) => {
      if (e.matches) {
        document.documentElement.style.setProperty('--transition-fast', '0ms');
        document.documentElement.style.setProperty('--transition-normal', '0ms');
        document.documentElement.style.setProperty('--transition-slow', '0ms');
      } else {
        document.documentElement.style.setProperty('--transition-fast', '150ms ease-in-out');
        document.documentElement.style.setProperty('--transition-normal', '250ms ease-in-out');
        document.documentElement.style.setProperty('--transition-slow', '350ms ease-in-out');
      }
    };

    handleMotionChange(prefersReducedMotion);
    prefersReducedMotion.addEventListener('change', handleMotionChange);
  }

  setupModernInteractions() {
    this.setupSmoothScrolling();
    this.setupIntersectionObserver();
  }

  setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
          const targetPosition = target.offsetTop - headerHeight - 20;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth',
          });

          this.announce(`Navigated to ${target.textContent || 'section'}`);
        }
      });
    });
  }

  setupIntersectionObserver() {
    const observerOptions = {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1,
    };

    // Initialize typewriter elements by splitting text into spans
    const typewriterElements = document.querySelectorAll('[data-typewriter]');
    typewriterElements.forEach((el) => {
      // Normalize all whitespace so HTML formatting/indentation does not
      // create visual gaps between words when wrapped in span elements.
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      const words = text.split(' ');
      el.innerHTML = words.map((word) => `<span class="word">${word}</span>`).join(' ');
    });

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          entry.target.classList.add('visible');

          // Handle Typewriter effect
          if (
            entry.target.querySelector('[data-typewriter]') ||
            entry.target.hasAttribute('data-typewriter')
          ) {
            const el = entry.target.hasAttribute('data-typewriter')
              ? entry.target
              : entry.target.querySelector('[data-typewriter]');
            const words = el.querySelectorAll('.word');
            words.forEach((word, index) => {
              // Fast "LLM Stream" vibe: ~40ms between words
              setTimeout(() => {
                word.classList.add('revealed');
              }, index * 40);
            });
          }

          // If it's a stagger container, animate children one by one
          if (entry.target.classList.contains('stagger-container')) {
            const children = entry.target.children;
            Array.from(children).forEach((child, index) => {
              child.style.transitionDelay = `${index * 0.15}s`;
              child.classList.add('revealed');
              child.classList.add('visible');
            });
          }
        }
      });
    }, observerOptions);

    // Apply to all elements with data-reveal attribute and sections
    document.querySelectorAll('[data-reveal], .stagger-container').forEach((el) => {
      revealObserver.observe(el);
    });

    // Backwards compatibility for existing .section classes
    document.querySelectorAll('.section').forEach((section) => {
      section.setAttribute('data-reveal', '');
      revealObserver.observe(section);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new WebsiteEnhancer());
} else {
  new WebsiteEnhancer();
}
