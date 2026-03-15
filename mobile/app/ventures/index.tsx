import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VENTURES, THEME_COLORS, slugify } from "../../lib/data";

const C = {
  bg: "#0a0a0a", card: "#111111", border: "#222222",
  text: "#ffffff", textSec: "#888888", primary: "#3b82f6",
  green: "#22c55e", amber: "#f59e0b", red: "#ef4444",
};

const FILTERS = ["All", "Real Estate", "F&B", "Yacht", "Entertainment", "Others"];

export default function VenturesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => {
    return VENTURES.filter((v) => {
      const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || v.theme === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const statusColor = (status: string) => {
    if (status === "In progress") return C.green;
    if (status === "On-Hold") return C.amber;
    return C.primary;
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Ventures</Text>
          <Text style={s.count}>{filtered.length} of {VENTURES.length}</Text>
        </View>

        {/* Search */}
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={C.textSec} />
          <TextInput
            style={s.searchInput}
            placeholder="Search ventures..."
            placeholderTextColor={C.textSec}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={C.textSec} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
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

        {/* Venture List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.ventureRow}
              onPress={() => router.push(`/ventures/${slugify(item.name)}`)}
              activeOpacity={0.7}
            >
              <View style={s.ventureLeft}>
                <View style={[s.sectorDot, { backgroundColor: THEME_COLORS[item.theme] || C.textSec }]} />
                <View style={s.ventureInfo}>
                  <Text style={s.ventureName}>{item.name}</Text>
                  <View style={s.ventureMeta}>
                    <View style={[s.sectorBadge, { backgroundColor: `${THEME_COLORS[item.theme] || C.textSec}20` }]}>
                      <Text style={[s.sectorBadgeText, { color: THEME_COLORS[item.theme] || C.textSec }]}>{item.theme}</Text>
                    </View>
                    <Text style={s.location}>{item.location}</Text>
                  </View>
                </View>
              </View>
              <View style={s.ventureRight}>
                <View style={[s.statusBadge, { backgroundColor: `${statusColor(item.status)}20` }]}>
                  <View style={[s.statusDot, { backgroundColor: statusColor(item.status) }]} />
                  <Text style={[s.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={C.textSec} />
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, marginTop: 8 },
  title: { fontSize: 22, fontWeight: "800", color: C.text },
  count: { fontSize: 11, color: C.textSec },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text },
  filterScroll: { marginBottom: 16, maxHeight: 36 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 4,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 8,
  },
  chipActive: { backgroundColor: `${C.primary}20`, borderColor: C.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: C.textSec },
  chipTextActive: { color: C.primary },
  ventureRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border,
    padding: 14,
  },
  ventureLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  sectorDot: { width: 4, height: 32, borderRadius: 2 },
  ventureInfo: { flex: 1 },
  ventureName: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 4 },
  ventureMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectorBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  sectorBadgeText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  location: { fontSize: 10, color: C.textSec },
  ventureRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 10, fontWeight: "600" },
  separator: { height: 8 },
});
