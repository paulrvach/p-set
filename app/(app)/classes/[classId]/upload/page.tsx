"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileText, Sparkles } from "lucide-react";

export default function UploadStudioPage() {
  const params = useParams();
  const router = useRouter();

  const classIdParam = params?.classId;
  const classId = typeof classIdParam === "string" ? classIdParam : null;

  if (!classId) {
    return (
      <main className="p-8">
        <p className="text-red-600">Invalid class ID</p>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push(`/classes/${classId}`)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Class
        </button>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          Upload Studio
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          AI-powered PDF parsing and problem set generation
        </p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 p-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative inline-block mb-6">
            <Upload className="w-20 h-20 text-purple-600 dark:text-purple-400" />
            <Sparkles className="w-8 h-8 text-amber-500 absolute -top-2 -right-2 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            Coming Soon: Intelligent PDF Upload
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            The Upload Studio will allow you to upload PDF problem sets and answer
            keys, which will be automatically parsed using AI into structured
            assignments, problems, and solution lines with LaTeX support.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                PDF Upload
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Upload problem sets and answer keys in PDF format
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                AI Parsing
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                AI extracts problems, steps, and mathematical expressions
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Auto-Generate
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Automatically creates assignments with editable Tiptap content
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-left">
            <p className="text-sm text-amber-900 dark:text-amber-200 font-medium mb-2">
              📋 Current Workaround:
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              For now, you can manually create assignments and problems using the
              "Assignments" tab, then add solution steps with the Tiptap editor. The
              editor supports LaTeX math notation for complex equations.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

