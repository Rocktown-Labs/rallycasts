"use client";

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { cn } from "@rallycaststv/ui/lib/utils";
import { XIcon } from "lucide-react";
import * as React from "react";

/**
 * Edge-anchored sheet built on the Base UI Drawer. Supports swipe-to-dismiss
 * (direction set via `swipeDirection` on the root) and keyboard dismissal.
 */
function Sheet({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetBackdrop({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="sheet-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
        className
      )}
      {...props}
    />
  );
}

function SheetContent({
  children,
  className,
  showCloseButton = true,
  side = "left",
  ...props
}: DrawerPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  side?: "left" | "right";
}) {
  return (
    <SheetPortal>
      <SheetBackdrop />
      <DrawerPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "bg-background fixed inset-y-0 z-50 flex h-dvh flex-col outline-none",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "motion-reduce:transition-none",
          side === "left"
            ? "left-0 w-[86vw] max-w-[20rem] border-r data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full"
            : "right-0 w-[86vw] max-w-[20rem] border-l data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DrawerPrimitive.Close
            data-slot="sheet-close-button"
            className="ring-offset-background focus-visible:ring-ring absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DrawerPrimitive.Close>
        ) : null}
      </DrawerPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground text-base font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBackdrop,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
