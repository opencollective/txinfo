"use client";

import EditMetadataForm from "@/components/EditMetadataForm";
import NotesList from "@/components/NotesList";
import { removeTagsFromContent } from "@/lib/utils";
import { useNostr } from "@/providers/NostrProvider";
import type { URI } from "@/types";
import TagsList from "./TagsList";
import { Edit } from "lucide-react";
import { useEffect, useRef, useState } from "react";
export interface Metadata {
  name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
  pubkey: string;
  npub?: string;
}

export default function Metadata({ uri }: { uri: URI }) {
  const [isEditing, setIsEditing] = useState(false);
  const { subscribeToProfiles, profiles, notesByURI, subscribeToNotesByURI } =
    useNostr();
  subscribeToNotesByURI([uri]);
  subscribeToProfiles((notesByURI[uri] || []).map((e) => e.pubkey));

  const latestNote =
    notesByURI[uri] && notesByURI[uri][notesByURI[uri].length - 1];

  const inputRef = useRef<HTMLInputElement>(null);
  const description = removeTagsFromContent(latestNote?.content);
  const tags = latestNote?.tags;

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isEditing]);

  return (
    <div className="app">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold mt-8">Metadata</h2>
        {isEditing && (
          <EditMetadataForm
            uri={uri}
            content={description}
            tags={tags}
            inputRef={inputRef}
            onCancel={() => setIsEditing(false)}
          />
        )}
        {!isEditing && (
          <div className="group relative flex flex-row items-center">
            <p className="mt-1 text-sm font-bold pr-2">{description}</p>
            <TagsList tags={tags} />
            <button
              onClick={() => setIsEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacit ml-2"
            >
              <Edit className="h-4 w-4 mt-1 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        )}
        <h2 className="text-2xl font-semibold mt-8">History</h2>
        <NotesList profiles={profiles} notes={notesByURI[uri]} />
      </div>
    </div>
  );
}
