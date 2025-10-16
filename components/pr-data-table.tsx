"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ExternalLink,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type PR } from "./pr-card";

interface PRDataTableProps {
  prs: PR[];
  showPagination?: boolean;
  pageSize?: number;
}

export function PRDataTable({
  prs,
  showPagination = true,
  pageSize = 10,
}: PRDataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(prs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPRs = prs.slice(startIndex, endIndex);

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
    reviewed: {
      icon: CheckCircle,
      label: "Reviewed",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (prs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">No pull requests found</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pull Request</TableHead>
              <TableHead>Repository</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPRs.map((pr) => {
              const config = statusConfig[pr.status];
              const StatusIcon = config.icon;

              return (
                <TableRow key={pr.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div className="font-medium leading-tight">
                        {pr.title}
                      </div>
                      <div className="text-sm text-muted-foreground font-mono">
                        #{pr.number}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{pr.repo}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Image
                        src={pr.authorAvatar}
                        width={24}
                        height={24}
                        alt={pr.author}
                        className="h-6 w-6 rounded-full border border-border"
                      />
                      <span className="text-sm">{pr.author}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {pr.labels.slice(0, 3).map((label) => (
                        <Badge
                          key={label}
                          variant="secondary"
                          className="text-xs"
                        >
                          {label}
                        </Badge>
                      ))}
                      {pr.labels.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{pr.labels.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className={cn("flex items-center gap-2", config.color)}
                    >
                      <div className={cn("rounded-full p-1", config.bgColor)}>
                        <StatusIcon className="h-3 w-3" />
                      </div>
                      <span className="text-xs">{config.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {pr.updatedAt}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      asChild
                    >
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, prs.length)} of{" "}
            {prs.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                )
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
