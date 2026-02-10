import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Send, Image, Paperclip, Mic, MicOff, X, Play, Pause, 
  FileText, Download, Loader2, StopCircle, File
} from "lucide-react";
import { toast } from "sonner";

type MessageType = "text" | "image" | "file" | "voice";

interface MessageContent {
  type: MessageType;
  text?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  duration?: number;
}

interface ChatMessage {
  id: string;
  organization_id: string;
  channel: string;
  content: string;
  sender_id: string;
  created_at: string;
}

// Parse message content - handles both plain text and JSON format
const parseMessageContent = (content: string): MessageContent => {
  try {
    const parsed = JSON.parse(content);
    console.log("Parsed message:", parsed);
    if (parsed && typeof parsed === "object" && parsed.type) {
      return parsed as MessageContent;
    }
  } catch (e) {
    // Not JSON, treat as plain text
    console.log("Plain text message:", content);
  }
  return { type: "text", text: content };
};

// Get file extension icon color
const getFileColor = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["pdf"].includes(ext || "")) return "text-red-500 bg-red-50";
  if (["doc", "docx"].includes(ext || "")) return "text-blue-600 bg-blue-50";
  if (["xls", "xlsx"].includes(ext || "")) return "text-green-600 bg-green-50";
  if (["ppt", "pptx"].includes(ext || "")) return "text-orange-500 bg-orange-50";
  if (["zip", "rar", "7z"].includes(ext || "")) return "text-yellow-600 bg-yellow-50";
  return "text-gray-500 bg-gray-50";
};

export default function TeamChat() {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const { data: members = [] } = useOrgMembers();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("general");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  
  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["chat-messages", orgId, channel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("channel", channel)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!orgId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!orgId) return;
    const sub = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `organization_id=eq.${orgId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [orgId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const sendMessage = useMutation({
    mutationFn: async (messageContent?: MessageContent) => {
      const content = messageContent 
        ? JSON.stringify(messageContent)
        : message.trim();
      
      if (!content) return;
      
      const { error } = await supabase.from("chat_messages").insert({
        organization_id: orgId!,
        channel,
        content,
        sender_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
    },
    onError: (e) => { console.error(e); toast.error("Failed to send message"); },
  });

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !orgId) return;
    setUploading(true);
    try {
      const fileName = `voice_${Date.now()}.webm`;
      const path = `chat/${orgId}/${channel}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, audioBlob);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(path);
      
      await sendMessage.mutateAsync({
        type: "voice",
        attachmentUrl: urlData.publicUrl,
        attachmentName: fileName,
        duration: recordingTime,
      });
      
      cancelRecording();
      toast.success("Voice message sent");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send voice message");
    } finally {
      setUploading(false);
    }
  };

  // File upload handler
  const handleFileUpload = async (file: File, type: "image" | "file") => {
    if (!orgId) return;
    setUploading(true);
    try {
      const path = `chat/${orgId}/${channel}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(path);
      
      console.log("File uploaded, URL:", urlData.publicUrl);
      
      const messageData = {
        type,
        attachmentUrl: urlData.publicUrl,
        attachmentName: file.name,
      };
      console.log("Sending message:", messageData);
      
      await sendMessage.mutateAsync(messageData);
      
      toast.success(`${type === "image" ? "Image" : "File"} sent`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  // Audio playback
  const toggleAudioPlayback = (msgId: string, url: string) => {
    let audio = audioRefs.current.get(msgId);
    
    if (!audio) {
      audio = new Audio(url);
      audio.onended = () => setPlayingAudioId(null);
      audioRefs.current.set(msgId, audio);
    }
    
    if (playingAudioId === msgId) {
      audio.pause();
      setPlayingAudioId(null);
    } else {
      if (playingAudioId) {
        const currentAudio = audioRefs.current.get(playingAudioId);
        currentAudio?.pause();
      }
      audio.play();
      setPlayingAudioId(msgId);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getMemberName = (userId: string) => members.find((m) => m.user_id === userId)?.full_name || "User";
  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getChannelLabel = (ch: string) => {
    if (ch === "general") return "General";
    const proj = projects.find((p: { id: string; name: string }) => p.id === ch);
    return proj ? proj.name : ch;
  };

  // Render different message types - Teams style
  const renderMessageContent = (msg: ChatMessage, isMe: boolean) => {
    const content = parseMessageContent(msg.content);
    
    switch (content.type) {
      case "image":
        return (
          <div>
            {content.attachmentUrl && (
              <a href={content.attachmentUrl} target="_blank" rel="noreferrer" className="block">
                <img 
                  src={content.attachmentUrl} 
                  alt={content.attachmentName || "Image"} 
                  className="max-w-[300px] max-h-[240px] rounded-lg object-cover shadow-sm hover:shadow-md transition-shadow"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </a>
            )}
            {content.attachmentName && (
              <p className="text-xs text-muted-foreground mt-1">{content.attachmentName}</p>
            )}
          </div>
        );
      
      case "file": {
        const fileColor = getFileColor(content.attachmentName || "");
        return (
          <div>
            <a 
              href={content.attachmentUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-3 p-3 bg-background border rounded-lg hover:bg-muted/50 transition-colors max-w-[280px]"
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${fileColor}`}>
                <File className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{content.attachmentName || "File"}</p>
                <p className="text-xs text-muted-foreground">Click to download</p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </a>
          </div>
        );
      }
      
      case "voice":
        return (
          <div>
            <div className="flex items-center gap-3 p-3 bg-background border rounded-lg max-w-[260px]">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (content.attachmentUrl) {
                    toggleAudioPlayback(msg.id, content.attachmentUrl);
                  }
                }}
              >
                {playingAudioId === msg.id ? (
                  <Pause className="h-5 w-5 text-primary" />
                ) : (
                  <Play className="h-5 w-5 text-primary ml-0.5" />
                )}
              </Button>
              <div className="flex-1">
                <div className="flex gap-0.5 items-center h-6">
                  {[...Array(20)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1 rounded-full transition-all ${
                        playingAudioId === msg.id 
                          ? "bg-primary animate-pulse" 
                          : "bg-muted-foreground/30"
                      }`}
                      style={{ height: `${Math.random() * 16 + 8}px` }}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {content.duration ? formatTime(content.duration) : "Voice message"}
                </p>
              </div>
            </div>
          </div>
        );
      
      default:
        return <p className="text-sm whitespace-pre-wrap">{content.text || msg.content}</p>;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Team Chat</h1>
          <p className="text-muted-foreground text-sm">Communicate with your team in real-time</p>
        </div>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="w-[180px]">
            <SelectValue>{getChannelLabel(channel)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            {projects.map((p: { id: string; name: string }) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-lg">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/20">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              const name = getMemberName(msg.sender_id);
              const content = parseMessageContent(msg.content);
              const isText = content.type === "text";
              
              return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}>
                  {/* Avatar - Left side for others */}
                  {!isMe && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-sm">
                      {getInitials(name)}
                    </div>
                  )}
                  
                  {/* Message Content */}
                  <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                    {/* Sender name & time */}
                    <div className={`flex items-center gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                      <span className="text-xs font-medium text-foreground">{isMe ? "You" : name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    
                    {/* Message bubble - only styled for text */}
                    {isText ? (
                      <div className={`rounded-2xl px-4 py-2 ${
                        isMe 
                          ? "bg-primary text-primary-foreground rounded-br-sm" 
                          : "bg-muted rounded-bl-sm"
                      }`}>
                        {renderMessageContent(msg, isMe)}
                      </div>
                    ) : (
                      <div>
                        {renderMessageContent(msg, isMe)}
                      </div>
                    )}
                  </div>
                  
                  {/* Avatar - Right side for me */}
                  {isMe && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
                      {getInitials(name)}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Voice Recording Preview */}
        {(isRecording || audioBlob) && (
          <div className="border-t p-3 bg-muted/50">
            <div className="flex items-center gap-3">
              {isRecording ? (
                <>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium">Recording... {formatTime(recordingTime)}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={cancelRecording}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" className="h-9 w-9 rounded-full" onClick={stopRecording}>
                    <StopCircle className="h-4 w-4" />
                  </Button>
                </>
              ) : audioBlob && (
                <>
                  <div className="flex items-center gap-2 flex-1">
                    <audio src={audioUrl || undefined} controls className="h-10 flex-1" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={cancelRecording}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    className="h-9 w-9 rounded-full" 
                    onClick={sendVoiceMessage}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Message Input - Teams style */}
        <div className="border-t p-3 bg-background">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, "image");
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, "file");
            }}
          />
          
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-2">
            {/* Attachment buttons */}
            <div className="flex gap-1">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg hover:bg-background"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading || isRecording}
                title="Send image"
              >
                <Image className="h-4 w-4" />
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg hover:bg-background"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isRecording}
                title="Send file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button 
                type="button" 
                variant={isRecording ? "destructive" : "ghost"}
                size="icon" 
                className="h-8 w-8 rounded-lg hover:bg-background"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={uploading || !!audioBlob}
                title={isRecording ? "Stop recording" : "Record voice message"}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Text input */}
            <form
              onSubmit={(e) => { 
                e.preventDefault(); 
                if (message.trim()) {
                  sendMessage.mutate({ type: "text", text: message.trim() });
                }
              }}
              className="flex-1 flex gap-2"
            >
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isRecording || !!audioBlob}
              />
              <Button 
                type="submit" 
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={!message.trim() || sendMessage.isPending || uploading || isRecording || !!audioBlob}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}
