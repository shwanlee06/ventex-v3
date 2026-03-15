// ============================================================================
// Profile Page — Swiss Instrument design
// User profile with avatar, info, and preferences
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  User, Mail, Shield, Bell, Globe, Key, Camera, Save, LogOut,
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const ATLAS_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/atlas-logo-G2SBqxAK64sZYAYmAZY9js.webp";

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("ATLAS Admin");
  const [email, setEmail] = useState("ops@atlas.vc");
  const [role, setRole] = useState("System Administrator");
  const [timezone, setTimezone] = useState("America/New_York");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(() => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Profile updated successfully");
    }, 800);
  }, []);

  const handleLogout = useCallback(() => {
    toast.info("Signed out — redirecting to landing page");
    localStorage.removeItem("atlas_operator");
    setTimeout(() => navigate("/"), 600);
  }, [navigate]);

  return (
    <DashboardLayout title="Profile" subtitle="OPERATOR CREDENTIALS">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6 bg-card border-border">
            <div className="flex items-start gap-6">
              <div className="relative group">
                <Avatar className="size-20 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    AT
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => toast.info("Avatar upload coming soon")}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="size-5 text-white" />
                </button>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">{name}</h2>
                <p className="text-sm text-muted-foreground font-mono mt-1">{email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                    <Shield className="size-3" />
                    {role}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/10 text-green-400 border border-green-500/20">
                    ACTIVE
                  </span>
                </div>
              </div>
              <img src={ATLAS_LOGO_URL} alt="ATLAS" className="size-10 rounded-md opacity-50" />
            </div>
          </Card>
        </motion.div>

        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="p-6 bg-card border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <User className="size-4 text-primary" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-mono">DISPLAY NAME</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary/30 border-border text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-mono">EMAIL ADDRESS</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary/30 border-border text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-mono">ROLE</Label>
                <Input
                  value={role}
                  readOnly
                  className="bg-secondary/30 border-border text-sm opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-mono">TIMEZONE</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="bg-secondary/30 border-border text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern (EST/EDT)</SelectItem>
                    <SelectItem value="America/Chicago">Central (CST/CDT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain (MST/MDT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific (PST/PDT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="p-6 bg-card border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Bell className="size-4 text-primary" />
              Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive task updates and alerts via email</p>
                </div>
                <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Browser push notifications for urgent items</p>
                </div>
                <Switch checked={pushNotifs} onCheckedChange={setPushNotifs} />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="p-6 bg-card border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Key className="size-4 text-primary" />
              Security
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                </div>
                <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Change Password</p>
                  <p className="text-xs text-muted-foreground">Last changed 14 days ago</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info("Password change dialog coming soon")}
                  className="text-xs"
                >
                  Change
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Active Sessions</p>
                  <p className="text-xs text-muted-foreground">1 active session (this device)</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info("Session management coming soon")}
                  className="text-xs"
                >
                  Manage
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="flex items-center justify-between"
        >
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="size-3.5" />
            Sign Out
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            <Save className="size-3.5" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
