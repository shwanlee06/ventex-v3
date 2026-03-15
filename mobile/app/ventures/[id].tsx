import React, { useState, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  VENTURES, TASKS, TEAM, THEME_COLORS, slugify, formatDate, isOverdue,
} from "../../lib/data";

const C = {
  bg: "#0a0a0a", card: "#111111", border: "#222222",
  text: "#ffffff", textSec: "#888888", primary: "#3b82f6",
  green: "#22c55e", amber: "#f59e0b", red: "#ef4444",
};

export default function VentureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const venture = useMemo(() => {
    return VENTURES.find((v) => slugify(v.name) === id);
  }, [id]);

  const ventureTasks = useMemo(() => {
    if (!venture) return [];
    return TASKS.filter((t) => t.ventureLink === venture.name);
  }, [venture]);

  const [completedTasks, setCompletedTasks] = useState<Set<string>>(
    new Set(TASKS.filter((t) => t.status === "complete").map((t) => t.id))
  );

  if (!venture) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorText}>Venture not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.linkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const themeColor = THEME_COLORS[venture.theme] || C.textSec;

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Assigned team (first 3 for demo)
  const assignedTeam = TEAM.slice(0, 3);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle} numberOfLines={1}>{venture.name}</Text>
          <View style={s.headerMeta}>
            <View style={[s.badge, { backgroundColor: `${themeColor}20` }]}>
              <Text style={[s.badgeText, { color: themeColor }]}>{venture.theme}</Text>
            </View>
            <Text style={s.headerLocation}>{venture.location}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={s.chatBtn}
          onPress={() => router.push("/agent")}
        >
          <Ionicons name="sparkles" size={16} color={C.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {/* Key Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Key Details</Text>
          <View style={s.detailCard}>
            <DetailRow label="Stage" value={venture.stage} />
            <DetailRow label="Status" value={venture.status} color={
              venture.status === "In progress" ? C.green : venture.status === "On-Hold" ? C.amber : C.primary
            } />
            <DetailRow label="Location" value={venture.location} />
            {venture.currentStatus && (
              <DetailRow label="Notes" value={venture.currentStatus} />
            )}
          </View>
        </View>

        {/* Team */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Assigned Team</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {assignedTeam.map((member) => (
              <View key={member.id} style={s.teamCard}>
                <View style={[s.avatar, { backgroundColor: `${C.primary}30` }]}>
                  <Text style={s.avatarText}>{member.initials}</Text>
                </View>
                <Text style={s.teamName}>{member.name}</Text>
                <Text style={s.teamRole}>{member.role}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Tasks */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Tasks</Text>
          {ventureTasks.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>No tasks for this venture</Text>
            </View>
          ) : (
            <View style={s.detailCard}>
              {ventureTasks.map((task, i) => {
                const done = completedTasks.has(task.id);
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[s.taskRow, i < ventureTasks.length - 1 && s.borderBottom]}
                    onPress={() => toggleTask(task.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={done ? "checkbox" : "square-outline"}
                      size={18}
                      color={done ? C.green : C.textSec}
                    />
                    <View style={s.taskInfo}>
                      <Text style={[s.taskTitle, done && s.strikethrough]}>{task.title}</Text>
                      <Text style={[s.taskDue, isOverdue(task.dueDate) && !done && { color: C.red }]}>
                        Due {formatDate(task.dueDate)} · {task.assignees[0] || "Unassigned"}
                      </Text>
                    </View>
                    <View style={[s.priorityBadge, {
                      backgroundColor: task.priority === "High" ? `${C.red}20` : task.priority === "Medium" ? `${C.amber}20` : `${C.textSec}20`,
                    }]}>
                      <Text style={[s.priorityText, {
                        color: task.priority === "High" ? C.red : task.priority === "Medium" ? C.amber : C.textSec,
                      }]}>{task.priority}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Files */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Attached Files</Text>
          <View style={s.emptyCard}>
            <Ionicons name="document-outline" size={24} color={C.textSec} />
            <Text style={s.emptyText}>No files attached</Text>
            <TouchableOpacity style={s.addBtn} onPress={() => Alert.alert("Coming Soon", "File attachment will be available in the next update.")}>
              <Text style={s.addBtnText}>+ Attach File</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Activity Log */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Activity Log</Text>
          <View style={s.detailCard}>
            <ActivityItem text={`Venture "${venture.name}" viewed`} time="Just now" />
            {venture.currentStatus && (
              <ActivityItem text={`Status: ${venture.currentStatus}`} time="Recent" />
            )}
            <ActivityItem text={`Venture created in ${venture.theme} sector`} time="Earlier" />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function ActivityItem({ text, time }: { text: string; time: string }) {
  return (
    <View style={[s.activityRow]}>
      <View style={s.activityDot} />
      <View style={s.activityInfo}>
        <Text style={s.activityText}>{text}</Text>
        <Text style={s.activityTime}>{time}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: C.textSec, marginBottom: 12 },
  linkText: { fontSize: 14, color: C.primary },
  headerBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: C.text },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  headerLocation: { fontSize: 10, color: C.textSec },
  chatBtn: { padding: 8, backgroundColor: `${C.primary}15`, borderRadius: 8 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: C.text, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  detailCard: { backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  detailLabel: { fontSize: 11, color: C.textSec, textTransform: "uppercase", fontWeight: "600" },
  detailValue: { fontSize: 12, color: C.text, fontWeight: "600", maxWidth: "60%" as any, textAlign: "right" },
  teamCard: {
    backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border,
    padding: 14, marginRight: 10, alignItems: "center", minWidth: 100,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  avatarText: { fontSize: 13, fontWeight: "700", color: C.primary },
  teamName: { fontSize: 11, fontWeight: "600", color: C.text, textAlign: "center" },
  teamRole: { fontSize: 9, color: C.textSec, textAlign: "center", marginTop: 2 },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: C.border },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 12, fontWeight: "600", color: C.text, marginBottom: 2 },
  strikethrough: { textDecorationLine: "line-through", opacity: 0.5 },
  taskDue: { fontSize: 10, color: C.textSec },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  priorityText: { fontSize: 9, fontWeight: "700" },
  emptyCard: {
    backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border,
    padding: 24, alignItems: "center", gap: 8,
  },
  emptyText: { fontSize: 12, color: C.textSec },
  addBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: `${C.primary}15`, borderRadius: 6, marginTop: 4 },
  addBtnText: { fontSize: 11, fontWeight: "600", color: C.primary },
  activityRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  activityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginTop: 4 },
  activityInfo: { flex: 1 },
  activityText: { fontSize: 11, color: C.text, marginBottom: 2 },
  activityTime: { fontSize: 9, color: C.textSec },
});
