// Client Action Modals — 4 Action Flows from Velocity Feed
// 1. Approve Follow-Up   — review/edit draft, send via email
// 2. Reassign Task        — pick new assignee + due date
// 3. Confirm Distribution — confirm notice, optionally send LP email
// 4. Unblock Venture      — 3 options: assign task / schedule review / mark hold

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  CheckCircle2,
  Mail,
  Send,
  UserRoundPlus,
  CalendarDays,
  ShieldCheck,
  Loader2,
  Bot,
  FileText,
  DollarSign,
  Rocket,
  Pause,
  ClipboardList,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";


interface ActionModalProps {
  open: boolean;
  onClose: () => void;
  eventId: number | null;
  actionType: ActionFlowType | null;
  onSuccess?: () => void;
}

export type ActionFlowType =
  | "approve_followup"
  | "reassign_task"
  | "confirm_distribution"
  | "unblock_venture";


export function inferActionFlow(message: string): ActionFlowType {
  const msg = message.toLowerCase();
  if (msg.includes("follow") || msg.includes("draft")) return "approve_followup";
  if (msg.includes("overdue") || msg.includes("reassign") || msg.includes("task")) return "reassign_task";
  if (msg.includes("distribution") || msg.includes("payment")) return "confirm_distribution";
  if (msg.includes("stall") || msg.includes("stuck") || msg.includes("block")) return "unblock_venture";
  return "approve_followup"; // default
}


export default function ClientActionModal({ open, onClose, eventId, actionType, onSuccess }: ActionModalProps) {
  const detailQ = trpc.agents.getEventDetail.useQuery(
    { eventId: eventId! },
    { enabled: open && !!eventId }
  );

  const clientAction = trpc.agents.clientAction.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Action completed successfully");
        onSuccess?.();
        onClose();
      }
    },
    onError: (err) => {
      toast.error(`Action failed: ${err.message}`);
    },
  });

  if (!open || !eventId || !actionType) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader className="sr-only">
          <DialogTitle>Client Action</DialogTitle>
        </DialogHeader>
        {detailQ.isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !detailQ.data ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Event details not available</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={actionType}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {actionType === "approve_followup" && (
                <ApproveFollowUpFlow
                  detail={detailQ.data}
                  onSubmit={(payload) =>
                    clientAction.mutate({ eventId, actionType: "approve_followup", payload })
                  }
                  isSubmitting={clientAction.isPending}
                />
              )}
              {actionType === "reassign_task" && (
                <ReassignTaskFlow
                  detail={detailQ.data}
                  onSubmit={(payload) =>
                    clientAction.mutate({ eventId, actionType: "reassign_task", payload })
                  }
                  isSubmitting={clientAction.isPending}
                />
              )}
              {actionType === "confirm_distribution" && (
                <ConfirmDistributionFlow
                  detail={detailQ.data}
                  onSubmit={(payload) =>
                    clientAction.mutate({ eventId, actionType: "confirm_distribution", payload })
                  }
                  isSubmitting={clientAction.isPending}
                />
              )}
              {actionType === "unblock_venture" && (
                <UnblockVentureFlow
                  detail={detailQ.data}
                  onSubmit={(payload) =>
                    clientAction.mutate({ eventId, actionType: "unblock_venture", payload })
                  }
                  isSubmitting={clientAction.isPending}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </DialogContent>
    </Dialog>
  );
}


type EventDetail = {
  event: any;
  draft: any | null;
  task: any | null;
  distribution: any | null;
  venture: any | null;
  availableTeam: { id: number; name: string; role: string | null }[];
};

interface FlowProps {
  detail: EventDetail;
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
}


function ApproveFollowUpFlow({ detail, onSubmit, isSubmitting }: FlowProps) {
  const { event, draft } = detail;
  const [editedBody, setEditedBody] = useState(draft?.body || "");
  const [sendEmail, setSendEmail] = useState(true);

  useEffect(() => {
    if (draft?.body) setEditedBody(draft.body);
  }, [draft]);

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-center size-8 rounded-lg bg-amber-500/10">
            <FileText className="size-4 text-amber-400" />
          </div>
          <DialogTitle className="text-base">Approve Follow-Up</DialogTitle>
        </div>
        <DialogDescription className="text-xs text-muted-foreground">
          Review the AI-drafted follow-up message and approve it for delivery.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Context */}
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="size-3.5 text-teal-400" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Agent Recommendation</span>
          </div>
          <p className="text-sm text-foreground/80">{event.message}</p>
          {draft?.recipientName && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Recipient: <span className="text-foreground/70">{draft.recipientName}</span>
              {draft.recipientRole && <span className="text-muted-foreground/50"> · {draft.recipientRole}</span>}
            </p>
          )}
        </div>

        {/* Draft body editor */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
            Message
          </label>
          <Textarea
            value={editedBody}
            onChange={(e) => setEditedBody(e.target.value)}
            className="min-h-[120px] text-sm bg-background/50 resize-none"
            placeholder="Follow-up message..."
          />
        </div>

        {/* Send email toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Send via email</p>
              <p className="text-[11px] text-muted-foreground">Deliver to team member's email address</p>
            </div>
          </div>
          <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button
          onClick={() =>
            onSubmit({
              draftId: draft?.id,
              sendEmail,
              editedBody: editedBody !== draft?.body ? editedBody : undefined,
            })
          }
          disabled={isSubmitting || !editedBody.trim()}
          className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Approve & {sendEmail ? "Send" : "Log"}
        </Button>
      </DialogFooter>
    </>
  );
}


function ReassignTaskFlow({ detail, onSubmit, isSubmitting }: FlowProps) {
  const { event, task, availableTeam } = detail;
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [newDueDate, setNewDueDate] = useState(task?.dueDate || "");
  const [note, setNote] = useState("");

  const selectedMember = useMemo(
    () => availableTeam.find((m) => String(m.id) === selectedAssignee),
    [availableTeam, selectedAssignee]
  );

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-center size-8 rounded-lg bg-blue-500/10">
            <UserRoundPlus className="size-4 text-blue-400" />
          </div>
          <DialogTitle className="text-base">Reassign Task</DialogTitle>
        </div>
        <DialogDescription className="text-xs text-muted-foreground">
          Reassign this overdue task to a different team member with an updated deadline.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Task context */}
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="size-3.5 text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Overdue Task</span>
          </div>
          <p className="text-sm font-medium text-foreground">{task?.title || event.agentEntityName || "Task"}</p>
          {task?.assigneeNames?.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Currently assigned to: <span className="text-foreground/70">{task.assigneeNames.join(", ")}</span>
            </p>
          )}
          {task?.dueDate && (
            <p className="text-[11px] text-muted-foreground">
              Due: <span className="text-red-400">{task.dueDate}</span>
            </p>
          )}
        </div>

        {/* New assignee */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
            New Assignee
          </label>
          <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              {availableTeam.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  <span className="capitalize">{m.name}</span>
                  {m.role && <span className="text-muted-foreground ml-2 text-xs">· {m.role}</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* New due date */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
            New Due Date
          </label>
          <Input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="bg-background/50"
          />
        </div>

        {/* Note */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
            Note (optional)
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[60px] text-sm bg-background/50 resize-none"
            placeholder="Add context for the reassignment..."
          />
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button
          onClick={() =>
            onSubmit({
              taskId: task?.id || Number((event.actionPayload as any)?.taskId),
              newAssigneeId: selectedMember?.id,
              newAssigneeName: selectedMember?.name,
              newDueDate: newDueDate || undefined,
              note: note || undefined,
            })
          }
          disabled={isSubmitting || !selectedAssignee}
          className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserRoundPlus className="size-4" />
          )}
          Reassign Task
        </Button>
      </DialogFooter>
    </>
  );
}


function ConfirmDistributionFlow({ detail, onSubmit, isSubmitting }: FlowProps) {
  const { event, draft, distribution } = detail;
  const [editedBody, setEditedBody] = useState(draft?.body || "");
  const [sendEmail, setSendEmail] = useState(false);

  useEffect(() => {
    if (draft?.body) setEditedBody(draft.body);
  }, [draft]);

  const amount = distribution?.amount
    ? `$${Number(distribution.amount).toLocaleString()}`
    : null;

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-500/10">
            <DollarSign className="size-4 text-emerald-400" />
          </div>
          <DialogTitle className="text-base">Confirm Distribution</DialogTitle>
        </div>
        <DialogDescription className="text-xs text-muted-foreground">
          Review and confirm this distribution notice. Optionally send LP notification.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Distribution context */}
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Distribution Details</span>
            {distribution?.status && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {distribution.status}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground">
            {distribution?.name || event.agentEntityName || "Distribution"}
          </p>
          <div className="flex items-center gap-4 mt-2">
            {amount && (
              <div>
                <span className="text-[10px] text-muted-foreground block">Amount</span>
                <span className="text-lg font-semibold tabular-nums text-foreground">{amount}</span>
              </div>
            )}
            {distribution?.fund && (
              <div>
                <span className="text-[10px] text-muted-foreground block">Fund</span>
                <span className="text-sm text-foreground/80">{distribution.fund}</span>
              </div>
            )}
            {distribution?.distributionDate && (
              <div>
                <span className="text-[10px] text-muted-foreground block">Date</span>
                <span className="text-sm text-foreground/80">{distribution.distributionDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* LP notice body */}
        {draft && (
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
              LP Notification
            </label>
            <Textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              className="min-h-[100px] text-sm bg-background/50 resize-none"
              placeholder="LP notification message..."
            />
          </div>
        )}

        {/* Send email toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Send LP notification email</p>
              <p className="text-[11px] text-muted-foreground">Notify investors about this distribution</p>
            </div>
          </div>
          <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button
          onClick={() =>
            onSubmit({
              distributionId: distribution?.id || Number(event.agentEntityId),
              draftId: draft?.id,
              sendEmail,
              editedBody: editedBody !== draft?.body ? editedBody : undefined,
            })
          }
          disabled={isSubmitting}
          className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
          Confirm Distribution
        </Button>
      </DialogFooter>
    </>
  );
}


type UnblockOption = "assign_task" | "schedule_review" | "mark_hold";

function UnblockVentureFlow({ detail, onSubmit, isSubmitting }: FlowProps) {
  const { event, venture, availableTeam } = detail;
  const [selectedOption, setSelectedOption] = useState<UnblockOption | null>(null);
  const [taskTitle, setTaskTitle] = useState(`Unblock: ${venture?.name || event.agentEntityName || "Venture"}`);
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDueDate, setTaskDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [reviewNote, setReviewNote] = useState("");

  const selectedMember = useMemo(
    () => availableTeam.find((m) => String(m.id) === taskAssignee),
    [availableTeam, taskAssignee]
  );

  const options: { value: UnblockOption; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      value: "assign_task",
      label: "Assign a Task",
      desc: "Create a specific task to move this venture forward",
      icon: <ClipboardList className="size-4" />,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      value: "schedule_review",
      label: "Schedule Review",
      desc: "Set up a review meeting to assess the situation",
      icon: <CalendarDays className="size-4" />,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      value: "mark_hold",
      label: "Mark On Hold",
      desc: "Pause this venture until conditions change",
      icon: <Pause className="size-4" />,
      color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
    },
  ];

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-center size-8 rounded-lg bg-purple-500/10">
            <Rocket className="size-4 text-purple-400" />
          </div>
          <DialogTitle className="text-base">Unblock Venture</DialogTitle>
        </div>
        <DialogDescription className="text-xs text-muted-foreground">
          Choose how to move this stalled venture forward.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Venture context */}
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="size-3.5 text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Stalled Venture</span>
          </div>
          <p className="text-sm font-medium text-foreground">{venture?.name || event.agentEntityName || "Venture"}</p>
          {venture?.sector && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Sector: <span className="text-foreground/70">{venture.sector}</span>
              {venture.status && <span className="text-muted-foreground/50"> · {venture.status}</span>}
            </p>
          )}
          <p className="text-xs text-muted-foreground/80 mt-1">{event.message}</p>
        </div>

        {/* Option cards */}
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedOption(opt.value)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left",
                selectedOption === opt.value
                  ? `${opt.color} border-current`
                  : "border-border hover:border-border/80 hover:bg-accent/20"
              )}
            >
              <div className={cn("mt-0.5 flex-shrink-0", selectedOption === opt.value ? "" : "text-muted-foreground")}>
                {opt.icon}
              </div>
              <div>
                <p className={cn("text-sm font-medium", selectedOption === opt.value ? "" : "text-foreground")}>
                  {opt.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Expanded form for assign_task or schedule_review */}
        <AnimatePresence>
          {(selectedOption === "assign_task" || selectedOption === "schedule_review") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 overflow-hidden"
            >
              {selectedOption === "assign_task" && (
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                    Task Title
                  </label>
                  <Input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="bg-background/50"
                    placeholder="What needs to be done?"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                  Assign To
                </label>
                <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeam.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        <span className="capitalize">{m.name}</span>
                        {m.role && <span className="text-muted-foreground ml-2 text-xs">· {m.role}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="bg-background/50"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                  Note
                </label>
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="min-h-[60px] text-sm bg-background/50 resize-none"
                  placeholder="Additional context..."
                />
              </div>
            </motion.div>
          )}

          {selectedOption === "mark_hold" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-sm text-amber-400">
                  This will mark the venture as "On Hold". It can be reactivated later from the venture detail page.
                </p>
              </div>
              <div className="mt-3">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                  Reason (optional)
                </label>
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="min-h-[60px] text-sm bg-background/50 resize-none"
                  placeholder="Why is this being put on hold?"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DialogFooter className="gap-2">
        <Button
          onClick={() =>
            onSubmit({
              ventureId: venture?.id || Number(event.agentEntityId),
              unblockAction: selectedOption,
              taskTitle: selectedOption === "assign_task" ? taskTitle : undefined,
              taskAssignee: selectedMember?.name,
              taskDueDate: taskDueDate || undefined,
              reviewNote: reviewNote || undefined,
            })
          }
          disabled={isSubmitting || !selectedOption}
          className="bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : selectedOption === "mark_hold" ? (
            <Pause className="size-4" />
          ) : (
            <Rocket className="size-4" />
          )}
          {selectedOption === "assign_task"
            ? "Create Task"
            : selectedOption === "schedule_review"
            ? "Schedule Review"
            : selectedOption === "mark_hold"
            ? "Mark On Hold"
            : "Take Action"}
        </Button>
      </DialogFooter>
    </>
  );
}
