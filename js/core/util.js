/*
 * 학급 대시보드 — 자주 쓰는 도구
 * 요소 만들기, 날짜, 공정한 난수, 복사·내려받기.
 */
(function (CD) {
  'use strict';

  /* ---------- 요소 만들기 ----------
   * h('button', { class: 'btn', on: { click: fn }, aria: { label: '닫기' } }, '닫기', childEl)
   * text는 textContent로만 넣는다(innerHTML을 쓰지 않아 이름에 든 꺾쇠가 그대로 보인다). */
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    const a = attrs || {};
    for (const key of Object.keys(a)) {
      const v = a[key];
      if (v == null || v === false) continue;
      if (key === 'class') el.className = v;
      else if (key === 'text') el.textContent = v;
      else if (key === 'on') { for (const ev of Object.keys(v)) el.addEventListener(ev, v[ev]); }
      else if (key === 'data') { for (const d of Object.keys(v)) el.dataset[d] = v[d]; }
      else if (key === 'aria') { for (const r of Object.keys(v)) el.setAttribute('aria-' + r, v[r]); }
      else if (key === 'style' && typeof v === 'object') { for (const s of Object.keys(v)) el.style.setProperty(s, v[s]); }
      else if (key in el && typeof v !== 'string') el[key] = v;
      else el.setAttribute(key, v === true ? '' : v);
    }
    append(el, children);
    return el;
  }
  function append(el, children) {
    for (const c of children) {
      if (c == null || c === false) continue;
      if (Array.isArray(c)) append(el, c);
      else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  // 선 아이콘(index.html의 <symbol>)
  function icon(name, cls) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'i' + (cls ? ' ' + cls : ''));
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name);
    svg.append(use);
    return svg;
  }

  /* ---------- 치우침 없는 난수 ---------- */
  const rand = {
    int(n) {
      if (!(n > 0)) return 0;
      const limit = Math.floor(0x100000000 / n) * n;
      const buf = new Uint32Array(1);
      let x;
      do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
      return x % n;
    },
    float() {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / 0x100000000;
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = rand.int(i + 1);
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
  };

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const b = new Uint32Array(2);
    crypto.getRandomValues(b);
    return b[0].toString(36) + b[1].toString(36);
  }

  /* ---------- 날짜 ---------- */
  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  const pad = (n) => String(n).padStart(2, '0');
  function iso(d) {
    const x = d || new Date();
    return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
  }
  function parse(isoStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoStr || ''));
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  function addDays(isoStr, n) {
    const d = parse(isoStr) || new Date();
    d.setDate(d.getDate() + n);
    return iso(d);
  }
  function weekday(isoStr) { const d = parse(isoStr); return d ? WEEK[d.getDay()] : ''; }
  /** 11월 23일 월요일 */
  function longDate(isoStr) {
    const d = parse(isoStr);
    if (!d) return '';
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + WEEK[d.getDay()] + '요일';
  }
  /** 11.23 월 */
  function shortDate(isoStr, withDay) {
    const d = parse(isoStr);
    if (!d) return '';
    return (d.getMonth() + 1) + '.' + d.getDate() + (withDay === false ? '' : ' ' + WEEK[d.getDay()]);
  }
  /** 오늘에서 며칠 남았는지: 양수면 앞으로 */
  function daysFrom(isoStr, fromIso) {
    const a = parse(fromIso || iso());
    const b = parse(isoStr);
    if (!a || !b) return null;
    return Math.round((b - a) / 86400000);
  }
  function dday(isoStr) {
    const n = daysFrom(isoStr);
    if (n == null) return '';
    if (n === 0) return 'D-DAY';
    return n > 0 ? 'D-' + n : 'D+' + (-n);
  }
  /** 다음 수업일(토·일 건너뛰기) */
  function nextSchoolDay(isoStr) {
    let d = addDays(isoStr || iso(), 1);
    while (['토', '일'].includes(weekday(d))) d = addDays(d, 1);
    return d;
  }
  function minutes(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }
  function clock(d) {
    const x = d || new Date();
    return pad(x.getHours()) + ':' + pad(x.getMinutes());
  }
  /** 12,345원 */
  function won(n) {
    const v = Math.round(Number(n) || 0);
    return (v < 0 ? '-' : '') + Math.abs(v).toLocaleString('ko-KR') + '원';
  }

  /* ---------- 복사·내려받기 ---------- */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const host = document.querySelector('dialog[open]') || document.body;
      const ta = h('textarea', { readonly: true, style: { position: 'fixed', top: '0', left: '0', opacity: '0' } });
      ta.value = text;
      host.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type: type || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    (document.querySelector('dialog[open]') || document.body).append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function debounce(fn, ms) {
    let t = 0;
    return function () { clearTimeout(t); const args = arguments; t = setTimeout(() => fn.apply(null, args), ms); };
  }

  CD.h = h;
  CD.append = append;
  CD.icon = icon;
  CD.rand = rand;
  CD.uid = uid;
  CD.date = { WEEK, iso, parse, addDays, weekday, longDate, shortDate, daysFrom, dday, nextSchoolDay, minutes, clock, pad };
  CD.won = won;
  CD.copyText = copyText;
  CD.download = download;
  CD.clone = clone;
  CD.clamp = clamp;
  CD.debounce = debounce;
})(window.CD = window.CD || {});
