import React from "react";
import { useState, useRef, useEffect } from "react";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { DocumentSidebar } from "@/components/DocumentSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sprout } from "lucide-react";


interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isLoading?: boolean;
}

interface Document {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  relevance: number;
  date?: string;
  type: "research" | "guide" | "article" | "manual";
}

interface ApiSource {
  id: string;
  score: number;
  content: string;
  file: string;
}

interface ApiResponse {
  // legacy `response` kept for backward compatibility
  response?: string;
  // newer field used by the backend
  answer?: string;
  decision?: string;
  refined_question?: string | null;
  // retrieved_contexts is an array of arrays of context objects
  retrieved_contexts?: Array<Array<{ id?: string | null; score?: number; content?: string; file?: string }>>;
  sources?: ApiSource[];
}



const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Olá! Sou o Sb100, seu assistente especializado em agricultura e fertilização do solo. Como posso ajudá-lo hoje? Posso responder perguntas sobre análise de solo, correção de pH, adubação, manejo de nutrientes e muito mais!",
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cultura, setCultura] = useState<string>("citros");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Generate consistent session and user IDs that persist for the entire chat session
  const sessionIdRef = useRef<string>("session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9));
  const userIdRef = useRef<string>("user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9));

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add loading message
    const loadingMessage: Message = {
      id: Date.now().toString() + "-loading",
      content: "",
      role: "assistant",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);
    setIsLoading(true);

    try {
      // Call the API (use a relative path so the browser uses the same origin
      // as the served frontend and avoids CORS issues)
      const response = await fetch(`/api/chat?cultura=${encodeURIComponent(cultura)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userIdRef.current,
            question: content
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      // Extract documents from API response using the new structure
      let extractedDocuments: Document[] = [];
      if (data.retrieved_contexts && Array.isArray(data.retrieved_contexts)) {
        // Flatten the array of arrays
        const flattenedContexts = data.retrieved_contexts.flat();
        extractedDocuments = flattenedContexts.map((context, index: number) => {
          // Determine document type based on file extension or content
          const fileName = context.file || `Documento ${index + 1}`;
          let docType: "research" | "guide" | "article" | "manual" = "article";
          
          if (fileName.includes("tabela") || fileName.includes("table")) {
            docType = "research";
          } else if (fileName.includes("manual") || fileName.includes("guia")) {
            docType = "guide";
          } else if (fileName.includes("artigo") || fileName.includes("paper")) {
            docType = "article";
          }

          return {
            id: context.id || `doc_${index}`,
            title: fileName,
            excerpt: context.content || "Conteúdo não disponível",
            source: fileName,
            relevance: Math.round((context.score || 0) * 100),
            date: new Date().getFullYear().toString(), // Default to current year since no date info
            type: docType
          };
        });
      }
      
      // Remove loading message and add actual response
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isLoading);
        const assistantMessage: Message = {
          id: Date.now().toString() + "-response",
          content: data.answer || data.response || "Desculpe, não consegui processar sua mensagem.",
          role: "assistant",
          timestamp: new Date(),
        };
        return [...filtered, assistantMessage];
      });

      // Update documents with extracted data
      if (extractedDocuments.length > 0) {
        setDocuments(extractedDocuments);
      } else {
        setDocuments([]);
      }

    } catch (error) {
      console.error('Error calling API:', error);
      
      // Remove loading message and add error response
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isLoading);
        const errorMessage: Message = {
          id: Date.now().toString() + "-error",
          content: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.",
          role: "assistant",
          timestamp: new Date(),
        };
        return [...filtered, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="flex h-screen bg-gradient-earth">      
      <div className="flex-1 flex flex-col mr-80">
        <ChatHeader />
        {/* Cultura selector: choose agricultural crop context for the assistant */}
        <div className="px-6 py-2">
          <label htmlFor="cultura-select" className="block text-sm font-medium text-muted-foreground mb-1">Cultura</label>
          <select
            id="cultura-select"
            value={cultura}
            onChange={(e) => setCultura(e.target.value)}
            className="border border-border rounded px-3 py-2 text-sm bg-card"
          >
            <option value="citros">Citros</option>
            <option value="cana-de-acucar">Cana-de-açúcar</option>
          </select>
        </div>
        
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="pb-4">
            {messages.length === 1 && (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full mb-6">
                  <Sprout className="h-16 w-16 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Bem-vindo ao Sb100!</h2>
                <p className="text-muted-foreground text-center max-w-md">
                  Pergunte sobre análise de solo, correção de pH, adubação, manejo de nutrientes e técnicas de fertilização.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-lg">
                  <button
                    onClick={() => handleSendMessage("Como fazer análise de solo?")}
                    className="p-3 text-left text-sm bg-card hover:bg-accent/20 rounded-lg border border-border hover:border-primary/30 transition-all"
                  >
                    🔬 Como fazer análise de solo?
                  </button>
                  <button
                    onClick={() => handleSendMessage("Qual o pH ideal para milho?")}
                    className="p-3 text-left text-sm bg-card hover:bg-accent/20 rounded-lg border border-border hover:border-primary/30 transition-all"
                  >
                    🌽 pH ideal para milho?
                  </button>
                  <button
                    onClick={() => handleSendMessage("Como calcular adubação NPK?")}
                    className="p-3 text-left text-sm bg-card hover:bg-accent/20 rounded-lg border border-border hover:border-primary/30 transition-all"
                  >
                    🌱 Calcular adubação NPK
                  </button>
                  <button
                    onClick={() => handleSendMessage("Quando aplicar calcário?")}
                    className="p-3 text-left text-sm bg-card hover:bg-accent/20 rounded-lg border border-border hover:border-primary/30 transition-all"
                  >
                    ⛰️ Quando aplicar calcário?
                  </button>
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id}>
                <ChatMessage message={message} />
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
      
      <DocumentSidebar documents={documents} />
    </div>
  );
};

export default Index;