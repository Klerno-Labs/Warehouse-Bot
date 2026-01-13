"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, Redo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * Linear-style Undo/Redo System with Optimistic Updates
 *
 * Features:
 * - Global undo/redo stack
 * - Optimistic updates with rollback
 * - Toast notifications with undo button
 * - Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
 * - Action history with descriptions
 * - Batch operations support
 */

// Types
interface UndoableAction {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
  data?: any;
}

interface UndoRedoState {
  past: UndoableAction[];
  future: UndoableAction[];
  isExecuting: boolean;
  lastAction: UndoableAction | null;
}

type UndoRedoAction =
  | { type: "EXECUTE"; action: UndoableAction }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SET_EXECUTING"; isExecuting: boolean }
  | { type: "CLEAR_HISTORY" };

// Reducer
function undoRedoReducer(state: UndoRedoState, action: UndoRedoAction): UndoRedoState {
  switch (action.type) {
    case "EXECUTE":
      return {
        ...state,
        past: [...state.past, action.action].slice(-50), // Keep last 50 actions
        future: [], // Clear redo stack on new action
        lastAction: action.action,
      };

    case "UNDO":
      if (state.past.length === 0) return state;
      const actionToUndo = state.past[state.past.length - 1];
      return {
        ...state,
        past: state.past.slice(0, -1),
        future: [actionToUndo, ...state.future],
        lastAction: actionToUndo,
      };

    case "REDO":
      if (state.future.length === 0) return state;
      const actionToRedo = state.future[0];
      return {
        ...state,
        past: [...state.past, actionToRedo],
        future: state.future.slice(1),
        lastAction: actionToRedo,
      };

    case "SET_EXECUTING":
      return { ...state, isExecuting: action.isExecuting };

    case "CLEAR_HISTORY":
      return { ...state, past: [], future: [], lastAction: null };

    default:
      return state;
  }
}

// Context
interface UndoRedoContextType {
  canUndo: boolean;
  canRedo: boolean;
  isExecuting: boolean;
  lastAction: UndoableAction | null;
  historyCount: number;
  execute: (action: Omit<UndoableAction, "id" | "timestamp">) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clearHistory: () => void;
}

const UndoRedoContext = createContext<UndoRedoContextType | null>(null);

// Provider
export function UndoRedoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(undoRedoReducer, {
    past: [],
    future: [],
    isExecuting: false,
    lastAction: null,
  });

  const { toast } = useToast();

  // Execute a new action
  const execute = useCallback(async (action: Omit<UndoableAction, "id" | "timestamp">) => {
    const fullAction: UndoableAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    dispatch({ type: "SET_EXECUTING", isExecuting: true });

    try {
      // Execute the action (optimistic update should happen before this)
      await fullAction.execute();

      // Add to history
      dispatch({ type: "EXECUTE", action: fullAction });

      // Show toast with undo option
      toast({
        title: fullAction.description,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await fullAction.undo();
              dispatch({ type: "UNDO" });
            }}
            className="gap-1"
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </Button>
        ),
        duration: 5000,
      });
    } catch (error) {
      // Rollback on error
      try {
        await fullAction.undo();
      } catch (undoError) {
        console.error("Failed to undo action:", undoError);
      }
      throw error;
    } finally {
      dispatch({ type: "SET_EXECUTING", isExecuting: false });
    }
  }, [toast]);

  // Undo last action
  const undo = useCallback(async () => {
    if (state.past.length === 0 || state.isExecuting) return;

    const actionToUndo = state.past[state.past.length - 1];
    dispatch({ type: "SET_EXECUTING", isExecuting: true });

    try {
      await actionToUndo.undo();
      dispatch({ type: "UNDO" });

      toast({
        title: `Undid: ${actionToUndo.description}`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await actionToUndo.execute();
              dispatch({ type: "REDO" });
            }}
            className="gap-1"
          >
            <Redo2 className="h-3 w-3" />
            Redo
          </Button>
        ),
        duration: 5000,
      });
    } catch (error) {
      console.error("Undo failed:", error);
      toast({
        title: "Undo failed",
        description: "Could not undo the action. Please refresh.",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: "SET_EXECUTING", isExecuting: false });
    }
  }, [state.past, state.isExecuting, toast]);

  // Redo last undone action
  const redo = useCallback(async () => {
    if (state.future.length === 0 || state.isExecuting) return;

    const actionToRedo = state.future[0];
    dispatch({ type: "SET_EXECUTING", isExecuting: true });

    try {
      await actionToRedo.execute();
      dispatch({ type: "REDO" });

      toast({
        title: `Redid: ${actionToRedo.description}`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Redo failed:", error);
      toast({
        title: "Redo failed",
        description: "Could not redo the action.",
        variant: "destructive",
      });
    } finally {
      dispatch({ type: "SET_EXECUTING", isExecuting: false });
    }
  }, [state.future, state.isExecuting, toast]);

  // Clear history
  const clearHistory = useCallback(() => {
    dispatch({ type: "CLEAR_HISTORY" });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Cmd/Ctrl + Shift + Z = Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Cmd/Ctrl + Y = Redo (alternative)
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const value: UndoRedoContextType = {
    canUndo: state.past.length > 0 && !state.isExecuting,
    canRedo: state.future.length > 0 && !state.isExecuting,
    isExecuting: state.isExecuting,
    lastAction: state.lastAction,
    historyCount: state.past.length,
    execute,
    undo,
    redo,
    clearHistory,
  };

  return (
    <UndoRedoContext.Provider value={value}>
      {children}
    </UndoRedoContext.Provider>
  );
}

// Hook
export function useUndoRedo() {
  const context = useContext(UndoRedoContext);
  if (!context) {
    throw new Error("useUndoRedo must be used within an UndoRedoProvider");
  }
  return context;
}

// Floating Undo/Redo Controls
export function UndoRedoControls() {
  const { canUndo, canRedo, undo, redo, isExecuting, historyCount } = useUndoRedo();

  if (!canUndo && !canRedo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo || isExecuting}
            className="h-8 w-8 p-0 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-full"
          >
            <Undo2 className="h-4 w-4" />
          </Button>

          <span className="px-2 text-xs text-zinc-400 dark:text-zinc-600 tabular-nums">
            {historyCount}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo || isExecuting}
            className="h-8 w-8 p-0 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-full"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Helper hook for creating undoable mutations
 *
 * Example usage:
 * const { mutate } = useUndoableMutation({
 *   description: "Updated item quantity",
 *   mutationFn: async (newValue) => await api.updateItem(id, newValue),
 *   undoFn: async (oldValue) => await api.updateItem(id, oldValue),
 * });
 */
export function useUndoableMutation<TData, TVariables>({
  description,
  mutationFn,
  undoFn,
  onSuccess,
  onError,
}: {
  description: string | ((variables: TVariables) => string);
  mutationFn: (variables: TVariables) => Promise<TData>;
  undoFn: (variables: TVariables, data: TData) => Promise<void>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}) {
  const { execute } = useUndoRedo();

  const mutate = useCallback(async (variables: TVariables) => {
    let result: TData;

    await execute({
      type: "mutation",
      description: typeof description === "function" ? description(variables) : description,
      execute: async () => {
        result = await mutationFn(variables);
        onSuccess?.(result!, variables);
      },
      undo: async () => {
        await undoFn(variables, result!);
      },
    });
  }, [execute, description, mutationFn, undoFn, onSuccess]);

  return { mutate };
}
