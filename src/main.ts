import Phaser from "phaser";
import { Combat, fighters, idle } from "./combat";
import { makeArena } from "./arena-renderer";
import { visualFighter } from "./visual-assets";
const portrait = () => visualFighter.portrait;
import { Inputs, actions, labels, keyLabel } from "./input";
import "./game.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<div class="game-viewport"><section class="arena arcade-stage"><div id="game"></div><header class="arena-header"><a class="arcade-brand brand" href="#" aria-label="Menú principal"><span class="brand-icon">FF</span> FIGHTER <b>FRIENDS</b></a><p class="edition"><span></span> DISTRITO NEÓN <i>/</i> VOL. 02</p><div class="header-actions"><button id="sound" aria-label="Silenciar sonido">SONIDO ON</button><button id="fullscreen" aria-label="Pantalla completa" aria-pressed="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 2H2v5M13 2h5v5M18 13v5h-5M7 18H2v-5"/></svg></button></div></header><div id="hud" hidden></div><div id="overlay"></div><footer class="arena-toolbar game-toolbar"><span id="mode-label">VERSUS LOCAL / EDICIÓN NEÓN</span><div id="fight-tools" hidden><button id="pause-button">Ⅱ PAUSA</button><button id="reset-practice" hidden>↺ REINICIAR PRÁCTICA</button></div><nav><button id="controls-top">GUÍA DE CONTROLES</button><a class="visual-preview-link" href="/visual-preview.html">NUEVO ESTILO VISUAL ↗</a></nav></footer></section></div><p id="asset-status" class="asset-status" role="status">Cargando la arena y las animaciones…</p><p id="fullscreen-status" class="sr-only" role="status"></p><dialog id="controls-dialog" aria-labelledby="controls-title"></dialog>`;
let assetsReady = false;
const stage = document.querySelector<HTMLElement>(".arcade-stage")!;
const viewport = document.querySelector<HTMLElement>(".game-viewport")!;
function resizeStage() {
  stage.style.transform = `translate(-50%, -50%) scale(${Math.min(viewport.clientWidth / 1280, viewport.clientHeight / 720)})`;
}
new ResizeObserver(resizeStage).observe(viewport);
resizeStage();
const overlay = document.querySelector<HTMLDivElement>("#overlay")!;
const hud = document.querySelector<HTMLDivElement>("#hud")!;
const fightTools = document.querySelector<HTMLDivElement>("#fight-tools")!;
const inputs = new Inputs();
let combat = new Combat(),
  chosen = [0, 1],
  screen: "menu" | "select" | "fight" | "result" = "menu",
  paused = false,
  practice = false,
  accumulator = 0;
let muted = false;
try {
  muted = localStorage.getItem("ff-muted") === "true";
} catch {}
let audio: AudioContext | undefined;
function tone(blocked = false, special = false) {
  if (muted) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(
      blocked ? 170 : special ? 95 : 260,
      audio.currentTime,
    );
    o.frequency.exponentialRampToValueAtTime(45, audio.currentTime + 0.12);
    g.gain.setValueAtTime(0.055, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.14);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.15);
  } catch {}
}
function btn(id: string, fn: () => void) {
  document.getElementById(id)!.onclick = fn;
}
function soundLabel() {
  document.getElementById("sound")!.innerHTML =
    `SONIDO ${muted ? "OFF" : "ON"} <span>${muted ? "×" : "◖))"}</span>`;
}
soundLabel();
btn("sound", () => {
  muted = !muted;
  try {
    localStorage.setItem("ff-muted", String(muted));
  } catch {}
  soundLabel();
});
const Arena = makeArena({
  state: () => ({ combat, screen, paused }),
  advance: (delta) => {
    if (screen !== "fight" || paused) return;
    accumulator += delta;
    while (accumulator >= 1000 / 60) {
      combat.step([inputs.frame(0), practice ? idle() : inputs.frame(1)]);
      for (const hit of combat.hits) {
        tone(hit.blocked, hit.special);
        (game.scene.getScenes(true)[0] as InstanceType<typeof Arena>).impact(
          hit,
        );
      }
      accumulator -= 1000 / 60;
      if (combat.phase === "over") break;
    }
    updateHud();
    if (combat.phase === "over") showResult();
  },
  ready: () => {
    assetsReady = true;
    document.getElementById("asset-status")!.hidden = true;
    app.dataset.ready = "true";
    document
      .querySelectorAll<HTMLButtonElement>("[data-requires-assets]")
      .forEach((b) => (b.disabled = false));
  },
  error: () => {
    const status = document.getElementById("asset-status")!;
    status.hidden = false;
    status.innerHTML =
      'No se pudieron cargar las ilustraciones. <button id="retry-assets">REINTENTAR</button>';
    document.getElementById("retry-assets")!.onclick = () => location.reload();
  },
});
const game: Phaser.Game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game",
  width: 1280,
  height: 720,
  pixelArt: true,
  roundPixels: true,
  transparent: true,
  scene: Arena,
  scale: { mode: Phaser.Scale.NONE },
  audio: { noAudio: true },
  banner: false,
});
const fullscreenButton = document.getElementById("fullscreen")!;
fullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    const status = document.getElementById("fullscreen-status")!;
    status.className = "fullscreen-notice";
    status.textContent =
      "No se pudo activar la pantalla completa. Puedes usar F11.";
  }
});
document.addEventListener("fullscreenchange", () => {
  fullscreenButton.setAttribute(
    "aria-pressed",
    String(!!document.fullscreenElement),
  );
  fullscreenButton.setAttribute(
    "aria-label",
    document.fullscreenElement
      ? "Salir de pantalla completa"
      : "Pantalla completa",
  );
  resizeStage();
});
function setOverlay(html: string) {
  app.dataset.screen = screen;
  app.dataset.paused = String(paused);
  overlay.innerHTML = html;
  overlay.classList.toggle("empty", !html);
}
function menu() {
  screen = "menu";
  paused = false;
  inputs.suspended = true;
  inputs.clear();
  combat = new Combat();
  chosen = [0, 1];
  hud.hidden = true;
  fightTools.hidden = true;
  document.getElementById("mode-label")!.innerHTML =
    "VERSUS LOCAL / DISTRITO NEÓN";
  setOverlay(
    `<div class="menu-panel"><div class="mini-label"><span></span> VOL. 02 / DISTRITO NEÓN</div><h1>FIGHTER<br><em>FRIENDS</em></h1><p>La misma amistad.<br>Una nueva rivalidad.</p><button class="primary" id="versus" data-requires-assets ${assetsReady ? "" : "disabled"}>JUGAR VERSUS <span>↗</span></button><button class="secondary" id="practice" data-requires-assets ${assetsReady ? "" : "disabled"}>ENTRAR A PRÁCTICA <span>→</span></button><small>2 JUGADORES LOCALES · TECLADO O MANDOS</small></div><div class="menu-character"><span>PERSONAJE 01</span><strong>LUCHADORA 01</strong><small>EL PRIMER ROUND EMPIEZA CONTIGO.</small></div>`,
  );
  btn("versus", () => select(false));
  btn("practice", () => select(true));
}
function select(mode: boolean) {
  practice = mode;
  screen = "select";
  inputs.suspended = true;
  hud.hidden = true;
  fightTools.hidden = true;
  setOverlay(
    `<div class="selection-panel"><p class="eyebrow">${practice ? "LABORATORIO DE COMBATE" : "ANTES DEL PRIMER GOLPE"}</p><h2>ELIGE TU ESQUINA</h2><div class="selections">${[0, 1].map((i) => `<div class="player-selection"><h3>${i === 1 && practice ? "RIVAL DE PRÁCTICA" : `JUGADOR ${i + 1}`}</h3><div class="fighter-profile"><img src="${portrait()}" alt="Retrato de la luchadora"/><div><strong>${fighters[i].name}</strong><small>${i === 0 ? "PERSONAJE DE REFERENCIA" : "MISMO PERSONAJE · ESPEJO"}</small></div></div><label>DISPOSITIVO<select id="device-${i}" ${practice && i === 1 ? "disabled" : ""}></select></label></div>`).join("")}</div><p class="selection-hint" id="device-hint">Teclado compartido, mandos o ambos. Tú eliges.</p><div class="selection-actions"><button class="secondary" id="back">VOLVER</button><button class="secondary" id="configure">CONTROLES</button><button class="primary" id="start">${practice ? "PRACTICAR" : "¡A PELEAR!"} ↗</button></div></div>`,
  );
  refreshPads();
  btn("back", menu);
  btn("configure", showControls);
  btn("start", () => {
    if (
      !practice &&
      inputs.devices[0] !== "keyboard" &&
      inputs.devices[0] === inputs.devices[1]
    ) {
      document.getElementById("device-hint")!.textContent =
        "Cada jugador necesita un mando distinto.";
      return;
    }
    start();
  });
}
function refreshPads() {
  if (screen !== "select") return;
  const pads = Array.from(navigator.getGamepads?.() ?? []).filter(
    (p): p is Gamepad => !!p,
  );
  for (let i = 0; i < 2; i++) {
    const s = document.getElementById(`device-${i}`) as HTMLSelectElement;
    s.innerHTML = '<option value="keyboard">Teclado</option>';
    for (const p of pads) {
      const option = document.createElement("option");
      option.value = String(p.index);
      option.textContent = `Mando ${p.index + 1} · ${p.id.slice(0, 32)}`;
      s.append(option);
    }
    if (
      inputs.devices[i] !== "keyboard" &&
      !pads.some((p) => String(p.index) === inputs.devices[i])
    )
      inputs.devices[i] = "keyboard";
    s.value = inputs.devices[i];
    s.onchange = () => (inputs.devices[i] = s.value);
  }
}
function start() {
  if (!assetsReady) return;
  combat = new Combat(practice);
  screen = "fight";
  paused = false;
  accumulator = 0;
  inputs.clear();
  inputs.suspended = false;
  setOverlay("");
  hud.hidden = false;
  fightTools.hidden = false;
  document.getElementById("reset-practice")!.hidden = !practice;
  document.getElementById("mode-label")!.textContent = practice
    ? "PRÁCTICA / SIN LÍMITES"
    : "VERSUS LOCAL / AL MEJOR DE 3";
  updateHud();
  tone();
}
let lastHud = "";
function updateHud() {
  const markup = `<div class="health-row">${[0, 1].map((i) => `${i === 1 ? `<div class="timer round-clock"><span>${practice ? "PRÁCTICA" : `ROUND ${combat.round}`}</span><strong>${practice ? "∞" : Math.ceil(combat.ticks / 60)}</strong><b>VS</b></div>` : ""}<div class="health player-${i} ${i === 0 ? "player-one" : "player-two"}"><div class="name-row"><span class="player-number">P${i + 1}</span><h2>${fighters[chosen[i]].name}</h2><span class="round-pips" aria-label="${combat.wins[i]} rounds ganados">${"◆".repeat(combat.wins[i])}${"◇".repeat(2 - combat.wins[i])}</span></div><div class="health-track life-frame" role="progressbar" aria-label="Vida jugador ${i + 1}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${combat.fighters[i].hp}"><i class="life-fill" style="width:${combat.fighters[i].hp}%"></i></div><div class="meter-row"><div class="special-track energy-frame"><i style="width:${100 - (combat.fighters[i].cooldown / 180) * 100}%"></i></div><span>ESPECIAL ${combat.fighters[i].cooldown === 0 ? "LISTO" : "RECARGANDO"}</span></div></div>`).join("")}</div>${combat.phase === "round" ? `<div class="round-message">${combat.message}<small>SIGUIENTE ROUND</small></div>` : ""}`;
  if (markup !== lastHud) {
    hud.innerHTML = markup;
    lastHud = markup;
  }
}
function pause(reason = "RESPIRA. LA RIVALIDAD ESPERA.") {
  if (screen !== "fight" || paused) return;
  paused = true;
  inputs.suspended = true;
  inputs.clear();
  accumulator = 0;
  setOverlay(
    `<div class="pause-panel"><p class="eyebrow">${reason}</p><h2>PAUSA</h2><button class="primary" id="resume">VOLVER AL COMBATE →</button><button class="secondary" id="pause-controls">CONTROLES</button><button class="text-button" id="exit">SALIR AL MENÚ</button><p id="pause-hint"></p></div>`,
  );
  btn("resume", () => {
    const pads = navigator.getGamepads?.() ?? [];
    const absent = inputs.devices.some(
      (d, i) => !(practice && i === 1) && d !== "keyboard" && !pads[Number(d)],
    );
    if (absent) {
      document.getElementById("pause-hint")!.textContent =
        "Reconecta el mando o vuelve al menú para elegir teclado.";
      return;
    }
    paused = false;
    inputs.clear();
    combat.fighters.forEach((f) => (f.previous = idle()));
    inputs.suspended = false;
    setOverlay("");
  });
  btn("exit", menu);
  btn("pause-controls", showControls);
}
function showResult() {
  screen = "result";
  inputs.suspended = true;
  inputs.clear();
  fightTools.hidden = true;
  const winner = combat.wins[0] === 2 ? 0 : 1;
  setOverlay(
    `<div class="pause-panel result-panel"><p class="eyebrow">LA AMISTAD SIGUE. EL MARCADOR TAMBIÉN.</p><h2>${fighters[chosen[winner]].name} GANA</h2><p>JUGADOR ${winner + 1} <span class="score">${combat.wins[0]} — ${combat.wins[1]}</span></p><button class="primary" id="rematch">OTRA RONDA ENTRE AMIGOS ↗</button><button class="secondary" id="reselect">CAMBIAR LUCHADORES</button><button class="text-button" id="result-menu">VOLVER AL MENÚ</button></div>`,
  );
  btn("rematch", start);
  btn("reselect", () => select(false));
  btn("result-menu", menu);
}
const dialog = document.querySelector<HTMLDialogElement>("#controls-dialog")!;
function showControls() {
  if (screen === "fight" && !paused) pause();
  inputs.clear();
  dialog.innerHTML = `<div class="dialog-top"><p class="eyebrow">APRENDE. PRACTICA. REPITE.</p><button id="close-controls" aria-label="Cerrar controles">×</button></div><h2 id="controls-title">TUS REGLAS.<br>TUS CONTROLES.</h2><p class="control-help">Haz clic en una tecla para cambiarla. Mantén atrás para bloquear de pie o abajo + atrás para bloquear agachado. Altos: de pie o evadir agachado; medios: ambas guardias; bajos: agachado; aéreos (overhead): de pie. Los especiales bloqueados causan 2 de daño, sin KO. Durante guard stun no puedes moverte, saltar ni atacar: mantén atrás y ajusta la postura ante cada golpe.</p><div class="bindings">${[0, 1].map((i) => `<div><h3>JUGADOR ${i + 1}</h3>${actions.map((a) => `<div class="binding"><span>${labels[a]}</span><button data-bind="${a}" data-player="${i}">${keyLabel(inputs.bindings[i][a])}</button></div>`).join("")}</div>`).join("")}</div><p id="binding-status" role="status">Los cambios se guardan en este navegador.</p><div class="pad-help"><strong>MANDOS ESTÁNDAR</strong><p>Cruceta / stick: moverse · A / ✕: puño · B / ○: patada · X / □: especial<br>Start: pausa · Esc: pausa · R: reiniciar práctica</p><p>Pulsa un botón del mando para que el navegador lo detecte. Algunos teclados limitan pulsaciones simultáneas.</p></div>`;
  dialog.showModal();
  btn("close-controls", () => dialog.close());
  document.querySelectorAll<HTMLButtonElement>("[data-bind]").forEach(
    (b) =>
      (b.onclick = () => {
        document.querySelectorAll("[data-bind]").forEach((el) => {
          const button = el as HTMLButtonElement;
          button.textContent = keyLabel(
            inputs.bindings[Number(button.dataset.player)][
              button.dataset.bind as keyof (typeof inputs.bindings)[0]
            ],
          );
        });
        pendingBinding = b;
        b.textContent = "…";
        document.getElementById("binding-status")!.textContent =
          "Pulsa la nueva tecla. Escape cancela.";
      }),
  );
}
let pendingBinding: HTMLButtonElement | null = null;
dialog.addEventListener("close", () => (pendingBinding = null));
window.addEventListener("keydown", (e) => {
  if (pendingBinding) {
    e.preventDefault();
    const b = pendingBinding;
    const player = Number(b.dataset.player),
      action = b.dataset.bind as (typeof actions)[number];
    const reserved = ["Escape", "KeyR", "Tab", "Enter", "Space"];
    const duplicate = inputs.bindings.some((mapping, i) =>
      actions.some(
        (a) => !(i === player && a === action) && mapping[a] === e.code,
      ),
    );
    if (e.code === "Escape") {
      b.textContent = keyLabel(inputs.bindings[player][action]);
      pendingBinding = null;
      return;
    }
    if (reserved.includes(e.code) || duplicate) {
      document.getElementById("binding-status")!.textContent =
        "Tecla reservada o ya asignada. Elige otra.";
      return;
    }
    inputs.bindings[player][action] = e.code;
    inputs.save();
    b.textContent = keyLabel(e.code);
    pendingBinding = null;
    document.getElementById("binding-status")!.textContent = "Tecla guardada.";
    return;
  }
  if (dialog.open) return;
  if (e.code === "Escape" && !e.repeat && screen === "fight") {
    if (paused) document.getElementById("resume")?.click();
    else pause();
  }
  if (
    e.code === "KeyR" &&
    !e.repeat &&
    screen === "fight" &&
    practice &&
    !paused
  ) {
    combat.resetPositions();
    inputs.clear();
  }
});
window.addEventListener("blur", () => {
  inputs.clear();
  pause("SE PAUSÓ AL CAMBIAR DE VENTANA");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    inputs.clear();
    pause("SE PAUSÓ AL CAMBIAR DE PESTAÑA");
  }
});
window.addEventListener("gamepadconnected", refreshPads);
window.addEventListener("gamepaddisconnected", (e) => {
  if (
    inputs.devices.some(
      (d, i) => d === String(e.gamepad.index) && !(practice && i === 1),
    )
  )
    pause("MANDO DESCONECTADO");
  refreshPads();
});
let previousStart = false;
function pollStart() {
  const startPressed = Array.from(navigator.getGamepads?.() ?? []).some(
    (p) =>
      p && inputs.devices.includes(String(p.index)) && p.buttons[9]?.pressed,
  );
  if (startPressed && !previousStart && screen === "fight" && !dialog.open) {
    if (paused) document.getElementById("resume")?.click();
    else pause();
  }
  previousStart = startPressed;
  requestAnimationFrame(pollStart);
}
pollStart();
btn("controls-top", showControls);
btn("pause-button", () => pause());
btn("reset-practice", () => {
  combat.resetPositions();
  inputs.clear();
});
document.querySelector<HTMLAnchorElement>(".brand")!.onclick = (e) => {
  e.preventDefault();
  if (screen === "fight") pause();
  else menu();
};
menu();
