import { useState, useEffect } from 'react';
import { db } from '../../lib/supabase';
import { calcKm, fmtDist, san } from '../../lib/utils';

export default function DiscoverResults({query,onAdd,userLoc}){
  const[results,setResults]=useState([]);const[loading,setLoading]=useState(false);
  useEffect(()=>{
    setLoading(true);
    const isCategory=["swimming","gaa","soccer","rugby","gymnastics","dance","martial_arts","tennis","athletics","hockey","music","coding","sailing","scouts","basketball","cricket","horse_riding","multi_activity"].includes(query);
    const filters=isCategory?["category=eq."+query]:["or=(name.ilike.*"+san(query)+"*,location.ilike.*"+san(query)+"*,category.ilike.*"+san(query)+"*)"];
    db("clubs","GET",{select:"id,name,location,website_url,category,latitude,longitude",filters,limit:50,order:"name.asc"}).then(r=>{setResults(r||[]);setLoading(false)});
  },[query]);
  const catEmoji={swimming:"🏊",gaa:"🏐",soccer:"⚽",rugby:"🏉",gymnastics:"🤸",dance:"💃",martial_arts:"🥋",tennis:"🎾",athletics:"🏃",hockey:"🏑",music:"🎵",coding:"💻",sailing:"⛵",scouts:"🏕️",basketball:"🏀",cricket:"🏏",horse_riding:"🐎",multi_activity:"🎯"};
  const catName={swimming:"Swimming",gaa:"GAA",soccer:"Soccer",rugby:"Rugby",gymnastics:"Gymnastics",dance:"Dance & Drama",martial_arts:"Martial Arts",tennis:"Tennis",athletics:"Athletics",hockey:"Hockey",music:"Music",coding:"Coding & STEM",sailing:"Sailing",scouts:"Scouts",basketball:"Basketball",cricket:"Cricket",horse_riding:"Horse Riding",multi_activity:"Multi-Activity"};
  // Filter by distance then sort
  const filtered=results.filter(c=>!userLoc||!c.latitude||calcKm(userLoc.lat,userLoc.lng,Number(c.latitude),Number(c.longitude))<=15).sort((a,b)=>{if(userLoc&&a.latitude&&b.latitude){return calcKm(userLoc.lat,userLoc.lng,Number(a.latitude),Number(a.longitude))-calcKm(userLoc.lat,userLoc.lng,Number(b.latitude),Number(b.longitude))}return 0});
  return <div style={{marginBottom:24}}>
    <h3 style={{fontFamily:"var(--sr)",fontSize:17,fontWeight:700,color:"var(--g)",marginBottom:4}}>{catName[query]||query}</h3>
    <p style={{fontSize:12,color:"var(--mt)",marginBottom:12}}>{filtered.length} club{filtered.length!==1?"s":""} near you</p>
    {loading&&<p style={{textAlign:"center",padding:20,color:"var(--mt)"}}>Loading...</p>}
    {!loading&&filtered.length===0&&<p style={{textAlign:"center",padding:20,color:"var(--mt)"}}>No clubs found near you for "{query}"</p>}
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
    {filtered.map(club=>{const dist=(()=>{if(!club.latitude)return null;const cL=Number(club.latitude),cN=Number(club.longitude);let min=999;if(userLoc)min=Math.min(min,calcKm(userLoc.lat,userLoc.lng,cL,cN));return min<999?min:null})();return <div key={club.id} style={{background:"var(--card)",border:"1px solid var(--bd)",borderRadius:14,padding:14,boxShadow:"var(--shadow)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:22,width:36,textAlign:"center"}}>{catEmoji[club.category]||"🏠"}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:"var(--g)"}}>{club.name}</div>
          <div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}>
            {club.location&&<span style={{fontSize:12,color:"var(--mt)"}}>{club.location}</span>}
            {dist!==null&&<span style={{fontSize:11,fontWeight:600,padding:"2px 6px",borderRadius:5,background:"#e8f0f5",color:"var(--gl)"}}>📍 {fmtDist(dist)}</span>}
          </div>
          {club.website_url&&<a href={club.website_url} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()} style={{fontSize:11,color:"var(--acc)",textDecoration:"none"}}>🌐 {club.website_url.replace("https://","").replace("www.","").replace(/\/$/,"")}</a>}
        </div>
        <button onClick={()=>onAdd(club)} style={{padding:"6px 14px",borderRadius:10,border:"1.5px solid var(--g)",background:"none",fontSize:12,fontWeight:700,color:"var(--g)",cursor:"pointer",fontFamily:"var(--sn)",whiteSpace:"nowrap"}}>+ Add</button>
      </div>
    </div>})}
    </div>
  </div>;
}
