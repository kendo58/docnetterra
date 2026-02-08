"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Send, Loader2, Check, CheckCheck } from "lucide-react"
import { format, isToday, isYesterday } from "date-fns"
import type { Message } from "@/lib/types/database"
import { QuickReplies } from "@/components/features/quick-replies"
import { TypingIndicator } from "@/components/features/typing-indicator"
import { cn } from "@/lib/utils"

interface ChatInterfaceProps {
  conversationId: string
  currentUserId: string
  otherUserId: string
  otherUserName?: string
  otherUserPhoto?: string
  initialMessages: Message[]
}

export function ChatInterface({
  conversationId,
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserPhoto,
  initialMessages,
}: ChatInterfaceProps) {
  const supabase = createBrowserClient()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingBroadcast = useRef<number>(0)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      })
    }
  }, [])

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [])

  useEffect(() => {
    scrollToBottom(false)
  }, [scrollToBottom])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    adjustTextareaHeight()
  }, [newMessage, adjustTextareaHeight])

  useEffect(() => {
    console.log("[sitswap] Setting up realtime subscription for conversation:", conversationId)

    const channelName = `chat-${conversationId}-${Date.now()}`
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: currentUserId },
      },
    })

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("[sitswap] Received new message via realtime:", payload.new)
          const newMsg = payload.new as Message
          if (newMsg.sender_id !== currentUserId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })

            supabase
              .from("messages")
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq("id", newMsg.id)
              .then(() => console.log("[sitswap] Marked message as read"))
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("[sitswap] Message updated:", payload.new)
          const updatedMsg = payload.new as Message
          setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)))
        },
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id === otherUserId) {
          setIsOtherUserTyping(true)
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
          }
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherUserTyping(false)
          }, 3000)
        }
      })
      .subscribe((status) => {
        console.log("[sitswap] Subscription status:", status)
        if (status === "SUBSCRIBED") {
          setIsSubscribed(true)
          console.log("[sitswap] Successfully subscribed to realtime channel")
        }
      })

    supabase
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", currentUserId)
      .eq("is_read", false)
      .then(() => console.log("[sitswap] Marked existing messages as read"))

    return () => {
      console.log("[sitswap] Cleaning up realtime subscription")
      setIsSubscribed(false)
      supabase.removeChannel(channel)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [conversationId, currentUserId, otherUserId, supabase])

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (!isSubscribed) {
        console.log("[sitswap] Polling for messages (realtime not connected)")
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })

        if (data) {
          setMessages((prev) => {
            const prevIds = new Set(prev.map((m) => m.id))
            const newMessages = data.filter((m) => !prevIds.has(m.id) && !m.id.startsWith("temp-"))
            if (newMessages.length > 0) {
              console.log("[sitswap] Found new messages via polling:", newMessages.length)
              return [
                ...prev.filter((m) => !m.id.startsWith("temp-") || data.some((d) => d.id === m.id)),
                ...newMessages,
              ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            }
            return prev
          })
        }
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [conversationId, isSubscribed, supabase])

  const broadcastTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastTypingBroadcast.current < 1000) return
    lastTypingBroadcast.current = now

    supabase.channel(`conversation:${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserId },
    })
  }, [conversationId, currentUserId, supabase])

  const handleQuickReply = (message: string) => {
    setNewMessage(message)
    textareaRef.current?.focus()
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()

    const trimmedMessage = newMessage.trim()
    if (!trimmedMessage || isSending) return

    setIsSending(true)
    const tempId = `temp-${Date.now()}`

    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content: trimmedMessage,
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setNewMessage("")

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          receiver_id: otherUserId,
          content: trimmedMessage,
        })
        .select()
        .single()

      if (error) throw error

      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)))

      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId)

      await supabase.from("notifications").insert({
        user_id: otherUserId,
        type: "message",
        title: "New Message",
        body: trimmedMessage.substring(0, 100),
        data: { conversation_id: conversationId },
      })

      textareaRef.current?.focus()
    } catch (error) {
      console.error("[sitswap] Error sending message:", error)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setNewMessage(trimmedMessage)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, "h:mm a")
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`
    } else {
      return format(date, "MMM d, h:mm a")
    }
  }

  const groupedMessages = messages.reduce(
    (groups, message, index) => {
      const messageDate = new Date(message.created_at)
      const prevMessage = index > 0 ? messages[index - 1] : null
      const prevMessageDate = prevMessage ? new Date(prevMessage.created_at) : null

      const showDateDivider = !prevMessageDate || messageDate.toDateString() !== prevMessageDate.toDateString()

      if (showDateDivider) {
        groups.push({ type: "date", date: messageDate })
      }

      groups.push({ type: "message", message })
      return groups
    },
    [] as Array<{ type: "date"; date: Date } | { type: "message"; message: Message }>,
  )

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-muted/30 to-background">
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Send className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Start the conversation</h3>
              <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                Say hello and introduce yourself! This is the beginning of your conversation.
              </p>
            </div>
          )}

          {groupedMessages.map((item, index) => {
            if (item.type === "date") {
              return (
                <div key={`date-${index}`} className="flex items-center justify-center my-6">
                  <div className="bg-muted/80 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm">
                    <span className="text-xs font-medium text-muted-foreground">
                      {isToday(item.date)
                        ? "Today"
                        : isYesterday(item.date)
                          ? "Yesterday"
                          : format(item.date, "MMMM d, yyyy")}
                    </span>
                  </div>
                </div>
              )
            }

            const message = item.message
            const isCurrentUser = message.sender_id === currentUserId
            const messageDate = new Date(message.created_at)

            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2 sm:gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                  isCurrentUser ? "flex-row-reverse" : "flex-row",
                )}
              >
                {!isCurrentUser && (
                  <Avatar className="h-8 w-8 shrink-0 shadow-md">
                    <AvatarImage src={otherUserPhoto || "/placeholder.svg"} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {otherUserName?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "flex flex-col gap-1 max-w-[80%] sm:max-w-[70%]",
                    isCurrentUser ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 shadow-sm",
                      isCurrentUser
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card text-card-foreground rounded-bl-md border",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
                  </div>
                  <div
                    className={cn("flex items-center gap-1.5 px-1", isCurrentUser ? "flex-row-reverse" : "flex-row")}
                  >
                    <span className="text-[10px] text-muted-foreground">{formatMessageTime(messageDate)}</span>
                    {isCurrentUser && (
                      <span className="text-muted-foreground">
                        {message.is_read ? (
                          <CheckCheck className="h-3 w-3 text-primary" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {isOtherUserTyping && (
            <div className="flex gap-2 sm:gap-3 animate-in fade-in-0">
              <Avatar className="h-8 w-8 shrink-0 shadow-md">
                <AvatarImage src={otherUserPhoto || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {otherUserName?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-3 sm:p-4">
        <div className="mx-auto max-w-3xl">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
            <QuickReplies onSelect={handleQuickReply} />

            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  broadcastTyping()
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="min-h-[44px] max-h-[150px] resize-none rounded-2xl border-input bg-muted/50 px-4 py-3 pr-12 text-sm focus-visible:ring-1"
                disabled={isSending}
                rows={1}
              />
            </div>

            <Button
              type="submit"
              size="icon"
              disabled={isSending || !newMessage.trim()}
              className="h-11 w-11 shrink-0 rounded-full shadow-md transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50"
            >
              {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>

          <p className="mt-2 text-[10px] text-muted-foreground text-center hidden sm:block">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
