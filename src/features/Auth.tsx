import { useEffect, useState } from "react";
import { configured, supabase } from "../lib/api";
import { emailSchema, otpSchema } from "../lib/validation";
import styles from "../ui.module.css";
export function Auth() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const cooldown = Math.max(0, Math.ceil((until - now) / 1000));
  async function send() {
    if (busy || cooldown) return;
    const valid = emailSchema.safeParse(email);
    if (!valid.success) {
      setError(valid.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: valid.data,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setSent(true);
      setUntil(Date.now() + 60000);
      setNow(Date.now());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : String(
              (e as { message?: string }).message ??
                "Unable to send code. Try again.",
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    if (busy) return;
    const valid = otpSchema.safeParse(token);
    if (!valid.success) {
      setError(valid.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: valid.data,
        type: "email",
      });
      if (error) throw error;
    } catch (e) {
      setError(
        (e as { message?: string }).message ??
          "Unable to verify code. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!configured)
    return (
      <main className={styles.auth}>
        <div className={styles.brand}>
          ARC<span>V1 / BETA</span>
        </div>
        <h1>
          Your next chapter
          <br />
          starts small.
        </h1>
        <p>This ARC instance is waiting for its Supabase connection.</p>
        <p>
          Follow the repository setup guide to configure authentication and
          daily quests.
        </p>
      </main>
    );
  return (
    <main className={styles.auth}>
      <div className={styles.brand}>
        ARC<span>V1 / BETA</span>
      </div>
      <div className={styles.orbit} aria-hidden="true">
        A
      </div>
      <p className={styles.eyebrow}>A little progress. Every day.</p>
      <h1>
        Build the person
        <br />
        you want to become.
      </h1>
      <p>
        Three daily quests. Five attributes.
        <br />
        One steady arc of progress.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void (sent ? verify() : send());
        }}
        className={styles.panel}
      >
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          disabled={sent || busy}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {sent && (
          <>
            <p>We sent a code to {email}. Check your inbox and spam folder.</p>
            <label htmlFor="otp">Verification code</label>
            <input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <button className={styles.primary} disabled={busy}>
          {busy ? "Please wait…" : sent ? "Verify code" : "Send code"}
        </button>
        {sent && (
          <>
            <button
              type="button"
              disabled={busy || cooldown > 0}
              onClick={() => void send()}
            >
              {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setSent(false);
                setToken("");
                setError("");
              }}
            >
              Change email
            </button>
          </>
        )}
      </form>
      <p className={styles.small}>Free private beta · Made for steady growth</p>
    </main>
  );
}
