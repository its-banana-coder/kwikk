import { resolveRenderFrame } from "@kwikk/render-core";
import { validateProjectDocument } from "@kwikk/scene-graph";
import { MOTION_PRESETS, buildPresetAnimations, type MotionPresetKey } from "@kwikk/animation-engine";
import { TimelineEngine } from "@kwikk/timeline";
import type { AnimationType } from "@kwikk/shared-types";
import { useEffect, useRef, useState } from "react";
import { PreviewCanvas } from "./PreviewCanvas";
import { useEditorStore, useSelectedElement, useSelectedScene } from "./store";

function App() {
  const project = useEditorStore((state) => state.project);
  const selectedSceneId = useEditorStore((state) => state.selectedSceneId);
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds);
  const timeline = useEditorStore((state) => state.timeline);
  const playback = useEditorStore((state) => state.playback);
  const selectScene = useEditorStore((state) => state.selectScene);
  const syncSelectedScene = useEditorStore((state) => state.syncSelectedScene);
  const selectElement = useEditorStore((state) => state.selectElement);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const setPlayback = useEditorStore((state) => state.setPlayback);
  const togglePlayback = useEditorStore((state) => state.togglePlayback);
  const dispatchOperation = useEditorStore((state) => state.dispatchOperation);
  const updateElement = useEditorStore((state) => state.updateElement);
  const addElement = useEditorStore((state) => state.addElement);
  const deleteElement = useEditorStore((state) => state.deleteElement);
  const addScene = useEditorStore((state) => state.addScene);
  const deleteScene = useEditorStore((state) => state.deleteScene);
  const reorderScenes = useEditorStore((state) => state.reorderScenes);
  const updateScene = useEditorStore((state) => state.updateScene);
  const updateSceneDuration = useEditorStore((state) => state.updateSceneDuration);
  const selectedScene = useSelectedScene();
  const selectedElement = useSelectedElement();
  const frame = resolveRenderFrame(project, { timeMs: timeline.currentTimeMs });
  const errors = validateProjectDocument(project);
  const timelineRef = useRef(
    new TimelineEngine({
      durationMs: timeline.durationMs,
      currentTimeMs: timeline.currentTimeMs,
      loop: false
    })
  );
  const playbackRef = useRef(playback.isPlaying);
  const [isAddElementOpen, setIsAddElementOpen] = useState(false);
  const [dragSceneIndex, setDragSceneIndex] = useState<number | null>(null);
  const [dropSceneIndex, setDropSceneIndex] = useState<number | null>(null);

  playbackRef.current = playback.isPlaying;

  useEffect(() => {
    timelineRef.current.setDuration(timeline.durationMs);
  }, [timeline.durationMs]);

  useEffect(() => {
    if (Math.abs(timelineRef.current.currentTimeMs - timeline.currentTimeMs) > 1) {
      timelineRef.current.seek(timeline.currentTimeMs);
    }
  }, [timeline.currentTimeMs]);

  useEffect(() => {
    if (playback.isPlaying) {
      timelineRef.current.play();
    } else {
      timelineRef.current.pause();
    }
  }, [playback.isPlaying]);

  useEffect(() => {
    if (frame.sceneId && frame.sceneId !== selectedSceneId) {
      syncSelectedScene(frame.sceneId);
    }
  }, [frame.sceneId, selectedSceneId, syncSelectedScene]);

  useEffect(() => {
    let frameId = 0;
    let previousTimestamp = performance.now();

    const step = (timestamp: number) => {
      const deltaMs = timestamp - previousTimestamp;
      previousTimestamp = timestamp;

      if (playbackRef.current) {
        const nextTimeMs = timelineRef.current.tick(deltaMs);
        setCurrentTime(nextTimeMs);
        if (!timelineRef.current.isPlaying) {
          setPlayback(false);
        }
      }

      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [setCurrentTime, setPlayback]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Phase 1</p>
          <h1>Semantic Video Engine</h1>
        </div>
        <div className="topbar-meta">
          <span>Deterministic frame contract</span>
          <strong>{timeline.durationMs / 1000}s vertical reel</strong>
        </div>
      </header>

      <main className="workspace">
        <section className="panel left-panel">
          <button
            className={`add-element-trigger${isAddElementOpen ? " active" : ""}`}
            onClick={() => setIsAddElementOpen(!isAddElementOpen)}
            title="Add Element"
          >
            <span className="add-element-icon">+</span>
            <span className="add-element-label">Add</span>
          </button>
        </section>

        <div className={`options-panel${isAddElementOpen ? " open" : ""}`}>
          <div className="overlay-header">
            <span>Add Element</span>
            <button className="overlay-close" onClick={() => setIsAddElementOpen(false)}>×</button>
          </div>
          <button className="add-el-btn" onClick={() => addElement(selectedSceneId ?? project.scenes[0]?.id, 'text')}>
            Text
          </button>
          <button className="add-el-btn" onClick={() => addElement(selectedSceneId ?? project.scenes[0]?.id, 'shape')}>
            Rectangle
          </button>
          <button className="add-el-btn" onClick={() => addElement(selectedSceneId ?? project.scenes[0]?.id, 'image')}>
            Image
          </button>
        </div>

        <section className="panel preview-panel">
          <div className="phone-frame" style={{ marginTop: 0 }}>
            <PreviewCanvas
              project={project}
              timeMs={timeline.currentTimeMs}
              selectedElementId={selectedElement?.id}
              onUpdateElement={(id, updates) => {
                if (selectedScene) {
                  updateElement(selectedScene.id, id, updates);
                }
              }}
              onSelectElement={(id) => {
                if (selectedScene) {
                  selectElement(selectedScene.id, id || "");
                }
              }}
            />
          </div>
          <div className="transport-controls">
            <button
              className={`transport-btn${!playback.isPlaying ? " active" : ""}`}
              onClick={() => { if (!playback.isPlaying) togglePlayback(); }}
              title="Play"
            >
              ▶
            </button>
            <button
              className={`transport-btn${playback.isPlaying ? " active" : ""}`}
              onClick={() => { if (playback.isPlaying) togglePlayback(); }}
              title="Pause"
            >
              ⏸
            </button>
            <button
              className="transport-btn"
              onClick={() => { if (playback.isPlaying) togglePlayback(); setCurrentTime(0); }}
              title="Stop"
            >
              ■
            </button>
          </div>
          <div className="playback-bar">
              <input
                type="range"
                min={0}
                max={timeline.durationMs}
                step={50}
                value={timeline.currentTimeMs}
                onChange={(event) => setCurrentTime(Number(event.target.value))}
              />
              <div className="time-row">
                <span>{Math.round(timeline.currentTimeMs)} ms</span>
                <span>Scene {frame.sceneId ?? "none"}</span>
              </div>
            </div>
        </section>

        <section className="panel properties-panel" style={{ gridArea: 'properties' }}>
          {selectedScene && (
            <div className="scene-editor">
              <div className="scene-editor-header">
                <h3>Scene</h3>
                <input
                  className="scene-name-input"
                  type="text"
                  value={selectedScene.name}
                  onChange={(e) => updateScene(selectedScene.id, { name: e.target.value })}
                />
              </div>
              <div className="scene-editor-row">
                <label className="scene-bg-label">
                  Background
                  <div className="color-row">
                    <input
                      type="color"
                      value={selectedScene.backgroundColor ?? "#ffffff"}
                      onChange={(e) => updateScene(selectedScene.id, { backgroundColor: e.target.value })}
                    />
                    <span className="color-hex">{selectedScene.backgroundColor ?? "#ffffff"}</span>
                  </div>
                </label>
                <label className="scene-dur-label">
                  Duration
                  <div className="dur-row">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={Math.round(selectedScene.durationMs / 1000)}
                      onChange={(e) => updateSceneDuration(selectedScene.id, Number(e.target.value) * 1000)}
                    />
                    <span className="dur-unit">s</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="section-block">
            <h3>Elements</h3>
            <div className="element-list">
              {selectedScene?.elements.map((element) => (
                <button
                  key={element.id}
                  className={
                    selectedElementIds.includes(element.id)
                      ? "element-item active"
                      : "element-item"
                  }
                  onClick={() => selectElement(selectedScene.id, element.id)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                    <strong>{element.semanticRole ?? element.type}</strong>
                    <span style={{ color: '#94a3b8', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{element.id}</span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={(e) => { e.stopPropagation(); deleteElement(selectedScene.id, element.id); }}
                    title="Delete element"
                  >
                    ×
                  </button>
                </button>
              ))}
            </div>
          </div>

          {selectedScene && selectedElement ? (
            <div className="inspector-form">
              {selectedElement.type === "text" && (
                <>
                  <label>
                    Text
                    <textarea
                      value={selectedElement.content?.text ?? ""}
                      onChange={(event) =>
                        updateElement(selectedScene.id, selectedElement.id, {
                          content: {
                            ...selectedElement.content,
                            text: event.target.value
                          }
                        })
                      }
                    />
                  </label>

                  <div className="text-style-controls" style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    <label>
                      Font
                      <select
                        value={selectedElement.style.fontFamily ?? "Inter"}
                        onChange={(e) =>
                          updateElement(selectedScene.id, selectedElement.id, {
                            style: { fontFamily: e.target.value }
                          })
                        }
                      >
                        <option value="Inter">Inter</option>
                        <option value="Space Grotesk">Space Grotesk</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Arial">Arial</option>
                      </select>
                    </label>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <label style={{ flex: 1 }}>
                        Size
                        <input
                          type="number"
                          min={8}
                          step={1}
                          value={selectedElement.style.fontSize ?? 48}
                          onChange={(e) =>
                            updateElement(selectedScene.id, selectedElement.id, {
                              style: { fontSize: Number(e.target.value) }
                            })
                          }
                        />
                      </label>

                      <label style={{ flex: 1 }}>
                        Color
                        <input
                          type="color"
                          value={selectedElement.style.color ?? "#f8fafc"}
                          onChange={(e) =>
                            updateElement(selectedScene.id, selectedElement.id, {
                              style: { color: e.target.value }
                            })
                          }
                        />
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={Number(selectedElement.style.fontWeight ?? 600) >= 700}
                          onChange={(e) =>
                            updateElement(selectedScene.id, selectedElement.id, {
                              style: { fontWeight: e.target.checked ? 700 : 400 }
                            })
                          }
                        />
                        Bold
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={(selectedElement.style.fontStyle ?? "normal") === "italic"}
                          onChange={(e) =>
                            updateElement(selectedScene.id, selectedElement.id, {
                              style: { fontStyle: e.target.checked ? "italic" : "normal" }
                            })
                          }
                        />
                        Italic
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="two-up">
                <label>
                  X
                  <input
                    type="number"
                    value={selectedElement.layout.x}
                    onChange={(event) =>
                      updateElement(selectedScene.id, selectedElement.id, {
                        layout: {
                          x: Number(event.target.value)
                        }
                      })
                    }
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    value={selectedElement.layout.y}
                    onChange={(event) =>
                      updateElement(selectedScene.id, selectedElement.id, {
                        layout: {
                          y: Number(event.target.value)
                        }
                      })
                    }
                  />
                </label>
              </div>

              <div className="two-up">
                <label>
                  Width
                  <input
                    type="number"
                    value={selectedElement.layout.width}
                    onChange={(event) =>
                      updateElement(selectedScene.id, selectedElement.id, {
                        layout: {
                          width: Number(event.target.value)
                        }
                      })
                    }
                  />
                </label>
                <label>
                  Height
                  <input
                    type="number"
                    value={selectedElement.layout.height}
                    onChange={(event) =>
                      updateElement(selectedScene.id, selectedElement.id, {
                        layout: {
                          height: Number(event.target.value)
                        }
                      })
                    }
                  />
                </label>
              </div>

              <div className="two-up">
                <label>
                  Scale
                  <input
                    type="number"
                    step={0.05}
                    value={selectedElement.layout.scale}
                    onChange={(event) =>
                      updateElement(selectedScene.id, selectedElement.id, {
                        layout: {
                          scale: Number(event.target.value)
                        }
                      })
                    }
                  />
                </label>
                <label>
                  Opacity
                  <input
                    type="number"
                    step={0.05}
                    min={0}
                    max={1}
                    value={selectedElement.layout.opacity}
                    onChange={(event) =>
                      updateElement(selectedScene.id, selectedElement.id, {
                        layout: {
                          opacity: Number(event.target.value)
                        }
                      })
                    }
                  />
                </label>
              </div>
            </div>
          ) : (
            <p className="empty-state">Select a scene element to edit its semantic state.</p>
          )}

          {selectedScene && selectedElement && (
            <div className="section-block animations-block">
              <div className="anim-section-header">
                <h3>Animations</h3>
                <button
                  className="anim-add-btn"
                  onClick={() => {
                    const animId = `anim_${Math.random().toString(36).slice(2, 9)}`;
                    dispatchOperation({
                      operation: "add_animation",
                      sceneId: selectedScene.id,
                      elementId: selectedElement.id,
                      animation: { id: animId, type: "fadeIn", startMs: 0, durationMs: 500, easing: "easeOut" }
                    });
                  }}
                >
                  + Add
                </button>
              </div>

              <div className="anim-preset-row">
                <label className="anim-preset-label">
                  Motion Preset
                  <select
                    value={selectedElement.motionPreset ?? ""}
                    onChange={(e) => {
                      const key = e.target.value as MotionPresetKey | "";
                      if (!key) return;
                      const scene = selectedScene;
                      const track = project.timelineTracks.find((t) => t.sceneId === scene.id);
                      const animations = buildPresetAnimations(key, track?.durationMs);
                      dispatchOperation({
                        operation: "set_element_motion_preset",
                        sceneId: scene.id,
                        elementId: selectedElement.id,
                        motionPreset: key,
                        animations
                      });
                    }}
                  >
                    <option value="">— none —</option>
                    {(Object.keys(MOTION_PRESETS) as MotionPresetKey[]).map((key) => (
                      <option key={key} value={key}>{key.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedElement.animations.length === 0 && (
                <p className="empty-state" style={{ fontSize: 11 }}>No animations. Add one above or apply a motion preset.</p>
              )}

              {selectedElement.animations.map((anim) => (
                <div key={anim.id} className="anim-item">
                  <div className="anim-item-header">
                    <span className="anim-item-id">{anim.id}</span>
                    <button
                      className="delete-btn"
                      onClick={() =>
                        dispatchOperation({
                          operation: "delete_animation",
                          sceneId: selectedScene.id,
                          elementId: selectedElement.id,
                          animationId: anim.id
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                  <div className="anim-item-fields">
                    <label>
                      Type
                      <select
                        value={anim.type}
                        onChange={(e) =>
                          dispatchOperation({
                            operation: "update_animation",
                            sceneId: selectedScene.id,
                            elementId: selectedElement.id,
                            animationId: anim.id,
                            patch: { type: e.target.value as AnimationType }
                          })
                        }
                      >
                        {(["fadeIn","fadeOut","slideUp","slideDown","slideLeft","slideRight","zoomIn","zoomOut","subtitle_pop","kinetic_slide","blur_transition"] as AnimationType[]).map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <div className="two-up">
                      <label>
                        Start ms
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={anim.startMs}
                          onChange={(e) =>
                            dispatchOperation({
                              operation: "update_animation",
                              sceneId: selectedScene.id,
                              elementId: selectedElement.id,
                              animationId: anim.id,
                              patch: { startMs: Number(e.target.value) }
                            })
                          }
                        />
                      </label>
                      <label>
                        Duration ms
                        <input
                          type="number"
                          min={50}
                          step={50}
                          value={anim.durationMs}
                          onChange={(e) =>
                            dispatchOperation({
                              operation: "update_animation",
                              sceneId: selectedScene.id,
                              elementId: selectedElement.id,
                              animationId: anim.id,
                              patch: { durationMs: Number(e.target.value) }
                            })
                          }
                        />
                      </label>
                    </div>
                    <label>
                      Easing
                      <select
                        value={anim.easing ?? "linear"}
                        onChange={(e) =>
                          dispatchOperation({
                            operation: "update_animation",
                            sceneId: selectedScene.id,
                            elementId: selectedElement.id,
                            animationId: anim.id,
                            patch: { easing: e.target.value }
                          })
                        }
                      >
                        <option value="linear">linear</option>
                        <option value="easeIn">easeIn</option>
                        <option value="easeOut">easeOut</option>
                        <option value="easeInOut">easeInOut</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {errors.length > 0 && (
            <div className="section-block errors">
              <h3>Validation</h3>
              <pre>{JSON.stringify(errors, null, 2)}</pre>
            </div>
          )}
        </section>

        <div className="scenes-bar">
          <div className="scenes-scroll">
            {project.scenes.map((scene, index) => (
              <button
                key={scene.id}
                draggable
                className={[
                  "scene-chip",
                  scene.id === selectedSceneId ? "active" : "",
                  dropSceneIndex === index && dragSceneIndex !== index ? "drag-over" : ""
                ].filter(Boolean).join(" ")}
                onClick={() => selectScene(scene.id)}
                onDragStart={(e) => { setDragSceneIndex(index); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => { e.preventDefault(); setDropSceneIndex(index); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragSceneIndex !== null && dragSceneIndex !== index) reorderScenes(dragSceneIndex, index);
                  setDragSceneIndex(null);
                  setDropSceneIndex(null);
                }}
                onDragEnd={() => { setDragSceneIndex(null); setDropSceneIndex(null); }}
              >
                <span className="scene-chip-name">{scene.name}</span>
                <span className="scene-chip-dur">{Math.round(scene.durationMs / 1000)}s · {scene.elements.length} el</span>
                <button
                  className="delete-btn"
                  onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }}
                  disabled={project.scenes.length <= 1}
                  title="Delete scene"
                >
                  ×
                </button>
              </button>
            ))}
            <button className="scene-chip add-chip" onClick={addScene}>+ Scene</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
