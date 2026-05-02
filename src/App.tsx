import { useState } from "react";

import { StartScreen } from "@/components/StartScreen";
import { StoryView } from "@/components/StoryView";

import { characterRegistry } from "@/data/characters";
import { hsuzumiyaLore } from "@/data/lorebooks/hsuzumiya_lore";
import { startingPointById } from "@/data/startingPoints";

import type { StartingPointId, WorldState } from "@/types/worldState";
import type { CharacterCardV2 } from "@/types/character";
import { load } from "@/lib/storage";

type SessionConfig = {
  characterId: string;
  customCard?: CharacterCardV2;
  startingPointId: StartingPointId;
  initialState: WorldState;
};

export default function App() {
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [resumeFlag, setResumeFlag] = useState(false);

  function startSession(opts: {
    characterId: string;
    startingPointId: StartingPointId;
    customCard?: CharacterCardV2;
  }) {
    const point = startingPointById[opts.startingPointId];
    if (!point) return;
    const initialState: WorldState = {
      ...point.initialState,
      playerCharacterId: opts.characterId,
    };
    setResumeFlag(false);
    setSession({
      characterId: opts.characterId,
      customCard: opts.customCard,
      startingPointId: opts.startingPointId,
      initialState,
    });
  }

  function reset() {
    setSession(null);
    setResumeFlag(false);
  }

  // 起点屏未渲染时检查是否有存档可恢复
  if (!session) {
    const blob = load();
    return (
      <>
        <StartScreen onStart={startSession} />
        {blob && !resumeFlag && (
          <div className="resume-banner">
            发现存档（{new Date(blob.savedAt).toLocaleString()}）。
            <button
              className="primary-btn"
              onClick={() => {
                const point = startingPointById[blob.state.startingPoint];
                if (!point) return;
                setSession({
                  characterId: blob.characterId,
                  customCard: blob.customCard ?? undefined,
                  startingPointId: blob.state.startingPoint,
                  initialState: { ...point.initialState, playerCharacterId: blob.characterId },
                });
                setResumeFlag(true);
              }}
            >继续上次的故事</button>
          </div>
        )}
      </>
    );
  }

  const card =
    session.customCard ?? characterRegistry[session.characterId];
  if (!card) {
    return (
      <div className="start-screen">
        <p>未找到角色卡。</p>
        <button onClick={reset}>返回</button>
      </div>
    );
  }

  return (
    <StoryView
      card={card}
      lorebook={hsuzumiyaLore}
      initialState={session.initialState}
      characterId={session.characterId}
      customCard={session.customCard}
      resumeFrom={resumeFlag ? load() : null}
      onReset={reset}
    />
  );
}
