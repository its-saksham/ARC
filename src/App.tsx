import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  ApiError,
  configured,
  supabase,
  todaySchema,
  trackEvent,
  type Today,
} from "./lib/api";
import { clearUser, readSnapshot } from "./lib/storage";
import { loadToday } from "./lib/loadToday";
import { Auth } from "./features/Auth";
import { Onboarding } from "./features/Onboarding";
import {
  TodayPage,
  QuestPage,
  StatusPage,
  ProfilePage,
} from "./features/Pages";
import { useCompletion } from "./features/useCompletion";
import { UpdatePrompt } from "./pwa";
import styles from "./ui.module.css";
function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");
  const lastUser = useRef<string | null>(null);
  const client = useQueryClient();
  useEffect(() => {
    if (!configured) return;
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      const prior = lastUser.current;
      if (prior && prior !== next?.user.id) {
        clearUser(prior);
        client.clear();
      }
      lastUser.current = next?.user.id ?? null;
      setSession(next);
      setLoading(false);
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message);
        else {
          lastUser.current = data.session?.user.id ?? null;
          setSession(data.session);
        }
        setLoading(false);
      })
      .catch((e: Error) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);
  if (loading)
    return (
      <main className={styles.auth} role="status">
        Opening your arc…
      </main>
    );
  if (error)
    return (
      <main className={styles.auth}>
        <h1>Unable to restore your session</h1>
        <p role="alert">{error}</p>
        <button onClick={() => location.reload()}>Retry</button>
      </main>
    );
  return (
    <>
      <UpdatePrompt />
      {session ? (
        <SignedIn key={session.user.id} session={session} />
      ) : (
        <Auth />
      )}
    </>
  );
}
function SignedIn({ session }: { session: Session }) {
  const user = session.user.id;
  const online = useOnline();
  const client = useQueryClient();
  const location = useLocation();
  const completion = useCompletion(user);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const query = useQuery({
    queryKey: ["today", user],
    queryFn: ({ signal }) => loadToday(user, signal),
    enabled: online && !completion.pending,
    refetchInterval: online && !completion.pending ? 30000 : false,
    retry: (count, error) =>
      !(error instanceof ApiError && error.expired) && count < 1,
  });
  const cached = todaySchema.safeParse(readSnapshot(user));
  const snapshot =
    cached.success && cached.data.profile.user_id === user ? cached.data : null;
  const result = query.data ?? (!online ? snapshot : null);
  const today = result && !result.needs_onboarding ? result : null;
  const hasToday = Boolean(today);
  useEffect(() => {
    if (hasToday && online)
      void trackEvent(
        location.pathname === "/status"
          ? "status_viewed"
          : location.pathname.startsWith("/quest/")
            ? "quest_viewed"
            : "today_viewed",
      );
  }, [location.pathname, online, hasToday]);
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      clearUser(user);
      client.clear();
    } catch (e) {
      setSignOutError((e as Error).message);
    } finally {
      setSigningOut(false);
    }
  }
  if (result?.needs_onboarding)
    return (
      <Onboarding
        email={session.user.email ?? ""}
        onSignOut={() => void signOut()}
        signOutBusy={signingOut}
        signOutError={signOutError}
        onSaved={() =>
          void client.invalidateQueries({ queryKey: ["today", user] })
        }
      />
    );
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <NavLink to="/" className={styles.brand} aria-label="ARC Today">
          ARC<span>PERSONAL PROGRESSION</span>
        </NavLink>
        <span className={styles.beta}>V1 · BETA</span>
      </header>
      <main id="main" className={styles.main}>
        {!online && (
          <p role="status" className={styles.notice}>
            Offline · Read-only snapshot
            {today ? ` from ${today.local_date}` : ""}. Connect to complete
            quests.
          </p>
        )}
        {query.error && (
          <div className={styles.notice} role="alert">
            <p>
              {query.error instanceof ApiError && query.error.expired
                ? "Your session expired. Sign out and sign in again."
                : query.error.message}
            </p>
            <button
              disabled={Boolean(completion.pending) || !online}
              onClick={() => void query.refetch()}
            >
              Retry
            </button>
            <button onClick={() => void signOut()} disabled={signingOut}>
              Sign out
            </button>
          </div>
        )}
        {signOutError && (
          <p role="alert" className={styles.error}>
            {signOutError}
          </p>
        )}
        {completion.pending && (
          <div className={styles.notice} role="status">
            <p>
              {completion.busy
                ? "Saving your progress…"
                : completion.error ||
                  "A completion is waiting to be confirmed."}
            </p>
            {!completion.busy && (
              <>
                <button
                  onClick={() => void completion.retry()}
                  disabled={!online}
                >
                  Retry completion
                </button>
                <button onClick={completion.discard}>Dismiss request</button>
                <p className={styles.small}>
                  Dismissing does not undo progress already saved by the server.
                </p>
              </>
            )}
          </div>
        )}
        {!completion.pending && completion.error && (
          <p role="alert" className={styles.error}>
            {completion.error}
          </p>
        )}
        {today ? (
          <Routes>
            <Route path="/" element={<TodayPage today={today} />} />
            <Route
              path="/quest/:id"
              element={
                <QuestPage
                  today={today}
                  onComplete={completion.complete}
                  disabled={
                    !online || completion.busy || Boolean(completion.pending)
                  }
                  busy={completion.busy}
                />
              }
            />
            <Route path="/status" element={<StatusPage today={today} />} />
            <Route
              path="/profile"
              element={
                <ProfilePage
                  today={today}
                  email={session.user.email ?? ""}
                  onSignOut={() => void signOut()}
                  busy={signingOut}
                />
              }
            />
            <Route
              path="*"
              element={
                <div>
                  <h1>Page not found</h1>
                  <NavLink to="/">Return to Today</NavLink>
                </div>
              }
            />
          </Routes>
        ) : query.isPending && online ? (
          <div className={styles.loading} role="status">
            Preparing your daily quests…
          </div>
        ) : !query.error ? (
          <div>
            <h1>No snapshot yet</h1>
            <p>Connect to load your daily quests.</p>
            <button onClick={() => void query.refetch()}>Retry</button>
            <button onClick={() => void signOut()}>Sign out</button>
          </div>
        ) : null}
      </main>
      <nav className={styles.nav} aria-label="Main navigation">
        {[
          ["/", "Today", "◷"],
          ["/status", "Status", "◇"],
          ["/profile", "Profile", "○"],
        ].map(([to, label, icon]) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => (isActive ? styles.navActive : "")}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
export type { Today };
