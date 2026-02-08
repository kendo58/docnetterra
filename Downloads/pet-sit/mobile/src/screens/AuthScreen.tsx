import { useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useAuth } from "../context/AuthContext"
import { colors } from "../theme"
import { fonts } from "../theme/typography"

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    const action = isSignUp ? signUp : signIn
    const result = await action(email.trim(), password)
    if (result.error) {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <LinearGradient colors={["#f6f5f2", "#eef3f8"]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.inner}>
        <Text style={styles.brand}>SitSwap</Text>
        <Text style={styles.title}>{isSignUp ? "Create your account" : "Welcome back"}</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? "Join the community for trusted sits and stays." : "Sign in to manage your sits and stays."}
        </Text>

        <View style={styles.card}>
          <TextInput
            placeholder="Email"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? "Please wait..." : isSignUp ? "Sign up" : "Sign in"}</Text>
          </Pressable>

          <Pressable onPress={() => setIsSignUp((prev) => !prev)}>
            <Text style={styles.switchText}>
              {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  brand: {
    fontSize: 16,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: colors.accent,
    fontFamily: fonts.semiBold,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.regular,
    marginTop: 6,
  },
  card: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0f1a17",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    color: colors.text,
    backgroundColor: "#fbfbfa",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  switchText: {
    textAlign: "center",
    color: colors.muted,
    fontFamily: fonts.medium,
    marginTop: 6,
  },
  error: {
    color: "#b85b56",
    fontFamily: fonts.medium,
    fontSize: 12,
  },
})
