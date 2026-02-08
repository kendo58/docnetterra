"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MessageSquarePlus, Zap } from "lucide-react"

interface QuickRepliesProps {
  onSelect: (message: string) => void
}

const quickReplies = [
  {
    category: "Greetings",
    messages: [
      "Hi! Thanks for reaching out!",
      "Hello! I'd love to learn more about your listing.",
      "Hey there! Your place looks great!",
    ],
  },
  {
    category: "Availability",
    messages: [
      "I'm available during those dates!",
      "Let me check my calendar and get back to you.",
      "Unfortunately, I'm not available then. Do you have other dates?",
    ],
  },
  {
    category: "Questions",
    messages: [
      "Could you tell me more about your pets?",
      "What are the main responsibilities?",
      "Is there parking available?",
      "What's the WiFi situation?",
    ],
  },
  {
    category: "Sit",
    messages: [
      "I'd love to confirm the sit! How do we proceed?",
      "This sounds perfect for me!",
      "Can we schedule a video call first?",
    ],
  },
]

export function QuickReplies({ onSelect }: QuickRepliesProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (message: string) => {
    onSelect(message)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0">
          <Zap className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            <h4 className="font-medium">Quick Replies</h4>
          </div>
          <div className="space-y-3">
            {quickReplies.map((category) => (
              <div key={category.category}>
                <p className="text-xs text-muted-foreground mb-1.5">{category.category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {category.messages.map((message, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                      onClick={() => handleSelect(message)}
                    >
                      {message.slice(0, 30)}...
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
