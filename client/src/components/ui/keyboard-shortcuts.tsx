"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Command } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

/**
 * Keyboard Shortcuts System
 *
 * Features:
 * - Global keyboard shortcut handler
 * - Shortcuts dialog (Cmd+K or ?)
 * - Navigation shortcuts
 * - Action shortcuts
 */

interface Shortcut {
  key: string;
  label: string;
  description: string;
  action: () => void;
  category: "navigation" | "actions" | "global";
}

interface KeyboardShortcutsContextType {
  shortcuts: Shortcut[];
  registerShortcut: (shortcut: Shortcut) => void;
  unregisterShortcut: (key: string) => void;
  openDialog: () => void;
  closeDialog: () => void;
  isDialogOpen: boolean;
}

const KeyboardShortcutsContext = React.createContext<KeyboardShortcutsContextType | null>(null);

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);

  // Default shortcuts
  const defaultShortcuts: Shortcut[] = React.useMemo(() => [
    // Navigation
    { key: "g h", label: "G H", description: "Go to Dashboard", action: () => router.push("/"), category: "navigation" },
    { key: "g i", label: "G I", description: "Go to Inventory", action: () => router.push("/modules/inventory"), category: "navigation" },
    { key: "g j", label: "G J", description: "Go to Jobs", action: () => router.push("/modules/jobs"), category: "navigation" },
    { key: "g p", label: "G P", description: "Go to Purchase Orders", action: () => router.push("/purchasing/purchase-orders"), category: "navigation" },
    { key: "g s", label: "G S", description: "Go to Sales", action: () => router.push("/sales/orders"), category: "navigation" },
    { key: "g m", label: "G M", description: "Go to Manufacturing", action: () => router.push("/manufacturing/production-board"), category: "navigation" },

    // Actions
    { key: "c", label: "C", description: "Start Cycle Count", action: () => router.push("/modules/cycle-counts"), category: "actions" },
    { key: "r", label: "R", description: "Receive Inventory", action: () => router.push("/purchasing/receipts/new"), category: "actions" },
    { key: "n", label: "N", description: "New Item", action: () => router.push("/modules/inventory?action=new"), category: "actions" },
    { key: "m", label: "M", description: "Move Stock", action: () => router.push("/modules/inventory?action=move"), category: "actions" },
    { key: "a", label: "A", description: "Adjust Stock", action: () => router.push("/modules/inventory?action=adjust"), category: "actions" },

    // Global
    { key: "?", label: "?", description: "Show Keyboard Shortcuts", action: () => setIsDialogOpen(true), category: "global" },
    { key: "/", label: "/", description: "Focus Search", action: () => document.querySelector<HTMLInputElement>('[data-search-input]')?.focus(), category: "global" },
    { key: "Escape", label: "Esc", description: "Close Dialog/Modal", action: () => {}, category: "global" },
  ], [router]);

  // Register shortcut
  const registerShortcut = useCallback((shortcut: Shortcut) => {
    setShortcuts(prev => [...prev.filter(s => s.key !== shortcut.key), shortcut]);
  }, []);

  // Unregister shortcut
  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts(prev => prev.filter(s => s.key !== key));
  }, []);

  // Key sequence tracking for multi-key shortcuts (e.g., "g h")
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const sequenceTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Handle keyboard events
  useEffect(() => {
    const allShortcuts = [...defaultShortcuts, ...shortcuts];

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Cmd/Ctrl + K for command palette (future)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsDialogOpen(true);
        return;
      }

      // Clear sequence timeout
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }

      // Add key to sequence
      const key = e.key.toLowerCase();
      const newSequence = [...keySequence, key];
      setKeySequence(newSequence);

      // Check for matching shortcut
      const sequenceStr = newSequence.join(" ");
      const matchingShortcut = allShortcuts.find(s => s.key.toLowerCase() === sequenceStr);

      if (matchingShortcut) {
        e.preventDefault();
        matchingShortcut.action();
        setKeySequence([]);
        return;
      }

      // Check for single-key shortcut
      const singleKeyShortcut = allShortcuts.find(s => s.key.toLowerCase() === key && !s.key.includes(" "));
      if (singleKeyShortcut && keySequence.length === 0) {
        e.preventDefault();
        singleKeyShortcut.action();
        setKeySequence([]);
        return;
      }

      // Set timeout to clear sequence
      sequenceTimeoutRef.current = setTimeout(() => {
        setKeySequence([]);
      }, 1000);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, [defaultShortcuts, shortcuts, keySequence]);

  const allShortcuts = [...defaultShortcuts, ...shortcuts];

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        shortcuts: allShortcuts,
        registerShortcut,
        unregisterShortcut,
        openDialog: () => setIsDialogOpen(true),
        closeDialog: () => setIsDialogOpen(false),
        isDialogOpen,
      }}
    >
      {children}
      <ShortcutsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        shortcuts={allShortcuts}
      />
      {/* Key sequence indicator */}
      {keySequence.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 px-3 py-2 rounded-lg bg-zinc-900 text-white text-sm font-mono">
          {keySequence.join(" ")}
        </div>
      )}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  const context = React.useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error("useKeyboardShortcuts must be used within KeyboardShortcutsProvider");
  }
  return context;
}

// Shortcuts Dialog
function ShortcutsDialog({
  open,
  onOpenChange,
  shortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: Shortcut[];
}) {
  const navigationShortcuts = shortcuts.filter(s => s.category === "navigation");
  const actionShortcuts = shortcuts.filter(s => s.category === "actions");
  const globalShortcuts = shortcuts.filter(s => s.category === "global");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and perform actions quickly
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Navigation */}
          <ShortcutSection title="Navigation" shortcuts={navigationShortcuts} />

          {/* Actions */}
          <ShortcutSection title="Actions" shortcuts={actionShortcuts} />

          {/* Global */}
          <ShortcutSection title="Global" shortcuts={globalShortcuts} />
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Press <Kbd>?</Kbd> or <Kbd>Cmd</Kbd> + <Kbd>K</Kbd> to open this dialog
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutSection({ title, shortcuts }: { title: string; shortcuts: Shortcut[] }) {
  if (shortcuts.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 text-muted-foreground">{title}</h4>
      <div className="grid gap-2">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.key}
            className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
          >
            <span className="text-sm">{shortcut.description}</span>
            <div className="flex items-center gap-1">
              {shortcut.label.split(" ").map((key, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-muted-foreground text-xs">then</span>}
                  <Kbd>{key}</Kbd>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Keyboard key display
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded",
        "bg-muted border border-border text-[11px] font-mono font-medium",
        "text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  );
}

// Shortcut hint for buttons/actions
export function ShortcutHint({ shortcut }: { shortcut: string }) {
  return (
    <span className="ml-auto text-xs text-muted-foreground opacity-60">
      {shortcut}
    </span>
  );
}

// Button with shortcut display
export function KeyboardShortcutButton({
  shortcut,
  onClick,
  children,
  className,
}: {
  shortcut: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full px-3 py-2 rounded-md",
        "hover:bg-accent transition-colors",
        className
      )}
    >
      <span>{children}</span>
      <Kbd>{shortcut}</Kbd>
    </button>
  );
}
