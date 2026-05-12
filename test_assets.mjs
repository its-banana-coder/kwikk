import { Assets } from "pixi.js";
import { HTMLText } from "pixi.js";

async function run() {
  await Assets.init();
  try {
    await Assets.load({
        name: 'DM Sans',
        src: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400'
    });
    console.log("Loaded successfully!");
  } catch(e) {
    console.log("Error loading", e.message);
  }
}
run();
