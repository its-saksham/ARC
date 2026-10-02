import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link, useSearchParams } from "react-router-dom";
import { getWaitlist, joinWaitlist, leaveWaitlist, type WaitlistEntry, type WaitlistSource } from "../lib/betaApi";
import { supabase } from "../lib/api";
import { Auth } from "./Auth";
import styles from "../ui.module.css";
export function Waitlist({session}:{session:Session|null}) {
  return session ? <Membership key={session.user.id} session={session}/> : <Auth intent="waitlist"/>;
}
function Membership({session}:{session:Session}) {
  const [entry,setEntry] = useState<WaitlistEntry>();
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [revision,setRevision] = useState(0);
  const request = useRef<AbortController|null>(null);
  const [params] = useSearchParams();
  const raw = params.get("source");
  const source:WaitlistSource = raw === "reddit" || raw === "x" ? raw : "direct";
  useEffect(() => {
    const controller = new AbortController();request.current = controller;
    getWaitlist(controller.signal).then(result => {
      if (!controller.signal.aborted) {setEntry(result);setError("");}
    }).catch((e:Error) => {if (!controller.signal.aborted) setError(e.message);});
    return () => {controller.abort();request.current?.abort();};
  },[revision]);
  async function mutate(leave:boolean) {
    if (busy) return;
    request.current?.abort();
    const controller = new AbortController();request.current = controller;
    setBusy(true);setError("");
    try {
      const result = await (leave ? leaveWaitlist(controller.signal) : joinWaitlist(source,controller.signal));
      if (!controller.signal.aborted) setEntry(result);
    } catch(e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to save. Try again.");
    } finally {if (!controller.signal.aborted) setBusy(false);}
  }
  async function signOut() {
    if (busy) return;
    request.current?.abort();
    const controller = new AbortController();request.current = controller;
    setBusy(true);setError("");
    try {const {error} = await supabase.auth.signOut({scope:"local"});if(error)throw error;}
    catch(e) {if(!controller.signal.aborted)setError((e as Error).message);}
    finally {if(!controller.signal.aborted)setBusy(false);}
  }
  return <main className={styles.auth}>
    <Link className={styles.brand} to="/discover">ARC</Link>
    <Link className={styles.back} to="/discover">Back to ARC</Link>
    <h1>A place for your next chapter.</h1>
    <p>Join the waitlist for future beta access. This does not reserve a current spot or start your daily quests.</p>
    <section className={styles.panel} aria-label="Waitlist membership">
      {!entry && !error && <p role="status">Checking your waitlist membership…</p>}
      {entry?.joined ? <><h2 role="status">You're on the waitlist.</h2><p>Your interest is saved. We'll use your verified email for beta access updates. No invitation date is promised.</p><button disabled={busy} onClick={() => void mutate(true)}>{busy ? "Saving…" : "Leave waitlist"}</button></> : entry && <><h2>Keep me in the loop</h2><p>By joining, you agree to receive beta access updates at your verified email.</p><button className={styles.primary} disabled={busy} onClick={() => void mutate(false)}>{busy ? "Saving…" : "Join waitlist"}</button></>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!entry && error && <button disabled={busy} onClick={() => setRevision(n=>n+1)}>Retry membership</button>}
    </section>
    <p className={styles.small}>Signed in as {session.user.email}</p>
    <button disabled={busy} onClick={() => void signOut()}>{busy ? "Please wait…" : "Sign out"}</button>
    <p className={styles.small}><Link to="/privacy">Privacy information</Link></p>
  </main>;
}
