import { Pressable, StyleSheet, Text, View } from "react-native"
import { Feather } from "@expo/vector-icons"
import { colors } from "../theme"
import { fonts } from "../theme/typography"

type SearchBarProps = {
  placeholder?: string
  onPress?: () => void
}

export function SearchBar({ placeholder = "Where to? City, dates, chores", onPress }: SearchBarProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Feather name="search" size={16} color="#fff" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.placeholder} numberOfLines={1}>
          {placeholder}
        </Text>
      </View>
      <View style={styles.filterWrap}>
        <Feather name="sliders" size={16} color={colors.primary} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#0f1a17",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.medium,
  },
  placeholder: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  filterWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#f1f5f2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
})
