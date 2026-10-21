import * as React from 'react'

export function ClubEmblem() {
  return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="club-emblem">
    <path d="M24 9C12-2 3 12 13 22 0 29 10 44 23 35 34 47 49 34 36 24 49 13 35 0 24 9Z" fill="currentColor" />
    <path d="m24 14 3 7 8 1-6 5 1 8-6-4-7 4 2-8-6-5 8-1Z" fill="var(--club-sun)" stroke="var(--card)" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="22" cy="24" r="1" fill="var(--club-ink)" /><circle cx="27" cy="24" r="1" fill="var(--club-ink)" />
    <path d="M23 27q2 2 4 0" stroke="var(--club-ink)" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
}
