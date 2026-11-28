/*
 * 자료 지키기 — 자동 백업 파일과 백업 알림 띠
 * 크롬·엣지·웨일(File System Access API)에서는 파일 하나를 정해 두면 자료가 바뀔 때마다 그 파일에 저절로 저장한다.
 * 파일 손잡이는 IndexedDB에 둔다. 브라우저를 다시 켜면 쓰기 허락을 한 번 다시 받아야 해서 그때는 띠로 알린다.
 * 다시 켜면 지워지는 학교 PC에서는 '자동 백업 파일 불러와 이어 쓰기'로 그 파일에서 되살리고 이어서 저장한다.
 * 자동 백업을 쓰지 않으면 마지막 백업이 7일(한 번도 안 했으면 3일)을 넘었을 때 띠로 알린다.
 * 파일은 이 컴퓨터(또는 교사가 고른 동기화 폴더)에만 쓰고 인터넷으로는 아무것도 보내지 않는다.
 */
(function (CD) {
  'use strict';

  const store = CD.store;
  const h = CD.h;
  const DB_NAME = 'class-dashboard';
  const OS = 'kv';
  const KEY = 'autoBackup';
  const TYPES = [{ description: '학급 대시보드 백업', accept: { 'application/json': ['.json'] } }];
  const DAY = 86400000;
  const supported = typeof window.showSaveFilePicker === 'function' && typeof window.showOpenFilePicker === 'function';

  let handle = null;  // FileSystemFileHandle
  let perm = null;    // 'granted' | 'prompt' | 'denied'
  let lastAt = 0;     // 마지막으로 자동 백업 파일에 쓴 때
  let failed = '';    // 마지막으로 쓰지 못한 까닭(오류 이름)
  let timer = 0;
  const listeners = new Set();

  function emit() {
    renderBar();
    listeners.forEach((fn) => { try { fn(); } catch (e) { /* 다음으로 */ } });
  }

  /* ---------- IndexedDB: 손잡이와 마지막 저장 때 ---------- */
  function openDb() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(OS);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function idb(mode, fn) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OS, mode);
      const req = fn(tx.objectStore(OS));
      tx.oncomplete = () => { db.close(); resolve(req && req.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }
  async function remember() {
    try {
      if (handle) await idb('readwrite', (os) => os.put({ handle, lastAt }, KEY));
      else await idb('readwrite', (os) => os.delete(KEY));
    } catch (e) { /* 손잡이를 담지 못하면 이번 창에서만 자동 백업을 쓴다 */ }
  }

  /* ---------- 파일에 쓰기 ---------- */
  async function write() {
    clearTimeout(timer);
    timer = 0;
    if (!handle || perm !== 'granted') return false;
    try {
      const w = await handle.createWritable();
      await w.write(store.exportText());
      await w.close();
      lastAt = Date.now();
      failed = '';
      store.markBackedUp();
      remember();
      emit();
      return true;
    } catch (e) {
      failed = (e && e.name) || 'Error';
      if (failed === 'NotAllowedError' || failed === 'SecurityError') perm = 'prompt';
      emit();
      return false;
    }
  }
  /** 자료가 바뀌면 3초 모았다가 쓴다 */
  function schedule() {
    if (!handle || perm !== 'granted') return;
    clearTimeout(timer);
    timer = setTimeout(write, 3000);
  }

  /* ---------- 교사가 누르는 일 (모두 클릭 안에서 불러야 브라우저가 허락 창을 띄운다) ---------- */
  const canceled = (e) => e && (e.name === 'AbortError');

  async function create() {
    try {
      handle = await window.showSaveFilePicker({ suggestedName: '학급대시보드-자동백업.json', types: TYPES });
    } catch (e) {
      if (!canceled(e)) CD.ui.toast('파일을 정하지 못했어요. 다시 해 주세요.');
      return;
    }
    perm = 'granted';
    const ok = await write();
    await remember();
    emit();
    CD.ui.toast(ok ? '‘' + handle.name + '’에 저장했어요. 앞으로 바뀌는 내용도 이 파일에 저절로 저장해요.' : '파일에 쓰지 못했어요. 다른 폴더를 골라 주세요.');
  }

  async function openAndContinue() {
    let h2;
    try {
      [h2] = await window.showOpenFilePicker({ types: TYPES, multiple: false });
    } catch (e) {
      if (!canceled(e)) CD.ui.toast('파일을 열지 못했어요. 다시 해 주세요.');
      return;
    }
    const file = await h2.getFile();
    if (file.size > 10 * 1024 * 1024) { CD.ui.toast('파일이 너무 커요. 이 대시보드의 백업 파일을 골라 주세요.'); return; }
    const text = await file.text();
    const next = store.parseBackup(text);
    if (!next) { CD.ui.toast('학급 대시보드 백업 파일이 아니에요. 다른 파일을 골라 주세요.'); return; }
    let when = '';
    try { const t = new Date(JSON.parse(text).exportedAt); if (!isNaN(t)) when = CD.date.shortDate(CD.date.iso(t)) + ' ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); } catch (e) { /* 날짜 없음 */ }
    const ok = await CD.ui.confirm({
      title: '자동 백업 파일 불러와 이어 쓰기',
      body: '‘' + next.profile.title + '’ 자료(학생 ' + next.students.length + '명' + (when ? ', ' + when + '에 저장' : '') + ')로 바꿀까요? 앞으로 바뀌는 내용은 이 파일에 이어서 저장해요. 지금 이 컴퓨터에 있는 자료는 파일 내용으로 바뀌어요.',
      ok: '불러와 이어 쓰기',
      danger: true,
    });
    if (!ok) return;
    let p = 'prompt';
    try { p = await h2.requestPermission({ mode: 'readwrite' }); } catch (e) { p = 'prompt'; }
    store.replace(next);
    handle = h2;
    perm = p;
    lastAt = Date.now();
    store.markBackedUp();
    await remember();
    emit();
    CD.go('home');
    CD.ui.toast(p === 'granted' ? '자동 백업 파일에서 되살렸어요. 앞으로 바뀌는 내용도 이 파일에 저장해요.' : '자동 백업 파일에서 되살렸어요. 파일에 쓰기를 허락하지 않아서 자동 저장은 멈춰 있어요.');
  }

  async function resume() {
    if (!handle) return;
    try { perm = await handle.requestPermission({ mode: 'readwrite' }); } catch (e) { perm = 'prompt'; }
    if (perm === 'granted') {
      const ok = await write();
      CD.ui.toast(ok ? '자동 백업을 이어서 해요.' : '파일에 쓰지 못했어요. 설정에서 자동 백업 파일을 다시 정해 주세요.');
    } else {
      emit();
      CD.ui.toast('쓰기를 허락해야 자동 백업을 이어서 할 수 있어요.');
    }
  }

  async function stop() {
    clearTimeout(timer);
    handle = null;
    perm = null;
    failed = '';
    await remember();
    emit();
    CD.ui.toast('자동 백업을 멈췄어요. 파일은 그 자리에 그대로 있어요.');
  }

  function saveNow() {
    if (handle && perm === 'granted') return write();
    CD.download(store.backupName(), store.exportText(), 'application/json');
    store.markBackedUp();
    emit();
    CD.ui.toast('백업 파일을 저장했어요. USB나 클라우드에 옮겨 두면 다른 컴퓨터에서도 되살릴 수 있어요.');
    return Promise.resolve(true);
  }

  function status() {
    return { supported, active: !!handle && perm === 'granted', paused: !!handle && perm !== 'granted', name: handle ? handle.name : '', lastAt, failed };
  }

  /* ---------- 백업 알림 띠 (크게 보기에서는 숨는다) ---------- */
  function nudge() {
    const s = store.state;
    if (!s || s.meta.sample || !s.students.length) return null;
    if (handle && perm !== 'granted') return { kind: 'paused' };
    if (handle && perm === 'granted' && !failed) return null;
    const last = s.meta.lastBackupAt;
    if (last) {
      const days = Math.floor((Date.now() - last) / DAY);
      return days >= 7 ? { kind: 'old', days } : null;
    }
    return Date.now() - (s.meta.createdAt || Date.now()) >= 3 * DAY ? { kind: 'never' } : null;
  }
  function renderBar() {
    const bar = document.getElementById('backupBar');
    if (!bar) return;
    const n = nudge();
    bar.hidden = !n;
    if (!n) { bar.replaceChildren(); return; }
    const btn = (text, fn) => h('button', { type: 'button', class: 'text-btn', text, on: { click: fn } });
    if (n.kind === 'paused') {
      bar.replaceChildren(
        h('p', { text: '자동 백업이 멈춰 있어요. 브라우저를 다시 켜면 한 번 허락해야 이어서 저장해요.' }),
        btn('이어서 저장하기', resume));
      return;
    }
    bar.replaceChildren(...[
      h('p', { text: n.kind === 'never' ? '아직 백업 파일을 한 번도 저장하지 않았어요.' : '백업한 지 ' + n.days + '일 지났어요.' }),
      btn('백업 파일 저장', saveNow),
      supported ? btn('자동 백업 켜기', () => CD.go('settings')) : null,
    ].filter(Boolean));
  }

  async function init() {
    if (supported) {
      try {
        const v = await idb('readonly', (os) => os.get(KEY));
        if (v && v.handle) { handle = v.handle; lastAt = v.lastAt || 0; }
      } catch (e) { /* IndexedDB를 못 쓰면 자동 백업도 이번 창에서만 */ }
      if (handle) {
        try { perm = await handle.queryPermission({ mode: 'readwrite' }); } catch (e) { perm = 'prompt'; }
      }
    }
    emit();
  }

  store.onChange((s, why) => { if (why !== 'external') schedule(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && timer) write(); });
  // 날짜가 지나면 알림 띠를 다시 따진다
  setInterval(renderBar, 10 * 60 * 1000);

  CD.backupFile = { supported, init, create, openAndContinue, resume, stop, saveNow, status, renderBar, onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
})(window.CD = window.CD || {});
