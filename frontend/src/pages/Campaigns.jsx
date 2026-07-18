import React, { useEffect, useState, useRef } from 'react';
import { Send, Terminal, Megaphone, CheckCircle2, AlertCircle, History } from 'lucide-react';
import { request, timeAgo } from '../lib/api';
import Toast from '../components/Toast';
import { PageHeader, SectionCard, useScrollReveal } from '../components/UI';

export default function Campaigns() {
  useScrollReveal();
  const [bloodGroup, setBloodGroup] = useState('all');
  const [message, setMessage] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sending, setSending] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState([
    { text: 'Gateway console initialized. Ready to broadcast.', type: 'info' }
  ]);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  
  const consoleEndRef = useRef(null);

  const loadHistory = async () => {
    try {
      const res = await request('/api/campaigns/index.php');
      setCampaigns(res.data || []);
      const logsRes = await request('/api/campaigns/index.php?logs=1');
      setLogs(logsRes.data || []);
    } catch (err) {
      setToast({ message: 'Failed to load campaign history.', type: 'error' });
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleOutput]);

  const addConsoleLine = (text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput((prev) => [...prev, { text: `[${timestamp}] ${text}`, type }]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    setConsoleOutput([]);
    addConsoleLine(`Starting SMS Broadcast Campaign for group: "${bloodGroup.toUpperCase()}"`, 'info');
    
    try {
      const res = await request('/api/campaigns/index.php', {
        method: 'POST',
        body: { blood_group: bloodGroup, message },
      });
      
      const campaign = res.data;
      addConsoleLine(`Campaign registered in DB. ID: ${campaign.campaign_id}`, 'info');
      addConsoleLine(`Found ${campaign.recipients_count} target donors. Dispatching SMS queue...`, 'info');

      // Fetch logs specifically for this campaign to simulate transmission
      const logRes = await request(`/api/campaigns/index.php?logs=1&campaign_id=${campaign.campaign_id}`);
      const smsList = logRes.data || [];

      if (smsList.length === 0) {
        addConsoleLine('No eligible recipients found matching criteria.', 'warn');
        setSending(false);
        loadHistory();
        return;
      }

      // Simulate sending logs line by line
      let index = 0;
      const interval = setInterval(() => {
        if (index < smsList.length) {
          const sms = smsList[index];
          const logText = `SMS to ${sms.recipient_name} (${sms.phone_number}) -> STATUS: ${sms.status.toUpperCase()}`;
          addConsoleLine(logText, sms.status === 'sent' ? 'success' : 'error');
          index++;
        } else {
          clearInterval(interval);
          addConsoleLine(`Broadcast finished. Sent successfully: ${campaign.success_count}/${campaign.recipients_count}`, 'success');
          setToast({ message: 'Campaign completed successfully.', type: 'success' });
          setMessage('');
          setSending(false);
          loadHistory();
        }
      }, 400); // 400ms delay per SMS log for simulation effect

    } catch (err) {
      addConsoleLine(`CRITICAL ERROR: ${err.message}`, 'error');
      setToast({ message: err.message || 'Campaign execution failed.', type: 'error' });
      setSending(false);
    }
  };

  return (
    <div className="space-y-5 page-stagger">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />
      <PageHeader icon={Megaphone} title="SMS Campaigns" subtitle="Broadcast alert messages and emergency requests to donors" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Send Campaign Card */}
        <SectionCard title="Send Broadcast Alert" action={<span className="badge-brand animate-pulse-soft">SMS Gateway Active</span>}>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Target Blood Group</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white text-slate-800 text-sm focus:ring-brand-500 focus:border-brand-500"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                disabled={sending}
              >
                <option value="all">All Groups (Broadcast to Everyone)</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Message Content</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white text-slate-800 text-sm focus:ring-brand-500 focus:border-brand-500"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter alert message (e.g. Urgent! O- Negative blood required immediately at City Hospital. Please visit the nearest collection site.)"
                required
                disabled={sending}
              />
              <p className="text-[10px] text-slate-400 mt-1">This message will be dispatched dynamically to all active, eligible donors of the selected blood type.</p>
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-75"
              disabled={sending || !message.trim()}
            >
              <Send size={16} />
              {sending ? 'Broadcasting...' : 'Send SMS Broadcast'}
            </button>
          </form>
        </SectionCard>

        {/* Live Simulator Console */}
        <SectionCard title="Gateway Simulator Console" icon={Terminal} action={<span className="badge-neutral">System Log</span>}>
          <div className="bg-slate-900 rounded-2xl p-4 font-mono text-xs text-slate-200 h-[270px] overflow-y-auto flex flex-col gap-1.5 shadow-inner border border-slate-800">
            {consoleOutput.map((line, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-slate-500 shrink-0">&gt;</span>
                <span
                  className={
                    line.type === 'success' ? 'text-emerald-400' :
                    line.type === 'error' ? 'text-red-400 font-semibold' :
                    line.type === 'warn' ? 'text-amber-400' : 'text-slate-300'
                  }
                >
                  {line.text}
                </span>
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
        </SectionCard>
      </div>

      {/* History Card */}
      <SectionCard title="Campaign History" icon={History}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Campaign ID</th>
                <th className="py-3 px-4">Target Blood Group</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-4 text-center">Recipients</th>
                <th className="py-3 px-4 text-right">Date Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/55 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-900">#CAM-{c.id}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${c.blood_group === 'all' ? 'bg-slate-100 text-slate-700' : 'bg-rose-50 text-brand-700'}`}>
                      {c.blood_group === 'all' ? 'All Groups' : c.blood_group}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={c.message}>{c.message}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">{c.recipients_count}</td>
                  <td className="py-3.5 px-4 text-right text-slate-500">{timeAgo(c.created_at)}</td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">No campaign logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
