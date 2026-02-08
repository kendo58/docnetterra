import { useCallback, useEffect, useState } from "react"
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { Feather } from "@expo/vector-icons"
import { RouteProp, useRoute } from "@react-navigation/native"
import { Screen } from "../components/Screen"
import { colors } from "../theme"
import { fonts } from "../theme/typography"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

type Params = { conversationId: string }

const formatTime = (value?: string | null) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

export function ConversationScreen() {
  const { session } = useAuth()
  const route = useRoute<RouteProp<Record<string, Params>, string>>()
  const conversationId = route.params?.conversationId
  const [conversation, setConversation] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)

  const loadConversation = useCallback(async () => {
    if (!conversationId || !session?.user.id) return
    const { data } = await supabase
      .from("conversations")
      .select("id, listing_id, participant1_id, participant2_id, listing:listings(title)")
      .eq("id", conversationId)
      .maybeSingle()

    if (!data) return
    const otherId = data.participant1_id === session.user.id ? data.participant2_id : data.participant1_id
    const { data: otherProfile } = await supabase
      .from("profiles")
      .select("id, full_name, profile_photo_url")
      .eq("id", otherId)
      .maybeSingle()

    setConversation({
      ...data,
      otherId,
      otherProfile,
    })
  }, [conversationId, session])

  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    setMessages(data ?? [])
    setLoading(false)
  }, [conversationId])

  useEffect(() => {
    loadConversation()
    loadMessages()
  }, [loadConversation, loadMessages])

  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => (prev.some((msg) => msg.id === payload.new.id) ? prev : [...prev, payload.new]))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const handleSend = async () => {
    if (!input.trim() || !session?.user.id || !conversationId || !conversation?.otherId) return
    const content = input.trim()
    setInput("")

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        receiver_id: conversation.otherId,
        content,
      })
      .select("id, sender_id, content, created_at")
      .single()

    if (!error && data) {
      setMessages((prev) => [...prev, data])
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId)
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{conversation?.otherProfile?.full_name ?? "Conversation"}</Text>
        <Text style={styles.subtitle}>{conversation?.listing?.title ?? "SitSwap Listing"}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.content}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isMine = item.sender_id === session?.user.id
            return (
              <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                    {item.content}
                  </Text>
                </View>
                <Text style={styles.bubbleTime}>{formatTime(item.created_at)}</Text>
              </View>
            )
          }}
          ListEmptyComponent={
            loading ? (
              <Text style={styles.emptyText}>Loading messages...</Text>
            ) : (
              <Text style={styles.emptyText}>Say hello to start the conversation.</Text>
            )
          }
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Write a message"
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
          />
          <Pressable style={styles.sendButton} onPress={handleSend}>
            <Feather name="send" size={16} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  bubbleWrap: {
    maxWidth: "78%",
  },
  bubbleWrapMine: {
    alignSelf: "flex-end",
  },
  bubbleWrapTheirs: {
    alignSelf: "flex-start",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
  },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  bubbleTextMine: {
    color: "#fff",
  },
  bubbleTextTheirs: {
    color: colors.text,
  },
  bubbleTime: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 12,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceWarm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.medium,
    color: colors.text,
    backgroundColor: "#fff",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
})
