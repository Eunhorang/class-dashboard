/*
 * QR 코드 — 주소나 글을 교실 TV에 QR로 크게 띄운다
 * 학생들이 태블릿 카메라로 찍어 바로 연다. QR은 js/core/qrcode.js가 인터넷 없이 만든다.
 * 학습 사이트의 'QR' 단추로도 들어온다(CD.showQr). 최근에 만든 여덟 개를 남긴다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const store = CD.store;
  let current = null; // { text, title }

  function remember(item) {
    const s = store.state;
    s.qr.recent = [Object.assign({ at: Date.now() }, item)].concat(s.qr.recent.filter((r) => r.text !== item.text)).slice(0, 8);
    store.save();
  }
  /** 다른 화면에서 QR을 띄울 때 */
  CD.showQr = (text, title) => {
    current = { text: String(text), title: String(title || '') };
    remember(current);
    CD.go('qr');
  };

  function render(root) {
    const s = store.state;
    if (!current && s.qr.recent.length) current = { text: s.qr.recent[0].text, title: s.qr.recent[0].title };
    const text = h('input', { type: 'text', id: 'qrText', maxlength: 1000, placeholder: '예: https://padlet.com/우리반', value: current ? current.text : '' });
    const title = h('input', { type: 'text', id: 'qrTitle', maxlength: 40, placeholder: '예: 우리 반 패들렛 (비워도 돼요)', value: current ? current.title : '' });
    const make = (e) => {
      if (e) e.preventDefault();
      const t = text.value.trim();
      if (!t) { CD.ui.toast('주소나 글을 넣어 주세요.'); text.focus(); return; }
      if (new TextEncoder().encode(t).length > 900) { CD.ui.toast('너무 길어요. 900바이트(한글 약 300자)까지 QR로 만들 수 있어요.'); return; }
      current = { text: t, title: title.value.trim() };
      remember(current);
      CD.refresh();
    };
    const form = h('form', { class: 'qr-form teacher-only', on: { submit: make } },
      h('div', { class: 'field' }, h('label', { for: 'qrText', text: '주소나 글' }), text),
      h('div', { class: 'field' }, h('label', { for: 'qrTitle', text: '이름' }), title),
      h('div', { class: 'row-btns' }, h('button', { type: 'submit', class: 'btn primary', text: 'QR 만들기' })));

    let stage;
    if (current) {
      let svg = null;
      try { svg = CD.qrSvg(current.text, (current.title || current.text) + ' QR 코드'); } catch (e) { svg = null; }
      stage = h('div', { class: 'qr-stage' },
        svg || CD.ui.empty('QR로 만들 수 없어요', '글이 너무 길어요. 줄여서 다시 만들어 주세요.'),
        current.title ? h('p', { class: 'qr-title', text: current.title }) : null,
        h('p', { class: 'qr-text', text: current.text }));
    } else {
      stage = CD.ui.empty('아직 만든 QR 코드가 없어요', '주소를 넣고 ‘QR 만들기’를 누르면 화면에 크게 보여요. 학생들은 태블릿 카메라로 찍어서 바로 열어요.');
    }

    const linkChips = s.links.length ? h('div', { class: 'qr-side teacher-only' },
      h('h2', { text: '학습 사이트' }),
      h('div', { class: 'row-btns' }, s.links.slice(0, 12).map((l) => h('button', { type: 'button', class: 'btn sm quiet', text: l.title, on: { click: () => CD.showQr(l.url, l.title) } })))) : null;
    const recent = s.qr.recent.length ? h('div', { class: 'qr-side teacher-only' },
      h('h2', { text: '최근에 만든 QR' }),
      h('ul', { class: 'qr-recent' }, s.qr.recent.map((r) => h('li', null,
        h('button', { type: 'button', class: 'text-btn', text: r.title || r.text, title: r.text, on: { click: () => { current = { text: r.text, title: r.title }; CD.refresh(); } } }),
        h('button', { type: 'button', class: 'icon-btn sm', aria: { label: (r.title || r.text) + ' 지우기' }, on: { click: () => { s.qr.recent = s.qr.recent.filter((x) => x !== r); if (current && current.text === r.text) current = null; store.save(); CD.refresh(); } } }, CD.icon('close')))))) : null;

    const big = document.body.classList.contains('big');
    root.append(CD.ui.page('QR 코드', [CD.ui.btn(big ? '작게 보기' : '크게 보기', () => CD.setBig(!big), 'quiet')],
      h('div', { class: 'qr-layout' },
        h('div', { class: 'qr-main' }, stage),
        h('div', { class: 'qr-aside teacher-only' }, form, linkChips, recent))));
  }

  CD.modules.register({ id: 'qr', title: 'QR 코드', group: 'play', order: 330, render });
})(window.CD = window.CD || {});
