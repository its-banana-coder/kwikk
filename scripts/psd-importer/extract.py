"""
PSD → kwikk ProjectDocument importer.

Usage:
    python extract.py path/to/file.psd
    python extract.py path/to/psd_folder/ --out ./kwikk-output

Outputs one .kwikk.json (ProjectDocument) per PSD, plus a design_tokens.json
aggregating the brand palette and typography found across all files.
"""

import json
import sys
import uuid
import argparse
from pathlib import Path

try:
    from psd_tools import PSDImage
except ImportError:
    print("ERROR: psd-tools not installed. Run: pip install -r requirements.txt")
    sys.exit(1)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def new_id() -> str:
    return uuid.uuid4().hex[:16]


def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def clamp_byte(v: float) -> int:
    return max(0, min(255, int(round(v * 255))))


def parse_psd_color(values: list) -> str | None:
    """Parse [alpha, R, G, B] float list (0-1) from PSD engine data to hex."""
    if not values or len(values) < 4:
        return None
    try:
        r, g, b = clamp_byte(values[1]), clamp_byte(values[2]), clamp_byte(values[3])
        return rgb_to_hex(r, g, b)
    except Exception:
        return None


# ─── Text extraction ──────────────────────────────────────────────────────────

def extract_text_info(layer) -> dict:
    """Return text content + style from a psd-tools TypeLayer (kind='type')."""
    result: dict = {}

    try:
        result["text"] = layer.text or ""
    except Exception:
        result["text"] = ""

    try:
        engine = layer.engine_data
        if not engine:
            return result

        engine_dict = engine.get("EngineDict", {})
        resource_dict = engine_dict.get("ResourceDict", {})
        font_set = resource_dict.get("FontSet", [])

        style_runs = engine_dict.get("StyleRun", {}).get("RunArray", [])
        if style_runs:
            ssd = style_runs[0].get("StyleSheet", {}).get("StyleSheetData", {})

            # Font size
            if "FontSize" in ssd:
                result["fontSize"] = int(round(ssd["FontSize"]))

            # Font family
            font_idx = ssd.get("Font", 0)
            if font_set and font_idx < len(font_set):
                name = font_set[font_idx].get("Name", "")
                if name:
                    # Strip PS weight suffixes: "Montserrat-Bold" → "Montserrat"
                    result["fontFamily"] = name.split("-")[0]
                    result["fontFamilyFull"] = name

            # Color
            fill_color = ssd.get("FillColor", {}).get("Values", [])
            if fill_color:
                hex_color = parse_psd_color(fill_color)
                if hex_color:
                    result["color"] = hex_color

            # Weight / style
            result["fontWeight"] = "bold" if ssd.get("FauxBold") else "normal"
            if ssd.get("FauxItalic"):
                result["fontStyle"] = "italic"

            # Letter spacing (thousandths of em in PSD → approximate px/em ratio)
            tracking = ssd.get("Tracking", 0)
            if tracking:
                result["letterSpacing"] = round(tracking / 1000.0 * (result.get("fontSize", 16)), 2)

        # Paragraph alignment
        para_runs = engine_dict.get("ParagraphRun", {}).get("RunArray", [])
        if para_runs:
            align_code = (
                para_runs[0]
                .get("ParagraphSheet", {})
                .get("Properties", {})
                .get("Justification", 0)
            )
            result["textAlign"] = {0: "left", 1: "right", 2: "center", 3: "justify"}.get(
                align_code, "left"
            )

    except Exception:
        pass

    return result


# ─── Semantic role inference ───────────────────────────────────────────────────

def infer_semantic_role(
    layer, layer_type: str, style: dict, canvas_w: int, canvas_h: int, font_sizes: list[int]
) -> str:
    if layer_type == "text":
        size = style.get("fontSize", 16)
        if not font_sizes:
            return "subtitle"
        max_size = max(font_sizes)
        min_size = min(font_sizes)
        if size >= max_size * 0.85:
            return "headline"
        if len(font_sizes) > 2 and size <= min_size * 1.2:
            return "caption"
        return "subtitle"

    if layer_type == "image":
        area = (layer.width * layer.height) / (canvas_w * canvas_h + 1)
        top_ratio = layer.top / canvas_h
        if area > 0.55:
            return "background"
        if top_ratio < 0.18 and layer.width < canvas_w * 0.35:
            return "logo"
        return "product_image"

    if layer_type == "shape":
        area = (layer.width * layer.height) / (canvas_w * canvas_h + 1)
        return "background" if area > 0.5 else "decoration"

    return "decoration"


# ─── Layer → ElementNode ──────────────────────────────────────────────────────

def layer_to_element(layer, z_index: int, canvas_w: int, canvas_h: int, font_sizes: list[int]) -> dict | None:
    kind = layer.kind  # 'type', 'pixel', 'smartobject', 'shape', 'solidcolor', 'fill', 'group', etc.

    if kind == "group":
        return None

    layout = {
        "x": layer.left,
        "y": layer.top,
        "width": max(1, layer.width),
        "height": max(1, layer.height),
        "rotation": 0,
        "scale": 1,
        "opacity": round(layer.opacity / 255.0, 3),
        "zIndex": z_index,
    }

    style: dict = {}
    content: dict = {}

    if kind == "type":
        layer_type = "text"
        info = extract_text_info(layer)
        content["text"] = info.get("text", "")
        if "fontSize" in info:
            style["fontSize"] = info["fontSize"]
        if "fontFamily" in info:
            style["fontFamily"] = info["fontFamily"]
        if "color" in info:
            style["color"] = info["color"]
        if "fontWeight" in info:
            style["fontWeight"] = info["fontWeight"]
        if "fontStyle" in info:
            style["fontStyle"] = info["fontStyle"]
        if "textAlign" in info:
            style["textAlign"] = info["textAlign"]
        if "letterSpacing" in info:
            style["letterSpacing"] = info["letterSpacing"]

    elif kind in ("pixel", "smartobject"):
        layer_type = "image"
        # src left empty — user maps their own assets

    elif kind in ("shape", "solidcolor", "fill"):
        layer_type = "shape"
        content["shape"] = "rectangle"
        # Attempt fill color extraction
        try:
            if hasattr(layer, "fill") and layer.fill is not None:
                fill = layer.fill
                if hasattr(fill, "color") and fill.color is not None:
                    c = fill.color
                    if hasattr(c, "red"):  # RGB color object
                        style["backgroundColor"] = rgb_to_hex(
                            int(c.red), int(c.green), int(c.blue)
                        )
        except Exception:
            pass

    else:
        # Rasterized / adjustment / other — treat as image placeholder
        layer_type = "image"

    semantic_role = infer_semantic_role(layer, layer_type, style, canvas_w, canvas_h, font_sizes)

    node = {
        "id": new_id(),
        "type": layer_type,
        "semanticRole": semantic_role,
        "layout": layout,
        "style": style,
        "animations": [],
        "content": content,
    }

    if not layer.visible:
        node["layout"]["visible"] = False

    return node


# ─── Color sampling (PIL composite) ──────────────────────────────────────────

def sample_dominant_colors(psd, n: int = 10) -> list[str]:
    """Composite the PSD and return the N most dominant hex colors."""
    try:
        from PIL import Image

        img = psd.compose()
        if img is None:
            return []
        img = img.convert("RGB").resize((80, 80), Image.LANCZOS)
        pixels = list(img.getdata())

        # Quantize to 32-step buckets so nearby colors merge
        freq: dict[tuple, int] = {}
        for r, g, b in pixels:
            key = (r >> 5 << 5, g >> 5 << 5, b >> 5 << 5)
            freq[key] = freq.get(key, 0) + 1

        sorted_colors = sorted(freq.items(), key=lambda x: -x[1])
        return [rgb_to_hex(*c) for c, _ in sorted_colors[:n]]
    except Exception:
        return []


# ─── Main converter ───────────────────────────────────────────────────────────

def psd_to_project(psd_path: Path) -> tuple[dict, list[str], list[str]]:
    """Return (ProjectDocument dict, dominant_colors, font_families)."""
    psd = PSDImage.open(psd_path)
    canvas_w, canvas_h = psd.width, psd.height
    name = psd_path.stem

    # Collect font sizes first (needed for semantic role inference)
    font_sizes: list[int] = []
    for layer in psd.descendants():
        if layer.kind == "type":
            info = extract_text_info(layer)
            if "fontSize" in info:
                font_sizes.append(info["fontSize"])

    # Build elements; PSD layers are ordered top→bottom visually,
    # descendants() returns them in document order (top layer = index 0).
    # Reverse so index 0 = bottom → low z-index.
    all_layers = [l for l in psd.descendants() if l.kind != "group"]
    all_layers_reversed = list(reversed(all_layers))

    elements: list[dict] = []
    for z_index, layer in enumerate(all_layers_reversed):
        node = layer_to_element(layer, z_index, canvas_w, canvas_h, font_sizes)
        if node is not None:
            elements.append(node)

    # Dominant colors
    dominant_colors = sample_dominant_colors(psd)

    # Infer brand theme
    bg_candidates = [e for e in elements if e.get("semanticRole") == "background"]
    bg_color = (
        bg_candidates[0].get("style", {}).get("backgroundColor")
        if bg_candidates
        else (dominant_colors[0] if dominant_colors else "#ffffff")
    )

    text_colors = [
        e["style"]["color"]
        for e in elements
        if e.get("type") == "text" and e.get("style", {}).get("color")
    ]

    fonts = list(
        dict.fromkeys(  # preserve insertion order, deduplicate
            e["style"]["fontFamily"]
            for e in elements
            if e.get("type") == "text" and e.get("style", {}).get("fontFamily")
        )
    )

    accent_candidates = [c for c in dominant_colors if c != bg_color]

    brand_theme: dict = {}
    if bg_color:
        brand_theme["backgroundColor"] = bg_color
    if text_colors:
        brand_theme["primaryColor"] = text_colors[0]
    if accent_candidates:
        brand_theme["accentColor"] = accent_candidates[0]
    if fonts:
        brand_theme["primaryFont"] = fonts[0]
    if len(fonts) > 1:
        brand_theme["secondaryFont"] = fonts[1]

    scene = {
        "id": new_id(),
        "name": name,
        "durationMs": 5000,
        "elements": elements,
        "compositions": [],
        "background": {"color": bg_color} if bg_color else {},
    }

    project = {
        "id": new_id(),
        "name": name,
        "scenes": [scene],
        "timelineTracks": [],
        "viewport": {"width": canvas_w, "height": canvas_h},
        "brandTheme": brand_theme,
        "assets": [],
    }

    return project, dominant_colors, fonts


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Convert PSD files to kwikk ProjectDocument JSON"
    )
    parser.add_argument("input", help="PSD file or directory of PSD files")
    parser.add_argument("--out", default="./kwikk-output", help="Output directory (default: ./kwikk-output)")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    input_path = Path(args.input)
    if input_path.is_dir():
        psd_files = sorted(input_path.glob("*.psd")) + sorted(input_path.glob("*.PSD"))
    elif input_path.is_file():
        psd_files = [input_path]
    else:
        print(f"ERROR: {input_path} not found")
        sys.exit(1)

    if not psd_files:
        print("No PSD files found.")
        sys.exit(1)

    all_colors: list[str] = []
    all_fonts: list[str] = []

    for psd_path in psd_files:
        print(f"Processing {psd_path.name} ...", end=" ", flush=True)
        try:
            project, colors, fonts = psd_to_project(psd_path)
            out_file = out_dir / f"{psd_path.stem}.kwikk.json"
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(project, f, indent=2, ensure_ascii=False)
            all_colors.extend(colors)
            all_fonts.extend([f for f in fonts if f])
            n_elements = len(project["scenes"][0]["elements"])
            print(f"OK  ({n_elements} elements → {out_file.name})")
        except Exception as e:
            print(f"FAILED: {e}")

    # Aggregate design tokens across all PSDs
    color_freq: dict[str, int] = {}
    for c in all_colors:
        color_freq[c] = color_freq.get(c, 0) + 1

    font_freq: dict[str, int] = {}
    for f in all_fonts:
        font_freq[f] = font_freq.get(f, 0) + 1

    sorted_colors = [c for c, _ in sorted(color_freq.items(), key=lambda x: -x[1])]
    sorted_fonts = [f for f, _ in sorted(font_freq.items(), key=lambda x: -x[1])]

    design_tokens = {
        "dominantColors": sorted_colors[:12],
        "fonts": sorted_fonts[:6],
        "suggestedBrandTheme": {
            "primaryFont": sorted_fonts[0] if sorted_fonts else None,
            "secondaryFont": sorted_fonts[1] if len(sorted_fonts) > 1 else None,
            "backgroundColor": sorted_colors[0] if sorted_colors else None,
            "accentColor": sorted_colors[1] if len(sorted_colors) > 1 else None,
        },
    }

    tokens_file = out_dir / "design_tokens.json"
    with open(tokens_file, "w", encoding="utf-8") as f:
        json.dump(design_tokens, f, indent=2)

    print(f"\n✓ {len(psd_files)} file(s) processed")
    print(f"  Design tokens → {tokens_file}")
    print(f"  Projects      → {out_dir}/")


if __name__ == "__main__":
    main()
