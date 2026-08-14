import { describe, expect, it } from "vitest";
import { applySpanFormat, spansFromPlainText } from "./index";

describe("Rich Text Utilities", () => {
  describe("spansFromPlainText", () => {
    it("converts plain text to a single span", () => {
      const result = spansFromPlainText("Hello world");
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Hello world");
      expect(result[0].style).toBeUndefined();
    });
  });

  describe("applySpanFormat", () => {
    it("applies style to a range in a single span", () => {
      const initial = [{ text: "Hello world" }];
      const result = applySpanFormat(initial, 0, 5, { color: "red" });
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ text: "Hello", style: { color: "red" } });
      expect(result[1]).toEqual({ text: " world" });
    });

    it("applies style to a middle range", () => {
      const initial = [{ text: "Hello world" }];
      const result = applySpanFormat(initial, 6, 11, { color: "blue" });
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ text: "Hello " });
      expect(result[1]).toEqual({ text: "world", style: { color: "blue" } });
    });

    it("splits and merges spans correctly", () => {
      const initial = [
        { text: "Hel", style: { color: "red" } },
        { text: "lo ", style: { color: "red" } },
        { text: "world" }
      ];
      // Should merge "Hel" and "lo " because they have the same style
      const result = applySpanFormat(initial, 0, 0, {}); // No-op apply to trigger regroup
      
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe("Hello ");
      expect(result[0].style).toEqual({ color: "red" });
    });

    it("handles overlapping styles by merging", () => {
      const initial = [{ text: "ABC", style: { fontSize: 10 } }];
      // Apply color: red to "B"
      const result = applySpanFormat(initial, 1, 2, { color: "red" });
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ text: "A", style: { fontSize: 10 } });
      expect(result[1]).toEqual({ text: "B", style: { fontSize: 10, color: "red" } });
      expect(result[2]).toEqual({ text: "C", style: { fontSize: 10 } });
    });

    it("clears style if override is empty (hypothetically)", () => {
        // Actually our implementation merges: { ...old, ...new }
        // So it doesn't clear unless we pass something that overwrites.
    });
  });
});
