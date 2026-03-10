import { Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    role: "user" | "assistant";
    timestamp: Date;
    isLoading?: boolean;
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 p-4 transition-colors",
        isUser ? "bg-transparent justify-end" : "bg-accent/30 justify-start"
      )}
    >
      <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row", "max-w-[70%]")}>
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
          )}
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : message.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>
        <div className={cn("flex-1 space-y-2", isUser && "text-right")}>
          <div className={cn("flex items-center gap-2", isUser && "justify-end")}>
            <span className="text-sm font-medium">
              {isUser ? "Você" : "Sb100"}
            </span>
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className={cn("text-sm leading-relaxed", message.isLoading && "text-muted-foreground")}>
            {message.isLoading ? (
              <span className="flex items-center gap-1">
                <span>Analisando documentos</span>
                <span className="animate-pulse">...</span>
              </span>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    // Custom styling for markdown elements
                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-foreground">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-md font-semibold mb-2 text-foreground">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-foreground">{children}</h3>,
                    p: ({ children }) => <p className="mb-2 last:mb-0 text-foreground">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-foreground">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-foreground">{children}</ol>,
                    li: ({ children }) => <li className="ml-2">{children}</li>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/20 pl-4 italic text-muted-foreground">{children}</blockquote>,
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono text-foreground">{children}</code>
                      ) : (
                        <code className={className}>{children}</code>
                      );
                    },
                    table: ({ children }) => <table className="w-full border-collapse border border-border mb-2">{children}</table>,
                    th: ({ children }) => <th className="border border-border p-2 bg-muted font-semibold text-left text-foreground">{children}</th>,
                    td: ({ children }) => <td className="border border-border p-2 text-foreground">{children}</td>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}