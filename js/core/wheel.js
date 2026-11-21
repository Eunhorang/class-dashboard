/*
 * 학급 대시보드 — 돌림판 그리기와 돌리기 (빙글빙글 돌림판에서 가져옴)
 * 캔버스에 칸을 한 번 그려 두고, 돌릴 때는 캔버스 요소만 CSS로 회전시킨다.
 * 바늘은 3시 방향(오른쪽)에 있어서 멈춘 칸의 이름이 가로로 읽힌다.
 * 어느 칸에서 멈출지는 돌리기 전에 공정한 난수로 정해 두고, 그 칸 안의 아무 곳에 멈추도록 회전량을 맞춘다.
 */
(function (CD) {
  'use strict';

  const TAU = Math.PI * 2;
  const INK = '#1E2228';
  const FILL_A = '#FFFFFF';
  const FILL_B = '#F0F2F4';
  const FILL_C = '#F7F8F9';
  const DIM_TEXT = '#A9B0B8';
  const STAMP = '#D2392C';
  const FONT = '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';

  const mod = (a, n) => ((a % n) + n) % n;

  function createWheel(opts) {
    const wrap = opts.wrap;
    const canvas = opts.canvas;
    const needle = opts.needle;
    const ctx = canvas.getContext('2d');
    const reduced = () => opts.reducedMotion && opts.reducedMotion();

    let labels = [];
    let size = 0;
    let angle = 0; // CSS 회전 각도(도). 시계 방향이 +.
    let spinning = false;
    let highlight = -1;
    let lastIndex = -1;
    let lastTickAt = 0;
    let lastKickAt = -1e9;
    let kickDir = 1;
    let raf = 0;
    let drag = null;

    /* ---------- 그리기 ---------- */
    function draw() {
      if (!size) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const px = Math.round(size * dpr);
      if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const c = size / 2;
      const frame = Math.max(1.2, size * 0.0028);
      const R = c - Math.max(7, size * 0.016);
      const hubR = size * 0.115 + 2;
      const n = labels.length;

      // 바깥 가는 테
      ctx.beginPath();
      ctx.arc(c, c, c - frame, 0, TAU);
      ctx.lineWidth = frame;
      ctx.strokeStyle = INK;
      ctx.stroke();

      if (!n) {
        ctx.beginPath();
        ctx.arc(c, c, R, 0, TAU);
        ctx.fillStyle = FILL_C;
        ctx.fill();
        ctx.setLineDash([size * 0.012, size * 0.016]);
        ctx.lineWidth = Math.max(1.5, size * 0.004);
        ctx.strokeStyle = '#9AA1A9';
        ctx.stroke();
        ctx.setLineDash([]);
        drawHubSeat(c, hubR);
        return;
      }

      const step = TAU / n;
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.arc(c, c, R, i * step, (i + 1) * step);
        ctx.closePath();
        let fill = i % 2 === 0 ? FILL_A : FILL_B;
        if (n % 2 === 1 && i === n - 1 && n > 1) fill = FILL_C;
        if (highlight >= 0) fill = i === highlight ? FILL_A : '#F3F4F6';
        ctx.fillStyle = fill;
        ctx.fill();
      }

      // 칸 사이 먹선
      if (n > 1) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const a = i * step;
          ctx.moveTo(c + Math.cos(a) * hubR, c + Math.sin(a) * hubR);
          ctx.lineTo(c + Math.cos(a) * R, c + Math.sin(a) * R);
        }
        ctx.lineWidth = n > 60 ? 0.6 : n > 36 ? 0.9 : Math.max(1.1, size * 0.0016);
        ctx.strokeStyle = INK;
        ctx.stroke();
      }

      // 굵은 바깥 테
      ctx.beginPath();
      ctx.arc(c, c, R, 0, TAU);
      ctx.lineWidth = Math.max(2.2, size * 0.0055);
      ctx.strokeStyle = INK;
      ctx.stroke();

      drawLabels(c, R, hubR, step, n);
      if (highlight >= 0 && highlight < n) drawWedgeStamp(c, R, hubR, step);
      drawHubSeat(c, hubR);
    }

    function drawHubSeat(c, hubR) {
      ctx.beginPath();
      ctx.arc(c, c, hubR, 0, TAU);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = Math.max(1.2, size * 0.002);
      ctx.strokeStyle = INK;
      ctx.stroke();
    }

    let labelLayout = null;
    function drawLabels(c, R, hubR, step, n) {
      const inner = hubR + size * 0.035;
      const outer = R - size * 0.062; // 3시 방향 바늘 끝과 마지막 글자가 닿지 않게
      const room = outer - inner;
      const mid = (inner + outer) / 2;
      const arc = step * mid;
      let base = Math.min(size * 0.058, arc * 0.62, 46);
      if (n === 1) base = Math.min(size * 0.07, 54);
      labelLayout = { outer, base };
      if (base < 9) return; // 칸이 너무 많으면 이름 대신 결과 창으로 보여 준다.
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) {
        const isHi = highlight === i;
        const weight = isHi ? 800 : 650;
        let fs = base;
        let text = labels[i];
        ctx.font = weight + ' ' + fs + 'px ' + FONT;
        let w = ctx.measureText(text).width;
        if (w > room) {
          fs = Math.max(base * 0.72, base * room / w);
          ctx.font = weight + ' ' + fs + 'px ' + FONT;
          w = ctx.measureText(text).width;
          if (w > room) {
            while (text.length > 1 && ctx.measureText(text + '…').width > room) text = text.slice(0, -1);
            text += '…';
          }
        }
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(i * step + step / 2);
        ctx.fillStyle = highlight >= 0 && !isHi ? DIM_TEXT : INK;
        ctx.fillText(text, outer, fs * 0.04);
        ctx.restore();
      }
    }

    // 멈춘 칸에 찍히는 작은 도장: 화면에서 똑바로 읽히도록 지금 회전만큼 되돌려 그린다.
    function drawWedgeStamp(c, R, hubR, step) {
      const a = highlight * step + step / 2;
      const rStamp = Math.min(step * (hubR + (R - hubR) * 0.42) * 0.42, size * 0.06);
      if (rStamp < 9) return;
      const rad = hubR + rStamp + size * 0.02;
      const x = c + Math.cos(a) * rad;
      const y = c + Math.sin(a) * rad;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((-angle * Math.PI) / 180 - 0.21);
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = STAMP;
      ctx.lineWidth = Math.max(2, rStamp * 0.12);
      ctx.beginPath();
      ctx.arc(0, 0, rStamp, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, rStamp * 0.045);
      ctx.beginPath();
      ctx.arc(0, 0, rStamp * 0.8, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = STAMP;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 ' + rStamp * 0.56 + 'px ' + FONT;
      ctx.fillText('뽑힘', 0, rStamp * 0.04);
      ctx.restore();
    }

    /* ---------- 회전 ---------- */
    function apply() {
      canvas.style.transform = 'rotate(' + angle + 'deg)';
    }

    function indexAt(deg) {
      const n = labels.length;
      if (!n) return -1;
      const a = mod(-deg, 360);
      return Math.min(n - 1, Math.floor(a / (360 / n)));
    }

    // 칸 경계를 넘을 때마다 소리를 내고 바늘을 튕긴다.
    function watchTicks(now, dir) {
      const idx = indexAt(angle);
      if (idx !== lastIndex) {
        if (lastIndex !== -1) {
          if (now - lastTickAt > 34) { lastTickAt = now; if (opts.onTick) opts.onTick(); }
          lastKickAt = now;
          kickDir = dir;
        }
        lastIndex = idx;
      }
      if (needle) {
        const tilt = reduced() ? 0 : -kickDir * 17 * Math.exp(-(now - lastKickAt) / 70);
        needle.style.setProperty('--tilt', (Math.abs(tilt) < 0.05 ? 0 : tilt).toFixed(2) + 'deg');
      }
    }

    function animate(from, to, duration, power, dir) {
      return new Promise((resolve) => {
        const start = performance.now();
        const total = to - from;
        cancelAnimationFrame(raf);
        function frame(now) {
          const x = Math.min(1, (now - start) / duration);
          const e = 1 - Math.pow(1 - x, power);
          angle = from + total * e;
          apply();
          watchTicks(now, dir);
          if (x < 1) {
            raf = requestAnimationFrame(frame);
          } else {
            settleNeedle(dir);
            resolve();
          }
        }
        raf = requestAnimationFrame(frame);
      });
    }

    function settleNeedle(dir) {
      if (!needle) return;
      const startAt = performance.now();
      function loop(now) {
        watchTicks(now, dir);
        if (now - startAt < 320) requestAnimationFrame(loop);
        else needle.style.setProperty('--tilt', '0deg');
      }
      requestAnimationFrame(loop);
    }

    // index 칸이 바늘 앞에 오도록 하는 마지막 각도
    function targetFor(index, from, dir, turns) {
      const n = labels.length;
      const stepDeg = 360 / n;
      const f = 0.16 + CD.rand.float() * 0.68; // 칸 가장자리에 아슬아슬하게 서지 않게
      const want = (index + f) * stepDeg;
      const finalMod = mod(-want, 360);
      const cur = mod(from, 360);
      const delta = dir > 0 ? mod(finalMod - cur, 360) : -mod(cur - finalMod, 360);
      return from + dir * turns * 360 + delta;
    }

    /**
     * 정해 둔 칸(index)에서 멈추도록 돌린다.
     * seconds: 버튼으로 돌릴 때 걸리는 시간 / velocity: 손으로 휙 돌렸을 때의 각속도(도/초)
     */
    async function spin(o) {
      if (spinning || !labels.length) return;
      spinning = true;
      highlight = -1;
      draw();
      const dir = o.velocity ? Math.sign(o.velocity) || 1 : 1;
      try {
        if (reduced()) {
          const to = targetFor(o.index, angle, dir, 1);
          await animate(angle, to, 900, 3, dir);
        } else if (o.velocity) {
          const v = Math.min(Math.abs(o.velocity), 2600);
          const T = Math.min(8, Math.max(2.6, 1.8 + v / 520));
          // 놓는 순간의 속도에서 자연스럽게 이어지도록 감속 곡선의 세기를 맞춘다.
          let turns = Math.max(1, Math.round((v * T) / 3 / 360));
          let to = targetFor(o.index, angle, dir, turns);
          let p = (v * T) / Math.abs(to - angle);
          if (p < 1.8) { turns = Math.max(1, turns - 1); to = targetFor(o.index, angle, dir, turns); p = (v * T) / Math.abs(to - angle); }
          p = Math.min(4.5, Math.max(1.8, p));
          await animate(angle, to, T * 1000, p, dir);
        } else {
          const seconds = o.seconds || 5;
          const turns = Math.max(2, Math.round(seconds * 1.15));
          // 살짝 뒤로 젖혔다가 출발
          const back = angle - 7;
          await animate(angle, back, 170, 2, -1);
          const to = targetFor(o.index, angle, 1, turns);
          await animate(angle, to, seconds * 1000, 3.2, 1);
        }
      } finally {
        spinning = false;
      }
    }

    /* ---------- 손으로 돌리기 ---------- */
    function pointerAngle(e) {
      return Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx);
    }

    wrap.addEventListener('pointerdown', (e) => {
      if (spinning || (e.button && e.button !== 0)) return;
      if (e.target.closest('.hub')) return;
      const r = wrap.getBoundingClientRect(); // 돌아간 캔버스가 아니라 바깥 틀로 가운데를 잰다
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (Math.hypot(e.clientX - cx, e.clientY - cy) > r.width / 2 + 6) return;
      drag = { id: e.pointerId, cx, cy, sx: e.clientX, sy: e.clientY, t0: performance.now(), moved: 0, samples: [] };
      drag.last = pointerAngle(e);
      drag.samples.push({ t: drag.t0, a: angle });
      if (opts.onGrab) opts.onGrab();
      try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* 없음 */ }
    });

    wrap.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const a = pointerAngle(e);
      let d = a - drag.last;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      drag.last = a;
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
      if (drag.moved < 6) return;
      wrap.classList.add('is-dragging');
      if (highlight >= 0) { highlight = -1; draw(); }
      angle += (d * 180) / Math.PI;
      apply();
      const now = performance.now();
      drag.samples.push({ t: now, a: angle });
      while (drag.samples.length > 2 && now - drag.samples[0].t > 110) drag.samples.shift();
      watchTicks(now, d >= 0 ? 1 : -1);
    });

    function endDrag(e, cancelled) {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      wrap.classList.remove('is-dragging');
      const now = performance.now();
      if (cancelled) return;
      if (d.moved < 8 && now - d.t0 < 600) {
        if (opts.onTap) opts.onTap();
        return;
      }
      const s = d.samples;
      if (s.length >= 2) {
        const first = s[0];
        const last = s[s.length - 1];
        const dt = Math.max(16, now - first.t);
        const v = ((last.a - first.a) / dt) * 1000;
        if (now - last.t < 120 && Math.abs(v) > 220 && opts.onFling) {
          opts.onFling(v);
          return;
        }
      }
      settleNeedle(1);
    }
    wrap.addEventListener('pointerup', (e) => endDrag(e, false));
    wrap.addEventListener('pointercancel', (e) => endDrag(e, true));

    /* ---------- 바깥에 보이는 기능 ---------- */
    return {
      setLabels(next) {
        const same = next.length === labels.length && next.every((v, i) => v === labels[i]);
        // 처음 그릴 때는 바늘이 칸 경계가 아니라 첫 칸 한가운데를 가리키게 둔다.
        if (!labels.length && next.length && !spinning) { angle = -180 / next.length; apply(); }
        labels = next.slice();
        lastIndex = indexAt(angle);
        if (!same) { highlight = -1; draw(); }
      },
      resize(d) {
        if (!d || Math.abs(d - size) < 1) return;
        size = d;
        wrap.style.setProperty('--d', d + 'px');
        draw();
      },
      draw,
      spin,
      highlight(i) { highlight = i; draw(); },
      clearHighlight() { if (highlight !== -1) { highlight = -1; draw(); } },
      get spinning() { return spinning; },
      get dragging() { return !!drag; },
    };
  }

  CD.createWheel = createWheel;
})(window.CD = window.CD || {});
