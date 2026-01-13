"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/**
 * Figma-style Collaborative Cursors
 *
 * Features:
 * - Real-time cursor positions
 * - User presence indicators
 * - Page/view awareness
 * - Colored cursors per user
 * - Smooth interpolation
 * - Auto-hide after inactivity
 */

// Types
interface CursorPosition {
  x: number;
  y: number;
  timestamp: number;
}

interface CollaboratorPresence {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  cursor: CursorPosition | null;
  currentPage: string;
  lastActive: number;
  isActive: boolean;
}

interface CollaborationContextType {
  collaborators: CollaboratorPresence[];
  currentPageCollaborators: CollaboratorPresence[];
  updateCursor: (position: CursorPosition) => void;
  updatePage: (page: string) => void;
}

// Color palette for collaborators
const CURSOR_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
];

// Get consistent color for a user based on their ID
function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

// Context
const CollaborationContext = createContext<CollaborationContextType | null>(null);

// Simulated real-time presence (in production, use WebSocket)
export function CollaborationProvider({
  children,
  pageId,
}: {
  children: React.ReactNode;
  pageId: string;
}) {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [currentPage, setCurrentPage] = useState(pageId);

  // Simulate other users for demo
  useEffect(() => {
    // Demo collaborators - in production, this comes from WebSocket
    const demoCollaborators: CollaboratorPresence[] = [
      {
        id: "demo-1",
        name: "Sarah Chen",
        email: "sarah@example.com",
        initials: "SC",
        color: CURSOR_COLORS[0],
        cursor: { x: 400, y: 300, timestamp: Date.now() },
        currentPage: pageId,
        lastActive: Date.now(),
        isActive: true,
      },
      {
        id: "demo-2",
        name: "Mike Johnson",
        email: "mike@example.com",
        initials: "MJ",
        color: CURSOR_COLORS[1],
        cursor: { x: 600, y: 450, timestamp: Date.now() },
        currentPage: pageId,
        lastActive: Date.now() - 30000,
        isActive: true,
      },
    ];

    setCollaborators(demoCollaborators);

    // Simulate cursor movement
    const interval = setInterval(() => {
      setCollaborators((prev) =>
        prev.map((c) => ({
          ...c,
          cursor: c.cursor
            ? {
                x: c.cursor.x + (Math.random() - 0.5) * 20,
                y: c.cursor.y + (Math.random() - 0.5) * 20,
                timestamp: Date.now(),
              }
            : null,
        }))
      );
    }, 100);

    return () => clearInterval(interval);
  }, [pageId]);

  // Update own cursor position
  const updateCursor = useCallback((position: CursorPosition) => {
    // In production: send to WebSocket
    console.log("Cursor position:", position);
  }, []);

  // Update current page
  const updatePage = useCallback((page: string) => {
    setCurrentPage(page);
    // In production: send to WebSocket
  }, []);

  // Filter collaborators on current page
  const currentPageCollaborators = collaborators.filter(
    (c) => c.currentPage === currentPage && c.isActive
  );

  return (
    <CollaborationContext.Provider
      value={{
        collaborators,
        currentPageCollaborators,
        updateCursor,
        updatePage,
      }}
    >
      {children}
      <CollaborativeCursorsOverlay />
    </CollaborationContext.Provider>
  );
}

// Hook
export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error("useCollaboration must be used within CollaborationProvider");
  }
  return context;
}

// Cursor overlay
function CollaborativeCursorsOverlay() {
  const { currentPageCollaborators } = useCollaboration();

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      <AnimatePresence>
        {currentPageCollaborators.map((collaborator) => (
          <CollaboratorCursor key={collaborator.id} collaborator={collaborator} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Individual cursor
function CollaboratorCursor({ collaborator }: { collaborator: CollaboratorPresence }) {
  if (!collaborator.cursor) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: collaborator.cursor.x,
        y: collaborator.cursor.y,
      }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{
        type: "spring",
        damping: 30,
        stiffness: 500,
        mass: 0.5,
      }}
      className="absolute -translate-x-0.5 -translate-y-0.5"
      style={{ left: 0, top: 0 }}
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}
      >
        <path
          d="M5.65 2.922a1 1 0 0 0-1.453 1.138l3.65 15.333a1 1 0 0 0 1.819.283l2.82-4.476 5.026 1.12a1 1 0 0 0 1.151-1.39L5.65 2.922Z"
          fill={collaborator.color}
        />
        <path
          d="M5.65 2.922a1 1 0 0 0-1.453 1.138l3.65 15.333a1 1 0 0 0 1.819.283l2.82-4.476 5.026 1.12a1 1 0 0 0 1.151-1.39L5.65 2.922Z"
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* Name tag */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute left-4 top-4 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap"
        style={{ backgroundColor: collaborator.color }}
      >
        {collaborator.name}
      </motion.div>
    </motion.div>
  );
}

// Presence indicator for sidebar/header
export function PresenceIndicator() {
  const { currentPageCollaborators } = useCollaboration();

  if (currentPageCollaborators.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {currentPageCollaborators.slice(0, 3).map((collaborator) => (
          <motion.div
            key={collaborator.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="relative"
          >
            <Avatar className="h-7 w-7 border-2 border-white dark:border-zinc-900">
              <AvatarFallback
                style={{ backgroundColor: collaborator.color }}
                className="text-white text-xs"
              >
                {collaborator.initials}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator */}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-zinc-900 bg-emerald-500"
            />
          </motion.div>
        ))}
      </div>
      {currentPageCollaborators.length > 3 && (
        <span className="text-xs text-zinc-500 ml-1">
          +{currentPageCollaborators.length - 3}
        </span>
      )}
    </div>
  );
}

// Who's viewing this record indicator
export function ViewingIndicator({
  recordId,
  recordType,
}: {
  recordId: string;
  recordType: string;
}) {
  const { currentPageCollaborators } = useCollaboration();

  // Filter to those viewing this specific record
  const viewers = currentPageCollaborators.filter(
    (c) => c.currentPage.includes(recordId)
  );

  if (viewers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
    >
      <div className="flex -space-x-1.5">
        {viewers.slice(0, 2).map((viewer) => (
          <div
            key={viewer.id}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-medium"
            style={{ backgroundColor: viewer.color }}
          >
            {viewer.initials}
          </div>
        ))}
      </div>
      <span className="text-xs text-blue-600 dark:text-blue-400">
        {viewers.length === 1
          ? `${viewers[0].name.split(" ")[0]} is viewing`
          : `${viewers.length} people viewing`}
      </span>
    </motion.div>
  );
}

// Typing indicator for forms
export function TypingIndicator({ fieldId }: { fieldId: string }) {
  // Simulated - in production, track which fields users are editing
  const isTyping = false;
  const typer = "Sarah";

  if (!isTyping) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-xs text-zinc-500 flex items-center gap-1"
    >
      <span>{typer} is typing</span>
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        ...
      </motion.span>
    </motion.div>
  );
}
