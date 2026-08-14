export interface LayoutKeyframe {
  offset: number;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
}

export const ANIMATE_STYLE_KEYFRAMES: Record<string, LayoutKeyframe[]> = {
  "backInDown": [
    {offset: 0.0, x: 0.0, y: -1200.0, scale: 0.7, rotation: 0.0, opacity: 0.7},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 0.7, rotation: 0.0, opacity: 0.7},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "backInLeft": [
    {offset: 0.0, x: -2000.0, y: 0.0, scale: 0.7, rotation: 0.0, opacity: 0.7},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 0.7, rotation: 0.0, opacity: 0.7},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "backInRight": [
    {offset: 0.0, x: 2000.0, y: 0.0, scale: 0.7, rotation: 0.0, opacity: 0.7},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 0.7, rotation: 0.0, opacity: 0.7},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "backInUp": [
    {offset: 0.0, x: 0.0, y: 1200.0, scale: 0.7, rotation: 0.0, opacity: 0.7},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 0.7, rotation: 0.0, opacity: 0.7},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "backOutDown": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 0.2, x: 0.0, y: 0.0, scale: 0.7, rotation: 0.0, opacity: 0.7},
    {offset: 1.0, x: 0.0, y: 700.0, scale: 0.7, rotation: 0.0, opacity: 0.7}
  ],
  "backOutLeft": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 0.2, x: 0.0, y: 0.0, scale: 0.7, rotation: 0.0, opacity: 0.7},
    {offset: 1.0, x: -2000.0, y: 0.0, scale: 0.7, rotation: 0.0, opacity: 0.7}
  ],
  "backOutRight": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 0.2, x: 0.0, y: 0.0, scale: 0.7, rotation: 0.0, opacity: 0.7},
    {offset: 1.0, x: 2000.0, y: 0.0, scale: 0.7, rotation: 0.0, opacity: 0.7}
  ],
  "backOutUp": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 0.2, x: 0.0, y: 0.0, scale: 0.7, rotation: 0.0, opacity: 0.7},
    {offset: 1.0, x: 0.0, y: -700.0, scale: 0.7, rotation: 0.0, opacity: 0.7}
  ],
  "bounce": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.2, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.4, x: 0.0, y: -30.0, scale: 1.1, rotation: 0.0},
    {offset: 0.43, x: 0.0, y: -30.0, scale: 1.1, rotation: 0.0},
    {offset: 0.53, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.7, x: 0.0, y: -15.0, scale: 1.05, rotation: 0.0},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 0.95, rotation: 0.0},
    {offset: 0.9, x: 0.0, y: -4.0, scale: 1.02, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "bounceIn": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 0.3, rotation: 0.0, opacity: 0.0},
    {offset: 0.2, x: 0.0, y: 0.0, scale: 1.1, rotation: 0.0},
    {offset: 0.4, x: 0.0, y: 0.0, scale: 0.9, rotation: 0.0},
    {offset: 0.6, x: 0.0, y: 0.0, scale: 1.03, rotation: 0.0, opacity: 1.0},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 0.97, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "bounceInDown": [
    {offset: 0.0, x: 0.0, y: -3000.0, scale: 3.0, rotation: 0.0, opacity: 0.0},
    {offset: 0.6, x: 0.0, y: 25.0, scale: 0.9, rotation: 0.0, opacity: 1.0},
    {offset: 0.75, x: 0.0, y: -10.0, scale: 0.95, rotation: 0.0},
    {offset: 0.9, x: 0.0, y: 5.0, scale: 0.985, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "bounceInLeft": [
    {offset: 0.0, x: -3000.0, y: 0.0, scale: 3.0, rotation: 0.0, opacity: 0.0},
    {offset: 0.6, x: 25.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 0.75, x: -10.0, y: 0.0, scale: 0.98, rotation: 0.0},
    {offset: 0.9, x: 5.0, y: 0.0, scale: 0.995, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "bounceInRight": [
    {offset: 0.0, x: 3000.0, y: 0.0, scale: 3.0, rotation: 0.0, opacity: 0.0},
    {offset: 0.6, x: -25.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 0.75, x: 10.0, y: 0.0, scale: 0.98, rotation: 0.0},
    {offset: 0.9, x: -5.0, y: 0.0, scale: 0.995, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "bounceInUp": [
    {offset: 0.0, x: 0.0, y: 3000.0, scale: 5.0, rotation: 0.0, opacity: 0.0},
    {offset: 0.6, x: 0.0, y: -20.0, scale: 0.9, rotation: 0.0, opacity: 1.0},
    {offset: 0.75, x: 0.0, y: 10.0, scale: 0.95, rotation: 0.0},
    {offset: 0.9, x: 0.0, y: -5.0, scale: 0.985, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "bounceOut": [
    {offset: 0.2, x: 0.0, y: 0.0, scale: 0.9, rotation: 0.0},
    {offset: 0.5, x: 0.0, y: 0.0, scale: 1.1, rotation: 0.0, opacity: 1.0},
    {offset: 0.55, x: 0.0, y: 0.0, scale: 1.1, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 0.3, rotation: 0.0, opacity: 0.0}
  ],
  "bounceOutDown": [
    {offset: 0.2, x: 0.0, y: 10.0, scale: 0.985, rotation: 0.0},
    {offset: 0.4, x: 0.0, y: -20.0, scale: 0.9, rotation: 0.0, opacity: 1.0},
    {offset: 0.45, x: 0.0, y: -20.0, scale: 0.9, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: 2000.0, scale: 3.0, rotation: 0.0, opacity: 0.0}
  ],
  "bounceOutLeft": [
    {offset: 0.2, x: 20.0, y: 0.0, scale: 0.9, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: -2000.0, y: 0.0, scale: 2.0, rotation: 0.0, opacity: 0.0}
  ],
  "bounceOutRight": [
    {offset: 0.2, x: -20.0, y: 0.0, scale: 0.9, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: 2000.0, y: 0.0, scale: 2.0, rotation: 0.0, opacity: 0.0}
  ],
  "bounceOutUp": [
    {offset: 0.2, x: 0.0, y: -10.0, scale: 0.985, rotation: 0.0},
    {offset: 0.4, x: 0.0, y: 20.0, scale: 0.9, rotation: 0.0, opacity: 1.0},
    {offset: 0.45, x: 0.0, y: 20.0, scale: 0.9, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: -2000.0, scale: 3.0, rotation: 0.0, opacity: 0.0}
  ],
  "fadeIn": [
    {offset: 0.0, opacity: 0.0},
    {offset: 1.0, opacity: 1.0}
  ],
  "fadeInBottomLeft": [
    {offset: 0.0, x: -300.0, y: 200.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "fadeInBottomRight": [
    {offset: 0.0, x: 300.0, y: 200.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "fadeInDown": [
    {offset: 0.0, x: 0.0, y: -200.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "fadeInDownBig": [
    {offset: 0.0, x: 0.0, y: -2000.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "fadeInLeft": [
    {offset: 0.0, x: -300.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "fadeInLeftBig": [
    {offset: 0.0, x: -2000.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "fadeInRight": [
    {offset: 0.0, x: 300.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "fadeInRightBig": [
    {offset: 0.0, x: 2000.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "fadeInTopLeft": [
    {offset: 0.0, x: -300.0, y: -200.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "fadeInTopRight": [
    {offset: 0.0, x: 300.0, y: -200.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "fadeInUp": [
    {offset: 0.0, x: 0.0, y: 200.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "fadeInUpBig": [
    {offset: 0.0, x: 0.0, y: 2000.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "fadeOut": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, opacity: 0.0}
  ],
  "fadeOutBottomLeft": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: -300.0, y: 200.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "fadeOutBottomRight": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: 300.0, y: 200.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "fadeOutDown": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: 200.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "fadeOutDownBig": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: 2000.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "fadeOutLeft": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: -300.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "fadeOutLeftBig": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: -2000.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "fadeOutRight": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: 300.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "fadeOutRightBig": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: 2000.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "fadeOutTopLeft": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: -300.0, y: -200.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "fadeOutTopRight": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: 300.0, y: -200.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "fadeOutUp": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: -200.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "fadeOutUpBig": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: -2000.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "flash": [
    {offset: 0.0, opacity: 1.0},
    {offset: 0.25, opacity: 0.0},
    {offset: 0.5, opacity: 1.0},
    {offset: 0.75, opacity: 0.0},
    {offset: 1.0, opacity: 1.0}
  ],
  "flip": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.4, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.5, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 0.95, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "flipInX": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 0.4, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.6, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "flipInY": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 0.4, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.6, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "flipOutX": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.3, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "flipOutY": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.3, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "headShake": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.065, x: -6.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.185, x: 5.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.315, x: -3.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.435, x: 2.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.5, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "heartBeat": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.14, x: 0.0, y: 0.0, scale: 1.3, rotation: 0.0},
    {offset: 0.28, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.42, x: 0.0, y: 0.0, scale: 1.3, rotation: 0.0},
    {offset: 0.7, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "hinge": [
    {offset: 0.2, x: 0.0, y: 0.0, scale: 1.0, rotation: 80.0},
    {offset: 0.4, x: 0.0, y: 0.0, scale: 1.0, rotation: 60.0, opacity: 1.0},
    {offset: 0.6, x: 0.0, y: 0.0, scale: 1.0, rotation: 80.0},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 1.0, rotation: 60.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: 700.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "jackInTheBox": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 0.1, rotation: 30.0, opacity: 0.0},
    {offset: 0.5, x: 0.0, y: 0.0, scale: 1.0, rotation: -10.0},
    {offset: 0.7, x: 0.0, y: 0.0, scale: 1.0, rotation: 3.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "jello": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.111, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.222, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.33299999999999996, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.444, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.555, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.6659999999999999, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.777, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.888, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "lightSpeedInLeft": [
    {offset: 0.0, x: -300.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 0.6, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "lightSpeedInRight": [
    {offset: 0.0, x: 300.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0},
    {offset: 0.6, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "lightSpeedOutLeft": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: -300.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "lightSpeedOutRight": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: 300.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 0.0}
  ],
  "pulse": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.5, x: 0.0, y: 0.0, scale: 1.05, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "rollIn": [
    {offset: 0.0, x: -300.0, y: 0.0, scale: 1.0, rotation: -120.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "rollOut": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: 300.0, y: 0.0, scale: 1.0, rotation: 120.0, opacity: 0.0}
  ],
  "rotateIn": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: -200.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "rotateInDownLeft": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: -45.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "rotateInDownRight": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 45.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "rotateInUpLeft": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 45.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "rotateInUpRight": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: -90.0, opacity: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0, opacity: 1.0}
  ],
  "rotateOut": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 200.0, opacity: 0.0}
  ],
  "rotateOutDownLeft": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 45.0, opacity: 0.0}
  ],
  "rotateOutDownRight": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: -45.0, opacity: 0.0}
  ],
  "rotateOutUpLeft": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: -45.0, opacity: 0.0}
  ],
  "rotateOutUpRight": [
    {offset: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 90.0, opacity: 0.0}
  ],
  "rubberBand": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.3, x: 0.0, y: 0.0, scale: 1.25, rotation: 0.0},
    {offset: 0.4, x: 0.0, y: 0.0, scale: 0.75, rotation: 0.0},
    {offset: 0.5, x: 0.0, y: 0.0, scale: 1.15, rotation: 0.0},
    {offset: 0.65, x: 0.0, y: 0.0, scale: 0.95, rotation: 0.0},
    {offset: 0.75, x: 0.0, y: 0.0, scale: 1.05, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "shakeX": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.1, x: -10.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.2, x: 10.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.3, x: -10.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.4, x: 10.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.5, x: -10.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.6, x: 10.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.7, x: -10.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.8, x: 10.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.9, x: -10.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "shakeY": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.1, x: 0.0, y: -10.0, scale: 1.0, rotation: 0.0},
    {offset: 0.2, x: 0.0, y: 10.0, scale: 1.0, rotation: 0.0},
    {offset: 0.3, x: 0.0, y: -10.0, scale: 1.0, rotation: 0.0},
    {offset: 0.4, x: 0.0, y: 10.0, scale: 1.0, rotation: 0.0},
    {offset: 0.5, x: 0.0, y: -10.0, scale: 1.0, rotation: 0.0},
    {offset: 0.6, x: 0.0, y: 10.0, scale: 1.0, rotation: 0.0},
    {offset: 0.7, x: 0.0, y: -10.0, scale: 1.0, rotation: 0.0},
    {offset: 0.8, x: 0.0, y: 10.0, scale: 1.0, rotation: 0.0},
    {offset: 0.9, x: 0.0, y: -10.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "slideInDown": [
    {offset: 0.0, x: 0.0, y: -200.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "slideInLeft": [
    {offset: 0.0, x: -300.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "slideInRight": [
    {offset: 0.0, x: 300.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "slideInUp": [
    {offset: 0.0, x: 0.0, y: 200.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "slideOutDown": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: 200.0, scale: 1.0, rotation: 0.0}
  ],
  "slideOutLeft": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: -300.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "slideOutRight": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 300.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "slideOutUp": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 1.0, x: 0.0, y: -200.0, scale: 1.0, rotation: 0.0}
  ],
  "swing": [
    {offset: 0.2, x: 0.0, y: 0.0, scale: 1.0, rotation: 15.0},
    {offset: 0.4, x: 0.0, y: 0.0, scale: 1.0, rotation: -10.0},
    {offset: 0.6, x: 0.0, y: 0.0, scale: 1.0, rotation: 5.0},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 1.0, rotation: -5.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "tada": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.1, x: 0.0, y: 0.0, scale: 0.9, rotation: -3.0},
    {offset: 0.2, x: 0.0, y: 0.0, scale: 0.9, rotation: -3.0},
    {offset: 0.3, x: 0.0, y: 0.0, scale: 1.1, rotation: 3.0},
    {offset: 0.4, x: 0.0, y: 0.0, scale: 1.1, rotation: -3.0},
    {offset: 0.5, x: 0.0, y: 0.0, scale: 1.1, rotation: 3.0},
    {offset: 0.6, x: 0.0, y: 0.0, scale: 1.1, rotation: -3.0},
    {offset: 0.7, x: 0.0, y: 0.0, scale: 1.1, rotation: 3.0},
    {offset: 0.8, x: 0.0, y: 0.0, scale: 1.1, rotation: -3.0},
    {offset: 0.9, x: 0.0, y: 0.0, scale: 1.1, rotation: 3.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "wobble": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0},
    {offset: 0.15, x: -75.0, y: 0.0, scale: 1.0, rotation: -5.0},
    {offset: 0.3, x: 60.0, y: 0.0, scale: 1.0, rotation: 3.0},
    {offset: 0.45, x: -45.0, y: 0.0, scale: 1.0, rotation: -3.0},
    {offset: 0.6, x: 30.0, y: 0.0, scale: 1.0, rotation: 2.0},
    {offset: 0.75, x: -15.0, y: 0.0, scale: 1.0, rotation: -1.0},
    {offset: 1.0, x: 0.0, y: 0.0, scale: 1.0, rotation: 0.0}
  ],
  "zoomIn": [
    {offset: 0.0, x: 0.0, y: 0.0, scale: 0.3, rotation: 0.0, opacity: 0.0},
    {offset: 0.5, opacity: 1.0}
  ],
  "zoomInDown": [
    {offset: 0.0, x: 0.0, y: -1000.0, scale: 0.1, rotation: 0.0, opacity: 0.0},
    {offset: 0.6, x: 0.0, y: 60.0, scale: 0.475, rotation: 0.0, opacity: 1.0}
  ],
  "zoomInLeft": [
    {offset: 0.0, x: -1000.0, y: 0.0, scale: 0.1, rotation: 0.0, opacity: 0.0},
    {offset: 0.6, x: 10.0, y: 0.0, scale: 0.475, rotation: 0.0, opacity: 1.0}
  ],
  "zoomInRight": [
    {offset: 0.0, x: 1000.0, y: 0.0, scale: 0.1, rotation: 0.0, opacity: 0.0},
    {offset: 0.6, x: -10.0, y: 0.0, scale: 0.475, rotation: 0.0, opacity: 1.0}
  ],
  "zoomInUp": [
    {offset: 0.0, x: 0.0, y: 1000.0, scale: 0.1, rotation: 0.0, opacity: 0.0},
    {offset: 0.6, x: 0.0, y: -60.0, scale: 0.475, rotation: 0.0, opacity: 1.0}
  ],
  "zoomOut": [
    {offset: 0.0, opacity: 1.0},
    {offset: 0.5, x: 0.0, y: 0.0, scale: 0.3, rotation: 0.0, opacity: 0.0},
    {offset: 1.0, opacity: 0.0}
  ],
  "zoomOutDown": [
    {offset: 0.4, x: 0.0, y: -60.0, scale: 0.475, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: 2000.0, scale: 0.1, rotation: 0.0, opacity: 0.0}
  ],
  "zoomOutLeft": [
    {offset: 0.4, x: 42.0, y: 0.0, scale: 0.475, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: -2000.0, y: 0.0, scale: 0.1, rotation: 0.0, opacity: 0.0}
  ],
  "zoomOutRight": [
    {offset: 0.4, x: -42.0, y: 0.0, scale: 0.475, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: 2000.0, y: 0.0, scale: 0.1, rotation: 0.0, opacity: 0.0}
  ],
  "zoomOutUp": [
    {offset: 0.4, x: 0.0, y: 60.0, scale: 0.475, rotation: 0.0, opacity: 1.0},
    {offset: 1.0, x: 0.0, y: -2000.0, scale: 0.1, rotation: 0.0, opacity: 0.0}
  ],
};

export function interpolateLayoutKeyframes(keyframes: LayoutKeyframe[], progress: number): Omit<LayoutKeyframe, 'offset'> {
  if (keyframes.length === 0) return {};
  if (progress <= keyframes[0].offset) {
    const { offset, ...rest } = keyframes[0];
    return rest;
  }
  if (progress >= keyframes[keyframes.length - 1].offset) {
    const { offset, ...rest } = keyframes[keyframes.length - 1];
    return rest;
  }
  
  let idx = 0;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (progress >= keyframes[i].offset && progress <= keyframes[i+1].offset) {
      idx = i;
      break;
    }
  }
  
  const kf0 = keyframes[idx];
  const kf1 = keyframes[idx + 1];
  const range = kf1.offset - kf0.offset;
  const p = range === 0 ? 0 : (progress - kf0.offset) / range;
  
  const result: Omit<LayoutKeyframe, 'offset'> = {};
  
  if (kf0.x !== undefined && kf1.x !== undefined) {
    result.x = kf0.x + (kf1.x - kf0.x) * p;
  }
  if (kf0.y !== undefined && kf1.y !== undefined) {
    result.y = kf0.y + (kf1.y - kf0.y) * p;
  }
  if (kf0.scale !== undefined && kf1.scale !== undefined) {
    result.scale = kf0.scale + (kf1.scale - kf0.scale) * p;
  }
  if (kf0.rotation !== undefined && kf1.rotation !== undefined) {
    result.rotation = kf0.rotation + (kf1.rotation - kf0.rotation) * p;
  }
  if (kf0.opacity !== undefined && kf1.opacity !== undefined) {
    result.opacity = kf0.opacity + (kf1.opacity - kf0.opacity) * p;
  }
  
  return result;
}