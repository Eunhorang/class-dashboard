/*
 * 평가 — 수행평가는 매우잘함·잘함·보통(노력필요) 3단계로, 단원평가는 점수로 적는다
 * 평가를 하나 고르면 학생마다 단계를 누르거나 점수를 적는다. '학생별로 보기'에서 모든 평가를 한 표로 모으고 CSV로 저장한다.
 * 학생 평가 결과라 관찰 기록처럼 들어올 때마다 가리개를 씌우고, 오늘 화면에는 띄우지 않는다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;

  const LEVELS = [['top', '매우잘함'], ['good', '잘함'], ['fair', '보통(노력필요)']];
  const LL = Object.fromEntries(LEVELS);
  const SHORT = { top: '매우잘함', good: '잘함', fair: '보통' };
  const KINDS = [['perf', '수행평가'], ['unit', '단원평가']];
  const KL = Object.fromEntries(KINDS);
  const SUBJECTS = ['국어', '수학', '사회', '과학', '영어', '도덕', '음악', '미술', '체육', '실과'];

  let revealed = false;   // 이번에 들어와서 가리개를 걷었는지
  let lastAct = 0;        // 마지막으로 누르거나 친 때
  const IDLE = 5 * 60 * 1000;
  ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, () => { lastAct = Date.now(); }, true));
  let filter = 'all';     // all | perf | unit

  const one = (n) => String(Math.round(n * 10) / 10);
  const nameOf = (g) => (g.subject ? g.subject + ' · ' : '') + g.title;
  const byNo = (a, b) => a.no - b.no || CD.ko.collator.compare(a.name, b.name);

  /** 이 평가에서 보여 줄 학생: 지금 우리 반 학생과, 결과가 남아 있는 전학생 */
  function roster(g) {
    return store.state.students.filter((k) => !k.left || (g && g.res[k.id] != null)).sort(byNo);
  }
  function progress(g) {
    const kids = store.students();
    return { done: kids.filter((k) => g.res[k.id] != null).length, total: kids.length };
  }
  function scoreStats(g) {
    const vals = roster(g).map((k) => g.res[k.id]).filter((v) => typeof v === 'number');
    if (!vals.length) return null;
    return { n: vals.length, avg: vals.reduce((a, b) => a + b, 0) / vals.length, max: Math.max(...vals), min: Math.min(...vals) };
  }
  function levelCounts(g) {
    const c = { top: 0, good: 0, fair: 0 };
    roster(g).forEach((k) => { const v = g.res[k.id]; if (v in c) c[v]++; });
    return c;
  }
  function newestFirst(list) {
    return list.slice().sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);
  }

  /* ---------- 평가 만들기·고치기·지우기 ---------- */
  function editForm(g) {
    const s = store.state;
    const fromTimetable = Object.values(s.timetable.grid).flat().filter(Boolean);
    const subjects = Array.from(new Set(SUBJECTS.concat(fromTimetable)));
    const unit = g ? g.kind === 'unit' : null;
    CD.ui.form({
      title: g ? '평가 고치기' : '평가 만들기',
      submit: g ? '저장' : '만들기',
      fields: [
        g ? null : { name: 'kind', label: '평가 종류', type: 'seg', value: filter === 'unit' ? 'unit' : 'perf', options: KINDS.map(([v, l]) => ({ value: v, label: l })), hint: '수행평가는 매우잘함·잘함·보통(노력필요) 3단계로, 단원평가는 점수로 적어요.', wide: true },
        { name: 'subject', label: '과목', value: g ? g.subject : '', list: subjects, placeholder: '예: 수학', maxlength: 12 },
        { name: 'date', label: '날짜', type: 'date', value: g ? g.date : D.iso(), required: true },
        { name: 'title', label: '평가 이름', value: g ? g.title : '', required: true, placeholder: g && !unit ? '예: 인물의 마음 짐작하며 읽기' : '예: 3단원 나눗셈', maxlength: 40, wide: true },
        unit === false ? null : { name: 'max', label: g ? '만점' : '만점 (단원평가만)', type: 'number', value: g ? g.max : 100, min: 1, max: 1000 },
        { name: 'note', label: '평가 기준이나 메모', value: g ? g.note : '', placeholder: '예: 인물의 말과 행동을 근거로 마음을 짐작해 말할 수 있다.', maxlength: 200, wide: true },
      ].filter(Boolean),
      extra: g ? [{ label: '지우기', danger: true, fn: () => remove(g) }] : [],
      onSubmit(v) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return '날짜를 골라 주세요.';
        const kind = g ? g.kind : (v.kind === 'unit' ? 'unit' : 'perf');
        let max = 0;
        if (kind === 'unit') {
          max = Math.round(Number(v.max));
          if (!(max >= 1 && max <= 1000)) return '만점은 1에서 1000 사이로 적어 주세요.';
          if (g && Object.values(g.res).some((x) => x > max)) return '이미 적은 점수 가운데 ' + max + '점보다 큰 점수가 있어요. 만점을 더 크게 적어 주세요.';
        }
        const data = { subject: (v.subject || '').slice(0, 12), title: v.title.slice(0, 40), date: v.date, max, note: (v.note || '').slice(0, 200) };
        if (g) {
          Object.assign(g, data);
          store.save();
          CD.refresh();
          CD.ui.toast('평가를 고쳤어요.');
          return true;
        }
        const made = Object.assign({ id: CD.uid(), kind, res: {}, at: Date.now() }, data);
        store.state.grades.push(made);
        store.save();
        if (filter !== 'all' && filter !== kind) filter = kind;
        CD.go('grades/' + made.id);
        CD.ui.toast('‘' + made.title + '’ ' + CD.ko.josa(KL[kind], '을/를') + ' 만들었어요. 학생마다 결과를 적어 주세요.');
        return true;
      },
    });
  }

  async function remove(g) {
    const n = Object.keys(g.res).length;
    const ok = await CD.ui.confirm({ title: '평가 지우기', body: '‘' + g.title + '’ 평가를 지울까요?' + (n ? ' 적어 둔 결과 ' + n + '명분도 함께 지워져요.' : ''), ok: '지우기', danger: true });
    if (!ok) return;
    const list = store.state.grades;
    const at = list.indexOf(g);
    if (at < 0) return;
    list.splice(at, 1);
    store.save();
    CD.go('grades');
    CD.ui.toast('평가를 지웠어요.', { action: '되돌리기', fn: () => { list.splice(Math.min(at, list.length), 0, g); store.save(); CD.go('grades/' + g.id); } });
  }

  /* ---------- CSV: 학생별로 모든 평가를 한 줄에 ---------- */
  function exportCsv() {
    const s = store.state;
    const list = s.grades.slice().sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at);
    const kids = s.students.filter((k) => !k.left || list.some((g) => g.res[k.id] != null)).sort(byNo);
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const head = ['번호', '이름'].concat(list.map((g) => nameOf(g) + ' (' + KL[g.kind] + (g.kind === 'unit' ? ', ' + g.max + '점 만점' : '') + ', ' + g.date + ')'));
    const lines = [head.map(q).join(',')];
    kids.forEach((k) => {
      lines.push([k.no, q(k.name + (k.left ? ' (전학)' : ''))].concat(list.map((g) => {
        const v = g.res[k.id];
        return v == null ? '' : g.kind === 'unit' ? v : q(LL[v]);
      })).join(','));
    });
    CD.download('평가-' + (s.profile.title || '학급').replace(/[\\/:*?"<>|\s]+/g, '-') + '-' + D.iso() + '.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
    CD.ui.toast('평가 결과를 CSV 파일로 저장했어요. 학생 평가 기록이니 안전한 곳에 두세요.');
  }

  /* ---------- 가리개 ---------- */
  function curtain(root) {
    root.append(CD.ui.page('평가', [],
      h('div', { class: 'curtain' },
        h('p', { class: 'empty-title', text: '학생 평가 결과라 가려 두었어요' }),
        h('p', { class: 'help', text: '교실 TV에 그대로 뜨지 않게 들어올 때마다 한 번 더 눌러야 보여요. 5분 동안 아무것도 누르지 않으면 다시 가려져요. 학생들이 화면을 보지 않을 때 열어 주세요.' }),
        CD.ui.btn('평가 보기', () => { revealed = true; lastAct = Date.now(); if (document.body.classList.contains('big')) CD.setBig(false); else CD.refresh(); }, 'primary big'))));
  }

  /* ---------- 수행평가: 학생마다 세 단계 중 하나 ---------- */
  function perfBody(g, onChange) {
    const sum = h('p', { class: 'missing' });
    const paintSum = () => {
      const c = levelCounts(g);
      const p = progress(g);
      const left = p.total - p.done;
      sum.replaceChildren(
        h('b', { text: LEVELS.map(([v, l]) => l + ' ' + c[v]).join(' · ') }),
        left ? ' · 아직 ' + left + '명' : ' · 모두 적었어요');
    };
    const set = (k, v, tr) => {
      if (v) g.res[k.id] = v; else delete g.res[k.id];
      tr.dataset.v = v || '';
      store.save();
      paintSum();
      onChange();
    };
    const rows = roster(g).map((k) => {
      const tr = h('tr', { data: { v: g.res[k.id] || '' } });
      const seg = h('div', { class: 'seg sm', role: 'radiogroup', aria: { label: k.name + ' 수행평가 결과' } }, LEVELS.map(([v, l]) => h('label', null,
        h('input', {
          type: 'radio', name: 'lv-' + k.id, value: v, checked: g.res[k.id] === v,
          on: {
            // 고른 단계를 다시 누르면 지운다
            click: (e) => { if (tr.dataset.v === v) { e.target.checked = false; set(k, '', tr); } },
            change: () => set(k, v, tr),
          },
        }),
        h('span', { text: l }))));
      tr.append(
        h('td', { class: 'num', text: String(k.no) }),
        h('td', null, h('b', { text: k.name }), k.left ? h('span', { class: 'muted', text: ' 전학' }) : null),
        h('td', null, seg));
      return tr;
    });
    paintSum();
    const fill = CD.ui.btn('빈칸 모두 잘함', () => {
      const empty = store.students().filter((k) => g.res[k.id] == null);
      if (!empty.length) { CD.ui.toast('빈칸이 없어요.'); return; }
      empty.forEach((k) => { g.res[k.id] = 'good'; });
      store.save();
      CD.refresh();
      CD.ui.toast(empty.length + '명을 잘함으로 채웠어요.', { action: '되돌리기', fn: () => { empty.forEach((k) => { delete g.res[k.id]; }); store.save(); CD.refresh(); } });
    }, 'quiet sm');
    return [
      h('div', { class: 'grade-sum' }, sum, fill),
      h('table', { class: 'table grade-table' },
        h('thead', null, h('tr', null, h('th', { class: 'num', text: '번호' }), h('th', { text: '이름' }), h('th', { text: '결과 (다시 누르면 지워져요)' }))),
        h('tbody', null, rows)),
    ];
  }

  /* ---------- 단원평가: 학생마다 점수 ---------- */
  function unitBody(g, onChange) {
    const sum = h('p', { class: 'missing' });
    const paintSum = () => {
      const st = scoreStats(g);
      const p = progress(g);
      const left = p.total - p.done;
      sum.replaceChildren(
        h('b', { text: st ? '평균 ' + one(st.avg) + '점 · 최고 ' + one(st.max) + '점 · 최저 ' + one(st.min) + '점' : '아직 적은 점수가 없어요' }),
        left ? ' · 아직 ' + left + '명' : ' · 모두 적었어요');
    };
    const inputs = [];
    const rows = roster(g).map((k) => {
      const input = h('input', {
        type: 'number', class: 'score-input', min: 0, max: g.max, step: 'any', inputmode: 'decimal',
        value: g.res[k.id] != null ? String(g.res[k.id]) : '', aria: { label: k.name + ' 점수' },
      });
      input.addEventListener('change', () => {
        const raw = input.value.trim();
        if (raw === '') { delete g.res[k.id]; }
        else {
          const n = Number(raw);
          if (!isFinite(n) || n < 0 || n > g.max) {
            CD.ui.toast(k.name + ' 점수는 0에서 ' + g.max + ' 사이로 적어 주세요.');
            input.value = g.res[k.id] != null ? String(g.res[k.id]) : '';
            return;
          }
          g.res[k.id] = Math.round(n * 10) / 10;
          input.value = String(g.res[k.id]);
        }
        store.save();
        paintSum();
        onChange();
      });
      // Enter를 누르면 다음 학생 칸으로
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.isComposing) return;
        e.preventDefault();
        const next = inputs[inputs.indexOf(input) + 1];
        input.dispatchEvent(new Event('change'));
        if (next) { next.focus(); next.select(); } else input.blur();
      });
      inputs.push(input);
      return h('tr', null,
        h('td', { class: 'num', text: String(k.no) }),
        h('td', null, h('b', { text: k.name }), k.left ? h('span', { class: 'muted', text: ' 전학' }) : null),
        h('td', null, input, h('span', { class: 'score-max', text: '/ ' + g.max })));
    });
    paintSum();
    return [
      h('div', { class: 'grade-sum' }, sum),
      h('table', { class: 'table grade-table' },
        h('thead', null, h('tr', null, h('th', { class: 'num', text: '번호' }), h('th', { text: '이름' }), h('th', { text: '점수 (Enter를 누르면 다음 학생)' }))),
        h('tbody', null, rows)),
    ];
  }

  /* ---------- 학생별로 보기: 모든 평가를 한 표에 ---------- */
  function renderStudents(root) {
    const s = store.state;
    const list = s.grades.slice().sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at);
    const kids = s.students.filter((k) => !k.left || list.some((g) => g.res[k.id] != null)).sort(byNo);
    const units = list.filter((g) => g.kind === 'unit');
    const actions = [CD.ui.btn('평가별로 보기', () => CD.go('grades'), 'primary'), list.length ? CD.ui.btn('엑셀 파일로 저장', exportCsv, 'quiet') : null, CD.ui.btn('가리기', () => { revealed = false; CD.refresh(); }, 'quiet')].filter(Boolean);
    if (!list.length) {
      root.append(CD.ui.page('평가 · 학생별로 보기', actions, CD.ui.empty('아직 평가가 없어요', '평가를 만들고 결과를 적으면 여기에 학생별로 모여요.')));
      return;
    }
    const table = h('table', { class: 'matrix' },
      h('thead', null, h('tr', null,
        h('th', { class: 'nm-no', text: '번호' }),
        h('th', { class: 'nm', text: '이름' }),
        list.map((g) => h('th', null, h('a', { href: '#/grades/' + encodeURIComponent(g.id) },
          h('small', { text: KL[g.kind] + ' · ' + D.shortDate(g.date, false) }), h('span', { text: nameOf(g) })))),
        units.length ? h('th', null, h('span', { text: '단원평가 평균' }), h('small', { text: '100점으로 바꿔 계산' })) : null)),
      h('tbody', null, kids.map((k) => {
        const pct = units.map((g) => g.res[k.id]).map((v, i) => (typeof v === 'number' ? v / units[i].max * 100 : null)).filter((v) => v != null);
        return h('tr', null,
          h('td', { class: 'nm-no', text: String(k.no) }),
          h('td', { class: 'nm' }, h('a', { href: '#/sheet/' + encodeURIComponent(k.id), title: k.name + ' 한 장 보기', on: { click: () => { CD.sheetPass = Date.now(); } } }, h('b', { text: k.name })), k.left ? h('span', { class: 'muted', text: ' 전학' }) : null),
          list.map((g) => {
            const v = g.res[k.id];
            if (v == null) return h('td', { class: 'muted', text: '·' });
            return g.kind === 'unit' ? h('td', { class: 'sc', text: String(v) }) : h('td', { class: 'lv lv-' + v, title: LL[v], text: SHORT[v] });
          }),
          units.length ? h('td', { class: 'sc avg', text: pct.length ? one(pct.reduce((a, b) => a + b, 0) / pct.length) : '·' }) : null);
      })));
    root.append(CD.ui.page('평가 · 학생별로 보기', actions,
      h('p', { class: 'help small', style: { 'margin-bottom': '0.8rem' }, text: '날짜 순서로 모든 평가를 모았어요. 평가 이름을 누르면 그 평가로, 학생 이름을 누르면 그 학생의 한 장 보기로 가요. 통지표나 생활기록부를 쓸 때 엑셀 파일로 저장해 쓰면 편해요.' }),
      h('div', { class: 'matrix-wrap' }, table)));
  }

  /* ---------- 평가별로 보기 ---------- */
  function render(root, ctx) {
    if (!revealed) { curtain(root); return; }
    if (!store.students().length) {
      root.append(CD.ui.page('평가', [], CD.ui.empty('학생 명단이 비어 있어요', '명단을 넣으면 학생마다 평가 결과를 적을 수 있어요.', CD.ui.btn('학생 명단 넣기', () => CD.go('students'), 'primary'))));
      return;
    }
    if (ctx.params[0] === 'students') { renderStudents(root); return; }
    const s = store.state;
    const all = newestFirst(s.grades);
    const shown = all.filter((g) => filter === 'all' || g.kind === filter);
    const sel = all.find((g) => g.id === ctx.params[0]) || shown[0] || null;
    const actions = [
      CD.ui.btn('평가 만들기', () => editForm(null), 'primary'),
      all.length ? CD.ui.btn('학생별로 보기', () => CD.go('grades/students')) : null,
      all.length ? CD.ui.btn('엑셀 파일로 저장', exportCsv, 'quiet') : null,
      CD.ui.btn('가리기', () => { revealed = false; CD.refresh(); }, 'quiet'),
    ].filter(Boolean);
    if (!all.length) {
      root.append(CD.ui.page('평가', actions, CD.ui.empty('아직 평가가 없어요', '‘평가 만들기’로 수행평가나 단원평가를 만들고 학생마다 결과를 적어요.', CD.ui.btn('평가 만들기', () => editForm(null), 'primary'))));
      return;
    }

    // 왼쪽: 평가 목록
    const filterSeg = h('div', { class: 'seg', role: 'radiogroup', aria: { label: '평가 종류 고르기' } },
      [['all', '모두']].concat(KINDS).map(([v, l]) => h('label', null,
        h('input', { type: 'radio', name: 'gkind', value: v, checked: filter === v, on: { change: () => { filter = v; CD.go('grades'); } } }),
        h('span', { text: l }))));
    const countEls = {};
    const metaOf = (g) => {
      const st = g.kind === 'unit' ? scoreStats(g) : null;
      return KL[g.kind] + ' · ' + D.shortDate(g.date) + (st ? ' · 평균 ' + one(st.avg) + '점' : '');
    };
    const ul = h('ul', { class: 'items' }, shown.map((g) => {
      const p = progress(g);
      countEls[g.id] = { count: h('span', { class: 'count num' }, h('b', { text: String(p.done) }), h('small', { text: '/' + p.total })), meta: h('span', { class: 'meta', text: metaOf(g) }) };
      return h('li', null, h('button', { type: 'button', aria: { current: String(sel === g) }, on: { click: () => CD.go('grades/' + g.id) } },
        h('span', { class: 't', text: nameOf(g) }), countEls[g.id].count, countEls[g.id].meta));
    }));
    const left = h('div', null, h('div', { class: 'tool-row' }, filterSeg),
      shown.length ? ul : CD.ui.empty('이 종류의 평가가 아직 없어요'));

    // 오른쪽: 고른 평가에 결과 적기 (목록의 숫자도 함께 고친다)
    const right = h('div');
    if (sel) {
      const onChange = () => {
        const p = progress(sel);
        const c = countEls[sel.id];
        if (c) { c.count.replaceChildren(h('b', { text: String(p.done) }), h('small', { text: '/' + p.total })); c.meta.textContent = metaOf(sel); }
      };
      right.append(...[
        h('div', { class: 'grade-head' },
          h('h2', { text: sel.title }),
          h('span', { class: 'kind', text: KL[sel.kind] }),
          h('span', { class: 'muted', text: [sel.subject, D.shortDate(sel.date), sel.kind === 'unit' ? sel.max + '점 만점' : ''].filter(Boolean).join(' · ') }),
          CD.ui.btn('고치기', () => editForm(sel), 'quiet sm')),
        sel.note ? h('p', { class: 'help small grade-note', text: '평가 기준: ' + sel.note }) : null,
        ...(sel.kind === 'unit' ? unitBody(sel, onChange) : perfBody(sel, onChange)),
      ].filter(Boolean));
    }
    root.append(CD.ui.page('평가', actions, h('div', { class: 'split' }, left, right)));
  }

  CD.modules.register({
    id: 'grades',
    title: '평가',
    group: 'manage',
    order: 206,
    // 결과를 다 적지 않은 평가 수 (이름이나 결과는 목차에 띄우지 않는다)
    badge(s) {
      const total = store.students().length;
      if (!total) return '';
      return s.grades.filter((g) => progress(g).done < total).length || '';
    },
    render,
    tick() {
      if (revealed && Date.now() - lastAct > IDLE && !document.querySelector('dialog[open]')) { revealed = false; CD.refresh(); }
    },
    leave(changed) { if (changed) revealed = false; },
  });
})(window.CD = window.CD || {});
