/* ===== VITRIO : moteur du site =====
   Les données propres au commerce sont dans window.SITE (défini dans index.html) :
   - horaires : 0 = dimanche … 6 = samedi, chaque jour = liste de créneaux ["HH:MM","HH:MM"]
   - mesure   : null (aucun outil de statistiques, donc aucun cookie et aucune bannière)
                ou { nom: "…", src: "https://…" } pour charger un outil APRÈS accord du visiteur */
(function () {
  const SITE = window.SITE || {};
  const HORAIRES = SITE.horaires || {};
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // En-tête, barre de progression, barre mobile, parallaxe
  const header = $('.site-header');
  const progress = $('.progress');
  const bar = $('.action-bar');
  const hero = $('.hero');
  const layers = $$('[data-parallax]');
  let ticking = false;
  function update() {
    const y = scrollY, max = root.scrollHeight - innerHeight;
    if (header) header.classList.toggle('scrolled', !hero || y > hero.offsetTop + 20);
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    if (bar && hero) bar.classList.toggle('show', y > hero.offsetTop + hero.offsetHeight * .6);
    if (!reduce) layers.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      el.style.transform = 'translateY(' + (c * -50).toFixed(1) + 'px)';
    });
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();

  // Menu mobile
  const burger = $('.burger');
  if (burger) {
    const setMenu = open => { burger.setAttribute('aria-expanded', open); root.classList.toggle('menu-open', open); };
    burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
    $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  }

  // Apparitions au défilement (le contenu reste visible sans JavaScript)
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('anim'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px 12% 0px' });
    $$('.reveal').forEach(el => { if (el.getBoundingClientRect().top > innerHeight * 1.12) io.observe(el); });
  }

  // Compteurs
  if (!reduce && 'IntersectionObserver' in window) $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = t => {
        const p = Math.min(1, (t - t0) / 1500), v = end * (1 - Math.pow(1 - p, 3));
        el.textContent = v.toFixed(dec).replace('.', ',');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    io.observe(el);
  });

  // Lumière qui suit la souris sur les cartes
  $$('.card').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));

  // Onglets des tarifs
  $$('[data-tabs]').forEach(box => {
    const tabs = $$('[role="tab"]', box), ind = $('.tab-ind', box);
    let cur = 0;
    const select = i => {
      cur = i;
      tabs.forEach((t, j) => {
        t.setAttribute('aria-selected', i === j);
        t.tabIndex = i === j ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = i !== j;
      });
      ind.style.width = tabs[i].offsetWidth + 'px';
      ind.style.transform = 'translateX(' + tabs[i].offsetLeft + 'px)';
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          const n = (cur + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
          select(n); tabs[n].focus();
        }
      });
    });
    select(0);
    addEventListener('resize', () => select(cur));
    if (document.fonts) document.fonts.ready.then(() => select(cur));
  });

  // Carrousel d'avis
  const track = $('.track'), ctrl = $('[data-carousel-ctrl]');
  if (track && ctrl) {
    const go = dir => track.scrollBy({ left: dir * track.clientWidth * .8, behavior: reduce ? 'auto' : 'smooth' });
    $('.prev', ctrl).addEventListener('click', () => go(-1));
    $('.next', ctrl).addEventListener('click', () => go(1));
  }

  // Ouvert / fermé en direct
  if (Object.keys(HORAIRES).length) {
    const fmt = s => s.replace(':00', 'h').replace(':', 'h');
    const toMin = s => { const [h, m] = s.split(':'); return h * 60 + +m; };
    const now = new Date(), day = now.getDay(), min = now.getHours() * 60 + now.getMinutes();
    let open = false, text = '';
    (HORAIRES[day] || []).forEach(([a, b]) => { if (min >= toMin(a) && min < toMin(b)) { open = true; text = 'Ouvert maintenant · ferme à ' + fmt(b); } });
    if (!open) {
      const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      for (let k = 0; k < 7 && !text; k++) {
        const d = (day + k) % 7;
        const slot = (HORAIRES[d] || []).find(([a]) => k > 0 || toMin(a) > min);
        if (slot) text = 'Fermé · ouvre ' + (k === 0 ? "aujourd'hui" : k === 1 ? 'demain' : jours[d]) + ' à ' + fmt(slot[0]);
      }
    }
    if (text) $$('[data-status]').forEach(el => { el.textContent = text; el.parentElement.classList.toggle('open', open); });
    $$('.hours [data-day="' + day + '"]').forEach(li => li.classList.add('today'));
  }

  // Formulaire : validation, anti-spam, envoi
  const RULES = {
    nom: v => v.length >= 2 || 'Indiquez votre nom (2 caractères minimum).',
    contact: v => {
      const tel = v.replace(/[\s.\-()]/g, '');
      return /^(\+33|0033|0)[1-9]\d{8}$/.test(tel) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Indiquez un numéro de téléphone (10 chiffres) ou une adresse email valide.';
    },
    message: v => v.length <= 2000 || 'Votre message est trop long (2 000 caractères maximum).'
  };
  $$('form[data-form]').forEach(f => {
    const openedAt = Date.now();
    const check = input => {
      const rule = RULES[input.name];
      if (!rule) return true;
      const res = rule(input.value.trim());
      const ok = res === true;
      const err = document.getElementById('err-' + input.id);
      input.setAttribute('aria-invalid', !ok);
      if (err) err.textContent = ok ? '' : res;
      return ok;
    };
    $$('input, textarea', f).forEach(i => {
      if (i.name === '_gotcha') return;
      i.addEventListener('blur', () => { if (i.value) check(i); });
      i.addEventListener('input', () => { if (i.getAttribute('aria-invalid') === 'true') check(i); });
    });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const fields = $$('input:not([name="_gotcha"]), textarea', f);
      const bad = fields.filter(i => !check(i));
      if (bad.length) { bad[0].focus(); return; }
      // Anti-spam : champ piège rempli ou envoi en moins de 3 secondes = robot. On fait comme si c'était envoyé.
      const trap = $('[name="_gotcha"]', f);
      if ((trap && trap.value) || Date.now() - openedAt < 3000) { f.classList.add('sent'); return; }
      // Sans service d'envoi : on ouvre la messagerie du visiteur avec un email déjà rempli
      if (f.dataset.mailto) {
        const v = n => { const el = $('[name="' + n + '"]', f); return el ? el.value.trim() : ''; };
        const subject = 'Demande de page d\'essai — ' + v('nom');
        const body = 'Nom : ' + v('nom') + '\nContact : ' + v('contact') + '\n\n' + v('message');
        location.href = 'mailto:' + f.dataset.mailto + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        f.classList.add('sent');
        return;
      }
      if (f.hasAttribute('data-demo') || !f.action || f.getAttribute('action') === '#') { f.classList.add('sent'); return; }
      const btn = $('button[type="submit"]', f);
      btn.disabled = true;
      try {
        const r = await fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error();
        f.classList.add('sent');
      } catch (_) {
        const err = $('.form-error', f);
        if (err) err.textContent = "L'envoi n'a pas fonctionné. Réessayez ou appelez-nous directement.";
        btn.disabled = false;
      }
    });
  });

  // Cookies : uniquement si un outil de statistiques est configuré
  const M = SITE.mesure;
  const KEY = 'vitrio-consentement';
  const load = () => { const s = document.createElement('script'); s.src = M.src; s.defer = true; document.head.appendChild(s); };
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && Date.now() - v.t < 1000 * 60 * 60 * 24 * 182 ? v.ok : null; } catch (_) { return null; } };
  const save = ok => { try { localStorage.setItem(KEY, JSON.stringify({ ok, t: Date.now() })); } catch (_) {} };
  function banner() {
    if ($('.cookies')) return;
    const b = document.createElement('div');
    b.className = 'cookies';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Cookies');
    b.innerHTML = '<p>Nous aimerions mesurer la fréquentation du site avec ' + M.nom + ' pour l\'améliorer. Vous pouvez refuser, le site fonctionne pareil. <a href="confidentialite.html">En savoir plus</a></p>' +
      '<div class="cookies-actions"><button class="btn ghost" data-c="0">Tout refuser</button><button class="btn ghost" data-c="1">Accepter</button></div>';
    b.addEventListener('click', e => {
      const c = e.target.closest('[data-c]');
      if (!c) return;
      const ok = c.dataset.c === '1';
      save(ok); b.remove();
      if (ok) load();
    });
    document.body.appendChild(b);
  }
  if (M && M.src) {
    const choice = read();
    if (choice === true) load(); else if (choice === null) banner();
    $$('[data-cookies]').forEach(a => { a.hidden = false; a.addEventListener('click', e => { e.preventDefault(); banner(); }); });
  }
})();
