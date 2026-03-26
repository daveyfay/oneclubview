import { useState, useEffect } from 'react';
import { db, rpc } from '../../lib/supabase';
import { calcKm, fmtDist, getAge, fmtDate } from '../../lib/utils';

export default function CampCard({camp,kids,userId,campBookings,setCampBookings,schoolLocs,allLocs,CC}){
  const[classmateCount,setClassmateCount]=useState(0);
  const activeKid=kids.length>0?kids[0]:null;
  const hasSchool=activeKid?.school_name&&activeKid?.school_class;
  const myBooking=campBookings.find(b=>b.camp_id===camp.id&&b.user_id===userId);
  const anyBooking=campBookings.find(b=>b.camp_id===camp.id);
  const ct={i:"⛺"};
  const coversWork=camp.daily_end_time&&camp.daily_end_time>="15:00";

  useEffect(()=>{
    if(hasSchool&&activeKid){
      rpc("camp_classmates_count",{p_camp_id:camp.id,p_dependant_id:activeKid.id}).then(n=>{
        if(n!=null)setClassmateCount(n);
      });
    } else {setClassmateCount(0)}
  },[camp.id,activeKid?.id,hasSchool,campBookings.length]);

  async function markCamp(status){
    if(myBooking)return;
    await db("camp_bookings","POST",{body:{user_id:userId,dependant_id:activeKid?.id||null,camp_id:camp.id,status}});
    const updated=await db("camp_bookings","GET",{});
    setCampBookings(updated||[]);
  }
  async function removeCamp(){
    if(myBooking)await db("camp_bookings","DELETE",{filters:["id=eq."+myBooking.id]});
    const updated=await db("camp_bookings","GET",{});
    setCampBookings(updated||[]);
  }

  return <div style={{background:"var(--card)",borderRadius:16,border:"1px solid var(--bd)",padding:16,marginBottom:10}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
          <span style={{fontSize:16}}>{ct.i}</span>
          <span style={{fontSize:14,fontWeight:700}}>{camp.title}</span>
        </div>
        <div style={{fontSize:12,color:"var(--mt)"}}>{camp.location_name}</div>
        <div style={{fontSize:12,color:"var(--mt)",marginTop:2}}>
          {camp.start_date&&camp.end_date?fmtDate(new Date(camp.start_date+"T00:00"))+" – "+fmtDate(new Date(camp.end_date+"T00:00")):""}
          {camp.daily_start_time&&camp.daily_end_time?" · "+camp.daily_start_time?.slice(0,5)+"–"+camp.daily_end_time?.slice(0,5):""}
        </div>
        <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
          <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,background:"var(--accl)",color:"#c44030"}}>€{camp.cost_eur}</span>
          <span style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:6,background:"#f0f0f0",color:"var(--mt)"}}>Ages {camp.age_min}–{camp.age_max}</span>
          {(()=>{const suited=kids.filter(k=>{const a=k.date_of_birth?Math.floor((new Date()-new Date(k.date_of_birth))/(365.25*86400000)):null;return a!==null&&a>=camp.age_min&&a<=camp.age_max});return suited.length>0?<span style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:6,background:"#e8f0fe",color:"#1a56db"}}>👧 Suits {suited.map(k=>k.first_name).join(", ")}</span>:null})()}
          {coversWork&&<span style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:6,background:"var(--gxl)",color:"var(--gl)"}}>✓ Covers work day</span>}
          {camp.latitude&&allLocs.length>0&&(()=>{const cLat=Number(camp.latitude),cLng=Number(camp.longitude);let min=999;allLocs.forEach(loc=>{min=Math.min(min,calcKm(loc.lat,loc.lng,cLat,cLng))});return min<999?<span style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:6,background:"#e8f0f5",color:"var(--gl)"}}>📍 {fmtDist(min)}</span>:null})()}
        </div>
      </div>
    </div>

    {/* Classmate notification */}
    {classmateCount>0&&<div style={{marginTop:10,padding:"8px 12px",borderRadius:10,background:"#eef6ff",border:"1px solid #c5ddf5",display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:14}}>🏫</span>
      <span style={{fontSize:12,fontWeight:600,color:"#1a5fa0"}}>{classmateCount} {classmateCount===1?"family":"families"} from {activeKid.school_class} at {activeKid.school_name} {classmateCount===1?"has":"have"} booked this camp</span>
    </div>}
    {hasSchool&&classmateCount===0&&<div style={{marginTop:8,fontSize:11,color:"var(--mt)",fontStyle:"italic"}}>
      🏫 We'll notify you when classmates from {activeKid.school_class} book this camp
    </div>}

    {/* Interested / Booked buttons */}
    <div style={{display:"flex",gap:6,marginTop:10}}>
      {!myBooking?<>
        <button onClick={()=>markCamp("interested")} style={{flex:1,padding:8,borderRadius:10,border:"1px solid var(--bd)",background:"var(--card)",cursor:"pointer",fontSize:12,fontWeight:700,color:"var(--mt)",fontFamily:"var(--sn)"}}>❤️ Interested</button>
        <button onClick={()=>markCamp("booked")} style={{flex:1,padding:8,borderRadius:10,border:"1px solid var(--g)",background:"var(--card)",cursor:"pointer",fontSize:12,fontWeight:700,color:"var(--g)",fontFamily:"var(--sn)"}}>Mark booked</button>
      </>:
        <div style={{flex:1,padding:8,borderRadius:10,background:myBooking.status==="booked"?"var(--gxl)":"var(--accl)",textAlign:"center",fontSize:12,fontWeight:700,color:myBooking.status==="booked"?"var(--gl)":"#8a6d00"}}>
          {myBooking.status==="booked"?"✓ Booked":"❤️ Interested"}
          <button onClick={removeCamp} style={{marginLeft:8,background:"none",border:"none",fontSize:11,color:"var(--mt)",cursor:"pointer",textDecoration:"underline"}}>undo</button>
        </div>
      }
    </div>

    {camp.booking_url&&camp.booking_url!=="#"&&<a href={camp.booking_url} target="_blank" rel="noopener" style={{display:"block",marginTop:6,textAlign:"center",padding:10,borderRadius:10,background:"var(--g)",color:"#fff",fontSize:13,fontWeight:700,textDecoration:"none"}}>Book on their site →</a>}
  </div>;
}
