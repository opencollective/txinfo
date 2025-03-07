import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { type NostrNote, type NostrProfile } from "@/providers/NostrProvider";
import { npubEncode } from "nostr-tools/nip19";
interface Props {
  notes: NostrNote[];
  profiles: Record<string, NostrProfile>;
}

export default function NotesList({ notes, profiles }: Props) {
  const sortedNotes = [...notes].sort((a, b) => b.created_at - a.created_at);

  return (
    <Timeline>
      {sortedNotes.map((note) => {
        const hasTags = note.tags.some((t) => t[0] === "t");
        const type = hasTags ? (note.content ? "both" : "tags") : "description";

        return (
          <TimelineItem
            key={note.id}
            date={note.created_at * 1000}
            user={{
              name:
                profiles[note.pubkey]?.name ??
                `${npubEncode(note.pubkey).slice(0, 12)}...`,
            }}
            description={note.content}
            tags={note.tags.filter((t) => t[0] === "t").map((t) => t[1])}
            type={type}
          />
        );
      })}

      {notes.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No notes yet. Be the first to add one!
        </div>
      )}
    </Timeline>
  );
}
