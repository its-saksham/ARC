import { Link, useParams } from "react-router-dom";
import { attributes } from "../domain/assignment";
import type { DailyQuest, Today } from "../lib/api";
import styles from "../ui.module.css";
import { Icon } from "./Icon";
const focusName: Record<string, string> = {
  Perception: "Build discipline",
  Vitality: "Improve physical health",
  Intelligence: "Expand my capabilities",
};
export function TodayPage({ today }: { today: Today }) {
  const progress = today.total_xp % 200;
  const date = new Date(today.local_date + "T12:00:00Z").toLocaleDateString(
    "en",
    { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" },
  );
  return (
    <>
      <div className={styles.pageHeading}>
        <p className={styles.eyebrow}>{date}</p>
        <h1>Make today count.</h1>
        <p>Three quests. One steady arc.</p>
      </div>
      <div className={styles.sectionHeading}>
        <div>
          <h2>Today’s quests</h2>
        </div>
        <span className={styles.count}>{today.completed_count} of 3 complete</span>
      </div>
      <progress
        className={styles.dailyProgress}
        max={3}
        value={today.completed_count}
        aria-label="Daily quest progress"
      />
      {today.completed_count === 3 && (
        <p className={styles.notice} role="status">
          Perfect day. All three quests complete.
        </p>
      )}
      <div className={styles.questList}>
        {today.quests.map((q) => (
          <Link
            key={q.id}
            to={`/quest/${q.id}`}
            className={`${styles.questCard} ${q.completed ? styles.completed : ""}`}
          >
            <span className={styles.questIndex} aria-hidden="true">
              <Icon name={q.completed ? "check" : "focus"} />
            </span>
            <div>
              <span className={styles.tag}>
                {q.attribute} · {q.effort}
              </span>
              <h3>{q.title}</h3>
              <span className={styles.small}>
                {q.completed
                  ? "Completed"
                  : q.slot === "focus"
                    ? "For your focus"
                    : q.slot === "weakest"
                      ? "Room to grow"
                      : "Keep your balance"}
              </span>
            </div>
            <span className={styles.reward}>
              +{q.xp}
              <small>XP</small>
            </span>
            <Icon name="arrow" />
          </Link>
        ))}
      </div>
      <section className={styles.progressCard} aria-label="Your progression">
        <div className={styles.level}>
          <strong>Level {today.level}</strong>
          <span className={styles.small}>{today.total_xp.toLocaleString()} total XP</span>
          <progress value={progress} max={200} aria-label="XP toward next level" />
          <span className={styles.small}>{200 - progress} XP to level {today.level + 1}</span>
        </div>
        <div className={styles.rank}><strong>{today.rank}</strong><small>Rank</small></div>
        <div className={styles.streak}><strong>{today.streak}</strong><span>day streak</span></div>
      </section>
      <aside className={styles.quote}>
        <span aria-hidden="true">—</span>
        <p>
          Consistency starts with showing up.
          <br />
          One quest is enough to keep your streak alive.
        </p>
      </aside>
    </>
  );
}
export function QuestPage({
  today,
  onComplete,
  disabled,
  busy,
}: {
  today: Today;
  onComplete: (q: DailyQuest) => void;
  disabled: boolean;
  busy: boolean;
}) {
  const { id } = useParams();
  const quest = today.quests.find((q) => q.id === id);
  if (!quest)
    return (
      <>
        <h1>Quest unavailable</h1>
        <p>Your daily quests may have changed at midnight.</p>
        <Link to="/">View today’s quests</Link>
      </>
    );
  return (
    <>
      <Link to="/" className={styles.back}>
        ← Today’s quests
      </Link>
      <p className={styles.eyebrow}>
        {quest.attribute} / {quest.effort} effort
      </p>
      <h1>{quest.title}</h1>
      <div className={styles.panel}>
        <h2>Your practice</h2>
        <p className={styles.instructions}>{quest.instructions}</p>
        <p className={styles.small}>
          Adapt this practice to your abilities. Rest or stop if you feel
          discomfort.
        </p>
        <div className={styles.rewardLine}>
          <span>Completion reward</span>
          <strong>+{quest.xp} XP</strong>
        </div>
        <button
          className={styles.primary}
          disabled={disabled || quest.completed}
          onClick={() => onComplete(quest)}
        >
          {busy
            ? "Saving progress…"
            : quest.completed
              ? "Quest complete ✓"
              : "Complete quest"}
        </button>
        <p className={styles.small}>
          Mark complete after you’ve done the practice. Your progress is saved
          securely.
        </p>
      </div>
    </>
  );
}
export function StatusPage({ today }: { today: Today }) {
  const center = 160;
  const radius = 110;
  const point = (i: number, r: number) => {
    const angle = ((-90 + i * 72) * Math.PI) / 180;
    return [center + Math.cos(angle) * r, center + Math.sin(angle) * r];
  };
  const polygon = (scale: number) =>
    attributes.map((_, i) => point(i, radius * scale).join(",")).join(" ");
  return (
    <>
      <p className={styles.eyebrow}>A view of your growth</p>
      <h1>Your attributes.</h1>
      <p>
        Small actions add up. Each attribute starts at 20 and grows with earned
        XP.
      </p>
      <section className={styles.radarPanel}>
        <svg
          viewBox="0 0 320 320"
          role="img"
          aria-labelledby="radar-title radar-desc"
        >
          <title id="radar-title">Attribute radar chart</title>
          <desc id="radar-desc">
            {attributes
              .map((a) => `${a}: ${today.attributes[a].score} out of 100`)
              .join(". ")}
            . Numerical values follow below.
          </desc>
          {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => (
            <polygon
              key={scale}
              points={polygon(scale)}
              fill="none"
              stroke="#343E4B"
            />
          ))}
          {attributes.map((_, i) => (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={point(i, radius)[0]}
              y2={point(i, radius)[1]}
              stroke="#343E4B"
            />
          ))}
          <polygon
            points={attributes
              .map((a, i) =>
                point(i, (radius * today.attributes[a].score) / 100).join(","),
              )
              .join(" ")}
            fill="#9CB9DB"
            fillOpacity=".18"
            stroke="#9CB9DB"
            strokeWidth="2"
          />
          {attributes.map((a, i) => {
            const [x, y] = point(i, radius + 29);
            return (
              <text
                key={a}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#B9C5D4"
                fontSize="14"
              >
                {a}
              </text>
            );
          })}
        </svg>
      </section>
      <dl className={styles.attributeList}>
        {attributes.map((a, i) => (
          <div key={a}>
            <dt>
              <span className={styles.questIndex}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {a}
            </dt>
            <dd>
              <strong>
                {today.attributes[a].score}
                <small> / 100</small>
              </strong>
              <span>{today.attributes[a].xp} XP</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className={styles.small}>
        Attributes follow the same order everywhere: Strength, Intelligence,
        Vitality, Charisma, Perception.
      </p>
    </>
  );
}
export function ProfilePage({
  today,
  email,
  onSignOut,
  busy,
}: {
  today: Today;
  email: string;
  onSignOut: () => void;
  busy: boolean;
}) {
  return (
    <>
      <p className={styles.eyebrow}>Your starting point</p>
      <h1>Keep your direction.</h1>
      <div className={styles.panel}>
        <dl className={styles.profileList}>
          <div>
            <dt>Account</dt>
            <dd>{email}</dd>
          </div>
          <div>
            <dt>Focus</dt>
            <dd>{focusName[today.profile.focus]}</dd>
          </div>
          <div>
            <dt>Timezone</dt>
            <dd>{today.profile.timezone}</dd>
          </div>
          <div>
            <dt>Catalog</dt>
            <dd>Version {today.profile.catalog_version}</dd>
          </div>
        </dl>
        <p className={styles.small}>
          Your focus and timezone stay fixed during this beta so daily
          assignments and streaks remain consistent.
        </p>
        <button disabled={busy} onClick={onSignOut}>
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </div>
      <div className={styles.panel}>
        <h2>How progress works</h2>
        <p>
          Earn 10, 15 or 25 XP for light, standard or deep quests. Each 200 XP
          unlocks a new level.
        </p>
        <p>
          Ranks grow with total XP: E · 0, D · 1,500, C · 4,500, B · 9,000, A ·
          18,000, S · 36,000.
        </p>
        <p>
          Complete at least one quest each local day to keep your streak alive.
          Yesterday’s active day keeps it alive until today ends.
        </p>
      </div>
    </>
  );
}
