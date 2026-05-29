/**
 * THE VILLAGE MILL — script.js
 * Site interactions
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   UTILITY
   ═══════════════════════════════════════════════════════════ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const lerp = (a, b, t) => a + (b - a) * t;

const WAITLIST_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz38iyHgLEr_J2jFVT_xfaAGj-xF61HMqmaMwHc4UOZiTIXwKkN5Uj2WDSb838_eIeyhg/exec';

/* ═══════════════════════════════════════════════════════════
   1. CUSTOM CURSOR
   ═══════════════════════════════════════════════════════════ */
(function initCursor() {
  const glow = $('#cursor-glow');
  const dot  = $('#cursor-dot');
  if (!glow || !dot) return;

  let mx = 0, my = 0, gx = 0, gy = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  // Smooth glow follow
  (function animGlow() {
    gx = lerp(gx, mx, 0.08);
    gy = lerp(gy, my, 0.08);
    glow.style.left = gx + 'px';
    glow.style.top  = gy + 'px';
    requestAnimationFrame(animGlow);
  })();

  // Cursor scale on interactive elements
  document.querySelectorAll('a, button, .oil-card, .benefit-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      dot.style.width  = '20px';
      dot.style.height = '20px';
      dot.style.background = 'transparent';
      dot.style.border = '1.5px solid var(--gold)';
    });
    el.addEventListener('mouseleave', () => {
      dot.style.width  = '8px';
      dot.style.height = '8px';
      dot.style.background = 'var(--gold)';
      dot.style.border = 'none';
    });
  });
})();

/* ═══════════════════════════════════════════════════════════
   2. FLOATING PARTICLES
   ═══════════════════════════════════════════════════════════ */
(function initParticles() {
  const container = $('#particles');
  if (!container) return;

  const count = 28;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 80 + 20}%;
      --dur: ${Math.random() * 8 + 6}s;
      --delay: ${Math.random() * 8}s;
      --op: ${Math.random() * 0.35 + 0.1};
      --rise: ${-(Math.random() * 100 + 40)}px;
    `;
    container.appendChild(p);
  }
})();

/* ═══════════════════════════════════════════════════════════
   3. NAVIGATION
   ═══════════════════════════════════════════════════════════ */
(function initNav() {
  const nav       = $('#main-nav');
  const hamburger = $('#nav-hamburger');
  const mobileMenu = $('#mobile-menu');

  // Scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }, { passive: true });

  // Hamburger
  hamburger?.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    const spans = hamburger.querySelectorAll('span');
    if (mobileMenu.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(4px, 4px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(4px, -4px)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    }
  });

  // Close on link click
  $$('#mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.querySelectorAll('span').forEach(s => {
        s.style.transform = '';
        s.style.opacity = '';
      });
    });
  });
})();

/* ═══════════════════════════════════════════════════════════
   4. SCROLL REVEAL (Intersection Observer)
   ═══════════════════════════════════════════════════════════ */
(function initScrollReveal() {
  const targets = $$('.reveal-up, .reveal-left, .reveal-right, .section-label-top, .section-subtitle');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = el.style.getPropertyValue('--delay') || '0s';
        const delayMs = parseFloat(delay) * 1000;

        setTimeout(() => {
          el.classList.add('revealed');
        }, delayMs);

        // For non-classed elements (section-label, subtitle)
        if (!el.classList.contains('reveal-up') &&
            !el.classList.contains('reveal-left') &&
            !el.classList.contains('reveal-right')) {
          el.style.opacity = '0';
          el.style.transform = 'translateY(20px)';
          el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
          setTimeout(() => {
            el.style.opacity = '';
            el.style.transform = '';
          }, delayMs);
        }

        observer.unobserve(el);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  targets.forEach(el => observer.observe(el));
})();

/* ═══════════════════════════════════════════════════════════
   5. PARALLAX EFFECTS
   ═══════════════════════════════════════════════════════════ */
(function initParallax() {
  const trees  = $$('.tree');
  const sunrise = $('.bg-sunrise');

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;

        trees.forEach((tree, i) => {
          const speed = i % 2 === 0 ? 0.08 : 0.05;
          tree.style.transform = `translateY(${scrollY * speed}px)`;
        });

        if (sunrise) {
          sunrise.style.transform = `translateX(-50%) translateY(${scrollY * 0.15}px)`;
        }

        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

/* ═══════════════════════════════════════════════════════════
   6. EMAIL FORM
   ═══════════════════════════════════════════════════════════ */
(function initForm() {
  const btn     = $('#submit-btn');
  const input   = $('#email-input');
  const success = $('#form-success');
  const formInner = $('.form-inner');
  const note = $('.form-note');
  if (!btn || !input) return;

  const defaultNote = note?.textContent || '';
  const defaultButtonText = btn.textContent;

  function showFormMessage(message) {
    if (!note) return;
    note.textContent = message;
    setTimeout(() => {
      note.textContent = defaultNote;
    }, 3000);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function saveWaitlistEmail(email) {
    if (!WAITLIST_ENDPOINT) {
      throw new Error('Waitlist storage is not connected yet.');
    }

    await fetch(WAITLIST_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        email,
        source: 'coming-soon',
        page: window.location.href,
        userAgent: navigator.userAgent,
      }),
    });
  }

  btn.addEventListener('click', async () => {
    const email = input.value.trim().toLowerCase();
    if (!isValidEmail(email)) {
      input.style.borderLeft = '3px solid #c06050';
      input.placeholder = 'Please enter a valid email';
      setTimeout(() => {
        input.style.borderLeft = '';
        input.placeholder = 'your@email.com';
      }, 2000);
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      await saveWaitlistEmail(email);

      btn.textContent = '✓';
      btn.style.background = '#4a8a4a';
      formInner.style.opacity = '0';
      formInner.style.transition = 'opacity 0.4s ease';

      setTimeout(() => {
        formInner.style.display = 'none';
        success.classList.remove('hidden');
      }, 500);
    } catch (error) {
      btn.disabled = false;
      btn.textContent = defaultButtonText;
      input.style.borderLeft = '3px solid #c06050';
      showFormMessage(error.message || 'Something went wrong. Please try again.');
      setTimeout(() => {
        input.style.borderLeft = '';
      }, 3000);
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') btn.click();
  });
})();

/* ═══════════════════════════════════════════════════════════
   7. SMOOTH SECTION TRANSITIONS (section bg glow)
   ═══════════════════════════════════════════════════════════ */
(function initSectionGlow() {
  const sections = $$('section');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.setProperty('--section-visible', '1');
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));
})();

/* ═══════════════════════════════════════════════════════════
   8. OIL BOTTLE 3D HOVER (subtle tilt)
   ═══════════════════════════════════════════════════════════ */
(function initBottleTilt() {
  $$('.oil-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect  = card.getBoundingClientRect();
      const cx    = rect.left + rect.width / 2;
      const cy    = rect.top  + rect.height / 2;
      const dx    = (e.clientX - cx) / (rect.width  / 2);
      const dy    = (e.clientY - cy) / (rect.height / 2);
      const tiltX = dy * -5;
      const tiltY = dx *  5;

      card.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

/* ═══════════════════════════════════════════════════════════
   9. CINEMATIC SECTION TRANSITIONS (fade + slide)
   ═══════════════════════════════════════════════════════════ */
(function initCinematicFades() {
  // Stagger benefit cards
  $$('.benefit-card').forEach((card, i) => {
    card.style.setProperty('--delay', `${i * 0.08}s`);
  });

  // Stagger process steps
  $$('.process-step').forEach((step, i) => {
    step.style.setProperty('--delay', `${i * 0.15}s`);
  });
})();

/* ═══════════════════════════════════════════════════════════
   10. DYNAMIC OIL SHIMMER on scroll
   ═══════════════════════════════════════════════════════════ */
(function initOilShimmer() {
  const bottles = $$('.product-bottle');
  let scrollY = 0;

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  }, { passive: true });

  function shimmerFrame() {
    bottles.forEach((b, i) => {
      const phase = (Date.now() / 1000 + i * 1.2) % (Math.PI * 2);
      const glow  = 0.15 + Math.sin(phase) * 0.05;
      b.style.filter = `drop-shadow(0 20px 40px rgba(0,0,0,0.8)) drop-shadow(0 0 ${20 + Math.sin(phase) * 8}px rgba(201,168,76,${glow}))`;
    });
    requestAnimationFrame(shimmerFrame);
  }

  shimmerFrame();
})();

/* ═══════════════════════════════════════════════════════════
   11. COUNTER ANIMATION for About stats
   ═══════════════════════════════════════════════════════════ */
(function initCounters() {
  const stats = $$('.stat-num');
  let animated = false;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        stats.forEach(stat => {
          const text = stat.textContent.trim();
          if (text === '0') {
            let count = 100;
            const timer = setInterval(() => {
              count -= 7;
              if (count <= 0) { stat.textContent = '0'; clearInterval(timer); }
              else stat.textContent = count;
            }, 40);
          }
        });
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(s => observer.observe(s));
})();

/* ═══════════════════════════════════════════════════════════
   12. ACTIVE NAV HIGHLIGHT
   ═══════════════════════════════════════════════════════════ */
(function initActiveNav() {
  const sections = $$('section[id]');
  const links    = $$('.nav-links a');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        links.forEach(link => {
          link.style.color = link.getAttribute('href') === `#${id}`
            ? 'var(--gold)'
            : '';
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => observer.observe(s));
})();

/* ═══════════════════════════════════════════════════════════
   13. COMING SOON — animated text cycle
   ═══════════════════════════════════════════════════════════ */
(function initTaglineCycle() {
  const taglines = [
    'From Village Roots to Pure Drops',
    'Tradition Pressed Into Purity',
    'Pure Oil. Honest Tradition.',
  ];

  // Optional: cycle a tagline in a designated element
  // The main one is already set in HTML
})();

/* ═══════════════════════════════════════════════════════════
   14. FOOTER EMBLEM ROTATION on hover
   ═══════════════════════════════════════════════════════════ */
(function initFooterEmblem() {
  const emblem = $('.footer-emblem');
  if (!emblem) return;

  emblem.addEventListener('mouseenter', () => {
    emblem.style.transition = 'transform 1s ease';
    emblem.style.transform = 'rotate(180deg)';
  });

  emblem.addEventListener('mouseleave', () => {
    emblem.style.transform = 'rotate(360deg)';
    setTimeout(() => {
      emblem.style.transition = '';
      emblem.style.transform = '';
    }, 1000);
  });
})();

/* ═══════════════════════════════════════════════════════════
   15. INIT — final setup
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure fonts loaded before animations
  document.fonts.ready.then(() => {
    console.log('%cThe Village Mill 🫙 — Crafted with Tradition', 'color:#c9a84c;font-family:serif;font-size:14px;');
  });
});
