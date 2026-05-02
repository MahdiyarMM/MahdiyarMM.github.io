import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_short_touch_viewport_uses_visual_viewport_and_restores_hero_top(tmp_path):
    runner = tmp_path / "hero_short_viewport_test.cjs"
    runner.write_text(
        r"""
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('js/hero-parallax.js', 'utf8');

class MockElement {
  constructor(name) {
    this.name = name;
    this.attributes = new Set();
    this.style = { setProperty() {} };
    this.offsetHeight = 900;
  }
  closest() {
    return this.scroller;
  }
  getBoundingClientRect() {
    return { top: 0, height: this.offsetHeight, width: 932 };
  }
  toggleAttribute(name, enabled) {
    if (enabled) this.attributes.add(name);
    else this.attributes.delete(name);
  }
  hasAttribute(name) {
    return this.attributes.has(name);
  }
}

function runScenario({ visualWidth, visualHeight, innerHeight, maxTouchPoints, coarse, scrollY }) {
  const section = new MockElement('section');
  const stage = new MockElement('stage');
  const scroller = new MockElement('scroller');
  scroller.offsetHeight = 900;
  stage.scroller = scroller;
  const scrollCalls = [];

  const visualViewport = {
    width: visualWidth,
    height: visualHeight,
    addEventListener() {},
  };

  const windowMock = {
    innerWidth: visualWidth,
    innerHeight,
    visualViewport,
    scrollY,
    addEventListener() {},
    setTimeout(callback) {
      callback();
    },
    matchMedia(query) {
      if (query.includes('prefers-reduced-motion')) return { matches: false };
      return { matches: coarse && /hover: none|pointer: coarse/.test(query) };
    },
    scrollTo(options) {
      scrollCalls.push(options);
      this.scrollY = options.top;
    },
  };

  const context = {
    console,
    window: windowMock,
    document: {
      documentElement: { clientWidth: visualWidth, clientHeight: innerHeight },
      querySelector(selector) {
        if (selector === '.hero-section--layered') return section;
        if (selector === '[data-hero-stage]') return stage;
        return null;
      },
    },
    navigator: { maxTouchPoints },
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    IntersectionObserver: class {
      constructor(callback) {
        this.callback = callback;
      }
      observe() {
        this.callback([{ isIntersecting: true }]);
      }
    },
  };

  vm.runInNewContext(source, context);
  return {
    shortWide: section.hasAttribute('data-hero-short-wide'),
    scrollCalls,
  };
}

const iphoneChromeLandscape = runScenario({
  visualWidth: 932,
  visualHeight: 430,
  innerHeight: 900,
  maxTouchPoints: 5,
  coarse: true,
  scrollY: 240,
});

assert.equal(iphoneChromeLandscape.shortWide, true);
assert.equal(iphoneChromeLandscape.scrollCalls.length, 1);
assert.equal(iphoneChromeLandscape.scrollCalls[0].top, 0);

const portraitPhone = runScenario({
  visualWidth: 430,
  visualHeight: 932,
  innerHeight: 932,
  maxTouchPoints: 5,
  coarse: true,
  scrollY: 0,
});

assert.equal(portraitPhone.shortWide, false);

const shortDesktopWindow = runScenario({
  visualWidth: 932,
  visualHeight: 430,
  innerHeight: 430,
  maxTouchPoints: 0,
  coarse: false,
  scrollY: 0,
});

assert.equal(shortDesktopWindow.shortWide, false);
""",
        encoding="utf-8",
    )

    subprocess.run(["node", str(runner)], cwd=ROOT, check=True)
