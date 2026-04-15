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

    const savedTheme = localStorage.getItem('theme') || 'light';
    this.setTheme(savedTheme);

    themeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      this.setTheme(newTheme);
      this.announce(`Switched to ${newTheme} mode`);
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  setTheme(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    if (themeToggle) {
      const isDark = theme === 'dark';
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Code Dark Mode');
      themeToggle.title = isDark ? 'Switch to Light Mode' : 'Switch to Code Dark Mode';
    }

    if (themeIcon) {
      themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

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
          particles.pJS.canvas.el.style.backgroundColor = theme === 'dark'
            ? (isIndustryHome ? '#252526' : '#1e1e1e')
            : '#ffffff';
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
      'ML Research Scientist at Captura',
      'AI & Computer Vision Expert',
      'Federated Learning Researcher',
      'PhD from Queen\'s University',
      '17+ Publications in Top Venues'
    ];
    let texts = fallbackTexts;

    if (typingElement.dataset.typingTexts) {
      try {
        const configuredTexts = JSON.parse(typingElement.dataset.typingTexts);
        if (Array.isArray(configuredTexts) && configuredTexts.every(text => typeof text === 'string')) {
          texts = configuredTexts;
        }
      } catch (error) {
        texts = fallbackTexts;
      }
    }

    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 100;
    const deleteSpeed = 50;
    const pauseTime = 2000;

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

    setTimeout(type, 1000);
  }

  setupPerformanceOptimizations() {
    this.lazyLoadImages();
    this.optimizeScrollPerformance();
  }

  lazyLoadImages() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
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

      document.querySelectorAll('img[data-src]').forEach(img => {
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

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollEffects);
        ticking = true;
      }
    }, { passive: true });
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
    const liveRegion = document.querySelector('.sr-only[aria-live]');
    if (liveRegion) {
      liveRegion.textContent = message;
    }
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
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
          const targetPosition = target.offsetTop - headerHeight - 20;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          this.announce(`Navigated to ${target.textContent || 'section'}`);
        }
      });
    });
  }

  setupIntersectionObserver() {
    const observerOptions = {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1
    };

    const revealElements = document.querySelectorAll('.industry-home .timeline-item, .industry-home .focus-card, .industry-home .education-card');
    if (revealElements.length > 0) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          } else {
            entry.target.classList.remove('visible');
          }
        });
      }, { rootMargin: '0px 0px -20% 0px', threshold: 0 });

      revealElements.forEach((element, index) => {
        element.style.transitionDelay = `${Math.min(index * 0.06, 0.24)}s`;
        revealObserver.observe(element);
      });
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');

          if (entry.target.classList.contains('news-list') ||
              entry.target.classList.contains('experience-list') ||
              entry.target.classList.contains('education-list')) {
            const items = entry.target.querySelectorAll('li');
            items.forEach((item, index) => {
              item.style.animationDelay = `${index * 0.1}s`;
              item.classList.add('animate-in');
            });
          }
        }
      });
    }, observerOptions);

    document.querySelectorAll('.section').forEach(section => {
      observer.observe(section);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new WebsiteEnhancer());
} else {
  new WebsiteEnhancer();
}
