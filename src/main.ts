import Phaser from "phaser";
import { Combat, idle } from "./combat";
import { CpuController } from "./cpu-controller";
import { makeArena, presentation } from "./arena-renderer";
import {
  visualCharacter,
  visualCharacters,
  type CharacterId,
} from "./visual-assets";
import { Inputs, actions, labels, keyLabel } from "./input";
import "./game.css";
import { effects } from "./effects/visual-effects-manager";
import type { VisualEffect } from "./effects/visual-effect";
import {
  LANDING_DUST_ANIMATION,
  LANDING_DUST_CONFIG,
  LANDING_DUST_TYPE,
  landedThisStep,
  landingDustDuration,
} from "./effects/landing-dust";
import {
  SoundEffects,
  captureCombatSoundState,
  combatTransitionCues,
  hitCue,
  type SoundCue,
} from "./audio";
import { MusicPlayer } from "./music";
import { createTournament, type Tournament } from "./tournament";
import { createTournamentParticipants } from "./tournament-setup";
import { renderTournamentBracket } from "./tournament-view";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<div class="game-viewport"><section class="arena arcade-stage"><div id="game"></div><header class="arena-header"><a class="arcade-brand brand" href="#" aria-label="Menú principal"><span class="brand-icon">AR</span> AMIGOS Y <b>RIVALES</b></a><div class="header-actions"><button id="sound" aria-label="Silenciar sonido">SONIDO ON</button><button id="music" aria-label="Silenciar música" aria-pressed="true">MÚSICA ON</button><button id="fullscreen" aria-label="Pantalla completa" aria-pressed="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 2H2v5M13 2h5v5M18 13v5h-5M7 18H2v-5"/></svg></button></div></header><div id="hud" hidden></div><div id="overlay"></div><footer class="arena-toolbar game-toolbar"><span id="mode-label">VERSUS LOCAL / EDICIÓN NEÓN</span><div id="fight-tools" hidden><button id="pause-button">Ⅱ PAUSA</button><button id="reset-practice" hidden>↺ REINICIAR PRÁCTICA</button></div><nav><button id="controls-top">GUÍA DE CONTROLES</button><a class="visual-preview-link" href="/visual-preview.html">NUEVO ESTILO VISUAL ↗</a></nav></footer></section></div><p id="asset-status" class="asset-status" role="status">Cargando la arena y las animaciones…</p><p id="fullscreen-status" class="sr-only" role="status"></p><dialog id="controls-dialog" aria-labelledby="controls-title"></dialog>`;
let assetsReady = false;
let menuCharacterIndex = 0;
let menuCharacterTimer: number | undefined;
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
  chosen: [CharacterId, CharacterId] = ["laura", "sebastian"],
  screen:
    | "menu"
    | "select"
    | "fight"
    | "result"
    | "tournament"
    | "tournament-select" = "menu",
  paused = false,
  practice = false,
  tournamentFight = false,
  opponentControl: "PLAYER" | "CPU" = "PLAYER",
  accumulator = 0;
let cpuController: CpuController | null = null;
let tournament: Tournament<CharacterId> | null = null;
let tournamentPlayerCharacter: CharacterId = visualCharacters[0].id;
let muted = false;
let musicMuted = false;
try {
  muted = localStorage.getItem("ff-muted") === "true";
  musicMuted = localStorage.getItem("ff-music-muted") === "true";
} catch {}
const sounds = new SoundEffects(muted);
const music = new MusicPlayer(musicMuted);
app.addEventListener("pointerdown", () => music.unlock(), {
  once: true,
  capture: true,
});
window.addEventListener("keydown", () => music.unlock(), {
  once: true,
  capture: true,
});
function btn(id: string, fn: () => void, cue: SoundCue | null = "ui-confirm") {
  document.getElementById(id)!.onclick = () => {
    if (cue) sounds.play(cue);
    fn();
  };
}
function soundLabel() {
  const button = document.getElementById("sound")!;
  button.innerHTML = `SONIDO ${muted ? "OFF" : "ON"} <span>${muted ? "×" : "◖))"}</span>`;
  button.setAttribute(
    "aria-label",
    muted ? "Activar sonido" : "Silenciar sonido",
  );
  button.setAttribute("aria-pressed", String(!muted));
}
soundLabel();
function musicLabel() {
  const button = document.getElementById("music")!;
  button.textContent = `MÚSICA ${musicMuted ? "OFF" : "ON"}`;
  button.setAttribute(
    "aria-label",
    musicMuted ? "Activar música" : "Silenciar música",
  );
  button.setAttribute("aria-pressed", String(!musicMuted));
}
musicLabel();
btn(
  "music",
  () => {
    musicMuted = !musicMuted;
    music.setMuted(musicMuted);
    try {
      localStorage.setItem("ff-music-muted", String(musicMuted));
    } catch {}
    musicLabel();
  },
  null,
);
btn(
  "sound",
  () => {
    muted = !muted;
    sounds.setMuted(muted);
    try {
      localStorage.setItem("ff-muted", String(muted));
    } catch {}
    soundLabel();
    if (!muted) sounds.play("ui-confirm");
  },
  null,
);
const Arena = makeArena({
  state: () => ({
    combat,
    screen:
      screen === "tournament" || screen === "tournament-select"
        ? "menu"
        : screen,
    paused,
    characters:
      screen === "menu"
        ? [chosen[0], visualCharacters[menuCharacterIndex].id]
        : chosen,
  }),
  advance: (delta) => {
    if (screen !== "fight" || paused) return;
    accumulator += delta;
    while (accumulator >= 1000 / 60) {
      const soundStateBeforeStep = captureCombatSoundState(combat);
      const airborneBeforeStep = soundStateBeforeStep.fighters.map(
        (fighter) => fighter.airborne,
      );
      combat.step([
        inputs.frame(0),
        practice
          ? idle()
          : (cpuController?.frame(combat, 1) ?? inputs.frame(1)),
      ]);
      const soundStateAfterStep = captureCombatSoundState(combat);
      combatTransitionCues(soundStateBeforeStep, soundStateAfterStep).forEach(
        (cue) => sounds.play(cue),
      );
      combat.fighters.forEach((fighter, index) => {
        if (landedThisStep(airborneBeforeStep[index], fighter.y)) {
          effects.spawn(LANDING_DUST_TYPE, {
            x: fighter.x * presentation.unit,
            y: presentation.groundY,
          });
        }
      });
      for (const hit of combat.hits) {
        sounds.play(hitCue(hit));
        if (!hit.blocked) {
          const effectType =
            hit.attackKind === "special" || hit.attackKind === "grab"
              ? "heavyHit"
              : hit.attackKind === "kick"
                ? "mediumHit"
                : "lightHit";
          effects.spawn(effectType, {
            x: hit.x * presentation.unit,
            y: presentation.groundY - hit.y * presentation.unit,
          });
        }
        effects.flashForHit(hit);
        (game.scene.getScenes(true)[0] as InstanceType<typeof Arena>).impact(
          hit,
        );
      }
      effects.update(1000 / 60);
      accumulator -= 1000 / 60;
      if (combat.phase === "over") break;
    }
    updateHud();
    if (combat.phase === "over") showResult();
  },
  ready: (scene) => {
    effects.init(scene);
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

// --- Registro de tipos de HitSpark (solo configuración, sin assets gráficos) ---
function animateHitSpark(effect: VisualEffect) {
  const progress = Math.min(effect.elapsed / effect.ttl, 1);
  effect.graphics?.setScale(1 + progress * 0.8).setAlpha(1 - progress);
}

effects.registerType("lightHit", {
  ttl: 80,
  create: (effect, scene) => {
    const g = scene.add.graphics();
    g.lineStyle(1, 0xffd700, 1);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(4, 0);
    g.lineTo(2, 2);
    g.lineTo(-2, 2);
    g.lineTo(0, 0);
    g.closePath();
    g.strokePath();
    effect.graphics = g;
  },
  update: animateHitSpark,
});

effects.registerType("mediumHit", {
  ttl: 120,
  create: (effect, scene) => {
    const g = scene.add.graphics();
    g.lineStyle(1, 0xffd700, 1);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(6, 0);
    g.lineTo(3, 3);
    g.lineTo(-3, 3);
    g.lineTo(0, 0);
    g.closePath();
    g.strokePath();
    effect.graphics = g;
  },
  update: animateHitSpark,
});

effects.registerType("heavyHit", {
  ttl: 200,
  create: (effect, scene) => {
    const g = scene.add.graphics();
    g.lineStyle(2, 0xffd700, 1);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(8, 0);
    g.lineTo(4, 4);
    g.lineTo(-4, 4);
    g.lineTo(0, 0);
    g.closePath();
    g.strokePath();
    effect.graphics = g;
  },
  update: animateHitSpark,
});

effects.registerType(LANDING_DUST_TYPE, {
  ttl: landingDustDuration(),
  scale: LANDING_DUST_CONFIG.scale,
  depth: LANDING_DUST_CONFIG.depth,
  offsetX: LANDING_DUST_CONFIG.offsetX,
  offsetY: LANDING_DUST_CONFIG.offsetY,
  create: (effect, scene) => {
    const sprite =
      effect.sprite ??
      scene.add.sprite(0, 0, "landing-dust", 0).setOrigin(0.5, 1);
    effect.sprite = sprite;
    sprite
      .setTexture("landing-dust", 0)
      .setOrigin(0.5, 1)
      .setActive(true)
      .setVisible(true)
      .play(LANDING_DUST_ANIMATION);
  },
});

const fullscreenButton = document.getElementById("fullscreen")!;
fullscreenButton.addEventListener("click", async () => {
  sounds.play("ui-confirm");
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
  window.clearInterval(menuCharacterTimer);
  combat.clearCombos();
  screen = "menu";
  paused = false;
  music.setPaused(false);
  music.setTheme("menu");
  inputs.suspended = true;
  inputs.clear();
  combat = new Combat();
  chosen = ["laura", "sebastian"];
  tournamentFight = false;
  opponentControl = "PLAYER";
  cpuController = null;
  hud.hidden = true;
  fightTools.hidden = true;
  document.getElementById("mode-label")!.innerHTML = "VERSUS LOCAL";
  setOverlay(
    `<div class="menu-panel"><h1>AMIGOS<br><em>Y RIVALES</em></h1><button class="primary" id="versus" data-requires-assets ${assetsReady ? "" : "disabled"}>JUGAR VERSUS <span>↗</span></button><button class="secondary" id="practice" data-requires-assets ${assetsReady ? "" : "disabled"}>ENTRAR A PRÁCTICA <span>→</span></button><button class="secondary" id="tournament">VER TORNEO <span>→</span></button></div>`,
  );
  btn("versus", () => select(false));
  btn("practice", () => select(true));
  btn("tournament", openTournamentSelection);
  menuCharacterTimer = window.setInterval(() => {
    if (screen !== "menu") {
      window.clearInterval(menuCharacterTimer);
      menuCharacterTimer = undefined;
      return;
    }
    menuCharacterIndex = (menuCharacterIndex + 1) % visualCharacters.length;
  }, 5000);
}
function openTournamentSelection() {
  screen = "tournament-select";
  tournamentFight = false;
  music.setPaused(false);
  music.setTheme("menu");
  inputs.suspended = true;
  inputs.clear();
  hud.hidden = true;
  fightTools.hidden = true;
  document.getElementById("mode-label")!.textContent = "SELECCIÓN DE TORNEO";
  setOverlay(
    `<div class="selection-panel tournament-selection-panel"><p class="eyebrow">CUATRO PLAZAS · ELIMINACIÓN DIRECTA</p><h2>ELIGE TU PERSONAJE</h2><p class="selection-hint">Tu elección será PLAYER. Los CPUs completarán el cuadro.</p><div class="tournament-character-options">${visualCharacters.map((character) => `<button class="character-card" data-tournament-character="${character.id}" aria-label="Elegir ${character.name} para PLAYER" aria-pressed="${tournamentPlayerCharacter === character.id}"><img src="${character.portrait}" alt=""/><span><strong>${character.name}</strong><small>${character.title}</small></span></button>`).join("")}</div><div class="selection-actions"><button class="secondary" id="tournament-selection-back">VOLVER</button><button class="primary" id="tournament-confirm">CREAR TORNEO →</button></div></div>`,
  );
  document
    .querySelectorAll<HTMLButtonElement>("[data-tournament-character]")
    .forEach(
      (button) =>
        (button.onclick = () => {
          sounds.play("ui-confirm");
          tournamentPlayerCharacter = button.dataset
            .tournamentCharacter as CharacterId;
          openTournamentSelection();
        }),
    );
  btn("tournament-selection-back", menu);
  btn("tournament-confirm", () => {
    const characterCatalog = visualCharacters.map(({ id }) => id);
    tournament = createTournament(
      createTournamentParticipants(tournamentPlayerCharacter, characterCatalog),
    );
    showTournament();
  });
}
function showTournament() {
  const activeTournament = tournament;
  if (!activeTournament) return;
  tournamentFight = false;
  screen = "tournament";
  music.setPaused(false);
  music.setTheme("menu");
  inputs.suspended = true;
  inputs.clear();
  hud.hidden = true;
  fightTools.hidden = true;
  document.getElementById("mode-label")!.textContent =
    `TORNEO / ${activeTournament.rounds[0].length * 2} PARTICIPANTES`;
  setOverlay(renderTournamentBracket(activeTournament));
  btn("tournament-back", menu);
  if (activeTournament.getCurrentMatch()) {
    const startButton = document.getElementById(
      "tournament-start",
    ) as HTMLButtonElement;
    startButton.disabled = !assetsReady;
    btn("tournament-start", startTournamentMatch);
  }
}
function startTournamentMatch() {
  if (!assetsReady) return;
  const activeTournament = tournament;
  if (!activeTournament) return;
  const match = activeTournament.getCurrentMatch();
  if (!match) return;
  chosen = [match.participants[0].character, match.participants[1].character];
  practice = false;
  tournamentFight = true;
  start();
}
function select(mode: boolean) {
  tournamentFight = false;
  practice = mode;
  screen = "select";
  music.setPaused(false);
  music.setTheme("menu");
  inputs.suspended = true;
  hud.hidden = true;
  fightTools.hidden = true;
  renderSelection();
}
function renderSelection() {
  setOverlay(
    `<div class="selection-panel"><p class="eyebrow">${practice ? "LABORATORIO DE COMBATE" : "ANTES DEL PRIMER GOLPE"}</p><h2>ELIGE TU ESQUINA</h2><div class="selections">${[0, 1].map((i) => `<div class="player-selection"><h3>${i === 1 && practice ? "RIVAL DE PRÁCTICA" : i === 1 && opponentControl === "CPU" ? "CPU" : `JUGADOR ${i + 1}`}</h3><div class="character-options">${visualCharacters.map((character) => `<button class="character-card" data-player="${i}" data-character="${character.id}" aria-label="Elegir ${character.name} para ${i === 1 && practice ? "rival de práctica" : `jugador ${i + 1}`}" aria-pressed="${chosen[i] === character.id}"><img src="${character.portrait}" alt=""/><span><strong>${character.name}</strong><small>${character.title}</small></span></button>`).join("")}</div>${i === 1 && !practice ? `<label>CONTROL<select id="opponent-control"><option value="PLAYER" ${opponentControl === "PLAYER" ? "selected" : ""}>PLAYER</option><option value="CPU" ${opponentControl === "CPU" ? "selected" : ""}>CPU</option></select></label>` : ""}<label>DISPOSITIVO<select id="device-${i}" ${(practice || opponentControl === "CPU") && i === 1 ? "disabled" : ""}></select></label></div>`).join("")}</div><p id="device-hint" class="selection-hint" role="status"></p><div class="selection-actions"><button class="secondary" id="back">VOLVER</button><button class="secondary" id="configure">CONTROLES</button><button class="primary" id="start">${practice ? "PRACTICAR" : "¡A PELEAR!"} ↗</button></div></div>`,
  );
  refreshPads();
  const controlSelect = document.getElementById(
    "opponent-control",
  ) as HTMLSelectElement | null;
  if (controlSelect)
    controlSelect.onchange = () => {
      opponentControl = controlSelect.value as "PLAYER" | "CPU";
      renderSelection();
    };
  document.querySelectorAll<HTMLButtonElement>("[data-character]").forEach(
    (button) =>
      (button.onclick = () => {
        sounds.play("ui-confirm");
        const player = Number(button.dataset.player) as 0 | 1;
        chosen[player] = button.dataset.character as CharacterId;
        renderSelection();
      }),
  );
  btn("back", menu);
  btn("configure", showControls, null);
  btn(
    "start",
    () => {
      if (
        !practice &&
        opponentControl === "PLAYER" &&
        inputs.devices[0] !== "keyboard" &&
        inputs.devices[0] === inputs.devices[1]
      ) {
        document.getElementById("device-hint")!.textContent =
          "Cada jugador necesita un mando distinto.";
        sounds.play("ui-confirm");
        return;
      }
      start();
    },
    null,
  );
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
    s.onchange = () => {
      sounds.play("ui-confirm");
      inputs.devices[i] = s.value;
    };
  }
}
function start() {
  if (!assetsReady) return;
  combat = new Combat(practice);
  cpuController =
    !practice && !tournamentFight && opponentControl === "CPU"
      ? new CpuController()
      : null;
  screen = "fight";
  paused = false;
  music.setPaused(false);
  music.setTheme("fight");
  accumulator = 0;
  inputs.clear();
  inputs.suspended = false;
  setOverlay("");
  hud.hidden = false;
  fightTools.hidden = false;
  document.getElementById("reset-practice")!.hidden = !practice;
  document.getElementById("mode-label")!.textContent = tournamentFight
    ? "TORNEO / AL MEJOR DE 3"
    : practice
      ? "PRÁCTICA / SIN LÍMITES"
      : cpuController
        ? "PLAYER VS CPU / AL MEJOR DE 3"
        : "VERSUS LOCAL / AL MEJOR DE 3";
  updateHud();
  sounds.play("round-start");
}
let lastHud = "";
function updateHud() {
  const markup = `<div class="health-row">${[0, 1].map((i) => `${i === 1 ? `<div class="timer round-clock"><span>${practice ? "PRÁCTICA" : `ROUND ${combat.round}`}</span><strong>${practice ? "∞" : Math.ceil(combat.ticks / 60)}</strong><b>VS</b></div>` : ""}<div class="health player-${i} ${i === 0 ? "player-one" : "player-two"}"><div class="name-row"><span class="player-number">${i === 1 && cpuController ? "CPU" : `P${i + 1}`}</span><h2>${visualCharacter(chosen[i]).name}</h2><span class="round-pips" aria-label="${combat.wins[i]} rounds ganados">${"◆".repeat(combat.wins[i])}${"◇".repeat(2 - combat.wins[i])}</span></div><div class="health-track life-frame" role="progressbar" aria-label="Vida jugador ${i + 1}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${combat.fighters[i].hp}"><i class="life-fill" style="width:${combat.fighters[i].hp}%"></i></div><div class="meter-row"><div class="special-track energy-frame"><i style="width:${100 - (combat.fighters[i].cooldown / 180) * 100}%"></i></div><span>ESPECIAL ${combat.fighters[i].cooldown === 0 ? "LISTO" : "RECARGANDO"}</span></div><div class="combo-counter" aria-label="Combo jugador ${i + 1}" ${combat.combos[i].displayHits < 2 ? "hidden" : ""}>${combat.combos[i].displayHits} HITS</div></div>`).join("")}</div>${combat.phase === "round" ? `<div class="round-message">${combat.message}<small>SIGUIENTE ROUND</small></div>` : ""}`;
  if (markup !== lastHud) {
    hud.innerHTML = markup;
    lastHud = markup;
  }
}
function pause(reason = "RESPIRA. LA RIVALIDAD ESPERA.") {
  if (screen !== "fight" || paused) return;
  sounds.play("pause");
  paused = true;
  music.setPaused(true);
  inputs.suspended = true;
  inputs.clear();
  accumulator = 0;
  setOverlay(
    `<div class="pause-panel"><p class="eyebrow">${reason}</p><h2>PAUSA</h2><button class="primary" id="resume">VOLVER AL COMBATE →</button><button class="secondary" id="pause-controls">CONTROLES</button><button class="text-button" id="exit">SALIR AL MENÚ</button><p id="pause-hint"></p></div>`,
  );
  btn(
    "resume",
    () => {
      const pads = navigator.getGamepads?.() ?? [];
      const absent = inputs.devices.some(
        (d, i) =>
          !(practice && i === 1) &&
          !(cpuController && i === 1) &&
          d !== "keyboard" &&
          !pads[Number(d)],
      );
      if (absent) {
        document.getElementById("pause-hint")!.textContent =
          "Reconecta el mando o vuelve al menú para elegir teclado.";
        return;
      }
      paused = false;
      music.setPaused(false);
      inputs.clear();
      combat.fighters.forEach((f) => (f.previous = idle()));
      inputs.suspended = false;
      setOverlay("");
      sounds.play("resume");
    },
    null,
  );
  btn("exit", menu);
  btn("pause-controls", showControls, null);
}
function showResult() {
  combat.clearCombos();
  updateHud();
  screen = "result";
  music.setPaused(false);
  music.setTheme("result");
  inputs.suspended = true;
  inputs.clear();
  fightTools.hidden = true;
  const winner = combat.wins[0] === 2 ? 0 : 1;
  if (tournamentFight) {
    const activeTournament = tournament;
    if (!activeTournament) throw new Error("No active tournament.");
    const match = activeTournament.getCurrentMatch();
    if (!match) throw new Error("No active tournament match.");
    activeTournament.recordWinner(match.participants[winner].id);
    const champion = activeTournament.getChampion();
    if (champion) {
      showTournament();
      return;
    }
    setOverlay(
      `<div class="pause-panel result-panel"><p class="eyebrow">COMBATE DE TORNEO TERMINADO</p><h2>${visualCharacter(chosen[winner]).name} GANA</h2><p>${match.participants[winner].id} <span class="score">${combat.wins[0]} — ${combat.wins[1]}</span></p><button class="primary" id="tournament-result-bracket">VER CUADRO ACTUALIZADO →</button></div>`,
    );
    btn("tournament-result-bracket", showTournament);
    return;
  }
  setOverlay(
    `<div class="pause-panel result-panel"><p class="eyebrow">LA AMISTAD SIGUE. EL MARCADOR TAMBIÉN.</p><h2>${visualCharacter(chosen[winner]).name} GANA</h2><p>${winner === 1 && cpuController ? "CPU" : `JUGADOR ${winner + 1}`} <span class="score">${combat.wins[0]} — ${combat.wins[1]}</span></p><button class="primary" id="rematch">OTRA RONDA ENTRE AMIGOS ↗</button><button class="secondary" id="reselect">CAMBIAR LUCHADORES</button><button class="text-button" id="result-menu">VOLVER AL MENÚ</button></div>`,
  );
  btn("rematch", start, null);
  btn("reselect", () => select(false));
  btn("result-menu", menu);
}
const dialog = document.querySelector<HTMLDialogElement>("#controls-dialog")!;
function showControls() {
  if (screen === "fight" && !paused) pause();
  else sounds.play("ui-confirm");
  inputs.clear();
  dialog.innerHTML = `<div class="dialog-top"><p class="eyebrow">APRENDE. PRACTICA. REPITE.</p><button id="close-controls" aria-label="Cerrar controles">×</button></div><h2 id="controls-title">TUS REGLAS.<br>TUS CONTROLES.</h2><p class="control-help">Haz clic en una tecla para cambiarla. Mantén Bloqueo para defender de pie o Agacharse + Bloqueo para defender bajo. Altos: de pie o evadir agachado; medios: ambas guardias; bajos: agachado; aéreos (overhead): de pie. Los especiales bloqueados causan 2 de daño, sin KO. Durante guard stun no puedes moverte, saltar ni atacar: mantén Bloqueo y ajusta la postura ante cada golpe. Pulsa Agarre cerca del rival: vence el bloqueo y lo lanza por los aires. Puedes evitarlo saltando o alejándote antes del contacto.</p><div class="bindings">${[0, 1].map((i) => `<div><h3>JUGADOR ${i + 1}</h3>${actions.map((a) => `<div class="binding"><span>${labels[a]}</span><button data-bind="${a}" data-player="${i}">${keyLabel(inputs.bindings[i][a])}</button></div>`).join("")}</div>`).join("")}</div><p id="binding-status" role="status">Los cambios se guardan en este navegador.</p><div class="pad-help"><strong>MANDOS ESTÁNDAR</strong><p>Cruceta / stick: moverse · A / ✕: puño · B / ○: patada · X / □: especial · Y / △: bloqueo · RB / R1: agarre<br>Start: pausa · Esc: pausa · R: reiniciar práctica</p><p>Pulsa un botón del mando para que el navegador lo detecte. Algunos teclados limitan pulsaciones simultáneas.</p></div>`;
  dialog.showModal();
  btn("close-controls", () => dialog.close());
  document.querySelectorAll<HTMLButtonElement>("[data-bind]").forEach(
    (b) =>
      (b.onclick = () => {
        sounds.play("ui-confirm");
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
      (d, i) =>
        d === String(e.gamepad.index) &&
        !(practice && i === 1) &&
        !(cpuController && i === 1),
    )
  )
    pause("MANDO DESCONECTADO");
  refreshPads();
});
let previousStart = false;
function pollStart() {
  const startPressed = Array.from(navigator.getGamepads?.() ?? []).some(
    (p) =>
      p &&
      inputs.devices.some(
        (device, i) =>
          device === String(p.index) &&
          !(practice && i === 1) &&
          !(cpuController && i === 1),
      ) &&
      p.buttons[9]?.pressed,
  );
  if (startPressed && !previousStart && screen === "fight" && !dialog.open) {
    if (paused) document.getElementById("resume")?.click();
    else pause();
  }
  previousStart = startPressed;
  requestAnimationFrame(pollStart);
}
pollStart();
btn("controls-top", showControls, null);
btn("pause-button", () => pause(), null);
btn("reset-practice", () => {
  combat.resetPositions();
  inputs.clear();
});
document.querySelector<HTMLAnchorElement>(".brand")!.onclick = (e) => {
  e.preventDefault();
  if (screen === "fight") pause();
  else {
    sounds.play("ui-confirm");
    menu();
  }
};
menu();
