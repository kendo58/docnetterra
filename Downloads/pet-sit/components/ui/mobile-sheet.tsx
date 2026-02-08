"use client"

import type * as React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

interface MobileSheetProps {
  title: string
  trigger?: React.ReactNode
  children: React.ReactNode
}

export function MobileSheet({ title, trigger, children }: MobileSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon" className="md:hidden bg-transparent">
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto pb-safe">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
