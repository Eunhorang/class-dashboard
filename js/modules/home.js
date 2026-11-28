/*
 * 오늘 — 첫 화면
 * 날짜·지금 교시·급훈·시계를 맨 위에 두고, 두 단에 오늘 시간표와 알림장, 다가오는 행사와 아직 확인할 것을 담는다.
 * 끈 기능은 이 화면에서도 빠진다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;

  /** 그날 시간표: '날짜별로 바꾸기'로 바꾼 날이면 그것을, 아니면 요일 기초시간표를 쓴다.
   *  changed는 기초시간표와 달라진 교시 번호 */
  function dayPlan(tt, iso) {
    const wd = D.weekday(iso);
    const base = tt.days.includes(wd) ? tt.grid[wd] : null;
    const ch = (tt.changes || {})[iso];
    if (ch && ch.off) return { off: true, note: ch.note, row: null, changed: new Set(), base };
    if (ch) {
      const changed = new Set();
      ch.row.forEach((v, i) => { if (!tt.periods[i].rest && ((base || [])[i] || '') !== v) changed.add(i); });
      return { off: false, note: ch.note, row: ch.row, changed, base };
    }
    return { off: !base, note: '', row: base, changed: new Set(), base };
  }
  CD.dayPlan = dayPlan;

  /** 그날 쓰는 교시: 마지막 수업 뒤의 빈 교시는 뺀다. 마지막 수업 바로 뒤 점심·쉬는 시간은 남긴다.
   *  과목을 하나도 넣지 않은 날은 모든 교시를 그대로 둔다. */
  function dayPeriods(tt, dayRow) {
    const row = dayRow || [];
    const ps = tt.periods.map((p, i) => ({ ...p, i }));
    let end = -1;
    ps.forEach((p) => { if (!p.rest && row[p.i]) end = p.i; });
    if (end < 0) return ps;
    while (end + 1 < ps.length && ps[end + 1].rest) end++;
    return ps.slice(0, end + 1);
  }

  /** 지금이 몇 교시인지 */
  function nowInfo(tt, date) {
    const now = date || new Date();
    const today = D.iso(now);
    const wd = D.weekday(today);
    const m = now.getHours() * 60 + now.getMinutes();
    const plan = dayPlan(tt, today);
    if (plan.off) return { off: true, text: '오늘은 수업이 없는 날이에요' + (plan.note ? ' (' + plan.note + ')' : ''), index: -1 };
    const periods = dayPeriods(tt, plan.row).map((p) => ({ ...p, s: D.minutes(p.start), e: D.minutes(p.end) }));
    const row = plan.row;
    const subj = (p) => (p.rest ? p.label : [p.label, row && row[p.i]].filter(Boolean).join(' '));
    const timed = periods.filter((p) => p.s != null && p.e != null);
    if (!timed.length) return { text: '', index: -1 };
    for (let k = 0; k < timed.length; k++) {
      const p = timed[k];
      if (m >= p.s && m < p.e) {
        if (p.rest) return { text: p.label + ' 시간 · ' + p.end + '까지', index: p.i };
        return { text: '지금 ' + subj(p) + ' · ' + p.end + '까지', index: p.i };
      }
      const next = timed[k + 1];
      if (next && m >= p.e && m < next.s) {
        return { text: '쉬는 시간 · 다음은 ' + subj(next) + ' (' + next.start + ')', index: next.i, waiting: true };
      }
    }
    if (m < timed[0].s) return { text: '오늘 첫 시간은 ' + subj(timed[0]) + ' (' + timed[0].start + ')', index: -1, before: true };
    return { text: '오늘 수업이 모두 끝났어요', index: -1, after: true };
  }
  CD.nowInfo = nowInfo;

  /** 아직 확인할 것: 체크 기능에서 덜 끝난 것을 모은다 */
  function todos(s) {
    const out = [];
    const kids = store.students();
    const total = kids.length;
    if (!total) return out;
    const count = (done) => kids.filter((k) => done[k.id]).length;
    const missing = (done) => kids.filter((k) => !done[k.id]).map((k) => k.name);
    const listItems = (key, kind, route, word) => {
      if (!store.isOn(key)) return;
      s[key]
        .map((it) => ({ it, done: count(it.done) }))
        .filter((x) => x.done < total)
        .sort((a, b) => (a.it.due || '9999') .localeCompare(b.it.due || '9999'))
        .forEach(({ it, done }) => out.push({ kind, title: it.title, done, total, miss: missing(it.done), word, when: it.due ? D.dday(it.due) : '', href: '#/' + route + '/' + encodeURIComponent(it.id) }));
    };
    // 미처 못 한 사람을 부르는 말은 각 체크 화면과 같게
    listItems('forms', '안내장', 'forms', '안 낸 사람');
    listItems('homework', '과제', 'homework', '못 낸 사람');
    if (store.isOn('reading')) {
      const log = s.reading.log[D.iso()] || {};
      const away = CD.absentIds ? CD.absentIds() : new Set();
      const here = kids.filter((k) => !away.has(k.id));
      if (here.length) out.push({ title: '아침독서', when: '오늘', done: here.filter((k) => log[k.id]).length, total: here.length, miss: here.filter((k) => !log[k.id]).map((k) => k.name), word: '안 읽은 사람', href: '#/reading' });
    }
    if (store.isOn('roles') && s.roles.list.length) {
      const log = s.roles.log[D.iso()] || {};
      const done = s.roles.list.filter((r) => log[r.id]).length;
      const miss = s.roles.list.filter((r) => !log[r.id]).map((r) => r.name);
      out.push({ title: '1인1역', when: '오늘', done, total: s.roles.list.length, miss, word: '남은 역할', href: '#/roles', unit: '개' });
    }
    listItems('missions', '미션', 'missions', '아직 도전 중');
    return out;
  }

  function missText(t) {
    if (!t.miss.length) return '';
    const shown = t.miss.slice(0, 3).join(' · ');
    const rest = t.miss.length - 3;
    return t.word + ': ' + shown + (rest > 0 ? ' 외 ' + rest + (t.unit === '개' ? '개' : '명') : '');
  }

  /** 칠판 귀퉁이에 적던 재적·출석·결석. 사유는 TV에 띄우지 않는다 */
  function attCorner(today) {
    if (!store.isOn('attendance') || !CD.attendanceSummary || !store.students().length) return null;
    if (['토', '일'].includes(D.weekday(today))) return null;
    const sum = CD.attendanceSummary(today);
    if (!sum.taken) return h('a', { class: 'att-corner is-todo', href: '#/attendance', text: '출결 확인 전' });
    const n = (k) => (sum.by[k] || []).length;
    const parts = ['재적 ' + sum.total, '출석 ' + sum.present, '결석 ' + n('absent')];
    [['late', '지각'], ['early', '조퇴'], ['partial', '결과']].forEach(([k, l]) => { if (n(k)) parts.push(l + ' ' + n(k)); });
    return h('a', { class: 'att-corner num', href: '#/attendance', aria: { label: '오늘 출결: ' + parts.join(', ') } }, parts.map((p) => h('span', { text: p })));
  }

  let refs = null;

  function render(root) {
    const s = store.state;
    const today = D.iso();
    const info = nowInfo(s.timetable);
    refs = {};

    // 맨 위: 날짜·지금 교시 / 급훈 / 시계
    refs.now = h('p', { class: 'today-now', text: s.timetable ? info.text : '' });
    refs.clock = h('p', { class: 'clock num', text: D.clock(), aria: { label: '지금 시각' } });
    const motto = s.profile.motto
      ? h('p', { class: 'motto', text: s.profile.motto })
      : h('a', { class: 'motto is-empty', href: '#/settings', text: '급훈을 적어 보세요' });
    const top = h('header', { class: 'today-top' },
      h('div', null, h('h1', { class: 'today-date', text: D.longDate(today) }), store.isOn('timetable') ? refs.now : null),
      motto,
      h('div', { class: 'today-side' }, refs.clock, attCorner(today)));

    const left = h('div');
    const right = h('div');

    // 오늘 시간표
    if (store.isOn('timetable')) {
      refs.strip = h('div', { class: 'tt-strip' });
      refs.ttNote = h('p', { class: 'tt-note', hidden: true });
      fillStrip(refs.strip, s, info);
      left.append(h('section', { class: 'section' },
        h('div', { class: 'section-head' }, h('h2', { text: '오늘 시간표' }),
          h('span', { class: 'row-btns' },
            CD.changeDay ? h('button', { type: 'button', class: 'text-btn teacher-only', text: '오늘만 바꾸기', on: { click: () => CD.changeDay(D.iso()) } }) : null,
            h('a', { class: 'text-btn', href: '#/timetable', text: '시간표 보기' }))),
        refs.strip, refs.ttNote));
    }

    // 알림장
    if (store.isOn('notice')) {
      const note = s.notices.find((n) => n.date === today);
      const sec = h('section', { class: 'section' },
        h('div', { class: 'section-head' }, h('h2', { text: '알림장' }), h('a', { class: 'text-btn', href: '#/notice', text: note ? '고치기' : '쓰기' })));
      if (note && note.items.length) {
        sec.append(h('ol', { class: 'note-list' }, note.items.map((t, i) => h('li', null, h('span', { text: String(i + 1) }), t))));
      } else {
        sec.append(CD.ui.empty('오늘 알림장이 아직 없어요', '알림장에서 오늘 할 일을 적으면 여기에 크게 보여요.'));
      }
      left.append(sec);
    }

    // 오늘 급식 (나이스에서 받아 온 것, 학교를 골랐을 때만)
    if (CD.neis && CD.neis.on()) {
      CD.neis.ensure();
      const m = CD.neis.meal(today);
      left.append(h('section', { class: 'section' },
        h('div', { class: 'section-head' }, h('h2', { text: '오늘 급식' }), h('a', { class: 'text-btn', href: '#/meal', text: '이번 주 급식' })),
        m ? h('div', { class: 'meal-today ruled' }, h('p', null, m.dishes.map((d, i) => [i ? h('span', { class: 'sep', text: ' · ' }) : null, h('span', { text: d.name })])), m.kcal ? h('small', { class: 'num', text: m.kcal + ' kcal' }) : null)
          : h('p', { class: 'help ruled', style: { padding: '0.8rem 0.25rem' }, text: CD.neis.weekLoaded(today) ? '오늘은 급식이 없어요.' : (CD.neis.error() ? '급식을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.' : '급식을 받아 오는 중이에요.') })));
    }

    // 학습 사이트 바로 가기
    if (store.isOn('links') && s.links.length) {
      left.append(h('section', { class: 'section' },
        h('div', { class: 'section-head' }, h('h2', { text: '학습 사이트' }), h('a', { class: 'text-btn', href: '#/links', text: '모두 보기' })),
        h('div', { class: 'link-row ruled', style: { 'padding-top': '0.8rem' } },
          s.links.slice(0, 6).map((l) => h('a', { class: 'btn quiet', href: l.url, target: '_blank', rel: 'noopener', text: l.title })))));
    }

    // 칭찬 온도계 한 줄
    const praise = CD.praiseBar ? CD.praiseBar() : null;
    if (praise) right.append(h('section', { class: 'section praise-section' }, praise));

    // 다가오는 행사
    if (store.isOn('events')) {
      // 나이스 학사일정도 함께(교사가 같은 날 같은 이름으로 넣은 행사는 하나만)
      const neis = CD.neis && CD.neis.on() ? CD.neis.schedule()
        .filter((x) => !s.events.some((e) => e.date === x.date && e.title === x.name))
        .map((x) => ({ date: x.date, title: x.name + (x.end && x.end !== x.date ? ' (~' + D.shortDate(x.end, false) + ')' : ''), scope: 'neis' })) : [];
      const upcoming = s.events.concat(neis)
        .filter((e) => { const n = D.daysFrom(e.date); return n != null && n >= 0 && n <= 60; })
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5);
      const sec = h('section', { class: 'section' },
        h('div', { class: 'section-head' }, h('h2', { text: '다가오는 행사' }), h('a', { class: 'text-btn', href: '#/events', text: '행사 보기' })));
      if (upcoming.length) {
        sec.append(h('ul', { class: 'ev-list' }, upcoming.map((e) => h('li', null,
          h('b', { text: D.dday(e.date) }),
          h('span', { class: 'when', text: D.shortDate(e.date) }),
          h('span', null, e.title, h('span', { class: 'scope', text: e.scope === 'class' ? '학급' : e.scope === 'neis' ? '학사' : '학교' }))))));
      } else {
        sec.append(CD.ui.empty('두 달 안에 잡힌 행사가 없어요'));
      }
      right.append(sec);
    }

    // 아직 확인할 것
    const list = todos(s);
    if (list.length || store.students().length === 0) {
      const sec = h('section', { class: 'section' }, h('div', { class: 'section-head' }, h('h2', { text: '아직 확인할 것' })));
      if (!store.students().length) {
        sec.append(CD.ui.empty('학생 명단이 비어 있어요', '명단을 넣으면 과제·안내장·아침독서 체크를 여기서 한눈에 봐요.', CD.ui.btn('학생 명단 넣기', () => CD.go('students'), 'primary')));
      } else {
        const more = list.length - 5;
        sec.append(h('ul', { class: 'todo-list' }, list.slice(0, 5).map((t) => h('li', null,
          h('a', { href: t.href },
            h('b', { class: 'when', text: t.when }),
            h('span', null,
              h('span', { class: 't' }, t.title, t.kind ? h('span', { class: 'scope', text: t.kind }) : null),
              t.done < t.total ? h('span', { class: 'who', text: missText(t) }) : null),
            t.done >= t.total ? CD.ui.doneStamp('다 함') : CD.ui.count(t.done, t.total))))));
        if (more > 0) sec.append(h('p', { class: 'help small', style: { 'padding-top': '0.5rem' }, text: '그 밖에 ' + more + '개가 더 남았어요. 목차의 숫자를 눌러 확인해요.' }));
      }
      right.append(sec);
    }

    const cols = h('div', { class: 'today-cols' }, left, right);
    root.append(h('div', { class: 'today' }, top, cols));
  }

  function fillStrip(strip, s, info) {
    const plan = dayPlan(s.timetable, D.iso());
    const row = plan.row;
    strip.replaceChildren();
    strip.classList.toggle('is-empty', !row);
    if (refs && refs.ttNote) {
      const moved = Array.from(plan.changed).map((i) => s.timetable.periods[i].label + ' ' + (row[i] || '수업 없음'));
      refs.ttNote.textContent = row && (moved.length || plan.note) ? '오늘만 바꾼 시간표예요' + (plan.note ? ' · ' + plan.note : '') + (moved.length ? ' · ' + moved.join(', ') : '') : '';
      refs.ttNote.hidden = !refs.ttNote.textContent;
    }
    if (!row) {
      strip.append(h('p', { class: 'help', style: { padding: '0.9rem 0.25rem' }, text: '오늘은 수업이 없는 날이에요.' + (plan.note ? ' (' + plan.note + ')' : '') }));
      return;
    }
    dayPeriods(s.timetable, row).forEach((p) => {
      const i = p.i;
      const cls = ['p'];
      if (p.rest) cls.push('rest');
      if (plan.changed.has(i)) cls.push('chg');
      if (i === info.index && !info.waiting) cls.push('now');
      else if (info.after || (info.index >= 0 && i < info.index)) cls.push('past');
      strip.append(h('div', { class: cls.join(' ') },
        h('span', { text: p.rest ? '' : p.label }),
        h('b', { text: p.rest ? p.label : (row[i] || '·') }),
        h('i', { text: p.start || '' })));
    });
    if (refs && refs.stripAt !== info.index) {
      refs.stripAt = info.index;
      requestAnimationFrame(() => {
        const cell = strip.querySelector('.p.now') || strip.children[Math.max(0, dayPeriods(s.timetable, row).findIndex((p) => p.i === info.index))];
        if (cell && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = Math.max(0, cell.offsetLeft - (strip.clientWidth - cell.offsetWidth) / 2);
      });
    }
  }

  CD.modules.register({
    id: 'home',
    title: '오늘',
    group: 'day',
    order: 10,
    always: true,
    render,
    tick() {
      if (!refs) return;
      const s = store.state;
      refs.clock.textContent = D.clock();
      const info = nowInfo(s.timetable);
      if (refs.now) refs.now.textContent = info.text;
      if (refs.strip) fillStrip(refs.strip, s, info);
    },
    leave() { refs = null; },
  });
})(window.CD = window.CD || {});
