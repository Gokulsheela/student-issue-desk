import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Phone, Video } from 'lucide-react';
import chatIcon from '@/assets/chat-icon.jpg';

interface Message {
  id: string;
  sender_id: string;
  sender_role: string;
  message_text: string;
  created_at: string;
  profiles: { name: string };
}

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('complaint_id', id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Fetch profiles separately
      const messagesWithProfiles = await Promise.all(
        data.map(async (message) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', message.sender_id)
            .single();
          
          return {
            ...message,
            profiles: profile || { name: 'Unknown' }
          };
        })
      );
      setMessages(messagesWithProfiles as any);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `complaint_id=eq.${id}`
        },
        async (payload) => {
          const { data } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', data.sender_id)
              .single();
            
            const messageWithProfile = {
              ...data,
              profiles: profile || { name: 'Unknown' }
            };
            
            setMessages(prev => [...prev, messageWithProfile as any]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        complaint_id: id,
        sender_id: user?.id,
        sender_role: isAdmin ? 'admin' : 'student',
        message_text: newMessage,
        message_type: 'text'
      });

    if (error) {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setNewMessage('');
    }
    
    setSending(false);
  };

  const handleCall = (type: 'audio' | 'video') => {
    toast({
      title: `${type === 'audio' ? 'Audio' : 'Video'} Call`,
      description: 'Call feature would be initiated here'
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(isAdmin ? '/admin-dashboard' : '/student-dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={chatIcon} alt="Chat" className="w-8 h-8 rounded" />
            <h1 className="text-xl font-bold text-foreground">Chat</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => handleCall('audio')}>
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleCall('video')}>
              <Video className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm font-semibold mb-1">
                        {message.profiles?.name} ({message.sender_role})
                      </p>
                      <p className="whitespace-pre-wrap">{message.message_text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={sending}
              />
              <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Chat;
