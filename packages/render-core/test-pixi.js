import * as pixi from 'pixi.js';

async function test() {
  console.log("Pixi version:", pixi.VERSION);
  try {
    const sprite = pixi.Sprite.from("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");
    console.log("Sprite created:", !!sprite);
  } catch (e) {
    console.error("Sprite.from failed:", e.message);
  }
}
test();
