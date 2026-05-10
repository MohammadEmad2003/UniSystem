import { useState, useEffect } from "react";
import { Plus, X, MapPin, Users, Building2, Trash2, Edit2, Search } from "lucide-react";
import { apiClient } from "../../services/apiClient";

interface Room {
  room_id: string;
  room_name: string;
  capacity: number;
  type: string;
  location: string;
}

export default function ManageRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Room>({
    room_id: "",
    room_name: "",
    capacity: 30,
    type: "Lecture",
    location: "",
  });

  const fetchRooms = async () => {
    try {
      const res = await apiClient.get("/rooms");
      // Normalize keys to lowercase if backend returns PascalCase
      const normalized = res.data.data.map((r: any) => ({
        room_id: r.Room_ID || r.room_id,
        room_name: r.Room_Name || r.room_name,
        capacity: r.Capacity || r.capacity,
        type: r.Type || r.type,
        location: r.Location || r.location
      }));
      setRooms(normalized);
    } catch (err: any) {
      console.error("Failed to fetch rooms", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isEditing) {
        await apiClient.put(`/rooms/${form.room_id}`, form);
      } else {
        await apiClient.post("/rooms", form);
      }
      setShowModal(false);
      fetchRooms();
      setForm({ room_id: "", room_name: "", capacity: 30, type: "Lecture", location: "" });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;
    try {
      await apiClient.delete(`/rooms/${id}`);
      fetchRooms();
    } catch (err) {
      console.error("Failed to delete room", err);
    }
  };

  const handleEdit = (room: Room) => {
    setForm({ ...room });
    setIsEditing(true);
    setShowModal(true);
  };

  const filteredRooms = rooms.filter(r => 
    (r.room_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.room_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">ROOM MANAGEMENT</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage university halls, labs and lecture rooms.</p>
        </div>
        <button
          onClick={() => {
            setIsEditing(false);
            setForm({ room_id: "", room_name: "", capacity: 30, type: "Lecture", location: "" });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 px-6 py-3"
        >
          <Plus size={20} /> Add New Room
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white dark:bg-[#111111] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Search className="text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search by room name or ID..."
          className="bg-transparent border-none focus:ring-0 w-full text-slate-900 dark:text-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-[#00b8d4]/20 border-t-[#00b8d4] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <div key={room.room_id} className="group bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:shadow-2xl hover:shadow-[#00b8d4]/10 transition-all duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(room)} className="p-2 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(room.room_id)} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00b8d4]/20 to-transparent flex items-center justify-center text-[#00b8d4]">
                  <Building2 size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">{room.room_name}</h3>
                  <span className="text-xs font-black text-[#00b8d4] tracking-widest uppercase">{room.room_id}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <Users size={16} className="text-[#00b8d4]" />
                  <span>Capacity: <span className="font-bold text-slate-900 dark:text-white">{room.capacity} Students</span></span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <Building2 size={16} className="text-[#00b8d4]" />
                  <span>Type: <span className="badge bg-[#00b8d4]/10 text-[#00b8d4] text-[10px]">{room.type}</span></span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <MapPin size={16} className="text-[#00b8d4]" />
                  <span className="truncate">{room.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-[#00b8d4]/10 to-transparent">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                {isEditing ? "Edit Room" : "Add New Room"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-2">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-2xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Room ID</label>
                  <input
                    required
                    disabled={isEditing}
                    className="input-field disabled:opacity-50"
                    placeholder="e.g. H1-101"
                    value={form.room_id}
                    onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Room Name</label>
                  <input
                    required
                    className="input-field"
                    placeholder="e.g. Hall A"
                    value={form.room_name}
                    onChange={(e) => setForm({ ...form, room_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Capacity</label>
                  <input
                    required
                    type="number"
                    className="input-field"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Type</label>
                  <select
                    className="input-field"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="Lecture">Lecture Hall</option>
                    <option value="Section">Section Room</option>
                    <option value="Lab">Computer Lab</option>
                    <option value="Office">Office</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Location</label>
                <input
                  required
                  className="input-field"
                  placeholder="e.g. Building H1, Floor 2"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-widest shadow-xl shadow-[#00b8d4]/20 mt-4">
                {isEditing ? "Update Room Information" : "Create Room"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
