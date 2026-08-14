/** @vitest-environment happy-dom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { MantineProvider } from "@mantine/core";
import { createPrototypeProject } from "@kwikk/scene-graph";
import type { ElementNode, ProjectDocument } from "@kwikk/shared-types";
import { ElementInspector, ImageInspector, VideoInspector } from "./App";

const MOTION_PRESET_FIXTURES = [
  { id: 1, name: "Slide Left In", category: "", animations: [{ id: "seed_0", type: "slideLeft", startMs: 0, durationMs: 400 }] },
];

beforeEach(() => {
  vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/v1/motion-presets")) {
      return new Response(JSON.stringify(MOTION_PRESET_FIXTURES), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const MantineTestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

const renderWithMantine = (element: JSX.Element) =>
  render(element, { wrapper: MantineTestWrapper });

function makeTextElement(): ElementNode {
  return {
    id: "text-element-1",
    type: "text",
    semanticRole: "heading",
    content: {
      text: "Hello world",
      label: "Headline",
    },
    style: {
      fontFamily: "Inter",
      fontSize: 48,
      fontWeight: 400,
      textTransform: "none",
      color: "#000000",
      backgroundColor: "#ffffff",
      fontStyle: "normal",
    },
    layout: {
      x: 0,
      y: 0,
      width: 400,
      height: 120,
      scale: 1,
      opacity: 1,
      rotation: 0,
      zIndex: 0,
      flipX: false,
      flipY: false,
      locked: false,
      visible: true,
    },
    animations: [],
  };
}

function makeImageElement(): ElementNode {
  return {
    id: "image-element-1",
    type: "image",
    semanticRole: "photo",
    content: {
      src: "https://example.com/image.jpg",
      label: "Photo",
      frame: undefined,
    },
    style: {
      blendMode: "normal",
      filters: {},
    },
    layout: {
      x: 0,
      y: 0,
      width: 300,
      height: 180,
      scale: 1,
      opacity: 1,
      rotation: 0,
      zIndex: 0,
      flipX: false,
      flipY: false,
      locked: false,
      visible: true,
    },
    animations: [],
  };
}

function makeVideoElement(): ElementNode {
  return {
    id: "video-element-1",
    type: "video",
    semanticRole: "clip",
    content: {
      src: "https://example.com/video.mp4",
      label: "Clip",
      videoDurationMs: 120000,
      trimStartMs: 0,
      trimEndMs: 120000,
      playbackRate: 1,
    },
    style: {
      filters: {},
    },
    layout: {
      x: 0,
      y: 0,
      width: 480,
      height: 270,
      scale: 1,
      opacity: 1,
      rotation: 0,
      zIndex: 0,
      flipX: false,
      flipY: false,
      locked: false,
      visible: true,
    },
    animations: [],
  };
}



function changeSelectValue(testId: string, optionText: string) {
  const selectRoot = screen.getByTestId(testId);
  fireEvent.mouseDown(selectRoot);
  const option = screen.getByText(optionText);
  fireEvent.click(option);
}

function getNumberInput(testId: string) {
  const element = screen.getByTestId(testId);
  if (element instanceof HTMLInputElement) {
    return element;
  }

  const input = element.querySelector<HTMLInputElement>("input");
  if (!input) {
    throw new Error(`Number input for ${testId} not found`);
  }
  return input;
}

function getSlider(testId: string) {
  const element = screen.getByTestId(testId);
  if (element instanceof HTMLInputElement) {
    return element;
  }

  const sliderThumb = element.querySelector<HTMLElement>("[role=slider]");
  if (sliderThumb) {
    return sliderThumb;
  }

  let input = element.querySelector<HTMLInputElement>("input[type=range], input[type=hidden]");
  if (!input) {
    input = element.querySelector<HTMLInputElement>("input");
  }

  if (!input) {
    throw new Error(`Slider input for ${testId} not found`);
  }
  return input;
}

function getSwitch(testId: string) {
  const element = screen.getByTestId(testId);
  if (element instanceof HTMLInputElement) {
    return element;
  }

  const input = element.querySelector<HTMLInputElement>("input[type=checkbox]");
  if (!input) {
    throw new Error(`Switch input for ${testId} not found`);
  }
  return input;
}



describe("ElementInspector text options", () => {
  let project: ProjectDocument;
  let selectedSceneId: string;
  let textElement: ElementNode;
  let onUpdateElement: ReturnType<typeof vi.fn>;
  let onDispatchOperation: ReturnType<typeof vi.fn>;
  let onDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    project = createPrototypeProject();
    selectedSceneId = project.scenes[0].id;
    textElement = makeTextElement();
    onUpdateElement = vi.fn();
    onDispatchOperation = vi.fn();
    onDelete = vi.fn();
  });

  it("updates label, text, font size and text style options", () => {
    renderWithMantine(
      <ElementInspector
        selectedSceneId={selectedSceneId}
        selectedElement={textElement}
        project={project}
        onUpdateElement={onUpdateElement}
        onDispatchOperation={onDispatchOperation}
        onDelete={onDelete}
        textSelectionRange={null}
      />
    );

    fireEvent.change(screen.getByTestId("text-label"), { target: { value: "New heading" } });
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      textElement.id,
      expect.objectContaining({ content: expect.objectContaining({ label: "New heading" }) })
    );


    fireEvent.change(screen.getByTestId("text-content"), { target: { value: "Updated text" } });
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      textElement.id,
      expect.objectContaining({ content: expect.objectContaining({ text: "Updated text" }) })
    );

    const fontSizeInput = getNumberInput("text-font-size");
    fireEvent.change(fontSizeInput, { target: { value: "72" } });
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      textElement.id,
      expect.objectContaining({ style: expect.objectContaining({ fontSize: 72 }) })
    );

    const italicCheckbox = getSwitch("text-italic");
    fireEvent.click(italicCheckbox);
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      textElement.id,
      expect.objectContaining({ style: expect.objectContaining({ fontStyle: "italic" }) })
    );
  });

  it("toggles shadow, stroke, gradient, curve, effect, and motion preset controls", async () => {
    const { rerender } = renderWithMantine(
      <ElementInspector
        selectedSceneId={selectedSceneId}
        selectedElement={textElement}
        project={project}
        onUpdateElement={onUpdateElement}
        onDispatchOperation={onDispatchOperation}
        onDelete={onDelete}
        textSelectionRange={null}
      />
    );

    fireEvent.click(getSwitch("text-shadow-toggle"));
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      textElement.id,
      expect.objectContaining({ style: expect.objectContaining({ textShadow: expect.any(Object) }) })
    );

    const textWithShadow = {
      ...textElement,
      style: {
        ...textElement.style,
        textShadow: { offsetX: 2, offsetY: 4, blur: 12, color: "#000000", alpha: 0.45 }
      }
    };
    rerender(
      <ElementInspector
        selectedSceneId={selectedSceneId}
        selectedElement={textWithShadow}
        project={project}
        onUpdateElement={onUpdateElement}
        onDispatchOperation={onDispatchOperation}
        onDelete={onDelete}
        textSelectionRange={null}
      />
    );

    fireEvent.change(getNumberInput("text-shadow-blur"), { target: { value: "20" } });
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      textElement.id,
      expect.objectContaining({ style: expect.objectContaining({ textShadow: expect.objectContaining({ blur: 20 }) }) })
    );

    fireEvent.click(getSwitch("text-stroke-toggle"));
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      textElement.id,
      expect.objectContaining({ style: expect.objectContaining({ textStroke: expect.any(Object) }) })
    );

    const textWithStroke = {
      ...textElement,
      style: {
        ...textElement.style,
        textStroke: { color: "#ffffff", width: 2 }
      }
    };
    rerender(
      <ElementInspector
        selectedSceneId={selectedSceneId}
        selectedElement={textWithStroke}
        project={project}
        onUpdateElement={onUpdateElement}
        onDispatchOperation={onDispatchOperation}
        onDelete={onDelete}
        textSelectionRange={null}
      />
    );

    fireEvent.change(getNumberInput("text-stroke-width"), { target: { value: "6" } });
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      textElement.id,
      expect.objectContaining({ style: expect.objectContaining({ textStroke: expect.objectContaining({ width: 6 }) }) })
    );

    fireEvent.click(getSwitch("text-gradient-toggle"));
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      textElement.id,
      expect.objectContaining({ style: expect.objectContaining({ textGradient: expect.any(Object) }) })
    );

    const textWithGradient = {
      ...textElement,
      style: {
        ...textElement.style,
        textGradient: { type: "linear" as const, angle: 90, stops: [{ offset: 0, color: "#f97316" }, { offset: 1, color: "#6366f1" }] }
      }
    };
    rerender(
      <ElementInspector
        selectedSceneId={selectedSceneId}
        selectedElement={textWithGradient}
        project={project}
        onUpdateElement={onUpdateElement}
        onDispatchOperation={onDispatchOperation}
        onDelete={onDelete}
        textSelectionRange={null}
      />
    );

    fireEvent.change(getNumberInput("text-gradient-angle"), { target: { value: "45" } });
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      textElement.id,
      expect.objectContaining({ style: expect.objectContaining({ textGradient: expect.objectContaining({ angle: 45 }) }) })
    );

    fireEvent.click(getSwitch("text-curve-toggle"));
    expect(onDispatchOperation).toHaveBeenLastCalledWith(
      expect.objectContaining({ operation: "patch_element", sceneId: selectedSceneId, elementId: textElement.id })
    );

    const textWithCurve = {
      ...textElement,
      content: {
        ...textElement.content,
        textCurve: { type: "arc" as const, radius: 300 }
      }
    };
    rerender(
      <ElementInspector
        selectedSceneId={selectedSceneId}
        selectedElement={textWithCurve}
        project={project}
        onUpdateElement={onUpdateElement}
        onDispatchOperation={onDispatchOperation}
        onDelete={onDelete}
        textSelectionRange={null}
      />
    );

    fireEvent.change(getNumberInput("text-curve-radius"), { target: { value: "380" } });
    expect(onDispatchOperation).toHaveBeenLastCalledWith(
      expect.objectContaining({ operation: "patch_element", sceneId: selectedSceneId, elementId: textElement.id, patch: expect.objectContaining({ content: expect.any(Object) }) })
    );

    fireEvent.click(getSwitch("text-effect-toggle"));
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      textElement.id,
      expect.objectContaining({ style: expect.objectContaining({ textEffect: "glow" }) })
    );

    const textWithEffect = {
      ...textElement,
      style: {
        ...textElement.style,
        textEffect: "glow" as const,
        textEffectColor: "#ffffff",
        textEffectIntensity: 0.7,
      }
    };
    rerender(
      <ElementInspector
        selectedSceneId={selectedSceneId}
        selectedElement={textWithEffect}
        project={project}
        onUpdateElement={onUpdateElement}
        onDispatchOperation={onDispatchOperation}
        onDelete={onDelete}
        textSelectionRange={null}
      />
    );

    fireEvent.click(screen.getByTestId("text-effect-style"));
    fireEvent.click(screen.getByText("Neon"));
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      textElement.id,
      expect.objectContaining({ style: expect.objectContaining({ textEffect: "neon" }) })
    );

    const effectSlider = getSlider("text-effect-intensity");
    fireEvent.keyDown(effectSlider, { key: "ArrowRight", code: "ArrowRight", keyCode: 39, which: 39 });
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      textElement.id,
      expect.objectContaining({ style: expect.objectContaining({ textEffectIntensity: expect.any(Number) }) })
    );

    const motionPresetElement = screen.queryByTestId("motion-preset");
    if (!motionPresetElement) {
      throw new Error("motion preset element missing");
    }
    fireEvent.mouseDown(motionPresetElement);
    fireEvent.click(await screen.findByText(/slide left in/i));
    expect(onDispatchOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "set_element_motion_preset",
        sceneId: selectedSceneId,
        elementId: textElement.id,
        motionPreset: "Slide Left In",
        animations: expect.arrayContaining([expect.objectContaining({ type: "slideLeft" })]),
      })
    );
  });
});

describe("ImageInspector image options", () => {
  let project: ProjectDocument;
  let selectedSceneId: string;
  let imageElement: ElementNode;
  let onUpdateElement: ReturnType<typeof vi.fn>;
  let onDispatchOperation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    project = createPrototypeProject();
    selectedSceneId = project.scenes[0].id;
    imageElement = makeImageElement();
    onUpdateElement = vi.fn();
    onDispatchOperation = vi.fn();
  });

  it("applies frame, filters, blend, duotone, glow, shadow and crop operations", () => {
    const { rerender } = renderWithMantine(
      <ImageInspector
        selectedSceneId={selectedSceneId}
        selectedElement={imageElement}
        onUpdateElement={onUpdateElement}
        onDispatchOperation={onDispatchOperation}
      />
    );

    changeSelectValue("image-frame", "Phone");
    expect(onDispatchOperation).toHaveBeenLastCalledWith(
      expect.objectContaining({ operation: "set_image_frame", sceneId: selectedSceneId, elementId: imageElement.id, frame: "phone" })
    );

    const blurSlider = getSlider("image-blur");
    fireEvent.keyDown(blurSlider, { key: "ArrowRight", code: "ArrowRight", keyCode: 39, which: 39 });
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      imageElement.id,
      expect.objectContaining({ style: expect.objectContaining({ filters: expect.objectContaining({ blur: 1 }) }) })
    );

    fireEvent.click(getSwitch("image-mono"));
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      imageElement.id,
      expect.objectContaining({ style: expect.objectContaining({ filters: expect.objectContaining({ monochrome: true }) }) })
    );

    fireEvent.click(getSwitch("image-duotone-toggle"));
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      imageElement.id,
      expect.objectContaining({ style: expect.objectContaining({ filters: expect.objectContaining({ duotone: expect.any(Object) }) }) })
    );

    fireEvent.click(getSwitch("image-glow-toggle"));
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      imageElement.id,
      expect.objectContaining({ style: expect.objectContaining({ filters: expect.any(Object) }) })
    );

    const glowDisappear = {
      ...imageElement,
      style: {
        ...imageElement.style,
        filters: { glow: { color: "#ffffff", blur: 12, strength: 2 } }
      }
    };
    rerender(
      <ImageInspector
        selectedSceneId={selectedSceneId}
        selectedElement={glowDisappear}
        onUpdateElement={onUpdateElement}
        onDispatchOperation={onDispatchOperation}
      />
    );

    fireEvent.keyDown(getSlider("image-glow-blur"), { key: "ArrowRight", code: "ArrowRight", keyCode: 39, which: 39 });
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      imageElement.id,
      expect.objectContaining({ style: expect.objectContaining({ filters: expect.objectContaining({ glow: expect.any(Object) }) }) })
    );

    fireEvent.click(getSwitch("image-shadow-toggle"));
    expect(onUpdateElement).toHaveBeenLastCalledWith(
      selectedSceneId,
      imageElement.id,
      expect.objectContaining({ style: expect.objectContaining({ filters: expect.any(Object) }) })
    );

    const cropToggle = screen.getByTestId("image-crop-toggle");
    fireEvent.click(cropToggle);
    expect(onDispatchOperation).toHaveBeenLastCalledWith(
      expect.objectContaining({ operation: "crop_image", sceneId: selectedSceneId, elementId: imageElement.id })
    );
  });
});

describe("VideoInspector video options", () => {
  let project: ProjectDocument;
  let selectedSceneId: string;
  let videoElement: ElementNode;
  let onDispatchOperation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    project = createPrototypeProject();
    selectedSceneId = project.scenes[0].id;
    videoElement = makeVideoElement();
    onDispatchOperation = vi.fn();
  });

  it("applies trim, playback rate, and crop operations", () => {
    const { rerender } = renderWithMantine(
      <VideoInspector
        selectedSceneId={selectedSceneId}
        selectedElement={videoElement}
        onDispatchOperation={onDispatchOperation}
      />
    );

    fireEvent.change(getNumberInput("video-trim-start"), { target: { value: "1.5" } });
    expect(onDispatchOperation).toHaveBeenLastCalledWith(
      expect.objectContaining({ operation: "set_video_trim", sceneId: selectedSceneId, elementId: videoElement.id, trimStartMs: 1500 })
    );

    fireEvent.change(getNumberInput("video-trim-end"), { target: { value: "2" } });
    expect(onDispatchOperation).toHaveBeenLastCalledWith(
      expect.objectContaining({ operation: "set_video_trim", sceneId: selectedSceneId, elementId: videoElement.id, trimEndMs: 2000 })
    );

    const playbackSlider = getSlider("video-playback-rate");
    fireEvent.keyDown(playbackSlider, { key: "ArrowRight", code: "ArrowRight", keyCode: 39, which: 39 });
    expect(onDispatchOperation).toHaveBeenLastCalledWith(
      expect.objectContaining({ operation: "set_video_playback_rate", sceneId: selectedSceneId, elementId: videoElement.id })
    );

    const cropToggle = screen.getByTestId("video-crop-toggle");
    fireEvent.click(cropToggle);
    expect(onDispatchOperation).toHaveBeenLastCalledWith(
      expect.objectContaining({ operation: "crop_image", sceneId: selectedSceneId, elementId: videoElement.id })
    );

    const videoWithCrop = {
      ...videoElement,
      content: {
        ...videoElement.content,
        crop: { x: 10, y: 20, width: 100, height: 80 }
      }
    };

    rerender(
      <VideoInspector
        selectedSceneId={selectedSceneId}
        selectedElement={videoWithCrop}
        onDispatchOperation={onDispatchOperation}
      />
    );

    fireEvent.change(getNumberInput("video-crop-x"), { target: { value: "15" } });
    expect(onDispatchOperation).toHaveBeenLastCalledWith(
      expect.objectContaining({ operation: "crop_image", sceneId: selectedSceneId, elementId: videoElement.id })
    );
  });
});
