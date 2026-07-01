import { useState, useCallback, useEffect, useRef } from "react";

const MODEL_META_KEY = "modelAgencyMeta_v3";
const MODEL_DATA_KEY = "modelAgencyData_v3";
const TAX_RATE = 0.033;
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const NOW_MONTH = MONTHS[new Date().getMonth()];
const NOW_MONTH_IDX = new Date().getMonth();

const DEFAULT_MODELS = {
  폴린: { nameKr:"폴린", nameEn:"Pauline", fullName:"GUILLET PAULINE MANON LEA", nationality:"프랑스", agencyAF:0.3, modelAF:0.3, account:"하나 545-910326-40107", regNo:"" },
  엘리자: { nameKr:"엘리자", nameEn:"Eliza", fullName:"MANUSHINA ELIZAVETA", nationality:"러시아", agencyAF:0.4, modelAF:0.3, account:"토스 1002-5374-4275", regNo:"" },
  루미: { nameKr:"루미", nameEn:"Lumi", fullName:"루미 (Lumi)", nationality:"미정", agencyAF:0.4, modelAF:0.3, account:"", regNo:"" },
  카야: { nameKr:"카야", nameEn:"Kaya", fullName:"카야 (Kaya)", nationality:"미정", agencyAF:0.2, modelAF:0.1, account:"", regNo:"" },
  엘리사: { nameKr:"엘리사", nameEn:"Elysa", fullName:"엘리사 (Elysa)", nationality:"미정", agencyAF:0.2, modelAF:0.1, account:"", regNo:"" },
  로만: { nameKr:"로만", nameEn:"Roman", fullName:"로만 (Roman)", nationality:"미정", agencyAF:0.2, modelAF:0.1, account:"", regNo:"" },
  송일웅: { nameKr:"송일웅", nameEn:"Song Il-woong", fullName:"송일웅 (Song Il-woong)", nationality:"한국", agencyAF:0.2, modelAF:0.1, account:"", regNo:"" },
};

const initData = (meta) => {
  const d = {};
  Object.keys(meta).forEach(m => { d[m] = {}; MONTHS.forEach(mo => { d[m][mo] = { agency:[], self:[] }; }); });
  return d;
};

function calc(income, af, otherDeduct=0) {
  const inc = Number(income)||0, fee = Math.round(inc*af), oth = Number(otherDeduct)||0;
  const after = inc-fee-oth, tax = Math.round(after*TAX_RATE);
  return { inc, fee, oth, tax, final: after-tax };
}

function monthTotals(modelKey, month, data, meta) {
  let sales=0, agency=0, model=0, tax=0;
  const md = data?.[modelKey]?.[month] || { agency:[], self:[] };
  md.agency.forEach(e=>{ const c=calc(e.income,meta.agencyAF,e.otherDeduct); sales+=c.inc; agency+=c.fee; model+=c.final; tax+=c.tax; });
  md.self.forEach(e=>{ const c=calc(e.income,meta.modelAF,e.otherDeduct); sales+=c.inc; agency+=c.fee; model+=c.final; tax+=c.tax; });
  return { sales, agency, model, tax };
}

function yearTotals(modelKey, data, meta) {
  let sales=0, agency=0, model=0, tax=0;
  MONTHS.forEach(m=>{ const t=monthTotals(modelKey,m,data,meta); sales+=t.sales; agency+=t.agency; model+=t.model; tax+=t.tax; });
  return { sales, agency, model, tax };
}

const fmt = n => n>0 ? `₩${Math.round(n).toLocaleString()}` : "-";
const pct = n => `${Math.round(n*100)}%`;
const fmtRegNo = val => { const d=val.replace(/\D/g,"").slice(0,13); return d.length<=6?d:d.slice(0,6)+"-"+d.slice(6); };

async function loadSheets() { try { const r=await fetch("/api/sheets"); const j=await r.json(); return j.data||null; } catch { return null; } }
async function saveSheets(p) { try { const r=await fetch("/api/sheets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:p})}); return r.ok; } catch { return false; } }

function theme(dark) {
  return {
    bg: dark?"#0f172a":"#f1f5f9", card: dark?"#1e293b":"#fff",
    border: dark?"#334155":"#e2e8f0", text: dark?"#f1f5f9":"#1e293b",
    sub: dark?"#94a3b8":"#64748b", input: dark?"#0f172a":"#fff",
    ib: dark?"#475569":"#d1d5db", thead: dark?"#0f172a":"#f8fafc",
    card2: dark?"#162032":"#f8fafc",
  };
}

// ── 월별 에이전시 매출 대형 바 차트 ──────────────────────────────────────────
function AgencyMonthChart({ data, modelMeta, dark }) {
  const t = theme(dark);
  const bars = MONTHS.map((m, i) => {
    let sales=0, agency=0, modelPay=0;
    Object.keys(modelMeta).forEach(mk => {
      const tot = monthTotals(mk, m, data, modelMeta[mk]);
      sales += tot.sales; agency += tot.agency; modelPay += tot.model;
    });
    return { month: m, sales, agency, modelPay, isNow: i === NOW_MONTH_IDX };
  });
  const maxSales = Math.max(...bars.map(b=>b.sales), 1);

  return (
    <div style={{ background: t.card, border:`1px solid ${t.border}`, borderRadius:14, padding:"18px 20px", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div>
          <h3 style={{ color:t.text, fontWeight:900, fontSize:15, margin:0 }}>에이전시 월별 매출 실적</h3>
          <p style={{ color:t.sub, fontSize:11, margin:"3px 0 0" }}>전체 모델 합산 · 3.3% 원천징수 통일 적용</p>
        </div>
        <div style={{ display:"flex", gap:12, fontSize:11, color:t.sub }}>
          <span><span style={{ color:"#4f46e5" }}>■</span> 총매출</span>
          <span><span style={{ color:"#10b981" }}>■</span> 에이전시수익</span>
          <span><span style={{ color:"#f59e0b" }}>■</span> 모델지급</span>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:160, paddingBottom:4 }}>
        {bars.map(({ month, sales, agency, modelPay, isNow }) => {
          const h = sales > 0 ? Math.max(Math.round((sales/maxSales)*140), 6) : 2;
          const ah = sales > 0 ? Math.round((agency/sales)*h) : 0;
          const mh = sales > 0 ? Math.round((modelPay/sales)*h) : 0;
          return (
            <div key={month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"default" }}>
              {sales > 0 && <div style={{ fontSize:9, color:isNow?"#4f46e5":t.sub, fontWeight:isNow?900:600, whiteSpace:"nowrap" }}>{(sales/10000).toFixed(0)}만</div>}
              <div style={{ width:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end", height:140, position:"relative" }}>
                {sales > 0 ? (
                  <div style={{ width:"100%", height:h, borderRadius:"4px 4px 0 0", overflow:"hidden", display:"flex", flexDirection:"column", justifyContent:"flex-end", border: isNow?`2px solid #4f46e5`:"none" }}>
                    <div style={{ width:"100%", flex:1, background: dark?"#1e293b":"#e2e8f0" }} />
                    <div style={{ width:"100%", height:mh, background:"#f59e0b" }} />
                    <div style={{ width:"100%", height:ah, background:"#10b981" }} />
                  </div>
                ) : (
                  <div style={{ width:"100%", height:2, background:t.border, borderRadius:2 }} />
                )}
              </div>
              <div style={{ fontSize:10, color:isNow?"#4f46e5":t.sub, fontWeight:isNow?900:600, whiteSpace:"nowrap" }}>{month}</div>
              {isNow && <div style={{ width:5, height:5, borderRadius:"50%", background:"#4f46e5" }} />}
            </div>
          );
        })}
      </div>
      {/* 올해 합계 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:14, borderTop:`1px solid ${t.border}`, paddingTop:12 }}>
        {[
          ["연간 총매출", fmt(bars.reduce((s,b)=>s+b.sales,0)), "#4f46e5"],
          ["에이전시 수익", fmt(bars.reduce((s,b)=>s+b.agency,0)), "#10b981"],
          ["모델 총지급", fmt(bars.reduce((s,b)=>s+b.modelPay,0)), "#f59e0b"],
        ].map(([lb,val,color])=>(
          <div key={lb}>
            <div style={{ fontSize:10, color:t.sub }}>{lb}</div>
            <div style={{ fontSize:15, fontWeight:900, color }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 모델별 미니 수익 바 ───────────────────────────────────────────────────────
function ModelMiniBar({ modelKey, data, meta, dark, onClick, isSelected }) {
  const t = theme(dark);
  const { sales, agency, model, tax } = yearTotals(modelKey, data, meta);
  const monthBars = MONTHS.map(m => monthTotals(modelKey, m, data, meta));
  const maxM = Math.max(...monthBars.map(b=>b.sales), 1);

  return (
    <div onClick={onClick} style={{ background: isSelected?(dark?"#1e1b4b":"#eef2ff"):t.card, border:`2px solid ${isSelected?"#4f46e5":t.border}`, borderRadius:12, padding:"12px 14px", cursor:"pointer", transition:"all 0.15s" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:900, color:"#fff", flexShrink:0 }}>{meta.nameEn[0]}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:800, color:t.text, fontSize:13 }}>{meta.nameKr}</div>
          <div style={{ fontSize:10, color:t.sub }}>{meta.nationality} · AF {pct(meta.agencyAF)}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:13, fontWeight:900, color:"#10b981" }}>{fmt(model)}</div>
          <div style={{ fontSize:10, color:t.sub }}>모델 순수익</div>
        </div>
      </div>
      {/* 미니 월별 바 */}
      <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:32, marginBottom:8 }}>
        {monthBars.map((b, i) => {
          const h = b.sales > 0 ? Math.max(Math.round((b.sales/maxM)*28), 3) : 2;
          const isNow = i === NOW_MONTH_IDX;
          return (
            <div key={i} style={{ flex:1, height:h, borderRadius:"2px 2px 0 0", background: isNow?"#4f46e5": b.sales>0?(dark?"#334155":"#e2e8f0"):"transparent", border: isNow?"none": b.sales>0?`1px solid ${t.border}`:"none", alignSelf:"flex-end", transition:"height 0.2s" }} />
          );
        })}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4 }}>
        {[["총매출",fmt(sales),t.sub],["에이전시",fmt(agency),"#7c3aed"],["세금",fmt(tax),"#ef4444"]].map(([lb,val,color])=>(
          <div key={lb}>
            <div style={{ fontSize:9, color:t.sub }}>{lb}</div>
            <div style={{ fontSize:11, fontWeight:800, color }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 연간 요약 ─────────────────────────────────────────────────────────────────
function Overview({ data, modelMeta, dark, setTab }) {
  const t = theme(dark);
  return (
    <div>
      <h2 style={{ fontSize:16, fontWeight:900, color:t.text, marginBottom:14 }}>2026 연간 요약</h2>
      <AgencyMonthChart data={data} modelMeta={modelMeta} dark={dark} />
      <h3 style={{ fontSize:13, fontWeight:800, color:t.sub, marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>모델별 수익 현황</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:10 }}>
        {Object.keys(modelMeta).map(m=>(
          <ModelMiniBar key={m} modelKey={m} data={data} meta={modelMeta[m]} dark={dark} onClick={()=>setTab(m)} isSelected={false} />
        ))}
      </div>
    </div>
  );
}

// ── 촬영 내역 입력 폼 (가독성 개선) ─────────────────────────────────────────
function EntryForm({ af, label, onAdd, dark }) {
  const t = theme(dark);
  const [f, setF] = useState({ brand:"", income:"", otherDeduct:"", note:"" });
  const [open, setOpen] = useState(false);
  const c = calc(f.income, af, f.otherDeduct);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  if (!open) return (
    <button onClick={()=>setOpen(true)} style={{ width:"100%", marginTop:10, padding:"9px 0", borderRadius:8, border:`1px dashed ${dark?"#4f46e5":"#c7d2fe"}`, background:"transparent", color:"#4f46e5", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
      <span style={{ fontSize:16 }}>+</span> {label} 추가
    </button>
  );

  return (
    <div style={{ background:dark?"#0f172a":"#f8f9ff", border:`1px solid ${dark?"#4f46e5":"#c7d2fe"}`, borderRadius:12, padding:14, marginTop:10 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <span style={{ fontSize:12, fontWeight:800, color:"#4f46e5" }}>{label} 입력</span>
        <button onClick={()=>setOpen(false)} style={{ background:"none", border:"none", color:t.sub, cursor:"pointer", fontSize:18 }}>✕</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:10 }}>
        <input value={f.brand} onChange={e=>set("brand",e.target.value)} placeholder="브랜드명"
          style={{ border:`1px solid ${t.ib}`, borderRadius:8, padding:"9px 12px", fontSize:13, outline:"none", background:t.input, color:t.text, fontWeight:500 }} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:t.sub, display:"block", marginBottom:3 }}>업체 입금액 (₩)</label>
            <input type="number" value={f.income} onChange={e=>set("income",e.target.value)} placeholder="0"
              style={{ width:"100%", border:`1px solid ${t.ib}`, borderRadius:8, padding:"9px 12px", fontSize:14, outline:"none", background:t.input, color:t.text, fontWeight:700, boxSizing:"border-box" }} />
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:t.sub, display:"block", marginBottom:3 }}>기타 공제 (₩)</label>
            <input type="number" value={f.otherDeduct} onChange={e=>set("otherDeduct",e.target.value)} placeholder="0"
              style={{ width:"100%", border:`1px solid ${t.ib}`, borderRadius:8, padding:"9px 12px", fontSize:14, outline:"none", background:t.input, color:t.text, fontWeight:700, boxSizing:"border-box" }} />
          </div>
        </div>
        <input value={f.note} onChange={e=>set("note",e.target.value)} placeholder="비고 (선택)"
          style={{ border:`1px solid ${t.ib}`, borderRadius:8, padding:"9px 12px", fontSize:13, outline:"none", background:t.input, color:t.text }} />
      </div>

      {/* 실시간 계산 미리보기 */}
      {Number(f.income) > 0 && (
        <div style={{ background:dark?"#1e293b":"#eef2ff", borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#4f46e5", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>정산 미리보기</div>
          <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:8 }}>
            {[
              { label:"총 매출", value:fmt(c.inc), color:dark?"#e2e8f0":"#334155", flex:3 },
              { label:"→", value:"", color:t.sub, flex:0.3 },
              { label:`AF ${pct(af)}`, value:"-"+fmt(c.fee), color:"#7c3aed", flex:2 },
              { label:"→", value:"", color:t.sub, flex:0.3 },
              { label:"세금 3.3%", value:"-"+fmt(c.tax), color:"#ef4444", flex:2 },
              { label:"→", value:"", color:t.sub, flex:0.3 },
              { label:"모델 순수익", value:fmt(c.final), color:"#10b981", flex:3 },
            ].map((item,i) => item.label === "→" ? (
              <div key={i} style={{ flex:item.flex, textAlign:"center", color:t.sub, fontSize:16 }}>→</div>
            ) : (
              <div key={i} style={{ flex:item.flex, background:dark?"#0f172a":"#fff", borderRadius:8, padding:"6px 8px", textAlign:"center" }}>
                <div style={{ fontSize:9, color:t.sub, marginBottom:2 }}>{item.label}</div>
                <div style={{ fontSize:12, fontWeight:900, color:item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
          {/* 비율 바 */}
          <div style={{ display:"flex", height:6, borderRadius:3, overflow:"hidden", gap:1 }}>
            <div style={{ flex:c.fee, background:"#7c3aed" }} />
            <div style={{ flex:c.tax, background:"#ef4444" }} />
            <div style={{ flex:c.final, background:"#10b981" }} />
          </div>
        </div>
      )}
      <button onClick={()=>{ if(!f.income)return; onAdd({...f,id:Date.now()}); setF({brand:"",income:"",otherDeduct:"",note:""}); setOpen(false); }}
        style={{ width:"100%", background:"#4f46e5", color:"#fff", border:"none", borderRadius:8, padding:"10px 0", fontWeight:700, fontSize:13, cursor:"pointer" }}>
        저장
      </button>
    </div>
  );
}

// ── 촬영 내역 테이블 (가독성 개선) ───────────────────────────────────────────
function EntryTable({ entries, af, onRemove, dark }) {
  const t = theme(dark);
  if (!entries.length) return (
    <div style={{ textAlign:"center", padding:"20px 0", color:t.sub }}>
      <div style={{ fontSize:24, marginBottom:6 }}>📭</div>
      <div style={{ fontSize:12 }}>촬영 내역 없음</div>
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {entries.map(e => {
        const c = calc(e.income, af, e.otherDeduct);
        return (
          <div key={e.id} style={{ background:dark?"#0f172a":"#f8fafc", border:`1px solid ${t.border}`, borderRadius:10, padding:"10px 12px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#4f46e5", flexShrink:0 }} />
                <span style={{ fontWeight:800, color:t.text, fontSize:13 }}>{e.brand || "브랜드 미입력"}</span>
                {e.note && <span style={{ fontSize:11, color:t.sub, background:dark?"#1e293b":"#e2e8f0", padding:"1px 7px", borderRadius:10 }}>{e.note}</span>}
              </div>
              <button onClick={()=>onRemove(e.id)} style={{ background:"none", border:"none", color:dark?"#475569":"#cbd5e1", cursor:"pointer", fontSize:14, padding:"2px 6px" }}>✕</button>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" }}>
              {[
                { label:"업체입금", value:fmt(c.inc), color:dark?"#94a3b8":"#475569", bg:dark?"#1e293b":"#fff" },
                { label:`AF(${pct(af)})`, value:"-"+fmt(c.fee), color:"#7c3aed", bg:dark?"#1a0d2e":"#f5f3ff" },
                { label:"세금(3.3%)", value:"-"+fmt(c.tax), color:"#ef4444", bg:dark?"#1a0808":"#fff1f2" },
                { label:"모델순수익", value:fmt(c.final), color:"#10b981", bg:dark?"#0a1f1a":"#f0fdf4" },
              ].map((item,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  {i > 0 && <span style={{ color:t.sub, fontSize:12 }}>→</span>}
                  <div style={{ background:item.bg, border:`1px solid ${t.border}`, borderRadius:8, padding:"4px 10px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:t.sub, marginBottom:1 }}>{item.label}</div>
                    <div style={{ fontSize:12, fontWeight:900, color:item.color }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 정산서 다운로드 화면 ──────────────────────────────────────────────────────
function SettlementReport({ model, meta, data, month, dark }) {
  const t = theme(dark);
  const reportRef = useRef(null);
  const md = data?.[model]?.[month] || { agency:[], self:[] };
  const { sales, agency, model: modelPay, tax } = monthTotals(model, month, data, meta);

  const allEntries = [
    ...md.agency.map(e=>({...e, type:"① 에이전시", af:meta.agencyAF})),
    ...md.self.map(e=>({...e, type:"② 모델직접", af:meta.modelAF})),
  ];

  const handleDownload = async () => {
    const el = reportRef.current;
    if (!el) return;
    try {
      const html2canvas = (await import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js")).default;
      const canvas = await html2canvas(el, { scale:2, backgroundColor: dark?"#1e293b":"#ffffff", useCORS:true });
      const a = document.createElement("a");
      a.download = `${meta.nameKr}_${month}_정산서.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch {
      // fallback: print
      window.print();
    }
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:8 }}>
        <h3 style={{ color:t.text, fontWeight:900, fontSize:15, margin:0 }}>{meta.nameKr} · {month} 정산서</h3>
        <button onClick={handleDownload} style={{ background:"#4f46e5", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
          📥 이미지 다운로드
        </button>
      </div>

      <div ref={reportRef} style={{ background:dark?"#1e293b":"#fff", borderRadius:14, padding:20, border:`1px solid ${t.border}` }}>
        {/* 헤더 */}
        <div style={{ background:"linear-gradient(135deg,#4f46e5,#7c3aed)", borderRadius:12, padding:"16px 20px", marginBottom:16, color:"#fff" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>{meta.nameKr} ({meta.nameEn})</div>
              <div style={{ fontSize:12, opacity:0.8, marginTop:2 }}>{meta.fullName} · {meta.nationality}</div>
              <div style={{ fontSize:11, opacity:0.65, marginTop:1 }}>{meta.account || "계좌 미등록"}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:22, fontWeight:900 }}>{month} 정산서</div>
              <div style={{ fontSize:11, opacity:0.7, marginTop:2 }}>원천징수 3.3% 적용</div>
            </div>
          </div>
        </div>

        {/* 합계 카드 */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:16 }}>
          {[
            ["총 매출액", fmt(sales), dark?"#e2e8f0":"#334155", dark?"#162032":"#f8fafc"],
            ["에이전시 수익", fmt(agency), "#7c3aed", dark?"#1a0d2e":"#f5f3ff"],
            ["원천징수 (3.3%)", fmt(tax), "#ef4444", dark?"#1a0808":"#fff1f2"],
            ["모델 최종 입금액", fmt(modelPay), "#10b981", dark?"#071a14":"#f0fdf4"],
          ].map(([lb,val,tc,bg])=>(
            <div key={lb} style={{ background:bg, borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:tc, opacity:0.75, marginBottom:3 }}>{lb}</div>
              <div style={{ fontSize:16, fontWeight:900, color:tc }}>{val}</div>
            </div>
          ))}
        </div>

        {/* 촬영 내역 테이블 */}
        {allEntries.length > 0 ? (
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:t.sub, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>촬영 내역 ({allEntries.length}건)</div>
            <div style={{ border:`1px solid ${t.border}`, borderRadius:10, overflow:"hidden" }}>
              <table style={{ width:"100%", fontSize:12, borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:t.thead }}>
                    {["구분","브랜드","업체입금","AF공제","세금(3.3%)","모델순수익","비고"].map((h,i)=>(
                      <th key={h} style={{ padding:"8px 10px", textAlign:i>1?"right":"left", fontSize:10, color:t.sub, fontWeight:700, borderBottom:`1px solid ${t.border}`, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allEntries.map(e=>{
                    const c=calc(e.income,e.af,e.otherDeduct);
                    return (
                      <tr key={e.id} style={{ borderBottom:`1px solid ${t.border}` }}>
                        <td style={{ padding:"8px 10px" }}><span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:8, background:e.type.includes("에이전시")?(dark?"#1e1b4b":"#eef2ff"):(dark?"#2d1a4b":"#f5f3ff"), color:e.type.includes("에이전시")?"#4f46e5":"#7c3aed" }}>{e.type}</span></td>
                        <td style={{ padding:"8px 10px", fontWeight:700, color:t.text }}>{e.brand||"-"}</td>
                        <td style={{ padding:"8px 10px", textAlign:"right", color:t.sub }}>{fmt(c.inc)}</td>
                        <td style={{ padding:"8px 10px", textAlign:"right", color:"#7c3aed", fontWeight:700 }}>{fmt(c.fee)}</td>
                        <td style={{ padding:"8px 10px", textAlign:"right", color:"#ef4444", fontWeight:700 }}>{fmt(c.tax)}</td>
                        <td style={{ padding:"8px 10px", textAlign:"right", color:"#10b981", fontWeight:800 }}>{fmt(c.final)}</td>
                        <td style={{ padding:"8px 10px", color:t.sub, fontSize:11 }}>{e.note||"-"}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ background:dark?"#1e293b":"#eef2ff", fontWeight:900 }}>
                    <td colSpan={2} style={{ padding:"8px 10px", color:"#4338ca", fontSize:12 }}>합계</td>
                    <td style={{ padding:"8px 10px", textAlign:"right", color:t.sub }}>{fmt(sales)}</td>
                    <td style={{ padding:"8px 10px", textAlign:"right", color:"#7c3aed" }}>{fmt(agency)}</td>
                    <td style={{ padding:"8px 10px", textAlign:"right", color:"#ef4444" }}>{fmt(tax)}</td>
                    <td style={{ padding:"8px 10px", textAlign:"right", color:"#10b981" }}>{fmt(modelPay)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"24px 0", color:t.sub }}>
            <div style={{ fontSize:28, marginBottom:8 }}>📭</div>
            <div style={{ fontSize:13 }}>이번 달 촬영 내역이 없습니다</div>
          </div>
        )}

        {/* 하단 */}
        <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6 }}>
          <div style={{ fontSize:11, color:t.sub }}>외국인등록번호: <span style={{ fontFamily:"monospace", fontWeight:700, color:meta.regNo?"#f59e0b":t.sub }}>{meta.regNo||"미입력"}</span></div>
          <div style={{ fontSize:10, color:t.sub }}>MoMo Agency · {new Date().getFullYear()}</div>
        </div>
      </div>
    </div>
  );
}

// ── 모델 상세 ─────────────────────────────────────────────────────────────────
function ModelDetail({ model, meta, data, addEntry, removeEntry, onUpdateAF, dark }) {
  const t = theme(dark);
  const [month, setMonth] = useState(NOW_MONTH);
  const [view, setView] = useState("input"); // "input" | "report"
  const [showAFEdit, setShowAFEdit] = useState(false);
  const md = data?.[model]?.[month] || { agency:[], self:[] };
  const { sales, agency, model: modelPay, tax } = monthTotals(model, month, data, meta);
  const totalEntries = md.agency.length + md.self.length;

  return (
    <div>
      {/* 모델 헤더 */}
      <div style={{ background:"linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)", borderRadius:14, padding:"14px 18px", marginBottom:12, color:"#fff" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:11, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, fontWeight:900, flexShrink:0 }}>{meta.nameEn[0]}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:900 }}>{meta.nameKr} <span style={{ fontWeight:300, opacity:0.75, fontSize:13 }}>({meta.nameEn})</span></div>
            <div style={{ fontSize:11, opacity:0.7, marginTop:1 }}>{meta.fullName} · {meta.nationality}</div>
            <div style={{ fontSize:10, opacity:0.55 }}>{meta.account||"계좌 미등록"}</div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:10, opacity:0.65 }}>수익 배분</div>
            <div style={{ fontSize:11, fontWeight:700 }}>에이전시 {pct(meta.agencyAF)} / 모델 {pct(meta.modelAF)}</div>
            <button onClick={()=>setShowAFEdit(v=>!v)} style={{ marginTop:4, background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.4)", borderRadius:6, color:"#fff", fontSize:10, fontWeight:700, padding:"2px 8px", cursor:"pointer" }}>✏️ AF</button>
          </div>
        </div>
      </div>

      {/* AF 수정 */}
      {showAFEdit && (
        <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:12, padding:14, marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:800, color:t.text }}>AF 비율 수정</span>
            <button onClick={()=>setShowAFEdit(false)} style={{ background:"none", border:"none", color:t.sub, cursor:"pointer", fontSize:18 }}>✕</button>
          </div>
          {[["① 에이전시 촬영 AF","agencyAF","#4f46e5"],["② 모델 직접 촬영 AF","modelAF","#7c3aed"]].map(([label,key,color])=>(
            <div key={key} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:12, color:t.sub }}>{label}</span>
                <span style={{ fontWeight:900, color, fontSize:14 }}>{pct(meta[key])}</span>
              </div>
              <input type="range" min={0} max={60} step={5} value={Math.round(meta[key]*100)} onChange={e=>onUpdateAF(model,key,Number(e.target.value)/100)} style={{ width:"100%", accentColor:color }} />
            </div>
          ))}
        </div>
      )}

      {/* 월 선택 */}
      <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:12, padding:"10px 12px", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:14, fontWeight:900, color:"#4f46e5" }}>{month}</span>
            {month===NOW_MONTH && <span style={{ background:"#4f46e5", color:"#fff", fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:10 }}>이번 달</span>}
            {totalEntries > 0 && <span style={{ background:dark?"#1e293b":"#f1f5f9", color:t.sub, fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:10 }}>{totalEntries}건</span>}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={()=>setView("input")} style={{ padding:"4px 10px", borderRadius:7, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:view==="input"?"#4f46e5":"transparent", color:view==="input"?"#fff":t.sub }}>입력</button>
            <button onClick={()=>setView("report")} style={{ padding:"4px 10px", borderRadius:7, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:view==="report"?"#4f46e5":"transparent", color:view==="report"?"#fff":t.sub }}>📋 정산서</button>
          </div>
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          <button onClick={()=>setMonth(NOW_MONTH)} style={{ padding:"4px 10px", borderRadius:7, border:"none", cursor:"pointer", fontSize:11, fontWeight:900, background:month===NOW_MONTH?"#4f46e5":(dark?"#1e1b4b":"#eef2ff"), color:month===NOW_MONTH?"#fff":"#4f46e5" }}>{NOW_MONTH} ★</button>
          <div style={{ width:1, background:t.border, margin:"0 2px" }} />
          {MONTHS.filter(m=>m!==NOW_MONTH).map(m=>{
            const hasData=(data?.[model]?.[m]?.agency?.length||0)+(data?.[model]?.[m]?.self?.length||0)>0;
            return (
              <button key={m} onClick={()=>setMonth(m)} style={{ padding:"4px 9px", borderRadius:7, border:`1px solid ${t.border}`, cursor:"pointer", fontSize:11, fontWeight:700, background:month===m?"#4f46e5":hasData?(dark?"#1e3a5f":"#f0f9ff"):(dark?"#1e293b":"#f8fafc"), color:month===m?"#fff":hasData?"#0284c7":t.sub }}>{m}</button>
            );
          })}
        </div>
      </div>

      {view === "report" ? (
        <SettlementReport model={model} meta={meta} data={data} month={month} dark={dark} />
      ) : (
        <>
          {/* 이번달 합계 */}
          {sales > 0 && (
            <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:12, padding:"10px 14px", marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:t.sub, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>{month} 합계</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                {[["총 매출",fmt(sales),dark?"#e2e8f0":"#334155"],["에이전시",fmt(agency),"#7c3aed"],["세금 3.3%",fmt(tax),"#ef4444"],["모델 순수익",fmt(modelPay),"#10b981"]].map(([lb,val,color])=>(
                  <div key={lb} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:9, color:t.sub, marginBottom:2 }}>{lb}</div>
                    <div style={{ fontSize:13, fontWeight:900, color }}>{val}</div>
                  </div>
                ))}
              </div>
              {/* 비율 바 */}
              {sales > 0 && (
                <div style={{ display:"flex", height:4, borderRadius:2, overflow:"hidden", marginTop:8, gap:1 }}>
                  <div style={{ flex:agency, background:"#7c3aed" }} />
                  <div style={{ flex:tax, background:"#ef4444" }} />
                  <div style={{ flex:modelPay, background:"#10b981" }} />
                </div>
              )}
            </div>
          )}

          {/* ① 에이전시 촬영 */}
          <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:12, padding:14, marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontWeight:800, color:t.text, fontSize:13 }}>① 에이전시 촬영</span>
              <span style={{ background:dark?"#1e1b4b":"#eef2ff", color:"#4f46e5", fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20 }}>AF {pct(meta.agencyAF)}</span>
            </div>
            <EntryTable entries={md.agency} af={meta.agencyAF} onRemove={id=>removeEntry(model,month,"agency",id)} dark={dark} />
            <EntryForm af={meta.agencyAF} label="에이전시 촬영" onAdd={e=>addEntry(model,month,"agency",e)} dark={dark} />
          </div>

          {/* ② 모델 직접 촬영 */}
          <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:12, padding:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontWeight:800, color:t.text, fontSize:13 }}>② 모델 직접 촬영</span>
              <span style={{ background:dark?"#2d1a4b":"#f5f3ff", color:"#7c3aed", fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20 }}>AF {pct(meta.modelAF)}</span>
            </div>
            <EntryTable entries={md.self} af={meta.modelAF} onRemove={id=>removeEntry(model,month,"self",id)} dark={dark} />
            <EntryForm af={meta.modelAF} label="모델 직접 촬영" onAdd={e=>addEntry(model,month,"self",e)} dark={dark} />
          </div>
        </>
      )}
    </div>
  );
}

// ── 세무 요약 행 ──────────────────────────────────────────────────────────────
function TaxRow({ model, meta, inc, tax, final, agencyRev, monthData, editingRegNo, regNoInput, onStartEdit, onCommitEdit, onRegNoInput, dark }) {
  const t = theme(dark);
  const [exp, setExp] = useState(false);
  const all = [...monthData.agency.map(e=>({...e,type:"① 에이전시",af:meta.agencyAF})), ...monthData.self.map(e=>({...e,type:"② 모델직접",af:meta.modelAF}))];
  return (
    <>
      <tr style={{ borderBottom:exp?"none":`1px solid ${t.border}`, background:exp?(dark?"#1a2744":"#f8f9ff"):t.card, opacity:final===0?0.35:1 }}>
        <td style={{ padding:"9px 10px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <button onClick={()=>all.length>0&&setExp(v=>!v)} style={{ width:20, height:20, borderRadius:5, border:`1px solid ${t.border}`, background:"transparent", cursor:all.length>0?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"transform 0.2s", transform:exp?"rotate(0deg)":"rotate(-90deg)", color:t.sub, fontSize:9 }}>▼</button>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:800, color:t.text, fontSize:12 }}>{meta.nameKr}</div>
              <div style={{ fontSize:9, color:t.sub }}>{meta.nationality}</div>
            </div>
          </div>
        </td>
        <td style={{ padding:"9px 10px" }}>
          {editingRegNo===model ? (
            <input autoFocus value={regNoInput} onChange={e=>onRegNoInput(fmtRegNo(e.target.value))} onBlur={()=>onCommitEdit(model)} onKeyDown={e=>e.key==="Enter"&&onCommitEdit(model)} placeholder="000000-0000000" maxLength={14}
              style={{ border:`2px solid #f59e0b`, borderRadius:6, padding:"3px 7px", fontSize:11, width:120, outline:"none", fontFamily:"monospace", background:t.input, color:t.text }} />
          ) : (
            <button onClick={()=>onStartEdit(model,meta.regNo)} style={{ background:meta.regNo?(dark?"#451a03":"#fef3c7"):(dark?"#292524":"#fde68a"), border:"1px dashed #f59e0b", borderRadius:6, padding:"2px 8px", fontSize:11, cursor:"pointer", color:meta.regNo?"#f59e0b":"#b45309", fontFamily:"monospace", whiteSpace:"nowrap" }}>
              {meta.regNo||"입력 ✏️"}
            </button>
          )}
        </td>
        <td style={{ padding:"9px 10px", textAlign:"right", color:t.sub, fontWeight:600, fontSize:12 }}>{inc>0?fmt(inc):"-"}</td>
        <td style={{ padding:"9px 10px", textAlign:"right", color:"#7c3aed", fontWeight:800, fontSize:12 }}>{agencyRev>0?fmt(agencyRev):"-"}</td>
        <td style={{ padding:"9px 10px", textAlign:"right", color:"#ef4444", fontWeight:800, fontSize:12 }}>{tax>0?fmt(tax):"-"}</td>
        <td style={{ padding:"9px 10px", textAlign:"right", color:"#10b981", fontWeight:900, fontSize:12 }}>{final>0?fmt(final):"-"}</td>
      </tr>
      {exp && (
        <tr>
          <td colSpan={6} style={{ padding:0, background:dark?"#0f172a":"#f8f9ff", borderBottom:`1px solid ${t.border}` }}>
            <div style={{ padding:"10px 12px 12px 44px", overflowX:"auto" }}>
              {all.map(e=>{ const c=calc(e.income,e.af,e.otherDeduct); return (
                <div key={e.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                  <span style={{ fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:6, background:e.type.includes("에이전시")?(dark?"#1e1b4b":"#eef2ff"):(dark?"#2d1a4b":"#f5f3ff"), color:e.type.includes("에이전시")?"#4f46e5":"#7c3aed", whiteSpace:"nowrap" }}>{e.type}</span>
                  <span style={{ fontWeight:700, color:t.text, fontSize:12 }}>{e.brand||"-"}</span>
                  <span style={{ color:t.sub, fontSize:11 }}>{fmt(c.inc)}</span>
                  <span style={{ color:t.sub }}>→</span>
                  <span style={{ color:"#10b981", fontWeight:800, fontSize:12 }}>순수익 {fmt(c.final)}</span>
                </div>
              ); })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── 세무 요약 ─────────────────────────────────────────────────────────────────
function TaxSummary({ data, modelMeta, onUpdateRegNo, dark }) {
  const t = theme(dark);
  const [month, setMonth] = useState(NOW_MONTH);
  const [editingRegNo, setEditingRegNo] = useState(null);
  const [regNoInput, setRegNoInput] = useState("");

  const rows = Object.keys(modelMeta).map(model=>{
    const meta=modelMeta[model], md=data?.[model]?.[month]||{agency:[],self:[]};
    let inc=0,tax=0,final=0,agencyRev=0;
    [...md.agency.map(e=>calc(e.income,meta.agencyAF,e.otherDeduct)),...md.self.map(e=>calc(e.income,meta.modelAF,e.otherDeduct))].forEach(c=>{inc+=c.inc;tax+=c.tax;final+=c.final;agencyRev+=c.fee;});
    return {model,meta,inc,tax,final,agencyRev,monthData:md};
  });
  const [tI,tT,tF,tA] = [rows.reduce((s,r)=>s+r.inc,0),rows.reduce((s,r)=>s+r.tax,0),rows.reduce((s,r)=>s+r.final,0),rows.reduce((s,r)=>s+r.agencyRev,0)];
  const taxRows = rows.filter(r=>r.final>0);
  const startEdit=(model,cur)=>{setEditingRegNo(model);setRegNoInput(cur||"");};
  const commitEdit=model=>{onUpdateRegNo(model,regNoInput);setEditingRegNo(null);};

  return (
    <div>
      {/* 헤더 + 월 선택 */}
      <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:14, padding:"14px 16px", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, flexWrap:"wrap" }}>
          <h2 style={{ fontSize:16, fontWeight:900, color:t.text, margin:0 }}>월별 세무 요약</h2>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:18, fontWeight:900, color:"#4f46e5" }}>{month}</span>
            {month===NOW_MONTH && <span style={{ background:"#4f46e5", color:"#fff", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10 }}>이번 달</span>}
          </div>
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          <button onClick={()=>setMonth(NOW_MONTH)} style={{ padding:"5px 12px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:900, background:month===NOW_MONTH?"#4f46e5":(dark?"#1e1b4b":"#eef2ff"), color:month===NOW_MONTH?"#fff":"#4f46e5", boxShadow:month===NOW_MONTH?"0 2px 8px #4f46e560":"none" }}>{NOW_MONTH} ★</button>
          <div style={{ width:1, background:t.border, margin:"0 4px" }} />
          {MONTHS.filter(m=>m!==NOW_MONTH).map(m=>(
            <button key={m} onClick={()=>setMonth(m)} style={{ padding:"5px 10px", borderRadius:8, border:`1px solid ${t.border}`, cursor:"pointer", fontSize:11, fontWeight:700, background:month===m?"#4f46e5":(dark?"#1e293b":"#f8fafc"), color:month===m?"#fff":t.sub }}>{m}</button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:12 }}>
        {[["총 매출액",fmt(tI),dark?"#e2e8f0":"#334155",dark?"#1e293b":"#f8fafc"],["에이전시 수익",fmt(tA),"#7c3aed",dark?"#1a0d2e":"#f5f3ff"],["원천징수 3.3%",fmt(tT),"#ef4444",dark?"#1a0808":"#fff1f2"],["모델 총 순수익",fmt(tF),"#10b981",dark?"#071a14":"#f0fdf4"]].map(([lb,val,tc,bg])=>(
          <div key={lb} style={{ background:bg, borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:10, color:tc, opacity:0.7, marginBottom:4 }}>{lb}</div>
            <div style={{ fontSize:17, fontWeight:900, color:tc }}>{val}</div>
          </div>
        ))}
      </div>

      {/* 테이블 */}
      <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
        <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          <table style={{ width:"100%", fontSize:12, borderCollapse:"collapse", minWidth:480 }}>
            <thead>
              <tr style={{ background:t.thead }}>
                {[["모델","left"],["외국인등록번호","left"],["총매출","right"],["에이전시수익","right"],["세금(3.3%)","right"],["모델순수익","right"]].map(([h,align],i)=>(
                  <th key={h} style={{ padding:"9px 10px", textAlign:align, fontSize:10, color:i===3?"#7c3aed":i===4?"#ef4444":i===5?"#10b981":t.sub, fontWeight:700, textTransform:"uppercase", borderBottom:`1px solid ${t.border}`, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r=>(
                <TaxRow key={r.model} {...r} editingRegNo={editingRegNo} regNoInput={regNoInput} onStartEdit={startEdit} onCommitEdit={commitEdit} onRegNoInput={setRegNoInput} dark={dark} />
              ))}
              <tr style={{ background:dark?"#1e293b":"#eef2ff" }}>
                <td colSpan={2} style={{ padding:"9px 10px", fontWeight:900, color:"#4338ca", fontSize:12 }}>합계</td>
                <td style={{ padding:"9px 10px", textAlign:"right", fontWeight:900, color:t.sub, fontSize:12 }}>{fmt(tI)}</td>
                <td style={{ padding:"9px 10px", textAlign:"right", fontWeight:900, color:"#7c3aed", fontSize:12 }}>{fmt(tA)}</td>
                <td style={{ padding:"9px 10px", textAlign:"right", fontWeight:900, color:"#ef4444", fontSize:12 }}>{fmt(tT)}</td>
                <td style={{ padding:"9px 10px", textAlign:"right", fontWeight:900, color:"#10b981", fontSize:12 }}>{fmt(tF)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 세무서 신고용 */}
      {taxRows.length > 0 && (
        <div style={{ background:dark?"#1a1200":"#fffbeb", border:`1px solid ${dark?"#854d0e":"#fde68a"}`, borderRadius:12, padding:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <span>📋</span>
            <span style={{ fontWeight:900, color:dark?"#fbbf24":"#92400e", fontSize:13 }}>세무서 신고용 — {month}</span>
            <span style={{ fontSize:10, color:dark?"#d97706":"#b45309", marginLeft:"auto" }}>3.3% 통일 적용</span>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", fontSize:12, borderCollapse:"collapse", minWidth:360 }}>
              <thead>
                <tr style={{ borderBottom:`2px solid ${dark?"#854d0e":"#fde68a"}` }}>
                  {["이름","국적","외국인등록번호","모델 입금 비용","원천징수(3.3%)"].map((h,i)=>(
                    <th key={h} style={{ padding:"7px 10px", textAlign:i>2?"right":"left", color:dark?"#fbbf24":"#92400e", fontSize:11, fontWeight:800, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {taxRows.map(({model,meta,final,tax})=>(
                  <tr key={model} style={{ borderBottom:`1px solid ${dark?"#451a03":"#fef3c7"}` }}>
                    <td style={{ padding:"8px 10px", fontWeight:700, color:t.text }}>{meta.fullName}</td>
                    <td style={{ padding:"8px 10px", color:t.sub }}>{meta.nationality}</td>
                    <td style={{ padding:"8px 10px", fontFamily:"monospace", color:meta.regNo?"#f59e0b":"#b45309", fontWeight:meta.regNo?700:400 }}>{meta.regNo||"미입력"}</td>
                    <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:700, color:t.text }}>{fmt(final+tax)}</td>
                    <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:900, color:"#ef4444" }}>{fmt(tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize:11, color:dark?"#d97706":"#b45309", marginTop:10 }}>※ 모델 입금 비용 = 최종입금 + 세금액</p>
        </div>
      )}
    </div>
  );
}

// ── 모델 추가/수정 모달 ────────────────────────────────────────────────────────
function ModelFormModal({ existing, onSave, onClose, dark }) {
  const t = theme(dark);
  const [form, setForm] = useState(existing||{nameKr:"",nameEn:"",fullName:"",nationality:"",agencyAF:0.2,modelAF:0.1,account:"",regNo:""});
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
      <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:18, padding:22, width:"100%", maxWidth:460, boxShadow:"0 30px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <h3 style={{ color:t.text, fontWeight:900, fontSize:16, margin:0 }}>{existing?"모델 정보 수정":"새 모델 추가"}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:t.sub, cursor:"pointer", fontSize:22 }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[["한국 이름 *","nameKr"],["영문 닉네임 *","nameEn"]].map(([label,key])=>(
              <div key={key}>
                <label style={{ fontSize:11, fontWeight:700, color:t.sub, display:"block", marginBottom:4 }}>{label}</label>
                <input value={form[key]} onChange={e=>set(key,e.target.value)} style={{ width:"100%", border:`1px solid ${t.ib}`, borderRadius:8, padding:"8px 10px", fontSize:13, background:t.input, color:t.text, outline:"none", boxSizing:"border-box" }} />
              </div>
            ))}
          </div>
          {[["Full Name (여권명)","fullName"],["국적","nationality"],["계좌번호","account"],["외국인등록번호","regNo"]].map(([label,key])=>(
            <div key={key}>
              <label style={{ fontSize:11, fontWeight:700, color:t.sub, display:"block", marginBottom:4 }}>{label}</label>
              <input value={form[key]} onChange={e=>set(key,key==="regNo"?fmtRegNo(e.target.value):e.target.value)} maxLength={key==="regNo"?14:undefined}
                style={{ width:"100%", border:`1px solid ${t.ib}`, borderRadius:8, padding:"8px 10px", fontSize:13, background:t.input, color:t.text, outline:"none", boxSizing:"border-box", fontFamily:key==="regNo"?"monospace":"inherit" }} />
            </div>
          ))}
          {[["① 에이전시 촬영 AF","agencyAF","#4f46e5"],["② 모델 직접 촬영 AF","modelAF","#7c3aed"]].map(([label,key,color])=>(
            <div key={key}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <label style={{ fontSize:11, fontWeight:700, color:t.sub }}>{label}</label>
                <span style={{ fontWeight:900, color, fontSize:14 }}>{Math.round(form[key]*100)}%</span>
              </div>
              <input type="range" min={0} max={60} step={5} value={Math.round(form[key]*100)} onChange={e=>set(key,Number(e.target.value)/100)} style={{ width:"100%", accentColor:color }} />
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:10, marginTop:18 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px 0", borderRadius:9, border:`1px solid ${t.border}`, background:"transparent", color:t.sub, fontWeight:700, cursor:"pointer" }}>취소</button>
          <button onClick={()=>{ if(!form.nameKr||!form.nameEn)return alert("이름은 필수입니다."); onSave(form); }}
            style={{ flex:2, padding:"10px 0", borderRadius:9, border:"none", background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"#fff", fontWeight:700, cursor:"pointer" }}>
            {existing?"수정 저장":"모델 추가"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 앱 ───────────────────────────────────────────────────────────────────
export default function App() {
  const [modelMeta, setModelMeta] = useState(()=>{ try{ const s=localStorage.getItem(MODEL_META_KEY); return s?JSON.parse(s):DEFAULT_MODELS; }catch{ return DEFAULT_MODELS; } });
  const [data, setData] = useState(()=>{ try{ const s=localStorage.getItem(MODEL_DATA_KEY); return s?JSON.parse(s):initData(DEFAULT_MODELS); }catch{ return initData(DEFAULT_MODELS); } });
  const [tab, setTab] = useState("tax");
  const [dark, setDark] = useState(()=>{ try{ return localStorage.getItem("darkMode")==="true"; }catch{ return false; } });
  const [saveStatus, setSaveStatus] = useState("idle");
  const [unsaved, setUnsaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModelForm, setShowModelForm] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const historyRef = useRef([{ data:initData(DEFAULT_MODELS), modelMeta:DEFAULT_MODELS }]);
  const historyIdx = useRef(0);
  const t = theme(dark);

  useEffect(()=>{ const h=()=>setIsMobile(window.innerWidth<768); window.addEventListener("resize",h); return()=>window.removeEventListener("resize",h); },[]);
  useEffect(()=>{ loadSheets().then(saved=>{ if(saved?.data){setData(saved.data); historyRef.current=[{data:saved.data,modelMeta:saved.modelMeta||DEFAULT_MODELS}];} if(saved?.modelMeta)setModelMeta(saved.modelMeta); setLoading(false); }).catch(()=>setLoading(false)); },[]);
  useEffect(()=>{ localStorage.setItem("darkMode",dark); },[dark]);

  const saveMeta=m=>{ setModelMeta(m); localStorage.setItem(MODEL_META_KEY,JSON.stringify(m)); };
  const saveData=d=>{ setData(d); localStorage.setItem(MODEL_DATA_KEY,JSON.stringify(d)); };
  const pushH=(nd,nm)=>{ const h=historyRef.current.slice(0,historyIdx.current+1); h.push({data:nd,modelMeta:nm}); if(h.length>MAX_HISTORY)h.shift(); historyRef.current=h; historyIdx.current=h.length-1; setUnsaved(true); };

  const undo=useCallback(()=>{ if(historyIdx.current<=0)return; historyIdx.current--; const{data:d,modelMeta:m}=historyRef.current[historyIdx.current]; saveData(d); saveMeta(m); setUnsaved(true); },[]);
  const redo=useCallback(()=>{ if(historyIdx.current>=historyRef.current.length-1)return; historyIdx.current++; const{data:d,modelMeta:m}=historyRef.current[historyIdx.current]; saveData(d); saveMeta(m); setUnsaved(true); },[]);
  const handleSave=useCallback(async()=>{ setSaveStatus("saving"); const ok=await saveSheets({data,modelMeta}); setSaveStatus(ok?"saved":"error"); if(ok)setUnsaved(false); setTimeout(()=>setSaveStatus("idle"),2500); },[data,modelMeta]);

  const addEntry=useCallback((model,month,type,entry)=>{ setData(prev=>{ const d=JSON.parse(JSON.stringify(prev)); if(!d[model]){d[model]={};MONTHS.forEach(m=>{d[model][m]={agency:[],self:[]};});} d[model][month][type].push(entry); saveData(d); pushH(d,modelMeta); return d; }); },[modelMeta]);
  const removeEntry=useCallback((model,month,type,id)=>{ setData(prev=>{ const d=JSON.parse(JSON.stringify(prev)); d[model][month][type]=d[model][month][type].filter(e=>e.id!==id); saveData(d); pushH(d,modelMeta); return d; }); },[modelMeta]);
  const updateRegNo=useCallback((model,regNo)=>{ setModelMeta(prev=>{ const m={...prev,[model]:{...prev[model],regNo}}; saveMeta(m); pushH(data,m); return m; }); },[data]);
  const updateAF=useCallback((model,key,value)=>{ setModelMeta(prev=>{ const m={...prev,[model]:{...prev[model],[key]:value}}; saveMeta(m); setUnsaved(true); return m; }); },[]);

  const handleAddModel=useCallback(form=>{ const key=form.nameKr; if(modelMeta[key])return alert("같은 이름의 모델이 존재합니다."); const nm={...modelMeta,[key]:{...form}}; const nd=JSON.parse(JSON.stringify(data)); nd[key]={}; MONTHS.forEach(m=>{nd[key][m]={agency:[],self:[];};}); saveMeta(nm); saveData(nd); pushH(nd,nm); setShowModelForm(false); setTab(key); },[modelMeta,data]);
  const handleEditModel=useCallback(form=>{ const key=editingModel; const nm={...modelMeta,[key]:{...modelMeta[key],...form,nameKr:modelMeta[key].nameKr}}; saveMeta(nm); pushH(data,nm); setEditingModel(null); },[modelMeta,data,editingModel]);
  const handleDeleteModel=useCallback(modelKey=>{ const nm={...modelMeta}; delete nm[modelKey]; const nd=JSON.parse(JSON.stringify(data)); delete nd[modelKey]; saveMeta(nm); saveData(nd); pushH(nd,nm); setDeleteConfirm(null); if(tab===modelKey)setTab("tax"); },[modelMeta,data,tab]);

  const canUndo=historyIdx.current>0, canRedo=historyIdx.current<historyRef.current.length-1;

  if(loading) return <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:t.bg }}><div style={{ textAlign:"center" }}><div style={{ fontSize:32, marginBottom:12 }}>⏳</div><div style={{ fontWeight:700, color:"#4f46e5" }}>데이터 불러오는 중...</div></div></div>;

  const NavContent = (
    <div style={{ padding:8 }}>
      {[["overview","연간 요약","📊"],["tax","세무 요약","📋"]].map(([id,label,icon])=>(
        <button key={id} onClick={()=>{ setTab(id); setMobileNavOpen(false); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:9, border:"none", cursor:"pointer", background:tab===id?"#4f46e5":"transparent", color:tab===id?"#fff":t.sub, fontWeight:700, fontSize:13, marginBottom:2, textAlign:"left" }}>
          <span>{icon}</span>{label}
        </button>
      ))}
      <div style={{ margin:"8px 0", borderTop:`1px solid ${t.border}`, paddingTop:8 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingLeft:10, paddingRight:6, marginBottom:6 }}>
          <span style={{ fontSize:10, fontWeight:700, color:t.sub, textTransform:"uppercase" }}>모델 {Object.keys(modelMeta).length}명</span>
          <button onClick={()=>setShowModelForm(true)} style={{ width:22, height:22, borderRadius:6, border:"none", background:"#4f46e5", color:"#fff", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900 }}>+</button>
        </div>
        {Object.keys(modelMeta).map(m=>(
          <div key={m} style={{ display:"flex", alignItems:"center", gap:3, marginBottom:2 }}>
            <button onClick={()=>{ setTab(m); setMobileNavOpen(false); }} style={{ flex:1, display:"flex", alignItems:"center", gap:7, padding:"6px 8px", borderRadius:8, border:"none", cursor:"pointer", background:tab===m?"#4f46e5":"transparent", color:tab===m?"#fff":t.sub, fontWeight:700, fontSize:12, textAlign:"left" }}>
              <span style={{ width:20, height:20, borderRadius:5, background:tab===m?"rgba(255,255,255,0.2)":(dark?"#0f172a":"#f1f5f9"), display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, flexShrink:0, fontWeight:900 }}>{modelMeta[m].nameEn[0]}</span>
              {modelMeta[m].nameKr}
            </button>
            {tab===m && (
              <>
                <button onClick={()=>setEditingModel(m)} style={{ width:20, height:20, borderRadius:5, border:"none", background:tab===m?"rgba(255,255,255,0.15)":(dark?"#1e293b":"#f1f5f9"), color:tab===m?"#fff":t.sub, cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>✏️</button>
                <button onClick={()=>setDeleteConfirm(m)} style={{ width:20, height:20, borderRadius:5, border:"none", background:"#ef444440", color:"#ef4444", cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>🗑</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:t.bg, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {/* 모달들 */}
      {showModelForm && <ModelFormModal onSave={handleAddModel} onClose={()=>setShowModelForm(false)} dark={dark} />}
      {editingModel && <ModelFormModal existing={modelMeta[editingModel]} onSave={handleEditModel} onClose={()=>setEditingModel(null)} dark={dark} />}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:16, padding:24, width:"100%", maxWidth:320, boxShadow:"0 20px 40px rgba(0,0,0,0.4)", textAlign:"center" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>⚠️</div>
            <h3 style={{ color:t.text, fontWeight:900, marginBottom:8 }}>{deleteConfirm} 삭제</h3>
            <p style={{ color:t.sub, fontSize:13, marginBottom:20 }}>모든 정산 데이터가 삭제됩니다.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setDeleteConfirm(null)} style={{ flex:1, padding:"10px 0", borderRadius:9, border:`1px solid ${t.border}`, background:"transparent", color:t.sub, fontWeight:700, cursor:"pointer" }}>취소</button>
              <button onClick={()=>handleDeleteModel(deleteConfirm)} style={{ flex:1, padding:"10px 0", borderRadius:9, border:"none", background:"#ef4444", color:"#fff", fontWeight:700, cursor:"pointer" }}>삭제</button>
            </div>
          </div>
        </div>
      )}
      {/* 모바일 드로어 */}
      {isMobile && mobileNavOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:200 }} onClick={()=>setMobileNavOpen(false)}>
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:220, background:t.card, borderRight:`1px solid ${t.border}`, boxShadow:"4px 0 20px rgba(0,0,0,0.2)", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"14px 14px 8px", borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontWeight:900, color:t.text, fontSize:14 }}>메뉴</span>
              <button onClick={()=>setMobileNavOpen(false)} style={{ background:"none", border:"none", color:t.sub, cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            {NavContent}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header style={{ background:t.card, borderBottom:`1px solid ${t.border}`, padding:"8px 16px", display:"flex", alignItems:"center", gap:10, position:"sticky", top:0, zIndex:10, boxShadow:"0 1px 6px rgba(0,0,0,0.08)" }}>
        {isMobile && (
          <button onClick={()=>setMobileNavOpen(true)} style={{ width:30, height:30, borderRadius:7, border:`1px solid ${t.border}`, background:"transparent", color:t.text, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>☰</button>
        )}
        <div style={{ width:28, height:28, borderRadius:7, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:12, flexShrink:0 }}>MA</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:900, color:t.text, fontSize:13, lineHeight:1.1 }}>Model Agency</div>
          <div style={{ fontSize:10, color:t.sub }}>2026 소속모델 정산관리</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
          <button onClick={undo} disabled={!canUndo} style={{ width:28, height:28, borderRadius:6, border:`1px solid ${t.border}`, background:canUndo?t.card:"transparent", color:canUndo?t.text:t.sub, cursor:canUndo?"pointer":"not-allowed", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>↩</button>
          <button onClick={redo} disabled={!canRedo} style={{ width:28, height:28, borderRadius:6, border:`1px solid ${t.border}`, background:canRedo?t.card:"transparent", color:canRedo?t.text:t.sub, cursor:canRedo?"pointer":"not-allowed", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>↪</button>
          <button onClick={handleSave} disabled={saveStatus==="saving"} style={{ height:28, padding:"0 10px", borderRadius:6, border:"none", cursor:saveStatus==="saving"?"not-allowed":"pointer", fontWeight:700, fontSize:11, background:saveStatus==="saved"?"#d1fae5":saveStatus==="error"?"#fee2e2":unsaved?"#4f46e5":(dark?"#1e293b":"#e2e8f0"), color:saveStatus==="saved"?"#065f46":saveStatus==="error"?"#991b1b":unsaved?"#fff":t.sub }}>
            {saveStatus==="saving"?"저장 중...":saveStatus==="saved"?"✅ 저장됨":saveStatus==="error"?"❌ 실패":unsaved?"💾 저장":"저장됨"}
          </button>
          <button onClick={()=>setDark(v=>!v)} style={{ width:28, height:28, borderRadius:6, border:`1px solid ${t.border}`, background:t.card, color:t.text, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>{dark?"☀️":"🌙"}</button>
        </div>
      </header>

      <div style={{ maxWidth:"100%", margin:"0 auto", padding:`12px ${isMobile?12:16}px`, display:"flex", gap:14, paddingBottom: isMobile ? 70 : 16 }}>
        {/* 데스크탑 사이드바 */}
        {!isMobile && (
          <aside style={{ width:165, flexShrink:0 }}>
            <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:12, position:"sticky", top:56, overflowY:"auto", maxHeight:"calc(100vh - 70px)" }}>
              {NavContent}
            </div>
          </aside>
        )}

        {/* 메인 */}
        <main style={{ flex:1, minWidth:0 }}>
          {tab==="overview" && <Overview data={data} modelMeta={modelMeta} dark={dark} setTab={setTab} />}
          {tab==="tax" && <TaxSummary data={data} modelMeta={modelMeta} onUpdateRegNo={updateRegNo} dark={dark} />}
          {Object.keys(modelMeta).includes(tab) && <ModelDetail model={tab} meta={modelMeta[tab]} data={data} addEntry={addEntry} removeEntry={removeEntry} onUpdateAF={updateAF} dark={dark} />}
        </main>
      </div>

      {/* 모바일 하단 탭바 */}
      {isMobile && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:t.card, borderTop:`1px solid ${t.border}`, display:"flex", zIndex:50, boxShadow:"0 -2px 10px rgba(0,0,0,0.1)" }}>
          {[["overview","연간요약","📊"],["tax","세무요약","📋"],...Object.keys(modelMeta).slice(0,3).map(m=>[m,modelMeta[m].nameKr,modelMeta[m].nameEn[0]])].map(([id,label,icon])=>(
            <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:"8px 4px 10px", border:"none", background:"transparent", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:tab===id?20:16 }}>{icon}</span>
              <span style={{ fontSize:9, fontWeight:700, color:tab===id?"#4f46e5":t.sub, whiteSpace:"nowrap" }}>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}