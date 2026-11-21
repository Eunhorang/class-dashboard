/*
 * 학습 사이트 — 자주 가는 사이트 모음
 * 누르면 새 탭에서 열린다. 앞쪽 여섯 개는 오늘 화면에도 단추로 보인다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const store = CD.store;

  function host(url) {
    try { return new URL(url).host.replace(/^www\./, ''); } catch (e) { return url; }
  }

  function edit(link) {
    const s = store.state;
    CD.ui.form({
      title: link ? '사이트 고치기' : '사이트 추가',
      submit: link ? '저장' : '추가',
      fields: [
        { name: 'title', label: '이름', value: link ? link.title : '', required: true, placeholder: '예: e학습터' },
        { name: 'url', label: '주소', type: 'url', value: link ? link.url : 'https://', required: true, placeholder: 'https://' },
        { name: 'memo', label: '한 줄 설명', value: link ? link.memo : '', placeholder: '예: 온라인 학습방', wide: true },
        link ? { name: 'pos', label: '순서', type: 'seg', value: 'stay', options: [{ value: 'stay', label: '그대로' }, { value: 'top', label: '맨 앞으로' }] } : null,
      ].filter(Boolean),
      extra: link ? [{ label: '지우기', danger: true, fn: () => remove(link) }] : [],
      onSubmit(v) {
        let url = String(v.url || '').trim();
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/+/, '');
        try { new URL(url); } catch (e) { return '주소를 읽지 못했어요. https://로 시작하는 주소를 넣어 주세요.'; }
        const data = { title: v.title.slice(0, 40), url: url.slice(0, 500), memo: (v.memo || '').slice(0, 60) };
        if (link) {
          Object.assign(link, data);
          if (v.pos === 'top') { s.links.splice(s.links.indexOf(link), 1); s.links.unshift(link); }
        } else s.links.push(Object.assign({ id: CD.uid() }, data));
        store.save();
        CD.refresh();
      },
    });
  }

  function remove(link) {
    const list = store.state.links;
    const at = list.indexOf(link);
    list.splice(at, 1);
    store.save();
    CD.refresh();
    CD.ui.toast(CD.ko.josa('‘' + link.title + '’', '을/를') + ' 지웠어요.', { action: '되돌리기', fn: () => { list.splice(at, 0, link); store.save(); CD.refresh(); } });
  }

  function render(root) {
    const s = store.state;
    const add = CD.ui.btn('사이트 추가', () => edit(null), 'primary');
    if (!s.links.length) {
      root.append(CD.ui.page('학습 사이트', [add], CD.ui.empty('모아 둔 사이트가 없어요', '수업에 자주 여는 사이트를 넣어 두면 한 번에 열 수 있어요.', CD.ui.btn('사이트 추가', () => edit(null), 'primary'))));
      return;
    }
    root.append(CD.ui.page('학습 사이트', [add],
      h('ul', { class: 'links' }, s.links.map((l) => h('li', null,
        h('a', { class: 'go', href: l.url, target: '_blank', rel: 'noopener' },
          h('span', { class: 'lt' }, l.title, CD.icon('open')),
          h('span', { class: 'lu', text: (l.memo ? l.memo + ' · ' : '') + host(l.url) })),
        CD.ui.btn('고치기', () => edit(l), 'quiet sm'))))));
  }

  CD.modules.register({ id: 'links', title: '학습 사이트', group: 'manage', order: 230, render });
})(window.CD = window.CD || {});
