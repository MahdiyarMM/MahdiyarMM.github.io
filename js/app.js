/* particles.js initialization
 * Skips on small viewports and when prefers-reduced-motion is set.
 * Pauses on visibilitychange to save battery on hidden tabs.
 * Background is opt-out via <body data-bg="off">.
 */

(function () {
  const body = document.body;
  if (body && body.getAttribute('data-bg') === 'off') return;
  if (typeof window === 'undefined') return;

  const reduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tooSmall = window.innerWidth < 768;
  if (reduced || tooSmall) return;
  if (typeof particlesJS !== 'function') return;

  particlesJS(
    'particles-js',

    {
      particles: {
        number: {
          value: 60,
          density: {
            enable: true,
            value_area: 800,
          },
        },
        color: {
          value: '#000000',
        },
        shape: {
          type: 'circle',
          stroke: {
            width: 0,
            color: '#000000',
          },
          polygon: {
            nb_sides: 5,
          },
          image: {
            src: 'img/github.svg',
            width: 100,
            height: 100,
          },
        },
        opacity: {
          value: 0.5,
          random: false,
          anim: {
            enable: false,
            speed: 1,
            opacity_min: 0.1,
            sync: false,
          },
        },
        size: {
          value: 3,
          random: true,
          anim: {
            enable: false,
            speed: 20,
            size_min: 0.1,
            sync: false,
          },
        },
        line_linked: {
          enable: true,
          distance: 150,
          color: '#000000',
          opacity: 0.4,
          width: 1,
        },
        move: {
          enable: true,
          speed: 3,
          direction: 'none',
          random: false,
          straight: false,
          out_mode: 'out',
          bounce: false,
          attract: {
            enable: false,
            rotateX: 600,
            rotateY: 1200,
          },
        },
      },
      interactivity: {
        detect_on: 'window',
        events: {
          onhover: {
            enable: true,
            mode: 'repulse',
          },
          onclick: {
            enable: true,
            mode: 'push',
          },
          resize: true,
        },
        modes: {
          grab: {
            distance: 400,
            line_linked: {
              opacity: 1,
            },
          },
          bubble: {
            distance: 400,
            size: 40,
            duration: 2,
            opacity: 8,
            speed: 3,
          },
          repulse: {
            distance: 200,
            duration: 0.4,
          },
          push: {
            particles_nb: 4,
          },
          remove: {
            particles_nb: 2,
          },
        },
      },
      retina_detect: true,
      config_demo: {
        hide_card: false,
        background_color: '#ffffff',
        background_image: '',
        background_position: '50% 50%',
        background_repeat: 'no-repeat',
        background_size: 'cover',
      },
    }
  );

  document.addEventListener('visibilitychange', () => {
    try {
      const inst = window.pJSDom && window.pJSDom[0] && window.pJSDom[0].pJS;
      if (!inst || !inst.fn || !inst.fn.vendors) return;
      if (document.visibilityState === 'hidden') {
        inst.fn.vendors.detachListeners?.();
        cancelAnimationFrame(inst.fn.checkAnimFrame);
        cancelAnimationFrame(inst.fn.drawAnimFrame);
      } else {
        inst.fn.vendors.start?.();
      }
    } catch {
      /* ignore */
    }
  });
})();
