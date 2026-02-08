import { StatusBar } from "expo-status-bar"
import { StyleSheet, Text, View } from "react-native"
import { colors } from "../theme/colors"

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brand}>SitSwap</Text>
        <Text style={styles.title}>Trusted sits and stays</Text>
        <Text style={styles.subtitle}>
          Cozy, reliable care for pets and homes. Mobile app scaffolding is ready — wire auth and navigation next.
        </Text>
      </View>
      <StatusBar style="dark" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    shadowColor: "#0f1a17",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  brand: {
    fontSize: 18,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.accent,
    fontWeight: "600",
  },
  title: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
})
