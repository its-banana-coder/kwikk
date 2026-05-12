const { HTMLText } = require('pixi.js');
const text = new HTMLText({
  text: "<style>@import url('https://fonts.googleapis.com/css2?family=DM+Sans');</style><div>Hello</div>"
});
console.log(text.text);
