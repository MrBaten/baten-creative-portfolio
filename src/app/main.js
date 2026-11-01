/**
 * Page logic for optiobyte.com.
 * Renders every section from src/data/content.js, wires up the interface,
 * and drives the 3D studio (src/3d/world.js → src/app/world.bundle.js).
 */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = document.documentElement.classList.contains('reduce-motion');

const ICON_PLAY = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';

async function boot() {
  let content;
  try {
    ({ content } = await import('../data/content.js'));
  } catch (err) {
    console.error(err);
    $('#main').innerHTML = `<div class="notice"><h1>The page content could not load</h1>
      <p>The last edit to <strong>src/data/content.js</strong> has a typing mistake (often a missing quote or comma).
      Undo that commit on GitHub, or fix the line the browser console points to.</p></div>`;
    return;
  }
  render(content);
  wireHeader();
  wireNav();
  wireServices();
  wireFilmDialog(content.works);
  wireForm(content.contact, content.profile);
  wireCopy();
  const scroll = trackScenes();
  loadStudio(content, scroll);
}

/* ── Rendering ─────────────────────────────────────────────────────── */
function render(c) {
  const { profile: p, hero, about, works, services, process, contact } = c;

  $('[data-slot="hero"]').innerHTML = `
    <p class="hero-role">${esc(p.role)}</p>
    <h1 class="hero-title" id="hero-title">${esc(hero.headline)}</h1>
    <p class="hero-intro">${esc(hero.intro)}</p>
    <div class="hero-actions">
      <a class="button" href="#work">${ICON_PLAY}${esc(hero.primaryAction)}</a>
      <a class="button button--ghost" href="#contact">${esc(hero.secondaryAction)}</a>
    </div>
    <p class="hero-where">${esc(p.location)}. ${esc(p.reach)}.</p>
    <p class="gen-status" aria-hidden="true" hidden data-gen-status><span class="gen-dot"></span><span data-gen-label></span></p>`;
  $('.scene--hero').insertAdjacentHTML('beforeend', '<a class="scroll-cue" href="#about">Scroll to enter the studio<span aria-hidden="true"></span></a>');

  const portrait = about.photos[0];
  $('[data-slot="about"]').innerHTML = `
    <div class="about-head">
      ${portrait ? `<img class="about-portrait" src="${esc(portrait.src)}" alt="${esc(portrait.alt)}" width="96" height="128" decoding="async" />` : ''}
      <h2 class="scene-title" id="about-title">${esc(about.title)}</h2>
    </div>
    <div class="about-body">${about.body.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
    <ul class="principles">${about.principles.map((r) => `<li><strong>${esc(r.title)}</strong><span>${esc(r.text)}</span></li>`).join('')}</ul>`;

  $('[data-slot="work"]').innerHTML = `
    <h2 class="scene-title" id="work-title">${esc(c.workTitle)}</h2>
    <p class="scene-lede">${esc(c.workIntro)}</p>
    <ul class="films">${works.map((w, i) => `
      <li class="film">
        <button class="film-poster" type="button" data-play="${i}" aria-label="Play ${esc(w.title)}">
          <img src="${esc(w.poster)}" alt="" width="76" height="135" loading="lazy" decoding="async" />
        </button>
        <div class="film-body">
          <h3 class="film-title">${esc(w.title)}</h3>
          <p class="film-meta">${esc(w.category)}, ${esc(w.year)}. ${w.vertical ? 'Vertical 9:16' : 'Widescreen 16:9'}</p>
          <p class="film-summary">${esc(w.summary)}</p>
          <div class="film-actions">
            <button class="button button--small" type="button" data-play="${i}" aria-label="Play ${esc(w.title)}">${ICON_PLAY}Play film</button>
          </div>
          <details>
            <summary>How it was made</summary>
            <dl class="case">
              <div><dt>Challenge</dt><dd>${esc(w.challenge)}</dd></div>
              <div><dt>Idea</dt><dd>${esc(w.idea)}</dd></div>
              <div><dt>Execution</dt><dd>${esc(w.execution)}</dd></div>
              <div><dt>Outcome</dt><dd>${esc(w.outcome)}</dd></div>
              <div><dt>My role</dt><dd>${esc(w.role)}</dd></div>
              <div><dt>Tools</dt><dd>${esc(w.tools)}</dd></div>
            </dl>
          </details>
        </div>
      </li>`).join('')}
    </ul>
    <p class="work-note">${esc(c.workNote)}</p>`;

  $('[data-slot="services"]').innerHTML = `
    <h2 class="scene-title" id="services-title">${esc(c.servicesTitle)}</h2>
    <ul class="services">${services.map((s, i) => `
      <li class="service">
        <button type="button" aria-expanded="${i === 0}" aria-controls="service-${i}">${esc(s.title)}</button>
        <div class="service-detail" id="service-${i}" ${i === 0 ? '' : 'hidden'}>
          <p>${esc(s.text)}</p>
          <ul class="chips">${s.deliverables.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
        </div>
      </li>`).join('')}
    </ul>
    <p class="industries"><strong>${esc(c.industriesLabel)}:</strong> ${c.industries.map(esc).join(', ')}.</p>`;

  $('[data-slot="process"]').innerHTML = `
    <h2 class="scene-title" id="process-title">${esc(c.processTitle)}</h2>
    <ol class="steps">${process.map((s) => `
      <li class="step"><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p><small>Milestone: ${esc(s.milestone)}</small></div></li>`).join('')}
    </ol>`;

  const today = new Date();
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const date = `${String(today.getDate()).padStart(2, '0')} ${MONTHS[today.getMonth()]} ${String(today.getFullYear()).slice(2)}`;
  $('[data-slot="contact"]').innerHTML = `
    <div class="slate-sticks" aria-hidden="true"></div>
    <dl class="slate-grid">
      <div><dt>Director</dt><dd>${esc(p.shortName)}</dd></div>
      <div><dt>Scene</dt><dd>Your brand</dd></div>
      <div><dt>Date</dt><dd>${date}</dd></div>
    </dl>
    <div class="slate-body">
      <h2 class="scene-title" id="contact-title">${esc(contact.title)}</h2>
      <p class="scene-lede">${esc(contact.text)}</p>
      <form class="form" data-form novalidate>
        <div class="honey" aria-hidden="true"><label for="f-company-site">Leave empty</label><input id="f-company-site" name="_honey" tabindex="-1" autocomplete="off" /></div>
        <div class="form-row">
          <div class="field"><label for="f-name">Name or company</label><input id="f-name" name="name" required autocomplete="name" /></div>
          <div class="field"><label for="f-email">Work email</label><input id="f-email" name="email" type="email" required autocomplete="email" /></div>
        </div>
        <fieldset class="field">
          <legend>Project type</legend>
          <div class="types">${contact.projectTypes.map((t, i) => `<label><input type="radio" name="project_type" value="${esc(t)}" ${i === 0 ? 'checked' : ''} /><span>${esc(t)}</span></label>`).join('')}</div>
        </fieldset>
        <div class="field"><label for="f-message">What are you making?</label><textarea id="f-message" name="message" required placeholder="The idea, timeline, formats (16:9, 9:16) and any references."></textarea></div>
        <div class="form-foot">
          <button class="button button--gel" type="submit" data-submit>Send brief</button>
          <span class="hero-where">${esc(p.replyTime)}</span>
        </div>
        <p class="form-status" role="status" hidden data-form-status></p>
      </form>
      <div class="direct">
        <p>${esc(contact.directLabel)}</p>
        <div class="direct-links">
          <span class="email-copy"><code>${esc(p.email)}</code><button class="button button--ghost button--small" type="button" data-copy="${esc(p.email)}">Copy</button></span>
          <a class="text-link" href="${esc(p.bookingLink)}" target="_blank" rel="noopener noreferrer">${esc(p.bookingLabel)}</a>
        </div>
      </div>
    </div>`;

  $('[data-slot="footer"]').innerHTML = `
    <span>© ${today.getFullYear()} ${esc(p.name)}. ${esc(p.location)}.</span>
    <nav aria-label="Social">${p.socials.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`).join('')}</nav>`;

  $('[data-scene-rail]').innerHTML = $$('[data-scene]').map((s) =>
    `<li><a href="#${s.id}" data-rail="${s.id}"><span>${esc(s.dataset.scene)}</span></a></li>`).join('');
}

/* ── Interface ─────────────────────────────────────────────────────── */
function wireHeader() {
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const btn = $('[data-menu-button]');
  const menu = $('[data-mobile-menu]');
  const setOpen = (open) => { btn.setAttribute('aria-expanded', String(open)); menu.hidden = !open; };
  btn.addEventListener('click', () => setOpen(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); } });
}

function wireNav() {
  const links = $$('.site-nav a, [data-rail]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-scene]').forEach((s) => io.observe(s));
}

function wireServices() {
  $$('.service button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      document.getElementById(btn.getAttribute('aria-controls')).hidden = open;
    });
  });
}

function wireFilmDialog(works) {
  const dialog = $('[data-film-dialog]');
  const frame = $('[data-film-frame]');
  let opener = null;
  const close = () => { frame.innerHTML = ''; if (dialog.open) dialog.close(); };
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-play]');
    if (!trigger) return;
    const w = works[Number(trigger.dataset.play)];
    if (!w) return;
    opener = trigger;
    $('[data-film-title]').textContent = w.title;
    frame.classList.toggle('is-vertical', !!w.vertical);
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(w.youtubeId)}?autoplay=1&rel=0&modestbranding=1&playsinline=1"
      title="${esc(w.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"></iframe>`;
    $('[data-film-link]').href = w.vertical ? `https://youtube.com/shorts/${w.youtubeId}` : `https://youtu.be/${w.youtubeId}`;
    dialog.showModal();
  });
  $('[data-film-close]').addEventListener('click', close);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  dialog.addEventListener('close', () => { frame.innerHTML = ''; opener?.focus(); });
}

function wireForm(contact, profile) {
  const form = $('[data-form]');
  const status = $('[data-form-status]');
  const submit = $('[data-submit]');
  const show = (tone, html) => { status.dataset.tone = tone; status.innerHTML = html; status.hidden = false; };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form.elements;
    const data = {
      name: f.namedItem('name').value.trim(),
      email: f.namedItem('email').value.trim(),
      project_type: form.querySelector('input[name="project_type"]:checked')?.value || '',
      message: f.namedItem('message').value.trim(),
      _honey: f.namedItem('_honey').value,
    };
    if (data._honey) return;
    if (!data.name || !data.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      show('warn', 'Add your name, a valid email and a few lines about the project, then send again.');
      (!data.name ? f.namedItem('name') : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ? f.namedItem('email') : f.namedItem('message')).focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Sending…';
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(contact.formEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...data, _subject: `Project brief: ${data.project_type} from ${data.name}`, _template: 'table' }),
      });
      const body = await res.json().catch(() => ({}));
      // FormSubmit replies 200 even when it rejects a submission; check its flag.
      if (!res.ok || String(body.success) !== 'true') throw new Error(body.message || `HTTP ${res.status}`);
      show('ok', `Brief sent. Thanks, ${esc(data.name)}. ${esc(profile.replyTime)}.`);
      form.reset();
    } catch (err) {
      console.warn('Brief not sent:', err);
      const mail = `mailto:${contact.formEmail}?subject=${encodeURIComponent(`Project brief: ${data.project_type} from ${data.name}`)}&body=${encodeURIComponent(`${data.message}\n\n${data.name}\n${data.email}`)}`;
      show('warn', `The brief couldn't be sent from the page. Your text is still in the form. Email it to <strong>${esc(contact.formEmail)}</strong> or <a class="text-link" href="${mail}">open it in your email app</a>.`);
    } finally {
      submit.disabled = false;
      submit.textContent = 'Send brief';
    }
  });
}

function wireCopy() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.textContent = 'Copied';
    } catch {
      const code = btn.previousElementSibling;
      const range = document.createRange();
      range.selectNodeContents(code);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      btn.textContent = 'Selected';
    }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
  });
}

/* ── Scroll → scene progress for the 3D camera ─────────────────────────
   progress = 0 when the first scene is centred, 1 at the second, and so on. */
function trackScenes() {
  const scenes = $$('[data-scene]');
  let centers = [];
  // A scene "arrives" when its top reaches the top of the screen, so the camera
  // frames each 3D subject while the panel is still low (and nav links land on a stop).
  const measure = () => {
    centers = scenes.map((s) => s.offsetTop + window.innerHeight / 2);
  };
  measure();
  new ResizeObserver(measure).observe(document.body);
  window.addEventListener('load', measure);
  return {
    count: scenes.length,
    get() {
      const mid = window.scrollY + window.innerHeight / 2;
      if (mid <= centers[0]) return 0;
      for (let i = 0; i < centers.length - 1; i++) {
        if (mid < centers[i + 1]) return i + (mid - centers[i]) / (centers[i + 1] - centers[i]);
      }
      return centers.length - 1;
    },
  };
}

function loadStudio(content, scroll) {
  const stage = $('.stage');
  const canvas = $('[data-stage-canvas]');
  const saveData = navigator.connection?.saveData;
  const slowNet = /(^|-)(2g|3g)$/.test(navigator.connection?.effectiveType || '');
  let gl = null;
  try { gl = canvas.getContext('webgl2', { antialias: true }) ? 'webgl2' : null; } catch { gl = null; }
  if (!gl || saveData) return; // the CSS cyc backdrop stays; every section still works

  const start = async () => {
    try {
      const { mountStudio } = await import('./world.bundle.js?v=6');
      mountStudio({
        canvas,
        progress: () => scroll.get(),
        sceneCount: scroll.count,
        works: slowNet ? content.works.map((w) => ({ ...w, loop: '' })) : content.works,
        photos: content.about.photos,
        word: content.hero.openingWord,
        onPhase: (label) => {
          const st = content.hero.openingStatus || {};
          const box = $('[data-gen-status]');
          const text = label === 'noise' ? `${st.noise}…` : label === 'name' ? `${st.name}: ${content.profile.name}` : `${st.film}: ${label}`;
          $('[data-gen-label]').textContent = text;
          box.hidden = false;
          box.classList.remove('is-tick'); void box.offsetWidth; box.classList.add('is-tick');
        },
        name: content.profile.name,
        reducedMotion: reduceMotion,
        onReady: () => stage.classList.add('is-live'),
        onLost: () => stage.classList.remove('is-live'),
      });
    } catch (err) {
      console.warn('3D studio unavailable; showing the flat backdrop.', err);
    }
  };
  // Let text and fonts paint first, then build the studio.
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1200 });
  else setTimeout(start, 300);
}

boot();
