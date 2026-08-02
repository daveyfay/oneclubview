import { useState, useEffect } from 'react';
import ICN from '../../lib/icons';
import { COLS, CLUB_ICONS } from '../../lib/constants';
import OcvModal from './OcvModal';
import { db } from '../../lib/supabase';
import { showToast, colourToGrad } from '../../lib/utils';

const COLOUR_OPTIONS = [...COLS, "#999", "#1a2a3a", "#dc2626", "#c4960c"];

export default function EventDetailModal({event,open,onClose,onDelete,onDriverChange,onAttendeesChange,onMarkPaid,onColourChange,adults,familyAll,load,getMemberCol}){
  const[going,setGoing]=useState([]);
  const[marking,setMarking]=useState(false);
  const[showColours,setShowColours]=useState(false);
  useEffect(()=>{
    if(open&&event){
      setGoing(event.attendees||[]);
      setMarking(false);
      setShowColours(false);
    }
  },[open,event]);
  if(!open||!event)return null;
  const isManual=event.source_type==="manual";
  const isRecurring=event.source_type==="recurring";
  const isCamp=event.source_type==="camp";
  const isPayment=event.source_type==="payment"||event.isPayment;
  const driverOptions=adults||[];
  const allFamily=familyAll||[];
  function toggleGoing(name){
    const next=going.includes(name)?going.filter(n=>n!==name):[...going,name];
    setGoing(next);
    if(onAttendeesChange)onAttendeesChange(event,next);
  }

  // Payment detail view
  if(isPayment){
    const dueDate=event.payDueDate?new Date(event.payDueDate+"T00:00:00"):null;
    const now=new Date();
    const daysUntil=dueDate?Math.ceil((dueDate-now)/(86400000)):null;
    const isOverdue=daysUntil!==null&&daysUntil<0;
    const isDueSoon=daysUntil!==null&&daysUntil>=0&&daysUntil<=3;
    const statusLabel=isOverdue?"Overdue":isDueSoon?"Due soon":"Payment due";

    return <OcvModal
      open={true}
      onClose={onClose}
      title={event.payDescription||"Payment"}
      width={400}
      footer={
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:0,padding:"14px 20px",borderRadius:"var(--radius)",border:"1.5px solid var(--color-border)",background:"none",color:"var(--color-text)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)",minHeight:48}}>Close</button>
          <button onClick={async()=>{
            setMarking(true);
            if(onMarkPaid)await onMarkPaid(event);
            setMarking(false);
          }} className="btn" style={{flex:1,background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",fontSize:14,fontWeight:700,minHeight:48,border:"none",borderRadius:"var(--radius)",cursor:"pointer",fontFamily:"var(--font-sans)",opacity:marking?.6:1}}>
            {marking?"Marking...":"\u2713 Mark as Paid"}
          </button>
        </div>
      }
    >
      <div style={{fontSize:11,fontWeight:700,color:isOverdue?"#dc2626":isDueSoon?"var(--color-accent)":"#c4960c",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>
        {statusLabel}
      </div>

      {/* Amount display */}
      <div style={{background:isOverdue?"#fef2f2":"var(--color-accent-bg)",borderRadius:16,padding:20,textAlign:"center",marginBottom:16}}>
        <div style={{fontFamily:"var(--font-serif)",fontSize:36,fontWeight:800,color:isOverdue?"#dc2626":"var(--color-primary)"}}>€{(event.payAmount||0).toFixed(2)}</div>
      </div>

      {/* Details */}
      <div style={{borderTop:"1px solid var(--color-border)",borderBottom:"1px solid var(--color-border)",padding:"8px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
          <span style={{fontSize:14,color:"var(--color-muted)"}}>For</span>
          <span style={{fontSize:14,fontWeight:700,color:"var(--color-text)"}}>{event.member}</span>
        </div>
        {event.payClub&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:"1px solid var(--color-border)"}}>
          <span style={{fontSize:14,color:"var(--color-muted)"}}>Club</span>
          <span style={{fontSize:14,fontWeight:700,color:"var(--color-text)"}}>{event.payClub}</span>
        </div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:"1px solid var(--color-border)"}}>
          <span style={{fontSize:14,color:"var(--color-muted)"}}>Due date</span>
          <span style={{fontSize:14,fontWeight:700,color:isOverdue?"#dc2626":"var(--color-text)"}}>
            {dueDate?dueDate.toLocaleDateString("en-IE",{day:"numeric",month:"short",year:"numeric"}):"\u2014"}
            {isOverdue?" ("+Math.abs(daysUntil)+" days overdue)":""}
            {isDueSoon&&daysUntil===0?" (today)":""}
            {isDueSoon&&daysUntil===1?" (tomorrow)":""}
            {isDueSoon&&daysUntil>1?" (in "+daysUntil+" days)":""}
          </span>
        </div>
      </div>
    </OcvModal>;
  }

  // Regular event detail view
  const icon = CLUB_ICONS[event.category] || CLUB_ICONS.other;
  const grad = colourToGrad(event.colour);
  const memberCol = getMemberCol ? getMemberCol(event.memberId, event.colour) : event.colour || "#999";
  const typeLabel = isRecurring ? "Recurring weekly" : isCamp ? "Camp booking" : "One-off event";
  const tintBg = (event.colour || "#999") + "14";

  return <OcvModal
    open={true}
    onClose={onClose}
    title=""
    width={400}
    footer={
      <div style={{display:"flex",gap:10}}>
        <button onClick={onClose} style={{flex:0,padding:"14px 20px",borderRadius:"var(--radius)",border:"1px solid var(--color-border)",background:"var(--color-card)",color:"var(--color-text)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)",minHeight:48}}>Close</button>
        {event.skipped && isRecurring && (
          <button
            className="btn btn-primary"
            style={{flex:1}}
            onClick={async () => {
              const dateStr = event.date.toISOString().split("T")[0];
              const rec = await db("recurring_events", "GET", { filters: ["id=eq." + event.source_id] });
              if (rec && rec[0]) {
                const updated = (rec[0].excluded_dates || []).filter(d => d !== dateStr);
                await db("recurring_events", "PATCH", {
                  filters: ["id=eq." + event.source_id],
                  body: { excluded_dates: updated },
                });
                showToast("Week restored!");
                if (load) load();
                onClose();
              }
            }}
          >
            Restore this week
          </button>
        )}
        {isManual && !event.skipped && <button onClick={()=>{
          if(window.confirm("Remove this event? This can't be undone.")){
            onDelete(event);onClose();
          }
        }} style={{flex:0,padding:"14px 20px",borderRadius:"var(--radius)",border:"1px solid #fca5a5",background:"#fef2f2",color:"#ef4444",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)",minHeight:48,whiteSpace:"nowrap"}}>Remove</button>}
        {isRecurring && !event.skipped && <button onClick={()=>{
          if(window.confirm("Skip this week?")){
            onDelete(event);onClose();
          }
        }} style={{flex:0,padding:"14px 20px",borderRadius:"var(--radius)",border:"none",background:"#f1f5f9",color:"#64748b",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)",minHeight:48,whiteSpace:"nowrap"}}>Skip week</button>}
      </div>
    }
  >
    {/* Rich header band */}
    <div style={{background:event.skipped?"linear-gradient(135deg,#94a3b8,#64748b)":grad,padding:"20px 16px",color:"#fff",borderRadius:"12px 12px 0 0",margin:"-16px -16px 16px -16px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{width:40,height:40,background:"rgba(255,255,255,.2)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{icon.emoji}</div>
        <div>
          <div style={{fontSize:16,fontWeight:700}}>{event.club||event.title||"Event"}</div>
          <div style={{fontSize:12,opacity:.8}}>{icon.label} &middot; {typeLabel}</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:memberCol,border:"1.5px solid rgba(255,255,255,.5)"}}/>
        <span style={{fontSize:13,fontWeight:600}}>{event.member}</span>
      </div>
    </div>

    {/* Time + Location info cards */}
    <div style={{display:"flex",gap:12,marginBottom:16}}>
      <div style={{flex:1,background:tintBg,borderRadius:10,padding:10,textAlign:"center"}}>
        <div style={{fontSize:10,color:"var(--color-muted)",textTransform:"uppercase",marginBottom:2}}>Time</div>
        <div style={{fontSize:15,fontWeight:700,color:"var(--color-text)"}}>{event.time||"\u2014"}{event.endTime?"\u2013"+event.endTime:""}</div>
      </div>
      {event.location && <div style={{flex:1,background:tintBg,borderRadius:10,padding:10,textAlign:"center"}}>
        <div style={{fontSize:10,color:"var(--color-muted)",textTransform:"uppercase",marginBottom:2}}>Location</div>
        <div style={{fontSize:13,fontWeight:600,color:"var(--color-text)"}}>{event.location}</div>
      </div>}
    </div>

    {/* Colour row — only for one-off/manual events */}
    {isManual&&<><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:"1px solid var(--color-border)"}}>
      <span style={{fontSize:14,color:"var(--color-muted)"}}>Colour</span>
      <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={()=>setShowColours(!showColours)}>
        <div style={{width:20,height:20,borderRadius:6,background:event.colour||"#999",border:"2px solid var(--color-border)"}}/>
        <span style={{fontSize:12,color:"var(--color-muted)"}}>{showColours?"\u25B2":"\u25BC"}</span>
      </div>
    </div>
    {showColours&&<div style={{display:"flex",gap:6,flexWrap:"wrap",padding:"8px 0"}}>
      {COLOUR_OPTIONS.map(c=><div key={c} onClick={()=>{if(onColourChange)onColourChange(event,c);setShowColours(false)}} style={{width:28,height:28,borderRadius:8,background:c,cursor:"pointer",border:event.colour===c?"3px solid var(--color-primary)":"2px solid var(--color-border)",transition:"transform .1s"}} onTouchStart={ev=>ev.currentTarget.style.transform="scale(.85)"} onTouchEnd={ev=>ev.currentTarget.style.transform=""}/>)}
    </div>}</>}

    {/* Who's going — for manual events */}
    {isManual&&allFamily.length>0&&<div style={{marginBottom:20}}>
      <div style={{fontSize:11,fontWeight:700,color:"var(--color-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Who's going?</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {allFamily.map(name=><button key={name} onClick={()=>toggleGoing(name)}
          style={{padding:"8px 16px",borderRadius:12,border:going.includes(name)?"2px solid var(--color-primary)":"1.5px solid var(--color-border)",background:going.includes(name)?"var(--color-primary-bg)":"#fff",fontSize:13,fontWeight:going.includes(name)?700:500,color:going.includes(name)?"var(--color-primary)":"var(--color-text)",cursor:"pointer",fontFamily:"var(--font-sans)"}}>{name}</button>)}
        <button onClick={()=>{const next=[...allFamily];setGoing(next);if(onAttendeesChange)onAttendeesChange(event,next)}}
          style={{padding:"8px 16px",borderRadius:12,border:going.length===allFamily.length?"2px solid var(--color-primary)":"1.5px solid var(--color-border)",background:going.length===allFamily.length?"var(--color-primary-bg)":"#fff",fontSize:13,fontWeight:going.length===allFamily.length?700:500,color:going.length===allFamily.length?"var(--color-primary)":"var(--color-text)",cursor:"pointer",fontFamily:"var(--font-sans)"}}>Everyone</button>
      </div>
    </div>}

    {/* Driver picker — adults only, uses club color for selected state */}
    {isRecurring&&driverOptions.length>0&&<div style={{marginBottom:20}}>
      <div style={{fontSize:11,fontWeight:700,color:"var(--color-muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Who's driving?</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {driverOptions.map(a=><button key={a} onClick={()=>{if(onDriverChange)onDriverChange(event,a)}}
          style={{padding:"8px 16px",borderRadius:12,border:event.driver===a?`2px solid ${event.colour||"var(--color-primary)"}`:"1.5px solid var(--color-border)",background:event.driver===a?tintBg:"#fff",fontSize:13,fontWeight:event.driver===a?700:500,color:event.driver===a?(event.colour||"var(--color-primary)"):"var(--color-text)",cursor:"pointer",fontFamily:"var(--font-sans)",display:"flex",alignItems:"center",gap:6}}><span style={{display:"flex"}}>{ICN.car}</span> {a}{event.driver===a?" \u2713":""}</button>)}
      </div>
    </div>}
  </OcvModal>;
}
