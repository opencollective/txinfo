import React from "react";
import { cn, isUrl } from "@/lib/utils";
import { Image } from "lucide-react";

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: string;
}
function stringToColor(str: string): string {
  if (!str || typeof str !== "string") return "hsl(0, 0%, 85%)";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate pastel color
  const h = hash % 360;
  return `hsl(${h}, 70%, 85%)`; // High lightness for pastel
}

export function Tag({ className, value, ...props }: TagProps) {
  const [match, kind, val] = value.match(/^([a-z]+):(.*)$/) || [];

  if (!match) {
    return <SimpleTag value={value} className={className} {...props} />;
  }

  if (kind === "t") {
    return <SimpleTag value={val} className={className} {...props} />;
  }
  return <ComboTag kind={kind} value={val} className={className} {...props} />;
}

function SimpleTag({ value, className, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-muted-foreground/20",
        className
      )}
      style={{
        backgroundColor: stringToColor(value),
        color: "black",
      }}
      {...props}
    >
      {value}
    </span>
  );
}

function ComboTag({
  kind,
  value,
  className,
  ...props
}: TagProps & { kind: string }) {
  if (!kind || !value) return null;
  // Generate colors based on the kind and value
  const kindColor = stringToColor(kind);

  // Determine if the value is numeric
  const isNumeric = /^\d+(\.\d+)?$/.test(value);

  // Choose color for value based on content
  let valueColor: string;

  if (isNumeric) {
    const num = parseFloat(value);
    if (num > 0) valueColor = "hsl(120, 70%, 85%)"; // Green for positive
    else if (num < 0) valueColor = "hsl(0, 70%, 85%)"; // Red for negative
    else valueColor = "hsl(200, 70%, 85%)"; // Blue for zero
  } else {
    valueColor = stringToColor(value);
  }

  valueColor = "rgba(0, 0, 0, 0.05)";

  let tagValue: React.ReactNode | string = value;

  if (kind === "picture") {
    tagValue = (
      <div className="group inline-block overflow-visible">
        <Image className="w-4 h-4" />
        {/* Thumbnail preview on hover */}
        <div className="absolute hidden group-hover:block z-50 top-[30px] left-0 p-1 bg-white dark:bg-gray-800 rounded shadow-lg">
          <img
            src={value}
            alt="Thumbnail"
            className="max-w-[200px] max-h-[200px] object-contain"
          />
        </div>
      </div>
    );
  } else if (isUrl(value)) {
    tagValue = <a href={value}>{value.replace(/^https?:\/\/(www\.)?/, "")}</a>;
  }

  return (
    <span
      className={cn(
        "relative inline-flex items-center rounded-md text-xs font-medium",
        className
      )}
      {...props}
    >
      <span
        className="px-2 py-1 rounded-l-md ring-1 ring-inset ring-muted-foreground/20"
        style={{
          backgroundColor: kindColor,
          color: "black",
        }}
      >
        {kind}
      </span>
      <span
        className="px-2 py-1 rounded-r-md ring-1 ring-inset ring-muted-foreground/20 overflow-hidden text-ellipsis h-6 max-w-40"
        title={value}
        style={{
          backgroundColor: valueColor,
          color: "black",
        }}
      >
        {tagValue}
      </span>
    </span>
  );
}
