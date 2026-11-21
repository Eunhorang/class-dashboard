/*
 * 학급 대시보드 — 화면 부품
 * 알림, 확인 창, 입력 창, 도장 체크판, 쪽 머리, 빈 상태.
 */
(function (CD) {
  'use strict';

  const h = CD.h;

  /* ---------- 알림 ---------- */
  let toastTimer = 0;
  let toastFn = null;
  function toast(msg, opt) {
    const o = opt || {};
    const t = document.getElementById('toast');
    const action = document.getElementById('toastAction');
    document.getElementById('toastMsg').textContent = msg;
    toastFn = o.fn || null;
    action.hidden = !o.action;
    action.textContent = o.action || '';
    if (t.showPopover) {
      try { if (t.matches(':popover-open')) t.hidePopover(); t.showPopover(); } catch (e) { /* 지원 안 함 */ }
    }
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, o.action ? 7000 : 3400);
  }
  function hideToast() {
    const t = document.getElementById('toast');
    t.classList.remove('show');
    setTimeout(() => {
      if (!t.classList.contains('show') && t.hidePopover) { try { t.hidePopover(); } catch (e) { /* 닫힘 */ } }
    }, 320);
  }
  function initToast() {
    document.getElementById('toastAction').addEventListener('click', () => {
      const fn = toastFn;
      toastFn = null;
      hideToast();
      if (fn) fn();
    });
  }

  /** 화면 읽기 프로그램에 바로 알린다 */
  function announce(msg) {
    const el = document.getElementById('announce');
    el.textContent = '';
    setTimeout(() => { el.textContent = msg; }, 50);
  }

  /* ---------- 창 ---------- */
  function closeOnBackdrop(dlg) {
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close('cancel'); });
  }

  /** 확인 창: await CD.confirm({ title, body, ok, cancel, danger }) */
  function confirm(o) {
    const dlg = document.getElementById('confirmDlg');
    dlg.querySelector('h2').textContent = o.title || '확인';
    const body = dlg.querySelector('.dlg-body p');
    body.textContent = o.body || '';
    const okBtn = dlg.querySelector('[data-ok]');
    const cancelBtn = dlg.querySelector('[data-cancel]');
    okBtn.textContent = o.ok || '확인';
    cancelBtn.textContent = o.cancel || '취소';
    okBtn.classList.toggle('danger', !!o.danger);
    return new Promise((resolve) => {
      const done = (v) => { dlg.close(); resolve(v); };
      okBtn.onclick = () => done(true);
      cancelBtn.onclick = () => done(false);
      dlg.oncancel = (e) => { e.preventDefault(); done(false); };
      dlg.showModal();
      cancelBtn.focus();
    });
  }

  /**
   * 입력 창
   * CD.form({ title, submit: '저장', fields: [{ name, label, type, value, required, options, placeholder, hint, min, max, step }], onSubmit(values) → false면 닫지 않음, extra: [{ label, danger, fn }] })
   * type: text | textarea | date | time | number | select | seg | lines(줄마다 하나)
   */
  function form(o) {
    const dlg = document.getElementById('formDlg');
    const body = dlg.querySelector('.dlg-body');
    dlg.querySelector('h2').textContent = o.title || '';
    body.replaceChildren();
    const f = h('form', { class: 'form', novalidate: true });
    const controls = {};
    (o.fields || []).forEach((fd, i) => {
      const id = 'f-' + fd.name + '-' + i;
      let input;
      if (fd.type === 'textarea' || fd.type === 'lines') {
        input = h('textarea', { id, name: fd.name, rows: fd.rows || 5, placeholder: fd.placeholder || '' });
        input.value = Array.isArray(fd.value) ? fd.value.join('\n') : (fd.value || '');
      } else if (fd.type === 'select') {
        input = h('select', { id, name: fd.name }, (fd.options || []).map((op) => h('option', { value: op.value, text: op.label })));
        input.value = fd.value != null ? String(fd.value) : '';
      } else if (fd.type === 'checks') {
        // 여러 개 고르기: 학생 배정 같은 곳에 쓴다
        const picked = new Set((fd.value || []).map(String));
        input = h('div', { class: 'check-grid', role: 'group', aria: { label: fd.label } },
          (fd.options || []).map((op) => h('label', { class: 'check-item' },
            h('input', { type: 'checkbox', name: fd.name, value: op.value, checked: picked.has(String(op.value)) }),
            h('span', { text: op.label }))));
      } else if (fd.type === 'seg') {
        input = h('div', { class: 'seg', role: 'radiogroup', aria: { label: fd.label } },
          (fd.options || []).map((op) => h('label', null,
            h('input', { type: 'radio', name: fd.name, value: op.value, checked: String(fd.value) === String(op.value) }),
            h('span', { text: op.label }))));
      } else {
        input = h('input', { id, name: fd.name, type: fd.type || 'text', placeholder: fd.placeholder || '', min: fd.min, max: fd.max, step: fd.step, inputmode: fd.type === 'number' ? 'numeric' : null, maxlength: fd.maxlength || (fd.type === 'text' || !fd.type ? 120 : null), autocomplete: 'off' });
        input.value = fd.value != null ? fd.value : '';
        if (fd.list && fd.list.length) {
          // 자주 쓰는 값 고르기(과목 이름 등)
          const listId = id + '-list';
          input.setAttribute('list', listId);
          input = h('div', { class: 'with-list' }, input, h('datalist', { id: listId }, fd.list.map((v) => h('option', { value: v }))));
          input.focus = () => input.querySelector('input').focus();
        }
      }
      controls[fd.name] = { fd, input };
      const lab = fd.type === 'seg' ? h('span', { class: 'field-label', text: fd.label }) : h('label', { for: id, text: fd.label });
      f.append(h('div', { class: 'field' + (fd.wide ? ' wide' : '') }, lab, input, fd.hint ? h('p', { class: 'help small', text: fd.hint }) : null));
    });
    const err = h('p', { class: 'form-error', role: 'alert', hidden: true });
    const extras = (o.extra || []).map((x) => h('button', { type: 'button', class: 'btn' + (x.danger ? ' danger' : ''), text: x.label, on: { click: () => { dlg.close(); x.fn(); } } }));
    const actions = h('div', { class: 'row-btns end' },
      extras.length ? h('span', { class: 'push-left' }, extras) : null,
      h('button', { type: 'button', class: 'btn', text: '취소', on: { click: () => dlg.close() } }),
      h('button', { type: 'submit', class: 'btn primary', text: o.submit || '저장' }));
    f.append(err, actions);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const values = {};
      for (const [name, { fd, input }] of Object.entries(controls)) {
        let v;
        if (fd.type === 'seg') v = (f.querySelector('input[name="' + name + '"]:checked') || {}).value || '';
        else if (fd.type === 'checks') v = Array.from(f.querySelectorAll('input[name="' + name + '"]:checked')).map((x) => x.value);
        else if (input.classList && input.classList.contains('with-list')) v = input.querySelector('input').value;
        else v = input.value;
        if (fd.type === 'lines') v = v.split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
        else if (fd.type === 'number') v = v === '' ? '' : Number(v);
        else if (typeof v === 'string') v = v.trim();
        if (fd.required && (v === '' || (Array.isArray(v) && !v.length))) {
          err.textContent = fd.label + ' 칸을 채워 주세요.';
          err.hidden = false;
          (input.focus ? input : f).focus();
          return;
        }
        values[name] = v;
      }
      const r = o.onSubmit ? o.onSubmit(values) : true;
      if (typeof r === 'string') { err.textContent = r; err.hidden = false; return; }
      if (r !== false) dlg.close();
    });
    body.append(f);
    dlg.showModal();
    const first = f.querySelector('input:not([type="radio"]), textarea, select');
    if (first) { first.focus(); if (first.select && first.type !== 'date' && first.type !== 'time') first.select(); }
  }

  /* ---------- 도장 체크판 ----------
   * 학생 이름 칸을 누르면 빨간 도장이 찍히고 다시 누르면 지워진다. 모든 체크 화면이 같은 손동작을 쓴다.
   * CD.board({ students, isDone(s), onToggle(s) → 새 상태(bool), stamp: '냄', label }) */
  function board(o) {
    const list = h('div', { class: 'board', role: 'group', aria: { label: o.label || '학생 체크' } });
    const make = (s) => {
      const done = !!o.isDone(s);
      const b = h('button', { type: 'button', class: 'cell' + (done ? ' is-done' : ''), aria: { pressed: String(done) }, data: { id: s.id } },
        h('span', { class: 'no num', text: String(s.no) }),
        h('span', { class: 'nm', text: s.name }),
        h('span', { class: 'stamp-mini', aria: { hidden: 'true' }, text: o.stamp || '함' }));
      b.setAttribute('aria-label', s.name + (done ? ', ' + (o.doneWord || '도장 찍힘') : ''));
      return b;
    };
    o.students.forEach((s) => list.append(make(s)));
    list.addEventListener('click', (e) => {
      const b = e.target.closest('.cell');
      if (!b) return;
      const s = o.students.find((x) => x.id === b.dataset.id);
      if (!s) return;
      const now = !!o.onToggle(s);
      b.classList.toggle('is-done', now);
      b.classList.toggle('is-new', now);
      b.setAttribute('aria-pressed', String(now));
      b.setAttribute('aria-label', s.name + (now ? ', ' + (o.doneWord || '도장 찍힘') : ''));
      if (now) CD.sound.stamp();
    });
    return list;
  }

  /** 18/25 같은 숫자 */
  function count(done, total) {
    return h('span', { class: 'count num' }, h('b', { text: String(done) }), h('small', { text: '/' + total }));
  }

  /** 다 끝났을 때 찍는 큰 도장 */
  function doneStamp(text) {
    return h('span', { class: 'stamp-done', aria: { label: text || '다 함' } }, h('span', { text: text || '다 함' }));
  }

  /* ---------- 쪽 틀 ---------- */
  function page(title, actions, ...body) {
    return h('section', { class: 'page' },
      h('header', { class: 'page-head' }, h('h1', { text: title }), actions && actions.length ? h('div', { class: 'page-actions' }, actions) : null),
      body);
  }
  function btn(label, fn, cls, attrs) {
    return h('button', Object.assign({ type: 'button', class: 'btn' + (cls ? ' ' + cls : ''), on: { click: fn } }, attrs || {}), label);
  }
  function empty(title, text, action) {
    return h('div', { class: 'empty' }, h('p', { class: 'empty-title', text: title }), text ? h('p', { text }) : null, action || null);
  }

  CD.ui = { toast, initToast, announce, confirm, form, board, count, doneStamp, page, btn, empty, closeOnBackdrop };
})(window.CD = window.CD || {});
