"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useSupabaseChat, type ChatMessage } from "@/hooks/use-supabase-chat"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Send, Check, CheckCheck, ExternalLink, Wifi, WifiOff } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface MessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  matchId: string
  otherUser: {
    id: string
    full_name?: string
    profile_photo_url?: string
  }
  listingTitle?: string
  conversationId?: string | null
}

export function MessageDialog({
  open,
  onOpenChange,
  matchId,
  otherUser,
  conversationId: initialConversationId,
}: MessageDialogProps) {
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const supabase = createBrowserClient()

  // Initialize conversation
  useEffect(() => {
    if (!open) {
      setInitializing(true)
      return
    }

    async function initConversation() {
      setInitializing(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        setCurrentUserId(user.id)

        let convId = initialConversationId

        if (!convId) {
          // Check for existing conversation
          const { data: existingConv } = await supabase
            .from("conversations")
            .select("id")
            .eq("match_id", matchId)
            .maybeSingle()

          if (existingConv) {
            convId = existingConv.id
          } else {
            // Create new conversation
            const { data: newConv, error: createError } = await supabase
              .from("conversations")
              .insert({
                match_id: matchId,
                participant1_id: user.id,
                participant2_id: otherUser.id,
              })
              .select("id")
              .single()

            if (createError) {
              console.error("[sitswap] Error creating conversation:", createError)
              return
            }
            convId = newConv.id
          }
        }

        setConversationId(convId ?? null)
      } catch (err) {
        console.error("[sitswap] Error initializing conversation:", err)
      } finally {
        setInitializing(false)
      }
    }

    initConversation()
  }, [open, matchId, initialConversationId, otherUser.id, supabase])

  // Only use the chat hook when we have all required IDs
  const chatEnabled = !!(conversationId && currentUserId && open && !initializing)

  const {
    messages,
    isLoading,
    isConnected,
    isRecipientTyping,
    isRecipientOnline,
    sendMessage,
    sendTypingIndicator,
    stopTyping,
    markAsRead,
  } = useSupabaseChat({
    conversationId: conversationId || "",
    currentUserId: currentUserId || "",
    recipientId: otherUser.id,
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isRecipientTyping])

  // Mark as read when viewing
  useEffect(() => {
    if (chatEnabled && messages.length > 0) {
      markAsRead()
    }
  }, [chatEnabled, messages, markAsRead])

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    if (chatEnabled) sendTypingIndicator()

    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !chatEnabled || sending) return

    setSending(true)
    const content = newMessage.trim()
    setNewMessage("")
    stopTyping()

    if (inputRef.current) {
      inputRef.current.style.height = "auto"
    }

    await sendMessage(content)
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (date: string) => format(new Date(date), "h:mm a")

  const getMessageStatus = (message: ChatMessage) => {
    if (message.status === "sending") return null
    if (message.is_read || message.status === "read") {
      return <CheckCheck className="h-3 w-3 text-blue-500" />
    }
    if (message.status === "delivered") {
      return <CheckCheck className="h-3 w-3" />
    }
    return <Check className="h-3 w-3" />
  }

  const initials =
    otherUser.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?"

  const showLoading = initializing || (chatEnabled && isLoading)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[600px] max-h-[80vh] flex-col p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherUser.profile_photo_url || undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                {isRecipientOnline && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">{otherUser.full_name || "User"}</DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {isRecipientTyping ? (
                    <span className="text-primary animate-pulse">typing...</span>
                  ) : isRecipientOnline ? (
                    <span className="text-green-600">Online</span>
                  ) : (
                    "Offline"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {chatEnabled &&
                (isConnected ? (
                  <Badge
                    variant="outline"
                    className="gap-1 text-[10px] text-green-600 border-green-200 bg-green-50 px-1.5 py-0.5"
                  >
                    <Wifi className="h-2.5 w-2.5" />
                    Live
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 text-[10px] text-amber-600 border-amber-200 bg-amber-50 px-1.5 py-0.5"
                  >
                    <WifiOff className="h-2.5 w-2.5" />
                  </Badge>
                ))}
              {conversationId && (
                <Link href={`/messages/${conversationId}`}>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Full Chat
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {showLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-3">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium">Start the conversation</p>
              <p className="text-sm text-muted-foreground mt-1">Say hello to {otherUser.full_name || "your match"}!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message) => {
                const isOwn = message.sender_id === currentUserId
                return (
                  <div key={message.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
                        isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md",
                        message.status === "sending" && "opacity-70",
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      <div className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
                        <span
                          className={cn("text-[10px]", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}
                        >
                          {formatTime(message.created_at)}
                        </span>
                        {isOwn && getMessageStatus(message)}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Typing indicator */}
              {isRecipientTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={() => chatEnabled && stopTyping()}
              placeholder="Type a message..."
              rows={1}
              className={cn(
                "flex-1 resize-none rounded-2xl bg-muted border-0 px-4 py-2.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary/20",
                "placeholder:text-muted-foreground",
                "max-h-[100px] min-h-[42px]",
              )}
              disabled={sending || !chatEnabled}
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending || !chatEnabled}
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full"
            >
              {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
