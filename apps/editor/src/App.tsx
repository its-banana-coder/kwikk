import { resolveRenderFrame } from "@kwikk/render-core";
import { validateProjectDocument } from "@kwikk/scene-graph";
import { TimelineEngine } from "@kwikk/timeline";
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
  const togglePlayback = useEditorStore((state) => state.togglePlayback);
  const updateElement = useEditorStore((state) => state.updateElement);
  const updateSceneDuration = useEditorStore((state) => state.updateSceneDuration);
  const selectedScene = useSelectedScene();
  const selectedElement = useSelectedElement();
  const frame = resolveRenderFrame(project, { timeMs: timeline.currentTimeMs });
  const errors = validateProjectDocument(project);
  const timelineRef = useRef(
    new TimelineEngine({
      durationMs: timeline.durationMs,
      currentTimeMs: timeline.currentTimeMs,
      loop: true
    })
  );
  const playbackRef = useRef(playback.isPlaying);
  const [sceneDurationInput, setSceneDurationInput] = useState(
    selectedScene ? String(selectedScene.durationMs) : ""
  );
  const [isScenesCollapsed, setIsScenesCollapsed] = useState(false);
  const [isTimelineVisible, setIsTimelineVisible] = useState(false);

  playbackRef.current = playback.isPlaying;

  useEffect(() => {
    setSceneDurationInput(selectedScene ? String(selectedScene.durationMs) : "");
  }, [selectedScene?.id, selectedScene?.durationMs]);

  const commitSceneDuration = () => {
    if (!selectedScene) {
      return;
    }

    const parsedDuration = Number(sceneDurationInput);
    if (!Number.isFinite(parsedDuration)) {
      setSceneDurationInput(String(selectedScene.durationMs));
      return;
    }

    const nextDurationMs = Math.max(1000, parsedDuration);
    setSceneDurationInput(String(nextDurationMs));
    updateSceneDuration(selectedScene.id, nextDurationMs);
  };

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
      }

      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [setCurrentTime]);

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

      <main className={isScenesCollapsed ? "workspace scenes-collapsed" : "workspace"}>
        <section className="panel scene-panel">
          <div className="panel-header" style={{ justifyContent: isScenesCollapsed ? 'center' : 'space-between' }}>
            {isScenesCollapsed ? (
              <button className="collapse-btn" onClick={() => setIsScenesCollapsed(false)}>
                ›
              </button>
            ) : (
              <>
                <h2>Scenes</h2>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span>{project.scenes.length}</span>
                  <button className="collapse-btn" onClick={() => setIsScenesCollapsed(true)}>
                    ‹
                  </button>
                </div>
              </>
            )}
          </div>
          {!isScenesCollapsed && (
            <div className="controls-panel" style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button className="playback-button" onClick={togglePlayback} style={{ flex: 1 }}>
                {playback.isPlaying ? "Pause" : "Play"}
              </button>
              <button className="playback-button" onClick={() => setIsTimelineVisible(!isTimelineVisible)} style={{ flex: 1, padding: '12px 10px', fontSize: '14px' }}>
                {isTimelineVisible ? "Hide Timeline" : "Show Timeline"}
              </button>
            </div>
          )}
          {!isScenesCollapsed && (
            <div className="scene-list">
              {project.scenes.map((scene) => (
                <button
                  key={scene.id}
                  className={scene.id === selectedSceneId ? "scene-item active" : "scene-item"}
                  onClick={() => selectScene(scene.id)}
                >
                  <strong>{scene.name}</strong>
                  <span>{scene.durationMs / 1000}s</span>
                </button>
              ))}
            </div>
          )}
        </section>

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
          {isTimelineVisible && (
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
          )}
        </section>

        <section className="panel properties-panel">
          <div className="panel-header">
            <h2>Properties</h2>
            <span>{selectedElement?.semanticRole ?? "Select an element"}</span>
          </div>

          {selectedScene && (
            <div className="section-block">
              <label>
                Scene Duration (ms)
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={sceneDurationInput}
                  onChange={(event) => setSceneDurationInput(event.target.value)}
                  onBlur={commitSceneDuration}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitSceneDuration();
                    }
                  }}
                />
              </label>
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
                  <strong>{element.semanticRole ?? element.type}</strong>
                  <span>{element.id}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedScene && selectedElement ? (
            <div className="inspector-form">
              {selectedElement.type === "text" && (
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



          {errors.length > 0 && (
            <div className="section-block errors">
              <h3>Validation</h3>
              <pre>{JSON.stringify(errors, null, 2)}</pre>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
