"use client"

import * as React from "react"
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
} from "@tanstack/react-table"
import { Search, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type Member = {
  _id: Id<"classMembers">
  userId: Id<"userProfiles">
  name: string
  email: string
  role: "professor" | "ta" | "student"
  status: "active" | "revoked"
  permissions: string[]
  joinedAt: number
}

interface MembersDataTableProps {
  data: Member[]
}

export function MembersDataTable({ data }: MembersDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [roleFilter, setRoleFilter] = React.useState<string>("all")
  const updatePermissions = useMutation(api.classes.updateMemberPermissions)

  const handlePermissionToggle = async (
    memberId: Id<"classMembers">,
    permission: string,
    currentPermissions: string[],
  ) => {
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter((p) => p !== permission)
      : [...currentPermissions, permission]

    try {
      await updatePermissions({
        memberId,
        permissions: newPermissions,
      })
    } catch (error) {
      console.error("Failed to update permissions:", error)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "professor":
        return "default"
      case "ta":
        return "secondary"
      case "student":
        return "outline"
      default:
        return "outline"
    }
  }

  const columns: ColumnDef<Member>[] = [
    {
      id: "user",
      accessorFn: (row) => `${row.name} ${row.email}`,
      header: "USER",
      cell: ({ row }) => {
        const member = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={undefined} alt={member.name} />
              <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{member.name}</span>
              <span className="text-xs text-muted-foreground">
                {member.email}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "role",
      header: "ROLE",
      cell: ({ row }) => {
        const role = row.original.role
        const roleLabels: Record<string, string> = {
          professor: "Professor",
          ta: "Teaching Assistant",
          student: "Student",
        }
        return (
          <Badge variant={getRoleBadgeVariant(role)}>
            {roleLabels[role] || role}
          </Badge>
        )
      },
    },
    {
      id: "edit_solution",
      header: "EDIT SOLUTIONS",
      cell: ({ row }) => {
        const member = row.original
        const hasPermission = member.permissions.includes("edit_solution")
        return (
          <Switch
            checked={hasPermission}
            onCheckedChange={() =>
              handlePermissionToggle(
                member._id,
                "edit_solution",
                member.permissions,
              )
            }
          />
        )
      },
    },
    {
      id: "resolve_dispute",
      header: "RESOLVE DISPUTES",
      cell: ({ row }) => {
        const member = row.original
        const hasPermission = member.permissions.includes("resolve_dispute")
        return (
          <Switch
            checked={hasPermission}
            onCheckedChange={() =>
              handlePermissionToggle(
                member._id,
                "resolve_dispute",
                member.permissions,
              )
            }
          />
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const member = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {member.status === "revoked" && (
                  <DropdownMenuItem>Resend Invite</DropdownMenuItem>
                )}
                <DropdownMenuItem variant="destructive">
                  Remove Member
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Filter data by role
  const filteredData = React.useMemo(() => {
    if (roleFilter === "all") return data
    return data.filter((member) => {
      if (roleFilter === "student") return member.role === "student"
      if (roleFilter === "ta") return member.role === "ta"
      if (roleFilter === "professor") return member.role === "professor"
      return true
    })
  }, [data, roleFilter])

  const table = useReactTable({
    data: filteredData,
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
  })

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students, TAs, or emails..."
              value={
                (table.getColumn("user")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("user")?.setFilterValue(event.target.value)
              }
              className="pl-8"
            />
          </div>
        </div>
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="ta">Teaching Assistant</SelectItem>
            <SelectItem value="professor">Professor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  )
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
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
              table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length,
          )}{" "}
          of {table.getFilteredRowModel().rows.length} results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

