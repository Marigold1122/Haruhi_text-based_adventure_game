import { useEffect, useState } from "react";
import {
  archetypeInfo,
  statKeys,
  statLabels,
} from "@/data/characterArchetypes";
import type { MatchResult } from "@/lib/personalityMatcher";

type Props = {
  match: MatchResult;
  onConfirm: (supplement: string, name: string) => void;
};

/**
 * 测试结束后的"匹配人格 + 补充输入"组合界面。
 * 1. 显示匹配的原型 + 描述
 * 2. 显示玩家的 8 维参数画像（柱状图）
 * 3. 显示与各原型的相似度排行
 * 4. 延迟淡入：补充输入框 + "开始扮演" 按钮
 * 5. 点击"开始扮演"后整屏淡出
 */
export function ArchetypeReveal({ match, onConfirm }: Props) {
  const arch = archetypeInfo[match.archetype];
  const top3 = match.ranking.slice(0, 3);

  const [supplementVisible, setSupplementVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSupplementVisible(true), 700);
    return () => clearTimeout(t);
  }, []);

  const [fadingOut, setFadingOut] = useState(false);
  const [supplement, setSupplement] = useState("");
  const [name, setName] = useState("");

  function handleStart() {
    setFadingOut(true);
    setTimeout(() => onConfirm(supplement.trim(), name.trim()), 480);
  }

  return (
    <div className={`reveal-screen ${fadingOut ? "fade-out" : "fade-in"}`}>
      <main className="reveal-card">
        <div className="reveal-tag">人格匹配完成</div>
        <h1 className="reveal-name">{arch.name}</h1>
        <p className="reveal-mbti">{arch.mbti}</p>
        <p className="reveal-short">{arch.shortDesc}</p>

        <article className="reveal-long">
          {arch.longDesc.split("\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </article>

        <section className="reveal-stats">
          <h4>你的 8 维人格画像</h4>
          <div className="stats-bars">
            {statKeys.map((k) => {
              const v = match.normalizedStats[k];
              return (
                <div key={k} className="stat-row">
                  <span className="stat-label">{statLabels[k]}</span>
                  <div className="stat-bar-wrap">
                    <div className="stat-bar-fill" style={{ width: `${(v / 10) * 100}%` }} />
                  </div>
                  <span className="stat-value">{v.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="reveal-ranking">
          <h4>相似度排行（前 3）</h4>
          <ul>
            {top3.map((r) => (
              <li key={r.archetype} className={r.archetype === match.archetype ? "main" : ""}>
                <span className="rank-name">{archetypeInfo[r.archetype].name}</span>
                <span className="rank-bar-wrap">
                  <span className="rank-bar-fill" style={{ width: `${r.similarity}%` }} />
                </span>
                <span className="rank-value">{r.similarity}%</span>
              </li>
            ))}
          </ul>
        </section>

        {supplementVisible && (
          <section className="supplement-section fade-in">
            <h3>你还想为自己的角色补充什么信息？</h3>
            <p className="muted small">
              （可留空。补充内容会决定姓名、外貌、家庭背景、独特癖好等具体细节，但不会改变上方测试得出的人格内核。）
            </p>

            <label className="form-row">
              <span>姓名（可留空让 AI 命名）</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：佐藤悠 / 樱井遥"
              />
            </label>

            <label className="form-row">
              <span>补充信息</span>
              <textarea
                rows={4}
                value={supplement}
                onChange={(e) => setSupplement(e.target.value)}
                placeholder="例如：父亲是大学物理教授，母亲是图书管理员；中学三年都在天文社；喜欢一个人在天台看云。"
              />
            </label>

            <div className="supplement-actions">
              <button className="primary-btn big" onClick={handleStart}>
                开始扮演 →
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
