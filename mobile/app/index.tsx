import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  METRICS, VENTURES, TASKS, ACTIVITY_LOGS, THEME_COLORS,
  formatCurrency, isOverdue, formatDate,
} from "../lib/data";

const C = {
  bg: "#0a0a0a", card: "#111111", border: "#222222",
  text: "#ffffff", textSec: "#888888", primary: "#3b82f6",
  green: "#22c55e", amber: "#f59e0b", red: "#ef4444",
};

const sectors = Object.entries(
  VENTURES.reduce<Record<string, number>>((acc, v) => {
    acc[v.theme] = (acc[v.theme] || 0) + 1;
    return acc;
  }, {})
);

export default function DashboardScreen() {
  const router = useRouter();
  const openTasks = TASKS.filter((t) => t.status !== "complete");

  const stats = [
    { label: "Active Ventures", value: METRICS.activeVentures, icon: "layers-outline" as const, color: C.primary, route: "/ventures" as const },
    { label: "Active SPVs", value: METRICS.activeSPVs, icon: "briefcase-outline" as const, color: C.green, route: "/ventures" as const },
    { label: "Open Tasks", value: METRICS.openTasks, icon: "checkbox-outline" as const, color: C.amber, route: "/tasks" as const },
    { label: "Distributions", value: formatCurrency(METRICS.paidDistributions), icon: "cash-outline" as const, color: C.primary, route: "/ventures" as const },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>ROYALTON</Text>
          <Text style={s.subtitle}>VENTEX</Text>
        </View>

        {/* Stat Cards 2x2 */}
        <View style={s.statsGrid}>
          {stats.map((stat) => (
            <TouchableOpacity
              key={stat.label}
              style={s.statCard}
              onPress={() => router.push(stat.route)}
              activeOpacity={0.7}
            >
              <View style={s.statHeader}>
                <Ionicons name={stat.icon} size={16} color={stat.color} />
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
              <Text style={s.statValue}>{stat.value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Venture Sectors */}
        <Text style={s.sectionTitle}>Venture Sectors</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sectorScroll}>
          {sectors.map(([theme, count]) => (
            <TouchableOpacity
              key={theme}
              style={[s.sectorCard, { borderLeftColor: THEME_COLORS[theme] || C.textSec }]}
              onPress={() => router.push("/ventures")}
              activeOpacity={0.7}
            >
              <Text style={s.sectorName}>{theme}</Text>
              <Text style={s.sectorCount}>{count} ventures</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recent Activity */}
        <Text style={s.sectionTitle}>Recent Activity</Text>
        <View style={s.listCard}>
          {ACTIVITY_LOGS.slice(0, 5).map((log, i) => (
            <View key={log.id} style={[s.activityRow, i < 4 && s.borderBottom]}>
              <View style={[s.dot, { backgroundColor: THEME_COLORS[log.theme] || C.textSec }]} />
              <View style={s.activityContent}>
                <Text style={s.activityAction}>{log.action}</Text>
                <Text style={s.activityDetail} numberOfLines={1}>{log.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Open Tasks */}
        <Text style={s.sectionTitle}>Open Tasks</Text>
        <View style={s.listCard}>
          {openTasks.slice(0, 3).map((task, i) => (
            <TouchableOpacity
              key={task.id}
              style={[s.taskRow, i < Math.min(openTasks.length, 3) - 1 && s.borderBottom]}
              onPress={() => router.push("/tasks")}
              activeOpacity={0.7}
            >
              <View style={s.taskLeft}>
                <Ionicons name="ellipse-outline" size={16} color={C.textSec} />
                <View>
                  <Text style={s.taskTitle}>{task.title}</Text>
                  <Text style={[s.taskDue, isOverdue(task.dueDate) && { color: C.red }]}>
                    Due {formatDate(task.dueDate)}
                  </Text>
                </View>
              </View>
              <View style={[s.priorityBadge, {
                backgroundColor: task.priority === "High" ? `${C.red}20` : task.priority === "Medium" ? `${C.amber}20` : `${C.textSec}20`,
              }]}>
                <Text style={[s.priorityText, {
                  color: task.priority === "High" ? C.red : task.priority === "Medium" ? C.amber : C.textSec,
                }]}>{task.priority}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 24, marginTop: 8 },
  title: { fontSize: 28, fontWeight: "800", color: C.text, letterSpacing: 2 },
  subtitle: { fontSize: 12, fontWeight: "600", color: C.textSec, letterSpacing: 4, marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  statCard: {
    width: "48.5%" as any,
    backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border,
    padding: 14,
  },
  statHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  statLabel: { fontSize: 10, color: C.textSec, textTransform: "uppercase", letterSpacing: 1, fontWeight: "600" },
  statValue: { fontSize: 22, fontWeight: "700", color: C.text, fontVariant: ["tabular-nums"] },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  sectorScroll: { marginBottom: 24 },
  sectorCard: {
    backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border,
    borderLeftWidth: 3, padding: 14, marginRight: 10, minWidth: 130,
  },
  sectorName: { fontSize: 13, fontWeight: "600", color: C.text, marginBottom: 4 },
  sectorCount: { fontSize: 11, color: C.textSec },
  listCard: { backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, marginBottom: 24 },
  activityRow: { flexDirection: "row", alignItems: "flex-start", padding: 12, gap: 10 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: C.border },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  activityContent: { flex: 1 },
  activityAction: { fontSize: 12, fontWeight: "600", color: C.text, marginBottom: 2 },
  activityDetail: { fontSize: 11, color: C.textSec },
  taskRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 },
  taskLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  taskTitle: { fontSize: 12, fontWeight: "600", color: C.text, marginBottom: 2 },
  taskDue: { fontSize: 10, color: C.textSec },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  priorityText: { fontSize: 10, fontWeight: "600" },
});
