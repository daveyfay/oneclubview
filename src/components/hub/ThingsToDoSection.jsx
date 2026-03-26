import { useState, useEffect } from 'react';
import { db } from '../../lib/supabase';
import { track, showToast, calcKm, fmtDist, getAge } from '../../lib/utils';
import ICN from '../../lib/icons';
import DateTimePicker from '../modals/DateTimePicker';

export default function ThingsToDoSection({allLocs,kids,userLoc,setUserLoc,userId,onEventAdded}){
  const[things,setThings]=useState([]);const[loadingT,setLoadingT]=useState(true);const[tdFilter,setTdFilter]=useState("all");const[ageFilter,setAgeFilter]=useState(false);
  const[dpOpen,setDpOpen]=useState(false);const[dpItem,setDpItem]=useState(null);
  // Persist added items across page loads
  const[addedIds,setAddedIds]=useState(()=>{try{return new Set(JSON.parse(localStorage.getItem("ocv_added_things")||"[]"))}catch(e){return new Set()}});
  function markAdded(id){const next=new Set([...addedIds,id]);setAddedIds(next);try{localStorage.setItem("ocv_added_things",JSON.stringify([...next]))}catch(e){}}

  // Request live GPS when component mounts
  useEffect(()=>{
    if(!userLoc){
      navigator.geolocation?.getCurrentPosition(pos=>{
        setUserLoc({lat:pos.coords.latitude,lng:pos.coords.longitude});
      },()=>{},{timeout:5000,enableHighAccuracy:false});
    }
  },[]);

  useEffect(()=>{
    setLoadingT(true);
    db("things_to_do","GET",{select:"*",filters:["status=eq.active"],order:"title.asc",limit:100}).then(r=>{
      const all=(r||[]).filter(t=>t.latitude);
      if(allLocs.length===0){
        setThings(all);setLoadingT(false);return;
      }
      const local=all.filter(t=>{
        const tLat=Number(t.latitude),tLng=Number(t.longitude);
        return allLocs.some(loc=>calcKm(loc.lat,loc.lng,tLat,tLng)<=loc.radius+5);
      });
      local.sort((a,b)=>{
        const dist=(t)=>{let m=999;allLocs.forEach(loc=>{m=Math.min(m,calcKm(loc.lat,loc.lng,Number(t.latitude),Number(t.longitude)))});return m};
        return dist(a)-dist(b);
      });
      setThings(local.length>0?local:all);setLoadingT(false);
    });
  },[allLocs.length,userLoc]);

  if(loadingT)return <p style={{textAlign:"center",padding:20,color:"var(--mt)"}}>Finding things to do near you...</p>;
  if(things.length===0)return <div style={{padding:20,borderRadius:14,border:"2px dashed var(--bd)",textAlign:"center"}}><div style={{fontSize:28,marginBottom:6}}>🔍</div><p style={{fontSize:13,color:"var(--mt)"}}>No activities found in your area yet</p><p style={{fontSize:12,color:"var(--mt)",marginTop:4}}>We are building our database. Check back soon.</p></div>;

  const catIcon={outdoor:"🌲",indoor:"🏠",nature:"🍃",adventure:"🧗",farm:"🐄",beach:"🏖️",cultural:"🏛️",water_sports:"🚣",cycling:"🚲",playground:"🛝"};
  const catLabel={outdoor:"Outdoor",indoor:"Indoor",nature:"Nature",adventure:"Adventure",farm:"Farms",beach:"Beach",cultural:"Heritage",water_sports:"Water",cycling:"Cycling",playground:"Play"};

  const catCounts={};
  things.forEach(t=>{const cat=t.category||"outdoor";catCounts[cat]=(catCounts[cat]||0)+1});
  const sortedCats=Object.entries(catCounts).sort((a,b)=>b[1]-a[1]);

  const hasKids=kids.length>0;
  const kidAges=kids.map(k=>getAge(k.date_of_birth)).filter(a=>a!==null);
  const youngest=kidAges.length>0?Math.min(...kidAges):0;
  const oldest=kidAges.length>0?Math.max(...kidAges):99;

  const filtered=things.filter(t=>{
    if(tdFilter!=="all"&&t.category!==tdFilter)return false;
    if(ageFilter&&hasKids){
      return kidAges.some(age=>age>=(t.age_min||0)&&age<=(t.age_max||99))||t.audience==="all"||!t.age_min;
    }
    return true;
  });

  return <div>
    <h3 style={{fontFamily:"var(--sr)",fontSize:17,fontWeight:700,color:"var(--g)",marginBottom:4}}>Things to do near you</h3>
    <p style={{fontSize:12,color:"var(--mt)",marginBottom:10}}>{allLocs.length>0?"Sorted by distance from your locations":"Add locations for distance-sorted results"}</p>
    <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:12,WebkitOverflowScrolling:"touch"}}>
      <button onClick={()=>setTdFilter("all")} className={"pill "+(tdFilter==="all"?"pon":"poff")}>All ({things.length})</button>
      {hasKids&&<button onClick={()=>setAgeFilter(!ageFilter)} className={"pill "+(ageFilter?"pon":"poff")}>👧 My kids' ages</button>}
      {sortedCats.map(([cat,cnt])=><button key={cat} onClick={()=>setTdFilter(tdFilter===cat?"all":cat)} className={"pill "+(tdFilter===cat?"pon":"poff")}>{catIcon[cat]||"🎯"} {catLabel[cat]||cat} ({cnt})</button>)}
    </div>
    {filtered.map(t=>{
      const dist=(()=>{if(!t.latitude)return null;const tLat=Number(t.latitude),tLng=Number(t.longitude);let min=999;allLocs.forEach(loc=>{min=Math.min(min,calcKm(loc.lat,loc.lng,tLat,tLng))});return min<999?min:null})();
      const suitedKids=hasKids?kids.filter(k=>{const age=getAge(k.date_of_birth);return age!==null&&age>=t.age_min&&age<=t.age_max}):[];
      return <div key={t.id} style={{background:"var(--card)",border:"1px solid var(--bd)",borderRadius:16,padding:16,marginBottom:10,boxShadow:"var(--shadow)"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"var(--sage)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{catIcon[t.category]||"🎯"}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:"var(--tx)"}}>{t.title}</div>
            {t.location_name&&<div style={{fontSize:12,color:"var(--mt)",marginTop:2}}>{t.location_name}</div>}
            {t.description&&<div style={{fontSize:12,color:"var(--mt)",marginTop:4,lineHeight:1.4}}>{t.description.length>120?t.description.substring(0,120)+"...":t.description}</div>}
            <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
              {dist!==null&&<span style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:6,background:"#e8f0f5",color:"var(--gl)"}}>📍 {fmtDist(dist)}</span>}
              {t.cost_eur!==null&&<span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,background:"var(--accl)",color:"#c44030"}}>{Number(t.cost_eur)>0?"€"+t.cost_eur:"Free"}</span>}
              {suitedKids.length>0&&<span style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:6,background:"#e8f0fe",color:"#1a56db"}}>👧 Suits {suitedKids.map(k=>k.first_name).join(", ")}</span>}
              {t.age_max<99&&t.age_max<=14&&<span style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:6,background:"#f0f0f0",color:"var(--mt)"}}>Ages {t.age_min}–{t.age_max}</span>}
              {t.seasonal&&<span style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:6,background:"var(--goldl)",color:"#8a6d00"}}>{t.season_start}–{t.season_end}</span>}
              {t.event_date&&<span style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:6,background:"#fef3e2",color:"#b8860b"}}>📅 {new Date(t.event_date+"T00:00:00").toLocaleDateString("en-IE",{weekday:"short",day:"numeric",month:"short"})}{t.event_time?" · "+t.event_time:""}</span>}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          {!addedIds.has(t.id)?<button onClick={async()=>{
            if(t.event_date){
              await db("manual_events","POST",{body:{user_id:userId,title:t.title,event_date:t.event_date+"T"+(t.event_time||"10:00")+":00",location:t.location_name||"",description:t.description||""}});
              markAdded(t.id);showToast("Added to your schedule!");onEventAdded&&onEventAdded();
            }else{setDpItem(t);setDpOpen(true)}
          }} style={{flex:1,textAlign:"center",padding:12,borderRadius:14,border:"1.5px solid var(--g)",background:"none",color:"var(--g)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--sn)",minHeight:44}}>📅 Add to schedule</button>
          :<span style={{flex:1,textAlign:"center",padding:12,borderRadius:14,background:"var(--sage)",color:"var(--gl)",fontSize:13,fontWeight:700,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>✓ Added</span>}
          {t.website_url&&<a href={t.website_url} target="_blank" rel="noopener" style={{flex:1,textAlign:"center",padding:12,borderRadius:14,background:"var(--g)",color:"#fff",fontSize:13,fontWeight:700,textDecoration:"none",minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>Website →</a>}
        </div>
      </div>;
    })}
    {filtered.length===0&&<p style={{textAlign:"center",padding:20,color:"var(--mt)"}}>No activities match this filter</p>}
    <DateTimePicker open={dpOpen} onClose={()=>{setDpOpen(false);setDpItem(null)}} title={dpItem?"When are you going to "+dpItem.title+"?":"Pick a date"} onSelect={async(date,time)=>{
      if(dpItem){
        await db("manual_events","POST",{body:{user_id:userId,title:dpItem.title,event_date:date+"T"+time+":00",location:dpItem.location_name||"",description:dpItem.description||""}});
        markAdded(dpItem.id);showToast("Added to your schedule!");onEventAdded&&onEventAdded();
      }
    }}/>
  </div>;
}
