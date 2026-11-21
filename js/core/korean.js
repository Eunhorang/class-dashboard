/*
 * 학급 대시보드 — 한국어 도우미 (빙글빙글 돌림판에서 가져옴)
 * 받침에 맞는 조사, 세는 말(명/개), 붙여 넣은 명단 나누기, 가나다순 정렬.
 */
(function (CD) {
  'use strict';

  // 숫자를 우리말로 읽었을 때 끝소리: 0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔은 받침이 있다.
  const DIGIT_BATCHIM = { 0: true, 1: true, 2: false, 3: true, 4: false, 5: false, 6: true, 7: true, 8: true, 9: false };
  const DIGIT_RIEUL = { 1: true, 7: true, 8: true };

  function lastChar(word) {
    const s = String(word).trim().replace(/[\s)\]}>"'’”.,!?~·…\-_]+$/u, '');
    return s.slice(-1);
  }

  // { has: true|false|null(모름), rieul: ㄹ 받침인지 }
  function finalSound(word) {
    const ch = lastChar(word);
    if (!ch) return { has: null, rieul: false };
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const jong = (code - 0xac00) % 28;
      return { has: jong !== 0, rieul: jong === 8 };
    }
    if (/[0-9]/.test(ch)) {
      const digits = String(word).trim().match(/(\d+)\D*$/);
      const num = digits ? digits[1] : ch;
      if (num.length > 1 && ch === '0') return { has: true, rieul: false }; // 십·백·천·만
      return { has: DIGIT_BATCHIM[ch], rieul: !!DIGIT_RIEUL[ch] };
    }
    return { has: null, rieul: false };
  }

  /**
   * 이름 뒤에 받침에 맞는 조사를 붙인다.
   * pair: '이/가', '을/를', '은/는', '과/와', '으로/로', '이에요/예요', '아/야'
   */
  function josa(word, pair) {
    const [withFinal, withoutFinal] = pair.split('/');
    const f = finalSound(word);
    if (f.has === null) return word + withFinal + '(' + withoutFinal + ')';
    if (withFinal === '으로') return word + (f.has && !f.rieul ? '으로' : '로');
    return word + (f.has ? withFinal : withoutFinal);
  }

  // 메뉴·물건·할 일처럼 보이는 끝말과 낱말 (사람 이름과 헷갈리기 쉬운 짧은 것들)
  const ITEM_END = /(면|밥|탕|찌개|볶이|볶음|구이|버거|피자|치킨|빵|떡|우동|국수|커피|주스|라떼|케이크|과자|사탕|청소|당번|벌칙|선물|상품|간식|가스|국밥|만두|김치)$/;
  const ITEM_WORDS = new Set(('짬뽕 탕수육 김밥 라면 순대 튀김 족발 보쌈 곱창 초밥 회 샐러드 샌드위치 토스트 도넛 와플 '
    + '쌀국수 마라탕 훠궈 카레 오므라이스 삼겹살 갈비 불고기 닭갈비 스테이크 파스타 리조또 타코 '
    + '아이스크림 빙수 젤리 초콜릿 쿠키 콜라 사이다 우유 녹차 홍차 '
    + '노래 춤 박수 윙크 하이파이브 칭찬 양보 심부름 꽝 당첨 다음 기회에').split(' '));

  /** 목록을 셀 때 쓸 말. 사람 이름처럼 보이면 '명', 아니면 '개'. 목록 창에서 직접 고를 수도 있다. */
  function guessUnit(names) {
    if (!names.length) return '명';
    let itemish = 0;
    for (const n of names) {
      const s = String(n).trim();
      if (!/^[가-힣]{2,4}$/.test(s) || ITEM_END.test(s) || ITEM_WORDS.has(s)) itemish++;
    }
    return itemish / names.length >= 0.5 ? '개' : '명';
  }

  /** "20명 중 한 명", "8개 중 하나" */
  function countPhrase(n, unit) {
    return unit === '개' ? n + '개' : n + '명';
  }
  function oneWord(unit) {
    return unit === '개' ? '하나' : '한 명';
  }

  // 엑셀·나이스 표 한 줄: 번호처럼 숫자만 있는 칸은 건너뛰고 처음 나오는 글자 칸을 이름으로 쓴다.
  function cleanCell(line) {
    const cells = line.split('\t').map((c) => c.trim()).filter(Boolean);
    let s;
    if (cells.length > 1) {
      s = cells.find((c) => !/^[\d.\-/:\s]+$/.test(c)) || cells[0];
    } else {
      s = cells[0] || '';
      // "1. 김민준", "3) 이서연", "12번 박도윤", "7 최하은" 앞 번호 떼기
      const m = s.match(/^(\d{1,3})(?:\s*[.)번]\s*|\s+)(.+)$/);
      if (m && /[^\d\s]/.test(m[2])) s = m[2];
    }
    return s.replace(/\s+/g, ' ').trim().slice(0, 40);
  }

  /** 붙여 넣거나 적은 글을 이름 목록으로 나눈다. 줄바꿈·쉼표로 나누고, 탭이 든 줄은 표의 한 줄로 본다. */
  function parseNames(text) {
    const out = [];
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    // 엑셀·나이스 표의 머리줄(번호, 이름, 성별 …)은 이름이 아니라서 건너뛴다
    const HEAD = /^(번호|출석번호|이름|성명|성별|학번|학년|반|생년월일|비고|연락처)$/;
    for (const line of lines) {
      if (!line.trim()) continue;
      const cells = line.split('\t').map((c) => c.trim()).filter(Boolean);
      if (cells.some((c) => HEAD.test(c)) && (cells.length > 1 || /^(이름|성명)$/.test(cells[0]))) continue;
      const parts = line.includes('\t') ? [line] : line.split(/[,，、;；]/);
      for (const p of parts) {
        const name = cleanCell(p);
        if (name) out.push(name);
        if (out.length >= 500) return out;
      }
    }
    return out;
  }

  const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
  function sortKo(names) {
    return names.slice().sort((a, b) => collator.compare(a, b));
  }

  /** 숫자만 있는 항목은 "7번"처럼 읽기 좋게 */
  function display(name) {
    return /^\d+$/.test(name) ? name + '번' : name;
  }

  function timeLabel(ts) {
    try {
      return new Date(ts).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      const d = new Date(ts);
      return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
    }
  }

  // 초성 퀴즈: 한글 음절의 첫소리만 남긴다. 한글이 아닌 글자(띄어쓰기, 숫자)는 그대로 둔다.
  const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  function chosung(word) {
    let out = '';
    for (const ch of String(word)) {
      const code = ch.charCodeAt(0);
      out += code >= 0xac00 && code <= 0xd7a3 ? CHO[Math.floor((code - 0xac00) / 588)] : ch;
    }
    return out;
  }

  CD.ko = { josa, finalSound, guessUnit, countPhrase, oneWord, parseNames, sortKo, collator, display, timeLabel, chosung };
})(window.CD = window.CD || {});
