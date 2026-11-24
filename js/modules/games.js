/*
 * 학급 대시보드 — 게임
 * 교실 TV에 띄워 반 전체가 함께 하는 게임 넷: 초성 퀴즈, 업다운 숫자 맞히기, 10초 멈추기, OX 퀴즈.
 * 주소는 #/games(목록)와 #/games/chosung · updown · ten · ox.
 * 낱말·문제 묶음, 숫자 범위, 목표 시간은 저장한다. 10초 멈추기 기록은 이 창을 닫으면 사라진다.
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const ui = CD.ui;
  const store = CD.store;

  const GAMES = [
    { id: 'chosung', title: '초성 퀴즈', desc: '낱말의 첫소리만 보고 무슨 낱말인지 맞혀요.' },
    { id: 'updown', title: '업다운 숫자 맞히기', desc: '숨은 숫자를 맞혀요. 부른 숫자보다 큰지 작은지 알려 줘요.' },
    { id: 'ten', title: '10초 멈추기', desc: '숫자가 숨은 뒤에도 속으로 세어서 정한 시간에 딱 맞춰 멈춰요.' },
    { id: 'ox', title: 'OX 퀴즈', desc: '문장을 읽고 맞으면 O, 틀리면 X를 골라요.' },
  ];

  /* ---------- 떠날 때 치울 것 ----------
   * 문서에 붙인 키 듣기, requestAnimationFrame 같은 것을 여기 모아 두고 leave()에서 한꺼번에 푼다. */
  let cleanups = [];
  function onCleanup(fn) { cleanups.push(fn); }
  function cleanup() {
    const list = cleanups;
    cleanups = [];
    list.forEach((fn) => { try { fn(); } catch (e) { /* 이미 치웠음 */ } });
  }
  /** 이 화면이 아직 떠 있는지. 늦게 도는 일(창이 닫힌 뒤, 되돌리기)이 떠난 화면을 다시 그리지 않게 한다. */
  function lifetime() {
    const life = { on: true };
    onCleanup(() => { life.on = false; });
    return life;
  }

  /* ---------- 마지막으로 쓴 손: 마우스·터치(pointer)인지 키보드(key)인지 ----------
   * 마우스나 터치로 누른 단추에는 초점을 남기지 않는다. 그래야 다음에 친 스페이스·Enter가
   * 방금 누른 단추를 또 누르지 않고 게임 단축키로 간다. 키보드로 다니는 사람의 초점은 그대로 지킨다. */
  let modality = 'pointer';
  function watchHands(root) {
    const onPointer = () => { modality = 'pointer'; CD.sound.unlock(); };
    const onKey = () => { modality = 'key'; CD.sound.unlock(); };
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey, true);
    const drop = (el) => setTimeout(() => { if (document.activeElement === el) el.blur(); }, 0);
    root.addEventListener('click', (e) => {
      const b = e.target instanceof Element ? e.target.closest('button') : null;
      if (b && modality === 'pointer') drop(b);
    });
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (modality === 'pointer' && t && (t.type === 'radio' || t.tagName === 'SELECT')) drop(t);
    });
    // 마우스로 창을 닫으면 창을 연 단추로 초점이 돌아온다. 그 초점도 내려놓는다.
    const dialogs = ['formDlg', 'confirmDlg'].map((id) => document.getElementById(id)).filter(Boolean);
    const onClose = () => {
      const a = document.activeElement;
      if (modality === 'pointer' && a && root.contains(a) && a.matches('button, input, select')) a.blur();
    };
    dialogs.forEach((d) => d.addEventListener('close', onClose));
    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey, true);
      dialogs.forEach((d) => d.removeEventListener('close', onClose));
    });
  }

  /* ---------- 키보드 단축키 ----------
   * 글을 쓰는 칸(입력칸·글상자·고르기 칸)에 초점이 있거나 창이 열려 있으면 듣지 않는다.
   * 키보드 초점을 받은 단추 위에서 친 Enter·스페이스는 그 단추가 스스로 눌리게 둔다. */
  const isSpace = (e) => e.key === ' ' || e.key === 'Spacebar';
  function listenKeys(handler) {
    const fn = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
      if (document.querySelector('dialog[open]')) return;
      const t = e.target instanceof Element ? e.target : null;
      if (t && t.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      if ((e.key === 'Enter' || isSpace(e)) && t && t.closest('button, a[href], summary, [role="button"]')) return;
      handler(e);
    };
    document.addEventListener('keydown', fn);
    onCleanup(() => document.removeEventListener('keydown', fn));
  }

  /* ---------- 초점 지키기 ---------- */
  /** 키보드로 다니면 to로 초점을 옮기고, 마우스로 다니면 from의 초점을 내려놓는다. */
  function moveFocus(to, from) {
    if (modality === 'key' && to && !to.disabled && !to.closest('[hidden]')) to.focus();
    else if (from && from.blur) from.blur();
  }
  /** 단추를 잠그기 전에, 그 단추에 초점이 있으면 fallback으로 옮긴다(잠긴 단추에 초점이 갇히지 않게). */
  function setOff(btn, off, fallback) {
    if (!btn) return;
    if (off && document.activeElement === btn) moveFocus(fallback, btn);
    btn.disabled = !!off;
  }
  /** 다시 그리기 전에 초점이 있던 자리(data-fk)를 기억한다. 화면 밖이면 null. */
  function focusKey(root) {
    const a = document.activeElement;
    if (!a || a === document.body || !root.contains(a)) return null;
    return a.getAttribute('data-fk') || '';
  }
  /** 다시 그린 뒤, 키보드로 다니는 사람에게 같은 자리(없으면 쪽 제목)의 초점을 돌려준다. */
  function giveFocusBack(root, key) {
    if (key == null || modality !== 'key') return;
    const el = key ? root.querySelector('[data-fk="' + CSS.escape(key) + '"]') : null;
    const target = el && !el.disabled && !el.closest('[hidden]') ? el : root.querySelector('h1');
    if (!target) return;
    if (target.tagName === 'H1') target.tabIndex = -1;
    target.focus();
  }

  /* ---------- 작은 부품 ---------- */
  function backBtn() {
    return ui.btn([CD.icon('left'), '게임 목록'], () => CD.go('games'), 'quiet', { data: { fk: 'back' } });
  }

  /**
   * 고르기 칸: seg면 한 줄 단추(.seg), 아니면 펼침 목록(<select>).
   * o: { name, label, options: [{ value, label }], value, onPick(value), seg }
   * 펼침 목록은 label로 감싸 글자 폭만큼만 차지하게 하고, 이름표는 화면 읽기 프로그램에만 준다.
   */
  function chooser(o) {
    if (o.seg) {
      return h('div', { class: 'seg', role: 'radiogroup', aria: { label: o.label } }, o.options.map((op) => h('label', null,
        h('input', {
          type: 'radio', name: o.name, value: String(op.value), checked: String(op.value) === String(o.value),
          data: { fk: o.name + '-' + op.value },
          on: { change: (e) => { if (e.target.checked) o.onPick(op.value); } },
        }),
        h('span', { text: op.label }))));
    }
    const sel = h('select', {
      name: o.name, data: { fk: o.name },
      on: { change: () => { const op = o.options.find((x) => String(x.value) === sel.value); if (op) o.onPick(op.value); } },
    }, o.options.map((op) => h('option', { value: String(op.value), text: op.label })));
    sel.value = String(o.value);
    return h('label', null, h('span', { class: 'sr-only', text: o.label }), sel);
  }

  /** 1/100초 단위 정수를 "10.23"처럼 */
  function secs(cs) {
    const s = String(Math.max(0, Math.round(cs))).padStart(3, '0');
    return s.slice(0, -2) + '.' + s.slice(-2);
  }
  /** 긴 글을 알림에 넣을 만큼만 자른다 */
  const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

  /* ---------- 게임 목록 ---------- */
  function renderList(root) {
    root.append(ui.page('게임', [],
      h('div', { class: 'section' },
        h('p', { class: 'help', text: '교실 TV에 띄우고 반 전체가 함께 해요. 크게 보기로 보면 더 잘 보여요.' })),
      h('ul', { class: 'game-list' }, GAMES.map((g) => h('li', null,
        h('a', { href: '#/games/' + g.id }, h('b', { text: g.title }), h('span', { text: g.desc })))))));
  }

  /* ---------- OX 문제 글 읽기 ----------
   * 한 줄에 한 문제: "O 문장" 또는 "X 문장", 뒤에 " // 설명"을 붙일 수 있다.
   * ○·o·x·× 같은 표시와 "O. 문장", "(X) 문장", "1. O 문장", 끝에 붙인 "문장 X"도 받아 준다. */
  const O_MARKS = 'OoＯｏ○◯〇';
  const X_MARKS = 'XxＸｘ×✕✖✗✘';
  const MARK = '[' + O_MARKS + X_MARKS + ']';
  const NUM = '(?:\\d{1,3}\\s*[.)]\\s*)?';
  const OX_HEAD = new RegExp('^' + NUM + '[(\\[]?\\s*(' + MARK + ')\\s*[)\\]]?(?:\\s*[.:：,]\\s*|\\s+)(.+)$', 'u');
  const OX_TAIL = new RegExp('^' + NUM + '(.*?\\S)\\s*(?:[(\\[]\\s*(' + MARK + ')\\s*[)\\]]|[:：=→\\-–—]\\s*(' + MARK + ')|\\s(' + MARK + '))\\.?$', 'u');

  /** 설명 떼기: 처음 나오는 //에서 자른다(https:// 같은 주소의 //는 건너뛴다). */
  function splitWhy(line) {
    let i = line.indexOf('//');
    while (i > 0 && line[i - 1] === ':') i = line.indexOf('//', i + 2);
    if (i < 0) return { body: line, why: '' };
    return { body: line.slice(0, i).trim(), why: line.slice(i + 2).trim() };
  }
  /** 한 줄을 { q, a, why }로. O나 X 표시가 없으면 null. */
  function parseOxLine(line) {
    const { body, why } = splitWhy(line);
    let mark = '';
    let q = '';
    let m = OX_HEAD.exec(body);
    if (m) { mark = m[1]; q = m[2]; } else {
      m = OX_TAIL.exec(body);
      if (m) { q = m[1]; mark = m[2] || m[3] || m[4]; }
    }
    q = q.replace(/\s+/g, ' ').trim();
    if (!mark || !q) return null;
    return { q, a: O_MARKS.includes(mark), why: why.replace(/\s+/g, ' ') };
  }
  /** "3, 7번째 줄", 많으면 "1, 2, … 8번째 줄 등 12줄" */
  function lineNumbers(nums) {
    const shown = nums.slice(0, 8).join(', ');
    return nums.length > 8 ? shown + '번째 줄 등 ' + nums.length + '줄' : shown + '번째 줄';
  }
  /** 글상자 글 → 문제 목록. 고칠 곳이 있으면 입력 창에 띄울 안내 문장을 돌려준다. */
  function parseOx(text) {
    const items = [];
    const bad = [];
    const long = [];
    String(text || '').split(/\r?\n/).forEach((raw, i) => {
      const line = raw.trim();
      if (!line) return;
      const it = parseOxLine(line);
      if (!it) bad.push(i + 1);
      else if (it.q.length > 120 || it.why.length > 160) long.push(i + 1);
      else items.push(it);
    });
    if (bad.length) return lineNumbers(bad) + '에 O나 X 표시가 없어요. 줄 맨 앞에 O 또는 X를 쓰고 한 칸 띄어 주세요.';
    if (long.length) return lineNumbers(long) + '이 너무 길어요. 문제는 120자, 설명은 160자까지 쓸 수 있어요.';
    if (!items.length) return '문제를 한 줄 이상 써 주세요.';
    if (items.length > 200) return '한 묶음에 문제를 200개까지 넣을 수 있어요. 지금은 ' + items.length + '개예요.';
    return items;
  }
  /** 고치기 창에 다시 채울 글 */
  function oxText(items) {
    return items.map((it) => (it.a ? 'O ' : 'X ') + it.q + (it.why ? ' // ' + it.why : '')).join('\n');
  }

  /** 초성 퀴즈 낱말 목록 확인 */
  function parseWords(words) {
    const list = (words || []).map((w) => w.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const long = list.find((w) => w.length > 20);
    if (long) return '‘' + clip(long, 12) + '’ 낱말이 너무 길어요. 낱말은 20자까지 쓸 수 있어요.';
    if (!list.length) return '낱말을 한 줄 이상 써 주세요.';
    if (list.length > 200) return '한 묶음에 낱말을 200개까지 넣을 수 있어요. 지금은 ' + list.length + '개예요.';
    return list;
  }
  const firstChar = (word) => Array.from(word)[0] || '';

  /* ---------- 초성 퀴즈와 OX 퀴즈: 같은 틀에 보여 주는 법만 다르다 ---------- */
  const QUIZ = {
    chosung: {
      title: '초성 퀴즈',
      noun: '낱말',
      pickLabel: '낱말 묶음 고르기',
      keysHelp: '키보드: Enter나 오른쪽 화살표는 다음 문제, 왼쪽 화살표는 이전 문제, 스페이스 바는 정답 보기예요.',
      noSetTitle: '낱말 묶음이 없어요',
      noSetText: '3~4학년 수준의 준비된 낱말 묶음을 고르거나 직접 만들어 주세요.',
      bankTitle: '준비된 낱말 묶음',
      addLabel: '낱말 묶음 추가',
      noItemTitle: '이 묶음에 낱말이 없어요',
      noItemText: '낱말을 넣으면 바로 시작할 수 있어요.',
      fillLabel: '낱말 넣기',
      addTitle: '낱말 묶음 추가',
      editTitle: '낱말 묶음 고치기',
      titlePh: '예: 과일',
      revealLabel: '정답 보기',
      nextLabel: '다음 문제',
      hint: true,
      items: (s) => s.words,
      field: (s) => ({
        name: 'items', label: '낱말 (한 줄에 하나씩)', type: 'lines', value: s ? s.words : [], required: true, rows: 8,
        placeholder: '사과\n바나나\n포도', hint: '낱말은 20자까지, 한 묶음에 200개까지 넣을 수 있어요.',
      }),
      parse: parseWords,
      create: (title, words) => ({ id: CD.uid(), title, words }),
      assign: (s, words) => { s.words = words; },
      build(els) {
        els.word = h('p', { class: 'big-word' });
        els.answer = h('p', { class: 'big-sub' });
        return [els.word, els.answer];
      },
      show(els, word, step) {
        const c = CD.ko.chosung(word);
        els.word.textContent = c;
        els.word.classList.toggle('is-long', c.length > 6 && c.length <= 11);
        els.word.classList.toggle('is-xlong', c.length > 11);
        els.answer.textContent = step >= 2 ? '정답: ' + word : step === 1 ? '첫 글자: ' + firstChar(word) : '';
      },
      say: (word) => CD.ko.chosung(word),
      sayHint: (word) => '첫 글자는 ' + firstChar(word),
      sayAnswer: (word) => '정답은 ' + word,
    },
    ox: {
      title: 'OX 퀴즈',
      noun: '문제',
      pickLabel: 'OX 문제 묶음 고르기',
      keysHelp: '키보드: Enter나 오른쪽 화살표는 다음, 왼쪽 화살표는 이전, 스페이스 바는 정답 공개예요.',
      noSetTitle: 'OX 문제 묶음이 없어요',
      noSetText: '3~4학년 수준의 준비된 문제 묶음을 고르거나 직접 만들어 주세요.',
      bankTitle: '준비된 OX 문제 묶음',
      addLabel: '문제 묶음 추가',
      noItemTitle: '이 묶음에 문제가 없어요',
      noItemText: '문제를 넣으면 바로 시작할 수 있어요.',
      fillLabel: '문제 넣기',
      addTitle: 'OX 문제 묶음 추가',
      editTitle: 'OX 문제 묶음 고치기',
      titlePh: '예: 생활 상식',
      revealLabel: '정답 공개',
      nextLabel: '다음',
      hint: false,
      items: (s) => s.items,
      field: (s) => ({
        name: 'items', label: '문제 (한 줄에 하나씩)', type: 'textarea', value: s ? oxText(s.items) : '', required: true, rows: 9,
        placeholder: 'O 물은 0도에서 얼기 시작한다.\nX 거미는 곤충이다. // 거미는 다리가 8개예요.',
        hint: '줄 맨 앞에 O나 X를 쓰고 한 칸 띄어 문장을 써요. 설명을 붙이려면 문장 뒤에 //를 쓰고 이어서 써요.',
      }),
      parse: parseOx,
      create: (title, items) => ({ id: CD.uid(), title, items }),
      assign: (s, items) => { s.items = items; },
      build(els) {
        els.q = h('p', { class: 'big-q' });
        els.mark = h('div', { class: 'ox-mark', aria: { hidden: 'true' } });
        els.verdict = h('p', { class: 'big-sub' });
        els.why = h('p', { class: 'big-sub' });
        return [els.q, els.mark, els.verdict, els.why];
      },
      show(els, it, step) {
        const open = step >= 2;
        els.q.textContent = it.q;
        if (open) els.mark.replaceChildren(CD.icon(it.a ? 'o' : 'x')); else els.mark.replaceChildren();
        els.verdict.textContent = open ? (it.a ? '맞아요 (O)' : '아니에요 (X)') : '';
        els.why.textContent = open ? it.why : '';
      },
      say: (it) => it.q,
      sayAnswer: (it) => (it.a ? '맞아요, O예요.' : '아니에요, X예요.') + (it.why ? ' ' + it.why : ''),
    },
  };
  // 고른 묶음은 이 창을 닫을 때까지 기억한다(다른 메뉴에 다녀와도 그대로).
  const quizMem = { chosung: null, ox: null };

  function runQuiz(root, kind) {
    const K = QUIZ[kind];
    const life = lifetime();
    const els = {};
    let set = null;
    let order = [];
    let idx = 0;
    let step = 0; // 0 문제만, 1 첫 글자 힌트, 2 정답
    let ready = false;
    const sets = () => store.state.games[kind];

    /* 쪽 전체를 다시 그린다: 처음, 그리고 묶음을 만들거나 고치거나 지운 뒤 */
    function paint() {
      const key = focusKey(root);
      const list = sets();
      set = list.find((s) => s.id === quizMem[kind]) || list[0] || null;
      quizMem[kind] = set ? set.id : null;
      const actions = [backBtn(), ui.btn([CD.icon('plus'), '묶음 추가'], () => edit(null), 'quiet teacher-only', { data: { fk: 'add' } }),
        ui.btn('준비된 묶음', pickBank, 'quiet teacher-only', { data: { fk: 'bank' } })];
      els.edit = ui.btn('이 묶음 고치기', () => { if (set) edit(set); }, 'quiet teacher-only', { data: { fk: 'edit' } });
      els.shuffle = ui.btn('섞기', shuffle, 'quiet teacher-only', { data: { fk: 'shuffle' } });
      if (set) actions.push(els.edit, els.shuffle);
      els.stage = h('div', { class: 'game-stage' });
      const tools = set ? h('div', { class: 'tool-row' },
        chooser({ name: 'quiz-set', label: K.pickLabel, seg: list.length <= 4, value: set.id, options: list.map((s) => ({ value: s.id, label: s.title })), onPick }),
        h('p', { class: 'help small teacher-only', text: K.keysHelp })) : null;
      root.replaceChildren(ui.page(K.title, actions, tools, els.stage));
      begin();
      giveFocusBack(root, key);
    }

    function onPick(id) {
      const next = sets().find((s) => s.id === id);
      if (!next || next === set) return;
      set = next;
      quizMem[kind] = id;
      begin();
    }

    /* 고른 묶음을 처음부터 */
    function begin() {
      order = set ? K.items(set).slice() : [];
      idx = 0;
      step = 0;
      drawStage();
    }

    function drawStage() {
      const items = set ? K.items(set) : [];
      ready = items.length > 0;
      els.shuffle.disabled = items.length < 2;
      if (!set) {
        els.stage.replaceChildren(ui.empty(K.noSetTitle, K.noSetText, h('div', { class: 'row-btns' },
          ui.btn('준비된 묶음 고르기', pickBank, 'primary', { data: { fk: 'empty-bank' } }),
          ui.btn('직접 만들기', () => edit(null), '', { data: { fk: 'empty-add' } }))));
        return;
      }
      if (!items.length) {
        els.stage.replaceChildren(ui.empty(K.noItemTitle, K.noItemText, ui.btn(K.fillLabel, () => edit(set), 'primary', { data: { fk: 'empty-fill' } })));
        return;
      }
      els.count = h('p', { class: 'big-sub num' });
      els.prev = ui.btn([CD.icon('left'), '이전'], prev, 'big', { data: { fk: 'prev' } });
      els.hint = K.hint ? ui.btn('첫 글자 힌트', hint, 'big', { data: { fk: 'hint' } }) : null;
      els.reveal = ui.btn(K.revealLabel, reveal, 'big', { data: { fk: 'reveal' } });
      els.next = ui.btn([K.nextLabel, CD.icon('right')], next, 'primary big', { data: { fk: 'next' } });
      els.play = h('div', null, els.count, K.build(els), h('div', { class: 'play-bar' }, els.prev, els.hint, els.reveal, els.next));
      els.doneText = h('p', { class: 'big-sub' });
      els.again = ui.btn('처음부터', restart, 'primary big', { data: { fk: 'again' } });
      els.again2 = ui.btn('섞어서 다시', shuffle, 'big', { data: { fk: 'again-shuffle' } });
      els.again2.disabled = items.length < 2;
      els.finish = h('div', { hidden: true },
        h('p', { class: 'updown-hint' }, h('span', { text: '다 풀었어요' }), ui.doneStamp('끝')),
        els.doneText,
        h('div', { class: 'play-bar' }, ui.btn([CD.icon('left'), '이전'], prev, 'big', { data: { fk: 'finish-prev' } }), els.again, els.again2));
      els.stage.replaceChildren(h('div', { class: 'stage-card' }, els.play, els.finish));
      update(true);
    }

    /* 지금 문제와 단추 상태만 고친다. 단추는 그대로 두어 키보드 초점이 흩어지지 않게. */
    function update(say) {
      if (!ready) return;
      const total = order.length;
      const finished = idx >= total;
      const a = document.activeElement;
      const fromPlay = a && els.play.contains(a);
      const fromFinish = a && els.finish.contains(a);
      els.play.hidden = finished;
      els.finish.hidden = !finished;
      if (finished) {
        els.doneText.textContent = '모두 ' + total + '문제였어요.';
        if (fromPlay) moveFocus(els.again, a);
        if (say) ui.announce('다 풀었어요. 모두 ' + total + '문제였어요.');
        return;
      }
      if (fromFinish) moveFocus(els.next, a);
      const item = order[idx];
      els.count.textContent = (idx + 1) + ' / ' + total;
      K.show(els, item, step);
      setOff(els.prev, idx === 0, els.next);
      if (els.hint) setOff(els.hint, step > 0, els.next);
      setOff(els.reveal, step >= 2, els.next);
      if (say) ui.announce(total + '문제 중 ' + (idx + 1) + '번째. ' + K.say(item));
    }

    function next() {
      if (!ready || idx >= order.length) return;
      idx += 1;
      step = 0;
      if (idx >= order.length) CD.sound.stamp();
      update(true);
    }
    function prev() {
      if (!ready || idx === 0) return;
      idx -= 1;
      step = 0;
      update(true);
    }
    function hint() {
      if (!ready || !K.hint || idx >= order.length || step > 0) return;
      step = 1;
      CD.sound.tick();
      update(false);
      ui.announce(K.sayHint(order[idx]));
    }
    function reveal() {
      if (!ready || idx >= order.length || step >= 2) return;
      step = 2;
      CD.sound.chime();
      update(false);
      ui.announce(K.sayAnswer(order[idx]));
    }
    function restart() {
      if (!ready) return;
      idx = 0;
      step = 0;
      update(true);
    }
    function shuffle() {
      if (!set || K.items(set).length < 2) return;
      order = CD.rand.shuffle(K.items(set));
      idx = 0;
      step = 0;
      update(true);
      ui.toast('순서를 섞었어요. 첫 문제부터 시작해요.');
    }

    /* 준비된 묶음(js/data/quiz-bank.js)에서 골라 내 묶음으로 넣기. 같은 이름의 묶음이 있으면 건너뛴다 */
    function pickBank() {
      const bank = (CD.quizBank && CD.quizBank[kind]) || [];
      if (!bank.length) return;
      const have = new Set(sets().map((s) => s.title));
      ui.form({
        title: K.bankTitle,
        submit: '넣기',
        fields: [{
          name: 'pick', label: '넣을 묶음 (초등 3~4학년 수준)', type: 'checks', value: [], wideItems: true, wide: true,
          options: bank.map((b, i) => ({ value: String(i), label: b.title + ' · ' + K.items(b).length + '개' + (have.has(b.title) ? ' · 넣음' : '') })),
          hint: '넣은 묶음은 ‘이 묶음 고치기’로 마음대로 고칠 수 있어요.',
        }],
        onSubmit(v) {
          const picked = v.pick.map(Number).filter((i) => bank[i]);
          if (!picked.length) return '넣을 묶음을 하나 이상 골라 주세요.';
          const fresh = picked.filter((i) => !have.has(bank[i].title));
          if (!fresh.length) return '고른 묶음은 이미 들어 있어요.';
          const added = fresh.map((i) => K.create(bank[i].title, CD.clone(K.items(bank[i]))));
          sets().push(...added);
          quizMem[kind] = added[0].id;
          store.save();
          setTimeout(() => { if (life.on) paint(); }, 0);
          const skipped = picked.length - fresh.length;
          ui.toast((added.length === 1 ? '‘' + added[0].title + '’ 묶음을' : added.length + '개 묶음을') + ' 넣었어요.' + (skipped ? ' 이미 있던 ' + skipped + '개는 건너뛰었어요.' : ''));
          return true;
        },
      });
    }

    /* 묶음 만들기·고치기 */
    function edit(target) {
      const fresh = !target;
      ui.form({
        title: fresh ? K.addTitle : K.editTitle,
        submit: fresh ? '만들기' : '저장',
        fields: [
          { name: 'title', label: '묶음 이름', type: 'text', value: target ? target.title : '', required: true, maxlength: 30, placeholder: K.titlePh },
          K.field(target),
        ],
        onSubmit(v) {
          const title = v.title.replace(/\s+/g, ' ').trim().slice(0, 30);
          const parsed = K.parse(v.items);
          if (typeof parsed === 'string') return parsed;
          if (target) {
            target.title = title;
            K.assign(target, parsed);
            quizMem[kind] = target.id;
          } else {
            const made = K.create(title, parsed);
            sets().push(made);
            quizMem[kind] = made.id;
          }
          store.save();
          // 창이 닫히고 초점이 제자리로 돌아온 다음에 다시 그린다
          setTimeout(() => { if (life.on) paint(); }, 0);
          ui.toast(fresh ? '‘' + title + '’ 묶음을 만들었어요.' : '‘' + title + '’ 묶음을 고쳤어요.');
          return true;
        },
        extra: target ? [{ label: '묶음 지우기', danger: true, fn: () => removeSet(target) }] : [],
      });
    }

    async function removeSet(target) {
      const n = K.items(target).length;
      const ok = await ui.confirm({
        title: '묶음 지우기',
        body: '‘' + target.title + '’ 묶음을 지울까요? 안에 든 ' + K.noun + ' ' + n + '개도 함께 지워져요.',
        ok: '지우기',
        danger: true,
      });
      if (!ok) return;
      const list = sets();
      const at = list.indexOf(target);
      if (at < 0) return;
      list.splice(at, 1);
      if (quizMem[kind] === target.id) quizMem[kind] = (list[at] || list[at - 1] || {}).id || null;
      store.save();
      if (life.on) paint();
      ui.toast('‘' + target.title + '’ 묶음을 지웠어요.', {
        action: '되돌리기',
        fn: () => {
          const now = sets();
          if (now.includes(target)) return;
          now.splice(Math.min(at, now.length), 0, target);
          quizMem[kind] = target.id;
          store.save();
          if (life.on) paint();
        },
      });
    }

    listenKeys((e) => {
      if (!ready) return;
      const k = e.key;
      if (k === 'ArrowRight' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); if (!e.repeat) next(); }
      else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); if (!e.repeat) prev(); }
      else if (isSpace(e)) { e.preventDefault(); if (!e.repeat) reveal(); }
    });

    paint();
  }

  /* ---------- 업다운 숫자 맞히기 ---------- */
  /** 저장된 범위가 이상하면(예전 백업 등) 1~100으로. 자판에 빼기 단추가 없어서 0부터만 쓴다. */
  function goodRange(r) {
    const min = Number(r && r.min);
    const max = Number(r && r.max);
    if (Number.isInteger(min) && Number.isInteger(max) && min >= 0 && max > min && max - min <= 10000 && max <= 1000000) return { min, max };
    return { min: 1, max: 100 };
  }

  function runUpdown(root) {
    const life = lifetime();
    const els = {};
    let range = goodRange(store.state.games.updown);
    let secret = 0;
    let lo = 0;
    let hi = 0;
    let typed = '';
    let guesses = [];
    let done = false;
    let doneAt = 0;

    function paint() {
      const digit = (d) => ui.btn(String(d), () => press(String(d)), '', { data: { fk: 'key-' + d } });
      els.one = digit(1);
      const keys = [els.one];
      for (let d = 2; d <= 9; d++) keys.push(digit(d));
      els.back = ui.btn('지우기', back, '', { data: { fk: 'key-back' } });
      keys.push(els.back, digit(0), ui.btn('확인', submit, 'primary', { data: { fk: 'key-ok' } }));
      els.pad = h('div', { class: 'keypad', role: 'group', aria: { label: '숫자 단추' } }, keys);
      els.range = h('p', { class: 'big-sub' });
      els.num = h('p', { class: 'big-word num' });
      els.hint = h('p', { class: 'updown-hint' });
      els.tries = h('p', { class: 'big-sub' });
      els.againBtn = ui.btn('다시 하기', again, 'primary big', { data: { fk: 'again' } });
      els.againBar = h('div', { class: 'play-bar', hidden: true }, els.againBtn);
      els.log = h('div', { class: 'guess-log' });
      root.replaceChildren(ui.page('업다운 숫자 맞히기', [
        backBtn(),
        ui.btn('범위 바꾸기', editRange, 'quiet teacher-only', { data: { fk: 'range' } }),
        ui.btn('새로 시작', restart, 'quiet', { data: { fk: 'restart' } }),
      ],
      h('div', { class: 'tool-row teacher-only' }, h('p', { class: 'help small', text: '키보드 숫자 키로 넣고 Enter로 확인해요. 잘못 넣으면 Backspace로 지워요.' })),
      h('div', { class: 'stage-card' }, els.range, els.num, els.hint, els.tries, els.pad, els.againBar, els.log)));
      newGame(false);
    }

    function newGame(say) {
      range = goodRange(store.state.games.updown);
      secret = range.min + CD.rand.int(range.max - range.min + 1);
      lo = range.min;
      hi = range.max;
      typed = '';
      guesses = [];
      done = false;
      update();
      if (say) ui.announce('새 숫자를 숨겼어요. ' + range.min + '부터 ' + range.max + '까지 숫자 중 하나예요.');
    }

    function update() {
      const a = document.activeElement;
      const inPad = a && els.pad.contains(a);
      const inAgain = a && els.againBar.contains(a);
      const last = guesses.length ? guesses[guesses.length - 1] : null;
      els.range.textContent = done ? '숨은 숫자는 ' + CD.ko.josa(String(secret), '이었어요/였어요')
        : guesses.length ? '지금 범위: ' + lo + ' ~ ' + hi
          : range.min + '부터 ' + range.max + '까지 숫자 중 하나예요';
      // 누르는 중인 숫자, 없으면 방금 부른 숫자를 흐리게, 그것도 없으면 물음표
      els.num.textContent = done ? String(secret) : typed || (last != null ? String(last) : '?');
      els.num.classList.toggle('muted', !done && !typed);
      if (done) {
        els.hint.replaceChildren(h('span', { text: '정답이에요!' }), ui.doneStamp(guesses.length + '번'));
      } else if (last != null) {
        const up = secret > last;
        els.hint.replaceChildren(CD.icon(up ? 'up-arrow' : 'down-arrow'), h('span', { text: up ? '더 커요' : '더 작아요' }));
      } else {
        els.hint.replaceChildren();
      }
      els.tries.textContent = done ? guesses.length + '번 만에 맞혔어요' : (guesses.length + 1) + '번째 도전';
      els.log.replaceChildren(...guesses.filter((g) => g !== secret).map((g) => {
        const up = secret > g;
        return h('span', { class: up ? 'up' : 'down' }, CD.icon(up ? 'up-arrow' : 'down-arrow'), String(g),
          h('span', { class: 'sr-only', text: up ? '보다 커요' : '보다 작아요' }));
      }));
      els.pad.hidden = done;
      els.againBar.hidden = !done;
      if (done && inPad) moveFocus(els.againBtn, a);
      if (!done && inAgain) moveFocus(els.one, a);
    }

    function press(d) {
      if (done) return;
      if (typed === '0') typed = '';
      if (typed.length >= String(range.max).length) return;
      typed += d;
      update();
    }
    function back() {
      if (done || !typed) return;
      typed = typed.slice(0, -1);
      update();
    }
    function submit() {
      if (done) return;
      if (!typed) { ui.toast('숫자를 먼저 눌러 주세요.'); return; }
      const g = Number(typed);
      typed = '';
      if (g < range.min || g > range.max) {
        update();
        ui.toast(range.min + '부터 ' + range.max + '까지 숫자만 넣을 수 있어요.');
        return;
      }
      if (g < lo || g > hi) {
        update();
        ui.toast('지금 범위는 ' + lo + ' ~ ' + CD.ko.josa(String(hi), '이에요/예요') + '. 그 안에서 골라 봐요.');
        return;
      }
      guesses.push(g);
      if (g === secret) {
        done = true;
        doneAt = performance.now();
        update();
        CD.sound.chime();
        ui.announce('정답이에요! ' + secret + ', ' + guesses.length + '번 만에 맞혔어요.');
        return;
      }
      if (secret > g) lo = g + 1; else hi = g - 1;
      update();
      CD.sound.tick();
      ui.announce(g + '보다 ' + (secret > g ? '더 커요.' : '더 작아요.') + ' 지금 범위는 ' + lo + '부터 ' + hi + '까지예요.');
    }
    function again() {
      // 맞힌 바로 뒤에 Enter를 한 번 더 쳐서 넘어가 버리지 않게 잠깐 기다린다
      if (!done || performance.now() - doneAt < 700) return;
      newGame(true);
    }
    async function restart() {
      if (guesses.length && !done) {
        const ok = await ui.confirm({ title: '새로 시작', body: '지금 게임을 그만두고 새 숫자로 시작할까요?', ok: '새로 시작' });
        if (!ok || !life.on) return;
      }
      newGame(false);
      ui.toast('새 숫자를 숨겼어요.');
    }

    function editRange() {
      const cur = goodRange(store.state.games.updown);
      ui.form({
        title: '숫자 범위 바꾸기',
        submit: '바꾸고 새로 시작',
        fields: [
          { name: 'min', label: '가장 작은 수', type: 'number', value: cur.min, required: true, min: 0, step: 1 },
          { name: 'max', label: '가장 큰 수', type: 'number', value: cur.max, required: true, min: 1, step: 1 },
        ],
        onSubmit(v) {
          const min = v.min;
          const max = v.max;
          if (!Number.isInteger(min) || !Number.isInteger(max)) return '소수점 없는 수로 써 주세요.';
          if (min < 0) return '가장 작은 수는 0부터 쓸 수 있어요.';
          if (min >= max) return '가장 큰 수가 가장 작은 수보다 커야 해요.';
          if (max - min > 10000) return '두 수의 차이는 10000까지만 돼요.';
          if (max > 1000000) return '가장 큰 수는 1000000까지 쓸 수 있어요.';
          store.state.games.updown = { min, max };
          store.save();
          if (life.on) newGame(false);
          ui.toast(min + '부터 ' + max + '까지로 바꾸고 새 숫자를 숨겼어요.');
          return true;
        },
      });
    }

    listenKeys((e) => {
      const k = e.key;
      if (/^[0-9]$/.test(k)) { e.preventDefault(); if (!e.repeat) press(k); }
      else if (k === 'Backspace') { e.preventDefault(); back(); }
      else if (k === 'Enter') { e.preventDefault(); if (!e.repeat) { if (done) again(); else submit(); } }
    });

    paint();
  }

  /* ---------- 10초 멈추기 ---------- */
  const TEN_TARGETS = [5, 10, 15, 20];
  const TEN_SHOW_MS = 3000; // 처음 3초만 숫자를 보여 준다
  const TEN_OVER_S = 5;     // 목표보다 5초 넘게 지나면 숫자를 빨갛게 다시 보여 준다
  const tenLog = [];        // 이번에 연 동안의 기록 { target, name, cs, diff, at }. 저장하지 않는다.
  const tenMem = { who: '' }; // 고른 학생 id

  /** diff는 1/100초 단위(늦으면 +) */
  function diffWords(diff) {
    if (diff === 0) return '딱 맞았어요!';
    return secs(Math.abs(diff)) + (diff > 0 ? '초 늦었어요' : '초 빨랐어요');
  }
  const signed = (diff) => (diff > 0 ? '+' : diff < 0 ? '−' : '') + secs(Math.abs(diff));

  function runTen(root) {
    const life = lifetime();
    const els = {};
    const saved = Number(store.state.games.ten.target);
    let target = TEN_TARGETS.includes(saved) ? saved : 10;
    let phase = 'idle'; // idle 기다림 · run 재는 중 · done 멈춤
    let startAt = 0;
    let stopAt = -1e9;
    let keyAt = -1e9;
    let raf = 0;
    let hidden = false;
    let over = false;
    const students = store.students();
    if (!students.some((s) => s.id === tenMem.who)) tenMem.who = '';
    const whoName = () => { const s = students.find((x) => x.id === tenMem.who); return s ? s.name : ''; };
    onCleanup(() => { cancelAnimationFrame(raf); raf = 0; });

    function paint() {
      els.clear = ui.btn('기록 지우기', clearRecords, 'quiet teacher-only', { data: { fk: 'clear' } });
      els.tools = h('div', { class: 'tool-row' },
        chooser({ name: 'ten-target', label: '목표 시간', seg: true, value: target, options: TEN_TARGETS.map((t) => ({ value: t, label: t + '초' })), onPick: setTarget }),
        students.length ? chooser({
          name: 'ten-who', label: '누가 하나요', seg: false, value: tenMem.who,
          options: [{ value: '', label: '이름 없이' }].concat(students.map((s) => ({ value: s.id, label: s.no + '번 ' + s.name }))),
          onPick: (id) => { tenMem.who = id; if (phase !== 'run') showIdle(); },
        }) : null,
        h('p', { class: 'help small teacher-only', text: '스페이스 바를 눌러도 시작하고 멈출 수 있어요.' }));
      els.lead = h('p', { class: 'big-sub' });
      els.digits = h('p', { class: 'timer-digits num', text: '0.00' });
      els.result = h('p', { class: 'updown-hint' });
      els.main = ui.btn('시작', (e) => {
        // 아래 keydown에서 이미 처리한 누름이 click으로 한 번 더 오면 버린다
        if (e.detail === 0 && performance.now() - keyAt < 500) return;
        toggle();
      }, 'primary big', { data: { fk: 'main' } });
      // 초점 받은 단추에서도 키를 누르는 순간에 잰다(손을 뗄 때 눌리는 기본 동작을 쓰면 시간이 밀린다)
      els.main.addEventListener('keydown', (e) => {
        if (!isSpace(e) && e.key !== 'Enter') return;
        e.preventDefault();
        if (e.repeat) return;
        keyAt = performance.now();
        toggle();
      });
      els.recTitle = h('h2', { class: 'big-sub' });
      els.recList = h('ol', { class: 'record-list' });
      els.records = h('div', { class: 'section' }, els.recTitle, els.recList);
      root.replaceChildren(ui.page('10초 멈추기', [backBtn(), els.clear],
        els.tools,
        h('div', { class: 'stage-card section' }, els.lead, els.digits, els.result, h('div', { class: 'play-bar' }, els.main)),
        els.records));
      showIdle();
      drawRecords();
    }

    function setTarget(t) {
      if (phase === 'run') return;
      target = t;
      store.state.games.ten.target = t;
      store.save();
      showIdle();
      drawRecords();
    }
    function lock(on) {
      els.tools.querySelectorAll('input, select').forEach((el) => { el.disabled = on; });
    }

    function showIdle() {
      phase = 'idle';
      const name = whoName();
      els.digits.className = 'timer-digits num';
      els.digits.textContent = '0.00';
      els.result.replaceChildren();
      els.lead.textContent = (name ? name + ' 차례예요. ' : '') + target + '초가 됐다고 생각하면 멈춰요.';
      els.main.textContent = '시작';
      lock(false);
    }

    function toggle() {
      if (phase === 'run') stop();
      else if (performance.now() - stopAt > 600) begin(); // 멈추자마자 다시 눌러 기록이 지나가 버리지 않게
    }

    function begin() {
      phase = 'run';
      hidden = false;
      over = false;
      startAt = performance.now();
      els.digits.className = 'timer-digits num';
      els.digits.textContent = '0.00';
      els.result.replaceChildren();
      els.lead.textContent = '숫자는 3초 뒤에 숨어요';
      els.main.textContent = '멈춤';
      lock(true);
      CD.sound.tick();
      ui.announce('시작! ' + target + '초가 됐다고 생각하면 멈춰요.');
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    }

    function frame() {
      if (phase !== 'run' || !life.on) return;
      const ms = performance.now() - startAt;
      if (!hidden && ms >= TEN_SHOW_MS) {
        hidden = true;
        els.digits.classList.add('is-hidden');
        els.lead.textContent = '속으로 세어 봐요';
      }
      if (hidden && !over && ms >= (target + TEN_OVER_S) * 1000) {
        over = true;
        els.digits.classList.remove('is-hidden');
        els.digits.classList.add('is-over');
        els.lead.textContent = target + '초가 훨씬 지났어요';
      }
      if (!hidden || over) els.digits.textContent = secs(Math.floor(ms / 10));
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      const ms = performance.now() - startAt;
      cancelAnimationFrame(raf);
      raf = 0;
      phase = 'done';
      stopAt = performance.now();
      const cs = Math.round(ms / 10);
      const diff = cs - target * 100; // 1/100초 단위. 0이면 0.005초 안쪽으로 맞힌 것
      const name = whoName();
      els.digits.className = 'timer-digits num';
      els.digits.textContent = secs(cs);
      els.result.replaceChildren(h('span', { text: diffWords(diff) }));
      if (diff === 0) els.result.append(ui.doneStamp('성공'));
      els.lead.textContent = (name ? name + ' · ' : '') + '목표 ' + target + '초';
      els.main.textContent = '다시 하기';
      lock(false);
      tenLog.push({ target, name, cs, diff, at: Date.now() });
      drawRecords();
      if (diff === 0) CD.sound.chime(); else CD.sound.tick();
      ui.announce(secs(cs) + '초. ' + diffWords(diff));
    }

    /* 지금 목표 시간의 기록만, 목표에 가까운 순서로 */
    function drawRecords() {
      const list = tenLog.filter((r) => r.target === target)
        .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff) || a.at - b.at);
      setOff(els.clear, !list.length, els.main);
      els.records.hidden = !list.length;
      els.recTitle.textContent = target + '초 기록';
      let rank = 0;
      els.recList.replaceChildren(...list.map((r, i) => {
        if (i === 0 || Math.abs(r.diff) !== Math.abs(list[i - 1].diff)) rank = i + 1; // 같은 차이는 같은 등수
        return h('li', null,
          h('span', { class: 'num', text: String(rank) }),
          h('span', { class: r.name ? null : 'muted', text: r.name || '이름 없이' }),
          h('span', { class: 'd', text: signed(r.diff) }),
          h('span', { class: 'num', text: secs(r.cs) + '초' }));
      }));
    }

    async function clearRecords() {
      const t = target;
      const n = tenLog.filter((r) => r.target === t).length;
      if (!n) return;
      const ok = await ui.confirm({ title: '기록 지우기', body: t + '초 기록 ' + n + '개를 지울까요? 지운 기록은 되살릴 수 없어요.', ok: '지우기', danger: true });
      if (!ok) return;
      for (let i = tenLog.length - 1; i >= 0; i--) if (tenLog[i].target === t) tenLog.splice(i, 1);
      if (life.on) drawRecords();
      ui.toast(t + '초 기록을 지웠어요.');
    }

    listenKeys((e) => {
      if (!isSpace(e)) return;
      e.preventDefault();
      if (!e.repeat) toggle();
    });

    paint();
  }

  /* ---------- 등록 ---------- */
  CD.modules.register({
    id: 'games',
    title: '게임',
    group: 'play',
    order: 300,
    render(root, ctx) {
      cleanup();
      watchHands(root);
      const sub = ctx && ctx.params ? ctx.params[0] : '';
      if (sub === 'chosung' || sub === 'ox') runQuiz(root, sub);
      else if (sub === 'updown') runUpdown(root);
      else if (sub === 'ten') runTen(root);
      else renderList(root);
    },
    leave() {
      cleanup();
    },
  });
})(window.CD = window.CD || {});
