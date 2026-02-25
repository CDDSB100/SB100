import { FileSearch } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocumentCard } from "./DocumentCard";

interface Document {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  relevance: number;
  date?: string;
  type: "research" | "guide" | "article" | "manual";
}

interface DocumentSidebarProps {
  documents: Document[];
}

export function DocumentSidebar({ documents }: DocumentSidebarProps) {
  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-sidebar-background border-l border-sidebar-border shadow-medium z-20">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-sidebar-border mt-[73px]">
          <FileSearch className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Documentos Consultados</h2>
        </div>

        {/* Documents List */}
        <ScrollArea className="flex-1 p-4">
          {documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileSearch className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                Os documentos consultados aparecerão aqui quando você fizer perguntas
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {documents.length > 0 && (
          <div className="p-4 border-t border-sidebar-border">
            <p className="text-xs text-muted-foreground text-center">
              {documents.length} documento{documents.length !== 1 ? "s" : ""} consultado{documents.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}