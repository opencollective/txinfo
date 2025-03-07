import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import {
  TimelineItem,
  TimelineContent,
  TimelineHeader,
  TimelineTitle,
  TimelineDescription,
} from "@/components/ui/timeline";

interface Props {
  content: string;
  user: {
    name: string;
    image: string;
    pubkey: string;
    npub: string;
  };
  created_at: number;
  hashtags: string[];
  showSeparator?: boolean;
  separatorContent?: React.ReactNode;
}

export default function NoteCard({
  content,
  user,
  created_at,
  hashtags,
  showSeparator,
  separatorContent,
}: Props) {
  return (
    <TimelineItem
      icon={
        <Avatar className="h-full w-full">
          <AvatarImage src={user.image} alt={user.name} />
          <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      }
      showSeparator={showSeparator}
      separatorContent={separatorContent}
      date={new Date(created_at * 1000).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}
      title={
        <a
          href={`https://njump.me/${user.npub}`}
          className="hover:underline inline-flex items-center gap-1"
          target="_blank"
          rel="noreferrer"
        >
          {user.name}
          <ExternalLink className="h-3 w-3" />
        </a>
      }
      description={
        <div className="space-y-4">
          <p className="whitespace-pre-wrap">{content}</p>

          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {hashtags
                .filter((t) => hashtags.indexOf(t) === hashtags.lastIndexOf(t))
                .map((hashtag) => (
                  <Badge key={hashtag} variant="secondary" className="text-xs">
                    #{hashtag}
                  </Badge>
                ))}
            </div>
          )}
        </div>
      }
    />
  );
}
