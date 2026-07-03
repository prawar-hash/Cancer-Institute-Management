/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import { usePatientsList, usePatientReports } from '../patients/patientApi.ts';
import { useReportSummary, useSendChatMessage } from './aiApi.ts';
import {
  Bot, User, Send, ShieldAlert, Sparkles, FileText,
  BrainCircuit, Search, X, MessageCircle, XCircle, Users, ChevronRight,
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

const EMPTY_FILTERS = { q: '', gender: '', status: '' };

export default function AiAssistantPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [summaryReportId, setSummaryReportId] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSize, setChatSize] = useState({ width: 360, height: 520 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeStateRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  // Queries
  const { data: patientData, isLoading: patientsLoading } = usePatientsList({
    page_size: 50,
    q: filters.q,
    gender: filters.gender,
    status: filters.status,
  });
  const { data: reports } = usePatientReports(Number(selectedPatientId) || 0);

  // Mutations
  const sendChatMutation = useSendChatMessage();
  const summarizeMutation = useReportSummary();

  const patientsList = patientData?.patients || [];
  const selectedPatient = patientsList.find((p: any) => p.id === Number(selectedPatientId));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

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

  // Resize handlers for the floating chat widget (drag from the top-left grip)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStateRef.current) return;
      const { startX, startY, startW, startH } = resizeStateRef.current;
      const deltaX = startX - e.clientX; // dragging left grows width (panel anchored bottom-right)
      const deltaY = startY - e.clientY; // dragging up grows height
      const nextWidth = Math.min(720, Math.max(300, startW + deltaX));
      const nextHeight = Math.min(Math.round(window.innerHeight * 0.85), Math.max(360, startH + deltaY));
      setChatSize({ width: nextWidth, height: nextHeight });
    };
    const handleMouseUp = () => {
      resizeStateRef.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: chatSize.width,
      startH: chatSize.height,
    };
  };

  const handleClearFilters = () => setFilters(EMPTY_FILTERS);

  const handleSelectPatient = (id: number) => {
    setSelectedPatientId((prev) => (prev === id ? '' : id));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error('Please select a patient to context-scope the AI assistant.');
      return;
    }
    if (!inputText.trim()) return;

    const userMsgText = inputText;
    const userMsgId = Math.random().toString();

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

      const assistantMsgId = Math.random().toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, sender: 'assistant', text: '', timestamp: new Date() },
      ]);

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

      const summaryMsgId = Math.random().toString();
      setMessages((prev) => [
        ...prev,
        { id: summaryMsgId, sender: 'assistant', text: '', timestamp: new Date() },
      ]);

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
    const disclaimerMarker = '[Warning:';
    const disclaimerIndex = text.indexOf(disclaimerMarker);

    if (disclaimerIndex !== -1) {
      const mainText = text.substring(0, disclaimerIndex).trim();
      const disclaimerText = text.substring(disclaimerIndex).replace('[', '').replace(']', '').trim();

      return (
        <div className="space-y-2">
          <div className="whitespace-pre-wrap leading-relaxed text-xs">{mainText}</div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-medium">{disclaimerText}</p>
          </div>
        </div>
      );
    }

    return <div className="whitespace-pre-wrap leading-relaxed text-xs">{text}</div>;
  };

  return (
    <div className="space-y-6 pb-4">
      {/* ---------------- Full width filter bar ---------------- */}
      <Card title="Patient Filters">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search by name or MRN"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm font-medium focus:border-[#0B63CE] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Gender
            </label>
            <select
              value={filters.gender}
              onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium focus:border-[#0B63CE] focus:outline-none"
            >
              <option value="">All Genders</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium focus:border-[#0B63CE] focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-[11px] font-semibold text-gray-400">
            {patientsLoading ? 'Loading patients…' : `${patientsList.length} patient${patientsList.length === 1 ? '' : 's'} found`}
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B63CE] hover:underline"
            >
              <XCircle className="h-3.5 w-3.5" /> Clear filters ({activeFilterCount})
            </button>
          )}
        </div>
      </Card>

      {/* ---------------- Patient list + reports ---------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Patients" className="h-full">
            {patientsLoading ? (
              <p className="text-xs text-gray-400 italic p-2">Loading patients…</p>
            ) : patientsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Users className="h-8 w-8 text-gray-300" />
                <p className="text-xs text-gray-400 max-w-xs">
                  No patients match these filters. Try adjusting your search or clearing filters.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {patientsList.map((p: any) => {
                  const isSelected = Number(selectedPatientId) === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => handleSelectPatient(p.id)}
                      className={`w-full flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                        isSelected
                          ? 'border-[#0B63CE] bg-[#0B63CE]/5'
                          : 'border-gray-150 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isSelected ? 'bg-[#0B63CE] text-white' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {p.first_name?.[0]}
                          {p.last_name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#0E1116]">
                            {p.first_name} {p.last_name}
                          </p>
                          <p className="truncate text-[10px] text-gray-400 font-mono">
                            MRN: {p.mrn || 'N/A'}
                            {p.gender ? ` · ${p.gender}` : ''}
                            {p.status ? ` · ${p.status}` : ''}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#0B63CE]' : 'text-gray-300'}`}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card title="Available Scans" className="h-full">
            {!selectedPatientId ? (
              <p className="text-xs text-gray-400 italic p-2">
                Select a patient to view their uploaded reports.
              </p>
            ) : !reports || reports.length === 0 ? (
              <p className="text-xs text-gray-400 italic p-2">No reports uploaded for this patient.</p>
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
        </div>
      </div>

      {/* ---------------- Floating corner chat widget ---------------- */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
        {chatOpen && (
          <div
            style={{ width: chatSize.width, height: chatSize.height }}
            className="relative mb-3 flex max-w-[92vw] max-h-[85vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
          >
            {/* Resize grip (drag to resize the widget) */}
            <div
              onMouseDown={handleResizeStart}
              title="Drag to resize"
              className="absolute -top-1 -left-1 z-10 h-5 w-5 cursor-nwse-resize rounded-br-md"
            >
              <svg viewBox="0 0 16 16" className="h-full w-full text-gray-300 hover:text-[#0B63CE] transition-colors">
                <circle cx="4" cy="12" r="1.3" fill="currentColor" />
                <circle cx="8" cy="12" r="1.3" fill="currentColor" />
                <circle cx="12" cy="12" r="1.3" fill="currentColor" />
                <circle cx="8" cy="8" r="1.3" fill="currentColor" />
                <circle cx="12" cy="8" r="1.3" fill="currentColor" />
                <circle cx="12" cy="4" r="1.3" fill="currentColor" />
              </svg>
            </div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/50 px-3.5 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="rounded-lg bg-[#0B63CE]/10 p-1.5 text-[#0B63CE] shrink-0">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#0E1116]">Clinical AI Co-Pilot</h4>
                  <p className="truncate text-[9px] text-gray-400 font-semibold">
                    {selectedPatient
                      ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
                      : 'No patient selected'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
              {!selectedPatientId ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
                  <Bot className="h-8 w-8 text-gray-300" />
                  <p className="text-[11px] text-gray-400 max-w-[220px] leading-relaxed">
                    Select a patient from the list to load their chart and start a consultation.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex gap-2 max-w-[92%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <div
                        className={`rounded-lg p-1.5 flex h-6 w-6 items-center justify-center shrink-0 ${
                          m.sender === 'user' ? 'bg-[#0B63CE]/15 text-[#0B63CE]' : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {m.sender === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div
                          className={`rounded-xl px-3 py-2 shadow-sm border ${
                            m.sender === 'user'
                              ? 'bg-[#0B63CE] text-white border-blue-600'
                              : 'bg-white text-[#0E1116] border-gray-150'
                          }`}
                        >
                          {renderMessageContent(m.text)}
                        </div>
                        <span className="text-[8px] text-gray-400 font-semibold block px-1">
                          {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}

                  {sendChatMutation.isPending && (
                    <div className="flex gap-2 max-w-[80%] mr-auto items-center">
                      <div className="rounded-lg p-1.5 flex h-6 w-6 items-center justify-center bg-purple-100 text-purple-700 shrink-0">
                        <Bot className="h-3.5 w-3.5 animate-spin" />
                      </div>
                      <div className="bg-white border border-gray-150 rounded-xl px-3 py-2 text-[10px] text-gray-500 font-semibold shadow-sm flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-2.5 bg-white flex gap-2">
              <input
                type="text"
                disabled={!selectedPatientId || sendChatMutation.isPending}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={selectedPatientId ? 'Ask about this patient…' : 'Select a patient first…'}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-[11px] focus:border-[#0B63CE] focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 font-medium"
              />
              <Button
                type="submit"
                disabled={!selectedPatientId || sendChatMutation.isPending || !inputText.trim()}
                className="h-8 w-8 p-0 flex items-center justify-center rounded-lg shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        )}

        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setChatOpen((o) => !o)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0B63CE] text-white shadow-xl hover:bg-[#0a58b8] transition-colors relative"
        >
          {chatOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          {!chatOpen && selectedPatientId && (
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white" />
          )}
        </button>
      </div>
    </div>
  );
}