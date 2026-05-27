"use client";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from "recharts";
import * as XLSX from "xlsx";

const CATEGORIES = ["Food","Housing","Transport","Health","Shopping","Entertainment","Electricity","Water","Internet","Groceries","Allowance","Netflix/Spotify","Miscellaneous","Other"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const COLORS = ["#a855f7","#ec4899","#6366f1","#22c55e","#f59e0b","#ef4444","#3b82f6","#14b8a6","#f97316","#8b5cf6","#06b6d4","#84cc16","#e11d48","#0ea5e9"];

type Expense = { id: string; name: string; amount: number; category: string; date: string; notes: string; recurring: boolean; };
type MonthData = { salary: number; expenses: Expense[]; savingsGoal: number; };

const DEFAULT_USER = { username: "admin", password: "1234" };

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<"dashboard"|"expenses"|"charts">("dashboard");
  const [darkMode, setDarkMode] = useState(true);
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
  const [sortBy, setSortBy] = useState<"name"|"category"|"amount"|"date">("date");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");

  const key = `${currentYear}-${currentMonth}`;
  const monthData: MonthData = data[key] || { salary: 0, expenses: [], savingsGoal: 0 };
  const totalExpenses = monthData.expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = monthData.salary - totalExpenses;
  const actualSavings = remaining > 0 ? remaining : 0;
  const savingsGoal = monthData.savingsGoal || 0;
  const savingsPercent = savingsGoal > 0 ? Math.min((actualSavings / savingsGoal) * 100, 100) : 0;
  const percent = monthData.salary > 0 ? Math.min((totalExpenses / monthData.salary) * 100, 100) : 0;
  const barColor = percent >= 90 ? "#ef4444" : percent >= 70 ? "#f97316" : "#a855f7";
  const savingsColor = savingsPercent >= 100 ? "#22c55e" : savingsPercent >= 50 ? "#f59e0b" : "#ef4444";

  const bg = darkMode ? { page:"#0f0a1e", card:"#1a1033", border:"#2d1f4e", text:"#f1f5f9", muted:"#94a3b8", input:"#0d0820" } : { page:"#f8f5ff", card:"#ffffff", border:"#e2d9f3", text:"#1e1035", muted:"#6b7280", input:"#f3f0ff" };

  useEffect(() => {
    const saved = localStorage.getItem("expense-tracker-data");
    if (saved) setData(JSON.parse(saved));
    const session = localStorage.getItem("expense-session");
    if (session === "true") setLoggedIn(true);
    // Auto-add recurring expenses for current month
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    const allKeys = Object.keys(data);
    const recurringExpenses: Expense[] = [];
    allKeys.forEach(k => {
      data[k].expenses.forEach(e => {
        if (e.recurring) {
          const alreadyExists = (data[key]?.expenses || []).some(ex => ex.name === e.name && ex.recurring);
          if (!alreadyExists) recurringExpenses.push({ ...e, id: Date.now().toString() + Math.random(), date: today.toISOString().split("T")[0] });
        }
      });
    });
    if (recurringExpenses.length > 0) {
      const deduped = recurringExpenses.filter((e, i, arr) => arr.findIndex(x => x.name === e.name) === i);
      const current = data[key] || { salary: 0, expenses: [], savingsGoal: 0 };
      const newExpenses = deduped.filter(e => !current.expenses.some(ex => ex.name === e.name && ex.recurring));
      if (newExpenses.length > 0) {
        save({ ...data, [key]: { ...current, expenses: [...current.expenses, ...newExpenses] } });
      }
    }
  }, [loggedIn, key]);

  const save = (newData: Record<string, MonthData>) => {
    setData(newData);
    localStorage.setItem("expense-tracker-data", JSON.stringify(newData));
  };

  const handleLogin = () => {
    if (loginUser === DEFAULT_USER.username && loginPass === DEFAULT_USER.password) {
      setLoggedIn(true);
      localStorage.setItem("expense-session", "true");
      setLoginError("");
    } else { setLoginError("Wrong username or password!"); }
  };

  const handleLogout = () => { setLoggedIn(false); localStorage.removeItem("expense-session"); };

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
    const expense: Expense = { id: Date.now().toString(), name, amount: val, category, date, notes, recurring };
    save({ ...data, [key]: { ...monthData, expenses: [...monthData.expenses, expense] } });
    setName(""); setAmount(""); setNotes(""); setRecurring(false);
  };

  const deleteExpense = (id: string) => {
    save({ ...data, [key]: { ...monthData, expenses: monthData.expenses.filter(e => e.id !== id) } });
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
    const rows = monthData.expenses.map(e => ({ Date: e.date, Name: e.name, Category: e.category, Amount: e.amount, Notes: e.notes, Recurring: e.recurring ? "Yes" : "No" }));
    rows.push({ Date: "", Name: "TOTAL", Category: "", Amount: totalExpenses, Notes: "", Recurring: "" });
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
  if (savingsGoal > 0 && actualSavings >= savingsGoal) tips.push(`🎉 Savings goal reached! You saved ₱${actualSavings.toFixed(2)}!`);
  else if (savingsGoal > 0) tips.push(`🎯 Need ₱${(savingsGoal - actualSavings).toFixed(2)} more to reach savings goal.`);

  const inp = { padding:"10px 12px", borderRadius:8, border:`1px solid ${bg.border}`, background:bg.input, color:bg.text, fontSize:14 };
  const btn = (bg2: string) => ({ padding:"10px 20px", background:bg2, border:"none", color:"#fff", borderRadius:8, cursor:"pointer", fontWeight:"bold" as const, fontSize:14 });

  if (!loggedIn) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f0a1e,#1a0533,#2d1f4e)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
      <div style={{ background:"#1a1033", borderRadius:20, padding:40, width:"100%", maxWidth:380, border:"1px solid #2d1f4e" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:48 }}>💜</div>
          <h1 style={{ color:"#f1f5f9", fontSize:24, fontWeight:"bold", margin:"8px 0 4px" }}>Expense Tracker</h1>
          <p style={{ color:"#94a3b8", fontSize:13 }}>Sign in to continue</p>
        </div>
        <input value={loginUser} onChange={e => setLoginUser(e.target.value)} placeholder="Username" style={{ ...inp, width:"100%", boxSizing:"border-box" as const, marginBottom:12 }} />
        <input value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="Password" type="password" style={{ ...inp, width:"100%", boxSizing:"border-box" as const, marginBottom:12 }} onKeyDown={e => e.key==="Enter" && handleLogin()} />
        {loginError && <div style={{ color:"#ef4444", fontSize:13, marginBottom:12 }}>{loginError}</div>}
        <button onClick={handleLogin} style={{ ...btn("linear-gradient(135deg,#a855f7,#ec4899)"), width:"100%", padding:"12px" }}>Sign In</button>
        <p style={{ color:"#475569", fontSize:12, textAlign:"center", marginTop:16 }}>Default: admin / 1234</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:bg.page, color:bg.text, fontFamily:"sans-serif", transition:"all 0.3s" }}>
      <div style={{ background:bg.card, borderBottom:`1px solid ${bg.border}`, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
        <div style={{ fontWeight:"bold", fontSize:18, background:"linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>💜 Expense Tracker</div>
        <div style={{ display:"flex", gap:8 }}>
          {(["dashboard","expenses","charts"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding:"6px 16px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:"bold", fontSize:13, background: tab===t ? "linear-gradient(135deg,#a855f7,#ec4899)" : "transparent", color: tab===t ? "#fff" : bg.muted }}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => setDarkMode(d => !d)} style={{ ...btn(bg.border), padding:"6px 14px" }}>{darkMode ? "☀️" : "🌙"}</button>
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
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:16 }}>
            {[
              { label:"Monthly Salary", value:`₱${monthData.salary.toFixed(2)}`, color:"#22c55e" },
              { label:"Total Spent", value:`₱${totalExpenses.toFixed(2)}`, color:"#f87171" },
              { label:"Remaining", value:`₱${remaining.toFixed(2)}`, color: remaining>=0?"#a855f7":"#ef4444" },
              { label:"Actual Savings", value:`₱${actualSavings.toFixed(2)}`, color:"#ec4899" },
            ].map(c => (
              <div key={c.label} style={{ background:bg.card, borderRadius:12, padding:20, border:`1px solid ${bg.border}` }}>
                <div style={{ fontSize:12, color:bg.muted, marginBottom:4 }}>{c.label}</div>
                <div style={{ fontSize:22, fontWeight:"bold", color:c.color }}>{c.value}</div>
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
                <button onClick={saveGoal} style={btn("linear-gradient(135deg,#a855f7,#ec4899)")}>Save</button>
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <span style={{ fontSize:24, fontWeight:"bold", color:"#a855f7" }}>₱{savingsGoal.toFixed(2)}</span>
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
            {tips.map((t,i) => <span key={i} style={{ fontSize:13 }}>{t}</span>)}
          </div>}

          <div style={{ background:bg.card, borderRadius:12, padding:20, marginBottom:16, border:`1px solid ${bg.border}` }}>
            <div style={{ fontWeight:"bold", marginBottom:12 }}>💼 Set Salary</div>
            {editingSalary ? (
              <div style={{ display:"flex", gap:8 }}>
                <input value={salaryInput} onChange={e => setSalaryInput(e.target.value)} placeholder="Enter salary" style={{ ...inp, flex:1 }} />
                <button onClick={saveSalary} style={btn("linear-gradient(135deg,#a855f7,#ec4899)")}>Save</button>
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
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Expense name" style={{ ...inp }} />
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (₱)" type="number" style={{ ...inp }} />
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inp }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <input value={date} onChange={e => setDate(e.target.value)} type="date" style={{ ...inp }} />
            </div>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...inp, width:"100%", boxSizing:"border-box" as const, marginBottom:8 }} />
            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:12 }}>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14 }}>
                <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
                🔁 Recurring (auto-adds every month)
              </label>
            </div>
            <button onClick={addExpense} style={{ ...btn("linear-gradient(135deg,#a855f7,#ec4899)"), width:"100%" }}>+ Add Expense</button>
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
                  {[["#",""],["Date","date"],["Name","name"],["Category","category"],["Amount","amount"],["Notes",""]].map(([label,col]) => (
                    <th key={label} onClick={() => col && toggleSort(col as "name"|"category"|"amount"|"date")} style={{ padding:"12px 16px", textAlign:"left", cursor:col?"pointer":"default", background:bg.page, color:bg.muted, fontSize:12, borderBottom:`2px solid ${bg.border}`, userSelect:"none" }}>
                      {label}{col ? arrow(col) : ""}
                    </th>
                  ))}
                  <th style={{ padding:"12px 16px", background:bg.page, borderBottom:`2px solid ${bg.border}` }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e,i) => (
                  <tr key={e.id} style={{ background: i%2===0?bg.card:bg.input }}>
                    <td style={{ padding:"10px 16px", color:bg.muted, fontSize:13 }}>{i+1}</td>
                    <td style={{ padding:"10px 16px", fontSize:13, color:bg.muted }}>{e.date}</td>
                    <td style={{ padding:"10px 16px", fontSize:14 }}>{e.name} {e.recurring && <span style={{ fontSize:11, color:"#a855f7" }}>🔁</span>}</td>
                    <td style={{ padding:"10px 16px" }}><span style={{ background:COLORS[CATEGORIES.indexOf(e.category)%COLORS.length]+"33", color:COLORS[CATEGORIES.indexOf(e.category)%COLORS.length], padding:"3px 10px", borderRadius:999, fontSize:12 }}>{e.category}</span></td>
                    <td style={{ padding:"10px 16px", color:"#f87171", fontWeight:"bold" }}>₱{e.amount.toFixed(2)}</td>
                    <td style={{ padding:"10px 16px", fontSize:12, color:bg.muted }}>{e.notes}</td>
                    <td style={{ padding:"10px 16px", textAlign:"center" }}><button onClick={() => deleteExpense(e.id)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:16 }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:bg.page }}>
                  <td colSpan={4} style={{ padding:"12px 16px", fontWeight:"bold", color:bg.muted }}>TOTAL</td>
                  <td style={{ padding:"12px 16px", fontWeight:"bold", color:"#f87171", fontSize:16 }}>₱{totalExpenses.toFixed(2)}</td>
                  <td colSpan={2}></td>
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
                  <Bar dataKey="savings" fill="#a855f7" name="Savings" radius={[4,4,0,0]} />
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
      </div>
    </div>
  );
}