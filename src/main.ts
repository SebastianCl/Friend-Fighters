import Phaser from "phaser";
import { Combat, fighters, idle } from "./combat";
import { createTextures, portrait } from "./art";
import { Inputs, actions, labels, keyLabel } from "./input";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<header class="topbar"><a class="brand" href="#" aria-label="Inicio"><span class="brand-mark">FF<span>✦</span></span> FIGHTER FRIENDS<span class="brand-dot">®</span></a><div class="top-meta"><span class="status-dot"></span> LOCAL MULTIPLAYER <span class="edition">VOL. 01 / ARCADE CLUB</span></div><button id="sound" class="icon-button" aria-label="Silenciar sonido">SONIDO ON <span>◖))</span></button></header><main><div class="section-line"><span><i></i> EL BARRIO ES TU ARENA</span><span>EST. 2026 — INSERT FRIENDS, NOT COINS</span></div><div class="heading"><div><p class="eyebrow">BUENOS AMIGOS. MALOS RIVALES.</p><h1>FIGHTER<span>FRIENDS<span class="title-star">✳</span></span></h1></div><div class="intro"><span class="tag">2 JUGADORES · 1 TECLADO · CERO EXCUSAS</span><p>La próxima ronda se juega entre amigos.<br>Elige tu esquina. Haz que cuente.</p><button id="controls-top" class="text-button">GUÍA DE CONTROLES <span>↗</span></button></div></div><section class="cabinet"><div class="cabinet-bar"><span><i></i> <span id="arena-label">ESCENARIO 01</span> <b>/</b> EL BARRIO</span><span id="mode-label">VERSUS LOCAL <b>●</b> 60 FPS</span></div><div class="screen"><div id="game"></div><div id="overlay"></div><div id="hud" hidden></div><div id="fight-tools" hidden><button id="pause-button">Ⅱ PAUSA</button><button id="reset-practice" hidden>↺ REINICIAR PRÁCTICA</button></div></div><div class="cabinet-bottom"><span><span class="live-dot"></span> LISTO PARA LA PRÓXIMA RONDA</span><span>640 × 360 <b>·</b> PIXEL PERFECT</span></div></section><section class="lower"><div class="roster-title"><span class="eyebrow">CONOCE A TU RIVAL</span><h2>Dos esquinas.<br>La misma oportunidad.</h2><p>Luchadores originales. Un solo objetivo.</p></div><div class="fighter-card coral"><span class="number">01</span><img src="${portrait(fighters[0])}" alt="Rio, luchador con uniforme coral"/><div><span class="eyebrow">FUEGO DEL BARRIO</span><h3>RIO <span>↗</span></h3><p>Puños rápidos. Espíritu indomable.</p></div></div><div class="fighter-card mint"><span class="number">02</span><img src="${portrait(fighters[1])}" alt="Nox, luchador con uniforme verde"/><div><span class="eyebrow">CALMA ANTES DEL GOLPE</span><h3>NOX <span>↗</span></h3><p>Cabeza fría. Golpes que hablan.</p></div></div></section><footer><span>HECHO PARA COMPARTIR EL TECLADO.</span><span>PRIMERA EDICIÓN <b>✦</b> PERSONAJES GENÉRICOS / V0.1</span></footer></main><dialog id="controls-dialog" aria-labelledby="controls-title"></dialog>`;
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
class Arena extends Phaser.Scene {
  sprites: Phaser.GameObjects.Image[] = [];
  shadows: Phaser.GameObjects.Ellipse[] = [];
  fx!: Phaser.GameObjects.Graphics;
  create() {
    createTextures(this);
    this.add.image(0, 0, "arena").setOrigin(0);
    this.shadows = [
      this.add.ellipse(220, 285, 48, 8, 0x0a1924, 0.55),
      this.add.ellipse(420, 285, 48, 8, 0x0a1924, 0.55),
    ];
    this.sprites = [
      this.add.image(220, 284, "rio-guard-0-punch"),
      this.add.image(420, 284, "nox-guard-0-punch"),
    ];
    this.fx = this.add.graphics();
  }
  update(time: number, delta: number) {
    if (screen === "fight" && !paused) {
      accumulator += Math.min(delta, 100);
      while (accumulator >= 1000 / 60) {
        combat.step([inputs.frame(0), practice ? idle() : inputs.frame(1)]);
        for (const hit of combat.hits) {
          tone(hit.blocked, hit.special);
          const flash = this.add.star(
            hit.x,
            hit.y,
            6,
            3,
            hit.special ? 23 : 14,
            hit.blocked ? 0xc3ead6 : 0xffce82,
          );
          this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 1.8,
            duration: 140,
            onComplete: () => flash.destroy(),
          });
        }
        accumulator -= 1000 / 60;
      }
      updateHud();
      if (combat.phase === "over") showResult();
    }
    const frame = Math.floor(time / 170) % 2;
    this.sprites.forEach((sprite, i) => {
      const f = combat.fighters[i];
      const pose = screen === "menu" ? "idle" : f.pose;
      const d = fighters[chosen[i]];
      sprite.setTexture(
        `${d.id}-${d.animations[pose]}-${frame}-${f.attack?.kind ?? "punch"}`,
      );
      if (pose !== "attack")
        sprite.setTexture(`${d.id}-${d.animations[pose]}-${frame}-punch`);
      const drawX = pose === "fall" ? Math.max(40, Math.min(600, f.x)) : f.x;
      sprite.setPosition(Math.round(drawX), Math.round(284 - f.y - 34));
      sprite.setFlipX(f.facing === -1);
      this.shadows[i].setPosition(f.x, 285).setScale(1 - f.y / 260);
    });
  }
}
new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 640,
  height: 360,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: "#182b36",
  scene: Arena,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { noAudio: true },
  banner: false,
});
function setOverlay(html: string) {
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
    "VERSUS LOCAL <b>●</b> 60 FPS";
  setOverlay(
    `<div class="menu-panel"><div class="mini-label"><span></span> EL RETO ESTÁ SERVIDO</div><h2>TU AMIGO.<br>TU PRÓXIMO RIVAL.</h2><p>Un clásico de las maquinitas.<br>Una rivalidad completamente nueva.</p><button class="primary" id="versus">JUGAR VERSUS <span>↗</span></button><button class="secondary" id="practice">ENTRAR A PRÁCTICA <span>→</span></button><small>2 JUGADORES LOCALES · TECLADO O MANDOS</small></div><div class="arena-stamp"><span>FF</span>FIGHT CLUB<br><b>OPEN EVERY DAY</b></div>`,
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
    `<div class="selection-panel"><p class="eyebrow">${practice ? "LABORATORIO DE COMBATE" : "ANTES DEL PRIMER GOLPE"}</p><h2>ELIGE TU ESQUINA</h2><div class="selections">${[0, 1].map((i) => `<div><h3>${i === 1 && practice ? "RIVAL DE PRÁCTICA" : `JUGADOR ${i + 1}`}</h3><div class="choices">${fighters.map((f, n) => `<button class="choice ${chosen[i] === n ? "selected" : ""}" data-player="${i}" data-fighter="${n}" aria-pressed="${chosen[i] === n}"><img src="${portrait(f)}" alt=""/><strong>${f.name}</strong></button>`).join("")}</div><label>DISPOSITIVO<select id="device-${i}" ${practice && i === 1 ? "disabled" : ""}></select></label></div>`).join("")}</div><p class="selection-hint" id="device-hint">Teclado compartido, mandos o ambos. Tú eliges.</p><div class="selection-actions"><button class="secondary" id="back">VOLVER</button><button class="secondary" id="configure">CONTROLES</button><button class="primary" id="start">${practice ? "PRACTICAR" : "¡A PELEAR!"} ↗</button></div></div>`,
  );
  document.querySelectorAll<HTMLButtonElement>(".choice").forEach(
    (b) =>
      (b.onclick = () => {
        chosen[Number(b.dataset.player)] = Number(b.dataset.fighter);
        document
          .querySelectorAll<HTMLButtonElement>(
            `.choice[data-player="${b.dataset.player}"]`,
          )
          .forEach((c) => {
            const selected = c === b;
            c.classList.toggle("selected", selected);
            c.setAttribute("aria-pressed", String(selected));
          });
      }),
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
function updateHud() {
  hud.innerHTML = `<div class="health-row">${[0, 1].map((i) => `${i === 1 ? `<div class="timer">${practice ? "∞" : Math.ceil(combat.ticks / 60)}<small>${practice ? "PRÁCTICA" : `ROUND ${combat.round}`}</small></div>` : ""}<div class="health player-${i}"><div class="health-name"><strong>${fighters[chosen[i]].name}</strong><span>${"●".repeat(combat.wins[i])}${"○".repeat(2 - combat.wins[i])} <b>J${i + 1}</b></span></div><div class="health-track"><i style="width:${combat.fighters[i].hp}%"></i></div><div class="special-track"><i style="width:${100 - (combat.fighters[i].cooldown / 180) * 100}%"></i></div><small>ESPECIAL ${combat.fighters[i].cooldown === 0 ? "LISTO" : "RECARGANDO"}</small></div>`).join("")}</div>${combat.phase === "round" ? `<div class="round-message">${combat.message}</div>` : ""}`;
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
    combat.fighters.forEach((f) => (f.previous = { ...inputs.frame(0) }));
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
  dialog.innerHTML = `<div class="dialog-top"><p class="eyebrow">APRENDE. PRACTICA. REPITE.</p><button id="close-controls" aria-label="Cerrar controles">×</button></div><h2 id="controls-title">TUS REGLAS.<br>TUS CONTROLES.</h2><p class="control-help">Haz clic en una tecla para cambiarla. Bloquea manteniendo la dirección contraria al rival.</p><div class="bindings">${[0, 1].map((i) => `<div><h3>JUGADOR ${i + 1}</h3>${actions.map((a) => `<div class="binding"><span>${labels[a]}</span><button data-bind="${a}" data-player="${i}">${keyLabel(inputs.bindings[i][a])}</button></div>`).join("")}</div>`).join("")}</div><p id="binding-status" role="status">Los cambios se guardan en este navegador.</p><div class="pad-help"><strong>MANDOS ESTÁNDAR</strong><p>Cruceta / stick: moverse · A / ✕: puño · B / ○: patada · X / □: especial<br>Start: pausa · Esc: pausa · R: reiniciar práctica</p><p>Pulsa un botón del mando para que el navegador lo detecte. Algunos teclados limitan pulsaciones simultáneas.</p></div>`;
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
