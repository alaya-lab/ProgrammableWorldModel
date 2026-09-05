// Feature tabs: one panel visible at a time; switching pauses the old
// panel's video and starts the new one from the top.
const tabs = document.querySelectorAll('.feature-tab');
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    if (tab.classList.contains('active')) return;
    tabs.forEach((t) => {
      t.classList.toggle('active', t === tab);
      t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
    });
    document.querySelectorAll('.feature-panel').forEach((panel) => {
      const on = panel.dataset.feature === tab.dataset.feature;
      panel.classList.toggle('active', on);
      const video = panel.querySelector('video');
      if (!video) return;
      if (on) { video.currentTime = 0; video.play().catch(() => {}); }
      else video.pause();
    });
  });
});

// Autoplay videos while they are on screen; pause them when scrolled away.
const videos = document.querySelectorAll('.results video');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
  }, { threshold: 0.2 });
  videos.forEach((video) => observer.observe(video));
} else {
  videos.forEach((video) => video.play().catch(() => {}));
}

// Control HUD: per-frame key presses and mouse motion inferred from the
// engine's camera pose + player state, synchronized to video playback.
// Key mask bits: 1 = W, 2 = A, 4 = S, 8 = D. Mouse dx/dy in [-100, 100].
const MOUSE_RANGE_PX = 14;
const huds = [];

document.querySelectorAll('.hud').forEach((hud) => {
  const video = hud.parentElement.querySelector('video');
  const data = window.PWM_CONTROLS && window.PWM_CONTROLS[hud.dataset.scene];
  if (!video || !data) return;
  huds.push({
    video,
    data,
    keys: Object.fromEntries(
      Object.entries({
        1: '.key-w', 2: '.key-a', 4: '.key-s', 8: '.key-d',
      })
        .map(([bit, sel]) => [bit, hud.querySelector(sel)])
        .filter(([, el]) => el),
    ),
    dot: hud.querySelector('.hud-mouse-dot'),
    mouseLeft: hud.querySelector('.mouse-left'),
  });
});

function tick() {
  huds.forEach(({ video, data, keys, dot, mouseLeft }) => {
    const n = data.frames.length;
    const idx = Math.min(Math.floor(video.currentTime * data.fps), n - 1);
    const [mask, dx, dy] = data.frames[Math.max(0, idx)];
    for (const bit in keys) keys[bit].classList.toggle('active', (mask & bit) !== 0);
    if (mouseLeft) mouseLeft.classList.toggle('active', (mask & 16) !== 0);
    dot.style.transform =
      `translate(${(dx / 100) * MOUSE_RANGE_PX}px, ${(dy / 100) * MOUSE_RANGE_PX}px)`;
    dot.classList.toggle('active', Math.abs(dx) > 5 || Math.abs(dy) > 5);
  });
  requestAnimationFrame(tick);
}
if (huds.length) requestAnimationFrame(tick);

// Engine log: live frame counter, alive count and event feed derived from
// the engine's boxes.json, synchronized to the paired video.
const logs = [];
document.querySelectorAll('.engine-log').forEach((el) => {
  const data = window.PWM_EVENTS && window.PWM_EVENTS[el.dataset.scene];
  const video = el.closest('figure') && el.closest('figure').querySelector('video');
  if (!data || !video) return;
  logs.push({
    el, data, video,
    frameEl: el.querySelector('.el-frame'),
    aliveEl: el.querySelector('.el-alive'),
    eventEl: el.querySelector('.el-event'),
    lastEvent: -1,
  });
});

function logTick() {
  logs.forEach((log) => {
    const { data, video } = log;
    const idx = Math.max(0, Math.min(Math.floor(video.currentTime * data.fps), data.n - 1));
    log.frameEl.textContent = `t ${String(idx).padStart(3, '0')}/${data.n}`;
    if (data.enemies) {
      log.aliveEl.textContent = `${data.alive[idx]}/${data.enemies} enemies alive`;
    }
    let current = -1;
    for (let e = 0; e < data.events.length; e += 1) {
      if (data.events[e][0] <= idx) current = e;
    }
    if (current !== log.lastEvent) {
      log.lastEvent = current;
      log.eventEl.textContent = current >= 0 ? `▸ ${data.events[current][1]}` : '';
      if (current >= 0) {
        log.eventEl.classList.add('flash');
        setTimeout(() => log.eventEl.classList.remove('flash'), 700);
      }
    }
  });
  requestAnimationFrame(logTick);
}
if (logs.length) requestAnimationFrame(logTick);



// Arrow keys move between feature tabs when one is focused.
const tabList = [...document.querySelectorAll('.feature-tab')];
tabList.forEach((tab, i) => {
  tab.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = tabList[(i + (e.key === 'ArrowRight' ? 1 : tabList.length - 1)) % tabList.length];
    next.focus();
    next.click();
  });
});

// Gentle scroll reveal for sections and gallery cells.
const revealTargets = document.querySelectorAll('.section-head, .style-item, .credits');
if ('IntersectionObserver' in window) {
  const ro = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
    });
  }, { threshold: 0.1 });
  revealTargets.forEach((el) => { el.classList.add('reveal'); ro.observe(el); });
}

// Placeholder publication buttons: inert until real links exist.
document.querySelectorAll('a.dead-link').forEach((a) => {
  a.addEventListener('click', (e) => e.preventDefault());
});
