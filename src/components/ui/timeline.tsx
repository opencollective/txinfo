import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative space-y-4 pl-6 pt-4", className)}
        {...props}
      >
        <div className="absolute left-[9px] top-5 h-full w-0.5 bg-border" />
        {children}
      </div>
    );
  }
);
Timeline.displayName = "Timeline";

interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  date: Date | string | number;
  user: {
    name: string;
  };
  description?: React.ReactNode;
  tags?: string[];
  type: "description" | "tags" | "both";
}

const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ className, date, user, description, tags, type, ...props }, ref) => {
    const getActionText = () => {
      switch (type) {
        case "description":
          return "updated description";
        case "tags":
          return "updated tags";
        case "both":
          return "updated description and tags";
        default:
          return "made changes";
      }
    };

    return (
      <div ref={ref} className={cn("relative pb-4", className)} {...props}>
        <div className="absolute left-[-20px] top-1 z-10 h-3 w-3 rounded-full bg-muted-foreground" />
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <time>
              {new Date(date).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>
          <div className="flex flex-row gap-2 items-center">
            <div className="mt-1">
              <span className="font-medium">{user.name}</span>{" "}
              <span className="text-muted-foreground">{getActionText()}</span>
            </div>
            {description && (
              <div className="mt-2 rounded-md border border-muted-foreground/20 bg-muted/10 p-2 text-sm">
                {description}
              </div>
            )}
            {tags && tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border bg-muted px-2.5 py-0.5 text-xs font-semibold"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
TimelineItem.displayName = "TimelineItem";

export { Timeline, TimelineItem };
