import type { ProjectDocument, RenderRequest } from "@kwikk/shared-types";
import { getTimelineDurationMs } from "@kwikk/timeline";

export interface ExportPreparation {
  projectId: string;
  durationMs: number;
  sceneCount: number;
  renderRequest: RenderRequest;
}

export function prepareExport(project: ProjectDocument): ExportPreparation {
  return {
    projectId: project.id,
    durationMs: getTimelineDurationMs(project.timelineTracks),
    sceneCount: project.scenes.length,
    renderRequest: {
      projectId: project.id,
      viewport: project.viewport,
      frameRate: 30
    }
  };
}
