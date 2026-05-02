import { useEffect, useState } from "react";
import {
  archetypeInfo,
  statKeys,
  statLabels,
  type ArchetypeInfo,
} from "@/data/characterArchetypes";
import type { MatchResult } from "@/lib/personalityMatcher";
import { identityGuides } from "@/data/identityGuide";
import type { IdentityLevel } from "@/types/lorebook";

type Props = {
  match: MatchResult;
  onConfirm: (supplement: string, name: string, identity: IdentityLevel) => void;
};

const IDENTITY_ORDER: IdentityLevel[] = ["passerby", "fringe", "core", "anomaly", "observer"];
const RECOMMENDED_IDENTITY: IdentityLevel = "passerby";

/**
 * 测试结束后的"匹配人格 + 立绘 + 补充输入"组合界面。
 *  1. 主区显示立绘 + 原型名 + MBTI + 描述
 *  2. 8 维参数画像柱状图 + 与各原型的相似度排行
 *  3. 700ms 后淡入：补充输入框 + 「开始扮演」按钮
 *  4. 点击"开始扮演" → 整屏淡出 → onConfirm
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
  const [identity, setIdentity] = useState<IdentityLevel>(RECOMMENDED_IDENTITY);

  function handleStart() {
    setFadingOut(true);
    setTimeout(() => onConfirm(supplement.trim(), name.trim(), identity), 480);
  }

  return (
    <div className={`reveal-screen ${fadingOut ? "fade-out" : "fade-in"}`}>
      <main className="reveal-card">
        <div className="reveal-tag">人格匹配完成</div>

        <div className="reveal-hero">
          <ArchetypePortrait arch={arch} size="large" />
          <div className="reveal-hero-text">
            <h1 className="reveal-name">{arch.name}</h1>
            <p className="reveal-mbti">{arch.mbti}</p>
            <p className="reveal-short">{arch.shortDesc}</p>
          </div>
        </div>

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
            {top3.map((r) => {
              const a = archetypeInfo[r.archetype];
              return (
                <li key={r.archetype} className={r.archetype === match.archetype ? "main" : ""}>
                  <ArchetypePortrait arch={a} size="mini" />
                  <span className="rank-name">{a.name}</span>
                  <span className="rank-bar-wrap">
                    <span className="rank-bar-fill" style={{ width: `${r.similarity}%` }} />
                  </span>
                  <span className="rank-value">{r.similarity}%</span>
                </li>
              );
            })}
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

            <div className="form-row">
              <span>开局身份（推荐选「路人学生」体验完整剧情走向）</span>
              <div className="identity-grid">
                {IDENTITY_ORDER.map((id) => {
                  const g = identityGuides[id];
                  const active = identity === id;
                  const recommended = id === RECOMMENDED_IDENTITY;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`identity-card ${active ? "active" : ""}`}
                      onClick={() => setIdentity(id)}
                    >
                      <div className="identity-name">
                        {g.label}
                        {recommended && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 11,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "var(--accent)",
                              color: "#fff",
                              verticalAlign: "middle",
                            }}
                          >
                            推荐
                          </span>
                        )}
                      </div>
                      <p className="identity-desc">{g.shortDesc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

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

/**
 * 立绘组件——图片不存在时显示占位（角色首字 + 主色背景）
 */
function ArchetypePortrait({
  arch,
  size,
}: {
  arch: ArchetypeInfo;
  size: "large" | "mini";
}) {
  const [failed, setFailed] = useState(false);
  const className = `archetype-portrait ${size}`;

  if (failed) {
    return (
      <div
        className={`${className} placeholder`}
        style={{ background: `linear-gradient(135deg, ${arch.portraitColor}, ${arch.portraitColor}dd)` }}
      >
        <span className="placeholder-letter">{arch.name.charAt(0)}</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={arch.portraitUrl}
      alt={arch.name}
      onError={() => setFailed(true)}
    />
  );
}
