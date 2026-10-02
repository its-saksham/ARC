export function Icon({name}:{name:"today"|"status"|"profile"|"check"|"focus"|"arrow"}) {
  const paths = {
    today:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
    status:<><path d="M5 20V12m7 8V4m7 16V8"/></>,
    profile:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2Z"/></>,
    check:<path d="m5 12 4 4L19 6"/>,
    focus:<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></>,
    arrow:<path d="m9 5 7 7-7 7"/>,
  };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
