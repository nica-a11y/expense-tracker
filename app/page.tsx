"use client";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from "recharts";
import * as XLSX from "xlsx";

const CATEGORIES = ["Food","Housing","Transport","Health","Shopping","Entertainment","Electricity","Water","Internet","Groceries","Allowance","Netflix/Spotify","Miscellaneous","Other"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const COLORS = ["#6366f1","#22c55e","#f59e0b","#ef4444","#3b82f6","#ec4899","#14b8a6","#f97316","#8b5cf6","#06b6d4","#84cc16","#e11d48","#0ea5e9","#a855f7"];

type Expense = { id: string; name: string; amount: number; category: string; };
type MonthData = { salary: number; expenses: Expense[]; };

const DEFAULT_USER = { username: "admin", password: "1234" };

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<"dashboard"|"expenses"|"charts">("dashboard");
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [data, setData] = useState<Record<string, MonthData>>({});
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [salaryInput, setSalaryInput] = useState("");
  const [editingSalary, setEditingSalary] = useState(false);
  const [sortBy, setSortBy] = useState<"name"|"category"|"amount">("category");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");

  const key = `${currentYear}-${currentMonth}`;
  const monthData: MonthData = data[key] || { salary: 0, expenses: [] };
  const totalExpenses = monthData.expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = monthData.salary - totalExpenses;
  const percent = monthData.salary > 0 ? Math.min((totalExpenses / monthData.salary) * 100, 100) : 0;
  const barColor = percent >= 90 ? "#ef4444" : percent >= 70 ? "#f97316" : "#22c55e";

  useEffect(() => {
    const saved = localStorage.getItem("expense-tracker-data");
    if (saved) setData(JSON.parse(saved));
    const session = localStorage.getItem("expense-session");
    if (session === "true") setLoggedIn(true);
  }, []);

  const save = (newData: Record<string, MonthData>) => {
    setData(newData);
    localStorage.setItem("expense-tracker-data", JSON.stringify(newData));
  };

  const handleLogin = () => {
    if (loginUser === DEFAULT_USER.username && loginPass === DEFAULT_USER.password) {
      setLoggedIn(true);
      localStorage.setItem("expense-session", "true");
      setLoginError("");
    } else {
      setLoginError("Wrong username or password!");
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    localStorage.removeItem("expense-session");
  };

  const saveSalary = () => {
    const val = parseFloat(salaryInput);
    if (!isNaN(val)) save({ ...data, [key]: { ...monthData, salary: val } });
    setEditingSalary(false);
  };

  const addExpense = () => {
    const val = parseFloat(amount);
    if (!name || isNaN(val) || val <= 0) return;
    const expense: Expense = { id: Date.now().toString(), name, amount: val, category };
    save({ ...data, [key]: { ...monthData, expenses: [...monthData.expenses, expense] } });
    setName(""); setAmount("");
  };

  const deleteExpense = (id: string) => {
    save({ ...data, [key]: { ...monthData, expenses: monthData.expenses.filter(e => e.id !== id) } });
  };

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y-1); } else setCurrentMonth(m => m-1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y+1); } else setCurrentMonth(m => m+1); };

  const categoryTotals: Record<string, number> = {};
  monthData.expenses.forEach(e => { categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount; });
  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

  const last6: { month: string; income: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    let m = currentMonth - i; let y = currentYear;
    if (m < 0) { m += 12; y -= 1; }
    const k = `${y}-${m}`;
    const d = data[k] || { salary: 0, expenses: [] };
    last6.push({ month: MONTHS[m].slice(0,3), income: d.salary, expenses: d.expenses.reduce((s,e) => s+e.amount, 0) });
  }

  const exportExcel = () => {
    const rows = monthData.expenses.map(e => ({ Name: e.name, Category: e.category, Amount: e.amount }));
    rows.push({ Name: "TOTAL", Category: "", Amount: totalExpenses });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, `expenses-${MONTHS[currentMonth]}-${currentYear}.xlsx`);
  };

  const sorted = [...monthData.expenses].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "amount") cmp = a.amount - b.amount;
    else if (sortBy === "name") cmp = a.name.localeCompare(b.name);
    else cmp = a.category.localeCompare(b.category);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (col: "name"|"category"|"amount") => {
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
  if (remaining > 0 && percent < 50) tips.push(`✅ ₱${remaining.toFixed(2)} left this month!`);

  const s = { btn: (bg: string) => ({ padding:"10px 22px", background:bg, border:"none", color:"#fff", borderRadius:8, cursor:"pointer", fontWeight:"bold" as const, fontSize:14 }) };

  if (!loggedIn) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a,#1e293b)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
      <div style={{ background:"#1e293b", borderRadius:20, padding:40, width:"100%", maxWidth:380, boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:48 }}>💰</div>
          <h1 style={{ color:"#fff", fontSize:24, fontWeight:"bold", margin:"8px 0 4px" }}>Expense Tracker</h1>
          <p style={{ color:"#64748b", fontSize:13 }}>Sign in to continue</p>
        </div>
        <input value={loginUser} onChange={e => setLoginUser(e.target.value)} placeholder="Username" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #2d3748", background:"#1a202c", color:"#fff", fontSize:15, boxSizing:"border-box", marginBottom:12 }} />
        <input value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="Password" type="password" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #2d3748", background:"#1a202c", color:"#fff", fontSize:15, boxSizing:"border-box", marginBottom:12 }} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        {loginError && <div style={{ color:"#ef4444", fontSize:13, marginBottom:12 }}>{loginError}</div>}
        <button onClick={handleLogin} style={{ ...s.btn("#6366f1"), width:"100%", padding:"12px" }}>Sign In</button>
        <p style={{ color:"#475569", fontSize:12, textAlign:"center", marginTop:16 }}>Default: admin / 1234</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", color:"#f1f5f9", fontFamily:"sans-serif" }}>
      <div style={{ background:"#1e293b", borderBottom:"1px solid #334155", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
        <div style={{ fontWeight:"bold", fontSize:18 }}>💰 Expense Tracker</div>
        <div style={{ display:"flex", gap:8 }}>
          {(["dashboard","expenses","charts"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding:"6px 16px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:"bold", fontSize:13, background: tab===t ? "#6366f1" : "transparent", color: tab===t ? "#fff" : "#94a3b8" }}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
        <button onClick={handleLogout} style={{ ...s.btn("#334155"), padding:"6px 14px" }}>Logout</button>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"24px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:20, marginBottom:24 }}>
          <button onClick={prevMonth} style={{ background:"#1e293b", border:"none", color:"#fff", padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:18 }}>◀</button>
          <span style={{ fontSize:20, fontWeight:"bold" }}>{MONTHS[currentMonth]} {currentYear}</span>
          <button onClick={nextMonth} style={{ background:"#1e293b", border:"none", color:"#fff", padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:18 }}>▶</button>
        </div>

        {tab === "dashboard" && <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, marginBottom:16 }}>
            {[
              { label:"Monthly Salary", value:`₱${monthData.salary.toFixed(2)}`, color:"#22c55e" },
              { label:"Total Spent", value:`₱${totalExpenses.toFixed(2)}`, color:"#f87171" },
              { label:"Remaining", value:`₱${remaining.toFixed(2)}`, color: remaining>=0?"#22c55e":"#ef4444" },
              { label:"Expenses", value:`${monthData.expenses.length} items`, color:"#6366f1" },
            ].map(c => (
              <div key={c.label} style={{ background:"#1e293b", borderRadius:12, padding:20 }}>
                <div style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>{c.label}</div>
                <div style={{ fontSize:22, fontWeight:"bold", color:c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
          {monthData.salary > 0 && <div style={{ background:"#1e293b", borderRadius:12, padding:20, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13, color:"#94a3b8" }}>
              <span>Budget used</span><span style={{ color:barColor }}>{percent.toFixed(0)}%</span>
            </div>
            <div style={{ background:"#334155", borderRadius:999, height:12 }}>
              <div style={{ width:`${percent}%`, background:barColor, height:12, borderRadius:999, transition:"width 0.4s" }} />
            </div>
          </div>}
          {tips.length > 0 && <div style={{ background:"#1e293b", borderRadius:12, padding:16, marginBottom:16, display:"flex", gap:16, flexWrap:"wrap" as const }}>
            {tips.map((t,i) => <span key={i} style={{ fontSize:13 }}>{t}</span>)}
          </div>}
          <div style={{ background:"#1e293b", borderRadius:12, padding:20, marginBottom:16 }}>
            <div style={{ fontWeight:"bold", marginBottom:12 }}>💼 Set Salary</div>
            {editingSalary ? (
              <div style={{ display:"flex", gap:8 }}>
                <input value={salaryInput} onChange={e => setSalaryInput(e.target.value)} placeholder="Enter salary" style={{ flex:1, padding:"8px 12px", borderRadius:8, border:"1px solid #334155", background:"#0f172a", color:"#fff", fontSize:15 }} />
                <button onClick={saveSalary} style={s.btn("#6366f1")}>Save</button>
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:28, fontWeight:"bold", color:"#22c55e" }}>₱{monthData.salary.toFixed(2)}</span>
                <button onClick={() => { setSalaryInput(monthData.salary.toString()); setEditingSalary(true); }} style={s.btn("#334155")}>Edit</button>
              </div>
            )}
          </div>
          <div style={{ background:"#1e293b", borderRadius:12, padding:20 }}>
            <div style={{ fontWeight:"bold", marginBottom:12 }}>➕ Add Expense</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Expense name" style={{ flex:2, minWidth:140, padding:"10px 12px", borderRadius:8, border:"1px solid #334155", background:"#0f172a", color:"#fff", fontSize:14 }} />
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (₱)" type="number" style={{ flex:1, minWidth:100, padding:"10px 12px", borderRadius:8, border:"1px solid #334155", background:"#0f172a", color:"#fff", fontSize:14 }} />
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ flex:1, minWidth:120, padding:"10px 12px", borderRadius:8, border:"1px solid #334155", background:"#0f172a", color:"#fff", fontSize:14 }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <button onClick={addExpense} style={s.btn("#6366f1")}>+ Add</button>
            </div>
          </div>
        </>}

        {tab === "expenses" && <>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <button onClick={exportExcel} style={s.btn("#22c55e")}>⬇ Export Excel</button>
          </div>
          {monthData.expenses.length === 0 ? <div style={{ textAlign:"center", color:"#64748b", padding:40 }}>No expenses this month yet.</div> :
          <div style={{ background:"#1e293b", borderRadius:12, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  {[["#",""],["Name","name"],["Category","category"],["Amount","amount"]].map(([label,col]) => (
                    <th key={label} onClick={() => col && toggleSort(col as "name"|"category"|"amount")} style={{ padding:"12px 16px", textAlign:"left", cursor:col?"pointer":"default", background:"#0f172a", color:"#64748b", fontSize:12, borderBottom:"2px solid #334155", userSelect:"none" }}>
                      {label}{col ? arrow(col) : ""}
                    </th>
                  ))}
                  <th style={{ padding:"12px 16px", background:"#0f172a", borderBottom:"2px solid #334155" }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e,i) => (
                  <tr key={e.id} style={{ background: i%2===0?"#1e293b":"#162032" }}>
                    <td style={{ padding:"12px 16px", color:"#475569", fontSize:13 }}>{i+1}</td>
                    <td style={{ padding:"12px 16px", fontSize:14 }}>{e.name}</td>
                    <td style={{ padding:"12px 16px" }}><span style={{ background:COLORS[CATEGORIES.indexOf(e.category)%COLORS.length]+"33", color:COLORS[CATEGORIES.indexOf(e.category)%COLORS.length], padding:"3px 10px", borderRadius:999, fontSize:12 }}>{e.category}</span></td>
                    <td style={{ padding:"12px 16px", color:"#f87171", fontWeight:"bold" }}>₱{e.amount.toFixed(2)}</td>
                    <td style={{ padding:"12px 16px", textAlign:"center" }}><button onClick={() => deleteExpense(e.id)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:16 }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:"#0f172a" }}>
                  <td colSpan={3} style={{ padding:"12px 16px", fontWeight:"bold", color:"#64748b" }}>TOTAL</td>
                  <td style={{ padding:"12px 16px", fontWeight:"bold", color:"#f87171", fontSize:16 }}>₱{totalExpenses.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>}
        </>}

        {tab === "charts" && <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
            <div style={{ background:"#1e293b", borderRadius:12, padding:20 }}>
              <div style={{ fontWeight:"bold", marginBottom:16 }}>🥧 Spending by Category</div>
              {pieData.length === 0 ? <div style={{ color:"#64748b", textAlign:"center", padding:40 }}>No data yet</div> :
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent: p }) => `${name} ${((p||0)*100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `₱${v.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>}
            </div>
            <div style={{ background:"#1e293b", borderRadius:12, padding:20 }}>
              <div style={{ fontWeight:"bold", marginBottom:16 }}>📊 Income vs Expenses (6 months)</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={last6}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip formatter={(v: number) => `₱${v.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4,4,0,0]} />
                  <Bar dataKey="expenses" fill="#f87171" name="Expenses" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {Object.keys(categoryTotals).length > 0 && <div style={{ background:"#1e293b", borderRadius:12, padding:20, marginTop:16 }}>
            <div style={{ fontWeight:"bold", marginBottom:12 }}>📋 Category Breakdown</div>
            {Object.entries(categoryTotals).sort((a,b)=>b[1]-a[1]).map(([cat,total],i) => (
              <div key={cat} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <span style={{ width:120, fontSize:13 }}>{cat}</span>
                <div style={{ flex:1, background:"#334155", borderRadius:999, height:10 }}>
                  <div style={{ width:`${(total/totalExpenses)*100}%`, background:COLORS[i%COLORS.length], height:10, borderRadius:999 }} />
                </div>
                <span style={{ width:80, textAlign:"right", fontSize:13, color:"#f87171", fontWeight:"bold" }}>₱{total.toFixed(2)}</span>
              </div>
            ))}
          </div>}
        </>}
      </div>
    </div>
  );
}