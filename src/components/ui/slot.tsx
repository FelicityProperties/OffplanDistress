"use client";

// Radix Slot uses hooks; re-exporting it from a client module lets server components render <Button asChild>.
export { Slot } from "@radix-ui/react-slot";
