import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface IssueAttachmentsProps {
  attachments: string[];
  onChange: (attachments: string[]) => void;
  issueId?: string;
  readOnly?: boolean;
}

export function IssueAttachments({ attachments, onChange, issueId, readOnly }: IssueAttachmentsProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList) => {
    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
          toast.error(`${file.name} is too large (max 50MB)`);
          continue;
        }
        const ext = file.name.split(".").pop();
        const path = `${issueId || "new"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("issue-attachments").upload(path, file);
        if (error) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }
        const { data: urlData } = supabase.storage.from("issue-attachments").getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }
      if (newUrls.length > 0) {
        onChange([...attachments, ...newUrls]);
        toast.success(`${newUrls.length} file(s) uploaded`);
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (index: number) => {
    onChange(attachments.filter((_, i) => i !== index));
  };

  const isVideo = (url: string) => /\.(mp4|mov|avi|webm|mkv)$/i.test(url);

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && upload(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            {uploading ? "Uploading..." : "Add Photos/Videos"}
          </Button>
        </div>
      )}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((url, i) => (
            <div key={i} className="relative group rounded-md overflow-hidden border border-border">
              {isVideo(url) ? (
                <video src={url} className="h-20 w-20 object-cover" muted />
              ) : (
                <img src={url} alt="attachment" className="h-20 w-20 object-cover" />
              )}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
