import { useState } from "react";

import { StartScreen } from "@/components/StartScreen";
import { StoryView } from "@/components/StoryView";

import { hsuzumiyaLore } from "@/data/lorebooks/hsuzumiya_lore";
import { startingPointById } from "@/data/startingPoints";

import type { WorldState } from "@/types/worldState";
import type { CharacterCardV2 } from "@/types/character";
import type { IdentityLevel } from "@/types/lorebook";
import { load } from "@/lib/storage";

type SessionConfig = {
  card: CharacterCardV2;
  identity: IdentityLevel;
  initialState: WorldState;
};

export default function App() {
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [resumeFlag, setResumeFlag] = useState(false);

  function startSession(opts: { card: CharacterCardV2; identity: IdentityLevel }) {
    // 起点固定为入学日；玩家身份覆盖默认
    const point = startingPointById["north_high_entrance"]!;
    const initialState: WorldState = {
      ...point.initialState,
      playerCharacterId: "__custom__",
      identity: opts.identity,
    };
    setResumeFlag(false);
    setSession({ card: opts.card, identity: opts.identity, initialState });
  }

  function reset() {
    setSession(null);
    setResumeFlag(false);
  }

  if (!session) {
    const blob = load();
    return (
      <>
        <StartScreen onStart={startSession} />
        {blob && !resumeFlag && blob.customCard && (
          <div className="resume-banner">
            发现存档（{new Date(blob.savedAt).toLocaleString()}）。
            <button
              className="primary-btn"
              onClick={() => {
                const point = startingPointById[blob.state.startingPoint];
                if (!point || !blob.customCard) return;
                setSession({
                  card: blob.customCard,
                  identity: blob.state.identity,
                  initialState: blob.state,
                });
                setResumeFlag(true);
              }}
            >继续上次的故事</button>
          </div>
        )}
      </>
    );
  }

  return (
    <StoryView
      card={session.card}
      lorebook={hsuzumiyaLore}
      initialState={session.initialState}
      characterId="__custom__"
      customCard={session.card}
      resumeFrom={resumeFlag ? load() : null}
      onReset={reset}
    />
  );
}
