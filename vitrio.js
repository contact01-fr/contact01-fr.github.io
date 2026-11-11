/* ===== Site Vitrio : interactions propres au site de l'agence =====
   Aucune donnée saisie ici n'est envoyée ni enregistrée : tout reste dans le navigateur du visiteur. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Accueil : les deux écrans réagissent à la souris (ordinateur) ou au défilement (téléphone)
  const scene = $('.hero-scene'), hero = $('.hero');
  if (scene && hero && !reduce) {
    if (fine) {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        scene.style.setProperty('--ty', (-9 + x * 14).toFixed(2) + 'deg');
        scene.style.setProperty('--tx', (4 - y * 10).toFixed(2) + 'deg');
        scene.style.setProperty('--px', x.toFixed(3));
        scene.style.setProperty('--py', y.toFixed(3));
      });
      hero.addEventListener('pointerleave', () => ['--tx', '--ty', '--px', '--py'].forEach(v => scene.style.removeProperty(v)));
    } else {
      addEventListener('scroll', () => scene.style.setProperty('--sy', Math.min(60, scrollY * .12).toFixed(0) + 'px'), { passive: true });
    }
  }

  // Curseur lumineux
  if (fine && !reduce) {
    const c = document.createElement('div');
    c.className = 'cursor';
    c.setAttribute('aria-hidden', 'true');
    document.body.append(c);
    let x = 0, y = 0, tx = 0, ty = 0, run = false;
    const loop = () => {
      x += (tx - x) * .2; y += (ty - y) * .2;
      c.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      if (Math.abs(tx - x) + Math.abs(ty - y) > .3) requestAnimationFrame(loop); else run = false;
    };
    addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY;
      c.classList.add('on');
      c.classList.toggle('big', !!e.target.closest('a, button, .demo, .card, .plan, label, input, summary'));
      if (!run) { run = true; requestAnimationFrame(loop); }
    });
    document.addEventListener('pointerleave', () => c.classList.remove('on'));
  }

  // Avant / après
  $$('.compare').forEach(box => {
    const range = $('input[type="range"]', box);
    const set = v => box.style.setProperty('--pos', v + '%');
    range.addEventListener('input', () => set(range.value));
    set(range.value);
    // petite démonstration à la première apparition
    if (!reduce && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const step = t => {
          const p = Math.min(1, (t - t0) / 1800);
          const v = 50 + Math.sin(p * Math.PI * 2) * 28 * (1 - p * .3);
          if (document.activeElement !== range) { range.value = v; set(v); }
          if (p < 1) requestAnimationFrame(step); else { range.value = 50; set(50); }
        };
        requestAnimationFrame(step);
      }, { threshold: .6 });
      io.observe(box);
    }
  });

  // Essai en direct : le téléphone se met à jour pendant la saisie
  const form = $('.try-form'), screen = $('.screen');
  if (form && screen) {
    const M = {
      coiffeur: { eb: 'Coiffeur', h: n => "L'art de la coupe, chez " + n, cta: 'Prendre rendez-vous', img: 'demos/demo-salon-elegance/photos/accueil.webp', tags: ['Coupe', 'Couleur', 'Balayage', 'Soins'], style: 'elegant', nom: 'Salon Élégance' },
      restaurant: { eb: 'Restaurant', h: n => n + ', une cuisine faite maison', cta: 'Réserver une table', img: 'demos/demo-table-de-margot/photos/accueil.webp', tags: ['Menu du midi', 'Ardoise', 'Desserts maison'], style: 'chaleureux', nom: 'La Table de Margot' },
      artisan: { eb: 'Artisan', h: n => n + ' : une panne ? On s\'en occupe.', cta: 'Appeler maintenant', img: 'demos/demo-durand-plomberie/photos/accueil.webp', tags: ['Dépannage', 'Installation', 'Devis gratuit'], style: 'solide', nom: 'Durand Plomberie' }
    };
    const S = {
      elegant: { fd: '"Bodoni Moda", Georgia, serif', fb: '"Jost", system-ui, sans-serif', bg: '#1c1418', r: '6px', rb: '999px', font: 'bodoni-moda:500|jost:400,600' },
      chaleureux: { fd: '"Young Serif", Georgia, serif', fb: '"DM Sans", system-ui, sans-serif', bg: '#2a1610', r: '18px', rb: '999px', font: 'young-serif:400|dm-sans:400,600' },
      solide: { fd: '"Archivo", system-ui, sans-serif', fb: '"Archivo", system-ui, sans-serif', bg: '#0f1620', r: '10px', rb: '10px', font: null }
    };
    const loaded = {};
    const font = f => {
      if (!f || loaded[f]) return;
      loaded[f] = true;
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.bunny.net/css?family=' + f + '&display=swap';
      document.head.append(l);
    };
    const el = { name: $('.top span', screen), eb: $('.eb', screen), h: $('.h', screen), cta: $('.cta', screen), img: $('.ph img', screen), tags: $('.tags', screen) };
    const render = () => {
      const d = new FormData(form), m = M[d.get('metier')] || M.coiffeur, s = S[m.style];
      const nom = (d.get('nom') || '').trim().slice(0, 40) || m.nom;
      const ville = (d.get('ville') || '').trim().slice(0, 30);
      font(s.font);
      screen.style.setProperty('--a', d.get('couleur') || '#1e6b52');
      screen.style.setProperty('--bg', s.bg);
      screen.style.setProperty('--fd', s.fd);
      screen.style.setProperty('--fb', s.fb);
      screen.style.setProperty('--r', s.r);
      screen.style.setProperty('--r-btn', s.rb);
      el.name.textContent = nom;
      el.eb.textContent = m.eb + (ville ? ' · ' + ville : '');
      el.h.textContent = m.h(nom);
      el.cta.textContent = m.cta;
      if (el.img.getAttribute('src') !== m.img) el.img.src = m.img;
      el.tags.replaceChildren(...m.tags.map(t => { const sp = document.createElement('span'); sp.textContent = t; return sp; }));
      if (!reduce) { screen.classList.remove('pulse'); void screen.offsetWidth; screen.classList.add('pulse'); }
    };
    form.addEventListener('input', render);
    form.addEventListener('submit', e => e.preventDefault());
    render();
    const go = $('[data-try-send]');
    if (go) go.addEventListener('click', () => {
      const d = new FormData(form), msg = $('#f-msg');
      const label = { coiffeur: 'Coiffeur', restaurant: 'Restaurant', artisan: 'Artisan' }[d.get('metier')] || '';
      if (msg) msg.value = [d.get('nom') && 'Commerce : ' + d.get('nom').trim(), label && 'Métier : ' + label, d.get('ville') && 'Ville : ' + d.get('ville').trim()].filter(Boolean).join('\n');
      const c = $('#contact');
      if (c) c.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
    // le téléphone penche légèrement selon la souris
    const wrap = $('.phone-wrap'), phone = $('.phone');
    if (fine && !reduce && wrap && phone) {
      wrap.addEventListener('pointermove', e => { const r = wrap.getBoundingClientRect(); phone.style.setProperty('--tilt', (((e.clientX - r.left) / r.width - .5) * 6).toFixed(2) + 'deg'); });
      wrap.addEventListener('pointerleave', () => phone.style.setProperty('--tilt', '0deg'));
    }
  }

  // Étapes : la ligne se remplit et les numéros s'allument
  const steps = $('.steps');
  if (steps) {
    const lis = $$('li', steps);
    const upd = () => {
      const r = steps.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (innerHeight * .62 - r.top) / r.height));
      steps.style.setProperty('--p', reduce ? 1 : p.toFixed(3));
      lis.forEach((li, i) => li.classList.toggle('on', reduce || p >= i / lis.length + .02));
    };
    addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd);
    upd();
  }

  // Tarifs : paiement en 1 ou en 3 fois (sans frais, voir conditions de vente)
  const pay = $('.pay');
  if (pay) {
    const btns = $$('button', pay), ind = $('i', pay);
    const fmt = n => n.toLocaleString('fr-FR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }) + ' €';
    const select = k => {
      btns.forEach((b, i) => b.setAttribute('aria-pressed', i === k));
      ind.style.width = btns[k].offsetWidth + 'px';
      ind.style.transform = 'translateX(' + (btns[k].offsetLeft - 5) + 'px)';
      $$('.plan .amount[data-prix]').forEach(a => {
        const prix = +a.dataset.prix, sub = a.nextElementSibling;
        const apply = () => {
          a.textContent = k === 0 ? fmt(prix) : '3 × ' + fmt(Math.round(prix / 3 * 100) / 100);
          if (sub) sub.textContent = k === 0 ? 'une seule fois, ou en 3 fois sans frais' : 'en 3 fois sans frais, soit ' + fmt(prix) + ' au total';
          a.classList.remove('flip');
        };
        if (reduce) apply(); else { a.classList.add('flip'); setTimeout(apply, 200); }
      });
    };
    btns.forEach((b, i) => b.addEventListener('click', () => select(i)));
    select(0);
    addEventListener('resize', () => select(btns.findIndex(b => b.getAttribute('aria-pressed') === 'true')));
    if (document.fonts) document.fonts.ready.then(() => select(btns.findIndex(b => b.getAttribute('aria-pressed') === 'true')));
  }
})();
