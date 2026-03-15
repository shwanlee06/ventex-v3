import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Modal, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  TASKS, VENTURES, THEME_COLORS, slugify, formatDate, isOverdue,
  type Task,
} from "../../lib/data";

const C = {
  bg: "#0a0a0a", card: "#111111", border: "#222222",
  text: "#ffffff", textSec: "#888888", primary: "#3b82f6",
  green: "#22c55e", amber: "#f59e0b", red: "#ef4444",
};

type Filter = "All" | "Overdue" | "Open" | "Done";
const FILTERS: Filter[] = ["All", "Overdue", "Open", "Done"];

export default function TasksScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("All");
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(
    new Set(TASKS.filter((t) => t.status === "complete").map((t) => t.id))
  );
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const getTaskStatus = useCallback((task: Task) => {
    if (completedTasks.has(task.id)) return "Done";
    if (isOverdue(task.dueDate)) return "Overdue";
    return "Open";
  }, [completedTasks]);

  const filtered = useMemo(() => {
    return TASKS.filter((task) => {
      const status = getTaskStatus(task);
      if (filter === "All") return true;
      return status === filter;
    });
  }, [filter, getTaskStatus]);

  const stats = useMemo(() => {
    const open = TASKS.filter((t) => !completedTasks.has(t.id) && !isOverdue(t.dueDate)).length;
    const overdue = TASKS.filter((t) => !completedTasks.has(t.id) && isOverdue(t.dueDate)).length;
    const done = completedTasks.size;
    return { open, overdue, done };
  }, [completedTasks]);

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Tasks</Text>
          <Text style={s.subtitle}>All ventures</Text>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: C.amber }]}>{stats.open}</Text>
            <Text style={s.statLabel}>Open</Text>
          </View>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: C.red }]}>{stats.overdue}</Text>
            <Text style={s.statLabel}>Overdue</Text>
          </View>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: C.green }]}>{stats.done}</Text>
            <Text style={s.statLabel}>Done</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.chip, filter === f && s.chipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[s.chipText, filter === f && s.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Task List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => {
            const done = completedTasks.has(item.id);
            const overdue = !done && isOverdue(item.dueDate);
            return (
              <TouchableOpacity
                style={s.taskCard}
                onPress={() => setSelectedTask(item)}
                activeOpacity={0.7}
              >
                <TouchableOpacity
                  onPress={() => toggleTask(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={done ? "checkbox" : "square-outline"}
                    size={20}
                    color={done ? C.green : C.textSec}
                  />
                </TouchableOpacity>
                <View style={s.taskContent}>
                  <Text style={[s.taskTitle, done && s.strikethrough]}>{item.title}</Text>
                  <View style={s.taskMeta}>
                    {item.ventureLink && (
                      <TouchableOpacity
                        onPress={() => {
                          const v = VENTURES.find((v) => v.name === item.ventureLink);
                          if (v) router.push(`/ventures/${slugify(v.name)}`);
                        }}
                      >
                        <Text style={s.ventureLink}>{item.ventureLink}</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={[s.dueDate, overdue && { color: C.red }]}>
                      {formatDate(item.dueDate)}
                    </Text>
                  </View>
                  <View style={s.taskFooter}>
                    {item.assignees[0] && (
                      <View style={s.assigneeBadge}>
                        <Text style={s.assigneeInitials}>
                          {item.assignees[0].split(" ").map((w) => w[0]).join("")}
                        </Text>
                      </View>
                    )}
                    <View style={[s.priorityBadge, {
                      backgroundColor: item.priority === "High" ? `${C.red}20` : item.priority === "Medium" ? `${C.amber}20` : `${C.textSec}20`,
                    }]}>
                      <Text style={[s.priorityText, {
                        color: item.priority === "High" ? C.red : item.priority === "Medium" ? C.amber : C.textSec,
                      }]}>{item.priority}</Text>
                    </View>
                    <View style={[s.statusBadge, {
                      backgroundColor: done ? `${C.green}20` : overdue ? `${C.red}20` : `${C.amber}20`,
                    }]}>
                      <Text style={[s.statusText, {
                        color: done ? C.green : overdue ? C.red : C.amber,
                      }]}>{done ? "Done" : overdue ? "Overdue" : "Open"}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />

        {/* FAB */}
        <TouchableOpacity
          style={s.fab}
          onPress={() => Alert.alert("Add Task", "Task creation will be available in the next update.")}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* Task Detail Modal */}
      <Modal visible={!!selectedTask} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {selectedTask && (
              <>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>{selectedTask.title}</Text>
                  <TouchableOpacity onPress={() => setSelectedTask(null)}>
                    <Ionicons name="close" size={22} color={C.textSec} />
                  </TouchableOpacity>
                </View>
                <View style={s.modalBody}>
                  <DetailRow label="Venture" value={selectedTask.ventureLink || "—"} />
                  <DetailRow label="Due Date" value={formatDate(selectedTask.dueDate)} color={
                    !completedTasks.has(selectedTask.id) && isOverdue(selectedTask.dueDate) ? C.red : undefined
                  } />
                  <DetailRow label="Assignee" value={selectedTask.assignees[0] || "Unassigned"} />
                  <DetailRow label="Priority" value={selectedTask.priority} color={
                    selectedTask.priority === "High" ? C.red : selectedTask.priority === "Medium" ? C.amber : C.textSec
                  } />
                  <DetailRow label="Status" value={
                    completedTasks.has(selectedTask.id) ? "Done" : isOverdue(selectedTask.dueDate) ? "Overdue" : "Open"
                  } color={
                    completedTasks.has(selectedTask.id) ? C.green : isOverdue(selectedTask.dueDate) ? C.red : C.amber
                  } />
                </View>
                <TouchableOpacity
                  style={[s.markBtn, completedTasks.has(selectedTask.id) && s.markBtnDone]}
                  onPress={() => {
                    toggleTask(selectedTask.id);
                    setSelectedTask(null);
                  }}
                >
                  <Ionicons
                    name={completedTasks.has(selectedTask.id) ? "arrow-undo" : "checkmark-circle"}
                    size={18}
                    color={C.text}
                  />
                  <Text style={s.markBtnText}>
                    {completedTasks.has(selectedTask.id) ? "Reopen Task" : "Mark Complete"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 12, marginTop: 8 },
  title: { fontSize: 22, fontWeight: "800", color: C.text },
  subtitle: { fontSize: 11, color: C.textSec, marginTop: 2 },
  statsRow: {
    flexDirection: "row", gap: 10, marginBottom: 16,
  },
  statItem: {
    flex: 1, backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border,
    padding: 12, alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 10, color: C.textSec, marginTop: 2, fontWeight: "600", textTransform: "uppercase" },
  filterScroll: { marginBottom: 16, maxHeight: 36 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 4,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 8,
  },
  chipActive: { backgroundColor: `${C.primary}20`, borderColor: C.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: C.textSec },
  chipTextActive: { color: C.primary },
  taskCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 14,
  },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 4 },
  strikethrough: { textDecorationLine: "line-through", opacity: 0.5 },
  taskMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  ventureLink: { fontSize: 10, color: C.primary, fontWeight: "600" },
  dueDate: { fontSize: 10, color: C.textSec },
  taskFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  assigneeBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: `${C.primary}30`,
    justifyContent: "center", alignItems: "center",
  },
  assigneeInitials: { fontSize: 8, fontWeight: "700", color: C.primary },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  priorityText: { fontSize: 9, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: "700" },
  fab: {
    position: "absolute", bottom: 20, right: 20,
    width: 52, height: 52, borderRadius: 26, backgroundColor: C.primary,
    justifyContent: "center", alignItems: "center",
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: C.card, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderWidth: 1, borderColor: C.border, padding: 20, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: C.text, flex: 1, marginRight: 12 },
  modalBody: { marginBottom: 20 },
  detailRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  detailLabel: { fontSize: 11, color: C.textSec, textTransform: "uppercase", fontWeight: "600" },
  detailValue: { fontSize: 12, color: C.text, fontWeight: "600" },
  markBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.green, borderRadius: 8, paddingVertical: 14,
  },
  markBtnDone: { backgroundColor: C.amber },
  markBtnText: { fontSize: 14, fontWeight: "700", color: C.text },
});
