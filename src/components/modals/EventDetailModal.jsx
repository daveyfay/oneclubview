import { useState, useEffect } from 'react';
import ICN from '../../lib/icons';
import { COLS } from '../../lib/constants';

const COLOUR_OPTIONS = [...COLS, "#999", "#1a2a3a", "#dc2626", "#c4960c"];

export default function EventDetailModal({event,open,onClose,onDelete,onDriverChange,onAttendeesChange,onMarkPaid,onColourChange,adults,familyAll}){
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
    return <div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(10,15,20,.45)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} className="modal-overlay">
      <div onClick={e=>e.stopPropagation()} className="modal-sheet" style={{background:"var(--card)",borderRadius:20,padding:24,width:"100%",maxWidth:400,boxShadow:"var(--shadow-xl)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:isOverdue?"#dc2626":isDueSoon?"var(--acc)":"#c4960c",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>
              {isOverdue?"Overdue":isDueSoon?"Due soon":"Payment due"}
            </div>
            <h3 style={{fontFamily:"var(--sr)",fontSize:20,fontWeight:800,color:"var(--g)",lineHeight:1.2}}>{event.payDescription||"Payment"}</h3>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:10,border:"none",background:"var(--warm)",cursor:"pointer",fontSize:16,color:"var(--mt)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
        </div>

        {/* Amount display */}
        <div style={{background:isOverdue?"#fef2f2":"var(--accl)",borderRadius:16,padding:20,textAlign:"center",marginBottom:16}}>
          <div style={{fontFamily:"var(--sr)",fontSize:36,fontWeight:800,color:isOverdue?"#dc2626":"var(--g)"}}>€{(event.payAmount||0).toFixed(2)}</div>
        </div>

        {/* Details */}
        <div style={{borderTop:"1px solid var(--bd)",borderBottom:"1px solid var(--bd)",padding:"8px 0",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
            <span style={{fontSize:14,color:"var(--mt)"}}>For</span>
            <span style={{fontSize:14,fontWeight:700,color:"var(--tx)"}}>{event.member}</span>
          </div>
          {event.payClub&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:"1px solid var(--bd)"}}>
            <span style={{fontSize:14,color:"var(--mt)"}}>Club</span>
            <span style={{fontSize:14,fontWeight:700,color:"var(--tx)"}}>{event.payClub}</span>
          </div>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:"1px solid var(--bd)"}}>
            <span style={{fontSize:14,color:"var(--mt)"}}>Due date</span>
            <span style={{fontSize:14,fontWeight:700,color:isOverdue?"#dc2626":"var(--tx)"}}>
              {dueDate?dueDate.toLocaleDateString("en-IE",{day:"numeric",month:"short",year:"numeric"}):"—"}
              {isOverdue?" ("+Math.abs(daysUntil)+" days overdue)":""}
              {isDueSoon&&daysUntil===0?" (today)":""}
              {isDueSoon&&daysUntil===1?" (tomorrow)":""}
              {isDueSoon&&daysUntil>1?" (in "+daysUntil+" days)":""}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:0,padding:"14px 20px",borderRadius:"var(--radius)",border:"1.5px solid var(--bd)",background:"none",color:"var(--tx)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--sn)",minHeight:48}}>Close</button>
          <button onClick={async()=>{
            setMarking(true);
            if(onMarkPaid)await onMarkPaid(event);
            setMarking(false);
          }} className="btn" style={{flex:1,background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",fontSize:14,fontWeight:700,minHeight:48,border:"none",borderRadius:"var(--radius)",cursor:"pointer",fontFamily:"var(--sn)",opacity:marking?.6:1}}>
            {marking?"Marking...":"✓ Mark as Paid"}
          </button>
        </div>
      </div>
    </div>;
  }

  // Regular event detail view
  return <div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(10,15,20,.45)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} className="modal-overlay">
    <div onClick={e=>e.stopPropagation()} className="modal-sheet" style={{background:"var(--card)",borderRadius:20,padding:24,width:"100%",maxWidth:400,boxShadow:"var(--shadow-xl)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <h3 style={{fontFamily:"var(--sr)",fontSize:20,fontWeight:800,color:"var(--g)",lineHeight:1.2,maxWidth:"85%"}}>{event.member} — {event.club||event.title||"Event"}</h3>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:10,border:"none",background:"var(--warm)",cursor:"pointer",fontSize:16,color:"var(--mt)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
      </div>

      <div style={{borderTop:"1px solid var(--bd)",borderBottom:"1px solid var(--bd)",padding:"16px 0",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0"}}>
          <span style={{fontSize:14,color:"var(--mt)"}}>Time</span>
          <span style={{fontSize:14,fontWeight:700,color:"var(--tx)"}}>{event.time||"—"}{event.endTime?"–"+event.endTime:""}</span>
        </div>
        {(event.club||event.title)&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:"1px solid var(--bd)"}}>
          <span style={{fontSize:14,color:"var(--mt)"}}>{isManual?"Event":"Club"}</span>
          <span style={{fontSize:14,fontWeight:700,color:"var(--tx)"}}>{event.club||event.title}</span>
        </div>}
        {event.location&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:"1px solid var(--bd)"}}>
          <span style={{fontSize:14,color:"var(--mt)"}}>Location</span>
          <span style={{fontSize:14,fontWeight:600,color:"var(--tx)",textAlign:"right",maxWidth:"60%"}}>{event.location}</span>
        </div>}
        {/* Colour row — only for one-off/manual events; recurring events inherit club colour */}
        {isManual&&<><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:"1px solid var(--bd)"}}>
          <span style={{fontSize:14,color:"var(--mt)"}}>Colour</span>
          <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={()=>setShowColours(!showColours)}>
            <div style={{width:20,height:20,borderRadius:6,background:event.colour||"#999",border:"2px solid var(--bd)"}}/>
            <span style={{fontSize:12,color:"var(--mt)"}}>{showColours?"▲":"▼"}</span>
          </div>
        </div>
        {showColours&&<div style={{display:"flex",gap:6,flexWrap:"wrap",padding:"8px 0"}}>
          {COLOUR_OPTIONS.map(c=><div key={c} onClick={()=>{if(onColourChange)onColourChange(event,c);setShowColours(false)}} style={{width:28,height:28,borderRadius:8,background:c,cursor:"pointer",border:event.colour===c?"3px solid var(--g)":"2px solid var(--bd)",transition:"transform .1s"}} onTouchStart={ev=>ev.currentTarget.style.transform="scale(.85)"} onTouchEnd={ev=>ev.currentTarget.style.transform=""}/>)}
        </div>}</>}
      </div>

      {/* Who's going — for manual events, show all family members */}
      {isManual&&allFamily.length>0&&<div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--mt)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Who's going?</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {allFamily.map(name=><button key={name} onClick={()=>toggleGoing(name)}
            style={{padding:"8px 16px",borderRadius:12,border:going.includes(name)?"2px solid var(--g)":"1.5px solid var(--bd)",background:going.includes(name)?"var(--gxl)":"#fff",fontSize:13,fontWeight:going.includes(name)?700:500,color:going.includes(name)?"var(--g)":"var(--tx)",cursor:"pointer",fontFamily:"var(--sn)"}}>{name}</button>)}
          <button onClick={()=>{const next=[...allFamily];setGoing(next);if(onAttendeesChange)onAttendeesChange(event,next)}}
            style={{padding:"8px 16px",borderRadius:12,border:going.length===allFamily.length?"2px solid var(--g)":"1.5px solid var(--bd)",background:going.length===allFamily.length?"var(--gxl)":"#fff",fontSize:13,fontWeight:going.length===allFamily.length?700:500,color:going.length===allFamily.length?"var(--g)":"var(--tx)",cursor:"pointer",fontFamily:"var(--sn)"}}>Everyone</button>
        </div>
      </div>}

      {/* Driver picker — adults only */}
      {isRecurring&&driverOptions.length>0&&<div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--mt)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Who's driving?</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {driverOptions.map(a=><button key={a} onClick={()=>{if(onDriverChange)onDriverChange(event,a)}}
            style={{padding:"8px 16px",borderRadius:12,border:event.driver===a?"2px solid var(--g)":"1.5px solid var(--bd)",background:event.driver===a?"var(--gxl)":"#fff",fontSize:13,fontWeight:event.driver===a?700:500,color:event.driver===a?"var(--g)":"var(--tx)",cursor:"pointer",fontFamily:"var(--sn)",display:"flex",alignItems:"center",gap:6}}><span style={{display:"flex"}}>{ICN.car}</span> {a}</button>)}
        </div>
      </div>}

      {isCamp&&<div style={{fontSize:13,color:"var(--mt)",fontStyle:"italic",marginBottom:16}}>This is a camp booking</div>}
      {isRecurring&&<div style={{fontSize:13,color:"var(--mt)",fontStyle:"italic",marginBottom:16}}>Recurring weekly activity</div>}

      <div style={{display:"flex",gap:10}}>
        <button onClick={onClose} className="btn bp" style={{flex:1}}>Done</button>
        {(isManual||isRecurring)&&<button onClick={()=>{onDelete(event);onClose()}} style={{flex:0,padding:"14px 20px",borderRadius:"var(--radius)",border:"1.5px solid #dc2626",background:"none",color:"#dc2626",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--sn)",minHeight:48,whiteSpace:"nowrap"}}>{isRecurring?"Skip this week":"Remove"}</button>}
      </div>
    </div>
  </div>;
}
