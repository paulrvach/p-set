"use client"

import { CheckCircle2, Star, Mail } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CRNMemberStatsProps {
  activeMembers: number
  teachingAssistants: number
  pendingInvites: number
  className?: string
}

export function CRNMemberStats({
  activeMembers,
  teachingAssistants,
  pendingInvites,
  className,
}: CRNMemberStatsProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-3", className)}>
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              Active Members
            </p>
            <p className="text-2xl font-bold">{activeMembers}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
            <Star className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              Teaching Assistants
            </p>
            <p className="text-2xl font-bold">{teachingAssistants}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
            <Mail className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              Pending Invites
            </p>
            <p className="text-2xl font-bold">{pendingInvites}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

