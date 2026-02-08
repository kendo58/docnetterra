import { PropsWithChildren } from "react"
import { StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { colors } from "../theme"

type ScreenProps = PropsWithChildren<{
  withSafeArea?: boolean
}>

export function Screen({ children, withSafeArea = true }: ScreenProps) {
  if (!withSafeArea) {
    return <View style={styles.container}>{children}</View>
  }
  return <SafeAreaView style={styles.container}>{children}</SafeAreaView>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
})
