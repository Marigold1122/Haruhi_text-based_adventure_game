import { useState } from "react";

import { StartScreen } from "@/components/StartScreen";
import { StoryView } from "@/components/StoryView";

import { characterRegistry } from "@/data/characters";
import { hsuzumiyaLore } from "@/data/lorebooks/hsuzumiya_lore";
import { startingPointById } from "@/data/startingPoints";

import type { StartingPointId, WorldState } from "@/types/worldState";

type SessionConfig = {
  characterId: string;
  startingPointId: StartingPointId;
  initialState: WorldState;
};

export default function App() {
  const [session, setSession] = useState<SessionConfig | null>(null);

  function startSession(opts: { characterId: string; startingPointId: StartingPointId }) {
    const point = startingPointById[opts.startingPointId];
    if (!point) return;
    const initialState: WorldState = {
      ...point.initialState,
      playerCharacterId: opts.characterId,
    };
    setSession({
      characterId: opts.characterId,
      startingPointId: opts.startingPointId,
      initialState,
    });
  }

  function reset() {
    setSession(null);
  }

  if (!session) {
    return <StartScreen onStart={startSession} />;
  }

  const card = characterRegistry[session.characterId];
  return (
    <StoryView
      card={card}
      lorebook={hsuzumiyaLore}
      initialState={session.initialState}
      onReset={reset}
    />
  );
}
