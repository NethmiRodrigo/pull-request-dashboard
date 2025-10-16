import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PR {
  id: number;
  title: string;
  repo: string;
  number: number;
  author: string;
  authorAvatar: string;
  status: "pending" | "re-review" | "stagnant";
  updatedAt: string;
  labels: string[];
  url: string;
}

interface PRCardProps {
  pr: PR;
}

export function PRCard({ pr }: PRCardProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: "Pending Review",
      color: "text-info",
      bgColor: "bg-info/10",
    },
    "re-review": {
      icon: RefreshCw,
      label: "Needs Re-review",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    stagnant: {
      icon: AlertCircle,
      label: "Stagnant",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  };

  const config = statusConfig[pr.status];
  const StatusIcon = config.icon;

  return (
    <Card className="group transition-colors hover:bg-accent/50">
      <div className="flex items-start gap-4 p-4">
        {/* Status Indicator */}
        <div className={cn("mt-1 rounded-full p-2", config.bgColor)}>
          <StatusIcon className={cn("h-4 w-4", config.color)} />
        </div>

        {/* PR Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-balance font-medium leading-tight text-foreground">
                {pr.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{pr.repo}</span>
                <span>{"•"}</span>
                <span>#{pr.number}</span>
                <span>{"•"}</span>
                <span>
                  {"opened by"} {pr.author}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              asChild
            >
              <a href={pr.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>

          {/* Labels and Meta */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", config.color)}>
              {config.label}
            </Badge>
            {pr.labels.map((label) => (
              <Badge key={label} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">
              {pr.updatedAt}
            </span>
          </div>
        </div>

        {/* Author Avatar */}
        <Image
          src={pr.authorAvatar}
          width={40}
          height={40}
          alt={pr.author}
          className="h-10 w-10 shrink-0 rounded-full border border-border"
        />
      </div>
    </Card>
  );
}
