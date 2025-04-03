"use client";
import { useNostr } from "@/providers/NostrProvider";
import NotesList from "./NotesList";

export default function LatestNotes() {
  const { subscribeToLatestNotes, latestNotes } = useNostr();
  subscribeToLatestNotes({
    kinds: ["ethereum:tx", "ethereum:address"],
    limit: 10,
  });

  if (!latestNotes || latestNotes.length === 0) return null;

  return (
    <div>
      <NotesList notes={latestNotes.slice(0, 10)} />
    </div>
  );
}
