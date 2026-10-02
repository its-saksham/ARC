import { useState } from "react";
import { onboardingSchema } from "../lib/validation";
import { saveOnboarding } from "../lib/api";
import styles from "../ui.module.css";
export function Onboarding({
  onSaved,
  onSignOut,
  email,
  signOutBusy = false,
  signOutError,
}: {
  onSaved: () => void;
  onSignOut: () => void;
  email?: string;
  signOutBusy?: boolean;
  signOutError?: string;
}) {
  const [focus, setFocus] = useState("Perception");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (busy) return;
    const result = onboardingSchema.safeParse({ focus, timezone });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    if (!confirmed) {
      setError("Confirm your timezone to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveOnboarding(focus, timezone);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.auth}>
      <div className={styles.brand}>
        ARC<span>YOUR STARTING POINT</span>
      </div>
      <p className={styles.eyebrow}>Set your direction</p>
      <h1>
        What will you
        <br />
        build first?
      </h1>
      <p>
        Your focus shapes one of your three daily quests. Every attribute still
        gets room to grow.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className={styles.panel}
      >
        <fieldset>
          <legend>Choose your focus</legend>
          {[
            [
              "Perception",
              "Build discipline",
              "Notice, focus, follow through.",
            ],
            [
              "Vitality",
              "Improve physical health",
              "Make space for energy and rest.",
            ],
            [
              "Intelligence",
              "Expand my capabilities",
              "Learn something. Put it to use.",
            ],
          ].map(([value, title, desc]) => (
            <label key={value} className={styles.choice}>
              <input
                type="radio"
                name="focus"
                value={value}
                checked={focus === value}
                onChange={() => setFocus(value)}
              />
              <span>
                <strong>{title}</strong>
                <small>{desc}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <label htmlFor="timezone">Your timezone</label>
        <input
          id="timezone"
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value);
            setConfirmed(false);
          }}
        />
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />{" "}
          I confirm this timezone for my daily quests.
        </label>
        <p className={styles.small}>
          Focus and timezone are saved once for this beta.
        </p>
        {error && (
          <><p role="alert" className={styles.error}>{error}</p>
          {/beta is full/i.test(error) && <a className={styles.back} href="/waitlist">Join waitlist</a>}</>
        )}
        <button className={styles.primary} disabled={busy}>
          {busy ? "Saving…" : "Begin my arc"}
        </button>
      </form>
      {email && <p className={styles.small}>Signed in as {email}</p>}
      {signOutError && (
        <p role="alert" className={styles.error}>
          {signOutError}
        </p>
      )}
      <button type="button" disabled={signOutBusy} onClick={onSignOut}>
        {signOutBusy ? "Signing out…" : "Sign out"}
      </button>
    </main>
  );
}
