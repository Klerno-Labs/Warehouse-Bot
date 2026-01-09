"use client";

import { useState } from "react";
import { HelpCircle, X, BookOpen, Video, ExternalLink } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface ContextualHelpProps {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
  videoUrl?: string;
  docsUrl?: string;
  examples?: Array<{
    title: string;
    description: string;
  }>;
  shortcuts?: Array<{
    keys: string[];
    action: string;
  }>;
}

export function ContextualHelp({
  title,
  description,
  steps,
  tips,
  videoUrl,
  docsUrl,
  examples,
  shortcuts,
}: ContextualHelpProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full hover:bg-primary/10"
          aria-label="Help"
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">{title}</h4>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Description */}
          <p className="text-sm text-muted-foreground">{description}</p>

          {/* Steps */}
          {steps && steps.length > 0 && (
            <div>
              <h5 className="font-medium text-sm mb-2">How to use:</h5>
              <ol className="space-y-2">
                {steps.map((step, index) => (
                  <li key={index} className="flex gap-2 text-sm">
                    <Badge
                      variant="outline"
                      className="h-5 w-5 p-0 flex items-center justify-center shrink-0"
                    >
                      {index + 1}
                    </Badge>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Examples */}
          {examples && examples.length > 0 && (
            <div>
              <h5 className="font-medium text-sm mb-2">Examples:</h5>
              <div className="space-y-2">
                {examples.map((example, index) => (
                  <div
                    key={index}
                    className="rounded-lg bg-muted/50 p-3 space-y-1"
                  >
                    <p className="font-medium text-xs">{example.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {example.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shortcuts */}
          {shortcuts && shortcuts.length > 0 && (
            <div>
              <h5 className="font-medium text-sm mb-2">Keyboard Shortcuts:</h5>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {shortcut.action}
                    </span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2 py-0.5 text-xs font-mono rounded bg-muted border"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {tips && tips.length > 0 && (
            <div>
              <h5 className="font-medium text-sm mb-2">💡 Tips:</h5>
              <ul className="space-y-1.5">
                {tips.map((tip, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-amber-500 shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Links */}
          {(videoUrl || docsUrl) && (
            <div className="pt-3 border-t space-y-2">
              {videoUrl && (
                <Link
                  href={videoUrl}
                  target="_blank"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Video className="h-4 w-4" />
                  Watch video tutorial
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {docsUrl && (
                <Link
                  href={docsUrl}
                  target="_blank"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <BookOpen className="h-4 w-4" />
                  Read full documentation
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Quick inline help tooltip for simple cases
export function QuickHelp({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-full hover:bg-primary/10"
        >
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <p className="text-xs text-muted-foreground">{text}</p>
      </PopoverContent>
    </Popover>
  );
}
