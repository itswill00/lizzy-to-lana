/* =========================================================
   Lizzy to Lana — interaksi galeri, timeline, lightbox
   Semua foto diambil dari images.json. Tidak ada hotlink.
   ========================================================= */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function makeLink(text, href) {
  const a = document.createElement('a');
  a.textContent = text;
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

function rotation(index) {
  const angles = [-2.2, 1.4, -1.1, 2.1, -1.8, 0.9];
  return `${angles[index % angles.length]}deg`;
}

/* ---------- Data diskografi (bisa diedit di sini) ---------- */
const discography = [
  { year: '2008', title: 'Kill Kill', type: 'EP · Lizzy Grant' },
  { year: '2010', title: 'Lana Del Ray', type: 'Album studio' },
  { year: '2012', title: 'Born to Die', type: 'Album studio' },
  { year: '2012', title: 'Lana Del Rey', type: 'EP' },
  { year: '2012', title: 'Paradise', type: 'EP' },
  { year: '2012', title: 'Born to Die: The Paradise Edition', type: 'Edisi ulang' },
  { year: '2013', title: 'Tropico', type: 'EP / soundtrack' },
  { year: '2014', title: 'Ultraviolence', type: 'Album studio' },
  { year: '2015', title: 'Honeymoon', type: 'Album studio' },
  { year: '2017', title: 'Lust for Life', type: 'Album studio' },
  { year: '2020', title: 'Violet Bent Backwards over the Grass', type: 'Spoken word / buku' },
  { year: '2021', title: 'Chemtrails over the Country Club', type: 'Album studio' },
  { year: '2021', title: 'Blue Banisters', type: 'Album studio' },
  { year: '2023', title: "Did You Know That There's a Tunnel Under Ocean Blvd", type: 'Album studio' },
  { year: 'TBA', title: 'Stove', type: 'Album studio · mendatang', upcoming: true },
  { year: 'TBA', title: 'Album pendamping Stove', type: 'Belum ada judul final', upcoming: true },
];

function renderDiscography() {
  const root = $('#discography');
  if (!root) return;
  discography.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'disc-card' + (item.upcoming ? ' is-upcoming' : '');
    const year = document.createElement('p');
    year.className = 'disc-year';
    year.textContent = item.year;
    const title = document.createElement('h3');
    title.className = 'disc-title';
    title.textContent = item.title;
    const type = document.createElement('p');
    type.className = 'disc-type';
    type.textContent = item.type;
    card.append(year, title, type);
    root.append(card);
  });
}

/* ---------- Lightbox ---------- */
const lightbox = $('#lightbox');
const lightboxImg = $('#lightboxImg');
const lightboxCaption = $('#lightboxCaption');
const lightboxCredit = $('#lightboxCredit');
const lightboxLinks = $('#lightboxLinks');

function openLightbox(item) {
  if (!lightbox || item.placeholder || !item.file) return;
  lightboxImg.src = item.file;
  lightboxImg.alt = item.alt || item.caption || 'Foto Lana Del Rey';
  lightboxCaption.textContent = item.caption || '';
  lightboxCredit.textContent = `Foto: ${item.credit || 'tidak diketahui'} · ${item.license || 'lisensi tidak diketahui'}`;
  lightboxLinks.replaceChildren();
  if (item.source) lightboxLinks.append(makeLink('Lihat di Wikimedia Commons', item.source));
  if (item.licenseUrl) lightboxLinks.append(makeLink('Syarat lisensi', item.licenseUrl));
  if (typeof lightbox.showModal === 'function') lightbox.showModal();
  else lightbox.setAttribute('open', '');
}

function closeLightbox() {
  if (!lightbox) return;
  if (typeof lightbox.close === 'function') lightbox.close();
  else lightbox.removeAttribute('open');
}
$('#lightboxClose')?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

/* ---------- Hero ---------- */
function renderHero(images) {
  const hero = images.find((img) => img.hero && !img.placeholder);
  if (!hero) return;
  const media = $('#heroMedia');
  if (media) media.style.backgroundImage = `url("${hero.file}")`;
  const credit = $('#heroCredit');
  if (credit) {
    credit.append(document.createTextNode('Foto: '));
    if (hero.source) credit.append(makeLink(hero.credit, hero.source));
    else credit.append(document.createTextNode(hero.credit || ''));
    credit.append(document.createTextNode(` · ${hero.license || ''} · `));
    if (hero.licenseUrl) credit.append(makeLink('lisensi', hero.licenseUrl));
  }
}

/* ---------- Foto di timeline ---------- */
function makeTimelineCard(item, index) {
  if (item.placeholder) {
    const box = document.createElement('div');
    box.className = 'photo-placeholder';
    box.style.setProperty('--rot', rotation(index));
    const strong = document.createElement('strong');
    strong.textContent = 'Foto belum tersedia';
    const span = document.createElement('span');
    span.textContent = item.placeholderNote || item.caption;
    box.append(strong, span);
    return box;
  }
  const fig = document.createElement('figure');
  fig.className = 'photo-card reveal';
  fig.style.setProperty('--rot', rotation(index));
  fig.tabIndex = 0;
  fig.setAttribute('role', 'button');
  fig.setAttribute('aria-label', `Buka foto: ${item.caption}`);
  const img = document.createElement('img');
  img.src = item.file;
  img.alt = item.alt || item.caption || 'Foto Lana Del Rey';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = 400;
  img.height = 500;
  const cap = document.createElement('figcaption');
  cap.textContent = item.caption || '';
  fig.append(img, cap);
  fig.addEventListener('click', () => openLightbox(item));
  fig.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLightbox(item);
    }
  });
  return fig;
}

function renderTimelinePhotos(images) {
  $$('.era-photos').forEach((container) => {
    const era = container.dataset.era;
    const items = images
      .filter((img) => img.era === era && (img.timeline || img.placeholder))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    items.forEach((item, i) => container.append(makeTimelineCard(item, i)));
  });
}

/* ---------- Galeri + filter ---------- */
function makeGalleryCard(item, index) {
  if (item.placeholder) {
    const box = document.createElement('div');
    box.className = 'photo-placeholder';
    box.dataset.era = item.era;
    box.style.setProperty('--rot', rotation(index));
    const strong = document.createElement('strong');
    strong.textContent = 'Belum ada foto';
    const span = document.createElement('span');
    span.textContent = item.caption;
    box.append(strong, span);
    return box;
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'polaroid';
  btn.dataset.era = item.era;
  btn.style.setProperty('--rot', rotation(index));
  btn.setAttribute('aria-label', `Lihat detail foto: ${item.caption}`);
  const img = document.createElement('img');
  img.src = item.file;
  img.alt = item.alt || item.caption || 'Foto Lana Del Rey';
  img.loading = 'lazy';
  img.decoding = 'async';
  const cap = document.createElement('span');
  cap.className = 'polaroid-caption';
  cap.textContent = item.caption || '';
  const credit = document.createElement('span');
  credit.className = 'polaroid-credit';
  credit.textContent = `${item.credit || '—'} · ${item.license || '—'}`;
  btn.append(img, cap, credit);
  btn.addEventListener('click', () => openLightbox(item));
  return btn;
}

function renderGallery(data) {
  const gallery = $('#gallery');
  const bar = $('#filterBar');
  if (!gallery || !bar) return;
  const { eras, images } = data;
  const galleryImages = images
    .filter((img) => img.gallery)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'filter-btn';
  allBtn.dataset.era = 'semua';
  allBtn.textContent = 'Semua';
  allBtn.setAttribute('aria-pressed', 'true');
  bar.append(allBtn);

  eras.forEach((era) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn';
    btn.dataset.era = era.id;
    btn.textContent = era.label;
    btn.setAttribute('aria-pressed', 'false');
    bar.append(btn);
  });

  galleryImages.forEach((item, i) => gallery.append(makeGalleryCard(item, i)));

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    $$('.filter-btn', bar).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const era = btn.dataset.era;
    $$('.polaroid, .photo-placeholder', gallery).forEach((card) => {
      card.classList.toggle('is-hidden', era !== 'semua' && card.dataset.era !== era);
    });
  });
}

/* ---------- Reveal, header, parallax ---------- */
function initReveal() {
  const items = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));
}

function initScrollEffects() {
  const header = $('#siteHeader');
  const media = $('#heroMedia');
  let ticking = false;
  function update() {
    const y = window.scrollY || window.pageYOffset;
    header?.classList.toggle('scrolled', y > 60);
    if (media && !reduceMotion && y < window.innerHeight * 1.3) {
      media.style.transform = `translate3d(0, ${Math.min(y * 0.13, 110)}px, 0) scale(1.04)`;
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  update();
}

/* ---------- Init ---------- */
renderDiscography();
initReveal();
initScrollEffects();

fetch('images.json')
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then((data) => {
    renderHero(data.images || []);
    renderTimelinePhotos(data.images || []);
    renderGallery(data);
    initReveal();
  })
  .catch((err) => {
    console.error('Gagal memuat images.json:', err);
    const note = document.createElement('p');
    note.className = 'micro-note';
    note.textContent = 'Foto tidak dapat dimuat. Pastikan images.json dan folder assets/img ikut terdeploy.';
    $('#gallery')?.append(note);
  });
