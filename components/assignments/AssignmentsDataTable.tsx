"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Search,
  MoreHorizontal,
  FileText,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Assignment = {
  _id: Id<"assignments">;
  title: string;
  description?: string | null;
  _creationTime: number;
};

interface AssignmentsDataTableProps {
  data: Assignment[];
  classId: Id<"classes">;
}

export function AssignmentsDataTable({
  data,
  classId,
}: AssignmentsDataTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "_creationTime", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const deleteAssignment = useMutation(api.classes.deleteAssignment);

  const handleDelete = async (assignment: Assignment) => {
    if (
      confirm(
        `Are you sure you want to delete "${assignment.title}"? This will also delete all problems and solutions.`,
      )
    ) {
      try {
        await deleteAssignment({ assignmentId: assignment._id });
      } catch (error) {
        console.error("Failed to delete assignment:", error);
        alert("Failed to delete assignment. Please try again.");
      }
    }
  };

  const columns: ColumnDef<Assignment>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-2 h-8 gap-2 font-bold uppercase tracking-wider text-[10px]"
          >
            Title
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const assignment = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <Link
              href={`/classes/${classId}/assignments/${assignment._id}`}
              className="font-medium hover:text-primary transition-colors line-clamp-1"
            >
              {assignment.title}
            </Link>
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: "DESCRIPTION",
      cell: ({ row }) => {
        const description = row.getValue("description") as string | null;
        return (
          <div className="max-w-[300px] truncate text-muted-foreground">
            {description || (
              <span className="italic opacity-50">No description</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "_creationTime",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-2 h-8 gap-2 font-bold uppercase tracking-wider text-[10px]"
          >
            Created
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("_creationTime") as number);
        return (
          <div className="text-muted-foreground tabular-nums">
            {date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const assignment = row.original;

        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(
                        `/classes/${classId}/assignments/${assignment._id}`,
                      )
                    }
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Assignment
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDelete(assignment)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Assignment
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assignments..."
            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("title")?.setFilterValue(event.target.value)
            }
            className="pl-9 h-9"
          />
        </div>
      </div>
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="h-10 text-[10px] font-bold"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() =>
                    router.push(
                      `/classes/${classId}/assignments/${row.original._id}`,
                    )
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No assignments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {data.length > 10 && (
        <div className="flex items-center justify-end space-x-2">
          <div className="flex-1 text-xs text-muted-foreground">
            {table.getFilteredRowModel().rows.length} assignments found
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-2"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
