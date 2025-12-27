"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Rocket, LogIn, GraduationCap, School } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const profile = useQuery(api.classes.getViewerProfile);
  const classes = useQuery(api.classes.listMyClasses) ?? [];
  const crns = useQuery(api.classes.listMyCRNs) ?? [];
  const createClass = useMutation(api.classes.createClass);
  const publishCRN = useMutation(api.classes.publishCRN);
  const joinClass = useMutation(api.classes.joinCRN);

  const [showCreateClassDialog, setShowCreateClassDialog] = useState(false);
  const [showPublishCRNDialog, setShowPublishCRNDialog] = useState(false);
  const [showJoinClassDialog, setShowJoinClassDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const isAdmin = profile?.role === "admin";

  const adminCRNs = crns.filter(
    (c) => c.role === "professor" || c.role === "ta",
  );
  const studentCRNs = crns.filter((c) => c.role === "student" || c.role === "ta");

  const handleCreateClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("className") as string;
    try {
      const result = await createClass({ name });
      setShowCreateClassDialog(false);
      (e.target as HTMLFormElement).reset();
      router.push(`/classes/${result.classId}`);
    } catch (err) {
      console.error("Failed to create class:", err);
      alert(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setIsCreating(false);
    }
  };

  const handlePublishCRN = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPublishing(true);
    const formData = new FormData(e.currentTarget);
    const classId = formData.get("classId") as Id<"classes">;
    const year = parseInt(formData.get("year") as string, 10);
    const semester = formData.get("semester") as string;
    try {
      const result = await publishCRN({ classId, year, semester });
      setShowPublishCRNDialog(false);
      (e.target as HTMLFormElement).reset();
      router.push(`/crns/${result.crnId}`);
    } catch (err) {
      console.error("Failed to publish CRN:", err);
      alert(err instanceof Error ? err.message : "Failed to publish CRN");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsJoining(true);
    const formData = new FormData(e.currentTarget);
    const inviteCode = formData.get("inviteCode") as string;
    try {
      const result = await joinClass({
        inviteCode: inviteCode.trim().toUpperCase(),
      });
      if (result) {
        setShowJoinClassDialog(false);
        (e.target as HTMLFormElement).reset();
        router.push(`/${result.crnId}`);
      }
    } catch (err) {
      console.error("Failed to join class:", err);
      alert(err instanceof Error ? err.message : "Failed to join class");
    } finally {
      setIsJoining(false);
    }
  };

  if (profile === undefined) {
    return (
      <main className="p-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-primary/80 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <p className="ml-2 text-sm text-muted-foreground font-medium">Loading Dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {isAdmin ? "Professor Dashboard" : "Student Dashboard"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Welcome back, <span className="text-foreground font-medium">{profile?.email}</span>
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {isAdmin && (
          <>
            <Button
              onClick={() => setShowCreateClassDialog(true)}
              size="lg"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Class Template
            </Button>
            <Button
              onClick={() => setShowPublishCRNDialog(true)}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Rocket className="w-4 h-4 text-blue-500" />
              Publish Active CRN
            </Button>
          </>
        )}
        {!isAdmin && (
          <Button
            onClick={() => setShowJoinClassDialog(true)}
            size="lg"
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <LogIn className="w-4 h-4" />
            Join New Class
          </Button>
        )}
      </div>

      {/* Admin specific sections */}
      {isAdmin && (
        <div className="space-y-10">
          {/* Classes grid */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <School className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold tracking-tight">Your Course Templates</h2>
            </div>
            {classes.length === 0 ? (
              <Card className="border-dashed bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
                  <p className="text-muted-foreground text-sm">No course templates yet.</p>
                  <Button variant="outline" size="sm" onClick={() => setShowCreateClassDialog(true)}>
                    Create your first class
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {classes.map((klass) => (
                  <Card 
                    key={klass.classId}
                    className="hover:shadow-md transition-all cursor-pointer group border-border/60 hover:border-primary/50"
                    onClick={() => router.push(`/classes/${klass.classId}`)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
                        {klass.name}
                      </CardTitle>
                      <CardDescription className="font-mono text-[10px] opacity-50">
                        {klass.classId}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Admin CRNs table */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold tracking-tight">Active Class Instances (CRNs)</h2>
            </div>
            {adminCRNs.length === 0 ? (
              <Card className="border-dashed bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <p className="text-muted-foreground text-sm text-center max-w-xs">
                    No active CRNs found. Publish a template to start a live class.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-0 border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Invite Code</TableHead>
                      <TableHead>Your Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminCRNs.map((crn) => (
                      <TableRow key={crn.crnId} className="group cursor-pointer" onClick={() => router.push(`/crns/${crn.crnId}`)}>
                        <TableCell className="font-medium">{crn.className}</TableCell>
                        <TableCell>{crn.semester}</TableCell>
                        <TableCell>{crn.year}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-1.5 py-0.5 rounded text-primary text-[10px] font-bold tracking-wider">
                            {crn.inviteCode}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {crn.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={crn.status === "published" ? "default" : "secondary"}
                            className={cn(
                              "capitalize",
                              crn.status === "published" && "bg-green-500/10 text-green-600 border-green-500/20"
                            )}
                          >
                            {crn.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary">
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </section>
        </div>
      )}

      {/* Student specific sections */}
      {!isAdmin && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold tracking-tight">Your Enrolled Courses</h2>
          </div>
          {studentCRNs.length === 0 ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="bg-background w-12 h-12 rounded-full flex items-center justify-center shadow-sm">
                  <School className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-medium">You haven't joined any classes yet</p>
                  <p className="text-muted-foreground text-xs mt-1">Enter an invite code from your professor to get started.</p>
                </div>
                <Button onClick={() => setShowJoinClassDialog(true)} size="sm" variant="outline" className="mt-2">
                  <LogIn className="w-3.5 h-3.5 mr-2" />
                  Join Class
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-0 border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentCRNs.map((crn) => (
                    <TableRow key={crn.crnId} className="group cursor-pointer" onClick={() => router.push(`/${crn.crnId}`)}>
                      <TableCell className="font-semibold text-sm">{crn.className}</TableCell>
                      <TableCell>{crn.semester}</TableCell>
                      <TableCell>{crn.year}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {crn.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold text-primary">
                          Enter Course
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </section>
      )}

      {/* Create Class Dialog */}
      <Dialog open={showCreateClassDialog} onOpenChange={setShowCreateClassDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Class Template</DialogTitle>
            <DialogDescription>
              A template stores assignments and problems that can be published to active CRNs.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateClass} className="space-y-4 py-2">
            <Field>
              <FieldLabel>Class Name</FieldLabel>
              <Input
                name="className"
                required
                placeholder="e.g. Differential Equations"
                className="h-9"
                autoFocus
              />
            </Field>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setShowCreateClassDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Publish CRN Dialog */}
      <Dialog open={showPublishCRNDialog} onOpenChange={setShowPublishCRNDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish Active CRN</DialogTitle>
            <DialogDescription>
              Create a live instance of a course template for a specific term.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePublishCRN} className="space-y-4 py-2">
            <Field>
              <FieldLabel>Course Template</FieldLabel>
              <Select name="classId" required>
                <SelectTrigger className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((klass) => (
                    <SelectItem key={klass.classId} value={klass.classId}>
                      {klass.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Year</FieldLabel>
                <Input
                  type="number"
                  name="year"
                  required
                  defaultValue={new Date().getFullYear()}
                  min="2000"
                  max="2100"
                  className="h-9"
                />
              </Field>
              <Field>
                <FieldLabel>Semester</FieldLabel>
                <Select name="semester" required defaultValue="Spring">
                  <SelectTrigger className="w-full h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spring">Spring</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                    <SelectItem value="Fall">Fall</SelectItem>
                    <SelectItem value="Winter">Winter</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setShowPublishCRNDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPublishing || classes.length === 0}>
                {isPublishing ? "Publishing..." : "Publish Live Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join Class Dialog */}
      <Dialog open={showJoinClassDialog} onOpenChange={setShowJoinClassDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Course</DialogTitle>
            <DialogDescription>
              Enter the 8-character invite code provided by your instructor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoinClass} className="space-y-4 py-2">
            <Field>
              <FieldLabel>Invite Code</FieldLabel>
              <Input
                name="inviteCode"
                required
                placeholder="ABCD-1234"
                className="h-10 text-lg text-center font-mono uppercase tracking-widest"
                autoFocus
              />
            </Field>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setShowJoinClassDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isJoining} className="bg-indigo-600 hover:bg-indigo-700">
                {isJoining ? "Joining..." : "Join Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
