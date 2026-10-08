const MAX_NO_RUNS = 5;

const questions = [
  {
    title: "Хотел бы сходить со мной на свидание?",
    choices: ["Да", "Конечно", "С удовольствием", "Нет"]
  },
  {
    title: "Какой мой любимый цвет?",
    choices: ["Синий", "Чёрный", "Зелёный", "Розовый", "Не знаю"]
  },
  {
    title: "Что бы ты хотел делать на нашем свидании?",
    choices: ["Погулять в парке", "Сходить в кино", "Посидеть в кафе", "Просто поболтать"],
    custom: "Свой вариант"
  },
  {
    title: "Насколько ты меня ценишь от 1 до 10?",
    scale: true
  }
];

const views = {
  home: document.getElementById("view-home"),
  quiz: document.getElementById("view-quiz"),
  final: document.getElementById("view-final")
};

const btnYes = document.getElementById("btn-yes");
const btnNo = document.getElementById("btn-no");
const qTitle = document.getElementById("q-title");
const qBody = document.getElementById("q-body");
const progress = document.getElementById("progress");
const screamer = document.getElementById("screamer");
const canvas = document.getElementById("confetti");
const ctx = canvas.getContext("2d");

const screenEl = document.querySelector(".screen");
screenEl.classList.add("is-home");

let step = 0;
let noRuns = 0;
let noStopped = false;
let lastRun = 0;
let audioCtx = null;
let confettiBits = [];
let confettiOn = false;
let heartsTimer = null;

function show(name) {
  screenEl.classList.toggle("is-home", name === "home");
  Object.entries(views).forEach(([key, el]) => {
    const on = key === name;
    el.classList.toggle("is-on", on);
    el.hidden = !on;
  });
}

/* ---------- Sound / screamer ---------- */

function unlockAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function playScream() {
  unlockAudio();
  const t = audioCtx.currentTime;

  const noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 1.4, audioCtx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 0.35);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.9, t + 0.04);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
  const bp = audioCtx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1200, t);
  bp.frequency.exponentialRampToValueAtTime(2800, t + 0.2);
  noise.connect(bp).connect(noiseGain).connect(audioCtx.destination);
  noise.start(t);

  [880, 1320, 1760].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = i ? "sawtooth" : "square";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 1.15);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 1.25);
  });
}

function triggerScreamer() {
  playScream();
  screamer.classList.add("is-on");
  setTimeout(() => screamer.classList.remove("is-on"), 1600);
}

/* ---------- Runaway "No" button ---------- */

function placeNoRandom() {
  // Move to <body>: .screen has backdrop-filter, which breaks position:fixed for children
  if (btnNo.parentElement !== document.body) {
    document.body.appendChild(btnNo);
  }
  // Keep the button inside the card (.screen)
  const pad = 16;
  const rect = btnNo.getBoundingClientRect();
  const box = screenEl.getBoundingClientRect();
  const minX = box.left + pad;
  const maxX = box.right - rect.width - pad;
  const minY = box.top + pad;
  const maxY = box.bottom - rect.height - pad;
  const x = minX + Math.random() * Math.max(0, maxX - minX);
  const y = minY + Math.random() * Math.max(0, maxY - minY);
  btnNo.style.position = "fixed";
  btnNo.style.left = x + "px";
  btnNo.style.top = y + "px";
  btnNo.style.zIndex = "20";
  btnNo.style.margin = "0";
}

function runAway() {
  if (noStopped) return;
  const now = performance.now();
  if (now - lastRun < 260) return;
  lastRun = now;
  noRuns += 1;
  placeNoRandom();
  if (noRuns >= MAX_NO_RUNS) {
    noStopped = true;
    btnNo.classList.add("is-fixed");
  }
}

function nearNo(x, y) {
  const r = btnNo.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return Math.hypot(x - cx, y - cy) < 88;
}

function resetNoButton() {
  noRuns = 0;
  noStopped = false;
  btnNo.classList.remove("is-fixed");
  btnNo.style.position = "";
  btnNo.style.left = "";
  btnNo.style.top = "";
  btnNo.style.zIndex = "";
  btnNo.style.margin = "";
  document.getElementById("home-actions").appendChild(btnNo);
}

btnYes.addEventListener("click", () => {
  unlockAudio();
  resetNoButton();
  step = 0;
  show("quiz");
  renderQuestion();
});

btnNo.addEventListener("click", (e) => {
  e.preventDefault();
  unlockAudio();
  if (noStopped) {
    triggerScreamer();
    return;
  }
  runAway();
});

document.addEventListener("mousemove", (e) => {
  if (noStopped || !views.home.classList.contains("is-on")) return;
  if (nearNo(e.clientX, e.clientY)) runAway();
});

document.addEventListener("touchstart", (e) => {
  if (noStopped || !views.home.classList.contains("is-on") || !e.touches[0]) return;
  const t = e.touches[0];
  if (nearNo(t.clientX, t.clientY)) {
    e.preventDefault();
    runAway();
  }
}, { passive: false });

/* ---------- Questionnaire ---------- */

function renderQuestion() {
  const q = questions[step];
  qTitle.textContent = q.title;
  progress.innerHTML = questions
    .map((_, i) => `<span class="dot${i === step ? " is-on" : ""}"></span>`)
    .join("");

  if (q.scale) {
    qBody.innerHTML = `<div class="scale" id="scale"></div>`;
    const scale = document.getElementById("scale");
    for (let n = 1; n <= 10; n++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn choice--soft";
      b.textContent = String(n);
      b.addEventListener("click", () => {
        rating = n;
        nextQuestion();
      });
      scale.appendChild(b);
    }
    return;
  }

  const stack = document.createElement("div");
  stack.className = "btn-stack";
  q.choices.forEach((label) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn choice";
    b.textContent = label;
    b.addEventListener("click", nextQuestion);
    stack.appendChild(b);
  });

  if (q.custom) {
    const wrap = document.createElement("div");
    wrap.className = "custom";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = q.custom;
    input.maxLength = 80;
    const send = document.createElement("button");
    send.type = "button";
    send.className = "btn";
    send.textContent = "Готово";
    send.addEventListener("click", () => {
      if (input.value.trim()) nextQuestion();
      else input.focus();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim()) nextQuestion();
    });
    wrap.append(input, send);
    stack.appendChild(wrap);
  }

  qBody.innerHTML = "";
  qBody.appendChild(stack);
}

let rating = 10;

// Good ending for 10/10, rude ending for anything lower
function setFinalText() {
  const title = views.final.querySelector("h1");
  const hint = views.final.querySelector(".hint");
  if (rating < 10) {
    title.textContent = "Ты мудак, Ярик 😤";
    hint.textContent = "Меньше 10? Подумай над своим поведением";
  } else {
    title.textContent = "Спасибо, Ярик! Ты самый лучший 💙";
    hint.textContent = "Мне очень повезло, что ты есть";
  }
}

function nextQuestion() {
  step += 1;
  if (step >= questions.length) {
    setFinalText();
    show("final");
    startParty();
    return;
  }
  views.quiz.classList.remove("is-on");
  void views.quiz.offsetWidth; // restart animation
  views.quiz.classList.add("is-on");
  renderQuestion();
}

/* ---------- Confetti + hearts ---------- */

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function startParty() {
  resizeCanvas();
  confettiBits = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    r: 4 + Math.random() * 6,
    vy: 1.4 + Math.random() * 2.4,
    vx: -1 + Math.random() * 2,
    rot: Math.random() * 360,
    vr: -4 + Math.random() * 8,
    color: ["#ffffff", "#9fd0ff", "#6b7cff", "#ff8ab8", "#ffe28a"][Math.floor(Math.random() * 5)]
  }));
  confettiOn = true;
  tickParty();
  spawnHearts();
}

function tickParty() {
  if (!confettiOn) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  confettiBits.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    if (p.y > canvas.height + 20) p.y = -10;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.4);
    ctx.restore();
  });
  requestAnimationFrame(tickParty);
}

function spawnHearts() {
  clearInterval(heartsTimer);
  heartsTimer = setInterval(() => {
    if (!views.final.classList.contains("is-on")) return;
    const h = document.createElement("div");
    h.className = "heart-float";
    h.textContent = ["💙", "💖", "✨"][Math.floor(Math.random() * 3)];
    h.style.left = 8 + Math.random() * 84 + "vw";
    h.style.bottom = "-20px";
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 3600);
  }, 420);
}

function stopParty() {
  confettiOn = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  clearInterval(heartsTimer);
  document.querySelectorAll(".heart-float").forEach((n) => n.remove());
}

document.getElementById("btn-again").addEventListener("click", () => {
  stopParty();
  resetNoButton();
  step = 0;
  rating = 10;
  show("home");
});

window.addEventListener("resize", () => {
  if (confettiOn) resizeCanvas();
});