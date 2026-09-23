import {
  visualFighter as fighter,
  visualStage as scene,
} from "./visual-assets";
import "./visual-preview.css";

const app = document.querySelector<HTMLElement>("#visual-app")!;
app.innerHTML = `
  <div class="viewport">
    <section class="arena" aria-label="Dos vistas de la misma luchadora en Distrito Neón">
      <img class="backdrop" src="${scene.background}" alt="Calle nocturna de pixel art iluminada por letreros cian, magenta y amarillos" fetchpriority="high" />
      <div class="atmosphere" aria-hidden="true"></div>
      <header class="arena-header">
        <a class="arcade-brand" href="/" aria-label="Volver al juego"><span class="brand-icon">AR</span>AMIGOS Y <b>RIVALES</b></a>
        <p class="edition"><span></span> NUEVA DIRECCIÓN VISUAL <i>/</i> VOL. 02</p>
        <button class="menu-toggle" data-dialog="menu">☰ <span>MENÚ</span></button>
      </header>
      <div class="fight-hud" aria-label="Interfaz demostrativa: vida y energía estáticas">
        <div class="player-hud player-one">
          <div class="name-row"><span class="player-number">P1</span><h1>LAURA</h1><span class="round-pips" aria-hidden="true">◆ ◇</span></div>
          <div class="life-frame"><div class="life-fill"></div></div>
          <div class="meter-row"><div class="energy-frame"><i></i></div><span>POWER</span></div>
        </div>
        <div class="round-clock"><span>ROUND 01</span><strong>99</strong><b>VS</b></div>
        <div class="player-hud player-two">
          <div class="name-row"><span class="round-pips" aria-hidden="true">◇ ◇</span><h2>LAURA</h2><span class="player-number">P2</span></div>
          <div class="life-frame"><div class="life-fill"></div></div>
          <div class="meter-row"><span>POWER</span><div class="energy-frame"><i></i></div></div>
        </div>
      </div>
      <div class="stage-label"><span>ESCENARIO 01</span><strong>DISTRITO NEÓN</strong><i>00:24 AM / AFTER HOURS</i></div>
      <div class="ground-shadow shadow-one" aria-hidden="true"></div>
      <div class="ground-shadow shadow-two" aria-hidden="true"></div>
      <img class="fighter fighter-one" src="${fighter.sprite}" alt="Laura: cabello oscuro largo, camiseta oscura, falda blanca, pulseras blancas y tenis blancos" fetchpriority="high" />
      <img class="fighter fighter-two" src="${fighter.sprite}" alt="La misma luchadora reflejada, mirando hacia su rival" />
      <div class="corner-label corner-one"><b>01</b><span>LAURA<small>PERSONAJE DE REFERENCIA</small></span></div>
      <div class="corner-label corner-two"><span>LAURA<small>PRUEBA ESTÁTICA · OTRA ESQUINA</small></span><b>02</b></div>
      <footer class="arena-toolbar">
        <div class="preview-tag"><span></span><strong>PRUEBA VISUAL</strong><small>SIN COMBATE</small></div>
        <nav aria-label="Explorar la dirección visual">
          <button data-dialog="portrait"><span class="key-icon">01</span> RETRATO</button>
          <button data-dialog="compare"><span class="key-icon">02</span> COMPARAR REFERENCIA</button>
          <button id="fullscreen" aria-label="Pantalla completa" aria-pressed="false"><svg class="expand-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 2H2v5M13 2h5v5M18 13v5h-5M7 18H2v-5"/></svg> PANTALLA COMPLETA</button>
        </nav>
      </footer>
    </section>
  </div>
  <p id="asset-status" class="asset-status" role="status">Cargando la nueva arena…</p>
  <p id="fullscreen-status" class="sr-only" role="status"></p>
  <dialog id="portrait-dialog" class="art-dialog" aria-labelledby="portrait-title">
    <header class="dialog-heading"><div><p>FIGHTER FILE / 001</p><h2 id="portrait-title">LA IDENTIDAD<br>ESTÁ EN LOS DETALLES.</h2></div><button class="close-dialog" aria-label="Cerrar retrato">×</button></header>
    <div class="portrait-layout"><img class="portrait-art" src="${fighter.portrait}" alt="Retrato detallado de Laura: rostro, ojos y cabello" /><div class="portrait-copy"><span class="tiny-label">LAURA</span><h3>MISMA MIRADA.<br>NUEVA ARENA.</h3><p>Rostro, peinado y proporciones basados en la ilustración que compartiste.</p><dl><div><dt>ESTILO</dt><dd>Ilustración de combate detallada</dd></div><div><dt>APARIENCIA</dt><dd>Conservada de la referencia</dd></div><div><dt>ESTADO</dt><dd>Guardia · prueba estática</dd></div></dl><a class="asset-link" href="${fighter.portrait}" target="_blank" rel="noopener">ABRIR RETRATO ORIGINAL ↗</a></div></div>
    <p class="dialog-note">El parecido se compara con la ilustración aportada. Las animaciones y las fotos originales de tus amigos corresponden a la siguiente etapa.</p>
  </dialog>
  <dialog id="compare-dialog" class="art-dialog comparison-dialog" aria-labelledby="compare-title">
    <header class="dialog-heading"><div><p>REFERENCIA / ADAPTACIÓN</p><h2 id="compare-title">RECONOCER ANTES<br>DE ANIMAR.</h2></div><button class="close-dialog" aria-label="Cerrar comparación">×</button></header>
    <div class="compare-grid"><figure><figcaption><b>01</b> TU REFERENCIA</figcaption><div class="compare-image reference-image"><img src="${scene.reference}" alt="Ilustración original proporcionada como referencia" /></div></figure><figure><figcaption><b>02</b> PERSONAJE AISLADO</figcaption><div class="compare-image transparency-grid"><img src="${fighter.sprite}" alt="Sprite de cuerpo completo sobre una cuadrícula que muestra su transparencia" /></div></figure><figure><figcaption><b>03</b> ROSTRO EN DETALLE</figcaption><div class="compare-image portrait-image"><img src="${fighter.portrait}" alt="Retrato generado para comparar los rasgos con la referencia" /></div></figure></div>
    <p class="dialog-note">Compara forma del rostro, peinado, silueta y ropa. En la arena usamos el mismo sprite en ambos lados para evaluar escala y legibilidad.</p>
  </dialog>
  <dialog id="menu-dialog" class="menu-dialog" aria-labelledby="menu-title"><button class="close-dialog" aria-label="Cerrar menú">×</button><p class="tiny-label">Amigos y Rivales / VOL. 02</p><h2 id="menu-title">UNA NUEVA<br>ESQUINA.</h2><p>Una prueba de estilo, antes del próximo round.</p><button class="menu-primary close-menu">VOLVER A LA ARENA <span>→</span></button><button class="menu-secondary" data-switch="portrait">EXPLORAR PERSONAJE <span>↗</span></button><button class="menu-secondary" data-switch="compare">COMPARAR REFERENCIA <span>↗</span></button><a class="original-link" href="/">IR AL JUEGO</a><small>Esta pantalla es una prueba visual estática.<br>Las mecánicas y las animaciones están disponibles en el juego.</small></dialog>
`;

const arena = document.querySelector<HTMLElement>(".arena")!;
const viewport = document.querySelector<HTMLElement>(".viewport")!;
function resizeArena() {
  const scale = Math.min(
    viewport.clientWidth / scene.width,
    viewport.clientHeight / scene.height,
  );
  arena.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
new ResizeObserver(resizeArena).observe(viewport);
resizeArena();
const spriteScale =
  fighter.displayHeight /
  (fighter.visibleBounds.bottom - fighter.visibleBounds.top);
for (const [index, x] of [360, 920].entries()) {
  const img = document.querySelector<HTMLElement>(
    index === 0 ? ".fighter-one" : ".fighter-two",
  )!;
  Object.assign(img.style, {
    width: `${fighter.sourceSize.width * spriteScale}px`,
    height: `${fighter.sourceSize.height * spriteScale}px`,
    left: `${x - fighter.groundAnchor.x * spriteScale}px`,
    top: `${scene.groundY - fighter.groundAnchor.y * spriteScale}px`,
  });
}

const dialogByName = (name: string) =>
  document.getElementById(`${name}-dialog`) as HTMLDialogElement;
document
  .querySelectorAll<HTMLButtonElement>("[data-dialog]")
  .forEach((button) => {
    button.addEventListener("click", () =>
      dialogByName(button.dataset.dialog!).showModal(),
    );
  });
document.querySelectorAll<HTMLDialogElement>("dialog").forEach((dialog) => {
  dialog
    .querySelectorAll<HTMLButtonElement>(".close-dialog, .close-menu")
    .forEach((button) => {
      button.addEventListener("click", () => dialog.close());
    });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    }
  });
});
document
  .querySelectorAll<HTMLButtonElement>("[data-switch]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      dialogByName("menu").close();
      dialogByName(button.dataset.switch!).showModal();
    });
  });

const fullscreenButton =
  document.querySelector<HTMLButtonElement>("#fullscreen")!;
const fullscreenStatus = document.getElementById("fullscreen-status")!;
fullscreenButton.addEventListener("click", async () => {
  try {
    // Fullscreen on the root keeps accessible dialogs visible above the arena.
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen();
    else throw new Error("Fullscreen unavailable");
  } catch {
    fullscreenStatus.className = "fullscreen-notice";
    fullscreenStatus.textContent =
      "El navegador no permitió pantalla completa. Puedes usar F11; la arena seguirá ajustándose a la ventana.";
  }
});
document.addEventListener("fullscreenchange", () => {
  const active = Boolean(document.fullscreenElement);
  fullscreenButton.setAttribute("aria-pressed", String(active));
  fullscreenButton.setAttribute(
    "aria-label",
    active ? "Salir de pantalla completa" : "Pantalla completa",
  );
  fullscreenButton.innerHTML = `<svg class="expand-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 2H2v5M13 2h5v5M18 13v5h-5M7 18H2v-5"/></svg> ${active ? "SALIR DE PANTALLA COMPLETA" : "PANTALLA COMPLETA"}`;
  resizeArena();
});

const status = document.getElementById("asset-status")!;
Promise.all(
  Array.from(document.querySelectorAll<HTMLImageElement>("img")).map((img) =>
    img.decode(),
  ),
)
  .then(() => {
    status.hidden = true;
    app.dataset.ready = "true";
  })
  .catch(() => {
    status.textContent =
      "No se pudo cargar una ilustración. Recarga la página para volver a intentarlo.";
    status.classList.add("load-error");
  });
