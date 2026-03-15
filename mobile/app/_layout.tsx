import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

const COLORS = {
  bg: "#0a0a0a",
  card: "#111111",
  border: "#222222",
  text: "#ffffff",
  textSecondary: "#888888",
  primary: "#3b82f6",
};

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.card,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: 85,
            paddingBottom: 28,
            paddingTop: 8,
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            letterSpacing: 0.5,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ventures/index"
          options={{
            title: "Ventures",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="layers-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="agent/index"
          options={{
            title: "AI Agent",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sparkles-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks/index"
          options={{
            title: "Tasks",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="checkbox-outline" size={size} color={color} />
            ),
          }}
        />
        {/* Hide detail screens from tabs */}
        <Tabs.Screen
          name="ventures/[id]"
          options={{ href: null }}
        />
      </Tabs>
    </View>
  );
}
