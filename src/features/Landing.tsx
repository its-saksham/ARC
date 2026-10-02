import { Link } from "react-router-dom";
import { useBetaAvailability } from "./useBetaAvailability";
import { Icon } from "./Icon";
import styles from "./landing.module.css";
export function Landing({signedIn}:{signedIn:boolean}) {
  const availability = useBetaAvailability();
  const full = availability.data?.remaining === 0;
  return <div className={styles.site}>
    <a className={styles.skip} href="#landing-main">Skip to content</a>
    <header className={styles.header}>
      <Link className={styles.brand} to="/discover" aria-label="ARC home">ARC</Link>
      <nav aria-label="Product navigation"><a href="#how-it-works">How it works</a><Link to="/waitlist">Waitlist</Link><Link className={styles.outline} to={signedIn ? "/" : "/login"}>{signedIn ? "My quests" : "Sign in"}</Link></nav>
    </header>
    <main id="landing-main">
      <section className={styles.hero}>
        <div>
          <h1>Three small quests.<br/>A stronger everyday.</h1>
          <p className={styles.lead}>Build momentum with daily actions, XP and a clear next step.</p>
          <div className={styles.actions}><Link className={styles.primary} to={signedIn ? "/" : full ? "/waitlist" : "/login"}>{signedIn ? "Open today's quests" : full ? "Join waitlist" : "Start free beta"}</Link>{!full && <Link className={styles.secondary} to="/waitlist">Join waitlist</Link>}</div>
          <div className={styles.availability}>
            {availability.data ? <p>{full ? "Beta is full — join the waitlist" : `${availability.data.remaining} of ${availability.data.capacity} beta spots left`}</p> : <><p>{availability.loading ? "Checking beta availability…" : "Availability temporarily unavailable"}</p>{!availability.loading && <button onClick={availability.retry} disabled={!availability.online}>Retry availability</button>}</>}
            <p className={styles.note}>{availability.data ? `${availability.data.capacity} total beta spots. ` : "Limited free beta. "}No reservation until onboarding.</p>
          </div>
        </div>
        <aside className={styles.preview} aria-label="Illustrative quest preview">
          <p className={styles.previewLabel}>Example quest</p>
          <div className={styles.previewBody}><div className={styles.previewTitle}><span className={styles.symbol}><Icon name="focus"/></span><div><h2>Make space to focus</h2><span className={styles.tag}>Perception</span></div></div>
            <p>Put your phone away and spend ten minutes on one important task.</p>
            <div className={styles.previewReward}><strong>+15 XP</strong><span>One small step forward</span></div>
          </div>
          <p className={styles.note}>Illustrative practice, not your assigned quest.</p>
        </aside>
      </section>
      <section id="how-it-works" className={styles.section}>
        <h2>Small actions. Steady progress.</h2>
        <ol className={styles.steps}>
          <li><Icon name="focus"/><div><h3>Choose your focus</h3><p>Build discipline, make space for health, or expand your capabilities.</p></div></li>
          <li><Icon name="check"/><div><h3>Do your daily quests</h3><p>Three concrete actions each day. Start with the one that feels manageable.</p></div></li>
          <li><Icon name="status"/><div><h3>See your progress</h3><p>Earn XP, level up, and grow across five attributes. One quest keeps your streak alive.</p></div></li>
        </ol>
      </section>
      <section className={styles.attributes} aria-label="Five attributes">{["Strength","Intelligence","Vitality","Charisma","Perception"].map(a => <span key={a}>{a}</span>)}</section>
      <section className={styles.section}><div className={styles.faqIntro}><h2>A small beta.<br/>Room to learn together.</h2><p>ARC is free during this beta. Try it, tell us what gets in your way, and help shape what comes next.</p></div><div className={styles.faq}>
        <details><summary>What does ARC do?</summary><p>ARC turns daily self-improvement into three practical quests, with XP, levels and streaks. It is not medical advice or a measure of your worth.</p></details>
        <details><summary>Do I need to install anything?</summary><p>Use ARC in your browser. You can also add it to your home screen. Offline snapshots are read-only; connect to save progress.</p></details>
        <details><summary>What if the beta is full?</summary><p>Join the verified-email waitlist. It expresses interest in future access, but does not reserve a current place.</p></details>
        <details><summary>What data does ARC use?</summary><p>Your email is used for authentication. ARC stores your focus, timezone, quest progress, and limited product events. Waitlist membership is private. <Link to="/privacy">Read the privacy information.</Link></p></details>
      </div></section>
    </main>
    <footer className={styles.footer}><Link className={styles.brand} to="/discover">ARC</Link><span>One steady arc of progress.</span><nav aria-label="Footer"><Link to="/privacy">Privacy</Link><a href="https://www.reddit.com/user/Antique_Ad1158/">Reddit</a><a href="https://x.com/Saksham52413336">X</a></nav></footer>
  </div>;
}
