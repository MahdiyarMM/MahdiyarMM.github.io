/**
 * Modern JavaScript enhancements for Mahdiyar Molahasani's website
 * Features: Performance optimization, accessibility, and modern interactions
 */

class WebsiteEnhancer {
  constructor() {
    this.init();
  }

  init() {
    console.log('🚀 WebsiteEnhancer initializing...');
    console.log('Document ready state:', document.readyState);
    console.log('Current theme attribute:', document.documentElement.getAttribute('data-theme'));
    
    this.setupThemeToggle();
    this.setupPerformanceOptimizations();
    this.setupAccessibilityFeatures();
    this.setupModernInteractions();
    this.setupAnalytics();
    
    console.log('✅ WebsiteEnhancer initialization complete');
  }

  /**
   * Theme toggle functionality
   */
  setupThemeToggle() {
    console.log('🔧 Setting up theme toggle...');
    
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    console.log('Theme toggle button:', themeToggle);
    console.log('Theme icon:', themeIcon);
    
    if (!themeToggle) {
      console.error('❌ Theme toggle button not found!');
      return;
    }
    
    if (!themeIcon) {
      console.error('❌ Theme icon not found!');
      return;
    }

    console.log('✅ Theme toggle elements found');

    // Get saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    console.log('Saved theme from localStorage:', savedTheme);
    
    this.setTheme(savedTheme);

    // Toggle theme on button click
    themeToggle.addEventListener('click', (e) => {
      console.log('🖱️ Theme toggle button clicked!');
      e.preventDefault();
      
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      console.log('Current theme:', currentTheme);
      
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      console.log('Switching to theme:', newTheme);
      
      this.setTheme(newTheme);
      this.announce(`Switched to ${newTheme} mode`);
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    console.log('System prefers dark mode:', mediaQuery.matches);
    
    mediaQuery.addEventListener('change', (e) => {
      console.log('System theme changed to:', e.matches ? 'dark' : 'light');
      if (!localStorage.getItem('theme')) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  /**
   * Set theme and update UI
   */
  setTheme(theme) {
    console.log('🎨 Setting theme to:', theme);
    
    const themeIcon = document.getElementById('theme-icon');
    console.log('Theme icon element:', themeIcon);
    
    // Set the data-theme attribute
    document.documentElement.setAttribute('data-theme', theme);
    console.log('Document data-theme set to:', document.documentElement.getAttribute('data-theme'));
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    console.log('Theme saved to localStorage:', localStorage.getItem('theme'));
    
    // Update icon
    if (themeIcon) {
      const newIconClass = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      console.log('Updating icon class from', themeIcon.className, 'to', newIconClass);
      themeIcon.className = newIconClass;
    } else {
      console.error('❌ Theme icon not found for update');
    }

    // Check if CSS variables are being applied
    const computedStyle = getComputedStyle(document.documentElement);
    const bgColor = computedStyle.getPropertyValue('--background');
    const textColor = computedStyle.getPropertyValue('--text-primary');
    console.log('CSS variables - background:', bgColor, 'text:', textColor);

            // Update particles.js colors for dark mode - COMPREHENSIVE DEBUGGING
            try {
              console.log('🔍 PARTICLE DEBUGGING START');
              console.log('window.pJSDom exists:', !!window.pJSDom);
              console.log('window.pJSDom length:', window.pJSDom ? window.pJSDom.length : 'N/A');

              if (window.pJSDom && window.pJSDom.length > 0) {
                console.log('✅ pJSDom found, accessing first instance');
                const particles = window.pJSDom[0];
                console.log('Particles instance:', particles);
                console.log('Particles keys:', particles ? Object.keys(particles) : 'N/A');

                if (particles && particles.pJS) {
                  console.log('✅ pJS found');
                  console.log('pJS keys:', Object.keys(particles.pJS));
                  console.log('pJS.particles exists:', !!particles.pJS.particles);
                  console.log('pJS.canvas exists:', !!particles.pJS.canvas);
                  console.log('pJS.fn exists:', !!particles.pJS.fn);

                  // Check if particles object exists
                  if (particles.pJS.particles) {
                    console.log('✅ particles.pJS.particles found');
                    console.log('particles.pJS.particles keys:', Object.keys(particles.pJS.particles));

                    if (theme === 'dark') {
                      console.log('🎨 Setting DARK theme colors');
                      particles.pJS.particles.color.value = '#007acc';
                      particles.pJS.particles.line_linked.color = '#007acc';
                      particles.pJS.particles.line_linked.opacity = 0.3;
                      particles.pJS.particles.opacity.value = 0.8;
                      console.log('Dark colors set:', {
                        color: particles.pJS.particles.color.value,
                        line_color: particles.pJS.particles.line_linked.color,
                        line_opacity: particles.pJS.particles.line_linked.opacity,
                        opacity: particles.pJS.particles.opacity.value
                      });

                      // Set background to dark
                      if (particles.pJS.particles.background) {
                        particles.pJS.particles.background.color.value = '#1e1e1e';
                        console.log('Background set to dark');
                      } else {
                        console.log('⚠️ No background object found');
                      }
                    } else {
                      console.log('🎨 Setting LIGHT theme colors');
                      particles.pJS.particles.color.value = '#000000';
                      particles.pJS.particles.line_linked.color = '#000000';
                      particles.pJS.particles.line_linked.opacity = 0.4;
                      particles.pJS.particles.opacity.value = 0.6;
                      console.log('Light colors set');

                      // Set background to light
                      if (particles.pJS.particles.background) {
                        particles.pJS.particles.background.color.value = '#ffffff';
                        console.log('Background set to light');
                      }
                    }
                  } else {
                    console.warn('❌ particles.pJS.particles not found');
                    console.log('Available pJS properties:', Object.keys(particles.pJS));
                  }

                  // Force particles to refresh with new colors
                  if (particles.pJS.fn && particles.pJS.fn.particlesRefresh) {
                    console.log('🔄 Refreshing particles...');
                    particles.pJS.fn.particlesRefresh();
                    console.log('✅ Particles refreshed');
                  } else {
                    console.warn('❌ particlesRefresh function not found');
                    console.log('Available fn methods:', particles.pJS.fn ? Object.keys(particles.pJS.fn) : 'No fn object');
                  }

                  // Set the canvas background more gently
                  if (particles.pJS.canvas && particles.pJS.canvas.el) {
                    const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
                    particles.pJS.canvas.el.style.backgroundColor = bgColor;
                    console.log('✅ Canvas background set to:', bgColor);
                  } else {
                    console.warn('❌ Canvas element not found');
                    console.log('Canvas object:', particles.pJS.canvas);
                  }
                } else {
                  console.warn('❌ pJS object not found');
                }
              } else {
                console.warn('❌ No pJSDom instances found');
                console.log('Available window properties:', Object.keys(window).filter(k => k.includes('particle')));
              }

              console.log('🔍 PARTICLE DEBUGGING END');
            } catch (error) {
              console.error('❌ Error updating particles:', error);
              console.error('Error stack:', error.stack);
            }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = theme === 'dark' ? '#1e1e1e' : '#ffffff';
      console.log('Meta theme-color updated to:', metaThemeColor.content);
    } else {
      console.log('Meta theme-color element not found');
    }
    
    console.log('✅ Theme setup complete');
  }

  /**
   * Performance optimizations
   */
  setupPerformanceOptimizations() {
    // Lazy load images
    this.lazyLoadImages();
    
    // Preload critical resources
    this.preloadCriticalResources();
    
    // Optimize scroll performance
    this.optimizeScrollPerformance();
  }

  /**
   * Lazy load images for better performance
   */
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

  /**
   * Preload critical resources
   */
  preloadCriticalResources() {
    const criticalResources = [
      { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', as: 'style' },
      { href: 'scholar_data.json', as: 'fetch', crossorigin: 'anonymous' }
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.crossorigin) {
        link.crossOrigin = resource.crossorigin;
      }
      document.head.appendChild(link);
    });
  }

  /**
   * Optimize scroll performance with throttling
   */
  optimizeScrollPerformance() {
    let ticking = false;

    const updateScrollEffects = () => {
      this.updateHeaderOnScroll();
      this.updateProgressIndicator();
      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollEffects);
        ticking = true;
      }
    };

    window.addEventListener('scroll', requestTick, { passive: true });
  }

  /**
   * Update header appearance on scroll
   */
  updateHeaderOnScroll() {
    const header = document.querySelector('.header');
    const scrollY = window.scrollY;

    if (scrollY > 100) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  }

  /**
   * Update reading progress indicator
   */
  updateProgressIndicator() {
    const progressBar = document.querySelector('.progress-bar');
    if (!progressBar) return;

    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;

    progressBar.style.width = `${scrollPercent}%`;
  }

  /**
   * Accessibility features
   */
  setupAccessibilityFeatures() {
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.setupScreenReaderSupport();
    this.setupReducedMotionSupport();
  }

  /**
   * Enhanced keyboard navigation
   */
  setupKeyboardNavigation() {
    // Skip to main content link
    this.createSkipLink();
    
    // Enhanced tab navigation
    this.enhanceTabNavigation();
    
    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  /**
   * Create skip to main content link
   */
  createSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: var(--primary-color, #2563eb);
      color: white;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 10000;
      transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  /**
   * Enhance tab navigation
   */
  enhanceTabNavigation() {
    // Add focus indicators
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Alt + R: Go to Research page
      if (e.altKey && e.key === 'r') {
        e.preventDefault();
        window.location.href = '/research';
      }
      
      // Alt + C: Go to CV
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        window.location.href = '/cv';
      }
      
      // Alt + H: Go to Home
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        window.location.href = '/';
      }
    });
  }

  /**
   * Setup focus trap for modals
   */
  setupFocusTrap() {
    // Simple focus trap implementation
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('.modal[aria-hidden="false"]');
        if (modal) {
          const focusable = modal.querySelectorAll(focusableElements);
          const firstFocusable = focusable[0];
          const lastFocusable = focusable[focusable.length - 1];
          
          if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
              lastFocusable.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastFocusable) {
              firstFocusable.focus();
              e.preventDefault();
            }
          }
        }
      }
    });
  }

  /**
   * Setup focus management
   */
  setupFocusManagement() {
    // Trap focus in modals (if any)
    this.setupFocusTrap();
    
    // Manage focus for dynamic content
    this.setupDynamicFocus();
  }

  /**
   * Setup dynamic focus management
   */
  setupDynamicFocus() {
    // Handle focus for dynamically added content
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const focusable = node.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
              if (focusable) {
                focusable.focus();
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Setup screen reader support
   */
  setupScreenReaderSupport() {
    // Add live regions for dynamic content
    this.createLiveRegion();
    
    // Enhance form labels and descriptions
    this.enhanceFormAccessibility();
  }

  /**
   * Create live region for announcements
   */
  createLiveRegion() {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(liveRegion);
  }

  /**
   * Enhance form accessibility
   */
  enhanceFormAccessibility() {
    // Add proper labels and descriptions to forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
          const label = form.querySelector(`label[for="${input.id}"]`);
          if (label) {
            input.setAttribute('aria-labelledby', label.id || 'label-' + Math.random().toString(36).substr(2, 9));
          }
        }
      });
    });
  }



  /**
   * Announce to screen readers
   */
  announce(message) {
    if (this.liveRegion) {
      this.liveRegion.textContent = message;
    }
  }

  /**
   * Setup reduced motion support
   */
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

  /**
   * Modern interactions
   */
  setupModernInteractions() {
    this.setupSmoothScrolling();
    this.setupIntersectionObserver();
    this.setupTouchGestures();
    this.setupHoverEffects();
  }

  /**
   * Enhanced smooth scrolling
   */
  setupSmoothScrolling() {
    // Smooth scroll for anchor links
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
          
          // Announce to screen readers
          this.announce(`Navigated to ${target.textContent || 'section'}`);
        }
      });
    });
  }

  /**
   * Enhanced intersection observer for animations
   */
  setupIntersectionObserver() {
    const observerOptions = {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          
          // Add stagger effect for lists
          if (entry.target.classList.contains('news-list') || 
              entry.target.classList.contains('experience-list') ||
              entry.target.classList.contains('education-list')) {
            this.animateListItems(entry.target);
          }
        }
      });
    }, observerOptions);

    // Observe sections
    document.querySelectorAll('.section').forEach(section => {
      observer.observe(section);
    });
  }

  /**
   * Animate list items with stagger effect
   */
  animateListItems(list) {
    const items = list.querySelectorAll('li');
    items.forEach((item, index) => {
      item.style.animationDelay = `${index * 0.1}s`;
      item.classList.add('animate-in');
    });
  }

  /**
   * Setup touch gestures for mobile
   */
  setupTouchGestures() {
    let startY = 0;
    let startX = 0;

    document.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!startY || !startX) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = startY - currentY;
      const diffX = startX - currentX;

      // Swipe up to scroll to top
      if (Math.abs(diffY) > Math.abs(diffX) && diffY < -100) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        startY = 0;
        startX = 0;
      }
    }, { passive: true });
  }

  /**
   * Enhanced hover effects
   */
  setupHoverEffects() {
    // Add hover effects to interactive elements
    document.querySelectorAll('a, button, .social-links a').forEach(element => {
      element.addEventListener('mouseenter', () => {
        element.style.transform = 'translateY(-2px)';
      });
      
      element.addEventListener('mouseleave', () => {
        element.style.transform = 'translateY(0)';
      });
    });
  }

  /**
   * Analytics and performance monitoring
   */
  setupAnalytics() {
    this.trackPerformance();
    this.trackUserInteractions();
    this.setupErrorReporting();
  }

  /**
   * Track performance metrics
   */
  trackPerformance() {
    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          console.log('FID:', entry.processingStart - entry.startTime);
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        console.log('CLS:', clsValue);
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }

  /**
   * Track user interactions
   */
  trackUserInteractions() {
    // Track clicks on important elements
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a, button');
      if (target) {
        const action = target.textContent || target.getAttribute('aria-label') || 'Unknown';
        console.log('User clicked:', action);
      }
    });

    // Track scroll depth
    let maxScrollDepth = 0;
    window.addEventListener('scroll', () => {
      const scrollDepth = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
        if (maxScrollDepth % 25 === 0) { // Log at 25%, 50%, 75%, 100%
          console.log('Scroll depth:', maxScrollDepth + '%');
        }
      }
    }, { passive: true });
  }

  /**
   * Setup error reporting
   */
  setupErrorReporting() {
    window.addEventListener('error', (e) => {
      console.error('JavaScript error:', e.error);
      // In production, you might want to send this to an error tracking service
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
    });
  }
}

// Initialize when DOM is ready
console.log('📜 Modern.js script loaded');
console.log('Document ready state:', document.readyState);

if (document.readyState === 'loading') {
  console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded fired, initializing WebsiteEnhancer...');
    new WebsiteEnhancer();
  });
} else {
  console.log('✅ DOM already ready, initializing WebsiteEnhancer immediately...');
  new WebsiteEnhancer();
}

// Export for potential use in other scripts
window.WebsiteEnhancer = WebsiteEnhancer;
console.log('🌐 WebsiteEnhancer exported to window object');

// Add global test functions for debugging
window.testThemeToggle = function() {
  console.log('🧪 Testing theme toggle manually...');
  const enhancer = new WebsiteEnhancer();
  enhancer.setTheme('dark');
};

window.testLightTheme = function() {
  console.log('🧪 Testing light theme manually...');
  const enhancer = new WebsiteEnhancer();
  enhancer.setTheme('light');
};

window.debugTheme = function() {
  console.log('🔍 Debug theme state:');
  console.log('Document data-theme:', document.documentElement.getAttribute('data-theme'));
  console.log('LocalStorage theme:', localStorage.getItem('theme'));
  console.log('Theme toggle button:', document.getElementById('theme-toggle'));
  console.log('Theme icon:', document.getElementById('theme-icon'));
  console.log('CSS variables:');
  const computedStyle = getComputedStyle(document.documentElement);
  console.log('--background:', computedStyle.getPropertyValue('--background'));
  console.log('--text-primary:', computedStyle.getPropertyValue('--text-primary'));
  console.log('--primary-color:', computedStyle.getPropertyValue('--primary-color'));
};

console.log('🧪 Debug functions available: testThemeToggle(), testLightTheme(), debugTheme()');
