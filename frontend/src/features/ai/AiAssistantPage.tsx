/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import { usePatientsList, usePatientReports } from '../patients/patientApi.ts';
import { useReportSummary, useSendChatMessage } from './aiApi.ts';
import { 
  Bot, User, Send, ShieldAlert, Sparkles, FileText, 
  BrainCircuit 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function AiAssistantPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [summaryReportId, setSummaryReportId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: patientData } = usePatientsList({ page_size: 50 });
  const { data: reports } = usePatientReports(Number(selectedPatientId) || 0);

  // Mutations
  const sendChatMutation = useSendChatMessage();
  const summarizeMutation = useReportSummary();

  const patientsList = patientData?.patients || [];
  const selectedPatient = patientsList.find((p: any) => p.id === Number(selectedPatientId));

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set initial greeting when a patient is selected
  useEffect(() => {
    if (selectedPatientId) {
      const patientName = selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'the patient';
      setMessages([
        {
          id: 'greeting',
          sender: 'assistant',
          text: `Hello. I am your AI Clinical Assistant. I have loaded the oncological chart for **${patientName}** (MRN: ${selectedPatient?.mrn || 'N/A'}). You can ask me to summarize their pathology scans, review clinical history, or answer questions about standard treatment regimens.`,
          timestamp: new Date(),
        },
      ]);
    } else {
      setMessages([]);
    }
  }, [selectedPatientId, selectedPatient]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error('Please select a patient to context-scope the AI assistant.');
      return;
    }
    if (!inputText.trim()) return;

    const userMsgText = inputText;
    const userMsgId = Math.random().toString();
    
    // Append user message
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: userMsgText, timestamp: new Date() },
    ]);
    setInputText('');

    try {
      const response = await sendChatMutation.mutateAsync({
        patientId: Number(selectedPatientId),
        message: userMsgText,
      });

      // Append empty assistant message placeholder
      const assistantMsgId = Math.random().toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          sender: 'assistant',
          text: '',
          timestamp: new Date(),
        },
      ]);

      // Stream response words progressively
      let currentText = '';
      const words = response.response.split(' ');
      let wordIndex = 0;
      const interval = setInterval(() => {
        if (wordIndex < words.length) {
          currentText += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, text: currentText } : m))
          );
          wordIndex++;
        } else {
          clearInterval(interval);
        }
      }, 25);

    } catch {
      toast.error('Failed to get response from clinical assistant.');
    }
  };

  const handleSummarizeReport = async (reportId: number) => {
    setSummaryReportId(reportId);
    try {
      const result = await summarizeMutation.mutateAsync(reportId);
      const fullText = `### AI Clinical Summary Generated:\n\n${result.summary}`;
      
      // Append empty assistant summary placeholder
      const summaryMsgId = Math.random().toString();
      setMessages((prev) => [
        ...prev,
        {
          id: summaryMsgId,
          sender: 'assistant',
          text: '',
          timestamp: new Date(),
        },
      ]);

      // Stream summary words progressively
      let currentText = '';
      const words = fullText.split(' ');
      let wordIndex = 0;
      const interval = setInterval(() => {
        if (wordIndex < words.length) {
          currentText += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
          setMessages((prev) =>
            prev.map((m) => (m.id === summaryMsgId ? { ...m, text: currentText } : m))
          );
          wordIndex++;
        } else {
          clearInterval(interval);
        }
      }, 20);

      toast.success('Document summarized successfully!');
    } catch {
      toast.error('Failed to generate report summary.');
    } finally {
      setSummaryReportId(null);
    }
  };

  // Helper function to extract disclaimer warnings from AI output and render them styled
  const renderMessageContent = (text: string) => {
    const disclaimerMarker = "[Warning:";
    const disclaimerIndex = text.indexOf(disclaimerMarker);

    if (disclaimerIndex !== -1) {
      const mainText = text.substring(0, disclaimerIndex).trim();
      const disclaimerText = text.substring(disclaimerIndex).replace('[', '').replace(']', '').trim();

      return (
        <div className="space-y-3">
          <div className="whitespace-pre-wrap leading-relaxed text-sm">{mainText}</div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2.5">
            <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-medium">{disclaimerText}</p>
          </div>
        </div>
      );
    }

    return <div className="whitespace-pre-wrap leading-relaxed text-sm">{text}</div>;
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 h-[calc(100vh-10rem)]">
      {/* Sidebar: Patient Scope & Reports list */}
      <div className="lg:col-span-1 flex flex-col gap-4 h-full overflow-y-auto">
        <Card title="Assistant Scoping">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Active Patient Chart</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#0B63CE] focus:outline-none bg-white font-semibold"
              >
                <option value="">Select Patient...</option>
                {patientsList.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.mrn})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {selectedPatientId && (
          <Card title="Available Scans" className="flex-1 overflow-y-auto min-h-48">
            {!reports || reports.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No reports uploaded for this patient.</p>
            ) : (
              <div className="space-y-2.5">
                {reports.map((r: any) => (
                  <div key={r.id} className="rounded-lg border border-gray-150 p-3 hover:border-gray-300 transition-colors bg-white">
                    <div className="flex items-center gap-2 text-gray-700">
                      <FileText className="h-4 w-4 text-[#0B63CE]" />
                      <span className="text-xs font-bold capitalize">{r.type} scan</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 font-mono truncate">{r.gcs_uri}</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSummarizeReport(r.id)}
                      isLoading={summaryReportId === r.id && summarizeMutation.isPending}
                      className="w-full mt-2 h-7 text-[10px]"
                    >
                      <Sparkles className="h-3 w-3 mr-1" /> Summarize Report
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Main Chat Interface */}
      <div className="lg:col-span-3 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden h-full">
        {/* Chat Header */}
        <div className="border-b border-gray-200 bg-gray-50/50 px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#0B63CE]/10 p-2 text-[#0B63CE]">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0E1116]">Clinical AI Co-Pilot</h4>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                {selectedPatient 
                  ? `Active Chart context: ${selectedPatient.first_name} ${selectedPatient.last_name}` 
                  : 'Select a patient chart to start consultation'}
              </p>
            </div>
          </div>
          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
            Gemini Flash
          </span>
        </div>

        {/* Chat Timeline viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {!selectedPatientId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <Bot className="h-10 w-10 text-gray-300 animate-pulse" />
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">No Patient Loaded</h4>
                <p className="text-[11px] text-gray-400 max-w-xs mt-1 leading-relaxed">
                  Please select a patient from the side panel. The AI assistant will load their history, staging metrics, and treatments to answer clinician inquiries.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[85%] ${
                    m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div
                    className={`rounded-lg p-2 text-xs flex h-8 w-8 items-center justify-center shrink-0 ${
                      m.sender === 'user' ? 'bg-[#0B63CE]/15 text-[#0B63CE]' : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {m.sender === 'user' ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`rounded-xl px-4 py-3 shadow-sm border ${
                        m.sender === 'user'
                          ? 'bg-[#0B63CE] text-white border-blue-600'
                          : 'bg-white text-[#0E1116] border-gray-150'
                      }`}
                    >
                      {renderMessageContent(m.text)}
                    </div>
                    <span className="text-[9px] text-gray-400 font-semibold block px-1">
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              
              {sendChatMutation.isPending && (
                <div className="flex gap-3 max-w-[80%] mr-auto items-center">
                  <div className="rounded-lg p-2 text-xs flex h-8 w-8 items-center justify-center bg-purple-100 text-purple-700 shrink-0">
                    <Bot className="h-4.5 w-4.5 animate-spin" />
                  </div>
                  <div className="bg-white border border-gray-150 rounded-xl px-4 py-3 text-xs text-gray-500 font-semibold shadow-sm flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Form Bar */}
        <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-3 bg-white flex gap-2">
          <input
            type="text"
            disabled={!selectedPatientId || sendChatMutation.isPending}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              selectedPatientId
                ? 'Ask about treatment started dates, pathology classifications, staging...'
                : 'Select patient to activate chat input...'
            }
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-xs focus:border-[#0B63CE] focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 font-medium"
          />
          <Button
            type="submit"
            disabled={!selectedPatientId || sendChatMutation.isPending || !inputText.trim()}
            className="h-10 w-10 p-0 flex items-center justify-center rounded-lg"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
