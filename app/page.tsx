"use client";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from "recharts";
import * as XLSX from "xlsx";

const CATEGORIES = ["Food","Housing","Transport","Health","Shopping","Entertainment","Electricity","Water","Internet","Groceries","Allowance","Netflix/Spotify","Miscellaneous","Other"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const COLORS = ["#a855f7","#ec4899","#6366f1","#22c55e","#f59e0b","#ef4444","#3b82f6","#14b8a6","#f97316","#8b5cf6","#06b6d4","#84cc16","#e11d48","#0ea5e9"];
const QUOTES = [
  "Do not save what is left after spending, but spend what is left after saving. — Warren Buffett",
  "A budget is telling your money where to go instead of wondering where it went. — Dave Ramsey",
  "Beware of little expenses. A small leak will sink a great ship. — Benjamin Franklin",
  "The secret to wealth is simple: spend less than you earn. — Thomas Stanley",
  "Financial freedom is available to those who learn about it and work for it. — Robert Kiyosaki",
  "It's not about how much money you make, but how much money you keep.",
  "Save money and money will save you.",
  "Don't work for money, make money work for you.",
  "The best time to save money was yesterday. The next best time is now.",
  "Small savings daily lead to big dreams realized.",
];

const THEMES: Record<string, { name: string; emoji: string; primary: string; secondary: string; gradient: string }> = {
  purple: { name:"Purple", emoji:"💜", primary:"#a855f7", secondary:"#ec4899", gradient:"linear-gradient(135deg,#a855f7,#ec4899)" },
  blue:   { name:"Blue",   emoji:"💙", primary:"#3b82f6", secondary:"#06b6d4", gradient:"linear-gradient(135deg,#3b82f6,#06b6d4)" },
  green:  { name:"Green",  emoji:"💚", primary:"#22c55e", secondary:"#14b8a6", gradient:"linear-gradient(135deg,#22c55e,#14b8a6)" },
  orange: { name:"Orange", emoji:"🧡", primary:"#f97316", secondary:"#ef4444", gradient:"linear-gradient(135deg,#f97316,#ef4444)" },
};

type Expense = { id: string; name: string; amount: number; category: string; date: string; notes: string; recurring: boolean; paid: boolean; };
type MonthData = { salary: number; expenses: Expense[]; savingsGoal: number; };

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [credentials, setCredentials] = useState({ username:"admin", password:"1234" });
  const [tab, setTab] = useState<"dashboard"|"expenses"|"charts"|"settings">("dashboard");
  const [darkMode, setDarkMode] = useState(true);
  const [theme, setTheme] = useState("purple");
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [data, setData] = useState<Record<string, MonthData>>({});
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(today.toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [salaryInput, setSalaryInput] = useState("");
  const [editingSalary, setEditingSalary] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string|null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [sortBy, setSortBy] = useState<"name"|"category"|"amount"|"date">("date");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  const t = THEMES[theme];
  const key = `${currentYear}-${currentMonth}`;
  const monthData: MonthData = data[key] || { salary: 0, expenses: [], savingsGoal: 0 };
  const totalExpenses = monthData.expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = monthData.salary - totalExpenses;
  const actualSavings = remaining > 0 ? remaining : 0;
  const savingsGoal = monthData.savingsGoal || 0;
  const savingsPercent = savingsGoal > 0 ? Math.min((actualSavings / savingsGoal) * 100, 100) : 0;
  const percent = monthData.salary > 0 ? Math.min((totalExpenses / monthData.salary) * 100, 100) : 0;
  const barColor = percent >= 90 ? "#ef4444" : percent >= 70 ? "#f97316" : t.primary;
  const savingsColor = savingsPercent >= 100 ? "#22c55e" : savingsPercent >= 50 ? "#f59e0b" : "#ef4444";
  const daysInMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear() ? today.getDate() : new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyAverage = daysInMonth > 0 ? totalExpenses / daysInMonth : 0;
  const quote = QUOTES[today.getDate() % QUOTES.length];

  const bg = darkMode
    ? { page:"#0a0a14", card:"#13131f", border:"#1f1f35", text:"#f1f5f9", muted:"#64748b", input:"#0d0d1a" }
    : { page:"#f5f5ff", card:"#ffffff", border:"#e0e0f0", text:"#1a1a2e", muted:"#6b7280", input:"#f0f0fa" };

  useEffect(() => {
    const saved = localStorage.getItem("expense-tracker-data");
    if (saved) setData(JSON.parse(saved));
    const session = localStorage.getItem("expense-session");
    if (session === "true") setLoggedIn(true);
    const savedTheme = localStorage.getItem("expense-theme");
    if (savedTheme) setTheme(savedTheme);
    const savedMode = localStorage.getItem("expense-darkmode");
    if (savedMode) setDarkMode(savedMode === "true");
    const savedCreds = localStorage.getItem("expense-credentials");
    if (savedCreds) setCredentials(JSON.parse(savedCreds));
  }, []);

  const save = (newData: Record<string, MonthData>) => {
    setData(newData);
    localStorage.setItem("expense-tracker-data", JSON.stringify(newData));
  };

  const changeTheme = (newTheme: string) => { setTheme(newTheme); localStorage.setItem("expense-theme", newTheme); };
  const toggleDark = () => { const next = !darkMode; setDarkMode(next); localStorage.setItem("expense-darkmode", String(next)); };

  const handleLogin = () => {
    if (loginUser === credentials.username && loginPass === credentials.password) {
      setLoggedIn(true); localStorage.setItem("expense-session", "true"); setLoginError("");
    } else { setLoginError("Wrong username or password!"); }
  };

  const handleLogout = () => { setLoggedIn(false); localStorage.removeItem("expense-session"); };

  const changePassword = () => {
    if (!newUsername || !newPassword) { setPasswordMsg("Please fill in all fields."); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg("Passwords do not match!"); return; }
    const newCreds = { username: newUsername, password: newPassword };
    setCredentials(newCreds);
    localStorage.setItem("expense-credentials", JSON.stringify(newCreds));
    setPasswordMsg("✅ Username and password changed successfully!");
    setNewUsername(""); setNewPassword(""); setConfirmPassword("");
  };

  const saveSalary = () => {
    const val = parseFloat(salaryInput);
    if (!isNaN(val)) save({ ...data, [key]: { ...monthData, salary: val } });
    setEditingSalary(false);
  };

  const saveGoal = () => {
    const val = parseFloat(goalInput);
    if (!isNaN(val)) save({ ...data, [key]: { ...monthData, savingsGoal: val } });
    setEditingGoal(false);
  };

  const addExpense = () => {
    const val = parseFloat(amount);
    if (!name || isNaN(val) || val <= 0) return;
    const expense: Expense = { id: Date.now().toString(), name, amount: val, category, date, notes, recurring, paid: false };
    save({ ...data, [key]: { ...monthData, expenses: [...monthData.expenses, expense] } });
    setName(""); setAmount(""); setNotes(""); setRecurring(false);
  };

  const deleteExpense = (id: string) => {
    save({ ...data, [key]: { ...monthData, expenses: monthData.expenses.filter(e => e.id !== id) } });
  };

  const togglePaid = (id: string) => {
    save({ ...data, [key]: { ...monthData, expenses: monthData.expenses.map(e => e.id === id ? { ...e, paid: !e.paid } : e) } });
  };

  const startEdit = (e: Expense) => {
    setEditingExpense(e.id);
    setEditName(e.name); setEditAmount(String(e.amount)); setEditCategory(e.category); setEditDate(e.date); setEditNotes(e.notes);
  };

  const saveEdit = (id: string) => {
    const val = parseFloat(editAmount);
    if (!editName || isNaN(val)) return;
    save({ ...data, [key]: { ...monthData, expenses: monthData.expenses.map(e => e.id === id ? { ...e, name: editName, amount: val, category: editCategory, date: editDate, notes: editNotes } : e) } });
    setEditingExpense(null);
  };

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y-1); } else setCurrentMonth(m => m-1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y+1); } else setCurrentMonth(m => m+1); };

  const categoryTotals: Record<string, number> = {};
  monthData.expenses.forEach(e => { categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount; });
  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

  const last6: { month: string; income: number; expenses: number; savings: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    let m = currentMonth - i; let y = currentYear;
    if (m < 0) { m += 12; y -= 1; }
    const k = `${y}-${m}`;
    const d = data[k] || { salary: 0, expenses: [], savingsGoal: 0 };
    const exp = d.expenses.reduce((s,e) => s+e.amount, 0);
    last6.push({ month: MONTHS[m].slice(0,3), income: d.salary, expenses: exp, savings: Math.max(d.salary - exp, 0) });
  }

  const exportExcel = () => {
    const rows = monthData.expenses.map(e => ({ Date: e.date, Name: e.name, Category: e.category, Amount: e.amount, Notes: e.notes, Paid: e.paid ? "Yes" : "No", Recurring: e.recurring ? "Yes" : "No" }));
    rows.push({ Date: "", Name: "TOTAL", Category: "", Amount: totalExpenses, Notes: "", Paid: "", Recurring: "" });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, `expenses-${MONTHS[currentMonth]}-${currentYear}.xlsx`);
  };

  const sorted = [...monthData.expenses].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "amount") cmp = a.amount - b.amount;
    else if (sortBy === "name") cmp = a.name.localeCompare(b.name);
    else if (sortBy === "date") cmp = a.date.localeCompare(b.date);
    else cmp = a.category.localeCompare(b.category);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (col: "name"|"category"|"amount"|"date") => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };
  const arrow = (col: string) => sortBy === col ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕";

  const tips: string[] = [];
  if (percent >= 90) tips.push("⚠️ Over 90% of budget used!");
  else if (percent >= 70) tips.push("🟠 Approaching your limit.");
  if (monthData.expenses.length > 0) {
    const top = Object.entries(categoryTotals).sort((a,b) => b[1]-a[1])[0];
    if (top) tips.push(`💡 Most spending: ${top[0]} (₱${top[1].toFixed(2)})`);
  }
  if (savingsGoal > 0 && actualSavings >= savingsGoal) tips.push(`🎉 Savings goal reached!`);
  else if (savingsGoal > 0) tips.push(`🎯 Need ₱${(savingsGoal - actualSavings).toFixed(2)} more to reach savings goal.`);

  const inp = { padding:"10px 12px", borderRadius:8, border:`1px solid ${bg.border}`, background:bg.input, color:bg.text, fontSize:14 };
  const btn = (bg2: string) => ({ padding:"10px 20px", background:bg2, border:"none", color:"#fff", borderRadius:8, cursor:"pointer", fontWeight:"bold" as const, fontSize:14 });

  if (!loggedIn) return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,#0a0a14,#13131f)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
      <div style={{ background:"#13131f", borderRadius:20, padding:40, width:"100%", maxWidth:380, border:`1px solid ${t.primary}44` }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:48 }}>{t.emoji}</div>
          <h1 style={{ color:"#f1f5f9", fontSize:24, fontWeight:"bold", margin:"8px 0 4px" }}>Expense Tracker</h1>
          <p style={{ color:"#64748b", fontSize:13 }}>Sign in to continue</p>
        </div>
        <input value={loginUser} onChange={e => setLoginUser(e.target.value)} placeholder="Username" style={{ ...inp, width:"100%", boxSizing:"border-box" as const, marginBottom:12 }} />
        <input value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="Password" type="password" style={{ ...inp, width:"100%", boxSizing:"border-box" as const, marginBottom:12 }} onKeyDown={e => e.key==="Enter" && handleLogin()} />
        {loginError && <div style={{ color:"#ef4444", fontSize:13, marginBottom:12 }}>{loginError}</div>}
        <button onClick={handleLogin} style={{ ...btn(t.gradient), width:"100%", padding:"12px" }}>Sign In</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:bg.page, color:bg.text, fontFamily:"sans-serif", transition:"all 0.3s" }}>
      <div style={{ background:bg.card, borderBottom:`1px solid ${bg.border}`, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
        <div style={{ fontWeight:"bold", fontSize:18, background:t.gradient, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{t.emoji} Expense Tracker</div>
        <div style={{ display:"flex", gap:8 }}>
          {(["dashboard","expenses","charts","settings"] as const).map(tt => (
            <button key={tt} onClick={() => setTab(tt)} style={{ padding:"6px 16px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:"bold", fontSize:13, background: tab===tt ? t.gradient : "transparent", color: tab===tt ? "#fff" : bg.muted }}>{tt.charAt(0).toUpperCase()+tt.slice(1)}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {Object.entries(THEMES).map(([k, th]) => (
            <button key={k} onClick={() => changeTheme(k)} title={th.name} style={{ width:24, height:24, borderRadius:"50%", background:th.gradient, border: theme===k ? "3px solid #fff" : "2px solid transparent", cursor:"pointer", padding:0 }} />
          ))}
          <button onClick={toggleDark} style={{ ...btn(bg.border), padding:"6px 12px", marginLeft:4 }}>{darkMode ? "☀️" : "🌙"}</button>
          <button onClick={handleLogout} style={{ ...btn("#334155"), padding:"6px 14px" }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"24px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:20, marginBottom:24 }}>
          <button onClick={prevMonth} style={{ background:bg.card, border:`1px solid ${bg.border}`, color:bg.text, padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:18 }}>◀</button>
          <span style={{ fontSize:20, fontWeight:"bold" }}>{MONTHS[currentMonth]} {currentYear}</span>
          <button onClick={nextMonth} style={{ background:bg.card, border:`1px solid ${bg.border}`, color:bg.text, padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:18 }}>▶</button>
        </div>

        {tab === "dashboard" && <>
          {/* Daily Quote */}
          <div style={{ background:t.gradient, borderRadius:12, padding:"16px 20px", marginBottom:16, opacity:0.9 }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", marginBottom:4 }}>💬 QUOTE OF THE DAY</div>
            <div style={{ fontSize:13, color:"#fff", fontStyle:"italic" }}>{quote}</div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:16 }}>
            {[
              { label:"Monthly Salary", value:`₱${monthData.salary.toFixed(2)}`, color:"#22c55e" },
              { label:"Total Spent", value:`₱${totalExpenses.toFixed(2)}`, color:"#f87171" },
              { label:"Remaining", value:`₱${remaining.toFixed(2)}`, color: remaining>=0?t.primary:"#ef4444" },
              { label:"Actual Savings", value:`₱${actualSavings.toFixed(2)}`, color:t.secondary },
              { label:"Daily Average", value:`₱${dailyAverage.toFixed(2)}/day`, color:"#f59e0b" },
            ].map(c => (
              <div key={c.label} style={{ background:bg.card, borderRadius:12, padding:16, border:`1px solid ${bg.border}` }}>
                <div style={{ fontSize:11, color:bg.muted, marginBottom:4 }}>{c.label}</div>
                <div style={{ fontSize:18, fontWeight:"bold", color:c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {monthData.salary > 0 && <div style={{ background:bg.card, borderRadius:12, padding:20, marginBottom:16, border:`1px solid ${bg.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13, color:bg.muted }}>
              <span>Budget used</span><span style={{ color:barColor }}>{percent.toFixed(0)}%</span>
            </div>
            <div style={{ background:bg.border, borderRadius:999, height:12 }}>
              <div style={{ width:`${percent}%`, background:barColor, height:12, borderRadius:999, transition:"width 0.4s" }} />
            </div>
          </div>}

          <div style={{ background:bg.card, borderRadius:12, padding:20, marginBottom:16, border: savingsPercent >= 100 ? "1px solid #22c55e" : `1px solid ${bg.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontWeight:"bold", fontSize:16 }}>🎯 Savings Goal</div>
              {savingsPercent >= 100 && <span style={{ background:"#22c55e22", color:"#22c55e", padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:"bold" }}>🎉 Goal Reached!</span>}
            </div>
            {editingGoal ? (
              <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                <input value={goalInput} onChange={e => setGoalInput(e.target.value)} placeholder="Enter savings goal" type="number" style={{ ...inp, flex:1 }} />
                <button onClick={saveGoal} style={btn(t.gradient)}>Save</button>
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <span style={{ fontSize:24, fontWeight:"bold", color:t.primary }}>₱{savingsGoal.toFixed(2)}</span>
                <button onClick={() => { setGoalInput(savingsGoal.toString()); setEditingGoal(true); }} style={btn(bg.border)}>Edit</button>
              </div>
            )}
            {savingsGoal > 0 && <>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13, color:bg.muted }}>
                <span>₱{actualSavings.toFixed(2)} of ₱{savingsGoal.toFixed(2)}</span>
                <span style={{ color:savingsColor }}>{savingsPercent.toFixed(0)}%</span>
              </div>
              <div style={{ background:bg.border, borderRadius:999, height:16 }}>
                <div style={{ width:`${savingsPercent}%`, background:savingsColor, height:16, borderRadius:999, transition:"width 0.4s" }} />
              </div>
            </>}
          </div>

          {tips.length > 0 && <div style={{ background:bg.card, borderRadius:12, padding:16, marginBottom:16, border:`1px solid ${bg.border}`, display:"flex", gap:16, flexWrap:"wrap" as const }}>
            {tips.map((tip,i) => <span key={i} style={{ fontSize:13 }}>{tip}</span>)}
          </div>}

          <div style={{ background:bg.card, borderRadius:12, padding:20, marginBottom:16, border:`1px solid ${bg.border}` }}>
            <div style={{ fontWeight:"bold", marginBottom:12 }}>💼 Set Salary</div>
            {editingSalary ? (
              <div style={{ display:"flex", gap:8 }}>
                <input value={salaryInput} onChange={e => setSalaryInput(e.target.value)} placeholder="Enter salary" style={{ ...inp, flex:1 }} />
                <button onClick={saveSalary} style={btn(t.gradient)}>Save</button>
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:28, fontWeight:"bold", color:"#22c55e" }}>₱{monthData.salary.toFixed(2)}</span>
                <button onClick={() => { setSalaryInput(monthData.salary.toString()); setEditingSalary(true); }} style={btn(bg.border)}>Edit</button>
              </div>
            )}
          </div>

          <div style={{ background:bg.card, borderRadius:12, padding:20, border:`1px solid ${bg.border}` }}>
            <div style={{ fontWeight:"bold", marginBottom:12 }}>➕ Add Expense</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Expense name" style={inp} />
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (₱)" type="number" style={inp} />
              <select value={category} onChange={e => setCategory(e.target.value)} style={inp}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <input value={date} onChange={e => setDate(e.target.value)} type="date" style={inp} />
            </div>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...inp, width:"100%", boxSizing:"border-box" as const, marginBottom:8 }} />
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, fontSize:14 }}>
              <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
              <label>🔁 Recurring (auto-adds every month)</label>
            </div>
            <button onClick={addExpense} style={{ ...btn(t.gradient), width:"100%" }}>+ Add Expense</button>
          </div>
        </>}

        {tab === "expenses" && <>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <button onClick={exportExcel} style={btn("#22c55e")}>⬇ Export Excel</button>
          </div>
          {monthData.expenses.length === 0 ? <div style={{ textAlign:"center", color:bg.muted, padding:40 }}>No expenses this month yet.</div> :
          <div style={{ background:bg.card, borderRadius:12, overflow:"hidden", border:`1px solid ${bg.border}` }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  {[["#",""],["Date","date"],["Name","name"],["Category","category"],["Amount","amount"],["Notes",""],["Paid",""]].map(([label,col]) => (
                    <th key={label} onClick={() => col && toggleSort(col as "name"|"category"|"amount"|"date")} style={{ padding:"12px 16px", textAlign:"left", cursor:col?"pointer":"default", background:bg.page, color:bg.muted, fontSize:12, borderBottom:`2px solid ${bg.border}`, userSelect:"none" }}>
                      {label}{col ? arrow(col) : ""}
                    </th>
                  ))}
                  <th style={{ padding:"12px 16px", background:bg.page, borderBottom:`2px solid ${bg.border}` }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e,i) => (
                  editingExpense === e.id ? (
                    <tr key={e.id} style={{ background: i%2===0?bg.card:bg.input }}>
                      <td colSpan={8} style={{ padding:"10px 16px" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:8 }}>
                          <input value={editName} onChange={e => setEditName(e.target.value)} style={inp} placeholder="Name" />
                          <input value={editAmount} onChange={e => setEditAmount(e.target.value)} type="number" style={inp} placeholder="Amount" />
                          <select value={editCategory} onChange={e => setEditCategory(e.target.value)} style={inp}>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                          <input value={editDate} onChange={e => setEditDate(e.target.value)} type="date" style={inp} />
                        </div>
                        <input value={editNotes} onChange={ev => setEditNotes(ev.target.value)} placeholder="Notes" style={{ ...inp, width:"100%", boxSizing:"border-box" as const, marginBottom:8 }} />
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={() => saveEdit(e.id)} style={btn(t.gradient)}>Save</button>
                          <button onClick={() => setEditingExpense(null)} style={btn(bg.border)}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={e.id} style={{ background: e.paid ? (darkMode?"#0d2010":"#f0fff4") : i%2===0?bg.card:bg.input, opacity: e.paid ? 0.7 : 1 }}>
                      <td style={{ padding:"10px 16px", color:bg.muted, fontSize:13 }}>{i+1}</td>
                      <td style={{ padding:"10px 16px", fontSize:13, color:bg.muted }}>{e.date}</td>
                      <td style={{ padding:"10px 16px", fontSize:14, textDecoration: e.paid?"line-through":"none" }}>{e.name}{e.recurring && <span style={{ fontSize:11, color:t.primary, marginLeft:6 }}>🔁</span>}</td>
                      <td style={{ padding:"10px 16px" }}><span style={{ background:COLORS[CATEGORIES.indexOf(e.category)%COLORS.length]+"33", color:COLORS[CATEGORIES.indexOf(e.category)%COLORS.length], padding:"3px 10px", borderRadius:999, fontSize:12 }}>{e.category}</span></td>
                      <td style={{ padding:"10px 16px", color:"#f87171", fontWeight:"bold" }}>₱{e.amount.toFixed(2)}</td>
                      <td style={{ padding:"10px 16px", fontSize:12, color:bg.muted }}>{e.notes}</td>
                      <td style={{ padding:"10px 16px", textAlign:"center" }}>
                        <button onClick={() => togglePaid(e.id)} style={{ background: e.paid?"#22c55e":"transparent", border:`1px solid ${e.paid?"#22c55e":bg.border}`, color: e.paid?"#fff":bg.muted, padding:"4px 10px", borderRadius:6, cursor:"pointer", fontSize:12 }}>{e.paid?"✅ Paid":"Mark Paid"}</button>
                      </td>
                      <td style={{ padding:"10px 16px", textAlign:"center", display:"flex", gap:6 }}>
                        <button onClick={() => startEdit(e)} style={{ background:"none", border:"none", color:t.primary, cursor:"pointer", fontSize:16 }}>✏️</button>
                        <button onClick={() => deleteExpense(e.id)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:16 }}>✕</button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:bg.page }}>
                  <td colSpan={4} style={{ padding:"12px 16px", fontWeight:"bold", color:bg.muted }}>TOTAL</td>
                  <td style={{ padding:"12px 16px", fontWeight:"bold", color:"#f87171", fontSize:16 }}>₱{totalExpenses.toFixed(2)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>}
        </>}

        {tab === "charts" && <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
            <div style={{ background:bg.card, borderRadius:12, padding:20, border:`1px solid ${bg.border}` }}>
              <div style={{ fontWeight:"bold", marginBottom:16 }}>🥧 Spending by Category</div>
              {pieData.length === 0 ? <div style={{ color:bg.muted, textAlign:"center", padding:40 }}>No data yet</div> :
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent: p }) => `${name} ${((p||0)*100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `₱${v.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>}
            </div>
            <div style={{ background:bg.card, borderRadius:12, padding:20, border:`1px solid ${bg.border}` }}>
              <div style={{ fontWeight:"bold", marginBottom:16 }}>📊 Income vs Expenses vs Savings</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={last6}>
                  <XAxis dataKey="month" stroke={bg.muted} fontSize={12} />
                  <YAxis stroke={bg.muted} fontSize={12} />
                  <Tooltip formatter={(v: number) => `₱${v.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4,4,0,0]} />
                  <Bar dataKey="expenses" fill="#f87171" name="Expenses" radius={[4,4,0,0]} />
                  <Bar dataKey="savings" fill={t.primary} name="Savings" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {Object.keys(categoryTotals).length > 0 && <div style={{ background:bg.card, borderRadius:12, padding:20, marginTop:16, border:`1px solid ${bg.border}` }}>
            <div style={{ fontWeight:"bold", marginBottom:12 }}>📋 Category Breakdown</div>
            {Object.entries(categoryTotals).sort((a,b)=>b[1]-a[1]).map(([cat,total],i) => (
              <div key={cat} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <span style={{ width:130, fontSize:13 }}>{cat}</span>
                <div style={{ flex:1, background:bg.border, borderRadius:999, height:10 }}>
                  <div style={{ width:`${(total/totalExpenses)*100}%`, background:COLORS[i%COLORS.length], height:10, borderRadius:999 }} />
                </div>
                <span style={{ width:90, textAlign:"right", fontSize:13, color:"#f87171", fontWeight:"bold" }}>₱{total.toFixed(2)}</span>
              </div>
            ))}
          </div>}
        </>}

        {tab === "settings" && <>
          <div style={{ background:bg.card, borderRadius:12, padding:24, border:`1px solid ${bg.border}`, maxWidth:480 }}>
            <div style={{ fontWeight:"bold", fontSize:18, marginBottom:20 }}>🔑 Change Username & Password</div>
            <div style={{ fontSize:13, color:bg.muted, marginBottom:16 }}>Current username: <strong style={{ color:bg.text }}>{credentials.username}</strong></div>
            <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="New username" style={{ ...inp, width:"100%", boxSizing:"border-box" as const, marginBottom:12 }} />
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" type="password" style={{ ...inp, width:"100%", boxSizing:"border-box" as const, marginBottom:12 }} />
            <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" type="password" style={{ ...inp, width:"100%", boxSizing:"border-box" as const, marginBottom:16 }} />
            {passwordMsg && <div style={{ fontSize:13, marginBottom:12, color: passwordMsg.includes("✅") ? "#22c55e" : "#ef4444" }}>{passwordMsg}</div>}
            <button onClick={changePassword} style={{ ...btn(t.gradient), width:"100%" }}>Save New Password</button>
          </div>
        </>}
      </div>
    </div>
  );
}