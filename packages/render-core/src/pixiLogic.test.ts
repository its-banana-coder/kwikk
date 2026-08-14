import { describe, expect, it } from "vitest";
import { layoutTextSegments } from "./index";

// Mock PixiJS classes
class MockContainer {
  children: any[] = [];
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  addChild(child: any) {
    this.children.push(child);
  }
  removeChildren() {}
}

class MockText extends MockContainer {
  text: string;
  style: any;
  constructor(options: { text: string; style: any }) {
    super();
    this.text = options.text;
    this.style = options.style;
    // Mock widths: roughly 10px per character for testing layout
    this.width = options.text.length * 10;
    this.height = 20;
  }
}

const mockPixi = {
  Container: MockContainer,
  Text: MockText,
  Graphics: class extends MockContainer {
    roundRect() { return this; }
    fill() { return this; }
    rect() { return this; }
    stroke() { return this; }
    circle() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
  },
} as any;

describe("layoutTextSegments logic", () => {
  it("wraps text when it exceeds maxWidth", () => {
    const spans = [{ text: "word1 word2 word3" }];
    const baseStyle = { fontSize: 20, fontFamily: "Inter", fontWeight: "400" as any, fontStyle: "normal", fill: "#000" };
    // Each word+space is roughly 60px (6 chars * 10px). 
    // Max width 100px should wrap after "word1 "
    
    const container = layoutTextSegments(mockPixi, spans, baseStyle, 100, "left");
    
    // We expect 3 lines (word1, word2, word3)
    const lineYValues = new Set(container.children.map(c => c.y));
    expect(lineYValues.size).toBe(3);
  });

  it("centers text horizontally", () => {
    const spans = [{ text: "word1" }]; // 50px
    const baseStyle = { fontSize: 20, fontFamily: "Inter", fontWeight: "400" as any, fontStyle: "normal", fill: "#000" };
    const maxWidth = 200;
    
    const container = layoutTextSegments(mockPixi, spans, baseStyle, maxWidth, "center");
    
    const textNode = container.children[0];
    // Offset should be (200 - 50) / 2 = 75
    expect(textNode.x).toBe(75);
  });

  it("aligns text to the right", () => {
    const spans = [{ text: "word1" }]; // 50px
    const baseStyle = { fontSize: 20, fontFamily: "Inter", fontWeight: "400" as any, fontStyle: "normal", fill: "#000" };
    const maxWidth = 200;
    
    const container = layoutTextSegments(mockPixi, spans, baseStyle, maxWidth, "right");
    
    const textNode = container.children[0];
    // Offset should be 200 - 50 = 150
    expect(textNode.x).toBe(150);
  });

  it("handles explicit newlines", () => {
    const spans = [{ text: "line1\nline2" }];
    const baseStyle = { fontSize: 20, fontFamily: "Inter", fontWeight: "400" as any, fontStyle: "normal", fill: "#000" };
    
    const container = layoutTextSegments(mockPixi, spans, baseStyle, 500, "left");
    
    const lineYValues = new Set(container.children.map(c => c.y));
    expect(lineYValues.size).toBe(2);
  });
});
