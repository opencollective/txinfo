import React from "react";
import { cn } from "@/lib/utils";

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
  // Check if the tag has a key:value format
  const hasKeyValue = value.includes(":");

  if (hasKeyValue) {
    const [key, val] = value.split(":");

    // Generate colors based on the key and value
    const keyColor = stringToColor(key);

    // Determine if the value is numeric
    const isNumeric = /^\d+(\.\d+)?$/.test(val);

    // Choose color for value based on content
    let valueColor: string;

    if (isNumeric) {
      const num = parseFloat(val);
      if (num > 0) valueColor = "hsl(120, 70%, 85%)"; // Green for positive
      else if (num < 0) valueColor = "hsl(0, 70%, 85%)"; // Red for negative
      else valueColor = "hsl(200, 70%, 85%)"; // Blue for zero
    } else {
      valueColor = stringToColor(val);
    }

    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md text-xs font-medium",
          className
        )}
        {...props}
      >
        <span
          className="px-2 py-1 rounded-l-md ring-1 ring-inset ring-muted-foreground/20"
          style={{
            backgroundColor: keyColor,
            color: "black",
          }}
        >
          {key}
        </span>
        <span
          className="px-2 py-1 rounded-r-md ring-1 ring-inset ring-muted-foreground/20"
          style={{
            backgroundColor: valueColor,
            color: "black",
          }}
        >
          {val}
        </span>
      </span>
    );
  }

  // For regular tags without key:value format
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
