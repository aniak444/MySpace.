import { useState, useEffect, useRef } from 'react';
import { WorldMap } from "react-svg-worldmap";
import './App.css';
import { COUNTRIES } from './countries';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`http://localhost:3000${url}`, {
      ...options,
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      window.dispatchEvent(new Event("auth:logout"));
      return null;
    }
    return response;
  } catch (err) {
    console.error("Błąd połączenia:", err);
    return null;
  }
};

function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/login' : '/register';
    
    try {
      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (isLogin) { 
          toast.success("Witaj ponownie!");
          onLogin(data.token, data.role);
        } else {
          toast.success("Rejestracja udana! Teraz możesz się zalogować.");
          setIsLogin(true);
        }
      } else {
        toast.error(data.error || "Wystąpił błąd");
      }
    } catch (err) {
      toast.error("Nie udało się połączyć z serwerem.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">{isLogin ? 'Witaj w My Space.' : 'Stwórz konto'}</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input className="auth-input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="auth-input" type="password" placeholder="Hasło" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="auth-btn" type="submit">{isLogin ? 'Zaloguj się' : 'Zarejestruj się'}</button>
        </form>
        <p className="auth-switch" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Nie masz konta? Zarejestruj się.' : 'Masz już konto? Zaloguj się.'}
        </p>
      </div>
    </div>
  );
}

// --- ADMIN PANEL ---
function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiFetch('/admin/users').then(r => r?.ok && r.json().then(setUsers));
    apiFetch('/admin/stats').then(r => r?.ok && r.json().then(setStats));
  }, []);

  const deleteUser = async (id) => {
    if (!window.confirm("Usunąć użytkownika i jego dane?")) return;
    const res = await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
    if (res?.ok) { 
      setUsers(users.filter(u => u.id !== id)); 
      toast.success("Usunięto użytkownika."); 
      apiFetch('/admin/stats').then(r => r?.ok && r.json().then(setStats));
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header" style={{marginBottom: '30px'}}>
        <h2 style={{marginBottom: '20px'}}>STATYSTKI STRONY</h2>
        
        {stats && (
          <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
            <div className="stat-card" style={{flex: 1, background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: 'center'}}>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#6366f1'}}>{stats.users}</div>
              <div style={{color: '#6b7280', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px'}}>Użytkowników</div>
            </div>
            
            <div className="stat-card" style={{flex: 1, background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: 'center'}}>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#10b981'}}>{stats.tasks}</div>
              <div style={{color: '#6b7280', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px'}}>Zadań</div>
            </div>

            <div className="stat-card" style={{flex: 1, background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: 'center'}}>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#f59e0b'}}>{stats.habits}</div>
              <div style={{color: '#6b7280', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px'}}>Nawyków</div>
            </div>

            <div className="stat-card" style={{flex: 1, background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: 'center'}}>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#ec4899'}}>{stats.map}</div>
              <div style={{color: '#6b7280', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px'}}>Podróży</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Lista Użytkowników</h3>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Email</th><th>Rola</th><th>Dołączył</th><th>Akcja</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td><strong>{u.email}</strong></td>
                  <td>
                    {u.role === 'ADMIN' 
                      ? <span style={{background:'#FEF3C7', color:'#D97706', padding:'4px 8px', borderRadius:'6px', fontSize:'12px', fontWeight:'bold'}}>ADMIN</span> 
                      : <span style={{background:'#E0E7FF', color:'#4338CA', padding:'4px 8px', borderRadius:'6px', fontSize:'12px', fontWeight:'bold'}}>USER</span>}
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    {u.role !== 'ADMIN' && (
                      <button className="btn-delete-user" onClick={() => deleteUser(u.id)}>
                        USUŃ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- FOCUS TIMER ---
function FocusTimer() {
  const [mode, setMode] = useState('work'); 
  const [timeLeft, setTimeLeft] = useState(25*60);
  const [isActive, setIsActive] = useState(false);
  
  const endTimeRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const toggleTimer = () => {
    if (!isActive) {
      endTimeRef.current = Date.now() + (timeLeft * 1000);
    }
    setIsActive(!isActive);
  };

  useEffect(() => {
    let interval = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        const now = Date.now();
        const distance = endTimeRef.current - now;
        const secondsRemaining = Math.ceil(distance / 1000);

        if (secondsRemaining <= 0) {
          setTimeLeft(0);
          setIsActive(false);
          clearInterval(interval);
          
          const audio = new Audio('/bell.wav');
          audio.play().catch(e => console.log(e));

          setTimeout(() => {
            if (window.confirm(mode === 'work' ? "Koniec pracy! 🔔 Przerwa?" : "Koniec przerwy! ⏰ Praca?")) {
              const nextMode = mode === 'work' ? 'break' : 'work';
              const nextTime = nextMode === 'work' ? 25 * 60 : 5 * 60;
              setMode(nextMode);
              setTimeLeft(nextTime);
              endTimeRef.current = Date.now() + (nextTime * 1000);
              setIsActive(true);
            } else {
              const nextMode = mode === 'work' ? 'break' : 'work';
              setMode(nextMode);
              setTimeLeft(nextMode === 'work' ? 25 * 60 : 5 * 60);
            }
          }, 100);

        } else {
          setTimeLeft(secondsRemaining);
        }
      }, 200);
    }

    return () => clearInterval(interval);
  }, [isActive, mode]);

  const toggleMode = () => {
    setIsActive(false);
    if (mode === 'work') { setMode('break'); setTimeLeft(5 * 60); }
    else { setMode('work'); setTimeLeft(25 * 60); }
  };

  const totalTime = mode === 'work' ? 25 * 60 : 5 * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  return (
    <div className={`focus-container ${mode}`}>
      <div className="focus-header">
        <h2 className="focus-title">{mode === 'work' ? 'GŁĘBOKA PRACA' : 'CHWILA ODDECHU'}</h2>
        <p className="focus-subtitle">{mode === 'work' ? 'Wyłącz powiadomienia.' : 'Wstań, rozciągnij się.'}</p>
      </div>
      <div className="timer-wrapper">
        <div className="timer-display">{formatTime(timeLeft)}</div>
        <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
      <div className="focus-controls">
        <button className="btn-focus-main" onClick={toggleTimer}>{isActive ? 'PAUZA' : 'START'}</button>
        <button className="btn-focus-secondary" onClick={toggleMode}>{mode === 'work' ? 'Idź na przerwę ☕' : 'Wróć do pracy 💻'}</button>
      </div>
    </div>
  );
}

// --- DASHBOARD ---
function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [mapData, setMapData] = useState([]);
  
  const [newTask, setNewTask] = useState("");
  const [priority, setPriority] = useState("LOW");
  const [deadline, setDeadline] = useState("");
  const [newHabit, setNewHabit] = useState("");
  const [inspiration, setInspiration] = useState(null);

  const [selectedCountry, setSelectedCountry] = useState("PL");
  const [countryStatus, setCountryStatus] = useState("VISITED");

  const fetchData = async () => {
    const tRes = await apiFetch('/tasks');
    const hRes = await apiFetch('/habits');
    const mRes = await apiFetch('/map'); 

    if (!tRes || !hRes || !tRes.ok || !hRes.ok) return;

    setTasks(await tRes.json());
    setHabits(await hRes.json());
    
    if (mRes && mRes.ok) {
      const rawData = await mRes.json();
      const formatted = rawData.map(item => ({
        country: item.countryCode.toLowerCase(),
        value: item.status === 'VISITED' ? 1 : 2
      }));
      setMapData(formatted);
    }
  };

  useEffect(() => {
    fetchData();
    const year = new Date().getFullYear();
    apiFetch(`/vision/${year}`).then(res => {
      if (res && res.ok) res.json().then(d => {
         if (d.images?.length) setInspiration(d.images[Math.floor(Math.random() * d.images.length)]);
      });
    });
  }, []);

  const addTask = async () => {
    if (!newTask) return;
    await apiFetch('/tasks', { method: 'POST', body: JSON.stringify({ title: newTask, priority, deadline }) });
    setNewTask(""); setPriority("LOW"); setDeadline(""); fetchData();
  };

  const toggleTask = async (t) => {
    setTasks(tasks.map(x => x.id === t.id ? { ...x, isCompleted: true } : x));
    setTimeout(async () => {
       await apiFetch(`/tasks/${t.id}`, { method: 'DELETE' });
       fetchData();
    }, 3000);
  };

  const addHabit = async () => {
    if (!newHabit) return;
    await apiFetch('/habits', { method: 'POST', body: JSON.stringify({ name: newHabit }) });
    setNewHabit(""); fetchData();
  };

  const toggleHabit = async (habit) => {
    const isDone = habit.completedToday;
    setHabits(habits.map(h => h.id === habit.id ? { ...h, completedToday: !isDone, streak: isDone ? h.streak-1 : h.streak+1 } : h));
    await apiFetch(`/habits/${habit.id}/toggle`, { method: 'POST' });
  };

  const updateMap = async () => {
    await apiFetch('/map', { method: 'POST', body: JSON.stringify({ countryCode: selectedCountry, status: countryStatus }) });
    fetchData();
  };

  const deleteMapEntry = async () => {
    if(!window.confirm(`Czy na pewno chcesz usunąć ten kraj z mapy?`)) return;
    await apiFetch(`/map/${selectedCountry}`, { method: 'DELETE' });
    fetchData();
  };

  const getStyle = ({ countryValue }) => {
    if (countryValue === 1) return { fill: "#A5B68D", stroke: "white" }; 
    if (countryValue === 2) return { fill: "#f6fc84", stroke: "white" }; 
    return { fill: "#E5E7EB", stroke: "white" };
  };

  const renderPriority = (p) => {
    if (p === 'HIGH') return <span className="priority-badge priority-high">🔴pilne</span>;
    if (p === 'MEDIUM') return <span className="priority-badge priority-medium">🟡średni</span>;
    return <span className="priority-badge priority-low">🟢niski</span>;
  };

  const isSelectedCountryOnMap = mapData.some(item => item.country === selectedCountry.toLowerCase());

  return (
    <div className="dashboard-grid">
      {inspiration && (
        <div className="card inspiration-card" style={{ backgroundImage: `url(${inspiration.imageUrl})` }}>
          <div className="inspiration-overlay"><h3>Vision Board</h3></div>
        </div>
      )}

      <div className="card">
        <h2>To Do List</h2>
        <div className="add-task-form" style={{display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px', background: '#FAFAF9', padding: '15px', borderRadius: '15px'}}>
           <div>
            <label className="input-label">TREŚĆ ZADANIA</label>
            <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Zadanie..." className="auth-input" style={{margin:0, background: 'white'}} />
            </div>
           <div style={{display: 'flex', gap: '15px'}}>
              <div style={{flex: 1}}>
                <label className="input-label">PRIORYTET</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} style={{width: '100%'}}>
                  <option value="LOW">🟢 Niski</option>
                  <option value="MEDIUM">🟡 Średni</option>
                  <option value="HIGH">🔴 Pilne</option>
                  </select>
                  </div>
              <div style={{flex: 1}}>
                <label className="input-label">DEADLINE</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid #E7E5E4', outline: 'none', color: '#57534E'}} />
                </div>
              <div style={{display: 'flex', alignItems: 'flex-end'}}>
                <button className="btn-add" onClick={addTask} style={{height: '42px', width: '42px', borderRadius: '12px', fontSize: '20px'}}>+</button>
                </div>
           </div>
        </div>
        <ul>
          {tasks.sort((a,b) => Number(a.isCompleted) - Number(b.isCompleted)).map(task => (
            <li key={task.id} className={`task-item ${task.isCompleted ? 'completed' : ''}`} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                 <div className={`circle ${task.isCompleted ? 'checked' : ''}`} onClick={() => toggleTask(task)}>{task.isCompleted && '✓'}</div>
                 <div>
                    <span onClick={() => toggleTask(task)} style={{fontWeight: '500'}}>{task.title}</span>
                    <div style={{marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px'}}>{renderPriority(task.priority)}{task.deadline && <span className="task-date">📅 {new Date(task.deadline).toLocaleDateString()}</span>}</div>
                 </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Habits</h2>
        <div style={{marginBottom: '20px'}}>
          <label className="input-label">NOWY NAWYK</label>
          <div className="input-group">
            <input value={newHabit} onChange={e => setNewHabit(e.target.value)} placeholder="Nawyk..." />
          <button className="btn-add" onClick={addHabit}>+</button>
          </div>
          </div>
        {habits.map(habit => (
          <div key={habit.id} className={`habit-item ${habit.completedToday ? 'done-today' : ''}`}>
            <div>
              <strong>{habit.name}</strong>
              <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>Seria: {habit.streak} dni 🔥</div>
              </div>
            <button className={`habit-btn ${habit.completedToday ? 'active' : ''}`} onClick={() => toggleHabit(habit)}>✓</button>
          </div>
        ))}
      </div>

      <div className="card" style={{gridColumn: 'span 2'}}>
        <h2>WORLD MAP 🌎</h2>
        <div style={{display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap'}}>
          <div style={{flex: 1, minWidth: '300px'}}>
             <WorldMap color="red" size="responsive" data={mapData} styleFunction={getStyle} />
          </div>
          
          <div className="map-controls" style={{width: '250px', background: '#FAFAF9', padding: '20px', borderRadius: '15px'}}>
             <div style={{marginBottom: '15px'}}>
               <label className="input-label">WYBIERZ KRAJ</label>
               <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} style={{width: '100%'}}>
                 {COUNTRIES.map(c => (<option key={c.code} value={c.code}>{c.name}</option>))}
               </select>
             </div>
             
             {isSelectedCountryOnMap ? (
               <>
                  <div style={{marginBottom: '10px', fontSize: '13px', textAlign: 'center', color: '#ef4444', fontWeight: 'bold'}}>
                    Ten kraj jest już dodany na mapie. Chcesz go usunąć?
                  </div>
                  <button className="btn-add btn-delete-map" style={{width: '80%', borderRadius: '50px', padding: '12px', margin: '0 auto', display: 'flex'}} onClick={deleteMapEntry}>
                    -
                  </button>
               </>
             ) : (
               <>
                 <div style={{marginBottom: '20px'}}>
                   <label className="input-label">STATUS PODRÓŻY</label>
                   <select value={countryStatus} onChange={e => setCountryStatus(e.target.value)} style={{width: '100%'}}>
                     <option value="VISITED">✔️ Odwiedzone</option>
                     <option value="PLANNED">✈️ Planowane</option>
                   </select>
                 </div>
                 <button className="btn-add" style={{width: '80%', borderRadius: '50px', padding: '12px', margin: '0 auto', display: 'flex'}} onClick={updateMap}>
                   +
                 </button>
               </>
             )}

          </div>
        </div>
      </div>
    </div>
  );
}

// --- JOURNAL ---
function Journal() {
  const [entries, setEntries] = useState([]);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("calm");
  
  const moods = [
    { id: 'happy', icon: '😁', label: 'Happy' }, { id: 'excited', icon: '🥳', label: 'Excited' },
    { id: 'tired', icon: '😴', label: 'Tired' }, { id: 'sad', icon: '😭', label: 'Sad' },
    { id: 'productive', icon: '🤓', label: 'Productive' },
  ];

  useEffect(() => {
    apiFetch('/journal').then(res => { if (res && res.ok) res.json().then(setEntries); });
  }, []);

  const addEntry = async () => {
    if (!content) return;
    const res = await apiFetch('/journal', { method: 'POST', body: JSON.stringify({ content, mood }) });
    if (res && res.ok) { setEntries([await res.json(), ...entries]); setContent(""); }
  };

  const deleteEntry = async (id) => {
    setEntries(entries.filter(e => e.id !== id));
    await apiFetch(`/journal/${id}`, { method: 'DELETE' });
  };

  return (
    <div className="journal-layout">
      <div className="journal-sidebar">
        <div className="card sticky-card">
          <h2>Nowa myśl</h2>
          <div className="mood-selector">
            {moods.map(m => (<button key={m.id} onClick={() => setMood(m.id)} className={`mood-btn ${mood === m.id ? 'active' : ''}`}>{m.icon}</button>))}
          </div>
          <textarea placeholder="Jak się dziś czujesz?..." value={content} onChange={e => setContent(e.target.value)} rows="6"></textarea>
          <button className="btn-save" onClick={addEntry}>Zapisz w notatniku</button>
        </div>
      </div>
      <div className="journal-feed">
        <h2 style={{ marginBottom: '20px', color: '#A8A29E', letterSpacing: '2px' }}>TWOJA HISTORIA</h2>
        {entries.map(entry => (
          <div key={entry.id} className="journal-card">
            <div className="journal-date">
              <span className="day">{new Date(entry.createdAt).getDate()}</span>
              <span className="month">{new Date(entry.createdAt).toLocaleString('default', { month: 'short' })}</span>
              <span className="year">{new Date(entry.createdAt).getFullYear()}</span>
              </div>
            <div className="journal-content-box">
              <div className="journal-header">
                <span className="journal-mood-icon">{moods.find(m => m.id === entry.mood)?.icon || '☁️'}</span>
                <span className="journal-time">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <button className="delete-btn" onClick={() => deleteEntry(entry.id)}>×</button>
                </div>
              <p>{entry.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- VISION BOARD ---
function VisionBoard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [goals, setGoals] = useState([]);
  const [images, setImages] = useState([]);
  const [newGoal, setNewGoal] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    apiFetch(`/vision/${year}`).then(res => { if (res && res.ok) res.json().then(d => { setGoals(d.goals); setImages(d.images); }); });
  }, [year]);

  const addGoal = async () => {
    if (!newGoal) return;
    const res = await apiFetch('/goals', { method: 'POST', body: JSON.stringify({ title: newGoal, year }) });
    if (res && res.ok) { setGoals([...goals, await res.json()]); setNewGoal(""); }
  };

  const toggleGoal = async (goal) => {
    const updated = goals.map(g => g.id === goal.id ? { ...g, isCompleted: !g.isCompleted } : g);
    setGoals(updated);
    await apiFetch(`/goals/${goal.id}`, { method: 'PATCH', body: JSON.stringify({ isCompleted: !goal.isCompleted }) });
  };

  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const res = await apiFetch('/vision', { method: 'POST', body: JSON.stringify({ imageUrl: reader.result, year }) });
        if (res && res.ok) setImages([...images, await res.json()]);
      }
    } else { toast.error("Tylko pliki graficzne!"); }
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };
  const deleteImage = async (id) => { setImages(images.filter(i => i.id !== id)); await apiFetch(`/vision/${id}`, { method: 'DELETE' }); };

  return (
    <div className="vision-container">
      <input type="file" ref={fileInputRef} onChange={e => processFile(e.target.files[0])} style={{ display: 'none' }} accept="image/*" />
      <div className="year-selector">{[2024, 2025, 2026, 2027].map(y => (<button key={y} className={`year-btn ${year === y ? 'active' : ''}`} onClick={() => setYear(y)}>{y}</button>))}</div>
      <div className="vision-grid">
        <div className="card">
          <h2>CELE NA {year}</h2>
          <div className="input-group"><input value={newGoal} onChange={e => setNewGoal(e.target.value)} placeholder="Wpisz cel..." />
          <button className="btn-add" onClick={addGoal}>+</button>
          </div>
          <ul className="goals-list">{goals.map(g => (<li key={g.id} className={`goal-item ${g.isCompleted ? 'done' : ''}`}>
            <div className="checkbox" onClick={() => toggleGoal(g)}>{g.isCompleted && '★'}</div>
            <span>{g.title}</span></li>))}
            </ul>
        </div>
        <div className="vision-board-area">
          <div className={`upload-box ${isDragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
            <div className="upload-content">
              <button className="upload-btn" onClick={() => fileInputRef.current.click()}>📂 Wybierz zdjęcie</button>
              <p className="upload-text">lub przeciągnij tutaj</p>
              </div>
          </div>
          <div className="gallery">{images.map(img => (<div key={img.id} className="gallery-item">
            <img src={img.imageUrl} />
            <button className="remove-img-btn" onClick={() => deleteImage(img.id)}>×</button></div>))}
            </div>
        </div>
      </div>
    </div>
  );
}

// --- USTAWIENIA KONTA ---
function AccountSettings() {
  const [email, setEmail] = useState("");
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");

  useEffect(() => { apiFetch('/me').then(res => { if (res && res.ok) res.json().then(d => setEmail(d.email)); }); }, []);

  const handleChangePassword = async () => {
    if (!oldPass || !newPass) {
      return toast.error("Wypełnij oba pola!");
    }

    const res = await apiFetch('/change-password', { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }) 
    });

    if (!res) return;

    const data = await res.json();

    if (res.ok) {
      toast.success(data.message || "Hasło zmienione pomyślnie!");
      setOldPass(""); 
      setNewPass(""); 
    } else {
      toast.error(data.error || "Nie udało się zmienić hasła.");
    }
  };

  return (
    <div className="account-container">
      <div className="card account-card">
        <h2>TWOJE KONTO 👤</h2>
        <div className="account-info">
          <p className="info-label">Zalogowana jako:</p>
          <p className="info-email">{email}</p>
          </div>
          <hr className="divider" />
        <h3>Zmień hasło</h3>
        <div className="input-group-vertical">
          <input type="password" placeholder="Stare hasło" value={oldPass} onChange={e => setOldPass(e.target.value)} />
          <input type="password" placeholder="Nowe hasło" value={newPass} onChange={e => setNewPass(e.target.value)} />
          <button className="btn-save-settings" onClick={handleChangePassword}>Zatwierdź zmianę</button>
        </div>
      </div>
    </div>
  );
}

// --- GŁÓWNA APLIKACJA ---
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [role, setRole] = useState(() => localStorage.getItem('role'));
  const [view, setView] = useState(() => localStorage.getItem('activeView') || 'dashboard');

  const handleLogout = () => {
    localStorage.clear(); 
    setToken(null); 
    setRole(null); 
    setView('dashboard');
  };

  useEffect(() => {
    if (token) {
      const verifySession = async () => {
        const res = await apiFetch('/me');
      };
      verifySession();
    }

    const onLogout = () => {
       console.log("Odebrano sygnał wylogowania! 🚨");
       toast.error("Sesja wygasła. Zaloguj się ponownie.");
       handleLogout();
    };

    window.addEventListener('auth:logout', onLogout);

    return () => {
      window.removeEventListener('auth:logout', onLogout);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        toast.error("Wylogowano z powodu braku aktywności.");
        handleLogout();
      }, 10 * 60 * 1000); 
    };
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('keypress', resetTimer);
    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('keypress', resetTimer);
    };
  }, [token]);

  useEffect(() => { localStorage.setItem('activeView', view); }, [view]);

  const handleLogin = (tok, userRole) => {
    localStorage.setItem('token', tok); 
    localStorage.setItem('role', userRole);
    setToken(tok); 
    setRole(userRole);
    setView(userRole === 'ADMIN' ? 'admin' : 'dashboard');
  };

  return (
    <>
      {!token ? (
        <AuthPage onLogin={handleLogin} />
      ) : (
        <div className="app-container">
          <nav>
            <h1 className="logo">My Space.</h1>
            <div className="nav-links">
              <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>DASHBOARD</button>
              <button className={view === 'journal' ? 'active' : ''} onClick={() => setView('journal')}>DIGITAL JOURNAL</button>
              <button className={view === 'vision' ? 'active' : ''} onClick={() => setView('vision')}>VISION BOARD</button>
              <button className={view === 'focus' ? 'active' : ''} onClick={() => setView('focus')}>FOCUS</button>
              <button className={view === 'account' ? 'active' : ''} onClick={() => setView('account')}>KONTO</button>
              
              {role === 'ADMIN' && (
                <button className={view === 'admin' ? 'active' : ''} style={{color: '#F59E0B'}} onClick={() => setView('admin')}>ADMIN PANEL</button>
              )}

              <button onClick={handleLogout} className="logout-btn">WYLOGUJ</button>
            </div>
          </nav>
          <main>
            {view === 'admin' && role === 'ADMIN' && <AdminPanel />}
            {view === 'dashboard' && <Dashboard />}
            {view === 'journal' && <Journal />}
            {view === 'vision' && <VisionBoard />}
            {view === 'focus' && <FocusTimer />}
            {view === 'account' && <AccountSettings />}
          </main>
        </div>
      )}

      <ToastContainer 
        position="top-center"
        autoClose={3000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
}