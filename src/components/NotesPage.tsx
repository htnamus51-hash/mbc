import { useState, useEffect } from 'react';
import { Trash2, FileText, Calendar, CheckCircle2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { apiUrl } from '@/config';

export function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/notes'));
      if (!res.ok) {
        console.error('Failed to fetch notes');
        setNotes([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setNotes(data);
      console.log('Notes fetched:', data);
    } catch (err) {
      console.error('Error fetching notes', err);
      setNotes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();

    const createdHandler = () => fetchNotes();
    const updatedHandler = () => fetchNotes();
    const deletedHandler = () => fetchNotes();
    
    window.addEventListener('note:created', createdHandler as EventListener);
    window.addEventListener('note:updated', updatedHandler as EventListener);
    window.addEventListener('note:deleted', deletedHandler as EventListener);
    
    return () => {
      window.removeEventListener('note:created', createdHandler as EventListener);
      window.removeEventListener('note:updated', updatedHandler as EventListener);
      window.removeEventListener('note:deleted', deletedHandler as EventListener);
    };
  }, []);

  const deleteNote = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      const res = await fetch(apiUrl(`/api/notes/${noteId}`), {
        method: 'DELETE',
      });

      if (!res.ok) {
        alert('Failed to delete note');
        return;
      }

      setNotes(notes.filter((note) => note.id !== noteId));
      alert('Note deleted successfully');
    } catch (err) {
      console.error('Error deleting note', err);
      alert('Error deleting note');
    }
  };

  const getNoteTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Progress Note': 'bg-blue-50 border-blue-200 text-blue-700',
      'Intake Form': 'bg-green-50 border-green-200 text-green-700',
      'Session Summary': 'bg-purple-50 border-purple-200 text-purple-700',
      'Treatment Plan': 'bg-orange-50 border-orange-200 text-orange-700',
      'Assessment': 'bg-red-50 border-red-200 text-red-700',
    };
    return colors[type] || 'bg-slate-50 border-slate-200 text-slate-700';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const categorizeNotes = () => {
    const today = '2025-11-20';
    const tomorrow = '2025-11-21';
    
    const today_notes: any[] = [];
    const tomorrow_notes: any[] = [];
    const done_notes: any[] = [];
    const missed_notes: any[] = [];
    
    const currentTime = '15:34';
    
    notes.forEach((note) => {
      // Completed notes go to Done
      if (note.completed) {
        done_notes.push(note);
      }
      // Notes without reminder date/time are treated as notes without reminders
      else if (!note.reminder_date || !note.reminder_time) {
        today_notes.push(note);
      }
      // Check if reminder is in the past (missed)
      else if (note.reminder_date < today || (note.reminder_date === today && note.reminder_time < currentTime)) {
        missed_notes.push(note);
      }
      // Today's reminders
      else if (note.reminder_date === today) {
        today_notes.push(note);
      }
      // Tomorrow's reminders
      else if (note.reminder_date === tomorrow) {
        tomorrow_notes.push(note);
      }
      // Future reminders (beyond tomorrow)
      else if (note.reminder_date > tomorrow) {
        tomorrow_notes.push(note);
      }
    });
    
    return { today_notes, tomorrow_notes, done_notes, missed_notes };
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-slate-900 text-2xl font-bold">Notes</h1>
        <p className="text-slate-600 mt-1">View and manage all clinical notes</p>
      </div>

      {loading ? (
        <p className="text-slate-600">Loading notes...</p>
      ) : notes.length === 0 ? (
        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No notes yet. Create one from the Dashboard!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(() => {
            const { today_notes, tomorrow_notes, done_notes, missed_notes } = categorizeNotes();
            
            const CategorySection = ({ title, notes: sectionNotes, color, emptyMessage }: any) => (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className={`text-lg font-semibold ${color}`}>{title}</h2>
                  <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">{sectionNotes.length}</span>
                </div>
                {sectionNotes.length === 0 ? (
                  <p className="text-sm text-slate-400 ml-4">{emptyMessage}</p>
                ) : (
                  <div className="space-y-2 ml-2">
                    {sectionNotes.map((note: any) => (
                      <Card 
                        key={note.id} 
                        className={`border-slate-200 rounded-xl hover:shadow-sm transition-all ${
                          note.completed ? 'bg-emerald-50 border-emerald-200' : ''
                        }`}
                      >
                        <CardContent className={`p-4 ${note.completed ? 'opacity-70' : ''}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`text-xs ${getNoteTypeColor(note.note_type)}`}>
                                  {note.note_type}
                                </Badge>
                                {note.reminder_date && (
                                  <span className="text-xs text-slate-500">{note.reminder_date} @ {note.reminder_time}</span>
                                )}
                              </div>
                              <p className={`text-sm ${note.completed ? 'line-through text-slate-500' : 'text-slate-700'} line-clamp-2`}>{note.content}</p>
                              <p className="text-xs text-slate-400 mt-1">by {note.created_by}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {!note.completed ? (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    try {
                                      const res = await fetch(apiUrl(`/api/notes/${note.id}/complete`), {
                                        method: 'PATCH',
                                      });
                                      if (res.ok) {
                                        window.dispatchEvent(new CustomEvent('note:updated', { detail: { id: note.id, completed: true } }));
                                      }
                                    } catch (err) {
                                      console.error('Error completing note', err);
                                    }
                                  }}
                                  className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                  title="Mark as done"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              ) : null}
                              <button
                                onClick={() => deleteNote(note.id)}
                                className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="Delete"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );

            return (
              <>
                <CategorySection 
                  title="📌 Today" 
                  notes={today_notes}
                  color="text-cyan-700"
                  emptyMessage="No reminders for today"
                />
                <CategorySection 
                  title="📅 Tomorrow & Later" 
                  notes={tomorrow_notes}
                  color="text-blue-700"
                  emptyMessage="No upcoming reminders"
                />
                {missed_notes.length > 0 && (
                  <CategorySection 
                    title="⏰ Missed" 
                    notes={missed_notes}
                    color="text-amber-700"
                    emptyMessage="No missed reminders"
                  />
                )}
                {done_notes.length > 0 && (
                  <CategorySection 
                    title="✅ Done" 
                    notes={done_notes}
                    color="text-emerald-700"
                    emptyMessage="No completed notes"
                  />
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
