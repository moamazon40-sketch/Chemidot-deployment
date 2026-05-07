import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListConversations, useGetMessages, useSendMessage } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";

export default function Messages() {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: convosData, isLoading: isLoadingConvos, refetch: refetchConvos } = useListConversations();
  const conversations = convosData || [];

  useEffect(() => {
    if (conversations.length > 0 && activeId === null) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  const { data: messagesData, isLoading: isLoadingMessages, refetch: refetchMessages } = useGetMessages(
    activeId || 0, { query: { enabled: !!activeId, refetchInterval: 4000 } as any }
  );

  useEffect(() => {
    const interval = setInterval(() => refetchConvos(), 8000);
    return () => clearInterval(interval);
  }, [refetchConvos]);

  const sendMutation = useSendMessage();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeId) return;
    sendMutation.mutate({ conversationId: activeId, data: { content: newMessage } }, {
      onSuccess: () => { setNewMessage(""); refetchMessages(); refetchConvos(); }
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData]);

  const activeConvo = conversations.find((c: any) => c.id === activeId);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-4">

        {/* Conversations List */}
        <Card className="w-full md:w-72 flex-shrink-0 flex flex-col overflow-hidden h-full">
          <div className="p-4 border-b bg-muted/30 shrink-0">
            <h2 className="font-semibold text-sm">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingConvos ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="flex gap-3"><Skeleton className="w-10 h-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /></div></div>)}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No conversations yet.</p>
                <p className="text-xs mt-1">Contact a supplier from a product page to start chatting.</p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((convo: any) => (
                  <div
                    key={convo.id}
                    onClick={() => setActiveId(convo.id)}
                    className={`p-3.5 cursor-pointer transition-colors flex gap-3 ${activeId === convo.id ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-muted/50 border-l-2 border-l-transparent"}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-blue-600/20 border flex items-center justify-center font-bold text-sm text-primary shrink-0">
                      {(convo.otherPartyName || "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <div className="font-medium truncate text-sm">{convo.otherPartyName}</div>
                        {convo.lastMessageAt && (
                          <div className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {new Date(convo.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{convo.lastMessage || "No messages yet"}</div>
                    </div>
                    {convo.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shrink-0 mt-1">
                        {convo.unreadCount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden h-full">
          {activeId ? (
            <>
              <div className="p-4 border-b bg-muted/30 flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-blue-600/20 border flex items-center justify-center font-bold text-primary">
                  {(activeConvo?.otherPartyName || "?").charAt(0)}
                </div>
                <div>
                  <h2 className="font-semibold text-sm">{activeConvo?.otherPartyName}</h2>
                  <p className="text-xs text-muted-foreground">Auto-refreshes every 4 seconds</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingMessages ? (
                  <div className="space-y-3">
                    <Skeleton className="h-14 w-2/3 rounded-2xl rounded-bl-none" />
                    <Skeleton className="h-14 w-2/3 rounded-2xl rounded-br-none ml-auto" />
                  </div>
                ) : (messagesData || []).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">Send a message to start the conversation.</p>
                  </div>
                ) : (
                  [...(messagesData || [])].reverse().map((msg: any) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                          {!isMe && <p className="text-[10px] font-medium mb-1 opacity-70">{msg.senderName}</p>}
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t bg-background shrink-0">
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    className="flex-1"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    disabled={sendMutation.isPending}
                    autoComplete="off"
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMutation.isPending}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">Your Messages</h3>
              <p className="text-sm mt-1">Select a conversation or contact a supplier to start chatting.</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
