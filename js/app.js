/*
 * 학급 대시보드 — 뼈대
 * 왼쪽 목차와 본문. 기능(모듈)은 CD.modules.register로 스스로 등록하고, 주소의 # 뒤로 오간다.
 * 끈 기능은 목차와 '오늘'에서 사라진다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const store = CD.store;

  /* ---------- 기능 등록 ---------- */
  const mods = [];
  CD.modules = {
    register(m) { mods.push(m); },
    get(id) { return mods.find((m) => m.id === id); },
    list() { return mods.slice().sort((a, b) => a.order - b.order); },
    enabled(m) { return m.always || store.isOn(m.feature || m.id); },
  };

  // 목차 묶음: 같은 묶음끼리 붙이고 묶음 사이에 틈을 둔다
  const GROUPS = ['day', 'check', 'manage', 'play'];

  let current = null;
  let els = {};

  function go(route) {
    const target = '#/' + route;
    if (location.hash === target) render();
    else location.hash = target;
  }
  CD.go = go;

  function parseHash() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    return { id: parts[0] || 'home', params: parts.slice(1) };
  }

  /* ---------- 목차 ---------- */
  function renderNav() {
    const s = store.state;
    els.title.textContent = s.profile.title || '우리 반';
    els.topTitle.textContent = s.profile.title || '우리 반';
    els.year.textContent = [s.profile.year, '학급 대시보드'].filter(Boolean).join(' · ');
    const list = CD.modules.list().filter((m) => !m.bottom && !m.hidden && CD.modules.enabled(m));
    const frag = document.createDocumentFragment();
    let lastGroup = null;
    for (const m of list) {
      if (lastGroup && m.group !== lastGroup) frag.append(h('li', { class: 'nav-gap', aria: { hidden: 'true' } }));
      lastGroup = m.group;
      const badge = m.badge ? m.badge(s) : '';
      const a = h('a', { href: '#/' + m.id, class: 'nav-link', data: { id: m.id } },
        h('span', { class: 'nav-label', text: m.title }),
        badge ? h('span', { class: 'nav-badge num', text: String(badge) }) : null);
      if (current && current.id === m.id) a.setAttribute('aria-current', 'page');
      frag.append(h('li', null, a));
    }
    els.nav.replaceChildren(frag);
    els.settingsLink.toggleAttribute('aria-current', !!(current && current.id === 'settings'));
    if (current && current.id === 'settings') els.settingsLink.setAttribute('aria-current', 'page');
  }

  /* ---------- 본문 ---------- */
  function render() {
    const { id, params } = parseHash();
    let mod = CD.modules.get(id);
    if (!mod || !CD.modules.enabled(mod)) mod = CD.modules.get('home');
    const changed = current !== mod;
    if (current && current.leave) current.leave(changed);
    current = mod;
    const root = h('div', { class: 'view view-' + mod.id });
    els.main.replaceChildren(root);
    mod.render(root, { params, go });
    document.title = mod.title + ' · ' + (store.state.profile.title || '학급 대시보드');
    renderNav();
    renderSampleBar();
    if (CD.backupFile) CD.backupFile.renderBar();
    if (changed) {
      els.main.scrollTop = 0;
      document.body.classList.remove('nav-open');
      const h1 = root.querySelector('h1');
      if (h1 && document.activeElement && document.activeElement.closest('.rail')) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
    }
  }
  CD.refresh = render;

  /* ---------- 예시 자료 안내 ---------- */
  function renderSampleBar() {
    const on = store.state.meta.sample;
    els.sampleBar.hidden = !on;
  }

  /* ---------- 크게 보기 (교실 TV) ---------- */
  function setBig(on) {
    document.body.classList.toggle('big', on);
    els.bigBtn.textContent = on ? '작게 보기' : '크게 보기';
    els.bigExit.hidden = !on;
    const root = document.documentElement;
    if (on && root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen().catch(() => {});
    if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    // 단추 글자(크게 보기/작게 보기)와 크기에 맞춘 배치를 다시 그린다
    requestAnimationFrame(() => render());
  }

  /* ---------- 시작 ---------- */
  function boot() {
    store.load();
    CD.sound.setEnabledGetter(() => store.state.prefs.sound);
    CD.ui.initToast();
    // 자동 백업 파일: 손잡이를 꺼내 허락 상태를 보고, 설정 화면이면 다시 그린다
    if (CD.backupFile) {
      CD.backupFile.onChange(() => { if (current && current.id === 'settings' && !document.querySelector('dialog[open]')) render(); });
      CD.backupFile.init();
    }
    els = {
      title: document.getElementById('railTitle'),
      topTitle: document.getElementById('topTitle'),
      year: document.getElementById('railYear'),
      nav: document.getElementById('navList'),
      main: document.getElementById('main'),
      settingsLink: document.getElementById('settingsLink'),
      bigBtn: document.getElementById('bigBtn'),
      bigExit: document.getElementById('bigExit'),
      sampleBar: document.getElementById('sampleBar'),
    };
    ['confirmDlg', 'formDlg'].forEach((id) => CD.ui.closeOnBackdrop(document.getElementById(id)));
    document.querySelectorAll('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

    els.bigBtn.addEventListener('click', () => setBig(!document.body.classList.contains('big')));
    els.bigExit.addEventListener('click', () => setBig(false));
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('big')) setBig(false); });
    document.getElementById('menuBtn').addEventListener('click', () => {
      const open = !document.body.classList.contains('nav-open');
      document.body.classList.toggle('nav-open', open);
      document.getElementById('menuBtn').setAttribute('aria-expanded', String(open));
    });
    document.getElementById('navScrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
    document.getElementById('clearSampleBtn').addEventListener('click', async () => {
      const ok = await CD.ui.confirm({ title: '예시 자료 지우기', body: '예시로 넣어 둔 학생, 시간표, 체크, 운영비를 모두 지우고 빈 대시보드에서 시작해요. 학습 사이트와 게임 문제도 함께 지워져요.', ok: '지우고 시작하기', danger: true });
      if (!ok) return;
      store.clearSample();
      go('students');
      CD.ui.toast('빈 대시보드예요. 먼저 학생 명단을 넣어 주세요.');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('big') && !document.querySelector('dialog[open]')) setBig(false);
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) document.body.classList.remove('nav-open');
    });

    store.onError(() => CD.ui.toast('이 브라우저에는 저장할 수 없어요. 설정에서 백업 파일로 저장해 두세요.'));
    store.onChange((s, why) => {
      if (why === 'external' || why === 'replace') render();
      else renderNav();
    });

    window.addEventListener('hashchange', render);
    render();

    // 1분마다 시계와 지금 교시를 고친다
    let day = CD.date.iso();
    setInterval(() => {
      // 자정이 지나면 날짜가 바뀐 화면으로 다시 그린다
      if (CD.date.iso() !== day) { day = CD.date.iso(); render(); return; }
      if (current && current.tick) current.tick();
    }, 10000);

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
  }

  CD.boot = boot;
  CD.setBig = setBig;
  CD.GROUPS = GROUPS;
})(window.CD = window.CD || {});
