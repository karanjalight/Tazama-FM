"use client";

import { Panel, Scene, TextLine } from "./kit";

/** Stub — replaced by the real scene in Task 7. */
export function PlaylistsScene() {
  return (
    <Scene label="Playlists">
      <Panel x={140} y={100} w={200} h={160}>
        <TextLine x={20} y={24} w={120} strong />
        <TextLine x={20} y={40} w={90} />
      </Panel>
    </Scene>
  );
}
