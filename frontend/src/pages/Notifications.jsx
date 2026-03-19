import React, { useEffect, useState } from 'react';
import { request, timeAgo } from '../lib/api';
import { useAuth } from '../components/AuthProvider';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

export default function Notifications() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [filterUnread, setFilterUnread] = useState(false);
  const [compose, setCompose] = useState({ title: '', message: '', type: 'info', user_id: '' });
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const load = async (unread = filterUnread) => {
    try {
      await request('/api/notifications/auto.php');
    } catch (err) {
      // Ignore auto notification errors to avoid blocking UI
    }
    const res = await request(`/api/notifications/index.php?unread=${unread ? '1' : '0'}`);
    setRows(res.data || []);
  };

  useEffect(() => {
    load();
    const id = setInterval(() => load(filterUnread), 10000);
    return () => clearInterval(id);
  }, [filterUnread]);

  const markRead = async (id) => {
    try {
      await request(`/api/notifications/index.php?id=${id}`, { method: 'PATCH' });
      setToast({ message: 'Notification marked as read.', type: 'success' });
      load(filterUnread);
    } catch (err) {
      setToast({ message: err.message || 'Unable to update notification. Please try again.', type: 'error' });
    }
  };

  const remove = async (id) => {
    try {
      await request(`/api/notifications/index.php?id=${id}`, { method: 'DELETE' });
      setToast({ message: 'Notification removed successfully.', type: 'success' });
      load(filterUnread);
    } catch (err) {
      setToast({ message: err.message || 'Unable to remove notification. Please try again.', type: 'error' });
    }
  };

  const send = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await request('/api/notifications/index.php', {
        method: 'POST',
        body: {
          title: compose.title,
          message: compose.message,
          type: compose.type,
          user_id: compose.user_id ? Number(compose.user_id) : null,
        },
      });
      setCompose({ title: '', message: '', type: 'info', user_id: '' });
      setOpen(false);
      load(filterUnread);
      setToast({ message: 'Notification sent successfully.', type: 'success' });
    } catch (err) {
      setError(err.message || 'Unable to send notification. Please try again.');
      setToast({ message: err.message || 'Unable to send notification. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      <Toast message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: 'info' })} />
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-900">Notifications</h3>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={filterUnread}
              onChange={(e) => setFilterUnread(e.target.checked)}
              className="h-4 w-4"
            />
            Unread only
          </label>
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          onClick={() => setOpen(true)}
        >
          New Notification
        </button>
      </div>

      <div className="card p-4 divide-y divide-slate-100">
        {rows.map((n) => (
          <div key={n.id} className="py-3 flex items-start gap-3">
            <div className={`mt-1 h-2 w-2 rounded-full ${n.is_read ? 'bg-slate-300' : 'bg-blue-500'}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">{n.title}</div>
                <div className="text-xs text-slate-500">{timeAgo(n.created_at)}</div>
              </div>
              <div className="text-sm text-slate-600">{n.message}</div>
              <div className="text-xs text-slate-500 mt-1">Type: {n.type}</div>
            </div>
            <div className="flex flex-col gap-2">
              {!n.is_read && (
                <button className="text-blue-600 text-xs" onClick={() => markRead(n.id)}>
                  Mark read
                </button>
              )}
              <button className="text-red-600 text-xs" onClick={() => remove(n.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-slate-500 py-3">No notifications</div>}
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setError('');
          setCompose({ title: '', message: '', type: 'info', user_id: '' });
        }}
        title="Broadcast / Notify"
      >
        <p className="text-sm text-slate-500 mb-3">Send a quick notice to everyone or a specific user ID.</p>
        <form className="space-y-3" onSubmit={send}>
          <div>
            <label className="text-sm text-slate-600">Title</label>
            <input
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              value={compose.title}
              onChange={(e) => setCompose({ ...compose, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">Message</label>
            <textarea
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              rows={3}
              value={compose.message}
              onChange={(e) => setCompose({ ...compose, message: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">Type</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={compose.type}
                onChange={(e) => setCompose({ ...compose, type: e.target.value })}
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="danger">Danger</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600">Target User ID (optional)</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                value={compose.user_id}
                onChange={(e) => setCompose({ ...compose, user_id: e.target.value })}
                placeholder="Blank = broadcast"
              />
            </div>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm"
              onClick={() => {
                setOpen(false);
                setCompose({ title: '', message: '', type: 'info', user_id: '' });
                setError('');
              }}
            >
              Cancel
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm" type="submit">
              Send Notification
            </button>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Logged in as {user?.username || 'user'} - Only users with notification permission can send.
          </div>
        </form>
      </Modal>
    </div>
  );
}
