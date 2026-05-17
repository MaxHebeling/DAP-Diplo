"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/module/markdown";

type MarkdownEditorProps = {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  id?: string;
};

export function MarkdownEditor({
  value,
  onChange,
  rows = 12,
  placeholder = "Escribe en Markdown…",
  id,
}: MarkdownEditorProps) {
  return (
    <Tabs defaultValue="editor" className="w-full">
      <TabsList className="mb-3">
        <TabsTrigger value="editor">Editor</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>

      <TabsContent value="editor">
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="font-mono text-sm"
        />
      </TabsContent>

      <TabsContent value="preview">
        <div className="min-h-[200px] rounded-md border bg-card/40 p-5">
          {value.trim().length === 0 ? (
            <p className="text-sm italic text-muted-foreground">
              (vacío — escribe en la pestaña Editor para ver el preview)
            </p>
          ) : (
            <Markdown>{value}</Markdown>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
