import { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/supabase';
import { calcKm, fmtDist, san } from '../../lib/utils';
import { CT } from '../../lib/constants';
import ICN from '../../lib/icons';

const catEmoji={swimming:"🏊",gaa:"🏐",soccer:"⚽",rugby:"🏉",gymnastics:"🤸",dance:"💃",martial_arts:"🥋",tennis:"🎾",athletics:"🏃",hockey:"🏑",music:"🎵",coding:"💻",sailing:"⛵",scouts:"🏕️",basketball:"🏀",cricket:"🏏",horse_riding:"🐎",multi_activity:"🎯",drama:"🎭",art:"🎨","multi-sport":"🏅",football:"⚽",youth:"👦"};

export default function NearbyClubsSection({userLoc,familyLocs,clubs:myClubs,setEditClub,isAdmin}){
  const[nearby,setNearby]=useState([]);const[loadNC,setLoadNC]=useState(true);const[ncSearch,setNcSearch]=useState("");
  const[activeLoc,setActiveLoc]=useState("current");
  const[allClubsCache,setAllClubsCache]=useState(null);
  const myClubIds=useMemo(()=>new Set(myClubs.map(c=>c.club_id)),[myClubs]);

  const locOptions=useMemo(()=>{
    const opts=[];
    if(userLoc)opts.push({id:"current",label:"📍 Near me",lat:userLoc.lat,lng:userLoc.lng,radius:10});
    (familyLocs||[]).forEach(fl=>opts.push({id:fl.id,label:fl.label,lat:Number(fl.latitude),lng:Number(fl.longitude),radius:fl.radius_km||10}));
    return opts;
  },[userLoc,familyLocs]);

  const selectedLoc=locOptions.find(l=>l.id===activeLoc)||locOptions[0];

  // Fetch all clubs once and cache
  useEffect(()=>{
    if(locOptions.length===0)return;
    db("clubs","GET",{select:"id,name,category,location,website_url,latitude,longitude",limit:500,order:"name.asc"}).then(r=>{
      setAllClubsCache((r||[]).filter(c=>c.latitude));
    });
  },[locOptions.length]);

  // Filter clubs when location changes
  useEffect(()=>{
    if(!allClubsCache||!selectedLoc)return;
    setLoadNC(true);setNcSearch("");
    const local=allClubsCache.filter(c=>calcKm(selectedLoc.lat,selectedLoc.lng,Number(c.latitude),Number(c.longitude))<=selectedLoc.radius);
    local.sort((a,b)=>calcKm(selectedLoc.lat,selectedLoc.lng,Number(a.latitude),Number(a.longitude))-calcKm(selectedLoc.lat,selectedLoc.lng,Number(b.latitude),Number(b.longitude)));
    setNearby(local.filter(c=>!myClubIds.has(c.id)));setLoadNC(false);
  },[activeLoc,allClubsCache,selectedLoc?.lat]);

  if(!selectedLoc)return <p style={{textAlign:"center",padding:12,color:"var(--mt)",fontSize:12}}>Enable location to see clubs near you</p>;
  if(loadNC)return <div style={{marginTop:20}}><h3 style={{fontFamily:"var(--sr)",fontSize:17,fontWeight:700,color:"var(--g)",marginBottom:8}}>Clubs near you</h3><p style={{textAlign:"center",padding:12,color:"var(--mt)",fontSize:12}}>Finding clubs...</p></div>;

  const catCounts={};
  nearby.forEach(c=>{const cat=c.category||"other";catCounts[cat]=(catCounts[cat]||0)+1});
  const sortedCats=Object.entries(catCounts).sort((a,b)=>b[1]-a[1]);
  const filtered=ncSearch?nearby.filter(c=>c.name.toLowerCase().includes(ncSearch.toLowerCase())||c.category===ncSearch):nearby;

  return <div style={{marginTop:20}}>
    <h3 style={{fontFamily:"var(--sr)",fontSize:17,fontWeight:700,color:"var(--g)",marginBottom:4}}>Clubs near you</h3>
    {locOptions.length>1&&<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:6,WebkitOverflowScrolling:"touch"}}>
      {locOptions.map(lo=><button key={lo.id} onClick={()=>setActiveLoc(lo.id)} className={"pill "+(lo.id===(selectedLoc?.id)?"pon":"poff")} style={{flexShrink:0}}>{lo.label}</button>)}
    </div>}
    <p style={{fontSize:12,color:"var(--mt)",marginBottom:10}}>📍 {nearby.length} clubs within {selectedLoc.radius}km</p>
    <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:10,WebkitOverflowScrolling:"touch"}}>
      <button onClick={()=>setNcSearch("")} className={"pill "+(ncSearch===""?"pon":"poff")}>All</button>
      {sortedCats.slice(0,8).map(([cat,cnt])=><button key={cat} onClick={()=>setNcSearch(ncSearch===cat?"":cat)} className={"pill "+(ncSearch===cat?"pon":"poff")}>{catEmoji[cat]||"🏠"} {cnt}</button>)}
    </div>
    <input value={typeof ncSearch==="string"&&!sortedCats.some(([cc])=>cc===ncSearch)?ncSearch:""} onChange={e=>setNcSearch(e.target.value)} placeholder="Search clubs..." style={{width:"100%",padding:"10px 14px",borderRadius:12,border:"1px solid var(--bd)",fontSize:13,marginBottom:10,fontFamily:"var(--sn)"}}/>
    {filtered.length===0&&<div style={{padding:16,borderRadius:14,border:"2px dashed var(--bd)",textAlign:"center"}}><div style={{fontSize:24,marginBottom:6}}>🔍</div><p style={{fontSize:13,color:"var(--mt)"}}>No clubs found here</p></div>}
    {filtered.slice(0,15).map(club=>{
      const dist=club.latitude?calcKm(selectedLoc.lat,selectedLoc.lng,Number(club.latitude),Number(club.longitude)):null;
      return <div key={club.id} style={{background:"var(--card)",border:"1px solid var(--bd)",borderRadius:14,padding:14,marginBottom:8,boxShadow:"var(--shadow)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:22,width:36,textAlign:"center"}}>{catEmoji[club.category]||"🏠"}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:"var(--g)"}}>{club.name}</div>
            <div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}>
              {club.location&&<span style={{fontSize:12,color:"var(--mt)"}}>{club.location}</span>}
              {dist!==null&&<span style={{fontSize:11,fontWeight:600,padding:"2px 6px",borderRadius:5,background:"#e8f0f5",color:"var(--gl)"}}>📍 {fmtDist(dist)}</span>}
            </div>
            {club.website_url&&<a href={club.website_url} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()} style={{fontSize:11,color:"var(--acc)",textDecoration:"none",marginTop:2,display:"block"}}>Visit website →</a>}
          </div>
          {isAdmin&&<button onClick={()=>{setEditClub(club)}} style={{padding:"6px 14px",borderRadius:10,border:"1.5px solid var(--g)",background:"none",fontSize:12,fontWeight:700,color:"var(--g)",cursor:"pointer",fontFamily:"var(--sn)"}}>+ Add</button>}
        </div>
      </div>;
    })}
    {filtered.length>15&&<p style={{fontSize:12,color:"var(--mt)",textAlign:"center",padding:8}}>Showing 15 of {filtered.length}. Search to find more.</p>}
  </div>;
}
