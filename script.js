/**
 * ═══════════════════════════════════════════════════════════════
 * CONFIG — personalize here
 * ═══════════════════════════════════════════════════════════════
 */
const CONFIG = {
  /** Prepended to startLead, e.g. "Ветулик, я хочу…" */
  herName: "Ветулик",

  texts: {
    pageTitle: "Для тебя",
    startLead: "я хочу тебя кое о чём спросить…",
    startButton: "Я тебя люблю",
    questionLead: "А ты меня?",
    yesButton: "Да",
    noButton: "Нет",
    firstNoResponse: "Ты уверена?",
    noUnavailable: "Похоже, вариант «Нет» сегодня недоступен.",
    fineYesButton: "Ладно… тогда да ❤️",
    celebrationTitle: "Я так и знал ❤️",
    celebrationSub: "Ты только что сделала меня очень счастливым.",
  },

  /** Shown under the headline after each dodge (from 2nd attempt onward) */
  noAttemptMessages: [
    "Попробуй ещё раз.",
    "Мне кажется, это неправильный ответ.",
    "Ты точно уверена?",
    "Нет-нет, давай ещё раз подумаем.",
    "Такой вариант сегодня недоступен.",
  ],

  /** After this many dodge attempts, "No" disappears */
  maxNoAttempts: 6,

  colors: {
    bg: "#faf6f3",
    text: "#3d3235",
    textMuted: "#8a7579",
    accent: "#e8a4a8",
    heart: "#e89298",
    heartGlow: "rgba(232, 146, 152, 0.55)",
  },

  timing: {
    sceneTransitionMs: 850,
    fadeMs: 700,
    heartTextDelayMs: 3200,
    celebrationSubDelayMs: 400,
    dodgeTransitionMs: 450,
    /** Desktop: px distance from cursor to trigger dodge */
    dodgeRadiusDesktop: 90,
    /** Mobile: dodge on touchstart before click */
    mobileDodgePadding: 16,
  },
};

/** Apply CONFIG colors to CSS variables */
function applyTheme() {
  const root = document.documentElement;
  const c = CONFIG.colors;
  root.style.setProperty("--color-bg", c.bg);
  root.style.setProperty("--color-text", c.text);
  root.style.setProperty("--color-text-muted", c.textMuted);
  root.style.setProperty("--color-accent", c.accent);
  root.style.setProperty("--color-heart", c.heart);
  root.style.setProperty("--color-heart-glow", c.heartGlow);
  root.style.setProperty("--scene-duration", `${CONFIG.timing.sceneTransitionMs}ms`);
  root.style.setProperty("--fade-duration", `${CONFIG.timing.fadeMs}ms`);
}

function withName(text) {
  const name = CONFIG.herName.trim();
  if (!name) return text;
  return `${name}, ${text}`;
}

function personalizeQuestion(text) {
  const name = CONFIG.herName.trim();
  if (!name) return text;
  return `${name}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

// ─── Scene manager ───────────────────────────────────────────
const scenes = {
  start: document.querySelector('[data-scene="start"]'),
  question: document.querySelector('[data-scene="question"]'),
  celebration: document.querySelector('[data-scene="celebration"]'),
};

let activeScene = "start";
let transitionLock = false;

function goToScene(name) {
  if (transitionLock || name === activeScene) return;
  transitionLock = true;

  const current = scenes[activeScene];
  const next = scenes[name];
  const duration = CONFIG.timing.sceneTransitionMs;

  if (name === "celebration") {
    backdrop.classList.add("is-dim");
  }

  current.classList.add("scene--leaving");
  current.classList.remove("scene--active");

  setTimeout(() => {
    current.classList.remove("scene--leaving");
    next.classList.add("scene--active");
    activeScene = name;
    transitionLock = false;

    if (name === "celebration") {
      runCelebration();
    }
  }, duration);
}

// ─── DOM refs ────────────────────────────────────────────────
const btnStart = document.getElementById("btn-start");
const btnYes = document.getElementById("btn-yes");
const btnNo = document.getElementById("btn-no");
const btnFineYes = document.getElementById("btn-fine-yes");
const questionLead = document.getElementById("question-lead");
const questionHint = document.getElementById("question-hint");
const questionButtons = document.getElementById("question-buttons");
const noUnavailable = document.getElementById("no-unavailable");
const startLead = document.getElementById("start-lead");

// ─── Scene 1 ─────────────────────────────────────────────────
btnStart.addEventListener("click", () => goToScene("question"));

// ─── Scene 2: Yes ────────────────────────────────────────────
btnYes.addEventListener("click", () => {
  teardownNoDodge();
  goToScene("celebration");
});

btnFineYes.addEventListener("click", () => {
  goToScene("celebration");
});

// ─── Scene 2: No dodge ───────────────────────────────────────
let noAttempts = 0;
let noDodgeActive = false;
let dodgeRaf = null;
const pointer = { x: -9999, y: -9999 };

function getRandomPosition(btnRect) {
  const pad = CONFIG.timing.mobileDodgePadding;
  const w = btnRect.width;
  const h = btnRect.height;
  const maxX = window.innerWidth - w - pad;
  const maxY = window.innerHeight - h - pad;
  const minX = pad;
  const minY = pad;
  const x = minX + Math.random() * Math.max(0, maxX - minX);
  const y = minY + Math.random() * Math.max(0, maxY - minY);
  return { x, y };
}

function moveNoButton(immediate) {
  const rect = btnNo.getBoundingClientRect();
  const { x, y } = getRandomPosition(rect);
  btnNo.style.left = `${x}px`;
  btnNo.style.top = `${y}px`;
  if (immediate) {
    btnNo.style.transition = "none";
    requestAnimationFrame(() => {
      btnNo.style.transition = "";
    });
  }
}

function registerNoAttempt() {
  noAttempts += 1;

  if (noAttempts === 1) {
    questionLead.textContent = CONFIG.texts.firstNoResponse;
    questionHint.hidden = true;
  } else {
    const messages = CONFIG.noAttemptMessages;
    const idx = Math.min(noAttempts - 2, messages.length - 1);
    questionHint.textContent = messages[idx];
    questionHint.hidden = false;
    questionHint.classList.remove("fade-in");
    void questionHint.offsetWidth;
    questionHint.classList.add("fade-in");
  }

  if (noAttempts >= CONFIG.maxNoAttempts) {
    finishNoGame();
  }
}

function finishNoGame() {
  teardownNoDodge();
  btnNo.style.opacity = "0";
  btnNo.style.pointerEvents = "none";
  setTimeout(() => {
    btnNo.hidden = true;
    questionButtons.hidden = true;
    questionLead.hidden = true;
    questionHint.hidden = true;
    noUnavailable.hidden = false;
    noUnavailable.classList.add("fade-in");
    btnFineYes.hidden = false;
    btnFineYes.classList.add("fade-in");
  }, 400);
}

function enableNoDodge() {
  if (noDodgeActive) return;
  noDodgeActive = true;
  btnNo.classList.add("btn--dodge");
  const rowRect = btnNo.getBoundingClientRect();
  btnNo.style.left = `${rowRect.left}px`;
  btnNo.style.top = `${rowRect.top}px`;
  document.body.appendChild(btnNo);
}

function teardownNoDodge() {
  noDodgeActive = false;
  if (dodgeRaf) cancelAnimationFrame(dodgeRaf);
  dodgeRaf = null;
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("touchstart", onTouchNearNo, { capture: true });
  btnNo.removeEventListener("click", onNoClick);
  btnNo.classList.remove("btn--dodge");
  btnNo.style.left = "";
  btnNo.style.top = "";
  btnNo.style.opacity = "";
  btnNo.style.pointerEvents = "";
}

function distanceToButton(px, py) {
  const r = btnNo.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return Math.hypot(px - cx, py - cy);
}

let lastDodgeTime = 0;
const DODGE_COOLDOWN = 280;

function tryDodge(source) {
  const now = performance.now();
  if (now - lastDodgeTime < DODGE_COOLDOWN) return;
  lastDodgeTime = now;
  moveNoButton(false);
  registerNoAttempt();
}

function onMouseMove(e) {
  if (!noDodgeActive || noAttempts >= CONFIG.maxNoAttempts) return;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  if (distanceToButton(pointer.x, pointer.y) < CONFIG.timing.dodgeRadiusDesktop) {
    tryDodge("mouse");
  }
}

function onTouchNearNo(e) {
  if (!noDodgeActive || noAttempts >= CONFIG.maxNoAttempts) return;
  const touch = e.touches[0];
  if (!touch) return;
  const r = btnNo.getBoundingClientRect();
  const expanded = CONFIG.timing.mobileDodgePadding;
  const inside =
    touch.clientX >= r.left - expanded &&
    touch.clientX <= r.right + expanded &&
    touch.clientY >= r.top - expanded &&
    touch.clientY <= r.bottom + expanded;
  if (inside) {
    e.preventDefault();
    tryDodge("touch");
  }
}

function onNoClick(e) {
  e.preventDefault();
  e.stopPropagation();
  tryDodge("click");
}

btnNo.addEventListener("click", (e) => {
  e.preventDefault();
  if (noAttempts === 0) {
    enableNoDodge();
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchstart", onTouchNearNo, { capture: true, passive: false });
  }
  tryDodge("click");
});

// ─── Celebration: canvas particles + CSS heart ───────────────
const canvas = document.getElementById("heart-canvas");
const ctx = canvas.getContext("2d");
const backdrop = document.getElementById("celebration-backdrop");
const heartWrap = document.getElementById("heart-css-wrap");
const titleEl = document.getElementById("celebration-title");
const subEl = document.getElementById("celebration-sub");

let animFrame = null;
let particles = [];

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createParticle(x, y, type) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.4 + Math.random() * 1.8;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 0.5,
    size: type === "mini-heart" ? 4 + Math.random() * 4 : 2 + Math.random() * 3,
    life: 1,
    decay: 0.008 + Math.random() * 0.012,
    type,
    wobble: Math.random() * Math.PI * 2,
  };
}

function drawMiniHeart(x, y, size, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = CONFIG.colors.heart;
  ctx.translate(x, y);
  ctx.scale(size / 10, size / 10);
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(0, 0, -5, 0, -5, 3);
  ctx.bezierCurveTo(-5, 6, 0, 9, 0, 12);
  ctx.bezierCurveTo(0, 9, 5, 6, 5, 3);
  ctx.bezierCurveTo(5, 0, 0, 0, 0, 3);
  ctx.fill();
  ctx.restore();
}

function tickParticles() {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.42;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  if (particles.length < 80 && Math.random() < 0.35) {
    particles.push(createParticle(cx, cy, Math.random() > 0.5 ? "mini-heart" : "dot"));
  }

  particles = particles.filter((p) => {
    p.wobble += 0.05;
    p.x += p.vx + Math.sin(p.wobble) * 0.15;
    p.y += p.vy;
    p.vy += 0.015;
    p.life -= p.decay;

    if (p.life <= 0) return false;

    if (p.type === "mini-heart") {
      drawMiniHeart(p.x, p.y, p.size, p.life * 0.85);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.colors.accent;
      ctx.globalAlpha = p.life * 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    return true;
  });

  animFrame = requestAnimationFrame(tickParticles);
}

function runCelebration() {
  resizeCanvas();
  particles = [];
  titleEl.classList.remove("is-shown");
  subEl.classList.remove("is-shown");
  heartWrap.classList.remove("is-visible");
  void heartWrap.offsetWidth;
  backdrop.classList.add("is-dim");
  heartWrap.classList.add("is-visible");
  titleEl.hidden = false;
  subEl.hidden = false;

  if (animFrame) cancelAnimationFrame(animFrame);
  tickParticles();

  setTimeout(() => {
    titleEl.classList.add("is-shown");
  }, CONFIG.timing.heartTextDelayMs);

  setTimeout(() => {
    subEl.classList.add("is-shown");
  }, CONFIG.timing.heartTextDelayMs + CONFIG.timing.celebrationSubDelayMs);
}

window.addEventListener("resize", () => {
  if (activeScene === "celebration") resizeCanvas();
  if (noDodgeActive && btnNo.classList.contains("btn--dodge")) {
    moveNoButton(true);
  }
});

// ─── Init copy ───────────────────────────────────────────────
function initCopy() {
  document.title = CONFIG.texts.pageTitle;
  startLead.textContent = withName(CONFIG.texts.startLead);
  btnStart.textContent = CONFIG.texts.startButton;
  questionLead.textContent = CONFIG.texts.questionLead;
  btnYes.textContent = CONFIG.texts.yesButton;
  btnNo.textContent = CONFIG.texts.noButton;
  noUnavailable.textContent = CONFIG.texts.noUnavailable;
  btnFineYes.textContent = CONFIG.texts.fineYesButton;
  titleEl.textContent = CONFIG.texts.celebrationTitle;
  subEl.textContent = CONFIG.texts.celebrationSub;
}

applyTheme();
initCopy();
