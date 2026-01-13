"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkipNavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The ID of the main content element to skip to */
  contentId?: string
}

/**
 * Skip navigation link for keyboard accessibility.
 * Becomes visible when focused, allowing keyboard users to skip to main content.
 */
const SkipNavLink = React.forwardRef<HTMLAnchorElement, SkipNavLinkProps>(
  ({ className, contentId = "main-content", children = "Skip to main content", ...props }, ref) => {
    return (
      <a
        ref={ref}
        href={`#${contentId}`}
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:left-4",
          "focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground",
          "focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "focus:shadow-lg",
          className
        )}
        {...props}
      >
        {children}
      </a>
    )
  }
)
SkipNavLink.displayName = "SkipNavLink"

export interface SkipNavContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The ID that the skip link points to */
  id?: string
}

/**
 * The main content wrapper that the skip link jumps to.
 * Use this to wrap your main content area.
 */
const SkipNavContent = React.forwardRef<HTMLDivElement, SkipNavContentProps>(
  ({ id = "main-content", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        id={id}
        tabIndex={-1}
        className={cn("outline-none", className)}
        {...props}
      />
    )
  }
)
SkipNavContent.displayName = "SkipNavContent"

export { SkipNavLink, SkipNavContent }
