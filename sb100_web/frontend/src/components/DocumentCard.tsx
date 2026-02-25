import { FileText, ExternalLink, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    excerpt: string;
    source: string;
    relevance: number;
    date?: string;
    type: "research" | "guide" | "article" | "manual";
  };
}

export function DocumentCard({ document }: DocumentCardProps) {
  const typeColors = {
    research: "bg-primary/10 text-primary border-primary/20",
    guide: "bg-accent/10 text-accent-foreground border-accent/20",
    article: "bg-secondary/10 text-secondary-foreground border-secondary/20",
    manual: "bg-muted/10 text-muted-foreground border-muted/20",
  };

  const typeLabels = {
    research: "Pesquisa",
    guide: "Guia",
    article: "Artigo",
    manual: "Manual",
  };

  return (
    <Card className="p-4 space-y-3 hover:shadow-medium transition-all duration-300 hover:scale-[1.02] cursor-pointer border-border/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold line-clamp-2">{document.title}</h4>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={typeColors[document.type]}
        >
          {typeLabels[document.type]}
        </Badge>
      </div>
      
      <div className="text-xs text-muted-foreground prose prose-xs max-w-none dark:prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Custom styling for markdown elements in document cards
            h1: ({ children }) => <h1 className="text-sm font-bold mb-1 text-muted-foreground">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xs font-semibold mb-1 text-muted-foreground">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xs font-semibold mb-1 text-muted-foreground">{children}</h3>,
            p: ({ children }) => <p className="mb-1 last:mb-0 text-muted-foreground text-xs">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-1 space-y-0.5 text-muted-foreground text-xs">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-1 space-y-0.5 text-muted-foreground text-xs">{children}</ol>,
            li: ({ children }) => <li className="ml-1 text-xs">{children}</li>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/20 pl-2 italic text-muted-foreground/80 text-xs">{children}</blockquote>,
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-muted px-0.5 py-0.5 rounded text-xs font-mono text-muted-foreground">{children}</code>
              ) : (
                <code className={`${className} text-xs`}>{children}</code>
              );
            },
            table: ({ children }) => <table className="w-full border-collapse border border-border mb-1 text-xs">{children}</table>,
            th: ({ children }) => <th className="border border-border p-1 bg-muted font-semibold text-left text-muted-foreground text-xs">{children}</th>,
            td: ({ children }) => <td className="border border-border p-1 text-muted-foreground text-xs">{children}</td>,
          }}
        >
          {document.excerpt}
        </ReactMarkdown>
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            {document.source}
          </span>
          {document.date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {document.date}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all"
              style={{ width: `${document.relevance}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{document.relevance}%</span>
        </div>
      </div>
    </Card>
  );
}