"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "./label"
import { Input } from "./input"

export interface FormFieldProps extends React.ComponentProps<"input"> {
  /** Unique ID for the input - will be auto-generated if not provided */
  id?: string
  /** Label text for the input */
  label: string
  /** Error message to display */
  error?: string
  /** Helper text to display below the input */
  helperText?: string
  /** Whether the field is required */
  required?: boolean
  /** Optional description for screen readers */
  description?: string
  /** Container className */
  containerClassName?: string
}

/**
 * Accessible form field component that combines Label, Input, and error/helper text
 * with proper ARIA attributes for screen reader support.
 */
const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      id: providedId,
      label,
      error,
      helperText,
      required,
      description,
      className,
      containerClassName,
      ...props
    },
    ref
  ) => {
    // Generate stable ID if not provided
    const generatedId = React.useId()
    const id = providedId || generatedId
    const errorId = `${id}-error`
    const helperId = `${id}-helper`
    const descriptionId = `${id}-description`

    // Build aria-describedby based on what's present
    const describedByParts: string[] = []
    if (description) describedByParts.push(descriptionId)
    if (helperText && !error) describedByParts.push(helperId)
    if (error) describedByParts.push(errorId)
    const ariaDescribedBy = describedByParts.length > 0 ? describedByParts.join(" ") : undefined

    return (
      <div className={cn("space-y-2", containerClassName)}>
        <Label
          htmlFor={id}
          className={cn(error && "text-destructive")}
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only">(required)</span>}
        </Label>

        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}

        <Input
          ref={ref}
          id={id}
          className={cn(
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={ariaDescribedBy}
          aria-required={required}
          {...props}
        />

        {error && (
          <p
            id={errorId}
            className="text-sm font-medium text-destructive"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
FormField.displayName = "FormField"

export { FormField }
