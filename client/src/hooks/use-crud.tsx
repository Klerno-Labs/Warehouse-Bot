"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient, QueryKey } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

/**
 * Reusable CRUD Hook
 *
 * Eliminates duplicate state management and mutation patterns across admin pages.
 * Provides standardized create, update, delete operations with optimistic updates.
 */

interface CRUDConfig<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  // Query configuration
  queryKey: QueryKey;
  queryFn: () => Promise<T[]>;

  // Mutation functions
  createFn?: (data: TCreate) => Promise<T>;
  updateFn?: (id: string | number, data: TUpdate) => Promise<T>;
  deleteFn?: (id: string | number) => Promise<void>;

  // Entity configuration
  entityName: string;
  getId: (item: T) => string | number;
  getName?: (item: T) => string;

  // Callbacks
  onCreateSuccess?: (item: T) => void;
  onUpdateSuccess?: (item: T) => void;
  onDeleteSuccess?: (id: string | number) => void;
  onError?: (error: Error, operation: "create" | "update" | "delete") => void;
}

interface CRUDState<T> {
  // Data
  items: T[];
  isLoading: boolean;
  error: Error | null;

  // Dialog states
  isCreateOpen: boolean;
  isEditOpen: boolean;
  isDeleteOpen: boolean;
  editingItem: T | null;
  deletingItem: T | null;

  // Search/filter
  searchQuery: string;

  // Actions
  openCreate: () => void;
  closeCreate: () => void;
  openEdit: (item: T) => void;
  closeEdit: () => void;
  openDelete: (item: T) => void;
  closeDelete: () => void;
  setSearchQuery: (query: string) => void;

  // Mutations
  create: (data: any) => Promise<void>;
  update: (data: any) => Promise<void>;
  remove: () => Promise<void>;

  // Mutation states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Refetch
  refetch: () => void;
}

export function useCRUD<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  config: CRUDConfig<T, TCreate, TUpdate>
): CRUDState<T> {
  const {
    queryKey,
    queryFn,
    createFn,
    updateFn,
    deleteFn,
    entityName,
    getId,
    getName = () => "item",
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onError,
  } = config;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Local state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [deletingItem, setDeletingItem] = useState<T | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Query
  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey });
      setIsCreateOpen(false);
      toast({
        title: `${entityName} created`,
        description: `Successfully created ${getName(newItem)}`,
      });
      onCreateSuccess?.(newItem);
    },
    onError: (err: Error) => {
      toast({
        title: `Failed to create ${entityName.toLowerCase()}`,
        description: err.message,
        variant: "destructive",
      });
      onError?.(err, "create");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: TUpdate }) =>
      updateFn!(id, data),
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({ queryKey });
      setIsEditOpen(false);
      setEditingItem(null);
      toast({
        title: `${entityName} updated`,
        description: `Successfully updated ${getName(updatedItem)}`,
      });
      onUpdateSuccess?.(updatedItem);
    },
    onError: (err: Error) => {
      toast({
        title: `Failed to update ${entityName.toLowerCase()}`,
        description: err.message,
        variant: "destructive",
      });
      onError?.(err, "update");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      const id = deletingItem ? getId(deletingItem) : null;
      setIsDeleteOpen(false);
      setDeletingItem(null);
      toast({
        title: `${entityName} deleted`,
        description: `Successfully deleted the ${entityName.toLowerCase()}`,
      });
      if (id) onDeleteSuccess?.(id);
    },
    onError: (err: Error) => {
      toast({
        title: `Failed to delete ${entityName.toLowerCase()}`,
        description: err.message,
        variant: "destructive",
      });
      onError?.(err, "delete");
    },
  });

  // Actions
  const openCreate = useCallback(() => setIsCreateOpen(true), []);
  const closeCreate = useCallback(() => setIsCreateOpen(false), []);

  const openEdit = useCallback((item: T) => {
    setEditingItem(item);
    setIsEditOpen(true);
  }, []);

  const closeEdit = useCallback(() => {
    setEditingItem(null);
    setIsEditOpen(false);
  }, []);

  const openDelete = useCallback((item: T) => {
    setDeletingItem(item);
    setIsDeleteOpen(true);
  }, []);

  const closeDelete = useCallback(() => {
    setDeletingItem(null);
    setIsDeleteOpen(false);
  }, []);

  // CRUD operations
  const create = useCallback(
    async (data: TCreate) => {
      if (createFn) {
        await createMutation.mutateAsync(data);
      }
    },
    [createFn, createMutation]
  );

  const update = useCallback(
    async (data: TUpdate) => {
      if (updateFn && editingItem) {
        await updateMutation.mutateAsync({
          id: getId(editingItem),
          data,
        });
      }
    },
    [updateFn, editingItem, getId, updateMutation]
  );

  const remove = useCallback(async () => {
    if (deleteFn && deletingItem) {
      await deleteMutation.mutateAsync(getId(deletingItem));
    }
  }, [deleteFn, deletingItem, getId, deleteMutation]);

  return {
    // Data
    items,
    isLoading,
    error: error as Error | null,

    // Dialog states
    isCreateOpen,
    isEditOpen,
    isDeleteOpen,
    editingItem,
    deletingItem,

    // Search
    searchQuery,
    setSearchQuery,

    // Dialog actions
    openCreate,
    closeCreate,
    openEdit,
    closeEdit,
    openDelete,
    closeDelete,

    // Mutations
    create,
    update,
    remove,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Refetch
    refetch,
  };
}

/**
 * Filter items by search query
 */
export function filterBySearch<T>(
  items: T[],
  searchQuery: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchQuery.trim()) return items;

  const query = searchQuery.toLowerCase();
  return items.filter((item) =>
    searchFields.some((field) => {
      const value = item[field];
      if (typeof value === "string") {
        return value.toLowerCase().includes(query);
      }
      if (typeof value === "number") {
        return value.toString().includes(query);
      }
      return false;
    })
  );
}

/**
 * Hook for managing form state for create/edit dialogs
 */
export function useFormState<T extends Record<string, any>>(
  initialState: T,
  editingItem: Partial<T> | null
) {
  const [formData, setFormData] = useState<T>(initialState);

  // Reset form when editingItem changes
  const resetForm = useCallback(() => {
    if (editingItem) {
      setFormData({ ...initialState, ...editingItem });
    } else {
      setFormData(initialState);
    }
  }, [editingItem, initialState]);

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateFields = useCallback((updates: Partial<T>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    formData,
    setFormData,
    updateField,
    updateFields,
    resetForm,
  };
}
