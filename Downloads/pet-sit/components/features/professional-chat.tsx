"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useSupabaseChat, type ChatMessage } from "@/hooks/use-supabase-chat"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Send,
  Check,
  CheckCheck,
  Smile,
  Paperclip,
  MoreVertical,
  ArrowLeft,
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  Unlock,
} from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { format, isToday, isYesterday } from "date-fns"
import { maskContactInfo, containsContactInfo, getContactWarningMessage } from "@/lib/contact-masking"
import { InviteToStayButton } from "@/components/features/invite-to-stay-button"

interface ProfessionalChatProps {
  conversationId: string
  recipientId: string
  recipientName: string
  recipientAvatar?: string
  currentUserId: string
  swapConfirmed?: boolean
  directListingConversation?: boolean
  listingId?: string
  listingTitle?: string | null
  listingType?: string | null
  isListingOwner?: boolean
  bookingId?: string | null
  onBack?: () => void
  className?: string
}

export function ProfessionalChat({
  conversationId,
  recipientId,
  recipientName,
  recipientAvatar,
  currentUserId,
  swapConfirmed = false,
  directListingConversation = false,
  listingId,
  listingTitle,
  listingType = null,
  isListingOwner = false,
  bookingId,
  onBack,
  className,
}: ProfessionalChatProps) {
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showContactWarning, setShowContactWarning] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

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
    refetch,
    authError,
  } = useSupabaseChat({
    conversationId,
    currentUserId,
    recipientId,
  })

  const hasRecipientReply = messages.some((message) => message.sender_id === recipientId)
  const hasCurrentUserReply = messages.some((message) => message.sender_id === currentUserId)
  const hasBothChatted = hasRecipientReply && hasCurrentUserReply
  const isInitialMessageLocked =
    directListingConversation &&
    messages.length > 0 &&
    messages[0]?.sender_id === currentUserId &&
    !hasRecipientReply

  const effectiveListingType = listingType ?? "pet_sitting"
  const isStayListing = effectiveListingType === "stay"
  const isPetSittingListing = effectiveListingType === "pet_sitting"
  const showBookingPanel =
    directListingConversation && listingId && (hasBothChatted || bookingId) && (isStayListing || isPetSittingListing)
  const showViewBooking = Boolean(showBookingPanel && bookingId)
  const showRequestSit = Boolean(showBookingPanel && !bookingId && isPetSittingListing && !isListingOwner)
  const showInviteToStay = Boolean(showBookingPanel && !bookingId && isStayListing && !isListingOwner)
  const showOwnerWait = Boolean(showBookingPanel && !bookingId && isPetSittingListing && isListingOwner)

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      window.location.href = "/messages"
    }
  }, [onBack])

  const handleReLogin = useCallback(() => {
    window.location.href = "/login"
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }, [refetch])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isRecipientTyping])

  useEffect(() => {
    if (messages.length > 0) {
      markAsRead()
    }
  }, [messages, markAsRead])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isInitialMessageLocked) {
      return
    }
    const value = e.target.value
    setNewMessage(value)
    sendTypingIndicator()

    if (!swapConfirmed && containsContactInfo(value)) {
      setShowContactWarning(true)
    } else {
      setShowContactWarning(false)
    }

    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (isInitialMessageLocked || !newMessage.trim() || isSending) return

    const content = newMessage.trim()

    if (!swapConfirmed && containsContactInfo(content)) {
      setShowContactWarning(true)
      return
    }

    setNewMessage("")
    setShowContactWarning(false)
    setIsSending(true)
    stopTyping()

    if (inputRef.current) {
      inputRef.current.style.height = "auto"
    }

    await sendMessage(content)
    setIsSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleBlur = () => {
    stopTyping()
  }

  function formatMessageTime(dateString: string) {
    return format(new Date(dateString), "h:mm a")
  }

  function formatDateHeader(dateString: string) {
    const date = new Date(dateString)
    if (isToday(date)) return "Today"
    if (isYesterday(date)) return "Yesterday"
    return format(date, "MMMM d, yyyy")
  }

  const getDisplayContent = (message: ChatMessage) => {
    if (swapConfirmed) {
      return message.content
    }
    const { maskedContent } = maskContactInfo(message.content)
    return maskedContent
  }

  const groupedMessages: { date: string; messages: ChatMessage[] }[] = []
  let currentDate = ""
  messages.forEach((message) => {
    const messageDate = format(new Date(message.created_at), "yyyy-MM-dd")
    if (messageDate !== currentDate) {
      currentDate = messageDate
      groupedMessages.push({ date: message.created_at, messages: [message] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message)
    }
  })

  const getMessageStatus = (message: ChatMessage) => {
    if (message.status === "sending") return null
    if (message.is_read || message.status === "read") {
      return <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
    }
    if (message.status === "delivered") {
      return <CheckCheck className="h-3.5 w-3.5" />
    }
    return <Check className="h-3.5 w-3.5" />
  }

  if (authError) {
    return (
      <div className={cn("flex flex-col h-full bg-background", className)}>
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shadow-sm">
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h3 className="font-semibold">Messages</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Session Expired</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Your session has expired. Please log in again to continue messaging.
          </p>
          <Button onClick={handleReLogin}>Log In Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shadow-sm">
        <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="relative">
          <Avatar className="h-10 w-10 border-2 border-background">
            <AvatarImage src={recipientAvatar || "/placeholder.svg"} />
            <AvatarFallback className="font-medium">{recipientName.charAt(0)}</AvatarFallback>
          </Avatar>
          {isRecipientOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{recipientName}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isRecipientTyping ? (
              <span className="text-primary font-medium animate-pulse">typing...</span>
            ) : isRecipientOnline ? (
              <span className="text-green-600">Online</span>
            ) : (
              <span>Offline</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {swapConfirmed ? (
            <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-200 bg-green-50">
              <Unlock className="h-3 w-3" />
              Swap Confirmed
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-200 bg-amber-50">
              <ShieldAlert className="h-3 w-3" />
              Protected
            </Badge>
          )}

          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="h-8 w-8">
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>

          {isConnected ? (
            <Badge
              variant="outline"
              className="gap-1 text-xs text-green-600 border-green-200 bg-green-50 hidden sm:flex"
            >
              <Wifi className="h-3 w-3" />
              Live
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 text-xs text-amber-600 border-amber-200 bg-amber-50 hidden sm:flex"
            >
              <WifiOff className="h-3 w-3" />
              Connecting
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Search in Conversation</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Block User</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!swapConfirmed && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-2 text-xs text-amber-800">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Contact info is hidden until a swap is confirmed. Complete a swap to share personal details.</span>
          </div>
        </div>
      )}

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
        style={{ scrollBehavior: "smooth" }}
      >
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={cn("flex gap-2", i % 2 === 0 ? "" : "justify-end")}>
                {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
                <Skeleton className={cn("h-14 rounded-2xl", i % 2 === 0 ? "w-48" : "w-56")} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Send className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Start the conversation</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Send a message to connect with {recipientName}
            </p>
          </div>
        ) : (
          <>
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                <div className="flex items-center justify-center my-4">
                  <div className="bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-muted-foreground">
                    {formatDateHeader(group.date)}
                  </div>
                </div>

                {group.messages.map((message, index) => {
                  const isOwn = message.sender_id === currentUserId
                  const showAvatar =
                    !isOwn && (index === 0 || group.messages[index - 1]?.sender_id !== message.sender_id)
                  const isLastInGroup =
                    index === group.messages.length - 1 || group.messages[index + 1]?.sender_id !== message.sender_id
                  const isFirstInGroup = index === 0 || group.messages[index - 1]?.sender_id !== message.sender_id

                  const displayContent = getDisplayContent(message)
                  const wasMasked = displayContent !== message.content

                  return (
                    <div
                      key={message.id}
                      className={cn("flex gap-2 group", isOwn ? "justify-end" : "", !isLastInGroup ? "mb-0.5" : "mb-3")}
                    >
                      {!isOwn && (
                        <div className="w-8 shrink-0">
                          {showAvatar && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={recipientAvatar || "/placeholder.svg"} />
                              <AvatarFallback className="text-xs">{recipientName.charAt(0)}</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}

                      <div className={cn("max-w-[70%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            "px-4 py-2 break-words shadow-sm",
                            isOwn ? "bg-primary text-primary-foreground" : "bg-card border",
                            wasMasked && "border-amber-300 bg-amber-50",
                            isFirstInGroup &&
                              isLastInGroup &&
                              (isOwn ? "rounded-2xl rounded-br-lg" : "rounded-2xl rounded-bl-lg"),
                            isFirstInGroup &&
                              !isLastInGroup &&
                              (isOwn ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md"),
                            !isFirstInGroup &&
                              isLastInGroup &&
                              (isOwn
                                ? "rounded-2xl rounded-tr-md rounded-br-lg"
                                : "rounded-2xl rounded-tl-md rounded-bl-lg"),
                            !isFirstInGroup &&
                              !isLastInGroup &&
                              (isOwn ? "rounded-2xl rounded-r-md" : "rounded-2xl rounded-l-md"),
                            message.status === "sending" && "opacity-70",
                          )}
                        >
                          <p className={cn("text-sm whitespace-pre-wrap", wasMasked && !isOwn && "text-amber-800")}>
                            {displayContent}
                          </p>
                        </div>

                        {isLastInGroup && (
                          <div className={cn("flex items-center gap-1 mt-1 px-1", isOwn ? "flex-row-reverse" : "")}>
                            <span className="text-[10px] text-muted-foreground">
                              {formatMessageTime(message.created_at)}
                            </span>
                            {isOwn && getMessageStatus(message)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {isRecipientTyping && (
              <div className="flex gap-2 items-end mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={recipientAvatar || "/placeholder.svg"} />
                  <AvatarFallback className="text-xs">{recipientName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="bg-card border rounded-2xl rounded-bl-lg px-4 py-3 shadow-sm">
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
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t bg-card">
        {isInitialMessageLocked && (
          <Alert className="mb-3">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription className="text-xs">
              You’ve sent the first message. You can send another once {recipientName} replies.
            </AlertDescription>
          </Alert>
        )}

        {showBookingPanel && (
          <div className="mb-3 rounded-xl border bg-muted/40 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  {showViewBooking ? "Booking in progress" : "Ready to move forward?"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {showViewBooking
                    ? "Open the sit to review status, payment, and next steps."
                    : isStayListing
                      ? "Invite this sitter using one of your listings."
                      : `Create a sit request${listingTitle ? ` for "${listingTitle}"` : ""}.`}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {showViewBooking && bookingId && (
                  <Button asChild size="sm">
                    <Link href={`/sits/${bookingId}`}>View sit</Link>
                  </Button>
                )}
                {showRequestSit && listingId && (
                  <Button asChild size="sm">
                    <Link href={`/sits/new?listing=${listingId}`}>Request a sit</Link>
                  </Button>
                )}
                {showInviteToStay && (
                  <InviteToStayButton
                    sitterId={recipientId}
                    sitterName={recipientName}
                    buttonLabel="Invite to stay"
                    buttonProps={{ size: "sm", className: "w-full sm:w-auto" }}
                  />
                )}
                {showOwnerWait && (
                  <div className="text-xs text-muted-foreground">Waiting for the sitter to request a sit.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {showContactWarning && (
          <Alert variant="destructive" className="mb-3">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {getContactWarningMessage()} Please confirm a swap first to share contact details.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground h-10 w-10 shrink-0">
              <Smile className="h-5 w-5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground h-10 w-10 shrink-0">
              <Paperclip className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder="Type a message..."
              rows={1}
              className={cn(
                "w-full resize-none rounded-2xl bg-muted border-0 px-4 py-2.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary/20",
                "placeholder:text-muted-foreground",
                "max-h-[120px] min-h-[42px]",
                showContactWarning && "ring-2 ring-destructive/50",
              )}
              disabled={isSending || isInitialMessageLocked}
            />
          </div>

          <Button
            type="submit"
            size="icon"
            className="rounded-full h-10 w-10 shrink-0"
            disabled={isSending || isInitialMessageLocked || !newMessage.trim() || showContactWarning}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  )
}
