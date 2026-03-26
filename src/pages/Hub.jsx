import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, rpc, au, SB, SK, hd, getToken, clearTokens } from '../lib/supabase';
import { track, showToast, getAge, weekDates, isToday, calcKm, fmtDist, fmtDate } from '../lib/utils';
import { COLS, DAYF, CC, CT } from '../lib/constants';
import ICN from '../lib/icons';
import Logo from '../components/Logo';
import { OcvModal, OcvConfirm, OcvInput } from '../components/modals';
import CancelFeedback from '../components/CancelFeedback';

export default function Hub({user,profile,onRefresh,onLogout}){
  const[tab,setTab]=useState("week");const[filter,setFilter]=useState("all");
  const[kids,setKids]=useState([]);const[clubs,setClubs]=useState([]);const[recs,setRecs]=useState([]);
  const[mans,setMans]=useState([]);const[pays,setPays]=useState([]);const[camps,setCamps]=useState([]);const[campBookings,setCampBookings]=useState([]);const[holidays,setHolidays]=useState([]);const[userHolidays,setUserHolidays]=useState([]);
  const[schoolLocs,setSchoolLocs]=useState([]);
  const[familyLocs,setFamilyLocs]=useState([]);const[showLocations,setShowLocations]=useState(false);
  const[showAddEv,setShowAddEv]=useState(false);const[showAddPay,setShowAddPay]=useState(false);
  const[showAddKid,setShowAddKid]=useState(false);const[editClub,setEditClub]=useState(null);const[editHol,setEditHol]=useState(null);const[showAddHol,setShowAddHol]=useState(false);const[showInvite,setShowInvite]=useState(false);const[showSupport,setShowSupport]=useState(false);const[showFamily,setShowFamily]=useState(false);const[weekView,setWeekView]=useState("timeline");const[selectedDay,setSelectedDay]=useState(null);const[calMonth,setCalMonth]=useState(new Date().getMonth());const[calYear,setCalYear]=useState(new Date().getFullYear());const[showPaste,setShowPaste]=useState(false);const[showFab,setShowFab]=useState(false);const[editEvent,setEditEvent]=useState(null);const[showProfile,setShowProfile]=useState(false);const[localEvents,setLocalEvents]=useState([]);const[actCats,setActCats]=useState([]);const[loading,setLoading]=useState(true);const[userLoc,setUserLoc]=useState(null);const[familyMembers,setFamilyMembers]=useState([]);const[notifications,setNotifications]=useState([]);const[showNotifs,setShowNotifs]=useState(false);const[showAddActivity,setShowAddActivity]=useState(false);const[tapEvent,setTapEvent]=useState(null);
  const[showChangePw,setShowChangePw]=useState(false);const[showDeleteAcct,setShowDeleteAcct]=useState(false);
  const[showSaveLocModal,setShowSaveLocModal]=useState(false);const[showAddLocModal,setShowAddLocModal]=useState(false);
  const[campLoc,setCampLoc]=useState("all");

  async function load(){
    // Get family member IDs for shared data
    // Re-fetch profile to get latest family_id
    const freshProfile=await db("profiles","GET",{filters:["id=eq."+user.id]});
    const myFamilyId=freshProfile?.[0]?.family_id||profile?.family_id;
    let famIds=[user.id];
    if(myFamilyId){
      const famMembers=await db("profiles","GET",{filters:["family_id=eq."+myFamilyId],select:"id,first_name,email,subscription_status,is_beta,family_role"});
      if(famMembers){famIds=famMembers.map(m=>m.id);setFamilyMembers(famMembers);}
    }
    const uidFilter=famIds.length>1?"user_id=in.("+famIds.join(",")+")":"user_id=eq."+user.id;
    const pidFilter=famIds.length>1?"parent_user_id=in.("+famIds.join(",")+")":"parent_user_id=eq."+user.id;
    setLoading(true);
    const[k,c,r,m,p,ca,hols,userHols,cBooks,lEvts,aCats]=await Promise.all([
      db("dependants","GET",{filters:[pidFilter],order:"created_at.asc"}),
      db("hub_subscriptions","GET",{select:"id,club_id,dependant_id,colour,nickname,clubs(id,name,address,location,phone,rating)",filters:[uidFilter]}),
      db("recurring_events","GET",{filters:[uidFilter]}),
      db("manual_events","GET",{filters:[uidFilter]}),
      db("payment_reminders","GET",{filters:[uidFilter],order:"due_date.asc"}),
      db("camps","GET",{select:"id,title,camp_type,start_date,end_date,daily_start_time,daily_end_time,age_min,age_max,cost_eur,cost_notes,location_name,latitude,longitude,booking_url,source",filters:["status=eq.active"],order:"start_date.asc"}),
      db("school_holidays","GET",{order:"start_date.asc"}),
      db("user_school_holidays","GET",{filters:[uidFilter],order:"start_date.asc"}),
      db("camp_bookings","GET",{filters:[uidFilter]}),
      db("local_events","GET",{select:"*,category",order:"event_date.asc"}),
      db("activity_categories","GET",{order:"name.asc"})
    ]);
    setKids(k||[]);
    // Fetch school coordinates for kids' schools (for camp proximity matching)
    const kidSchools=(k||[]).filter(kid=>kid.school_name).map(kid=>kid.school_name);
    if(kidSchools.length>0){
      const uniqueSchools=[...new Set(kidSchools)];
      const schoolQ=uniqueSchools.map(s=>"name.ilike.*"+encodeURIComponent(s.replace(/'/g,"''"))+"*").join(",");
      const sch=await db("schools","GET",{select:"name,latitude,longitude",filters:["or=("+schoolQ+")","latitude=not.is.null"],limit:20});
      setSchoolLocs((sch||[]).filter(s=>s.latitude).map(s=>({lat:Number(s.latitude),lng:Number(s.longitude),name:s.name})));
    }
    setClubs((c||[]).map(s=>({...s,club_id:s.club_id||s.clubs?.id,club_name:s.clubs?.name||"?",club_addr:s.clubs?.address})));
    setRecs(r||[]);setMans(m||[]);setPays(p||[]);setCamps(ca||[]);setHolidays(hols||[]);setUserHolidays(userHols||[]);setCampBookings(cBooks||[]);setLocalEvents(lEvts||[]);setActCats(aCats||[]);
    // Load family locations
    const fLocs=await db("family_locations","GET",{filters:["user_id=eq."+user.id,"active=eq.true"],order:"label.asc"});
    setFamilyLocs(fLocs||[]);
    // Auto-add school locations if not already saved
    if(schoolLocs.length===0&&kidSchools.length>0){
      const uniqueSchools2=[...new Set(kidSchools)];
      const schoolQ2=uniqueSchools2.map(s=>"name.ilike.*"+encodeURIComponent(s.replace(/'/g,"''"))+"*").join(",");
      const sch2=await db("schools","GET",{select:"name,latitude,longitude",filters:["or=("+schoolQ2+")","latitude=not.is.null"],limit:20});
      const newSchLocs=(sch2||[]).filter(s=>s.latitude).map(s=>({lat:Number(s.latitude),lng:Number(s.longitude),name:s.name}));
      setSchoolLocs(newSchLocs);
      // Auto-insert school locations into family_locations if not there yet
      for(const sl of newSchLocs){
        const exists=(fLocs||[]).find(fl=>fl.label.includes("School")&&Math.abs(Number(fl.latitude)-sl.lat)<0.01);
        if(!exists)await db("family_locations","POST",{body:{user_id:user.id,label:"🏫 "+sl.name,latitude:sl.lat,longitude:sl.lng,radius_km:10,auto_source:"school",active:true}});
      }
      // Re-fetch after auto-insert
      const fLocs2=await db("family_locations","GET",{filters:["user_id=eq."+user.id,"active=eq.true"],order:"label.asc"});
      setFamilyLocs(fLocs2||[]);
    }
    setLoading(false);
    // Load notifications (inbound messages)
    const notifs=await db("inbound_messages","GET",{filters:["user_id=eq."+user.id],order:"created_at.desc",limit:10});
    setNotifications(notifs||[]);
    // Update last active
    db("profiles","PATCH",{body:{last_active_at:new Date().toISOString()},filters:["id=eq."+user.id]});
  }
  useEffect(()=>{
    load();
    // ALWAYS get fresh location — no caching. This ensures moving to a new area works.
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos=>{
        const loc={lat:pos.coords.latitude,lng:pos.coords.longitude};
        setUserLoc(loc);
        db("profiles","PATCH",{filters:["id=eq."+user.id],body:{latitude:loc.lat,longitude:loc.lng}});
        // Check if this area has been scraped recently — if not, fire ONE scrape
        rpc("needs_scrape",{lat:loc.lat,lng:loc.lng}).then(needed=>{
          if(needed){
            fetch(SB+"/functions/v1/scrape-local",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({latitude:loc.lat,longitude:loc.lng,user_id:user.id})}).then(r=>r.json()).then(d=>{if(d.status==="success")load()}).catch(()=>{});
          }
        }).catch(()=>{});
      },()=>{
        // Geolocation denied — use saved profile location
        db("profiles","GET",{filters:["id=eq."+user.id],select:"latitude,longitude"}).then(p=>{
          if(p&&p[0]&&p[0].latitude){
            const loc={lat:Number(p[0].latitude),lng:Number(p[0].longitude)};
            setUserLoc(loc);
          }
        });
      },{enableHighAccuracy:true,timeout:10000,maximumAge:0});
    }
  },[]);

  // When family locations load, scrape only genuinely new areas (not scraped in 7 days within 15km)
  useEffect(()=>{
    if(familyLocs.length===0)return;
    familyLocs.forEach(fl=>{
      rpc("needs_scrape",{lat:Number(fl.latitude),lng:Number(fl.longitude)}).then(needed=>{
        if(needed){
          fetch(SB+"/functions/v1/scrape-local",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({latitude:Number(fl.latitude),longitude:Number(fl.longitude)})}).then(r=>r.json()).then(d=>{if(d.status==="success")load()}).catch(()=>{});
        }
      }).catch(()=>{});
    });
  },[familyLocs.length]);

  const members=useMemo(()=>{
    const m=[{id:"all",name:"Everyone",emoji:"👨‍👩‍👧‍👦",type:"all"}];
    kids.forEach(k=>m.push({id:k.id,name:k.first_name,emoji:"👧",type:"kid",age:getAge(k.date_of_birth),dob:k.date_of_birth}));
    m.push({id:"self",name:profile?.first_name||"Me",emoji:"👤",type:"self"});
    familyMembers.filter(fm=>fm.id!==user.id).forEach(fm=>m.push({id:fm.id,name:fm.first_name||fm.email,emoji:"👤",type:"adult"}));
    return m;
  },[kids,profile,familyMembers]);

  // Build weekly events with member names
  const wd=useMemo(()=>weekDates(),[]);
  const clubMap=useMemo(()=>{const m=new Map();(clubs||[]).forEach(c=>m.set(c.club_id,c));return m},[clubs]);
  const kidMap=useMemo(()=>{const m=new Map();(kids||[]).forEach(k=>m.set(k.id,k));return m},[kids]);
  const weekEvts=useMemo(()=>{
    const evts=[];
    (recs||[]).forEach(re=>{
      if(!re.active)return;
      wd.forEach(d=>{
        if(d.getDay()===re.day_of_week){
          const dStr=d.toISOString().split("T")[0];
          const isSkipped=(re.excluded_dates||[]).includes(dStr);
          const cl=clubMap.get(re.club_id);
          const kid=re.dependant_id?kidMap.get(re.dependant_id):null;
          evts.push({id:re.id+d.toISOString(),source_id:re.id,source_type:"recurring",title:re.title,date:d,time:re.start_time?.slice(0,5)||"",
            endTime:re.start_time&&re.duration_minutes?((h,m)=>{const t=parseInt(re.start_time.slice(0,2))*60+parseInt(re.start_time.slice(3,5))+re.duration_minutes;return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0")})()||"":"",
            club:cl?.nickname||cl?.club_name||"",colour:cl?.colour||"#999",member:kid?.first_name||(profile?.first_name||"You"),memberId:re.dependant_id||"self",driver:re.driver||null,skipped:isSkipped});
        }
      });
    });
    (mans||[]).forEach(me=>{
      const d=new Date(me.event_date);
      const end=new Date(wd[6]);end.setDate(end.getDate()+1);
      if(d>=wd[0]&&d<end){
        const cl=clubMap.get(me.club_id);
        const kid=me.dependant_id?kidMap.get(me.dependant_id):null;
        const mTime=d.toTimeString().slice(0,5);
        const mEnd=me.duration_minutes&&mTime?((()=>{const t=parseInt(mTime.slice(0,2))*60+parseInt(mTime.slice(3,5))+(me.duration_minutes||60);return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0")})()):"";
        evts.push({id:me.id,source_id:me.id,source_type:"manual",title:me.title,date:d,time:mTime,endTime:mEnd,club:cl?.nickname||cl?.club_name||"",colour:cl?.colour||"#999",member:kid?.first_name||(profile?.first_name||"You"),memberId:me.dependant_id||"self"});
      }
    });
    return evts.sort((a,b)=>a.date-b.date||(a.time||"").localeCompare(b.time||""));
  },[recs,mans,clubMap,kidMap,profile,wd]);

  const activeWeekEvts=weekEvts.filter(e=>!e.skipped);
  const filtEvts=filter==="all"?activeWeekEvts:activeWeekEvts.filter(e=>e.memberId===filter);
  const filtPays=filter==="all"?pays:pays.filter(p=>(p.dependant_id||"self")===filter);
  const totalDue=filtPays.filter(p=>!p.paid&&p.status!=="not_renewing").reduce((s,p)=>s+parseFloat(p.amount||0),0);
  const totalPaid=filtPays.filter(p=>p.paid).reduce((s,p)=>s+parseFloat(p.amount||0),0);

  // Build all active location points — GPS + family_locations
  const allLocs=useMemo(()=>{
    const locs=[];
    if(userLoc)locs.push({...userLoc,radius:15,label:"📍 Current"});
    familyLocs.forEach(fl=>locs.push({lat:Number(fl.latitude),lng:Number(fl.longitude),radius:fl.radius_km||15,label:fl.label}));
    // Add school locs as fallback if no family_locations yet
    if(familyLocs.length===0)schoolLocs.forEach(s=>locs.push({...s,radius:10,label:"🏫 "+s.name}));
    return locs;
  },[userLoc,familyLocs,schoolLocs]);

  const filtCamps=useMemo(()=>{
    let fc=camps;
    // Filter by distance — use selected location or all locations
    const locsToUse=campLoc==="all"?allLocs:allLocs.filter(l=>l.label===campLoc);
    if(locsToUse.length>0){
      fc=fc.filter(c=>{
        if(!c.latitude)return false;
        const cLat=Number(c.latitude),cLng=Number(c.longitude);
        return locsToUse.some(loc=>calcKm(loc.lat,loc.lng,cLat,cLng)<=loc.radius);
      });
    }
    if(filter==="all"||filter==="self")return fc;
    const kid=kids.find(k=>k.id===filter);
    if(!kid||!kid.date_of_birth)return fc;
    const age=getAge(kid.date_of_birth);
    return fc.filter(c=>age>=c.age_min&&age<=c.age_max);
  },[camps,filter,kids,allLocs,campLoc]);

  const myRole=profile?.family_role||"admin";
  const isAdmin=myRole==="admin";
  const allTabs=[{id:"week",l:"Schedule",i:ICN.calendar},{id:"money",l:"Money",i:ICN.wallet},{id:"camps",l:"Camps",i:ICN.tent},{id:"clubs",l:"Clubs",i:ICN.home},{id:"discover",l:"Discover",i:ICN.search}];
  const tabs=isAdmin?allTabs:allTabs.filter(t=>t.id!=="money");

  if(loading)return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--warm)"}}><p style={{color:"var(--mt)"}}>Loading...</p></div>;

  // If no clubs yet, prompt
  // Trial/subscription check
  const trialStart=profile?.trial_started_at?new Date(profile.trial_started_at):null;
  const trialDays=trialStart?Math.floor((new Date()-trialStart)/(86400000)):0;
  const trialExpired=trialDays>14;
  const isSubscribed=profile?.subscription_status==="active"||profile?.subscription_status==="trial";
  const needsPayment=(()=>{
    if(profile?.is_beta)return false;
    if(profile?.subscription_status==="active")return false;
    if(!trialExpired)return false;
    // Check if any family member has an active subscription
    const famHasActive=familyMembers.some(fm=>fm.subscription_status==="active"||fm.is_beta);
    if(famHasActive)return false;
    return true;
  })();

  function shareWeek(){
    const evtsByDay={};
    filtEvts.forEach(e=>{
      const key=e.date.toLocaleDateString("en-IE",{weekday:"short",day:"numeric",month:"short"});
      if(!evtsByDay[key])evtsByDay[key]=[];
      evtsByDay[key].push(e);
    });
    let text="📅 Our week — OneClubView\n\n";
    Object.entries(evtsByDay).forEach(([day,evts])=>{
      text+=day+"\n";
      evts.forEach(e=>{text+="  "+e.member+" · "+(e.club||e.title)+(e.time?" · "+e.time+(e.endTime?"–"+e.endTime:""):"")+(e.driver?" 🚗 "+e.driver:"")+"\n"});
      text+="\n";
    });
    if(filtEvts.length===0)text+="Nothing scheduled this week! 🎉\n";
    text+="—\nSent from OneClubView · oneclubview.com";
    track("share_week");if(navigator.share){navigator.share({title:"Our week",text}).catch(()=>{})}
    else{navigator.clipboard?.copyText(text);showToast("Week summary copied!")}
  }

  async function startCheckout(tier){
    const _t=getToken();
    const res=await fetch(SB+"/functions/v1/stripe-billing",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+_t},
      body:JSON.stringify({action:"checkout",user_id:user.id,email:user.email,tier:tier||"standard",return_url:window.location.origin})
    });
    const data=await res.json();
    if(data.url)window.location.href=data.url;
    else showToast("Could not start checkout. Please try again.","err");
  }

  async function openPortal(){
    const _t=getToken();
    const res=await fetch(SB+"/functions/v1/stripe-billing",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+_t},
      body:JSON.stringify({action:"portal",user_id:user.id,return_url:window.location.origin})
    });
    const data=await res.json();
    if(data.url)window.location.href=data.url;
  }

  if(!loading&&needsPayment)return (
    <div className="fi" style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"var(--warm)"}}>
      <div style={{textAlign:"center",maxWidth:400}}>
        <Logo/>
        {profile?.subscription_status==="churned"?<>
          {/* CHURNED USER — cancelled subscription */}
          <div style={{fontSize:48,margin:"24px 0 12px"}}>👋</div>
          <h2 style={{fontFamily:"var(--sr)",fontSize:22,fontWeight:800,color:"var(--g)"}}>We miss you!</h2>
          <p style={{fontSize:14,color:"var(--mt)",margin:"8px 0 16px",lineHeight:1.6}}>Your subscription has ended but your data is safe. You can pick up right where you left off.</p>
        </>:<>
          {/* TRIAL EXPIRED */}
          <div style={{fontSize:48,margin:"24px 0 12px"}}>⏰</div>
          <h2 style={{fontFamily:"var(--sr)",fontSize:22,fontWeight:800,color:"var(--g)"}}>Your free trial has ended</h2>
          <p style={{fontSize:14,color:"var(--mt)",margin:"8px 0 4px"}}>You had {trialDays} days with OneClubView. Subscribe to keep your family's schedule, fees, and clubs all in one place.</p>
        </>}
        <div style={{background:"var(--card)",borderRadius:20,border:"1px solid var(--bd)",padding:24,margin:"20px 0",textAlign:"left"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            <div onClick={()=>startCheckout("standard")} style={{background:"var(--warm)",borderRadius:16,padding:16,border:"2px solid var(--bd)",cursor:"pointer",textAlign:"center"}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--mt)",marginBottom:4}}>STANDARD</div>
              <div style={{fontFamily:"var(--sr)",fontSize:24,fontWeight:800,color:"var(--g)"}}>€7.99<span style={{fontSize:11,color:"var(--mt)"}}>/mo</span></div>
              <div style={{fontSize:11,color:"var(--mt)",marginTop:4}}>2 adults · 3 kids</div>
            </div>
            <div onClick={()=>startCheckout("family_plus")} style={{background:"var(--g)",borderRadius:16,padding:16,border:"2px solid var(--g)",cursor:"pointer",textAlign:"center",color:"#fff"}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--acc)",marginBottom:4}}>FAMILY+</div>
              <div style={{fontFamily:"var(--sr)",fontSize:24,fontWeight:800}}>€14.99<span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>/mo</span></div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:4}}>4 adults · 6 kids</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
            {["Weekly schedule with clash detection","Fee tracking & reminders","Camp finder for your family","Forward emails to auto-update","Smart notifications for both parents"].map(f=><div key={f} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--tx)"}}><span style={{color:"#16a34a",fontWeight:700}}>✓</span>{f}</div>)}
          </div>
        </div>
        <p style={{fontSize:11,color:"var(--mt)",marginTop:8}}>Cancel anytime. Secure payment via Stripe.</p>
        {/* FEEDBACK — only show for churned users or if trial ended */}
        <CancelFeedback userId={user.id} email={user.email} status={profile?.subscription_status} trialDays={trialDays}/>
        <button onClick={onLogout} style={{marginTop:16,background:"none",border:"none",fontSize:13,color:"var(--mt)",cursor:"pointer",fontFamily:"var(--sn)"}}>Log out</button>
      </div>
    </div>
  );

  const noClubsBanner=clubs.length===0;

  return (
    <div className="fi" style={{background:"var(--warm)",minHeight:"100vh"}}>
      {/* Header */}
      <div style={{background:"var(--card)",borderBottom:"1px solid var(--bd)"}}>
        <div style={{maxWidth:520,margin:"0 auto",padding:"12px 20px 6px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <Logo/>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{position:"relative",cursor:"pointer"}} onClick={()=>setShowNotifs(!showNotifs)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{color:"var(--mt)"}}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                {notifications.filter(n=>!n.read_at).length>0&&<div style={{position:"absolute",top:-3,right:-5,width:14,height:14,borderRadius:"50%",background:"var(--acc)",color:"#fff",fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{notifications.filter(n=>!n.read_at).length}</div>}
              </div>
              <button onClick={()=>setShowProfile(!showProfile)} style={{width:30,height:30,borderRadius:10,background:"var(--g)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>{(profile?.first_name||"U")[0]}</button>
            </div>
          </div>
          <div className="hsb" style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:6,WebkitOverflowScrolling:"touch",msOverflowStyle:"none"}}>
            {members.map(m=><button key={m.id} onClick={()=>setFilter(m.id)} className={"pill "+(filter===m.id?"pon":"poff")} style={{flexShrink:0}}>{m.type!=="all"&&<span style={{width:7,height:7,borderRadius:"50%",background:m.type==="kid"?COLS[members.indexOf(m)%COLS.length]:m.type==="adult"?"#8b5cf6":"var(--g)",flexShrink:0}}/>}{m.type==="all"?"👨‍👩‍👧‍👦":""} {m.name}{m.age!=null&&<span style={{opacity:.5,marginLeft:2}}>({m.age})</span>}</button>)}
          </div>
        </div>
        <div style={{maxWidth:520,margin:"0 auto",display:"flex"}}>
          {tabs.map(t=><button key={t.id} onClick={()=>{setTab(t.id);track("tab_view",{tab:t.id})}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"9px 0",fontSize:11,fontWeight:600,border:"none",borderBottom:tab===t.id?"2px solid var(--g)":"2px solid transparent",cursor:"pointer",background:"none",color:tab===t.id?"var(--g)":"var(--mt)",fontFamily:"var(--sn)",transition:"color .15s"}}><span style={{display:"flex"}}>{t.i}</span><span>{t.l}</span></button>)}
        </div>
      </div>

      <div style={{maxWidth:520,margin:"0 auto",padding:"16px 20px",paddingBottom:100}}>

      {/* ONBOARDING NUDGE */}
      {clubs.length===0&&kids.length===0&&<div style={{background:"var(--accl)",border:"1px solid #f0d078",borderRadius:16,padding:20,marginBottom:16,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:8}}>👋</div>
        <h3 style={{fontFamily:"var(--sr)",fontSize:17,fontWeight:700,color:"var(--g)",marginBottom:6}}>Welcome! Let's get you set up</h3>
        <p style={{fontSize:13,color:"var(--mt)",marginBottom:14}}>Start by adding your kids, then search for their clubs.</p>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          <button onClick={()=>setShowAddKid(true)} className="btn bp" style={{fontSize:13}}>+ Add a child</button>
          <button onClick={()=>onRefresh("clubs")} className="btn bs" style={{fontSize:13}}>+ Add a club</button>
        </div>
      </div>}

      {/* OFFLINE BANNER */}
      {typeof navigator!=="undefined"&&!navigator.onLine&&<div style={{background:"#fef3c7",borderRadius:12,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:600,color:"#92400e"}}>📡 You're offline — showing cached data</div>}

      {/* TRIAL BANNER */}
      {!needsPayment&&!profile?.is_beta&&trialStart&&profile?.subscription_status!=="active"&&<div style={{background:"linear-gradient(135deg,#1a2a3a,#2d4a5f)",borderRadius:12,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",color:"#fff"}}>
        <div><span style={{fontSize:12,fontWeight:700}}>Free trial</span><span style={{fontSize:11,color:"rgba(255,255,255,.6)",marginLeft:6}}>{Math.max(0,14-trialDays)} days left</span></div>
        <button onClick={()=>startCheckout("standard")} style={{padding:"5px 12px",borderRadius:8,border:"none",background:"var(--acc)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"var(--sn)"}}>Subscribe</button>
      </div>}

      {/* No clubs prompt — inline, not blocking */}
      {noClubsBanner&&<div style={{background:"var(--gxl)",border:"1.5px solid #c8dce8",borderRadius:14,padding:16,marginBottom:14,textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:6}}>🏠</div>
        <div style={{fontSize:14,fontWeight:700,color:"var(--g)",marginBottom:4}}>Add your first club</div>
        <p style={{fontSize:12,color:"var(--mt)",marginBottom:10}}>Add clubs to see schedules, fees, and nearby options</p>
        <button onClick={()=>onRefresh("clubs")} className="btn bp" style={{padding:"10px 24px",fontSize:13}}>+ Add a club</button>
      </div>}

      {/* WEEK/MONTH HEADER — Flo-inspired */}
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:4}}>
        <h2 style={{fontFamily:"var(--sr)",fontSize:20,fontWeight:800,color:"var(--g)"}}>This week</h2>
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>{track("calendar_toggle",{view:weekView==="calendar"?"timeline":"calendar"});setWeekView(weekView==="calendar"?"timeline":"calendar")}} style={{fontSize:11,fontWeight:600,color:weekView==="calendar"?"var(--acc)":"var(--mt)",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--sn)"}}>{weekView==="calendar"?"Week view":"Calendar"}</button>
        </div>
      </div>

      {/* HORIZONTAL DAY PILLS — inspired by Flo's week strip */}
      <div style={{display:"flex",gap:4,marginBottom:12,overflowX:"auto",WebkitOverflowScrolling:"touch"}} className="hsb">
        {wd.map(d=>{
          const today=isToday(d);
          const sel=selectedDay&&selectedDay.getDate()===d.getDate()&&selectedDay.getMonth()===d.getMonth()&&selectedDay.getFullYear()===d.getFullYear();
          const dayEvts=weekEvts.filter(e=>e.date.getFullYear()===d.getFullYear()&&e.date.getMonth()===d.getMonth()&&e.date.getDate()===d.getDate());
          return <div key={d.toISOString()} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:44,padding:"6px 4px",borderRadius:12,background:today?"var(--g)":sel?"var(--gxl)":"transparent",cursor:"pointer",border:sel&&!today?"1.5px solid var(--g)":"1.5px solid transparent"}} onClick={()=>setSelectedDay(sel?null:d)}>
            <span style={{fontSize:10,fontWeight:700,color:today?"rgba(255,255,255,.7)":"var(--mt)",textTransform:"uppercase"}}>{d.toLocaleDateString("en-IE",{weekday:"short"}).slice(0,3)}</span>
            <span style={{fontSize:16,fontWeight:800,color:today?"#fff":"var(--tx)"}}>{d.getDate()}</span>
            {dayEvts.length>0&&<div style={{width:14,height:3,borderRadius:2,background:today?"rgba(255,255,255,.35)":"var(--acc)",marginTop:1}}/>}
          </div>;
        })}
      </div>

      {/* INSIGHT CARDS — inspired by Flo's "My daily insights" */}
      {tab==="week"&&(()=>{
        const now=new Date();
        const todayEvts=filtEvts.filter(e=>isToday(e.date));
        const thisWeekCount=filtEvts.length;
        // Next school holiday
        const nextHol=(holidays||[]).find(h=>new Date(h.start_date)>now);
        const daysToHol=nextHol?Math.ceil((new Date(nextHol.start_date)-now)/(86400000)):null;
        // Unpaid fees
        const unpaidCount=isAdmin?(pays||[]).filter(p=>!p.paid&&p.status!=="not_renewing").length:0;
        const unpaidTotal=isAdmin?(pays||[]).filter(p=>!p.paid&&p.status!=="not_renewing").reduce((s,p)=>s+parseFloat(p.amount||0),0):0;

        return <div style={{display:"flex",gap:14,padding:"0 0 16px",fontSize:13,color:"var(--mt)",flexWrap:"wrap"}}>
          <span><strong style={{color:"var(--g)",fontWeight:700}}>{thisWeekCount}</strong> activities</span>
          {nextHol&&daysToHol!==null&&daysToHol<=60&&<><span style={{color:"var(--bd)"}}>·</span><span><strong style={{color:"#c49000",fontWeight:700}}>{daysToHol}</strong> days to {nextHol.name}</span></>}
          {isAdmin&&unpaidCount>0&&<><span style={{color:"var(--bd)"}}>·</span><span onClick={()=>setTab("money")} style={{cursor:"pointer"}}><strong style={{color:"var(--acc)",fontWeight:700}}>€{unpaidTotal.toFixed(0)}</strong> due</span></>}
        </div>;
      })()}

      {/* SELECTED DAY PANEL — shows in timeline mode when a day pill is tapped */}
      {tab==="week"&&weekView==="timeline"&&selectedDay&&(()=>{
        const dayEvts=weekEvts.filter(e=>e.date.getFullYear()===selectedDay.getFullYear()&&e.date.getMonth()===selectedDay.getMonth()&&e.date.getDate()===selectedDay.getDate());
        const isHol=(holidays||[]).some(h=>{const s=new Date(h.start_date),e=new Date(h.end_date);return selectedDay>=s&&selectedDay<=e});
        const holName=isHol?(holidays||[]).find(h=>selectedDay>=new Date(h.start_date)&&selectedDay<=new Date(h.end_date))?.name:"";
        return <div style={{marginBottom:14,background:"var(--card)",borderRadius:16,border:"1px solid var(--bd)",boxShadow:"var(--shadow)",overflow:"hidden",animation:"slideUp .2s ease"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"var(--g)"}}>{selectedDay.toLocaleDateString("en-IE",{weekday:"long",day:"numeric",month:"long"})}</div>
              {isHol&&<div style={{fontSize:11,color:"#b8860b",fontWeight:600}}>{holName}</div>}
            </div>
            <button onClick={()=>setSelectedDay(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--mt)",padding:"4px"}}>✕</button>
          </div>
          <div style={{padding:"8px 12px",maxHeight:240,overflowY:"auto"}}>
            {dayEvts.length===0?<div style={{padding:"16px 0",textAlign:"center",color:"var(--mt)",fontSize:13}}>{isHol?"School holiday — no activities":"No activities this day"}</div>
            :dayEvts.map((e,i)=><div key={e.id||i} onClick={()=>setTapEvent(e)} style={{display:"flex",alignItems:"stretch",gap:0,borderRadius:12,overflow:"hidden",background:"var(--bg)",border:"1px solid var(--bd)",marginBottom:6,cursor:"pointer",transition:"transform .1s"}} onTouchStart={ev=>ev.currentTarget.style.transform="scale(.98)"} onTouchEnd={ev=>ev.currentTarget.style.transform=""}>
              <div style={{width:4,background:e.colour||"#999",flexShrink:0}}/>
              <div style={{flex:1,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--tx)"}}>{e.source_type==="camp"?"🏕️ ":""}{e.club||e.title||""}</div>
                  <div style={{fontSize:12,color:"var(--mt)",marginTop:1}}>{e.member}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--g)",fontVariantNumeric:"tabular-nums"}}>{e.time||""}{e.endTime?"–"+e.endTime:""}</div>
                    {e.driver&&<div style={{fontSize:12,color:"var(--mt)",marginTop:1,display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}><span style={{color:"var(--mt)"}}>{ICN.car}</span> {e.driver}</div>}
                  </div>
                  <span style={{color:"#ddd"}}>{ICN.chevron}</span>
                </div>
              </div>
            </div>)}
          </div>
        </div>;
      })()}

      {/* MONTH CALENDAR VIEW */}
      {tab==="week"&&weekView==="calendar"&&(()=>{
        const now=new Date();
        const month=calMonth,year=calYear;
        const firstDay=new Date(year,month,1).getDay();
        const daysInMonth=new Date(year,month+1,0).getDate();
        const startOffset=(firstDay+6)%7;
        const cells=[];
        for(let i=0;i<startOffset;i++)cells.push(null);
        for(let d=1;d<=daysInMonth;d++)cells.push(d);

        // Pre-compute events for all days in month (O(recs+mans) once, not per-cell)
        const monthEvtsMap={};
        for(let day=1;day<=daysInMonth;day++){
          const cellDate=new Date(year,month,day);
          const dow=cellDate.getDay();
          const evts=[];
          (recs||[]).forEach(re=>{
            if(!re.active||re.day_of_week!==dow)return;
            const dStr=cellDate.toISOString().split("T")[0];
            if((re.excluded_dates||[]).includes(dStr))return;
            const cl=clubMap.get(re.club_id);
            const kid=re.dependant_id?kidMap.get(re.dependant_id):null;
            evts.push({id:re.id+cellDate.toISOString(),source_id:re.id,source_type:"recurring",title:re.title,date:cellDate,time:re.start_time?.slice(0,5)||"",
              endTime:re.start_time&&re.duration_minutes?((()=>{const t=parseInt(re.start_time.slice(0,2))*60+parseInt(re.start_time.slice(3,5))+re.duration_minutes;return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0")})()):"",
              club:cl?.nickname||cl?.club_name||"",colour:cl?.colour||"#999",member:kid?.first_name||(profile?.first_name||"You"),memberId:re.dependant_id||"self",driver:re.driver||null});
          });
          (mans||[]).forEach(me=>{
            const d=new Date(me.event_date);
            if(d.getDate()===day&&d.getMonth()===month&&d.getFullYear()===year){
              const cl=clubMap.get(me.club_id);
              const kid=me.dependant_id?kidMap.get(me.dependant_id):null;
              const mTime=d.toTimeString().slice(0,5);
              const mEnd=me.duration_minutes&&mTime?((()=>{const t=parseInt(mTime.slice(0,2))*60+parseInt(mTime.slice(3,5))+(me.duration_minutes||60);return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0")})()):"";
              evts.push({id:me.id,source_id:me.id,source_type:"manual",title:me.title,date:d,time:mTime,endTime:mEnd,club:cl?.nickname||cl?.club_name||"",colour:cl?.colour||"#999",member:kid?.first_name||(profile?.first_name||"You"),memberId:me.dependant_id||"self"});
            }
          });
          // Camp bookings — show on each day within camp date range
          (campBookings||[]).forEach(b=>{
            if(!b.camp_id)return;
            const camp=(camps||[]).find(c=>c.id===b.camp_id);
            if(!camp||!camp.start_date)return;
            const cs=new Date(camp.start_date),ce=new Date(camp.end_date||camp.start_date);
            if(cellDate>=cs&&cellDate<=ce&&cellDate.getDay()!==0&&cellDate.getDay()!==6){
              const kid=b.dependant_id?kidMap.get(b.dependant_id):null;
              evts.push({id:"camp-"+b.id+"-"+day,source_id:b.id,source_type:"camp",title:camp.title,date:cellDate,time:camp.daily_start_time?.slice(0,5)||"09:00",endTime:camp.daily_end_time?.slice(0,5)||"15:00",club:camp.title,colour:"#e85d4a",member:kid?.first_name||(profile?.first_name||"You"),memberId:b.dependant_id||"self"});
            }
          });
          monthEvtsMap[day]=evts.sort((a,b)=>(a.time||"").localeCompare(b.time||""));
        }
        const monthEvts=(day)=>monthEvtsMap[day]||[];

        const prevMonth=()=>{if(month===0){setCalMonth(11);setCalYear(year-1)}else setCalMonth(month-1);setSelectedDay(null)};
        const nextMonth=()=>{if(month===11){setCalMonth(0);setCalYear(year+1)}else setCalMonth(month+1);setSelectedDay(null)};
        const goToday=()=>{setCalMonth(now.getMonth());setCalYear(now.getFullYear());setSelectedDay(null)};

        return <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <button onClick={prevMonth} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",padding:"4px 8px",color:"var(--gl)"}}>‹</button>
            <span onClick={goToday} style={{fontFamily:"var(--sr)",fontSize:15,fontWeight:700,color:"var(--g)",cursor:"pointer"}}>{new Date(year,month).toLocaleDateString("en-IE",{month:"long",year:"numeric"})}</span>
            <button onClick={nextMonth} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",padding:"4px 8px",color:"var(--gl)"}}>›</button>
          </div>
          {/* Day headers */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
            {["M","T","W","T","F","S","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:11,fontWeight:700,color:"var(--mt)",padding:"2px 0"}}>{d}</div>)}
          </div>
          {/* Calendar grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
            {cells.map((day,i)=>{
              if(!day)return <div key={i}/>;
              const cellDate=new Date(year,month,day);
              const isToday2=day===now.getDate()&&month===now.getMonth()&&year===now.getFullYear();
              const dayEvts=monthEvts(day);
              const isHoliday=(holidays||[]).some(h=>{const s=new Date(h.start_date),e=new Date(h.end_date);return cellDate>=s&&cellDate<=e});
              const isSelected=selectedDay&&selectedDay.getDate()===day&&selectedDay.getMonth()===month&&selectedDay.getFullYear()===year;
              return <div key={i} style={{textAlign:"center",padding:"6px 2px",borderRadius:10,background:isToday2?"var(--g)":isSelected?"var(--gxl)":isHoliday?"#fef3e2":"transparent",cursor:"pointer",position:"relative",border:isSelected?"1.5px solid var(--g)":"1.5px solid transparent"}} onClick={()=>setSelectedDay(cellDate)}>
                <span style={{fontSize:13,fontWeight:isToday2||isSelected?800:500,color:isToday2?"#fff":isHoliday?"#b8860b":"var(--tx)"}}>{day}</span>
                {dayEvts.length>0&&<div style={{display:"flex",gap:2,justifyContent:"center",marginTop:2}}>
                  {dayEvts.slice(0,3).map((e,j)=><div key={j} style={{width:4,height:4,borderRadius:"50%",background:isToday2?"rgba(255,255,255,.6)":(e.colour||"var(--acc)")}}/>)}
                </div>}
              </div>;
            })}
          </div>

          {/* SLIDE-UP DAY PANEL */}
          {selectedDay&&selectedDay.getMonth()===month&&selectedDay.getFullYear()===year&&(()=>{
            const dayE=monthEvts(selectedDay.getDate());
            const isHol=(holidays||[]).some(h=>{const s=new Date(h.start_date),e=new Date(h.end_date);return selectedDay>=s&&selectedDay<=e});
            const holName=isHol?(holidays||[]).find(h=>selectedDay>=new Date(h.start_date)&&selectedDay<=new Date(h.end_date))?.name:"";
            return <div style={{marginTop:12,background:"var(--card)",borderRadius:16,border:"1px solid var(--bd)",boxShadow:"var(--shadow)",overflow:"hidden",animation:"slideUp .2s ease"}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--g)"}}>{selectedDay.toLocaleDateString("en-IE",{weekday:"long",day:"numeric",month:"long"})}</div>
                  {isHol&&<div style={{fontSize:11,color:"#b8860b",fontWeight:600}}>{holName}</div>}
                </div>
                <button onClick={()=>setSelectedDay(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--mt)",padding:"4px"}}>✕</button>
              </div>
              <div style={{padding:"8px 12px",maxHeight:240,overflowY:"auto"}}>
                {dayE.length===0?<div style={{padding:"16px 0",textAlign:"center",color:"var(--mt)",fontSize:13}}>No activities this day</div>
                :dayE.map((e,i)=><div key={e.id||i} onClick={()=>setTapEvent(e)} style={{display:"flex",alignItems:"stretch",gap:0,borderRadius:12,overflow:"hidden",background:"var(--bg)",border:"1px solid var(--bd)",marginBottom:6,cursor:"pointer",transition:"transform .1s"}} onTouchStart={ev=>ev.currentTarget.style.transform="scale(.98)"} onTouchEnd={ev=>ev.currentTarget.style.transform=""}>
                  <div style={{width:4,background:e.colour||"#999",flexShrink:0}}/>
                  <div style={{flex:1,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:"var(--tx)"}}>{e.source_type==="camp"?"🏕️ ":""}{e.club||e.title||""}</div>
                      <div style={{fontSize:12,color:"var(--mt)",marginTop:1}}>{e.member}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:14,fontWeight:700,color:"var(--g)",fontVariantNumeric:"tabular-nums"}}>{e.time||""}{e.endTime?"–"+e.endTime:""}</div>
                        {e.driver&&<div style={{fontSize:12,color:"var(--mt)",marginTop:1,display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}><span style={{color:"var(--mt)"}}>{ICN.car}</span> {e.driver}</div>}
                      </div>
                      <span style={{color:"#ddd"}}>{ICN.chevron}</span>
                    </div>
                  </div>
                </div>)}
              </div>
            </div>;
          })()}
        </div>;
      })()}

      {/* THIS WEEK */}
      {tab==="week"&&<div>
      {/* SMART ALERTS */}
      {(()=>{
        const alerts=[];
        const now=new Date();
        const in3d=new Date(now);in3d.setDate(in3d.getDate()+3);
        const in7d=new Date(now);in7d.setDate(in7d.getDate()+7);

        // Fee alerts (admin only)
        if(isAdmin){pays.filter(p=>!p.paid&&p.status!=="not_renewing").forEach(p=>{
          const due=new Date(p.due_date);
          const days=Math.ceil((due-now)/(86400000));
          if(days<0)alerts.push({type:"urgent",icon:"🚨",text:p.description+" is €"+parseFloat(p.amount).toFixed(0)+" overdue ("+Math.abs(days)+" days)",action:"money"});
          else if(days<=3)alerts.push({type:"warn",icon:"💳",text:p.description+" — €"+parseFloat(p.amount).toFixed(0)+" due in "+days+" day"+(days!==1?"s":""),action:"money"});
        });}

        // Uncovered holiday weeks (kids with no camp booked) — ONLY the next upcoming break, ONLY nearby camps
        if(camps&&camps.length>0&&kids.length>0){
          const nextHol=(holidays||[]).find(h=>new Date(h.end_date)>=now);
          if(nextHol){
            kids.forEach(kid=>{
              const age=getAge(kid.date_of_birth);
              const holStart=new Date(nextHol.start_date+"T00:00:00"),holEnd=new Date(nextHol.end_date+"T23:59:59");
              const suitableCamps=(camps||[]).filter(ca=>{
                if(ca.age_min&&age<ca.age_min)return false;
                if(ca.age_max&&age>ca.age_max)return false;
                const cs=new Date(ca.start_date+"T00:00:00");
                if(cs<holStart||cs>holEnd)return false;
                // Location filter — must be near a family location
                if(allLocs.length>0&&ca.latitude){
                  const cLat=Number(ca.latitude),cLng=Number(ca.longitude);
                  const nearAny=allLocs.some(loc=>calcKm(loc.lat,loc.lng,cLat,cLng)<=loc.radius);
                  if(!nearAny)return false;
                }
                return true;
              });
              const booked=(campBookings||[]).filter(b=>{
                if(b.dependant_id!==kid.id)return false;
                const camp=(camps||[]).find(c=>c.id===b.camp_id);
                if(!camp)return false;
                const cs=new Date(camp.start_date+"T00:00:00");
                return cs>=holStart&&cs<=holEnd;
              });
              if(suitableCamps.length>0&&booked.length===0){
                alerts.push({type:"info",icon:"🏕️",text:kid.first_name+" has no camp booked for "+nextHol.name+". "+suitableCamps.length+" camp"+(suitableCamps.length>1?"s":"")+" suit"+(suitableCamps.length===1?"s":"")+" their age.",action:"camps"});
              }
            });
          }
        }

        // Clash today
        const todayEvts=activeWeekEvts.filter(e=>isToday(e.date)&&e.time);
        for(let i=0;i<todayEvts.length;i++){
          for(let j=i+1;j<todayEvts.length;j++){
            const a=todayEvts[i],b=todayEvts[j];
            if(a.memberId===b.memberId)continue;
            if((a.time<(b.endTime||"23:59"))&&(b.time<(a.endTime||"23:59"))){
              alerts.push({type:"urgent",icon:"⚠️",text:"Clash today: "+a.member+" ("+a.title+" "+a.time+") overlaps "+b.member+" ("+b.title+" "+b.time+")",action:"week"});
            }
          }
        }

        // No driver assigned for today's events
        todayEvts.filter(e=>!e.driver).forEach(e=>{
          alerts.push({type:"info",icon:"",text:"No driver set for "+e.member+"'s "+e.title+" at "+e.time,action:"week"});
        });

        // Events with no end time
        const noEnd=weekEvts.filter(e=>e.time&&!e.endTime);
        if(noEnd.length>0){
          alerts.push({type:"info",icon:"⏰",text:noEnd.length+" event"+(noEnd.length>1?"s":"")+" this week with no end time — makes pickup planning harder",action:"week"});
        }

        // Camp recommendations from carers
        if(isAdmin&&campBookings){
          const recs2=(campBookings||[]).filter(b=>b.status==="recommended");
          recs2.forEach(b=>{
            const camp=(camps||[]).find(c=>c.id===b.camp_id);
            if(camp)alerts.push({type:"info",icon:"💡",text:"A carer recommended "+camp.title+" — tap to review",action:"camps"});
          });
        }

        if(alerts.length===0)return null;

        const colors={urgent:{bg:"#fef2f2",border:"#fecaca",text:"#dc2626"},warn:{bg:"var(--accl)",border:"#f8c4bc",text:"var(--acc)"},info:{bg:"var(--gxl)",border:"#c8dce8",text:"var(--gl)"}};
        return <div style={{marginBottom:14}}>

          {alerts.slice(0,5).map((a,i)=>{
            const col=colors[a.type]||colors.info;
            return <div key={i} onClick={()=>{if(a.action){setTab(a.action);window.scrollTo(0,0)}}} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:12,background:col.bg,border:"1px solid "+col.border,marginBottom:6,cursor:a.action?"pointer":"default"}}>
              <span style={{fontSize:16,flexShrink:0}}>{a.icon}</span>
              <span style={{fontSize:12,color:col.text,fontWeight:600,lineHeight:1.4}}>{a.text}</span>
            </div>;
          })}
        </div>;
      })()}
        {/* CLASH DETECTION */}
        {(()=>{
          const clashes=[];
          wd.forEach(d=>{
            const dayEvts=activeWeekEvts.filter(e=>e.date.getFullYear()===d.getFullYear()&&e.date.getMonth()===d.getMonth()&&e.date.getDate()===d.getDate()&&e.time);
            for(let i=0;i<dayEvts.length;i++){
              for(let j=i+1;j<dayEvts.length;j++){
                const a=dayEvts[i],b=dayEvts[j];
                if(a.memberId===b.memberId)continue;
                const aStart=a.time,aEnd=a.endTime||"23:59",bStart=b.time,bEnd=b.endTime||"23:59";
                if(aStart<bEnd&&bStart<aEnd)clashes.push({day:d,a,b});
              }
            }
          });
          if(clashes.length===0)return null;
          return <div style={{background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:16,padding:14,marginBottom:14,boxShadow:"var(--shadow)"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#dc2626",marginBottom:6}}>⚠️ {clashes.length} clash{clashes.length>1?"es":""} this week</div>
            {clashes.map((cl,i)=><div key={i} style={{fontSize:12,color:"#991b1b",marginBottom:2}}>
              {fmtDate(cl.day)}: {cl.a.member} ({cl.a.title} {cl.a.time}) overlaps {cl.b.member} ({cl.b.title} {cl.b.time})
            </div>)}
          </div>;
        })()}

        {/* SWIMLANE TIMELINE VIEW */}
        {weekView==="timeline"&&<div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}} className="hsb">
          {wd.map(d=>{
            const dayEvts=(filter==="all"?weekEvts:weekEvts.filter(e=>e.memberId===filter)).filter(e=>e.date.getFullYear()===d.getFullYear()&&e.date.getMonth()===d.getMonth()&&e.date.getDate()===d.getDate());
            const today=isToday(d);
            if(dayEvts.length===0&&!today)return null;
            // Group by member
            const memberEvts={};
            dayEvts.forEach(e=>{
              const key=e.memberId||e.member;
              if(!memberEvts[key])memberEvts[key]={name:e.member,events:[]};
              memberEvts[key].events.push(e);
            });
            const lanes=Object.values(memberEvts);
            return <div key={d.toISOString()} style={{marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{width:40,height:40,borderRadius:12,background:today?"var(--acc)":"var(--card)",border:today?"none":"1px solid var(--bd)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:today?"0 4px 12px rgba(232,93,74,.25)":"var(--shadow)"}}>
                  <span style={{fontSize:9,fontWeight:700,color:today?"rgba(255,255,255,.7)":"var(--mt)",textTransform:"uppercase"}}>{d.toLocaleDateString("en-IE",{weekday:"short"})}</span>
                  <span style={{fontSize:16,fontWeight:800,color:today?"#fff":"var(--tx)",lineHeight:1}}>{d.getDate()}</span>
                </div>
                {today&&<span style={{fontSize:11,fontWeight:700,color:"var(--acc)",textTransform:"uppercase",letterSpacing:.5}}>Today</span>}
              </div>
              {lanes.length===0?<div style={{padding:"8px 0 4px 48px",fontSize:13,color:"var(--mt)"}}>Free day ✨</div>
              :<div style={{display:"flex",flexDirection:"column",gap:6,paddingLeft:48}}>
                {lanes.map((lane,li)=>lane.events.map((e,ei)=>
                  <div key={e.id||li+"-"+ei} onClick={()=>setTapEvent(e)} style={{display:"flex",alignItems:"stretch",gap:0,borderRadius:14,overflow:"hidden",background:e.skipped?"#f9f9f9":"var(--card)",border:"1px solid var(--bd)",boxShadow:e.skipped?"none":"var(--shadow)",cursor:"pointer",opacity:e.skipped?.5:1}}>
                    <div style={{width:5,background:e.skipped?"var(--bd)":(e.colour||COLS[li%COLS.length]),flexShrink:0}}/>
                    <div style={{flex:1,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:15,fontWeight:600,color:e.skipped?"var(--mt)":"var(--tx)",textDecoration:e.skipped?"line-through":"none"}}>{e.club||e.title||""}{e.skipped?" — Skipped":""}</div>
                        <div style={{fontSize:13,color:"var(--mt)",marginTop:1}}>{e.member}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--g)",fontVariantNumeric:"tabular-nums"}}>{e.time||""}{e.endTime?"–"+e.endTime:""}</div>
                          {e.driver&&<div style={{fontSize:12,color:"var(--mt)",marginTop:1,display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}><span style={{color:"var(--mt)"}}>{ICN.car}</span> {e.driver}</div>}
                        </div>
                        <span style={{color:"#ddd"}}>{ICN.chevron}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>}
            </div>;
          })}
        </div>}

        {/* FORWARD BANNER */}
        <div style={{background:"var(--g)",borderRadius:14,padding:16,marginTop:16,color:"#fff"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{color:"rgba(255,255,255,.5)"}}>{ICN.mail}</span><span style={{fontSize:14,fontWeight:700}}>Forward club emails</span></div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{background:"rgba(255,255,255,.06)",borderRadius:10,padding:10}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.7)",marginBottom:3}}>📧 Email from a club?</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.3}}>Forward it to:</div>
              <span onClick={()=>navigator.clipboard?.writeText("schedule@geovoriofi.resend.app")} style={{display:"inline-block",padding:"4px 8px",background:"rgba(255,255,255,.1)",borderRadius:5,fontSize:10,fontWeight:700,fontFamily:"monospace",marginTop:4,cursor:"pointer"}}>schedule@geovoriofi.resend.app 📋</span>
            </div>
            <div style={{background:"rgba(255,255,255,.06)",borderRadius:10,padding:10}}>
              <div style={{fontSize:11,fontWeight:700,color:"#25D366",marginBottom:3}}>💬 WhatsApp from a coach?</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.3}}>Long-press message → Share → Mail → forward to the address above</div>
            </div>
          </div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:8}}>We auto-update your schedule, fees, and terms.</div>
        </div>

      </div>}

      {tab==="money"&&<div>
        {/* TODO: Money tab content */}
      </div>}

      {tab==="camps"&&<div>
        {/* TODO: Camps tab content */}
      </div>}

      {tab==="clubs"&&<div>
        {/* TODO: Clubs tab content */}
      </div>}

      {tab==="discover"&&<div>
        {/* TODO: Discover tab content */}
      </div>}

      </div>

      {/* Manage Locations Modal */}
      {showLocations&&<div onClick={()=>setShowLocations(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(10,15,20,.4)",zIndex:70}}/>}
      {showLocations&&<div style={{position:"fixed",top:"5vh",left:12,right:12,zIndex:71,background:"#fff",borderRadius:20,boxShadow:"0 12px 40px rgba(0,0,0,.15)",padding:20,maxHeight:"85vh",overflowY:"auto",maxWidth:440,margin:"0 auto"}}>
        {/* TODO: Manage Locations Modal content */}
      </div>}

      {/* Notification Panel */}
      {showNotifs&&<div onClick={()=>setShowNotifs(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(10,15,20,.3)",zIndex:60}}/>}
      {showNotifs&&<div style={{position:"fixed",top:52,right:12,left:12,zIndex:61,background:"#fff",borderRadius:16,border:"1px solid var(--bd)",boxShadow:"0 8px 30px rgba(0,0,0,.12)",padding:8,maxHeight:"60vh",overflowY:"auto",maxWidth:400,marginLeft:"auto"}}>
        {/* TODO: Notification Panel content */}
      </div>}

      {/* Profile Menu */}
      {showProfile&&<div onClick={()=>setShowProfile(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(10,15,20,.3)",zIndex:60}}/>}
      {showProfile&&<div style={{position:"fixed",top:56,right:12,zIndex:61,background:"#fff",borderRadius:16,border:"1px solid var(--bd)",boxShadow:"0 8px 30px rgba(0,0,0,.12)",padding:8,minWidth:200}}>
        {/* TODO: Profile Menu content */}
      </div>}

      {/* FAB */}
      {showFab&&<div onClick={()=>setShowFab(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:70}}/>}
      {showFab&&<div style={{position:"fixed",bottom:76,right:20,zIndex:71,display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
        {/* TODO: FAB menu items */}
      </div>}
      <button onClick={()=>setShowFab(!showFab)} style={{position:"fixed",bottom:"calc(20px + env(safe-area-inset-bottom, 0px))",right:20,width:52,height:52,borderRadius:"50%",background:showFab?"var(--mt)":"var(--g)",color:"#fff",border:"none",fontSize:24,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(26,42,58,.25)",zIndex:72,transition:"transform .15s,background .15s",transform:showFab?"rotate(45deg)":"none"}}>+</button>

      {/* Modals — references as TODO */}
      {/* TODO: Support Modal */}
      {/* TODO: Add Activity Modal */}
      {/* TODO: Event Detail Modal */}
      {/* TODO: Change Password Modal */}
      {/* TODO: Delete Account Confirm Modal */}
      {/* TODO: Save GPS Location Modal */}
      {/* TODO: Add Location Modal */}
      {/* TODO: Family Members Modal */}
      {/* TODO: Paste Schedule Modal */}
      {/* TODO: Add Kid Modal */}
      {/* TODO: Edit Club Modal */}
      {/* TODO: Edit Holiday Modal */}
      {/* TODO: Add Holiday Modal */}
    </div>
  );
}
