import { useState } from "react";

import { StartScreen } from "@/components/StartScreen";
import { StoryView } from "@/components/StoryView";
import { SakuraParticles } from "@/components/SakuraParticles";

import { hsuzumiyaLore } from "@/data/lorebooks/hsuzumiya_lore";
import { startingPointById } from "@/data/startingPoints";

import type { WorldState } from "@/types/worldState";
import type { CharacterCardV2 } from "@/types/character";
import type { IdentityLevel } from "@/types/lorebook";
import type { RandomCharacterSeed } from "@/lib/randomMode";
import { load } from "@/lib/storage";

type SessionConfig = {
  card: CharacterCardV2;
  identity: IdentityLevel;
  initialState: WorldState;
  /** 仅在新开局且需要后台扩展 description 时存在；resume 时为空 */
  expandSeed?: RandomCharacterSeed;
};

export default function App() {
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [resumeFlag, setResumeFlag] = useState(false);

  function startSession(opts: {
    card: CharacterCardV2;
    identity: IdentityLevel;
    expandSeed?: RandomCharacterSeed;
  }) {
    // 起点固定为入学日；玩家身份覆盖默认
    const point = startingPointById["north_high_entrance"]!;
    const initialState: WorldState = {
      ...point.initialState,
      playerCharacterId: "__custom__",
      identity: opts.identity,
    };
    setResumeFlag(false);
    setSession({
      card: opts.card,
      identity: opts.identity,
      initialState,
      expandSeed: opts.expandSeed,
    });
  }

  function updateCard(card: CharacterCardV2) {
    setSession((prev) => (prev ? { ...prev, card } : prev));
  }

  function reset() {
    setSession(null);
    setResumeFlag(false);
  }

  if (!session) {
    const blob = load();
    return (
      <>
        <SakuraParticles />
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
    <>
      <SakuraParticles />
      <StoryView
        card={session.card}
        lorebook={hsuzumiyaLore}
        initialState={session.initialState}
        characterId="__custom__"
        customCard={session.card}
        resumeFrom={resumeFlag ? load() : null}
        onReset={reset}
        expandSeed={session.expandSeed}
        onCardUpdate={updateCard}
      />
    </>
  );
}
