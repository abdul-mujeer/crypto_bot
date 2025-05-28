"use client"

import type { ReactNode } from "react"
import { Sidebar } from "@/components/sidebar"

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen">
      <div className="w-64 border-r bg-background">
        <Sidebar />
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
