"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, AlertTriangle } from "lucide-react";
import { PRDataTable } from "./pr-data-table";
import { type PR } from "./pr-card";

interface PRGroupedTablesProps {
  prs: PR[];
}

type TimeGroup = "today" | "thisWeek" | "longTimeAgo";

interface GroupedPRs {
  today: PR[];
  thisWeek: PR[];
  longTimeAgo: PR[];
}

export function PRGroupedTables({ prs }: PRGroupedTablesProps) {
  // Group PRs by creation date
  const groupPRsByCreationDate = (prs: PR[]): GroupedPRs => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const grouped: GroupedPRs = {
      today: [],
      thisWeek: [],
      longTimeAgo: [],
    };

    prs.forEach((pr) => {
      const createdDate = new Date(pr.createdAtTimestamp);

      if (createdDate >= today) {
        grouped.today.push(pr);
      } else if (createdDate >= oneWeekAgo) {
        grouped.thisWeek.push(pr);
      } else {
        grouped.longTimeAgo.push(pr);
      }
    });

    return grouped;
  };

  const groupedPRs = groupPRsByCreationDate(prs);

  const groupConfig = {
    today: {
      title: "Today",
      icon: Clock,
      color: "text-green-600",
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
    thisWeek: {
      title: "This Week",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    longTimeAgo: {
      title: "A Long Time Ago",
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  };

  const renderGroup = (groupKey: TimeGroup, prs: PR[]) => {
    const config = groupConfig[groupKey];
    const Icon = config.icon;

    return (
      <Card key={groupKey} className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${config.bgColor}`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <h3 className="text-lg font-semibold">{config.title}</h3>
          </div>
          <Badge variant="secondary" className="text-sm">
            {prs.length}
          </Badge>
        </div>

        {prs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pull requests found
          </div>
        ) : (
          <PRDataTable prs={prs} showPagination={true} pageSize={10} />
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {renderGroup("today", groupedPRs.today)}
      {renderGroup("thisWeek", groupedPRs.thisWeek)}
      {renderGroup("longTimeAgo", groupedPRs.longTimeAgo)}
    </div>
  );
}
