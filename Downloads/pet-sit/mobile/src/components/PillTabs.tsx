import { Pressable, StyleSheet, Text, View } from "react-native"
import { Feather } from "@expo/vector-icons"
import { colors } from "../theme"
import { fonts } from "../theme/typography"

type PillOption = {
  key: string
  label: string
  icon: keyof typeof Feather.glyphMap
}

type PillTabsProps = {
  options: PillOption[]
  value: string
  onChange: (value: string) => void
}

export function PillTabs({ options, value, onChange }: PillTabsProps) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = option.key === value
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
          >
            <Feather name={option.icon} size={14} color={active ? "#fff" : colors.muted} />
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  labelActive: {
    color: "#fff",
  },
  labelInactive: {
    color: colors.text,
  },
})
