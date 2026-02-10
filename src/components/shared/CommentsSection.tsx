import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { useOrgMembers } from "@/hooks/useOrgMembers";

interface CommentsSectionProps {
  parentId: string;
  parentType: "task" | "issue";
}

export function CommentsSection({ parentId, parentType }: CommentsSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const { data: members = [] } = useOrgMembers();

  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    return member?.full_name || "Unknown User";
  };

  const getInitials = (userId: string) => {
    const name = getMemberName(userId);
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const table = parentType === "task" ? "task_comments" : "issue_comments";
  const fkColumn = parentType === "task" ? "task_id" : "issue_id";

  const { data: comments = [] } = useQuery({
    queryKey: [table, parentId],
    queryFn: async () => {
      let data: any[], error: any;
      if (parentType === "task") {
        const res = await supabase.from("task_comments").select("*").eq("task_id", parentId).order("created_at", { ascending: true });
        data = res.data ?? []; error = res.error;
      } else {
        const res = await supabase.from("issue_comments").select("*").eq("issue_id", parentId).order("created_at", { ascending: true });
        data = res.data ?? []; error = res.error;
      }
      if (error) throw error;
      return data;
    },
    enabled: !!parentId,
  });

  const addComment = useMutation({
    mutationFn: async () => {
      let error: any;
      if (parentType === "task") {
        const res = await supabase.from("task_comments").insert({ content, user_id: user!.id, task_id: parentId });
        error = res.error;
      } else {
        const res = await supabase.from("issue_comments").insert({ content, user_id: user!.id, issue_id: parentId });
        error = res.error;
      }
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, parentId] });
      setContent("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      let error: any;
      if (parentType === "task") {
        const res = await supabase.from("task_comments").delete().eq("id", id);
        error = res.error;
      } else {
        const res = await supabase.from("issue_comments").delete().eq("id", id);
        error = res.error;
      }
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table, parentId] }),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Comments ({comments.length})</h4>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-3 group">
              <Avatar className="h-7 w-7 mt-0.5">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(c.user_id)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{getMemberName(c.user_id)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
                  {c.user_id === user?.id && (
                    <button
                      onClick={() => deleteComment.mutate(c.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  )}
                </div>
                <p className="text-sm mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[60px] text-sm"
        />
        <Button
          size="icon"
          onClick={() => addComment.mutate()}
          disabled={!content.trim() || addComment.isPending}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
