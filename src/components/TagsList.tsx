import { Tag } from "@/components/ui/tag";

const tagFilter = (t: string[]) => t[0] === "t" || t[0].length > 1;

export default function TagsList({ tags }: { tags: string[][] }) {
  if (!tags) return null;
  if (tags.length === 0) return null;
  if (tags.filter(tagFilter).length === 0) return null;
  return (
    <div className="flex flex-row gap-1 group relative">
      {tags.filter(tagFilter).map((t) => (
        <Tag key={t.join(":")} value={t.join(":")} />
      ))}
    </div>
  );
}
