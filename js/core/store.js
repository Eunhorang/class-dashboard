/*
 * 학급 대시보드 — 저장
 * 모든 자료를 이 브라우저의 localStorage 한 칸에 둔다. 서버로 보내는 것은 없다.
 * 다른 컴퓨터로 옮기거나 학교 컴퓨터가 초기화될 때를 대비해 백업 파일로 내보내고 되살린다.
 */
(function (CD) {
  'use strict';

  const KEY = 'class-dashboard/v1';
  const WHEEL_KEY = 'bingle-wheel/v1';
  const D = CD.date;

  const DEFAULT_PERIODS = [
    { label: '1교시', start: '09:00', end: '09:40' },
    { label: '2교시', start: '09:50', end: '10:30' },
    { label: '3교시', start: '10:40', end: '11:20' },
    { label: '4교시', start: '11:30', end: '12:10' },
    { label: '점심', start: '12:10', end: '13:00', rest: true },
    { label: '5교시', start: '13:00', end: '13:40' },
    { label: '6교시', start: '13:50', end: '14:30' },
  ];
  const DAYS = ['월', '화', '수', '목', '금'];

  /* ---------- 빈 자료 ---------- */
  function blank() {
    const t = Date.now();
    const grid = {};
    DAYS.forEach((d) => { grid[d] = DEFAULT_PERIODS.map(() => ''); });
    return {
      v: 1,
      meta: { createdAt: t, updatedAt: t, lastBackupAt: 0, sample: false },
      profile: { title: '우리 반', year: new Date().getFullYear() + '학년도', motto: '' },
      features: {},
      students: [],
      // changes: 날짜별로 바꾼 시간표 { 'YYYY-MM-DD': { off: 수업 없음, row: [교시별 과목], note } }
      timetable: { days: DAYS.slice(), periods: CD.clone(DEFAULT_PERIODS), grid, changes: {} },
      notices: [],
      homework: [],
      forms: [],
      missions: [],
      reading: { log: {} },
      roles: { list: [], log: {} },
      budget: { base: 0, entries: [] },
      events: [],
      links: [],
      games: { chosung: [], ox: [], updown: { min: 1, max: 100 }, ten: { target: 10 } },
      pick: { picks: [] },
      timer: { last: 300 },
      prefs: { sound: true },
      // 출결: 날짜 → 학생 id → { s: 결석·지각·조퇴·결과, r: 사유, m: 메모 }. 기록이 없으면 출석
      attendance: { log: {}, taken: {} },
      // 관찰 기록: { id, date, sids:[], cat, text, at }
      notes: [],
      // 평가: { id, kind: 'perf'(수행평가)|'unit'(단원평가), subject, title, date, max(단원평가 만점), note, res: { 학생 id: 'top'|'good'|'fair' 또는 점수 }, at }
      grades: [],
    };
  }

  /* ---------- 처음 열었을 때 보여 줄 예시 (모두 지어낸 자료) ---------- */
  const SAMPLE_NAMES = ['김민준', '이서연', '박도윤', '최하은', '정지호', '강서아', '조시우', '윤하윤', '장예준', '임지우', '한수아', '오은우', '서지아', '신유준', '권채원', '황이안', '안다은', '송주원', '전서진', '홍예린', '문건우', '양소율', '손현우', '배지안', '백태윤'];

  function sample() {
    const s = blank();
    const today = D.iso();
    // 예시 날짜가 주말에 걸리면 다음 평일로 미룬다
    const wd = (n) => { let d = D.addDays(today, n); while (['토', '일'].includes(D.weekday(d))) d = D.addDays(d, 1); return d; };
    const pd = (n) => { let d = D.addDays(today, -n); while (['토', '일'].includes(D.weekday(d))) d = D.addDays(d, -1); return d; };
    s.meta.sample = true;
    s.profile = { title: '3학년 2반', year: new Date().getFullYear() + '학년도', motto: '서로 돕고 함께 웃는 반' };
    s.students = SAMPLE_NAMES.map((name, i) => ({ id: CD.uid(), no: i + 1, name, note: '', left: false }));
    const ids = s.students.map((x) => x.id);
    const doneFor = (count) => { const o = {}; ids.slice(0, count).forEach((id) => { o[id] = Date.now(); }); return o; };
    const g = s.timetable.grid;
    g['월'] = ['국어', '수학', '체육', '음악', '', '사회', '창체'];
    g['화'] = ['수학', '국어', '과학', '미술', '', '미술', '영어'];
    g['수'] = ['국어', '영어', '수학', '체육', '', '도덕', ''];
    g['목'] = ['과학', '과학', '국어', '수학', '', '사회', '창체'];
    g['금'] = ['국어', '수학', '영어', '음악', '', '체육', ''];
    s.notices = [{ id: CD.uid(), date: today, items: ['수학 익힘책 52~53쪽 풀기', '수요일에 체육복 입고 오기', '우유갑 씻어서 가져오기', '독서록 한 편 쓰기'] }];
    s.homework = [
      { id: CD.uid(), title: '독서록 쓰기', due: wd(2), createdAt: Date.now(), done: doneFor(21) },
      { id: CD.uid(), title: '수학 익힘책 52~53쪽', due: wd(1), createdAt: Date.now(), done: doneFor(9) },
    ];
    s.forms = [{ id: CD.uid(), title: '현장체험학습 동의서', due: wd(1), createdAt: Date.now(), done: doneFor(18) }];
    s.missions = [{ id: CD.uid(), title: '줄넘기 100번 넘기', due: '', createdAt: Date.now(), done: doneFor(15) }];
    s.reading.log[today] = doneFor(22);
    s.attendance.log[today] = { [ids[22]]: { s: 'absent', r: 'sick', m: '감기' }, [ids[24]]: { s: 'late', r: 'other', m: '' } };
    s.attendance.taken[today] = Date.now();
    s.notes = [
      { id: CD.uid(), date: pd(6), sids: [ids[0]], cat: 'study', text: '수학 시간에 분수 그림을 친구에게 차근차근 설명해 줌.', at: Date.now() },
      { id: CD.uid(), date: pd(3), sids: [ids[4], ids[9]], cat: 'friend', text: '모둠 활동에서 역할을 나누고 서로 도와 발표를 끝까지 해냄.', at: Date.now() },
      { id: CD.uid(), date: pd(1), sids: [ids[0]], cat: 'praise', text: '쉬는 시간에 바닥에 떨어진 쓰레기를 스스로 주움.', at: Date.now() },
    ];
    // 평가 예시: 다 적은 수행평가, 적는 중인 수행평가, 결석한 학생 하나만 빈 단원평가
    const lv = (top, fair, upto) => Object.fromEntries(ids.slice(0, upto).map((id, i) => [id, top.includes(i) ? 'top' : fair.includes(i) ? 'fair' : 'good']));
    const scores = [100, 95, 90, 85, 100, 70, 95, 80, 90, 100, 65, 85, 90, 95, 75, 55, 100, 85, 90, 80, 95, 60, null, 85, 90];
    s.grades = [
      { id: CD.uid(), kind: 'perf', subject: '국어', title: '인물의 마음 짐작하며 읽기', date: pd(8), max: 0, note: '인물의 말과 행동을 근거로 마음을 짐작해 말할 수 있다.', res: lv([0, 3, 6, 9, 13, 17, 21], [5, 15, 22], ids.length), at: Date.now() },
      { id: CD.uid(), kind: 'perf', subject: '체육', title: '긴 줄넘기 함께 넘기', date: pd(4), max: 0, note: '', res: lv([1, 4, 8, 12], [10, 16], 18), at: Date.now() },
      { id: CD.uid(), kind: 'unit', subject: '수학', title: '3단원 나눗셈', date: pd(2), max: 100, note: '', res: Object.fromEntries(ids.map((id, i) => [id, scores[i]]).filter(([, v]) => v != null)), at: Date.now() },
    ];
    const roleNames = ['칠판 지우기', '우유 나르기', '창문 열고 닫기', '분리수거', '책꽂이 정리', '화분에 물 주기', '불 끄기', '급식차 정리', '학습지 나눠 주기', '신발장 정리', '복도 줄 세우기', '컴퓨터 끄기'];
    s.roles.list = roleNames.map((name, i) => ({ id: CD.uid(), name, sids: [ids[i * 2], ids[i * 2 + 1]].filter(Boolean) }));
    s.roles.log[today] = {};
    s.roles.list.slice(0, 9).forEach((r) => { s.roles.log[today][r.id] = Date.now(); });
    s.budget = {
      base: 300000,
      entries: [
        { id: CD.uid(), date: D.addDays(today, -20), kind: 'out', item: '학급 문고 책 5권', amount: 62000, memo: '' },
        { id: CD.uid(), date: D.addDays(today, -12), kind: 'out', item: '미술 활동 재료', amount: 38500, memo: '' },
        { id: CD.uid(), date: D.addDays(today, -3), kind: 'out', item: '생일 축하 간식', amount: 24000, memo: '' },
      ],
    };
    s.events = [
      { id: CD.uid(), date: wd(2), title: '학부모 공개수업', scope: 'school', memo: '' },
      { id: CD.uid(), date: wd(4), title: '현장체험학습', scope: 'school', memo: '' },
      { id: CD.uid(), date: wd(10), title: '독서 골든벨', scope: 'class', memo: '' },
      { id: CD.uid(), date: wd(26), title: '학예회', scope: 'school', memo: '' },
    ];
    s.links = [
      { id: CD.uid(), title: 'EBS 초등', url: 'https://primary.ebs.co.kr/', memo: '교과 영상' },
      { id: CD.uid(), title: '에듀넷', url: 'https://www.edunet.net/', memo: '교육 자료' },
      { id: CD.uid(), title: '디지털교과서', url: 'https://webdt.edunet.net/', memo: '' },
      { id: CD.uid(), title: '똑똑! 수학탐험대', url: 'https://www.toctocmath.kr/', memo: '수학 연습' },
      { id: CD.uid(), title: '표준국어대사전', url: 'https://stdict.korean.go.kr/', memo: '낱말 뜻 찾기' },
    ];
    s.games.chosung = [
      { id: CD.uid(), title: '과일', words: ['사과', '바나나', '포도', '딸기', '수박', '귤', '복숭아', '파인애플'] },
      { id: CD.uid(), title: '우리 학교', words: ['운동장', '도서관', '급식실', '교실', '보건실', '과학실'] },
    ];
    s.games.ox = [
      {
        id: CD.uid(),
        title: '생활 상식',
        items: [
          { q: '거미는 곤충이다.', a: false, why: '거미는 다리가 8개라서 곤충이 아니에요.' },
          { q: '물은 0도에서 얼기 시작한다.', a: true, why: '' },
          { q: '우리나라 국기의 이름은 태극기다.', a: true, why: '' },
          { q: '고래는 물고기다.', a: false, why: '고래는 새끼를 낳아 젖을 먹이는 포유류예요.' },
        ],
      },
    ];
    return s;
  }

  /* ---------- 불러온 값 다듬기 (깨진 값이 와도 멈추지 않게) ---------- */
  const str = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 200);
  const arr = (v) => (Array.isArray(v) ? v : []);
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const isoOr = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
  const idOr = (v) => (typeof v === 'string' && v ? v.slice(0, 40) : CD.uid());
  function doneMap(v) {
    const o = {};
    for (const [k, t] of Object.entries(obj(v))) if (k && t) o[k] = Number(t) || 1;
    return o;
  }
  function checkItems(list) {
    return arr(list).map((x) => ({ id: idOr(x && x.id), title: str(x && x.title, 80), due: isoOr(x && x.due), createdAt: Number(x && x.createdAt) || Date.now(), done: doneMap(x && x.done) })).filter((x) => x.title);
  }

  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return null;
    const s = blank();
    const m = obj(raw.meta);
    s.meta = { createdAt: Number(m.createdAt) || Date.now(), updatedAt: Number(m.updatedAt) || Date.now(), lastBackupAt: Number(m.lastBackupAt) || 0, sample: !!m.sample };
    const p = obj(raw.profile);
    s.profile = { title: str(p.title, 40) || '우리 반', year: str(p.year, 20), motto: str(p.motto, 60) };
    for (const [k, v] of Object.entries(obj(raw.features))) s.features[k] = v !== false;
    s.students = arr(raw.students).map((x, i) => ({ id: idOr(x && x.id), no: Number(x && x.no) || i + 1, name: str(x && x.name, 30), note: str(x && x.note, 100), left: !!(x && x.left) })).filter((x) => x.name);
    const tt = obj(raw.timetable);
    const days = arr(tt.days).map((d) => str(d, 4)).filter(Boolean);
    const periods = arr(tt.periods).map((x) => ({ label: str(x && x.label, 10), start: str(x && x.start, 5), end: str(x && x.end, 5), rest: !!(x && x.rest) })).filter((x) => x.label);
    if (days.length) s.timetable.days = days.slice(0, 6);
    if (periods.length) s.timetable.periods = periods.slice(0, 12);
    const grid = {};
    s.timetable.days.forEach((d) => {
      const row = arr(obj(tt.grid)[d]);
      grid[d] = s.timetable.periods.map((_, i) => str(row[i], 12));
    });
    s.timetable.grid = grid;
    s.timetable.changes = {};
    for (const [day, c] of Object.entries(obj(tt.changes))) {
      if (!isoOr(day)) continue;
      const row = arr(obj(c).row);
      s.timetable.changes[day] = { off: !!obj(c).off, row: s.timetable.periods.map((_, i) => str(row[i], 12)), note: str(obj(c).note, 40) };
    }
    s.notices = arr(raw.notices).map((x) => ({ id: idOr(x && x.id), date: isoOr(x && x.date), items: arr(x && x.items).map((t) => str(t, 120)).filter(Boolean).slice(0, 30) })).filter((x) => x.date);
    s.homework = checkItems(raw.homework);
    s.forms = checkItems(raw.forms);
    s.missions = checkItems(raw.missions);
    const log = {};
    for (const [day, v] of Object.entries(obj(obj(raw.reading).log))) if (isoOr(day)) log[day] = doneMap(v);
    s.reading = { log };
    const r = obj(raw.roles);
    s.roles = {
      list: arr(r.list).map((x) => ({ id: idOr(x && x.id), name: str(x && x.name, 30), sids: arr(x && x.sids).filter((id) => typeof id === 'string') })).filter((x) => x.name),
      log: {},
    };
    for (const [day, v] of Object.entries(obj(r.log))) if (isoOr(day)) s.roles.log[day] = doneMap(v);
    const b = obj(raw.budget);
    s.budget = {
      base: Math.round(Number(b.base) || 0),
      entries: arr(b.entries).map((x) => ({ id: idOr(x && x.id), date: isoOr(x && x.date) || D.iso(), kind: x && x.kind === 'in' ? 'in' : 'out', item: str(x && x.item, 60), amount: Math.abs(Math.round(Number(x && x.amount) || 0)), memo: str(x && x.memo, 100) })).filter((x) => x.item),
    };
    s.events = arr(raw.events).map((x) => ({ id: idOr(x && x.id), date: isoOr(x && x.date), title: str(x && x.title, 60), scope: x && x.scope === 'class' ? 'class' : 'school', memo: str(x && x.memo, 100) })).filter((x) => x.date && x.title);
    s.links = arr(raw.links).map((x) => ({ id: idOr(x && x.id), title: str(x && x.title, 40), url: str(x && x.url, 500), memo: str(x && x.memo, 60) })).filter((x) => x.title && /^https?:\/\//i.test(x.url));
    const gm = obj(raw.games);
    s.games.chosung = arr(gm.chosung).map((x) => ({ id: idOr(x && x.id), title: str(x && x.title, 30) || '낱말 묶음', words: arr(x && x.words).map((w) => str(w, 20)).filter(Boolean).slice(0, 200) }));
    s.games.ox = arr(gm.ox).map((x) => ({ id: idOr(x && x.id), title: str(x && x.title, 30) || 'OX 문제', items: arr(x && x.items).map((q) => ({ q: str(q && q.q, 120), a: !!(q && q.a), why: str(q && q.why, 160) })).filter((q) => q.q).slice(0, 200) }));
    const ud = obj(gm.updown);
    s.games.updown = { min: Math.round(Number(ud.min) || 1), max: Math.round(Number(ud.max) || 100) };
    if (s.games.updown.max <= s.games.updown.min) s.games.updown = { min: 1, max: 100 };
    s.games.ten = { target: CD.clamp(Math.round(Number(obj(gm.ten).target) || 10), 3, 60) };
    s.pick = { picks: arr(obj(raw.pick).picks).map((x) => ({ name: str(x && x.name, 30), at: Number(x && x.at) || Date.now() })).filter((x) => x.name).slice(-200) };
    s.timer = { last: CD.clamp(Math.round(Number(obj(raw.timer).last) || 300), 5, 3 * 3600) };
    s.prefs = { sound: obj(raw.prefs).sound !== false };
    const att = obj(raw.attendance);
    const STATUS = ['absent', 'late', 'early', 'partial'];
    const REASON = ['sick', 'unexcused', 'other', 'approved'];
    s.attendance = { log: {}, taken: {} };
    for (const [day, v] of Object.entries(obj(att.log))) {
      if (!isoOr(day)) continue;
      const one = {};
      for (const [sid, rec] of Object.entries(obj(v))) {
        const r = obj(rec);
        if (STATUS.includes(r.s)) one[sid] = { s: r.s, r: REASON.includes(r.r) ? r.r : 'sick', m: str(r.m, 60) };
      }
      if (Object.keys(one).length) s.attendance.log[day] = one;
    }
    for (const [day, t] of Object.entries(obj(att.taken))) if (isoOr(day) && t) s.attendance.taken[day] = Number(t) || 1;
    const CATS = ['life', 'study', 'friend', 'praise', 'talk', 'etc'];
    s.notes = arr(raw.notes).map((x) => ({
      id: idOr(x && x.id), date: isoOr(x && x.date) || D.iso(), sids: arr(x && x.sids).filter((v) => typeof v === 'string').slice(0, 60),
      cat: CATS.includes(x && x.cat) ? x.cat : 'etc', text: String((x && x.text) || '').trim().slice(0, 1000), at: Number(x && x.at) || Date.now(),
    })).filter((x) => x.text && x.sids.length);
    const LV = ['top', 'good', 'fair'];
    s.grades = arr(raw.grades).map((x) => {
      const kind = x && x.kind === 'unit' ? 'unit' : 'perf';
      const max = kind === 'unit' ? CD.clamp(Math.round(Number(x && x.max) || 100), 1, 1000) : 0;
      const res = {};
      for (const [sid, v] of Object.entries(obj(x && x.res))) {
        if (kind === 'perf' && LV.includes(v)) res[sid] = v;
        if (kind === 'unit' && v !== '' && v != null && isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max) res[sid] = Math.round(Number(v) * 10) / 10;
      }
      return { id: idOr(x && x.id), kind, subject: str(x && x.subject, 12), title: str(x && x.title, 40), date: isoOr(x && x.date) || D.iso(), max, note: str(x && x.note, 200), res, at: Number(x && x.at) || Date.now() };
    }).filter((x) => x.title);
    return s;
  }

  /* ---------- 읽고 쓰기 ---------- */
  let state = null;
  let timer = 0;
  let canSave = true;
  let onError = null;
  const listeners = new Set();

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { canSave = false; }
    if (raw) {
      try { state = normalize(JSON.parse(raw)); } catch (e) { state = null; }
      if (!state) { try { localStorage.setItem(KEY + '-unreadable-' + Date.now(), raw); } catch (e) { /* 공간 부족 */ } }
    }
    if (!state) state = sample();
    return state;
  }
  function writeNow() {
    clearTimeout(timer);
    timer = 0;
    if (!state) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      canSave = true;
    } catch (e) {
      if (canSave && onError) onError(e);
      canSave = false;
    }
  }
  /** 바꾼 뒤 부른다: 저장을 예약하고 화면에 알린다. */
  function save() {
    state.meta.updatedAt = Date.now();
    clearTimeout(timer);
    timer = setTimeout(writeNow, 200);
    listeners.forEach((fn) => fn(state));
  }
  window.addEventListener('pagehide', writeNow);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') writeNow(); });
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const next = normalize(JSON.parse(e.newValue));
      if (next) { state = next; listeners.forEach((fn) => fn(state, 'external')); }
    } catch (err) { /* 무시 */ }
  });

  /* ---------- 백업 파일 ---------- */
  function exportText() {
    return JSON.stringify({ app: 'class-dashboard', version: 1, exportedAt: new Date().toISOString(), data: state }, null, 1);
  }
  function backupName() {
    const t = (state.profile.title || '학급').replace(/[\\/:*?"<>|\s]+/g, '-');
    return '학급대시보드-' + t + '-' + D.iso() + '.json';
  }
  function markBackedUp() { state.meta.lastBackupAt = Date.now(); writeNow(); }
  /** 백업 파일 글을 읽어 자료로 바꾼다. 맞지 않으면 null. */
  function parseBackup(text) {
    try {
      const j = JSON.parse(text);
      if (j && j.app === 'class-dashboard' && j.data) return normalize(j.data);
    } catch (e) { /* 아래로 */ }
    return null;
  }
  function replace(next) {
    state = next;
    state.meta.sample = false;
    writeNow();
    listeners.forEach((fn) => fn(state, 'replace'));
  }

  /* ---------- 새 학년도 ---------- */
  function startNewYear(opt) {
    const keep = opt || {};
    const prev = state;
    const next = blank();
    next.profile = { title: keep.title || prev.profile.title, year: keep.year || prev.profile.year, motto: keep.motto != null ? keep.motto : '' };
    next.features = CD.clone(prev.features);
    if (keep.timetable) next.timetable = { days: prev.timetable.days.slice(), periods: CD.clone(prev.timetable.periods), grid: keep.timetableSubjects ? CD.clone(prev.timetable.grid) : next.timetable.grid, changes: {} };
    else next.timetable.periods = CD.clone(prev.timetable.periods);
    if (!keep.timetable || !keep.timetableSubjects) {
      next.timetable.days.forEach((d) => { next.timetable.grid[d] = next.timetable.periods.map(() => ''); });
    }
    if (keep.links) next.links = CD.clone(prev.links);
    if (keep.roles) next.roles.list = prev.roles.list.map((r) => ({ id: CD.uid(), name: r.name, sids: [] }));
    if (keep.games) next.games = CD.clone(prev.games);
    next.prefs = CD.clone(prev.prefs);
    next.meta.lastBackupAt = prev.meta.lastBackupAt;
    replace(next);
  }

  /** 예시 자료를 지우고 빈 대시보드로 (이름·급훈은 비운다) */
  function clearSample() {
    const next = blank();
    next.features = CD.clone(state.features);
    replace(next);
  }

  /* ---------- 빙글빙글 돌림판 목록 불러오기 (같은 주소라 읽을 수 있다) ---------- */
  function wheelLists() {
    try {
      const raw = JSON.parse(localStorage.getItem(WHEEL_KEY) || 'null');
      if (!raw || !raw.lists) return [];
      const ids = Array.isArray(raw.ids) ? raw.ids : Object.keys(raw.lists);
      return ids.map((id) => raw.lists[id]).filter(Boolean).map((l) => ({
        title: str(l.title, 40) || '목록',
        names: arr(l.entries).map((e) => str(e && e.name, 30)).filter(Boolean),
        sample: !!l.sample,
      })).filter((l) => l.names.length && !l.sample);
    } catch (e) {
      return [];
    }
  }

  /* ---------- 자주 쓰는 질문 ---------- */
  const isOn = (feature) => state.features[feature] !== false;
  const students = () => state.students.filter((s) => !s.left).sort((a, b) => a.no - b.no || CD.ko.collator.compare(a.name, b.name));
  const studentById = (id) => state.students.find((s) => s.id === id);

  CD.store = {
    KEY,
    DEFAULT_PERIODS,
    get state() { return state; },
    load,
    save,
    writeNow,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    onError(fn) { onError = fn; },
    exportText,
    backupName,
    markBackedUp,
    parseBackup,
    replace,
    startNewYear,
    clearSample,
    wheelLists,
    isOn,
    students,
    studentById,
    blank,
  };
})(window.CD = window.CD || {});
