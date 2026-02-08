import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Feather } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { Screen } from "../components/Screen"
import { colors } from "../theme"
import { fonts } from "../theme/typography"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

export function ProfileScreen() {
  const { session, signOut } = useAuth()
  const navigation = useNavigation<any>()
  const [profile, setProfile] = useState<any | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user.id) return
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", session.user.id)
        .maybeSingle()
      setProfile(data)
    }

    fetchProfile()
  }, [session?.user.id])

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Manage your account and listings.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Feather name="user" size={22} color="#fff" />
        </View>
        <View style={styles.profileText}>
          <Text style={styles.name}>{profile?.full_name || "SitSwap Member"}</Text>
          <Text style={styles.email}>{profile?.email || session?.user.email}</Text>
        </View>
      </View>

      <Pressable style={styles.actionCard} onPress={() => navigation.navigate("MyListings")}>
        <View>
          <Text style={styles.actionTitle}>My Listings</Text>
          <Text style={styles.actionSubtitle}>Manage your active stays and sits</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.muted} />
      </Pressable>

      <Pressable style={styles.actionCard} onPress={() => navigation.navigate("Swipe")}>
        <View>
          <Text style={styles.actionTitle}>Swipe</Text>
          <Text style={styles.actionSubtitle}>Find new sits and stays</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.muted} />
      </Pressable>

      <Pressable style={styles.actionCard} onPress={signOut}>
        <View>
          <Text style={styles.actionTitle}>Sign out</Text>
          <Text style={styles.actionSubtitle}>Return to the login screen</Text>
        </View>
        <Feather name="log-out" size={18} color={colors.muted} />
      </Pressable>
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
    fontSize: 24,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  card: {
    margin: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
  },
  email: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  actionCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  actionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
})
