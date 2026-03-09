import * as Phaser from "../vendor/phaser.esm.js";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { GameScene } from "./scenes/GameScene.js";

function ensureErrorBanner() {
  let el = document.getElementById("ds15-error-banner");
  if (el) return el;

  el = document.createElement("div");
  el.id = "ds15-error-banner";
  el.style.position = "fixed";
  el.style.left = "12px";
  el.style.right = "12px";
  el.style.bottom = "12px";
  el.style.zIndex = "99999";
  el.style.background = "rgba(160, 20, 20, 0.92)";
  el.style.color = "#fff";
  el.style.padding = "10px 12px";
  el.style.borderRadius = "8px";
  el.style.font = "14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif";
  el.style.display = "none";
  document.body.appendChild(el);
  return el;
}

function showPageError(err) {
  const banner = ensureErrorBanner();
  const msg = typeof err === "string" ? err : err?.message || "未知错误";
  banner.textContent = `页面错误：${msg}`;
  banner.style.display = "block";
}

window.addEventListener("error", (event) => {
  showPageError(event.error || event.message || "脚本执行失败");
});

window.addEventListener("unhandledrejection", (event) => {
  showPageError(event.reason || "Promise 未处理异常");
});

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: 960,
  height: 540,
  backgroundColor: "#1a1915",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene],
};

new Phaser.Game(config);
