import { StyleSheet, Text, View } from "react-native"
import { Feather } from "@expo/vector-icons"
import { colors } from "../theme"
import { fonts } from "../theme/typography"

type AppHeaderProps = {
  title: string
  subtitle?: string
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Feather name="home" size={16} color="#fff" />
        </View>
        <Text style={styles.brand}>SitSwap</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.muted,
    fontFamily: fonts.semiBold,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.regular,
  },
})
