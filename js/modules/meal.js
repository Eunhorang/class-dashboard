/*
 * 급식과 학사일정 — 나이스 교육정보 개방 포털(open.neis.go.kr)에서 받아 온다
 * 학교를 고르면 이번 주 급식(중식)과 다가오는 학사일정을 받아 이 브라우저에 하루 동안 담아 둔다.
 * 보내는 것은 교육청 코드, 학교 코드, 날짜, 교사가 넣은 인증키뿐이고 학생 자료는 보내지 않는다.
 * 인증키가 없으면 한 번에 다섯 줄까지만 받을 수 있어서 학사일정은 한 주씩 나눠 받는다.
 * CSP(index.html)는 이 주소 한 곳만 열어 둔다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;
  const API = 'https://open.neis.go.kr/hub/';
  const CACHE_KEY = 'class-dashboard/neis';
  const DAYS_AHEAD = 56;

  let cache = readCache();
  let busy = 0;
  let lastError = '';
  let lastErrorAt = 0;
  let showAllergy = false;
  let weekOffset = 0;

  function readCache() {
    try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (c && c.meals) return c; } catch (e) { /* 새로 */ }
    return { school: '', meals: {}, weeks: {}, sched: null };
  }
  function writeCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* 공간 부족: 다음에 다시 받는다 */ }
  }
  function conf() {
    const n = store.state.neis;
    return n && n.office && n.code ? n : null;
  }
  const ymd = (iso) => iso.replace(/-/g, '');
  const fromYmd = (s) => s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8);
  function monday(iso) {
    const wd = ['일', '월', '화', '수', '목', '금', '토'].indexOf(D.weekday(iso));
    return D.addDays(iso, wd === 0 ? -6 : 1 - wd);
  }

  /* ---------- 나이스에 묻기 ---------- */
  async function call(path, params) {
    const key = (store.state.neis || {}).key || '';
    const q = new URLSearchParams(Object.assign({ Type: 'json', pIndex: '1', pSize: key ? '100' : '5' }, key ? { KEY: key } : {}, params));
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 9000);
    try {
      const r = await fetch(API + path + '?' + q.toString(), { signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
      const j = await r.json();
      if (!j[path]) {
        const code = j.RESULT && j.RESULT.CODE;
        if (code === 'INFO-200') return []; // 자료 없음
        throw new Error((j.RESULT && j.RESULT.MESSAGE) || '나이스 응답을 읽지 못했어요');
      }
      return (j[path][1] && j[path][1].row) || [];
    } finally {
      clearTimeout(t);
    }
  }

  /** 반찬 이름에서 알레르기 번호를 떼어 낸다: '햄김치찌개 (1.2.5)', '배추김치 (9)', '쌀밥5.6.' → { name, al } */
  function dish(raw) {
    const t = String(raw).replace(/\*/g, '').trim();
    let m = t.match(/^(.*?)\s*\((\d{1,2}(?:\.\d{1,2})*)\.?\)\s*$/);
    if (!m) m = t.match(/^(.*?[^\d.\s])\s*((?:\d{1,2}\.)+\d{0,2})$/);
    return m && m[1] ? { name: m[1].trim(), al: m[2].replace(/\.$/, '') } : { name: t, al: '' };
  }

  async function loadWeek(mon) {
    const n = conf();
    const fri = D.addDays(mon, 4);
    const rows = await call('mealServiceDietInfo', { ATPT_OFCDC_SC_CODE: n.office, SD_SCHUL_CODE: n.code, MMEAL_SC_CODE: '2', MLSV_FROM_YMD: ymd(mon), MLSV_TO_YMD: ymd(fri) });
    for (let i = 0; i < 5; i++) delete cache.meals[D.addDays(mon, i)];
    rows.forEach((r) => {
      cache.meals[fromYmd(r.MLSV_YMD)] = {
        dishes: String(r.DDISH_NM || '').split(/<br\s*\/?>/i).map((x) => x.trim()).filter(Boolean).map(dish),
        kcal: String(r.CAL_INFO || '').replace(/\s*kcal/i, '').trim(),
      };
    });
    cache.weeks[mon] = D.iso();
  }

  async function loadSchedule() {
    const n = conf();
    const today = D.iso();
    const end = D.addDays(today, DAYS_AHEAD);
    const rows = [];
    if (n.key) {
      rows.push(...await call('SchoolSchedule', { ATPT_OFCDC_SC_CODE: n.office, SD_SCHUL_CODE: n.code, AA_FROM_YMD: ymd(today), AA_TO_YMD: ymd(end) }));
    } else {
      // 인증키가 없으면 다섯 줄까지라 한 주씩(월~금) 나눠 묻는다
      for (let mon = monday(today); mon <= end; mon = D.addDays(mon, 7)) {
        rows.push(...await call('SchoolSchedule', { ATPT_OFCDC_SC_CODE: n.office, SD_SCHUL_CODE: n.code, AA_FROM_YMD: ymd(mon), AA_TO_YMD: ymd(D.addDays(mon, 4)) }));
      }
    }
    const seen = new Set();
    const list = rows
      .map((r) => ({ date: fromYmd(String(r.AA_YMD)), name: String(r.EVENT_NM || '').trim(), off: r.SBTR_DD_SC_NM === '휴업일' }))
      .filter((x) => x.name && x.date >= today && x.name !== '토요휴업일' && !['토', '일'].includes(D.weekday(x.date)))
      .filter((x) => { const k = x.date + x.name; if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
    // 방학처럼 날마다 따로 오는 같은 이름은 하나로 묶는다(주말·공휴일을 건너 나흘 안이면 이어진 것으로)
    const merged = [];
    const last = {};
    list.forEach((x) => {
      const p = last[x.name];
      if (p && (new Date(x.date) - new Date(p.end)) / 86400000 <= 4) { p.end = x.date; return; }
      const item = { date: x.date, end: x.date, name: x.name, off: x.off };
      merged.push(item);
      last[x.name] = item;
    });
    cache.sched = { at: today, items: merged };
  }

  /** 오늘 쓸 자료가 없으면 받아 온다(하루에 한 번). 받은 뒤 보고 있는 화면을 다시 그린다 */
  async function ensure(weekMon) {
    const n = conf();
    if (!n || busy) return;
    if (cache.school !== n.office + n.code) cache = { school: n.office + n.code, meals: {}, weeks: {}, sched: null };
    const today = D.iso();
    const mon = weekMon || monday(today);
    const needWeek = cache.weeks[mon] !== today;
    const needSched = !cache.sched || cache.sched.at !== today;
    if (!needWeek && !needSched) return;
    // 실패하면 5분 동안은 다시 묻지 않는다(화면을 다시 그릴 때마다 묻지 않게)
    if (lastError && Date.now() - lastErrorAt < 5 * 60 * 1000) return;
    busy++;
    try {
      if (needWeek) await loadWeek(mon);
      if (needSched) await loadSchedule();
      lastError = '';
    } catch (e) {
      lastError = e && e.name === 'AbortError' ? '나이스가 응답하지 않아요' : (e && e.message) || '불러오지 못했어요';
      lastErrorAt = Date.now();
    } finally {
      busy--;
      writeCache();
      const id = (location.hash.replace(/^#\/?/, '').split('/')[0]) || 'home';
      if (['home', 'meal', 'events'].includes(id) && !document.querySelector('dialog[open]')) CD.refresh();
    }
  }

  /** 다른 화면에서 쓴다 */
  CD.neis = {
    on: () => !!conf() && store.isOn('meal'),
    meal: (iso) => cache.meals[iso] || null,
    weekLoaded: (iso) => !!cache.weeks[monday(iso)],
    schedule: () => (cache.sched ? cache.sched.items : []),
    error: () => lastError,
    loading: () => busy > 0,
    ensure,
    dishName: (d) => d.name,
  };

  /* ---------- 학교 고르기 ---------- */
  function pickSchool() {
    CD.ui.form({
      title: '학교 찾기 (나이스)',
      submit: '찾기',
      fields: [{ name: 'q', label: '학교 이름', value: '', required: true, placeholder: '예: 금일초등학교', hint: '학교 이름을 나이스 교육정보 개방 포털에 보내 찾아요. 학생 자료는 보내지 않아요.', maxlength: 40 }],
      onSubmit(v) {
        const q = v.q.trim();
        call('schoolInfo', { SCHUL_NM: q }).then((rows) => {
          const list = rows.filter((r) => r.ATPT_OFCDC_SC_CODE && r.SD_SCHUL_CODE);
          if (!list.length) { CD.ui.toast('‘' + q + '’로 찾은 학교가 없어요. 이름을 다시 확인해 주세요.'); return; }
          CD.ui.form({
            title: '학교 고르기',
            submit: '이 학교로',
            fields: [{
              name: 'i', label: '찾은 학교' + (list.length >= 5 && !(store.state.neis.key) ? ' (다섯 곳까지만 보여요. 더 정확한 이름을 넣어 보세요)' : ''), type: 'seg', value: '0', wide: true,
              options: list.map((r, i) => ({ value: String(i), label: r.SCHUL_NM + ' · ' + String(r.ORG_RDNMA || r.ATPT_OFCDC_SC_NM || '').split(' ').slice(0, 2).join(' ') })),
            }],
            onSubmit(w) {
              const r = list[Number(w.i)];
              Object.assign(store.state.neis, { office: r.ATPT_OFCDC_SC_CODE, code: r.SD_SCHUL_CODE, name: r.SCHUL_NM });
              store.save();
              cache = { school: '', meals: {}, weeks: {}, sched: null };
              writeCache();
              lastError = '';
              CD.ui.toast(r.SCHUL_NM + '의 급식과 학사일정을 받아 올게요.');
              CD.refresh();
              ensure();
            },
          });
        }).catch(() => CD.ui.toast('나이스에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'));
      },
    });
  }
  CD.neisPickSchool = pickSchool;

  function editKey() {
    const n = store.state.neis;
    CD.ui.form({
      title: '나이스 인증키',
      fields: [{ name: 'key', label: '인증키 (선택)', value: n.key, placeholder: '비우면 인증키 없이 받아요', maxlength: 64, hint: '나이스 교육정보 개방 포털에 가입하면 무료로 받을 수 있어요. 있으면 학사일정을 한 번에 넉넉히 받아요.', wide: true }],
      onSubmit(v) {
        const key = String(v.key || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 64);
        n.key = key;
        store.save();
        if (cache.sched) cache.sched.at = '';
        writeCache();
        CD.refresh();
        ensure();
      },
    });
  }
  CD.neisEditKey = editKey;

  function forget() {
    Object.assign(store.state.neis, { office: '', code: '', name: '' });
    store.save();
    cache = { school: '', meals: {}, weeks: {}, sched: null };
    writeCache();
    CD.refresh();
    CD.ui.toast('학교를 지웠어요. 이제 나이스에 아무것도 묻지 않아요.');
  }
  CD.neisForget = forget;

  /* ---------- 급식 화면: 한 주 ---------- */
  function render(root) {
    const n = conf();
    if (!n) {
      root.append(CD.ui.page('급식', [], CD.ui.empty('학교를 고르면 급식이 보여요', '나이스 교육정보 개방 포털에서 이번 주 급식과 학사일정을 받아 와요. 보내는 것은 학교 코드와 날짜뿐이에요.', CD.ui.btn('학교 고르기', pickSchool, 'primary'))));
      return;
    }
    const today = D.iso();
    const mon = D.addDays(monday(today), weekOffset * 7);
    ensure(mon);
    const days = [0, 1, 2, 3, 4].map((i) => D.addDays(mon, i));
    const cols = days.map((d) => {
      const m = cache.meals[d];
      const loaded = cache.weeks[mon];
      return h('div', { class: 'meal-day' + (d === today ? ' is-today' : '') },
        h('h3', null, D.shortDate(d), d === today ? h('small', { text: ' 오늘' }) : null),
        m ? h('ul', null, m.dishes.map((x) => h('li', null, x.name, showAllergy && x.al ? h('small', { class: 'al', text: ' ' + x.al }) : null)))
          : h('p', { class: 'help small', text: loaded ? '급식이 없어요' : (busy ? '받아 오는 중이에요' : (lastError ? '불러오지 못했어요' : '받아 오는 중이에요')) }),
        m && m.kcal ? h('p', { class: 'kcal num', text: m.kcal + ' kcal' }) : null);
    });
    const nav = h('div', { class: 'day-nav' },
      h('button', { type: 'button', class: 'icon-btn', aria: { label: '지난주' }, on: { click: () => { weekOffset--; CD.refresh(); } } }, CD.icon('left')),
      h('span', { class: 'lbl', text: weekOffset === 0 ? '이번 주' : D.shortDate(mon) + ' 주' }),
      h('button', { type: 'button', class: 'icon-btn', aria: { label: '다음 주' }, on: { click: () => { weekOffset++; CD.refresh(); } } }, CD.icon('right')),
      weekOffset !== 0 ? CD.ui.btn('이번 주로', () => { weekOffset = 0; CD.refresh(); }, 'quiet sm') : null);
    const allergy = h('label', { class: 'switch teacher-only' },
      h('input', { type: 'checkbox', checked: showAllergy, on: { change: (e) => { showAllergy = e.target.checked; CD.refresh(); } } }),
      h('span', { class: 'track' }), h('span', { text: '알레르기 번호' }));
    const big = document.body.classList.contains('big');
    root.append(CD.ui.page('급식', [CD.ui.btn(big ? '작게 보기' : '크게 보기', () => CD.setBig(!big), 'quiet')],
      h('div', { class: 'tool-row' }, nav, h('span', { class: 'muted', text: n.name }), allergy),
      lastError ? h('p', { class: 'help small', text: lastError + '. 받아 둔 것이 있으면 그것을 보여 줘요.' }) : null,
      h('div', { class: 'meal-week' }, cols),
      h('p', { class: 'help small teacher-only', style: { 'margin-top': '1rem' }, text: '나이스 교육정보 개방 포털에서 받아 이 브라우저에 하루 동안 담아 둬요. 학교는 설정에서 바꿀 수 있어요.' })));
  }

  CD.modules.register({ id: 'meal', title: '급식', group: 'day', order: 25, render });
})(window.CD = window.CD || {});
