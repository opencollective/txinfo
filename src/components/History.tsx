"use client";

import NotesList from "@/components/NotesList";
import { useNostr } from "@/providers/NostrProvider";
import type { URI } from "@/types";
export interface Metadata {
  name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
  pubkey: string;
  npub?: string;
}

export default function Metadata({ uri }: { uri: URI }) {
  const { notesByURI, subscribeToNotesByURI } = useNostr();
  subscribeToNotesByURI([uri]);

  return (
    <div className="app">
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold mt-8 mb-0 pb-0">History</h2>
        <NotesList notes={notesByURI[uri]} className="mt-0" />
      </div>
    </div>
  );
}
