import { NavigationContainer, DefaultTheme } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { Feather } from "@expo/vector-icons"
import { useAuth } from "../context/AuthContext"
import { colors } from "../theme"
import { ExploreScreen } from "../screens/ExploreScreen"
import { SearchScreen } from "../screens/SearchScreen"
import { SitsScreen } from "../screens/SitsScreen"
import { MessagesScreen } from "../screens/MessagesScreen"
import { ProfileScreen } from "../screens/ProfileScreen"
import { ListingDetailScreen } from "../screens/ListingDetailScreen"
import { MyListingsScreen } from "../screens/MyListingsScreen"
import { AuthScreen } from "../screens/AuthScreen"
import { SwipeScreen } from "../screens/SwipeScreen"
import { ConversationScreen } from "../screens/ConversationScreen"

const Stack = createNativeStackNavigator()
const Tabs = createBottomTabNavigator()

function AppTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
      }}
    >
      <Tabs.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Sits"
        component={SitsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: "Inbox",
          tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </Tabs.Navigator>
  )
}

function AuthedStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ title: "Listing", headerBackTitle: "Back" }}
      />
      <Stack.Screen name="MyListings" component={MyListingsScreen} options={{ title: "My Listings" }} />
      <Stack.Screen name="Swipe" component={SwipeScreen} options={{ title: "Swipe" }} />
      <Stack.Screen name="Conversation" component={ConversationScreen} options={{ title: "Conversation" }} />
    </Stack.Navigator>
  )
}

export function AppNavigator() {
  const { session, loading } = useAuth()

  if (loading) {
    return null
  }

  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Authed" component={AuthedStack} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
