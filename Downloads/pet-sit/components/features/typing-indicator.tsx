"use client"

export function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span>{name ? `${name} is typing...` : "Typing..."}</span>
    </div>
  )
}
