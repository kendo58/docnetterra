"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Heart, Loader2, Send } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ListingContactMode = "invite" | "interest"

interface ListingContactButtonProps {
  mode: ListingContactMode
  listingId: string
  listingTitle: string
  recipientId: string
  recipientName?: string | null
  ctaLabel?: string
  dialogTitle?: string
  dialogDescription?: string
}

function buildParticipantsOrFilter(userA: string, userB: string) {
  return `and(participant1_id.eq.${userA},participant2_id.eq.${userB}),and(participant1_id.eq.${userB},participant2_id.eq.${userA})`
}

export function ListingContactButton({
  mode,
  listingId,
  listingTitle,
  recipientId,
  recipientName,
  ctaLabel,
  dialogTitle,
  dialogDescription,
}: ListingContactButtonProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  const defaultMessage = useMemo(() => {
    const name = recipientName?.trim() || "there"
    if (mode === "invite") {
      return `Hi ${name} — I saw your stay listing (“${listingTitle}”) and I’d love to invite you for an upcoming sit. Are you available?`
    }
    return `Hi ${name} — I’m interested in your listing (“${listingTitle}”). Are you available to chat about the details?`
  }, [listingTitle, mode, recipientName])

  useEffect(() => {
    if (!open) return
    setMessage((prev) => (prev.trim().length > 0 ? prev : defaultMessage))
  }, [defaultMessage, open])

  const title = dialogTitle ?? (mode === "invite" ? "Invite to Stay" : "Message host")
  const buttonLabel = ctaLabel ?? (mode === "invite" ? "Invite to Stay" : "Interested")
  const description = dialogDescription ?? "Send a message to start the conversation."

  const handleSend = async () => {
    if (sending) return
    setSending(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const content = message.trim().length > 0 ? message.trim() : defaultMessage

      const { data: existingConv, error: existingError } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listingId)
        .or(buildParticipantsOrFilter(user.id, recipientId))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingError) throw existingError

      let conversationId = existingConv?.id as string | undefined

      if (conversationId) {
        const [{ data: firstMessage, error: firstMessageError }, { data: recipientReply, error: replyError }] =
          await Promise.all([
            supabase
              .from("messages")
              .select("sender_id, created_at")
              .eq("conversation_id", conversationId)
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("messages")
              .select("id")
              .eq("conversation_id", conversationId)
              .eq("sender_id", recipientId)
              .limit(1)
              .maybeSingle(),
          ])

        if (firstMessageError) throw firstMessageError
        if (replyError) throw replyError

        if (firstMessage?.sender_id === user.id && !recipientReply) {
          const recipientLabel = recipientName?.trim() || "The host"
          toast({
            title: "Waiting for a reply",
            description: `${recipientLabel} hasn't responded yet. You'll be able to send another message once they reply.`,
          })
          setOpen(false)
          router.push(`/messages/${conversationId}`)
          return
        }
      }

      if (!conversationId) {
        const { data: newConv, error: createError } = await supabase
          .from("conversations")
          .insert({
            listing_id: listingId,
            participant1_id: user.id,
            participant2_id: recipientId,
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .single()

        if (createError) throw createError
        conversationId = newConv.id
      }

      const { data: newMsg, error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          receiver_id: recipientId,
          content,
          is_read: false,
        })
        .select("id, content, sender_id, created_at")
        .single()

      if (msgError) throw msgError

      await supabase
        .from("conversations")
        .update({ last_message_at: newMsg.created_at })
        .eq("id", conversationId)

      try {
        const notificationChannel = supabase.channel(`user-notifications-${recipientId}`)
        await notificationChannel.subscribe()
        await notificationChannel.send({
          type: "broadcast",
          event: "new_message",
          payload: {
            id: newMsg.id,
            content: newMsg.content,
            sender_id: user.id,
            conversation_id: conversationId,
            created_at: newMsg.created_at,
          },
        })
        supabase.removeChannel(notificationChannel)
      } catch (broadcastError) {
        console.warn("[sitswap] Failed to broadcast invite message:", broadcastError)
      }

      toast({
        title: "Message sent",
        description: "You can continue the conversation in Messages.",
      })

      setOpen(false)
      router.push(`/messages/${conversationId}`)
    } catch (error) {
      console.error("[sitswap] Failed to contact listing owner:", error)
      toast({
        title: "Couldn't send message",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button className="w-full gap-2" size="lg" onClick={() => setOpen(true)}>
        <Heart className="h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="listing-message">Message</Label>
            <Textarea
              id="listing-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder={defaultMessage}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="bg-transparent" onClick={() => setOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="ml-2">Send</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
