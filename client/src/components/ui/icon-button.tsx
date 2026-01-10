import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4",
        sm: "h-8 w-8 [&_svg]:h-3.5 [&_svg]:w-3.5",
        lg: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
        xl: "h-12 w-12 [&_svg]:h-6 [&_svg]:w-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  /**
   * Required accessible label describing the button action.
   * This is announced by screen readers.
   */
  "aria-label": string;
  /**
   * Optional tooltip text. If provided, shows on hover.
   * Defaults to aria-label if not specified.
   */
  tooltip?: string;
  /**
   * Show tooltip on hover. Defaults to true.
   */
  showTooltip?: boolean;
  /**
   * Render as a different element using Radix Slot
   */
  asChild?: boolean;
  /**
   * The icon to display
   */
  children: React.ReactNode;
}

/**
 * Accessible Icon Button Component
 *
 * An icon-only button with required aria-label for accessibility.
 * Includes optional tooltip for sighted users.
 *
 * @example
 * <IconButton aria-label="Delete item" onClick={handleDelete}>
 *   <Trash2 />
 * </IconButton>
 *
 * @example with custom tooltip
 * <IconButton aria-label="Edit" tooltip="Edit this record">
 *   <Edit />
 * </IconButton>
 */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      "aria-label": ariaLabel,
      tooltip,
      showTooltip = true,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const tooltipText = tooltip || ariaLabel;

    const button = (
      <Comp
        className={cn(iconButtonVariants({ variant, size, className }))}
        ref={ref}
        aria-label={ariaLabel}
        type="button"
        {...props}
      >
        {children}
        <span className="sr-only">{ariaLabel}</span>
      </Comp>
    );

    if (!showTooltip) {
      return button;
    }

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
