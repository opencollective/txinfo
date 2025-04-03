import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { extractHashtags, getNpubFromPubkey } from "@/lib/utils";
import { useNostr, type NostrNote } from "@/providers/NostrProvider";
interface Props {
  notes: NostrNote[];
}

export default function NotesList({ notes }: Props) {
  const { profiles, subscribeToProfiles } = useNostr();
  const pubkeys = notes.map((note) => note.pubkey);
  subscribeToProfiles(pubkeys);

  return (
    <Timeline>
      {notes?.length > 0 &&
        notes.map((note, i) => {
          const hasTags = note.tags.some((t) => t[0] === "t");
          const type = hasTags
            ? note.content
              ? "both"
              : "tags"
            : "description";

          const { cleanDescription } = extractHashtags(note.content);

          return (
            <TimelineItem
              key={i}
              date={note.created_at * 1000}
              user={{
                name:
                  profiles[note.pubkey]?.name ??
                  getNpubFromPubkey(note.pubkey, { truncate: true }),
              }}
              description={cleanDescription}
              tags={note.tags}
              type={type}
            />
          );
        })}

      {notes?.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No notes yet. Be the first to add one!
        </div>
      )}
    </Timeline>
  );
}
