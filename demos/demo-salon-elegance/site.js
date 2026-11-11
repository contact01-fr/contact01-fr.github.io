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

  // ===== V3 : animations et interactions (rien ne s'active si le visiteur a demandé moins d'animations) =====
  root.classList.add('js');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Les éléments apparus gardent leur transformation libre pour les effets au survol
  $$('.reveal').forEach(el => el.addEventListener('animationend', e => { if (e.target === el) el.classList.add('done', 'seen'); }));
  $$('.reveal').forEach(el => { if (reduce || !('IntersectionObserver' in window) || el.getBoundingClientRect().top <= innerHeight * 1.12) el.classList.add('seen'); });

  // Titres : les mots montent un par un
  if (!reduce && 'IntersectionObserver' in window) {
    const split = el => {
      const walk = n => [...n.childNodes].forEach(c => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/([ \n\t]+)/).forEach(t => {
            if (!t) return;
            if (/^[ \n\t]+$/.test(t)) { frag.append(' '); return; }
            const o = document.createElement('span'), i = document.createElement('span');
            o.className = 'w'; i.textContent = t; o.append(i); frag.append(o);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1) walk(c);
      });
      walk(el);
      $$('.w > span', el).forEach((w, i) => w.style.setProperty('--i', i));
      el.classList.add('words');
    };
    const tio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); tio.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.hero h1, .head h2, .final h2').forEach(el => { split(el); tio.observe(el); });
  }

  // Hero : lumière et relief qui suivent la souris
  if (!reduce && fine && hero) {
    const photo = $('.hero-photo', hero);
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      hero.style.setProperty('--hx', (x * 100).toFixed(1) + '%');
      hero.style.setProperty('--hy', (y * 100).toFixed(1) + '%');
      if (photo) { photo.style.setProperty('--ty', ((x - .5) * 9).toFixed(2) + 'deg'); photo.style.setProperty('--tx', ((.5 - y) * 7).toFixed(2) + 'deg'); }
    });
    hero.addEventListener('pointerleave', () => { if (photo) { photo.style.setProperty('--tx', '0deg'); photo.style.setProperty('--ty', '0deg'); } });
  }

  // Cartes, formules, exemples, avis : relief et lumière
  $$('.plan, .review, .demo').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));
  if (!reduce && fine) $$('.card, .plan, .demo').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
      c.style.setProperty('--rx', (y * -7).toFixed(2) + 'deg');
    });
    c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
  });

  // Boutons principaux : légère attraction vers la souris
  if (!reduce && fine) $$('.hero .btn, .final .btn').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * .18).toFixed(1) + 'px');
      b.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * .28).toFixed(1) + 'px');
    });
    b.addEventListener('pointerleave', () => { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
  });

  // Appel final : le halo suit la souris
  const fin = $('.final');
  if (!reduce && fine && fin) fin.addEventListener('pointermove', e => {
    const r = fin.getBoundingClientRect();
    fin.style.setProperty('--fx', ((e.clientX - r.left - r.width * .75) * .5).toFixed(0) + 'px');
    fin.style.setProperty('--fy', ((e.clientY - r.top - r.height * .2) * .5).toFixed(0) + 'px');
  });

  // Bandeau défilant : la liste est doublée pour boucler sans coupure
  if (!reduce) $$('.marquee').forEach(m => {
    const items = $$('li', m);
    const w = items.reduce((a, li) => a + li.offsetWidth, 0);
    if (!w) return;
    const copies = Math.ceil(innerWidth / w) + 1;
    for (let k = 0; k < copies; k++) items.forEach(li => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); m.append(c); });
    m.style.setProperty('--shift', '-' + w + 'px');
    m.style.setProperty('--dur', Math.max(18, w / 45) + 's');
    m.classList.add('run');
  });

  // Menu : rubrique en cours
  if ('IntersectionObserver' in window) {
    const links = $$('.nav a[href^="#"]:not(.btn)').filter(a => a.getAttribute('href').length > 1 && $(a.getAttribute('href')));
    const spy = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(a => spy.observe($(a.getAttribute('href'))));
  }

  // Questions fréquentes : ouverture et fermeture en douceur
  if (!reduce) $$('.faq details').forEach(d => {
    const sum = $('summary', d);
    sum.addEventListener('click', e => {
      e.preventDefault();
      const from = d.offsetHeight;
      if (d.open) {
        const a = d.animate({ height: [from + 'px', sum.offsetHeight + 'px'] }, { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
        a.onfinish = () => { d.open = false; };
      } else {
        d.open = true;
        d.animate({ height: [from + 'px', d.offsetHeight + 'px'] }, { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    });
  });

  // Avis : glisser à la souris
  if (track && fine) {
    let down = false, x0 = 0, s0 = 0;
    track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; x0 = e.clientX; s0 = track.scrollLeft; track.setPointerCapture(e.pointerId); track.classList.add('drag'); });
    track.addEventListener('pointermove', e => { if (down) track.scrollLeft = s0 - (e.clientX - x0); });
    const up = () => { down = false; track.classList.remove('drag'); };
    track.addEventListener('pointerup', up); track.addEventListener('pointercancel', up);
  }

  // Réalisations : agrandissement au clic, flèches du clavier, Échap pour fermer
  const figs = $$('.gallery figure');
  if (figs.length && 'showModal' in document.createElement('dialog')) {
    const dlg = document.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', 'Photo agrandie');
    dlg.innerHTML = '<img alt=""><div class="lb-bar"><div><strong></strong><span></span></div><div class="lb-btns"><button type="button" data-lb="-1" aria-label="Photo précédente">‹</button><button type="button" data-lb="1" aria-label="Photo suivante">›</button><button type="button" data-lb="0" aria-label="Fermer">×</button></div></div>';
    document.body.append(dlg);
    let cur = 0;
    const show = i => {
      cur = (i + figs.length) % figs.length;
      const img = $('img', figs[cur]), cap = $('figcaption', figs[cur]), st = cap && $('strong', cap);
      $('img', dlg).src = img.currentSrc || img.src;
      $('img', dlg).alt = img.alt;
      $('strong', dlg).textContent = st ? st.textContent : '';
      $('.lb-bar span', dlg).textContent = cap ? cap.textContent.replace(st ? st.textContent : '', '').trim() : '';
    };
    const zooms = figs.map((f, i) => {
      const z = document.createElement('button');
      z.type = 'button';
      z.className = 'zoom';
      z.setAttribute('aria-label', 'Agrandir la photo : ' + ($('img', f).alt || ''));
      z.addEventListener('click', () => { show(i); dlg.showModal(); });
      f.append(z);
      return z;
    });
    dlg.addEventListener('click', e => {
      const b = e.target.closest('[data-lb]');
      if (b) { const d = +b.dataset.lb; if (d) show(cur + d); else dlg.close(); }
      else if (e.target === dlg) dlg.close();
    });
    dlg.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1); });
    dlg.addEventListener('close', () => zooms[cur].focus());
  }

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
