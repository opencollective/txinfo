import { useState, KeyboardEvent } from "react";
import { useNostr, type URI } from "@/providers/NostrProvider";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
export default function NoteForm({
  uri,
  inputRef,
  onCancel,
  content,
  tags,
  compact = false,
}: {
  uri: URI;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onCancel?: () => void;
  content?: string;
  tags?: string[][];
  compact?: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
  });
  const { publishMetadata, notesByURI } = useNostr();

  // Extract hashtags from description and return both tags and cleaned description
  const extractHashtags = (
    text: string
  ): { tags: string[]; cleanDescription: string } => {
    // Updated regex to match hashtags with simple values, key:attr format, and floating point numbers
    const hashtagRegex = /#(\w+(?::\w+(?:\.\d+)?)?)/g;
    const matches = text.match(hashtagRegex) || [];
    const tags = matches.map((tag) => tag.substring(1)); // Remove the # symbol

    // Remove hashtags from the description
    const cleanDescription = text
      .replace(hashtagRegex, "")
      .replace(/\s+/g, " ")
      .trim();

    return { tags, cleanDescription };
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(">>> handleFormSubmit: formData", formData);
    if (!formData.description.trim()) return;

    setIsSubmitting(true);

    try {
      // Extract hashtags and clean description
      const { tags, cleanDescription } = extractHashtags(formData.description);

      const newTags = tags.map((tag) => {
        if (tag.includes(":")) {
          return tag.split(":");
        }
        return ["t", tag];
      });

      const previousNote = notesByURI[uri]
        ? notesByURI[uri][notesByURI[uri].length - 1]
        : { tags: [] };

      await publishMetadata(uri, {
        content: cleanDescription,
        tags: [
          // Make sure we don't duplicate tags
          ...previousNote?.tags.filter(
            (t) => ["i", ...newTags.map((nt) => nt[0])].indexOf(t[0]) === -1
          ),
          ...newTags,
        ],
      });
      onCancel?.();
    } catch (error) {
      console.error("Error publishing note:", error);
      alert("Failed to publish note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Cancel editing when Escape key is pressed
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
    }
  };

  let defaultValue = content;
  if (tags) {
    let tagsString = "";
    tags
      .filter((t) => t[0] != "I")
      .map((t) => {
        tagsString += t[0] == "t" ? `#${t[1]} ` : `#${t[0]}:${t[1]} `;
      });

    defaultValue = `${content} ${tagsString}`;
  }

  return (
    <form onSubmit={handleFormSubmit}>
      <Input
        ref={inputRef}
        placeholder="Edit description... (use #hashtags for tags)"
        defaultValue={defaultValue}
        onChange={(e) => {
          setFormData({ description: e.target.value });
        }}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        disabled={isSubmitting}
        className={cn(
          "text-sm",
          compact && "shadow-none border-none pl-0 focus:pl-2"
        )}
      />
      {isSubmitting && (
        <div className="mt-1 text-xs text-muted-foreground flex items-center">
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
          Submitting...
        </div>
      )}
      {!compact && (
        <div className="text-xs text-muted-foreground mt-1">
          Press Enter to save. Press Escape to cancel. Use #hashtags to add
          tags.
        </div>
      )}
    </form>
  );
}
