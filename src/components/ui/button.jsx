import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-blue-500 hover:text-white shadow-md shadow-primary/20 active:scale-95",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-red-600 hover:text-white shadow-md active:scale-95",
        outline:
          "border border-input bg-background hover:bg-blue-500 hover:text-white hover:border-blue-500 active:scale-95",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-blue-500 hover:text-white active:scale-95",
        ghost: "bg-muted text-foreground hover:bg-blue-500 hover:text-white active:scale-95",
        link: "text-primary underline-offset-4 hover:underline hover:text-blue-600 cursor-pointer",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
