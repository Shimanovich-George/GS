/* ─── YEAR ─── */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ─── TOUCH DETECTION ─── */
const isTouch = window.matchMedia('(hover:none),(pointer:coarse)').matches
  || 'ontouchstart' in window || navigator.maxTouchPoints > 0;

/* ─── CUSTOM CURSOR — single event delegation, no per-element handlers ─── */
const cursor = document.getElementById('cursor');
const finePointer = window.matchMedia('(pointer:fine)').matches;

if (cursor && finePointer && !isTouch) {
  let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  let tx = cx, ty = cy;
  const lerp = (a, b, t) => a + (b - a) * t;

  (function loop() {
    cx = lerp(cx, tx, 0.22);
    cy = lerp(cy, ty, 0.22);
    cursor.style.left = cx + 'px';
    cursor.style.top  = cy + 'px';
    requestAnimationFrame(loop);
  })();

  // ONE handler — spin only on interactive elements, never on gallery images
  const spinSel = 'a, button, .proj-tab, .icon-btn, .lb-nav, .lb-close';
  window.addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
    cursor.classList.toggle('is-hover', !!e.target.closest(spinSel));
  }, { passive: true });

  window.addEventListener('blur', () => cursor.classList.remove('is-hover'));
} else if (cursor) {
  cursor.style.display = 'none';
}

/* ─── PROJECT TABS — lazy load images on tab click ─── */
const tabs   = Array.from(document.querySelectorAll('.proj-tab'));
const panels = Array.from(document.querySelectorAll('.proj-panel'));

// On init: strip src from all images except first active panel
// so they don't load until tab is clicked
panels.forEach((panel, i) => {
  if (i === 0) return; // first panel loads normally
  panel.querySelectorAll('img').forEach(img => {
    img.dataset.src = img.getAttribute('src');
    img.removeAttribute('src');
  });
});

function activateTab(tabId) {
  tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === tabId)));
  panels.forEach(p => {
    const active = p.id === tabId;
    p.classList.toggle('is-active', active);
    if (active) {
      // restore src for lazy images in this panel
      p.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
        delete img.dataset.src;
      });
    }
  });
}

tabs.forEach(t => t.addEventListener('click', () => activateTab(t.dataset.tab)));

/* ─── GALLERY — attach lightbox handlers + hide missing images ─── */
document.querySelectorAll('.gallery').forEach(gallery => {
  const thumbs = Array.from(gallery.querySelectorAll('.thumb'));
  thumbs.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      // collect all images from this gallery at click time (some may still have data-src)
      const images = thumbs.map(t => {
        const img = t.querySelector('img');
        return img.src || img.dataset.src || '';
      }).filter(Boolean);
      openLightbox(images, idx);
    });
  });
});

/* ─── LIGHTBOX ─── */
const lb      = document.getElementById('lightbox');
const lbImg   = document.getElementById('lbImg');
const lbClose = document.getElementById('lbClose');
const lbPrev  = document.getElementById('lbPrev');
const lbNext  = document.getElementById('lbNext');

// Magnifier lens
const lens = document.createElement('div');
lens.id = 'lbLens';
lb.appendChild(lens);

let lbImages = [], lbIdx = 0;

function showLbImage(idx) {
  const n = lbImages.length;
  lbIdx = ((idx % n) + n) % n;
  lbImg.src = lbImages[lbIdx];
  const many = n > 1;
  lbPrev.style.display = many ? 'flex' : 'none';
  lbNext.style.display = many ? 'flex' : 'none';
  lens.style.display = 'none'; // reset lens on image change
}

function openLightbox(images, idx) {
  lbImages = images;
  lb.classList.add('is-open');
  lb.setAttribute('aria-hidden', 'false');
  showLbImage(idx);
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lb.classList.remove('is-open');
  lb.setAttribute('aria-hidden', 'true');
  lbImg.src = '';
  lbImages = [];
  lens.style.display = 'none';
  document.body.style.overflow = '';
}

lbClose.addEventListener('click', closeLightbox);
lbPrev.addEventListener('click', e => { e.stopPropagation(); showLbImage(lbIdx - 1); });
lbNext.addEventListener('click', e => { e.stopPropagation(); showLbImage(lbIdx + 1); });
lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });

document.addEventListener('keydown', e => {
  if (!lb.classList.contains('is-open')) return;
  if (e.key === 'Escape')     closeLightbox();
  if (e.key === 'ArrowLeft')  showLbImage(lbIdx - 1);
  if (e.key === 'ArrowRight') showLbImage(lbIdx + 1);
});

// Swipe
let swipeX = 0;
lb.addEventListener('touchstart', e => { swipeX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - swipeX;
  if (Math.abs(dx) > 44) dx > 0 ? showLbImage(lbIdx - 1) : showLbImage(lbIdx + 1);
}, { passive: true });

/* ─── MAGNIFIER in lightbox ─── */
if (finePointer && !isTouch) {
  const ZOOM = 2.5;
  const LENS_SIZE = 160;

  lbImg.addEventListener('mousemove', e => {
    const rect = lbImg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      lens.style.display = 'none'; return;
    }

    lens.style.display = 'block';
    // position lens near cursor but inside viewport
    let lx = e.clientX + 20;
    let ly = e.clientY + 20;
    if (lx + LENS_SIZE > window.innerWidth)  lx = e.clientX - LENS_SIZE - 20;
    if (ly + LENS_SIZE > window.innerHeight) ly = e.clientY - LENS_SIZE - 20;
    lens.style.left = lx + 'px';
    lens.style.top  = ly + 'px';

    const bgX = -(x * ZOOM - LENS_SIZE / 2);
    const bgY = -(y * ZOOM - LENS_SIZE / 2);
    lens.style.backgroundImage  = `url("${lbImg.src}")`;
    lens.style.backgroundSize   = `${rect.width * ZOOM}px ${rect.height * ZOOM}px`;
    lens.style.backgroundPosition = `${bgX}px ${bgY}px`;
  });

  lbImg.addEventListener('mouseleave', () => { lens.style.display = 'none'; });
}

/* ─── NAV SCROLL HIGHLIGHT ─── */
const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
const sections = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const secObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => {
        a.style.color = a.getAttribute('href') === '#' + entry.target.id ? 'var(--ink)' : '';
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
sections.forEach(s => secObserver.observe(s));
