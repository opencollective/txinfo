"use client";
import { useNostr } from "@/providers/NostrProvider";
import NotesList from "./NotesList";

export default function LatestNotes() {
  const { subscribeToLatestNotes, latestNotes } = useNostr();
  subscribeToLatestNotes({
    kinds: ["ethereum:tx", "ethereum:address"],
    limit: 20,
  });

  console.log(">>> latestNotes", latestNotes);
  if (!latestNotes || latestNotes.length === 0) return null;
  return (
    <div>
      <NotesList profiles={{}} notes={latestNotes.slice(0, 20)} />
    </div>
  );
}
