import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Home, Dumbbell, Utensils, BarChart2, Settings, Plus, Trash2, Search, X, Copy, Check, Trophy, Sun, Moon } from "lucide-react";
import { FOOD_DB } from './foodDb_final.js'; // 내가 만든 음식 DB 불러오기

// ─── Persistent Storage (localStorage Fallback 추가) ──────────────────────────
const store = {
  async get(key) {
    try {
      if (window.storage) {
        const r = await window.storage.get(key);
        return r ? JSON.parse(r.value) : null;
      }
      // 브라우저 기본 스토리지 사용
      const local = localStorage.getItem(key);
      return local ? JSON.parse(local) : null;
    } catch { return null; }
  },
  async set(key, val) {
    try {
      if (window.storage) {
        await window.storage.set(key, JSON.stringify(val));
      } else {
        localStorage.setItem(key, JSON.stringify(val));
      }
    } catch {}
  }
};


// ─── Helpers ──────────────────────────────────────────────────────────────────
const getToday = () => new Date().toISOString().split("T")[0];
const getNow = () => new Date().toLocaleTimeString("ko-KR", { hour:"2-digit", minute:"2-digit", hour12:false });
const getLast7 = () => {
  return Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i));
    return d.toISOString().split("T")[0];
  });
};
const dayLabel = s => ["일","월","화","수","목","금","토"][new Date(s+"T00:00:00").getDay()];
const r = n => Math.round(n * 10) / 10;
// 기존 데이터 호환: {weight, sets, reps} → {sets: [{weight, reps}]} 형태로 정규화
const normalizeWorkout = (w) => {
  if (Array.isArray(w.sets)) return w; // 이미 새 구조
  return {
    ...w,
    sets: Array.from({length: w.sets}, () => ({weight: w.weight, reps: w.reps}))
  };
};

// 볼륨 계산 (새 구조 기준)
const calcVolume = (w) => {
  const nw = normalizeWorkout(w);
  return nw.sets.reduce((a, s) => a + s.weight * s.reps, 0);
};
// ─── Components ───────────────────────────────────────────────────────────────
function Ring({ pct, size=130, stroke=10, color, children }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(pct, 1));
  return (
    <div style={{position:"relative", width:size, height:size, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
      <svg width={size} height={size} style={{position:"absolute", top:0, left:0}}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} style={{color:"rgba(255,255,255,0.08)"}} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{transition:"stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)"}} />
      </svg>
      <div style={{position:"relative", zIndex:1, textAlign:"center"}}>{children}</div>
    </div>
  );
}

function Bar2({ val, max, color, label }) {
  const pct = Math.min(val/max*100, 100);
  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4, color:"var(--sub)"}}>
        <span>{label}</span>
        <span style={{color}}>{r(val)}g / {max}g</span>
      </div>
      {/* 💡 라이트모드/다크모드 범용으로 보이게 배경을 var(--border)로 수정! */}
      <div style={{height:6, borderRadius:3, background:"var(--border)", overflow:"hidden"}}>
        <div style={{height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 0.6s ease"}} />
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function FitnessApp() {
  const sysDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  const [tab, setTab] = useState("home");
  const [meals, setMeals] = useState({});
  const [workouts, setWorkouts] = useState({});
  const [settings, setSettings] = useState({ targetCal:2100, targetProtein:140, targetCarbs:225, targetFat:60, dark:sysDark });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const m = await store.get("ft_meals");
      const w = await store.get("ft_workouts");
      const s = await store.get("ft_settings");
      if (m) setMeals(m);
      if (w) setWorkouts(w);
      if (s) setSettings(p => ({...p, ...s}));
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) store.set("ft_meals", meals); }, [meals, loaded]);
  useEffect(() => { if (loaded) store.set("ft_workouts", workouts); }, [workouts, loaded]);
  useEffect(() => { if (loaded) store.set("ft_settings", settings); }, [settings, loaded]);

  const dark = settings.dark;
  const C = {
    bg: dark ? "#080d1a" : "#f0f4f8",
    card: dark ? "#0f1729" : "#ffffff",
    card2: dark ? "#151e35" : "#f6f8fb",
    text: dark ? "#e8eef7" : "#0d1320",
    sub: dark ? "#5a6a8a" : "#8a9ab5",
    border: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    cal: "#f97316", p: "#22c55e", c: "#3b82f6", f: "#c084fc",
  };

  const today = getToday();
  const todayMeals = meals[today] || [];
  const todayWorkouts = workouts[today] || [];
  
  const totals = useMemo(() => {
    return todayMeals.reduce((a, m) => ({ cal:a.cal+m.cal, p:a.p+m.p, c:a.c+m.c, f:a.f+m.f }), {cal:0,p:0,c:0,f:0});
  }, [todayMeals]);

  const addMeal = e => setMeals(prev => ({...prev, [today]: [...(prev[today]||[]), e]}));
  const removeMeal = id => setMeals(prev => ({...prev, [today]: prev[today].filter(m => m.id!==id)}));
  const addWorkout = e => setWorkouts(prev => ({...prev, [today]: [...(prev[today]||[]), e]}));
  const removeWorkout = id => setWorkouts(prev => ({...prev, [today]: prev[today].filter(w => w.id!==id)}));

  const cssVars = {
    "--sub": C.sub, "--border": C.border,
    "--card": C.card, "--card2": C.card2,
    "--text": C.text, "--bg": C.bg,
  };

  const tabs = [
    {id:"home",   icon:Home,     label:"홈"},
    {id:"workout",icon:Dumbbell, label:"운동"},
    {id:"meal",   icon:Utensils, label:"식사"},
    {id:"analysis",icon:BarChart2,label:"분석"},
    {id:"settings",icon:Settings,label:"설정"},
  ];

return (
    // ✨ 1. maxWidth: 440 제한을 없애고 width: "100%"로 변경해서 화면을 꽉 채움!
    <div style={{...cssVars, background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"-apple-system,BlinkMacSystemFont,'Pretendard',system-ui,sans-serif", width:"100%", margin:"0 auto", paddingBottom:100}}>
      
      <style>{`
        html, body { 
          margin: 0; 
          padding: 0; 
          background-color: ${C.bg}; 
          overflow-x: hidden;
          -webkit-tap-highlight-color: transparent; 
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={{
        background: `${C.bg}cc`, 
        backdropFilter: "blur(12px)", 
        WebkitBackdropFilter: "blur(12px)",
        padding: "calc(env(safe-area-inset-top) + 14px) 18px 10px", 
        position: "sticky", 
        top: 0, 
        zIndex: 50, 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center"
      }}>
        <div>
          <div style={{fontSize:11, color:C.sub, marginBottom:2}}>
            {new Date().toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"})}
          </div>
          <div style={{fontSize:19, fontWeight:800, letterSpacing:-0.5}}>FitTrack <span style={{color:C.cal}}>●</span></div>
        </div>
        <button onClick={() => setSettings(s=>({...s, dark:!s.dark}))}
          style={{background:"transparent", border:"none", padding:"6px", cursor:"pointer", color:C.sub, display:"flex", alignItems:"center"}}>
          {dark ? <Sun size={18}/> : <Moon size={18}/>}
        </button>
      </div>

      <div style={{padding:"14px 6px 0"}}>
        {tab==="home"     && <DashboardTab C={C} totals={totals} meals={meals} workouts={workouts} settings={settings} dark={dark}/>}
        {tab==="workout"  && <WorkoutTab C={C} todayWorkouts={todayWorkouts} workouts={workouts} addWorkout={addWorkout} removeWorkout={removeWorkout}/>}
        {tab==="meal"     && <MealTab C={C} todayMeals={todayMeals} addMeal={addMeal} removeMeal={removeMeal} totals={totals} settings={settings}/>}
        {tab==="analysis" && <AnalysisTab C={C} totals={totals} meals={meals} workouts={workouts} settings={settings} dark={dark}/>}
        {tab==="settings" && <SettingsTab C={C} settings={settings} setSettings={setSettings} setMeals={setMeals} setWorkouts={setWorkouts}/>}
      </div>

      {/* ✨ 2. 하단 네비게이션 바 역시 화면 끝까지 꽉 차게 수정 */}
      <nav style={{position:"fixed", bottom:0, left:0, width:"100%", background:C.card, borderTop:`1px solid ${C.border}`, display:"flex", zIndex:50, paddingBottom:"calc(env(safe-area-inset-bottom) + 12px)"}}>
        {tabs.map(({id,icon:Icon,label}) => (
          <button key={id} onClick={()=>setTab(id)} style={{flex:1, padding:"10px 0 8px", background:"none", border:"none", cursor:"pointer", color:tab===id?C.cal:C.sub, display:"flex", flexDirection:"column", alignItems:"center", gap:3, fontSize:10, fontWeight:tab===id?700:400, transition:"color 0.2s"}}>
            <Icon size={19}/>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({C, totals, meals, workouts, settings, dark}) {
  const {targetCal, targetProtein, targetCarbs, targetFat} = settings;
  const calPct = totals.cal / targetCal;
  const remaining = targetCal - totals.cal;
  const today = getToday();
  const todayWkts = workouts[today] || [];
  
  const vol = useMemo(() => todayWkts.reduce((a,w) => a + calcVolume(w), 0), [todayWkts]);
  const chart = useMemo(() => getLast7().map(d => ({
    day: dayLabel(d),
    cal: Math.round((meals[d]||[]).reduce((a,m)=>a+m.cal,0)),
    target: targetCal,
  })), [meals, targetCal]);

  const card = {background:C.card, borderRadius:18, padding:16, marginBottom:10};

  return (
    <div>
      <div style={{...card, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontSize:12, color:C.sub, marginBottom:4}}>오늘 섭취</div>
          <div style={{fontSize:30, fontWeight:800, color:C.cal, letterSpacing:-1}}>{Math.round(totals.cal).toLocaleString()}</div>
          <div style={{fontSize:11, color:C.sub, marginTop:2}}>kcal</div>
          <div style={{marginTop:8, fontSize:13, color: remaining>=0 ? C.p : "#ef4444", fontWeight:600}}>
            {remaining>=0 ? `${Math.round(remaining).toLocaleString()} kcal 남음` : `${Math.round(-remaining).toLocaleString()} kcal 초과`}
          </div>
          <div style={{marginTop:14, display:"flex", flexDirection:"column", gap:7}}>
            <Bar2 val={totals.p} max={targetProtein} color={C.p} label="단백질"/>
            <Bar2 val={totals.c} max={targetCarbs} color={C.c} label="탄수화물"/>
            <Bar2 val={totals.f} max={targetFat} color={C.f} label="지방"/>
          </div>
        </div>
        <Ring pct={calPct} size={125} stroke={11} color={calPct>1?"#ef4444":C.cal}>
          <div style={{fontSize:22, fontWeight:800, color:calPct>1?"#ef4444":C.cal}}>{Math.round(calPct*100)}%</div>
          <div style={{fontSize:10, color:C.sub}}>/{targetCal}</div>
        </Ring>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10}}>
        {[{l:"단백질",v:totals.p,m:targetProtein,col:C.p},{l:"탄수화물",v:totals.c,m:targetCarbs,col:C.c},{l:"지방",v:totals.f,m:targetFat,col:C.f}].map(({l,v,m,col}) => (
          <div key={l} style={{background:C.card, borderRadius:14, padding:"11px 8px", border:`1px solid ${C.border}`, textAlign:"center"}}>
            <div style={{fontSize:20, fontWeight:800, color:col}}>{Math.round(v)}</div>
            <div style={{fontSize:9, color:C.sub, marginTop:2}}>{l}</div>
            <div style={{fontSize:9, color:C.sub}}>/{m}g</div>
          </div>
        ))}
      </div>

      <div style={{...card}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
          <div style={{fontSize:14, fontWeight:600}}>오늘 운동</div>
          <div style={{fontSize:11, color:C.sub}}>{todayWkts.length}개 종목</div>
        </div>
        {todayWkts.length===0
          ? <div style={{color:C.sub, fontSize:13, textAlign:"center", padding:"10px 0"}}>아직 운동 기록이 없어요 💪</div>
          : <>
              <div style={{color:C.sub, fontSize:12}}>총 볼륨: <span style={{color:C.p, fontWeight:700}}>{vol.toLocaleString()} kg</span></div>
              <div style={{display:"flex", flexWrap:"wrap", gap:5, marginTop:8}}>
                {todayWkts.slice(0,5).map(w=>(
                  <span key={w.id} style={{background:C.card2, borderRadius:8, padding:"3px 8px", fontSize:12}}>{w.name}</span>
                ))}
                {todayWkts.length>5 && <span style={{color:C.sub, fontSize:12, alignSelf:"center"}}>+{todayWkts.length-5}</span>}
              </div>
            </>
        }
      </div>

      <div style={{...card, marginBottom:0}}>
        <div style={{fontSize:14, fontWeight:600, marginBottom:12}}>최근 7일 칼로리</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chart} barSize={22} margin={{top:0,right:0,bottom:0,left:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"} vertical={false}/>
            <XAxis dataKey="day" tick={{fontSize:11, fill:C.sub}} axisLine={false} tickLine={false}/>
            <YAxis hide domain={[0, Math.max(targetCal*1.3, 500)]}/>
            <Tooltip contentStyle={{background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:12}} formatter={v=>[`${Math.round(v).toLocaleString()} kcal`,"섭취"]}/>
            <Bar dataKey="cal" fill={C.cal} radius={[6,6,0,0]} opacity={0.85}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Workout Tab ───────────────────────────────────────────────────────────────
function WorkoutModal({C, onClose, onSave}) {
  const [name, setName] = useState("");
  const [sets, setSets] = useState([{weight:"", reps:""}]);

  const addSet = () => setSets(s => [...s, {weight:"", reps:""}]);
  const removeSet = (i) => setSets(s => s.filter((_,idx) => idx!==i));
  const updateSet = (i, field, val) => setSets(s => s.map((s2,idx) => idx===i ? {...s2, [field]:val} : s2));

  const handleSave = () => {
    if (!name) return;
    const validSets = sets.filter(s => s.weight!=="" && s.reps!=="");
    if (validSets.length===0) return;
    onSave({
      id: Date.now(),
      name,
      sets: validSets.map(s => ({weight: parseFloat(s.weight), reps: parseInt(s.reps)})),
      time: getNow(),
      date: getToday()
    });
    onClose();
  };

  const inp = {background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, padding:"10px 12px", color:"#e8eef7", fontSize:14, outline:"none", width:"100%", boxSizing:"border-box"};

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center"}}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{background:"#0f1729", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:440, padding:20, paddingBottom:40, maxHeight:"85vh", overflowY:"auto"}}>
        
        {/* 헤더 */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
          <div style={{fontSize:17, fontWeight:700}}>운동 추가</div>
          <button onClick={onClose} style={{background:"none", border:"none", cursor:"pointer", color:"#5a6a8a", display:"flex"}}>
            <X size={20}/>
          </button>
        </div>

        {/* 운동 이름 */}
        <input style={{...inp, marginBottom:20}} placeholder="운동 이름 (예: 벤치프레스)" value={name} onChange={e=>setName(e.target.value)}/>

        {/* 세트 목록 */}
        <div style={{display:"flex", flexDirection:"column", gap:8, marginBottom:12}}>
          {sets.map((s, i) => (
            <div key={i} style={{display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.04)", borderRadius:12, padding:"10px 12px"}}>
              <span style={{fontSize:13, color:"#5a6a8a", minWidth:36}}>{i+1}세트</span>
              <input style={{...inp, textAlign:"center"}} placeholder="무게" type="number" inputMode="decimal" value={s.weight} onChange={e=>updateSet(i,"weight",e.target.value)}/>
              <span style={{fontSize:13, color:"#5a6a8a"}}>kg</span>
              <input style={{...inp, textAlign:"center"}} placeholder="횟수" type="number" inputMode="numeric" value={s.reps} onChange={e=>updateSet(i,"reps",e.target.value)}/>
              <span style={{fontSize:13, color:"#5a6a8a"}}>회</span>
              {sets.length > 1 &&
                <button onClick={()=>removeSet(i)} style={{background:"none", border:"none", cursor:"pointer", color:"#ef4444", display:"flex", flexShrink:0}}>
                  <Trash2 size={15}/>
                </button>
              }
            </div>
          ))}
        </div>

        {/* 세트 추가 버튼 */}
        <button onClick={addSet} style={{width:"100%", padding:"11px", borderRadius:12, background:"rgba(255,255,255,0.05)", border:"1px dashed rgba(255,255,255,0.15)", color:"#5a6a8a", fontSize:14, cursor:"pointer", marginBottom:16}}>
          + 세트 추가
        </button>

        {/* 저장 버튼 */}
        <button onClick={handleSave} style={{width:"100%", padding:"13px", borderRadius:12, background:"#f97316", border:"none", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer"}}>
          저장하기
        </button>
      </div>
    </div>
  );
}
function WorkoutTab({C, todayWorkouts, workouts, addWorkout, removeWorkout}) {
  const [showModal, setShowModal] = useState(false);
  
  const vol = useMemo(() => todayWorkouts.reduce((a,w)=>a+w.weight*w.sets*w.reps, 0), [todayWorkouts]);

  const prs = useMemo(() => {
    const records = {};
    Object.values(workouts).flat().forEach(w => {
    const nw = normalizeWorkout(w);
    const k = w.name.toLowerCase();
    const maxW = Math.max(...nw.sets.map(s => s.weight));
    if (!records[k] || maxW > records[k]) records[k] = maxW;
  });
    return records;
  }, [workouts]);

  const weekVol = useMemo(() => getLast7().reduce((a,d)=>{
    return a + (workouts[d]||[]).reduce((b,w)=>b+calcVolume(w), 0);
  }, 0), [workouts]);

  const handleAdd = () => {
    if (!name||!weight||!sets||!reps) return;
    addWorkout({id:Date.now(), name, weight:parseFloat(weight), sets:parseInt(sets), reps:parseInt(reps), time:getNow(), date:getToday()});
    setName("");setWeight("");setSets("");setReps("");
    setOk(true); setTimeout(()=>setOk(false),1600);
  };

  const inp = {background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", color:C.text, fontSize:14, outline:"none", width:"100%", boxSizing:"border-box"};
  const card = {background:C.card, borderRadius:18, padding:16, border:`1px solid ${C.border}`, marginBottom:10};
  const preview = name&&weight&&sets&&reps ? parseFloat(weight)*parseInt(sets)*parseInt(reps) : null;

  return (
    <div>
      <div style={{...card}}>
        <button onClick={() => setShowModal(true)}
          style={{width:"100%", padding:"13px", borderRadius:12, background:"#f97316", border:"none", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
          <Plus size={16}/> 운동 추가
        </button>
      </div>

      {showModal && <WorkoutModal C={C} onClose={() => setShowModal(false)} onSave={addWorkout}/>}

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10}}>
        {[{l:"오늘 볼륨",v:`${vol.toLocaleString()}kg`,col:C.p},{l:"오늘 종목",v:`${todayWorkouts.length}개`,col:C.c},{l:"주간 볼륨",v:`${Math.round(weekVol/1000).toLocaleString()}t`,col:C.f}].map(({l,v,col})=>(
          <div key={l} style={{background:C.card, borderRadius:14, padding:12, border:`1px solid ${C.border}`, textAlign:"center"}}>
            <div style={{fontSize:16, fontWeight:800, color:col}}>{v}</div>
            <div style={{fontSize:10, color:C.sub, marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{...card, marginBottom:0}}>
        <div style={{fontSize:15, fontWeight:700, marginBottom:12}}>오늘 운동 목록</div>
        {todayWorkouts.length===0
          ? <div style={{color:C.sub, fontSize:13, textAlign:"center", padding:"20px 0"}}>운동을 추가해보세요 💪</div>
          : <div style={{display:"flex", flexDirection:"column", gap:8}}>
              {todayWorkouts.map(w => {
                const nw = normalizeWorkout(w);
                const maxW = Math.max(...nw.sets.map(s => s.weight));
                const isPR = prs[w.name.toLowerCase()] === maxW && maxW > 0;
                return (
                  <div key={w.id} style={{background:C.card2, borderRadius:12, padding:"11px 13px", display:"flex", alignItems:"center", gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:3}}>
                        <span style={{fontWeight:600, fontSize:14}}>{w.name}</span>
                        {isPR && <span style={{fontSize:10, color:"#eab308", background:"rgba(234,179,8,0.12)", borderRadius:6, padding:"1px 5px", fontWeight:600}}>🏆 PR</span>}
                      </div>
                      {normalizeWorkout(w).sets.map((s,i) => (
                        <div key={i} style={{fontSize:12, color:C.sub}}>{i+1}세트 · {s.weight}kg × {s.reps}회</div>
                      ))}
                      <div style={{fontSize:12, color:C.p, fontWeight:600, marginTop:2}}>볼륨 {calcVolume(w).toLocaleString()}kg · {w.time}</div>
                    </div>
                    <button onClick={()=>removeWorkout(w.id)} style={{background:"none", border:"none", cursor:"pointer", color:"#ef4444", padding:4, display:"flex"}}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}

// ─── Meal Tab ──────────────────────────────────────────────────────────────────
function MealTab({C, todayMeals, addMeal, removeMeal, totals, settings}) {
  const [query, setQuery] = useState(""); 
  const [sel, setSel] = useState(null);
  const [grams, setGrams] = useState(""); 
  
  const [customName, setCustomName] = useState("");
  const [customCal, setCustomCal] = useState("");
  const [customP, setCustomP] = useState("");
  const [customC, setCustomC] = useState("");
  const [customF, setCustomF] = useState("");

  const [ok, setOk] = useState(false);
  const [okDirect, setOkDirect] = useState(false);

  const results = query.length > 0 ? FOOD_DB.filter(f => f.name.includes(query)).slice(0, 7) : [];
  const calc = (f,g) => {
    const multiplier = f.unit === "g" || f.unit === "ml" ? g / 100 : g;
    return {
      cal: f.cal * multiplier,
      p: f.p * multiplier,
      c: f.c * multiplier,
      f: f.f * multiplier
    };
  };
  const prev = sel && grams ? calc(sel, parseFloat(grams)) : null;

  const handleAdd = () => {
    if (!sel || !grams) return;
    const n = calc(sel, parseFloat(grams));
    addMeal({ id: Date.now(), food: sel.name, grams: parseFloat(grams), unit: sel.unit, ...n, time: getNow() });
    setQuery(""); setSel(null); setGrams("");
    setOk(true); setTimeout(() => setOk(false), 1600);
  };

  const handleAddDirect = () => {
    if (!customName || !customCal) return;
    addMeal({
      id: Date.now(),
      food: customName,
      grams: 0,
      unit: "-",
      cal: parseFloat(customCal) || 0,
      p: parseFloat(customP) || 0,
      c: parseFloat(customC) || 0,
      f: parseFloat(customF) || 0,
      time: getNow()
    });
    setCustomName(""); setCustomCal(""); setCustomP(""); setCustomC(""); setCustomF("");
    setOkDirect(true); setTimeout(() => setOkDirect(false), 1600);
  };

  const inp = { background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };
  const card = { background: C.card, borderRadius: 18, padding: 16, border: `1px solid ${C.border}`, marginBottom: 10 };
  const { targetCal, targetProtein, targetCarbs, targetFat } = settings;

  return (
    <div>
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>식사 추가 (검색)</div>
        <div style={{ position: "relative", marginBottom: 9 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.sub }} />
          <input style={{ ...inp, paddingLeft: 34 }} placeholder="음식 검색..." value={sel ? sel.name : query}
            onChange={e => { setQuery(e.target.value); setSel(null); }} />
          {(query || sel) && (
            <button onClick={() => { setQuery(""); setSel(null); setGrams(""); }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.sub, display: "flex" }}>
              <X size={14} />
            </button>
          )}
        </div>
        {results.length > 0 && !sel && (
          <div style={{ background: C.card2, borderRadius: 12, overflow: "hidden", marginBottom: 9, border: `1px solid ${C.border}` }}>
            {results.map((food, i) => (
              <button key={i} onClick={() => { setSel(food); setQuery(""); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 13px", background: "none", border: "none", borderBottom: i < results.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer", color: C.text }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{food.name}</div>
                <div style={{fontSize:11, color:C.sub}}>
                  {food.cal}kcal/{food.unit==="g"||food.unit==="ml"?"100":"1"}{food.unit} 
                  · 단{food.p}g 탄{food.c}g 지{food.f}g
                  {food.hint?` · ${food.hint}`:""}
                </div>
              </button>
            ))}
          </div>
        )}
        {sel && (
          <>
            <div style={{ background: C.card2, borderRadius: 10, padding: "7px 12px", fontSize: 12, marginBottom: 8, color: C.sub }}>
              <span style={{color:C.text, fontWeight:600}}>{sel.name}</span> — 
              {sel.cal}kcal/{sel.unit==="g"||sel.unit==="ml"?"100":"1"}{sel.unit}
              {sel.hint&&<span style={{color:C.cal}}> · {sel.hint}</span>}
            </div>
            <input style={{ ...inp, marginBottom: 8 }} placeholder={`수량 (${sel.unit})`} type="number" inputMode="decimal" value={grams} onChange={e => setGrams(e.target.value)} />
            {prev && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 9 }}>
                {[{ l: "칼로리", v: prev.cal, col: C.cal }, { l: "단백질", v: prev.p, col: C.p }, { l: "탄수", v: prev.c, col: C.c }, { l: "지방", v: prev.f, col: C.f }].map(m => (
                  <div key={m.l} style={{ background: C.card2, borderRadius: 10, padding: 8, textAlign: "center", border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: m.col }}>{Math.round(m.v)}</div>
                    <div style={{ fontSize: 9, color: C.sub }}>{m.l}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <button onClick={handleAdd} disabled={!sel || !grams}
          style={{ background: ok ? "#16a34a" : sel && grams ? C.p : "#334155", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 14, cursor: sel && grams ? "pointer" : "default", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "background 0.3s", opacity: sel && grams ? 1 : 0.5 }}>
          {ok ? <><Check size={15} /> 추가완료!</> : <><Plus size={15} /> 추가하기</>}
        </button>
      </div>

      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>식사 직접 추가</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input style={inp} placeholder="음식 이름 (예: 엄마표 볶음밥)" value={customName} onChange={e => setCustomName(e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input style={inp} placeholder="칼로리 (kcal)" type="number" value={customCal} onChange={e => setCustomCal(e.target.value)} />
            <input style={inp} placeholder="단백질 (g)" type="number" value={customP} onChange={e => setCustomP(e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input style={inp} placeholder="탄수화물 (g)" type="number" value={customC} onChange={e => setCustomC(e.target.value)} />
            <input style={inp} placeholder="지방 (g)" type="number" value={customF} onChange={e => setCustomF(e.target.value)} />
          </div>
          <button onClick={handleAddDirect} disabled={!customName || !customCal}
            style={{ background: okDirect ? "#16a34a" : customName && customCal ? C.cal : "#334155", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 14, cursor: customName && customCal ? "pointer" : "default", width: "100%", display: "flex", alignItems:"center", justifyContent:"center", gap:7, transition:"background 0.3s", opacity: customName && customCal ? 1 : 0.5 }}>
            {okDirect ? <><Check size={15}/> 저장완료!</> : <><Plus size={15}/> 직접 추가하기</>}
          </button>
        </div>
      </div>

      <div style={{ ...card }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>오늘 합계</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
          {[{ l: "칼로리", v: totals.cal, col: C.cal, m: targetCal }, { l: "단백질", v: totals.p, col: C.p, m: targetProtein }, { l: "탄수", v: totals.c, col: C.c, m: targetCarbs }, { l: "지방", v: totals.f, col: C.f, m: targetFat }].map(m => (
            <div key={m.l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: m.col }}>{Math.round(m.v)}</div>
              <div style={{ fontSize: 9, color: C.sub }}>{m.l}</div>
              <div style={{ fontSize: 9, color: C.sub }}>/{m.m}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card, marginBottom: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>오늘 식사 목록</div>
        {todayMeals.length === 0
          ? <div style={{ color: C.sub, fontSize: 13, textAlign: "center", padding: "20px 0" }}>음식을 추가해보세요 🍽️</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayMeals.map(m => (
              <div key={m.id} style={{ background: C.card2, borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.food} {m.grams > 0 && <span style={{ color: C.sub, fontWeight: 400, fontSize: 11 }}>{m.grams}{m.unit}</span>}</div>
                  <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{m.time} · <span style={{ color: C.cal, fontWeight: 600 }}>{Math.round(m.cal)}kcal</span></div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    <span style={{ color: C.p }}>단{r(m.p)}g</span> <span style={{ color: C.sub }}>·</span> <span style={{ color: C.c }}>탄{r(m.c)}g</span> <span style={{ color: C.sub }}>·</span> <span style={{ color: C.f }}>지{r(m.f)}g</span>
                  </div>
                </div>
                <button onClick={() => removeMeal(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4, display: "flex" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

// ─── Analysis Tab ──────────────────────────────────────────────────────────────
function AnalysisTab({C, totals, meals, workouts, settings, dark}) {
  const [copied, setCopied] = useState(false);
  const {targetCal, targetProtein, targetCarbs, targetFat} = settings;
  const today = getToday();
  const todayWkts = workouts[today]||[];
  
  const chart = useMemo(() => getLast7().map(d => ({
    day:dayLabel(d), cal:Math.round((meals[d]||[]).reduce((a,m)=>a+m.cal,0))
  })), [meals]);
  
  const avgCal = useMemo(() => Math.round(chart.reduce((a,d)=>a+d.cal,0)/7), [chart]);
  const wkDays = useMemo(() => getLast7().filter(d=>(workouts[d]||[]).length>0).length, [workouts]);

  const copyData = () => {
    const txt = `📊 오늘의 피트니스 데이터 (${today})\n\n칼로리: ${Math.round(totals.cal)} / ${targetCal} kcal (${Math.round(totals.cal/targetCal*100)}%)\n단백질: ${Math.round(totals.p)}g / ${targetProtein}g (${Math.round(totals.p/targetProtein*100)}%)\n탄수화물: ${Math.round(totals.c)}g / ${targetCarbs}g (${Math.round(totals.c/targetCarbs*100)}%)\n지방: ${Math.round(totals.f)}g / ${targetFat}g (${Math.round(totals.f/targetFat*100)}%)\n\n🏋️ 오늘 운동:\n${todayWkts.length>0?todayWkts.map(w=>`  ${w.name} ${w.weight}kg × ${w.sets}세트 × ${w.reps}회 (볼륨 ${w.weight*w.sets*w.reps}kg)`).join('\n'):"  없음"}\n\n📅 주간 통계:\n  일일 평균 칼로리: ${avgCal.toLocaleString()} kcal\n  주간 운동 일수: ${wkDays}일`;
    navigator.clipboard?.writeText(txt);
    setCopied(true); setTimeout(()=>setCopied(false), 2200);
  };

  const macros = [
    {l:"칼로리",v:totals.cal,m:targetCal,u:"kcal",col:C.cal},
    {l:"단백질",v:totals.p,m:targetProtein,u:"g",col:C.p},
    {l:"탄수화물",v:totals.c,m:targetCarbs,u:"g",col:C.c},
    {l:"지방",v:totals.f,m:targetFat,u:"g",col:C.f},
  ];
  const card = {background:C.card, borderRadius:18, padding:16, border:`1px solid ${C.border}`, marginBottom:10};

  return (
    <div>
      <div style={card}>
        <div style={{fontSize:15, fontWeight:700, marginBottom:14}}>오늘 요약</div>
        {macros.map(m=>(
          <div key={m.l} style={{marginBottom:12}}>
            <div style={{display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5}}>
              <span style={{fontWeight:500}}>{m.l}</span>
              <span><span style={{color:m.col, fontWeight:700}}>{Math.round(m.v)}</span><span style={{color:C.sub}}> / {m.m}{m.u} ({Math.round(m.v/m.m*100)}%)</span></span>
            </div>
            {/* 💡 배경색 C.border 수정 적용! */}
            <div style={{height:8, borderRadius:4, overflow:"hidden", background:C.border}}>
              <div style={{height:"100%", borderRadius:4, background:m.col, width:`${Math.min(m.v/m.m*100,100)}%`, transition:"width 0.6s ease"}}/>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:dark?"#0c1428":"#1e3a5f", borderRadius:18, padding:16, border:`1px solid rgba(59,130,246,0.25)`, marginBottom:10}}>
        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
          <div style={{width:8, height:8, borderRadius:"50%", background:C.cal, boxShadow:`0 0 6px ${C.cal}`}}/>
          <div style={{fontSize:15, fontWeight:700, color:"#e8eef7"}}>데이터 분석 요청</div>
        </div>
        <div style={{color:"#5a7aaa", fontSize:12, marginBottom:12}}>오늘의 데이터를 복사해 AI에게 붙여넣으면 맞춤 분석을 받을 수 있어요</div>
        <button onClick={copyData} style={{background:copied?"#16a34a":C.cal, color:"#fff", border:"none", borderRadius:12, padding:"11px 16px", fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", gap:8, width:"100%", justifyContent:"center", transition:"background 0.3s"}}>
          {copied ? <><Check size={15}/> 복사 완료!</> : <><Copy size={15}/> 오늘 데이터 복사</>}
        </button>
      </div>

      <div style={card}>
        <div style={{fontSize:15, fontWeight:700, marginBottom:12}}>주간 통계</div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14}}>
          {[{l:"일일 평균 칼로리",v:`${avgCal.toLocaleString()}`,u:"kcal",col:C.cal,sub:`목표 ${targetCal}`},{l:"운동 일수",v:wkDays,u:"일",col:C.p,sub:"목표 4~5일"}].map(({l,v,u,col,sub})=>(
            <div key={l} style={{background:C.card2, borderRadius:14, padding:13}}>
              <div style={{color:C.sub, fontSize:11, marginBottom:4}}>{l}</div>
              <div style={{fontSize:22, fontWeight:800, color:col}}>{v}<span style={{fontSize:13, fontWeight:400}}>{u}</span></div>
              <div style={{color:C.sub, fontSize:10, marginTop:2}}>{sub}</div>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={chart} margin={{top:4,right:4,bottom:0,left:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)"} vertical={false}/>
            <XAxis dataKey="day" tick={{fontSize:11, fill:C.sub}} axisLine={false} tickLine={false}/>
            <YAxis hide domain={[0, Math.max(targetCal*1.3, 200)]}/>
            <Tooltip contentStyle={{background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:12}} formatter={v=>[`${Math.round(v).toLocaleString()} kcal`]}/>
            <Line type="monotone" dataKey="cal" stroke={C.cal} strokeWidth={2.5} dot={{fill:C.cal, r:4, strokeWidth:0}} activeDot={{r:6}}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{...card, marginBottom:0}}>
        <div style={{fontSize:15, fontWeight:700, marginBottom:10}}>월간 체중 변화 예측</div>
        {(() => {
          const diff = avgCal - targetCal;
          const monthly = (diff * 30) / 7700;
          return (
            <>
              <div style={{display:"flex", justifyContent:"space-between", fontSize:13, color:C.sub, marginBottom:6}}>
                <span>주간 평균 칼로리 차이</span>
                <span style={{color:diff<=0?C.p:"#ef4444", fontWeight:600}}>{diff>0?"+":""}{Math.round(diff)} kcal</span>
              </div>
              <div style={{background:C.card2, borderRadius:12, padding:"12px 14px", textAlign:"center"}}>
                <div style={{fontSize:13, color:C.sub, marginBottom:4}}>예상 월 체중 변화</div>
                <div style={{fontSize:28, fontWeight:800, color:monthly<0?C.p:monthly>0?"#ef4444":C.text}}>{monthly>0?"+":""}{monthly.toFixed(1)} kg</div>
                <div style={{fontSize:11, color:C.sub, marginTop:4}}>7,700 kcal ≈ 체지방 1kg 기준</div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ─── 자동 계산 공식 ─────────────────────────────────────────
function calculateTargets(profile) {
  const { gender="male", age=25, height=180, weight=85, activity=1.35, exerciseCal=500, goal="cut" } = profile;

  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr += (gender === "male") ? 5 : -161;

  const tdee = (bmr * activity) + exerciseCal;

  let targetCal = 0, targetP = 0, targetC = 0, targetF = 0;
  if (goal === "cut") {
    targetCal = tdee - 500; targetP = weight * 1.65; targetC = (targetCal * 0.44) / 4; 
  } else if (goal === "maintain") {
    targetCal = tdee; targetP = weight * 1.76; targetC = (targetCal * 0.45) / 4;
  } else if (goal === "bulk") {
    targetCal = tdee + 300; targetP = weight * 1.88; targetC = (targetCal * 0.50) / 4;
  }

  targetF = Math.max(0, (targetCal - (targetP * 4) - (targetC * 4)) / 9);

  return {
    targetCal: Math.round(targetCal), targetProtein: Math.round(targetP),
    targetCarbs: Math.round(targetC), targetFat: Math.round(targetF)
  };
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({C, settings, setSettings, setMeals, setWorkouts}) {
  const [resetDone, setResetDone] = useState(false);
  const [showProfile, setShowProfile] = useState(false); 
  const set = (k,v) => setSettings(s=>({...s,[k]:v}));

  const curProfile = {
    gender: settings.gender || "male",
    age: settings.age || 25,
    height: settings.height || 180,
    weight: settings.weight || 85,
    activity: settings.activity || 1.35, 
    goal: settings.goal || "cut"
  };

  const handleProfileChange = (key, val) => {
    const newProfile = { ...curProfile, [key]: val };
    const newTargets = calculateTargets(newProfile);
    setSettings(s => ({ ...s, ...newProfile, ...newTargets }));
  };

  const NumberStepper = ({ label, field, val, min }) => (
    <div style={{marginBottom:18}}>
      <div style={{fontSize:13, color:C.sub, marginBottom:6}}>{label}</div>
      <div style={{display:"flex", alignItems:"center", background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden"}}>
        <button onClick={() => handleProfileChange(field, Math.max(min, val - 1))} 
          style={{padding:"12px 20px", background:"none", border:"none", color:C.sub, fontSize:18, fontWeight:600, cursor:"pointer"}}>-</button>
        <input type="number" value={val} 
          onChange={e => handleProfileChange(field, Number(e.target.value))}
          style={{flex:1, padding:"12px 0", background:"transparent", border:"none", color:C.text, fontSize:16, fontWeight:700, textAlign:"center", outline:"none"}} />
        <button onClick={() => handleProfileChange(field, val + 1)} 
          style={{padding:"12px 20px", background:"none", border:"none", color:C.sub, fontSize:18, fontWeight:600, cursor:"pointer"}}>+</button>
      </div>
    </div>
  );

  // SettingsTab 함수 밖에 독립 컴포넌트로 선언
  function SliderRow({label, val, min, max, step=1, color, unit, onCommit}) {
    const [localVal, setLocalVal] = useState(val);
    useEffect(() => { setLocalVal(val); }, [val]);

    const pct = ((localVal - min) / (max - min)) * 100;

    return (
      <div style={{marginBottom:18}}>
        <div style={{display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:500, marginBottom:6}}>
          <span>{label}</span>
          <span style={{color, fontWeight:700}}>{localVal} {unit}</span>
        </div>
        <div style={{position:"relative", height:18, display:"flex", alignItems:"center"}}>
          {/* 트랙 배경 */}
          <div style={{position:"absolute", width:"100%", height:4, borderRadius:2, background:"rgba(255,255,255,0.12)"}}/>
          {/* 채워지는 트랙 */}
          <div style={{position:"absolute", width:`${pct}%`, height:4, borderRadius:2, background:color, transition:"width 0.1s"}}/>
          {/* 실제 input (투명) */}
          <input
            type="range" min={min} max={max} step={step} value={localVal}
            onChange={e => setLocalVal(Number(e.target.value))}
            onMouseUp={() => onCommit(localVal)}
            onTouchEnd={() => onCommit(localVal)}
            style={{position:"absolute", width:"100%", opacity:0, height:18, cursor:"pointer", margin:0}}
          />
          {/* thumb */}
          <div style={{position:"absolute", left:`calc(${pct}% - 9px)`, width:18, height:18, borderRadius:"50%", background:color, boxShadow:`0 0 6px ${color}55`, pointerEvents:"none", transition:"left 0.1s"}}/>
        </div>
        <div style={{display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--sub)", marginTop:4}}>
          <span>{min}{unit}</span><span>{max}{unit}</span>
        </div>
      </div>
    );
  }

    const handleReset = () => {
      setMeals({}); setWorkouts({});
      store.set("ft_meals", {}); store.set("ft_workouts", {});  // ✅ 조건 없이 바로 호출
      setResetDone(true); setTimeout(()=>setResetDone(false),2000);
    };

  const card = {background:C.card, borderRadius:18, padding:16, border:`1px solid ${C.border}`, marginBottom:10};
  const goalName = curProfile.goal === "bulk" ? "💪 벌크업" : curProfile.goal === "maintain" ? "⚖️ 체중 유지" : "🔥 체중 감량";

  return (
    <div>
      <style>{`
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
        input[type="range"] { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.12); outline: none; cursor: pointer; }
        input[type="range"]::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.12); }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; cursor: pointer; background: var(--thumb-color, #f97316); margin-top: -7px; }
        input[type="range"]::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; border: none; cursor: pointer; background: var(--thumb-color, #f97316); }
        input[type="range"]::-moz-range-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.12); }
      `}</style>

      {/* 1. 내 프로필 & 목표 설정 */}
      <div style={card}>
        <button onClick={() => setShowProfile(!showProfile)} 
          style={{width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:"none", border:"none", color:C.text, fontSize:15, fontWeight:700, cursor:"pointer", padding:"4px 0"}}>
          <span>내 프로필 & 목표 설정</span>
          <span style={{transform: showProfile ? "rotate(180deg)" : "rotate(0deg)", transition:"transform 0.3s", color:C.sub}}>▼</span>
        </button>
        
        {showProfile && (
          <div style={{marginTop:20, animation:"fadeIn 0.3s ease"}}>
            <div style={{marginBottom:18}}>
              <div style={{fontSize:13, color:C.sub, marginBottom:6}}>성별</div>
              <div style={{display:"flex", gap:8}}>
                <button onClick={() => handleProfileChange("gender", "male")}
                  style={{flex:1, padding:"12px", borderRadius:10, border:`1px solid ${curProfile.gender==="male"?C.c:C.border}`, background:curProfile.gender==="male"?"rgba(59,130,246,0.1)":C.card2, color:curProfile.gender==="male"?C.c:C.text, fontWeight:600, cursor:"pointer"}}>남성</button>
                <button onClick={() => handleProfileChange("gender", "female")}
                  style={{flex:1, padding:"12px", borderRadius:10, border:`1px solid ${curProfile.gender==="female"?"#ec4899":C.border}`, background:curProfile.gender==="female"?"rgba(236,72,153,0.1)":C.card2, color:curProfile.gender==="female"?"#ec4899":C.text, fontWeight:600, cursor:"pointer"}}>여성</button>
              </div>
            </div>

            <NumberStepper label="나이 (세)" field="age" val={curProfile.age} min={10} />
            <NumberStepper label="키 (cm)" field="height" val={curProfile.height} min={100} />
            <NumberStepper label="현재 체중 (kg)" field="weight" val={curProfile.weight} min={30} />

            {/* ✨ 여기에 활동량 UI가 제대로 들어갑니다 */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:13, color:C.sub, marginBottom:6}}>평소 활동량</div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                {[ 
                  {id:1.2, l:"🛋️ 적음"}, 
                  {id:1.375, l:"🚶 보통"}, 
                  {id:1.55, l:"🏃 많음"}, 
                  {id:1.725, l:"🔥 격렬"} 
                ].map(a => (
                  <button key={a.id} onClick={() => handleProfileChange("activity", a.id)}
                    style={{
                      padding:"10px", borderRadius:10, cursor:"pointer", transition:"all 0.2s", fontSize:12, textAlign:"center",
                      border:`1px solid ${curProfile.activity===a.id ? C.cal : C.border}`, 
                      background:curProfile.activity===a.id ? (C.bg==="#080d1a" ? "rgba(249,115,22,0.15)" : "#fff7ed") : C.card2, 
                      color:curProfile.activity===a.id ? C.cal : C.text, fontWeight:curProfile.activity===a.id ? 700 : 500
                    }}>
                    {a.l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:14}}>
              <div style={{fontSize:13, color:C.sub, marginBottom:6}}>다이어트 목표</div>
              <div style={{display:"flex", gap:8}}>
                {[ {id:"cut", l:"🔥 감량"}, {id:"maintain", l:"⚖️ 유지"}, {id:"bulk", l:"💪 벌크업"} ].map(g => (
                  <button key={g.id} onClick={() => handleProfileChange("goal", g.id)}
                    style={{
                      flex:1, padding:"12px", borderRadius:10, cursor:"pointer", transition:"all 0.2s",
                      border:`1px solid ${curProfile.goal===g.id ? C.cal : C.border}`, 
                      background:curProfile.goal===g.id ? (C.bg==="#080d1a" ? "rgba(249,115,22,0.15)" : "#fff7ed") : C.card2, 
                      color:curProfile.goal===g.id ? C.cal : C.text, fontWeight:curProfile.goal===g.id ? 700 : 500
                    }}>
                    {g.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. 목표 수치 수동 조절 (슬라이더) */}
      <div style={card}>
        <div style={{fontSize:15, fontWeight:700, marginBottom:16}}>목표 칼로리 & 매크로 (수동 조절)</div>
        <SliderRow label="목표 칼로리" val={settings.targetCal} min={0} max={4000} step={50} onCommit={v => set("targetCal", v)} color={C.cal} unit="kcal"/>
        <SliderRow label="목표 단백질" val={settings.targetProtein} min={0} max={300} onCommit={v => set("targetProtein", v)} color={C.p} unit="g"/>
        <SliderRow label="목표 탄수화물" val={settings.targetCarbs} min={0} max={500} onCommit={v => set("targetCarbs", v)} color={C.c} unit="g"/>
        <SliderRow label="목표 지방" val={settings.targetFat} min={0} max={200} onCommit={v => set("targetFat", v)} color={C.f} unit="g"/>
      </div>

      {/* 3. 내 프로필 요약 */}
      <div style={card}>
        <div style={{fontSize:15, fontWeight:700, marginBottom:10}}>내 프로필 요약</div>
        <div style={{display:"flex", flexDirection:"column", gap:6, fontSize:13, color:C.sub, lineHeight:1.7}}>
          <div>👤 {curProfile.gender === "female" ? "여성" : "남성"} · {curProfile.age}세 · 키 {curProfile.height}cm · 체중 {curProfile.weight}kg</div>
          <div>🎯 목표: {goalName}</div>
          <div style={{marginTop:6, padding:"8px 12px", background:C.card2, borderRadius:10, fontSize:12, color:C.sub}}>
            일일 목표: <span style={{color:C.cal, fontWeight:600}}>{settings.targetCal}kcal</span> · 단백질 <span style={{color:C.p, fontWeight:600}}>{settings.targetProtein}g</span> · 탄수 <span style={{color:C.c, fontWeight:600}}>{settings.targetCarbs}g</span> · 지방 <span style={{color:C.f, fontWeight:600}}>{settings.targetFat}g</span>
          </div>
        </div>
      </div>

      {/* 4. 앱 설정 */}
      <div style={{...card, marginBottom:0}}>
        <div style={{fontSize:15, fontWeight:700, marginBottom:14}}>앱 설정</div>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", paddingBottom:14, borderBottom:`1px solid ${C.border}`}}>
          <div>
            <div style={{fontSize:14, fontWeight:500}}>다크 모드</div>
            <div style={{fontSize:11, color:C.sub, marginTop:2}}>현재: {settings.dark?"어두운 모드":"밝은 모드"}</div>
          </div>
          <button onClick={()=>set("dark",!settings.dark)}
            style={{width:50, height:28, borderRadius:14, background:settings.dark?C.cal:"#cbd5e1", border:"none", cursor:"pointer", position:"relative", transition:"background 0.3s", flexShrink:0}}>
            <div style={{position:"absolute", top:4, left:settings.dark?24:4, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left 0.3s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
          </button>
        </div>
        <div style={{paddingTop:14}}>
          <div style={{fontSize:14, fontWeight:500, marginBottom:4}}>데이터 초기화</div>
          <div style={{fontSize:11, color:C.sub, marginBottom:10}}>모든 식사 및 운동 기록이 영구 삭제됩니다</div>
          <button onClick={handleReset}
            style={{background:resetDone?"#16a34a":"rgba(239,68,68,0.1)", color:resetDone?"#fff":"#ef4444", border:`1px solid ${resetDone?"#16a34a":"rgba(239,68,68,0.3)"}`, borderRadius:12, padding:"9px 14px", fontWeight:600, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:7, transition:"all 0.3s"}}>
            {resetDone ? <><Check size={14}/> 초기화 완료</> : <><Trash2 size={14}/> 데이터 초기화</>}
          </button>
        </div>
      </div>
    </div>
  );
}