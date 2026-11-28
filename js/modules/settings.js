/*
 * 설정 — 대시보드 이름, 쓰는 기능 켜고 끄기, 소리, 백업과 복원, 새 학년도 시작
 */
(function (CD) {
  'use strict';

  const h = CD.h;
  const D = CD.date;
  const store = CD.store;

  const FEATURE_INFO = {
    attendance: '날마다 결석·지각·조퇴·결과, 달별로 모아 보기',
    notes: '학생마다 날짜·영역별로 쌓는 관찰 기록',
    grades: '수행평가 3단계와 단원평가 점수 기록',
    timetable: '요일과 교시로 짠 기초시간표',
    notice: '날마다 쓰는 알림장',
    homework: '과제를 낸 학생에게 도장',
    forms: '안내장·신청서 회수 확인',
    reading: '날마다 아침독서 확인',
    roles: '역할을 맡은 학생과 날마다 확인',
    missions: '반 전체 미션 성공 확인',
    students: '모든 체크가 함께 쓰는 명단',
    budget: '받은 돈과 쓴 돈 장부',
    events: '학교·학급 행사와 D-day',
    links: '자주 여는 학습 사이트',
    games: '초성 퀴즈, 업다운, 10초 멈추기, OX 퀴즈',
    pick: '돌림판, 순서 정하기, 모둠 나누기',
    timer: '활동 시간 타이머와 스톱워치',
  };

  function ago(ts) {
    if (!ts) return '아직 한 번도 저장하지 않았어요';
    const days = Math.floor((Date.now() - ts) / 86400000);
    return '마지막 백업: ' + (days <= 0 ? '오늘' : days + '일 전') + ' (' + D.longDate(D.iso(new Date(ts))) + ')';
  }

  /** 방금·n분 전·오늘 몇 시·날짜 */
  function when(ts) {
    if (!ts) return '';
    const min = Math.floor((Date.now() - ts) / 60000);
    if (min < 1) return '방금';
    if (min < 60) return min + '분 전';
    const t = new Date(ts);
    if (D.iso(t) === D.iso()) return '오늘 ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
    return D.longDate(D.iso(t));
  }

  /** 자동 백업 파일 (크롬·엣지·웨일) */
  function autoBackup() {
    const B = CD.backupFile;
    const st = B ? B.status() : { supported: false };
    const box = h('div', { class: 'auto-backup' }, h('h3', { text: '자동 백업 파일' }));
    if (!st.supported) {
      box.append(h('p', { class: 'help small', text: '이 브라우저에서는 자동 백업 파일을 쓸 수 없어요. 크롬, 엣지, 웨일에서 열면 쓸 수 있어요. 그때까지는 아래 ‘백업 파일 저장’을 자주 눌러 주세요.' }));
      return box;
    }
    if (st.active) {
      box.append(...[
        h('p', { class: 'help' }, h('b', { text: '자동 백업 중이에요. ' }), '‘' + st.name + '’에 저장해요' + (st.lastAt ? ' · 마지막 저장 ' + when(st.lastAt) : '') + '.'),
        st.failed ? h('p', { class: 'help small', text: '마지막에 파일에 쓰지 못했어요. 파일이 옮겨졌거나 지워졌다면 새 자동 백업 파일을 다시 정해 주세요.' }) : null,
        h('div', { class: 'row-btns' }, CD.ui.btn('지금 저장', () => B.saveNow()), CD.ui.btn('다른 파일로 바꾸기', () => B.create(), 'quiet'), CD.ui.btn('그만 쓰기', () => B.stop(), 'quiet')),
      ].filter(Boolean));
      return box;
    }
    if (st.paused) {
      box.append(
        h('p', { class: 'help', text: '‘' + st.name + '’에 자동 백업하다가 멈췄어요. 브라우저를 다시 켜면 쓰기를 한 번 다시 허락해야 해요.' }),
        h('div', { class: 'row-btns' }, CD.ui.btn('이어서 저장하기', () => B.resume(), 'primary'), CD.ui.btn('그만 쓰기', () => B.stop(), 'quiet')));
      return box;
    }
    box.append(
      h('p', { class: 'help', text: '파일 하나를 정해 두면 자료가 바뀔 때마다 그 파일에 저절로 저장해요. 구글 드라이브나 원드라이브처럼 동기화되는 폴더에 두면 다른 컴퓨터에서도 같은 파일을 불러와 이어 쓸 수 있어요.' }),
      h('p', { class: 'help small', text: '다시 켜면 자료가 지워지는 학교 컴퓨터라면 아침마다 ‘자동 백업 파일 불러와 이어 쓰기’를 눌러 그 파일에서 되살려요.' }),
      h('div', { class: 'row-btns' }, CD.ui.btn('새 자동 백업 파일 만들기', () => B.create(), 'primary'), CD.ui.btn('자동 백업 파일 불러와 이어 쓰기', () => B.openAndContinue())));
    return box;
  }

  function saveBackup() {
    CD.download(store.backupName(), store.exportText(), 'application/json');
    store.markBackedUp();
    CD.ui.toast('백업 파일을 저장했어요. USB나 클라우드에 옮겨 두면 다른 컴퓨터에서도 되살릴 수 있어요.');
    CD.refresh();
  }

  function restore(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { CD.ui.toast('파일이 너무 커요. 이 대시보드에서 저장한 백업 파일을 골라 주세요.'); return; }
    file.text().then(async (text) => {
      const next = store.parseBackup(text);
      if (!next) { CD.ui.toast('학급 대시보드 백업 파일이 아니에요. 다른 파일을 골라 주세요.'); return; }
      const ok = await CD.ui.confirm({
        title: '백업 파일로 되살리기',
        body: '‘' + next.profile.title + '’ 백업(학생 ' + next.students.length + '명)으로 바꿀까요? 지금 이 컴퓨터에 있는 자료는 백업 파일 내용으로 바뀌어요.',
        ok: '되살리기',
        danger: true,
      });
      if (!ok) return;
      store.replace(next);
      CD.ui.toast('백업 파일로 되살렸어요.');
      CD.go('home');
    }).catch(() => CD.ui.toast('파일을 읽지 못했어요.'));
  }

  function newYear() {
    const s = store.state;
    const thisYear = new Date().getFullYear();
    CD.ui.form({
      title: '새 학년도 시작하기',
      submit: '백업하고 새로 시작',
      fields: [
        { name: 'title', label: '새 대시보드 이름', value: s.profile.title, required: true, placeholder: '예: 4학년 1반' },
        { name: 'year', label: '학년도', value: (new Date().getMonth() >= 10 ? thisYear + 1 : thisYear) + '학년도' },
        { name: 'keep', label: '새 학년에도 그대로 둘 것', type: 'checks', value: ['timetable', 'links', 'games'], options: [
          { value: 'timetable', label: '교시 시간' },
          { value: 'subjects', label: '시간표 과목' },
          { value: 'links', label: '학습 사이트' },
          { value: 'roles', label: '1인1역 역할 이름' },
          { value: 'games', label: '게임 문제' },
        ] },
      ],
      onSubmit(v) {
        // 지우기 전에 지금 자료를 백업 파일로 먼저 남긴다
        CD.download(store.backupName(), store.exportText(), 'application/json');
        store.startNewYear({
          title: v.title.slice(0, 40), year: v.year.slice(0, 20),
          timetable: v.keep.includes('timetable') || v.keep.includes('subjects'), timetableSubjects: v.keep.includes('subjects'),
          links: v.keep.includes('links'), roles: v.keep.includes('roles'), games: v.keep.includes('games'),
        });
        CD.ui.toast('지난 자료는 백업 파일로 저장하고 새 학년도를 시작했어요. 학생 명단부터 넣어 주세요.');
        CD.go('students');
      },
    });
  }

  function render(root) {
    const s = store.state;
    const title = h('input', { type: 'text', id: 'setTitle', maxlength: 40, value: s.profile.title });
    const year = h('input', { type: 'text', id: 'setYear', maxlength: 20, value: s.profile.year });
    const motto = h('input', { type: 'text', id: 'setMotto', maxlength: 60, value: s.profile.motto, placeholder: '예: 서로 돕고 함께 웃는 반' });
    const saveProfile = () => {
      s.profile.title = title.value.trim().slice(0, 40) || '우리 반';
      s.profile.year = year.value.trim().slice(0, 20);
      s.profile.motto = motto.value.trim().slice(0, 60);
      store.save();
      CD.ui.toast('이름과 급훈을 저장했어요.');
    };
    const profile = h('section', { class: 'section' },
      h('h2', { text: '대시보드 이름과 급훈' }),
      h('form', { class: 'form-grid ruled', style: { 'padding-top': '1rem' }, on: { submit: (e) => { e.preventDefault(); saveProfile(); } } },
        h('div', { class: 'field' }, h('label', { for: 'setTitle', text: '이름 (목차 맨 위에 보여요)' }), title),
        h('div', { class: 'field' }, h('label', { for: 'setYear', text: '학년도' }), year),
        h('div', { class: 'field', style: { 'grid-column': '1 / -1' } }, h('label', { for: 'setMotto', text: '급훈 (오늘 화면 가운데에 보여요)' }), motto),
        h('div', { class: 'row-btns', style: { 'grid-column': '1 / -1' } }, h('button', { type: 'submit', class: 'btn primary', text: '저장' }))));

    // 자료가 어디에 남는지 설정 맨 위에서 먼저 알린다. 바깥 전송은 index.html의 보안 규칙(CSP)이 막는다
    const local = h('section', { class: 'section' },
      h('h2', { text: '자료가 저장되는 곳' }),
      h('div', { class: 'ruled', style: { 'padding-top': '0.8rem', display: 'grid', gap: '0.5rem' } },
        h('p', { class: 'help', text: '입력한 내용은 이 컴퓨터의 브라우저에만 저장되고 밖으로 나가지 않아요. 학생 이름, 출결, 관찰 기록, 평가 결과를 포함한 어떤 자료도 인터넷으로 보내지 않아요.' }),
        h('p', { class: 'help small', text: '브라우저가 다른 곳으로 자료를 보내지 못하게 막아 두었어요. 자료가 이 컴퓨터를 떠나는 때는 직접 백업 파일이나 CSV 파일로 저장하거나 인쇄할 때뿐이에요.' })));

    const features = h('section', { class: 'section' },
      h('h2', { text: '쓰는 기능' }),
      h('p', { class: 'help small', style: { 'margin-bottom': '0.6rem' }, text: '끈 기능은 목차와 오늘 화면에서 사라져요. 다시 켜면 적어 둔 자료가 그대로 나와요.' }),
      h('ul', { class: 'feature-list' }, CD.modules.list().filter((m) => !m.always && !m.bottom && !m.hidden).map((m) => {
        const key = m.feature || m.id;
        const input = h('input', { type: 'checkbox', checked: store.isOn(key), on: { change: (e) => { s.features[key] = e.target.checked; store.save(); } } });
        return h('li', null,
          h('span', null, h('b', { text: m.title }), h('span', { class: 'fd', text: FEATURE_INFO[key] || '' })),
          h('label', { class: 'switch', aria: { label: m.title + ' 켜기' } }, input, h('span', { class: 'track' })));
      })));

    const soundInput = h('input', { type: 'checkbox', checked: s.prefs.sound, on: { change: (e) => { s.prefs.sound = e.target.checked; store.save(); if (e.target.checked) CD.sound.unlock(); } } });
    const sound = h('section', { class: 'section' },
      h('h2', { text: '소리' }),
      h('div', { class: 'ruled', style: { 'padding-top': '0.8rem' } },
        h('label', { class: 'switch' }, soundInput, h('span', { class: 'track' }), h('span', { text: '도장, 돌림판, 게임, 타이머 소리 내기' }))));

    const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true, on: { change: (e) => { restore(e.target.files[0]); e.target.value = ''; } } });
    const backup = h('section', { class: 'section' },
      h('h2', { text: '백업과 복원' }),
      h('div', { class: 'ruled', style: { 'padding-top': '0.8rem', display: 'grid', gap: '0.8rem' } },
        h('p', { class: 'help', text: '자료는 이 컴퓨터의 브라우저에만 저장돼요. 백업 파일에는 출결, 관찰 기록, 평가 결과도 들어 있으니 안전한 곳에 두세요. 학교 컴퓨터는 다시 켜면 지워지기도 하니 일주일에 한 번쯤 백업 파일을 저장해 두세요. 다른 컴퓨터에서는 ‘백업 파일 불러오기’로 똑같이 되살려요.' }),
        h('p', { class: 'help small', text: ago(s.meta.lastBackupAt) }),
        h('div', { class: 'row-btns' }, CD.ui.btn('백업 파일 저장', saveBackup, 'primary'), CD.ui.btn('백업 파일 불러오기', () => file.click()), file),
        autoBackup()));

    const year2 = h('section', { class: 'section' },
      h('h2', { text: '새 학년도' }),
      h('div', { class: 'ruled', style: { 'padding-top': '0.8rem', display: 'grid', gap: '0.8rem' } },
        h('p', { class: 'help', text: '학년이나 학급이 바뀌면 지난 자료를 백업 파일로 남기고 새로 시작해요. 교시 시간이나 학습 사이트처럼 그대로 쓸 것은 고를 수 있어요.' }),
        h('div', { class: 'row-btns' }, CD.ui.btn('새 학년도 시작하기', newYear))));

    const about = h('section', { class: 'section' },
      h('h2', { text: '이 대시보드는' }),
      h('div', { class: 'ruled', style: { 'padding-top': '0.8rem', display: 'grid', gap: '0.5rem' } },
        h('p', { class: 'help', text: '로그인도 서버도 없어요. 학생 이름과 기록은 어디에도 보내지 않고 방문 기록도 모으지 않아요. 뽑기와 게임의 무작위는 브라우저의 암호용 난수로 정해요.' }),
        h('p', { class: 'help' }, h('a', { href: 'https://github.com/Eunhorang/class-dashboard', target: '_blank', rel: 'noopener', text: 'GitHub에서 소스 보기' }), ' · ', h('a', { href: 'https://eunhorang.github.io/bingle-wheel/', target: '_blank', rel: 'noopener', text: '빙글빙글 돌림판' }))));

    root.append(CD.ui.page('설정', [], h('div', { class: 'settings' }, local, profile, features, sound, backup, year2, about)));
  }

  CD.modules.register({ id: 'settings', title: '설정', group: 'manage', order: 999, always: true, bottom: true, render });
})(window.CD = window.CD || {});
