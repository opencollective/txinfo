import { Tag } from "@/components/ui/tag";

const tagFilter = (t: string[], kinds?: string[]) =>
  kinds && kinds.length > 0
    ? kinds?.includes(t[0])
    : t[0] === "t" || t[0].length > 1;

export default function TagsList({
  tags,
  kinds,
}: {
  tags: string[][];
  kinds?: string[];
}) {
  if (!tags) return null;
  if (tags.length === 0) return null;

  // Create a Set of unique tag combinations and convert back to array
  const uniqueTags = Array.from(
    new Set(tags.filter((t) => tagFilter(t, kinds)).map((t) => t.join(":")))
  ).map((t) => t.split(":"));

  if (uniqueTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 group relative">
      {uniqueTags.map((t) => (
        <Tag key={t.join(":")} value={t.join(":")} />
      ))}
    </div>
  );
}
