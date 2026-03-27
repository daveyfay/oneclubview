import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, rpc, au, SB, SK, hd, getToken, clearTokens } from '../lib/supabase';
import { track, showToast, getAge, weekDates, isToday, calcKm, fmtDist, fmtDate } from '../lib/utils';
import { COLS, DAYF, CC, CT } from '../lib/constants';
import ICN from '../lib/icons';
import Logo from '../components/Logo';
import { OcvModal, OcvConfirm, OcvInput } from '../components/modals';
import CancelFeedback from '../components/CancelFeedback';
import CampCard from '../components/hub/CampCard';
import NearbyClubsSection from '../components/hub/NearbyClubsSection';
import ThingsToDoSection from '../components/hub/ThingsToDoSection';
import AddEventModal from '../components/modals/AddEventModal';
import AddPaymentModal from '../components/modals/AddPaymentModal';
import AddKidModal from '../components/modals/AddKidModal';
import EditClubModal from '../components/modals/EditClubModal';
import EditHolidayModal from '../components/modals/EditHolidayModal';
import AddHolidayModal from '../components/modals/AddHolidayModal';
import PasteScheduleModal from '../components/modals/PasteScheduleModal';
import SupportModal from '../components/modals/SupportModal';
import AddActivityModal from '../components/modals/AddActivityModal';
import EventDetailModal from '../components/modals/EventDetailModal';
import WeekGrid from '../components/hub/WeekGrid';

export default function Hub({user,profile,onRefresh,onLogout}){
  const[tab,setTab]=useState("overview");const[filter,setFilter]=useState("all");
  const[exploreTab,setExploreTab]=useState("clubs");
  const[kids,setKids]=useState([]);const[clubs,setClubs]=useState([]);const[recs,setRecs]=useState([]);
  const[mans,setMans]=useState([]);const[pays,setPays]=useState([]);const[camps,setCamps]=useState([]);const[campBookings,setCampBookings]=useState([]);const[holidays,setHolidays]=useState([]);const[userHolidays,setUserHolidays]=useState([]);
  const[schoolLocs,setSchoolLocs]=useState([]);
  const[familyLocs,setFamilyLocs]=useState([]);const[showLocations,setShowLocations]=useState(false);
  const[showAddEv,setShowAddEv]=useState(false);const[showAddPay,setShowAddPay]=useState(false);
  const[showAddKid,setShowAddKid]=useState(false);const[editClub,setEditClub]=useState(null);const[editHol,setEditHol]=useState(null);const[showAddHol,setShowAddHol]=useState(false);const[showInvite,setShowInvite]=useState(false);const[showSupport,setShowSupport]=useState(false);const[showFamily,setShowFamily]=useState(false);const[weekView,setWeekView]=useState("grid");const[selectedDay,setSelectedDay]=useState(null);const[calMonth,setCalMonth]=useState(new Date().getMonth());const[calYear,setCalYear]=useState(new Date().getFullYear());const[showPaste,setShowPaste]=useState(false);const[showFab,setShowFab]=useState(false);const[editEvent,setEditEvent]=useState(null);const[showProfile,setShowProfile]=useState(false);const[localEvents,setLocalEvents]=useState([]);const[actCats,setActCats]=useState([]);const[loading,setLoading]=useState(true);const[userLoc,setUserLoc]=useState(null);const[familyMembers,setFamilyMembers]=useState([]);const[notifications,setNotifications]=useState([]);const[showNotifs,setShowNotifs]=useState(false);const[showAddActivity,setShowAddActivity]=useState(false);const[tapEvent,setTapEvent]=useState(null);
  const[showChangePw,setShowChangePw]=useState(false);const[showDeleteAcct,setShowDeleteAcct]=useState(false);
  const[showSaveLocModal,setShowSaveLocModal]=useState(false);const[showAddLocModal,setShowAddLocModal]=useState(false);
  const[campLoc,setCampLoc]=useState("all");

  async function load(){
    try{
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
      db("hub_subscriptions","GET",{select:"id,club_id,dependant_id,colour,nickname,clubs(id,name,address,location,phone,rating,term_start,term_end)",filters:[uidFilter]}),
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
    setClubs((c||[]).map(s=>({...s,club_id:s.club_id||s.clubs?.id,club_name:s.clubs?.name||"?",club_addr:s.clubs?.address,term_start:s.clubs?.term_start||null,term_end:s.clubs?.term_end||null})));
    setRecs(r||[]);setMans(m||[]);setPays(p||[]);setCamps(ca||[]);setHolidays(hols||[]);setUserHolidays(userHols||[]);setCampBookings(cBooks||[]);setLocalEvents(lEvts||[]);setActCats(aCats||[]);
    // Load family locations
    const fLocs=await db("family_locations","GET",{filters:["user_id=eq."+user.id,"active=eq.true"],order:"label.asc"});
    setFamilyLocs(fLocs||[]);
    // Auto-add school locations if not already saved — batch insert
    if(schoolLocs.length===0&&kidSchools.length>0){
      const uniqueSchools2=[...new Set(kidSchools)];
      const schoolQ2=uniqueSchools2.map(s=>"name.ilike.*"+encodeURIComponent(s.replace(/'/g,"''"))+"*").join(",");
      const sch2=await db("schools","GET",{select:"name,latitude,longitude",filters:["or=("+schoolQ2+")","latitude=not.is.null"],limit:20});
      const newSchLocs=(sch2||[]).filter(s=>s.latitude).map(s=>({lat:Number(s.latitude),lng:Number(s.longitude),name:s.name}));
      setSchoolLocs(newSchLocs);
      // Batch insert school locations into family_locations if not there yet
      const toInsert=newSchLocs.filter(sl=>!(fLocs||[]).find(fl=>fl.label.includes("School")&&Math.abs(Number(fl.latitude)-sl.lat)<0.01));
      if(toInsert.length>0){
        await Promise.all(toInsert.map(sl=>db("family_locations","POST",{body:{user_id:user.id,label:"🏫 "+sl.name,latitude:sl.lat,longitude:sl.lng,radius_km:10,auto_source:"school",active:true}})));
        // Re-fetch after batch insert
        const fLocs2=await db("family_locations","GET",{filters:["user_id=eq."+user.id,"active=eq.true"],order:"label.asc"});
        setFamilyLocs(fLocs2||[]);
      }
    }
    setLoading(false);
    // Load notifications (inbound messages)
    const notifs=await db("inbound_messages","GET",{filters:["user_id=eq."+user.id],order:"created_at.desc",limit:10});
    setNotifications(notifs||[]);
    // Update last active (fire-and-forget but log errors)
    db("profiles","PATCH",{body:{last_active_at:new Date().toISOString()},filters:["id=eq."+user.id]}).catch(e=>console.error("last_active update failed:",e));
    }catch(err){
      console.error("Hub load() failed:",err);
      showToast("Something went wrong loading your data. Pull down to retry.","err");
      setLoading(false);
    }
  }
  useEffect(()=>{
    load();
    // ALWAYS get fresh location — no caching. This ensures moving to a new area works.
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos=>{
        const loc={lat:pos.coords.latitude,lng:pos.coords.longitude};
        setUserLoc(loc);
        db("profiles","PATCH",{filters:["id=eq."+user.id],body:{latitude:loc.lat,longitude:loc.lng}}).catch(e=>console.error("Profile location update failed:",e));
        // Check if this area has been scraped recently — if not, fire ONE scrape
        rpc("needs_scrape",{lat:loc.lat,lng:loc.lng}).then(needed=>{
          if(needed){
            fetch(SB+"/functions/v1/scrape-local",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({latitude:loc.lat,longitude:loc.lng,user_id:user.id})}).then(r=>r.json()).then(d=>{if(d.status==="success")load()}).catch(e=>console.error("Scrape failed:",e));
          }
        }).catch(e=>console.error("needs_scrape check failed:",e));
      },()=>{
        // Geolocation denied — use saved profile location
        db("profiles","GET",{filters:["id=eq."+user.id],select:"latitude,longitude"}).then(p=>{
          if(p&&p[0]&&p[0].latitude){
            const loc={lat:Number(p[0].latitude),lng:Number(p[0].longitude)};
            setUserLoc(loc);
          }
        }).catch(e=>console.error("Profile location fallback failed:",e));
      },{enableHighAccuracy:true,timeout:10000,maximumAge:0});
    }
  },[]);

  // When family locations load, scrape only genuinely new areas (not scraped in 7 days within 15km)
  const familyLocsKey=useMemo(()=>familyLocs.map(fl=>fl.id+":"+fl.latitude+":"+fl.longitude).join("|"),[familyLocs]);
  useEffect(()=>{
    if(familyLocs.length===0)return;
    familyLocs.forEach(fl=>{
      rpc("needs_scrape",{lat:Number(fl.latitude),lng:Number(fl.longitude)}).then(needed=>{
        if(needed){
          fetch(SB+"/functions/v1/scrape-local",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({latitude:Number(fl.latitude),longitude:Number(fl.longitude)})}).then(r=>r.json()).then(d=>{if(d.status==="success")load()}).catch(e=>console.error("Family loc scrape failed:",e));
        }
      }).catch(e=>console.error("needs_scrape check failed:",e));
    });
  },[familyLocsKey]);

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
  const clubTermMap=useMemo(()=>{const m=new Map();(clubs||[]).forEach(c=>{if(c.term_start&&c.term_end)m.set(c.club_id,{start:new Date(c.term_start+"T00:00:00"),end:new Date(c.term_end+"T23:59:59")})});return m},[clubs]);
  const kidMap=useMemo(()=>{const m=new Map();(kids||[]).forEach(k=>m.set(k.id,k));return m},[kids]);
  const weekEvts=useMemo(()=>{
    const evts=[];
    (recs||[]).forEach(re=>{
      if(!re.active)return;
      wd.forEach(d=>{
        if(d.getDay()===re.day_of_week){
          // Skip if outside club term dates
          const term=clubTermMap.get(re.club_id);
          if(term&&(d<term.start||d>term.end))return;
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
  },[recs,mans,clubMap,clubTermMap,kidMap,profile,wd]);

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
  const overviewIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
  const allTabs=[{id:"overview",l:"Overview",i:overviewIcon},{id:"week",l:"Schedule",i:ICN.calendar},{id:"money",l:"Money",i:ICN.wallet},{id:"explore",l:"Explore",i:ICN.search}];
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
          <div style={{display:"flex",gap:6,flexWrap:"wrap",paddingBottom:6}}>
            {members.map(m=><button key={m.id} onClick={()=>setFilter(m.id)} className={"pill "+(filter===m.id?"pon":"poff")} style={{flexShrink:0}}>{m.type!=="all"&&<span style={{width:7,height:7,borderRadius:"50%",background:m.type==="kid"?COLS[members.indexOf(m)%COLS.length]:m.type==="adult"?"#8b5cf6":"var(--g)",flexShrink:0}}/>}{m.type==="all"?"👨‍👩‍👧‍👦":""} {m.name}{m.age!=null&&<span style={{opacity:.5,marginLeft:2}}>({m.age})</span>}</button>)}
          </div>
        </div>
        <div style={{maxWidth:520,margin:"0 auto",display:"flex"}}>
          {tabs.map(t=><button key={t.id} onClick={()=>{setTab(t.id);track("tab_view",{tab:t.id})}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"8px 0 6px",fontSize:10,fontWeight:600,border:"none",borderBottom:tab===t.id?"2.5px solid var(--g)":"2.5px solid transparent",cursor:"pointer",background:"none",color:tab===t.id?"var(--g)":"var(--mt)",fontFamily:"var(--sn)",transition:"color .15s"}}><span style={{display:"flex"}}>{t.i}</span><span>{t.l}</span></button>)}
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

      {/* WEEK/MONTH HEADER + DAY PILLS — only on Schedule, Money tabs */}
      {(tab==="week"||tab==="money")&&<>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:4}}>
        <h2 style={{fontFamily:"var(--sr)",fontSize:20,fontWeight:800,color:"var(--g)"}}>This week</h2>
        {tab==="week"&&<div style={{display:"flex",gap:6}}>
          {["grid","list","calendar"].map(v=><button key={v} onClick={()=>{track("view_toggle",{view:v});setWeekView(v);setSelectedDay(null)}} style={{fontSize:11,fontWeight:600,color:weekView===v?"var(--acc)":"var(--mt)",background:weekView===v?"var(--accl)":"none",border:weekView===v?"1px solid #f8c4bc":"1px solid transparent",borderRadius:8,padding:"3px 8px",cursor:"pointer",fontFamily:"var(--sn)",textTransform:"capitalize"}}>{v}</button>)}
        </div>}
      </div>

      {/* HORIZONTAL DAY PILLS — hide in grid mode since grid has its own day labels */}
      {weekView!=="grid"&&<div style={{display:"flex",gap:4,marginBottom:12,overflowX:"auto",WebkitOverflowScrolling:"touch"}} className="hsb">
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
      </div>}
      </>}

      {/* DAY PANEL — shows on Money tab when a day pill is tapped */}
      {(tab==="money")&&selectedDay&&(()=>{
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
          <div style={{padding:"8px 12px",maxHeight:200,overflowY:"auto"}}>
            {dayEvts.length===0?<div style={{padding:"12px 0",textAlign:"center",color:"var(--mt)",fontSize:13}}>{isHol?"School holiday — no activities scheduled":"Nothing scheduled this day"}</div>
            :dayEvts.map((e,i)=><div key={e.id||i} style={{display:"flex",alignItems:"stretch",gap:0,borderRadius:12,overflow:"hidden",background:"var(--bg)",border:"1px solid var(--bd)",marginBottom:6}}>
              <div style={{width:4,background:e.colour||"#999",flexShrink:0}}/>
              <div style={{flex:1,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--tx)"}}>{e.source_type==="camp"?"🏕️ ":""}{e.club||e.title||""}</div>
                  <div style={{fontSize:11,color:"var(--mt)",marginTop:1}}>{e.member}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--g)",fontVariantNumeric:"tabular-nums"}}>{e.time||""}{e.endTime?"–"+e.endTime:""}</div>
                </div>
              </div>
            </div>)}
          </div>
        </div>;
      })()}

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
      {tab==="week"&&(weekView==="list"||weekView==="grid")&&selectedDay&&(()=>{
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
            // Skip if outside club term dates
            const term=clubTermMap.get(re.club_id);
            if(term&&(cellDate<term.start||cellDate>term.end))return;
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

      {/* OVERVIEW TAB */}
      {tab==="overview"&&<div>
      {/* SMART ALERTS — moved from schedule tab */}
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
                alerts.push({type:"info",icon:"🏕️",text:kid.first_name+" has no camp booked for "+nextHol.name+". "+suitableCamps.length+" camp"+(suitableCamps.length>1?"s":"")+" suit"+(suitableCamps.length===1?"s":"")+" their age.",action:"explore",subaction:"camps"});
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
              alerts.push({type:"urgent",icon:"⚠️",text:"Clash today: "+a.member+" ("+a.title+" "+a.time+") overlaps "+b.member+" ("+b.title+" "+b.time+")",action:"week",day:new Date()});
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
            if(camp)alerts.push({type:"info",icon:"💡",text:"A carer recommended "+camp.title+" — tap to review",action:"explore",subaction:"camps"});
          });
        }

        if(alerts.length===0)return null;

        const colors={urgent:{bg:"#fef2f2",border:"#fecaca",text:"#dc2626"},warn:{bg:"var(--accl)",border:"#f8c4bc",text:"var(--acc)"},info:{bg:"var(--gxl)",border:"#c8dce8",text:"var(--gl)"}};
        return <div style={{marginBottom:14}}>

          {alerts.slice(0,5).map((a,i)=>{
            const col=colors[a.type]||colors.info;
            return <div key={i} onClick={()=>{if(a.action){if(a.action==="explore"){setTab("explore");setExploreTab(a.subaction||"clubs");}else{setTab(a.action);}if(a.day)setSelectedDay(a.day);window.scrollTo(0,0)}}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,background:col.bg,border:"1px solid "+col.border,marginBottom:6,cursor:a.action?"pointer":"default"}} onTouchStart={ev=>{if(a.action)ev.currentTarget.style.opacity=".7"}} onTouchEnd={ev=>{ev.currentTarget.style.opacity="1"}}>
              <span style={{fontSize:16,flexShrink:0}}>{a.icon}</span>
              <span style={{flex:1,fontSize:12,color:col.text,fontWeight:600,lineHeight:1.4}}>{a.text}</span>
              {a.action&&<span style={{flexShrink:0,color:col.text,opacity:.5,fontSize:14}}>›</span>}
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
            {clashes.map((cl,i)=><div key={i} onClick={()=>{setTab("week");setSelectedDay(cl.day);setWeekView("list");window.scrollTo(0,0)}} style={{fontSize:12,color:"#991b1b",marginBottom:2,cursor:"pointer",padding:"4px 0",borderRadius:6}}>
              {fmtDate(cl.day)}: {cl.a.member} ({cl.a.title} {cl.a.time}) overlaps {cl.b.member} ({cl.b.title} {cl.b.time}) →
            </div>)}
          </div>;
        })()}

        {/* THIS WEEK STATS */}
        <div style={{background:"var(--card)",borderRadius:16,border:"1px solid var(--bd)",padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
          <h3 style={{fontFamily:"var(--sr)",fontSize:15,fontWeight:700,color:"var(--g)",marginBottom:10}}>This week</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{background:"var(--gxl)",borderRadius:12,padding:12,textAlign:"center"}}>
              <div style={{fontFamily:"var(--sr)",fontSize:22,fontWeight:800,color:"var(--g)"}}>{activeWeekEvts.length}</div>
              <div style={{fontSize:10,fontWeight:600,color:"var(--mt)",marginTop:2}}>Activities</div>
            </div>
            <div style={{background:"var(--gxl)",borderRadius:12,padding:12,textAlign:"center"}}>
              <div style={{fontFamily:"var(--sr)",fontSize:22,fontWeight:800,color:"var(--g)"}}>{new Set(activeWeekEvts.map(e=>e.club).filter(Boolean)).size}</div>
              <div style={{fontSize:10,fontWeight:600,color:"var(--mt)",marginTop:2}}>Clubs</div>
            </div>
            {isAdmin&&<div style={{background:"var(--gxl)",borderRadius:12,padding:12,textAlign:"center"}}>
              <div style={{fontFamily:"var(--sr)",fontSize:22,fontWeight:800,color:totalDue>0?"var(--acc)":"var(--g)"}}>€{totalDue.toFixed(0)}</div>
              <div style={{fontSize:10,fontWeight:600,color:"var(--mt)",marginTop:2}}>Due soon</div>
            </div>}
            <div style={{background:"var(--gxl)",borderRadius:12,padding:12,textAlign:"center"}}>
              <div style={{fontFamily:"var(--sr)",fontSize:22,fontWeight:800,color:"var(--g)"}}>{kids.length}</div>
              <div style={{fontSize:10,fontWeight:600,color:"var(--mt)",marginTop:2}}>Kids</div>
            </div>
          </div>
        </div>

        {/* FAMILY SUMMARY */}
        <div style={{background:"var(--card)",borderRadius:16,border:"1px solid var(--bd)",padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
          <h3 style={{fontFamily:"var(--sr)",fontSize:15,fontWeight:700,color:"var(--g)",marginBottom:10}}>Family</h3>
          {kids.map((k,ki)=>{
            const kidEvts=activeWeekEvts.filter(e=>e.memberId===k.id);
            const kidClubs=[...new Set(kidEvts.map(e=>e.club).filter(Boolean))];
            return <div key={k.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:ki<kids.length-1?"1px solid var(--bd)":"none"}}>
              <div style={{width:32,height:32,borderRadius:10,background:COLS[ki%COLS.length],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700}}>{k.first_name?.[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--tx)"}}>{k.first_name}{getAge(k.date_of_birth)!=null&&<span style={{color:"var(--mt)",fontWeight:400,fontSize:11,marginLeft:4}}>({getAge(k.date_of_birth)})</span>}</div>
                <div style={{fontSize:11,color:"var(--mt)"}}>{kidEvts.length} activit{kidEvts.length===1?"y":"ies"}{kidClubs.length>0?" · "+kidClubs.join(", "):""}</div>
              </div>
            </div>;
          })}
          {/* Self */}
          {(()=>{
            const selfEvts=activeWeekEvts.filter(e=>e.memberId==="self");
            return selfEvts.length>0?<div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}>
              <div style={{width:32,height:32,borderRadius:10,background:"var(--g)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700}}>{(profile?.first_name||"M")[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--tx)"}}>{profile?.first_name||"Me"}</div>
                <div style={{fontSize:11,color:"var(--mt)"}}>Driving: {activeWeekEvts.filter(e=>e.driver===profile?.first_name).length} pickups this week</div>
              </div>
            </div>:null;
          })()}
        </div>

        {/* SPEND SNAPSHOT (admin only) */}
        {isAdmin&&pays.length>0&&<div style={{background:"var(--card)",borderRadius:16,border:"1px solid var(--bd)",padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
          <h3 style={{fontFamily:"var(--sr)",fontSize:15,fontWeight:700,color:"var(--g)",marginBottom:10}}>Spend</h3>
          {(()=>{
            const clubFees={};
            pays.forEach(p=>{
              const key=p.description||"Other";
              if(!clubFees[key])clubFees[key]={total:0,paid:0};
              clubFees[key].total+=parseFloat(p.amount||0);
              if(p.paid)clubFees[key].paid+=parseFloat(p.amount||0);
            });
            const maxTotal=Math.max(...Object.values(clubFees).map(f=>f.total),1);
            return Object.entries(clubFees).slice(0,4).map(([name,f])=><div key={name}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",fontSize:12}}>
                <span style={{fontWeight:600,color:"var(--tx)"}}>{name}</span>
                <span style={{fontWeight:700,color:"var(--g)"}}>€{f.total.toFixed(0)}</span>
              </div>
              <div style={{height:4,borderRadius:2,background:"var(--gxl)",margin:"2px 0 6px",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:2,width:(f.total/maxTotal*100)+"%",background:f.paid>=f.total?"linear-gradient(90deg,#22c55e,#16a34a)":"linear-gradient(90deg,var(--acc),#c44030)"}}/>
              </div>
            </div>);
          })()}
          <div style={{textAlign:"center",marginTop:4}}>
            <span onClick={()=>setTab("money")} style={{fontSize:11,fontWeight:600,color:"var(--acc)",cursor:"pointer"}}>View all fees ›</span>
          </div>
        </div>}

        {/* MY CLUBS */}
        {clubs.length>0&&<div style={{background:"var(--card)",borderRadius:16,border:"1px solid var(--bd)",padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
          <h3 style={{fontFamily:"var(--sr)",fontSize:15,fontWeight:700,color:"var(--g)",marginBottom:10}}>My Clubs</h3>
          {(()=>{
            const grouped={};
            clubs.forEach((c,i)=>{
              if(!grouped[c.club_id])grouped[c.club_id]={...c,members:[],idx:i,nickname:c.nickname||null};
              const kid=c.dependant_id?kids.find(k=>k.id===c.dependant_id):null;
              grouped[c.club_id].members.push(kid?kid.first_name:(profile?.first_name||"You"));
            });
            return Object.values(grouped).map((c,i)=>{
              const term=clubTermMap.get(c.club_id);
              const termLabel=term?new Date(c.term_start).toLocaleDateString("en-IE",{day:"numeric",month:"short"})+" – "+new Date(c.term_end).toLocaleDateString("en-IE",{day:"numeric",month:"short"}):"";
              return <div key={c.club_id} onClick={()=>setEditClub(c)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<Object.keys(grouped).length-1?"1px solid var(--bd)":"none",cursor:"pointer"}}>
                <div style={{width:36,height:36,borderRadius:10,background:c.colour||COLS[i%COLS.length],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:800,flexShrink:0}}>{c.club_name.split(" ").map(w=>w[0]).join("").substring(0,2)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--tx)"}}>{c.nickname||c.club_name}</div>
                  <div style={{fontSize:11,color:"var(--mt)"}}>{c.members.join(", ")}{termLabel?" · "+termLabel:""}</div>
                </div>
                <span style={{color:"#ddd",flexShrink:0,fontSize:14}}>›</span>
              </div>;
            });
          })()}
          {isAdmin&&<div style={{textAlign:"center",marginTop:8}}>
            <span onClick={()=>onRefresh("clubs")} style={{fontSize:11,fontWeight:600,color:"var(--acc)",cursor:"pointer"}}>+ Add a club</span>
          </div>}
        </div>}
      </div>}

      {/* THIS WEEK */}
      {tab==="week"&&<div>

        {/* WEEKLY GRID VIEW */}
        {weekView==="grid"&&<WeekGrid weekDays={wd} events={filtEvts} holidays={[...(holidays||[]),...(userHolidays||[])]} onTapEvent={setTapEvent}/>}

        {/* SWIMLANE LIST VIEW */}
        {weekView==="list"&&<div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}} className="hsb">
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
        {/* Spend summary */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          <div style={{background:"var(--card)",borderRadius:14,padding:12,border:"1px solid var(--bd)",textAlign:"center",boxShadow:"var(--shadow)"}}>
            <div style={{fontSize:20,fontWeight:800,color:"var(--g)",fontFamily:"var(--sr)"}}>€{filtPays.reduce((s,p)=>s+parseFloat(p.amount||0),0).toFixed(0)}</div>
            <div style={{fontSize:10,fontWeight:600,color:"var(--mt)",marginTop:2}}>Total tracked</div>
          </div>
          <div style={{background:"var(--card)",borderRadius:14,padding:12,border:"1px solid var(--bd)",textAlign:"center",boxShadow:"var(--shadow)"}}>
            <div style={{fontSize:20,fontWeight:800,color:"#16a34a",fontFamily:"var(--sr)"}}>€{filtPays.filter(p=>p.paid).reduce((s,p)=>s+parseFloat(p.amount||0),0).toFixed(0)}</div>
            <div style={{fontSize:10,fontWeight:600,color:"var(--mt)",marginTop:2}}>Paid</div>
          </div>
          <div style={{background:"var(--card)",borderRadius:14,padding:12,border:"1px solid var(--bd)",textAlign:"center",boxShadow:"var(--shadow)"}}>
            <div style={{fontSize:20,fontWeight:800,color:"var(--acc)",fontFamily:"var(--sr)"}}>€{filtPays.filter(p=>!p.paid).reduce((s,p)=>s+parseFloat(p.amount||0),0).toFixed(0)}</div>
            <div style={{fontSize:10,fontWeight:600,color:"var(--mt)",marginTop:2}}>Outstanding</div>
          </div>
        </div>

        {(()=>{
          const overdue=filtPays.filter(p=>!p.paid&&new Date(p.due_date)<new Date());
          if(overdue.length===0)return null;
          const total=overdue.reduce((s,p)=>s+parseFloat(p.amount),0);
          return <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:14,padding:14,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:24}}>🚨</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#dc2626"}}>€{total.toFixed(0)} overdue</div>
              <div style={{fontSize:12,color:"#991b1b"}}>{overdue.length} payment{overdue.length>1?"s":""} past due date</div>
            </div>
          </div>;
        })()}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          <div style={{background:"var(--accl)",borderRadius:14,padding:16,border:"1px solid #f0d078"}}>
            <div style={{fontSize:28,fontWeight:800,color:"#c44030",fontFamily:"var(--sr)"}}>€{totalDue.toFixed(0)}</div>
            <div style={{fontSize:12,fontWeight:600,color:"#a68600",marginTop:2}}>Outstanding</div>
          </div>
          <div style={{background:"var(--gxl)",borderRadius:14,padding:16,border:"1px solid #c8e6c9"}}>
            <div style={{fontSize:28,fontWeight:800,color:"var(--g)",fontFamily:"var(--sr)"}}>€{totalPaid.toFixed(0)}</div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--gl)",marginTop:2}}>Paid</div>
          </div>
        </div>
        {filtPays.length===0?<div style={{textAlign:"center",padding:"40px 0",color:"var(--mt)"}}><div style={{fontSize:36,marginBottom:8}}>💳</div><p style={{fontSize:14}}>No payment reminders yet</p></div>
        :filtPays.map(p=>{
          const overdue=!p.paid&&new Date(p.due_date)<new Date();
          const kid=p.dependant_id?kids.find(k=>k.id===p.dependant_id):null;
          const cl=clubs.find(c=>c.club_id===p.club_id);
          return <div key={p.id} style={{background:"var(--card)",borderRadius:16,border:"1px solid var(--bd)",boxShadow:"var(--shadow)",padding:16,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:14,fontWeight:600}}>{kid?.first_name||profile?.first_name||"You"} — {p.description}</div><div style={{fontSize:12,color:"var(--mt)",marginTop:2}}>{cl?.club_name||""} • Due {new Date(p.due_date).toLocaleDateString("en-IE",{day:"numeric",month:"short"})}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:800,color:p.paid?"var(--gl)":p.status==="not_renewing"?"#888":overdue?"#dc2626":"var(--tx)",fontFamily:"var(--sr)",textDecoration:p.status==="not_renewing"?"line-through":"none"}}>€{parseFloat(p.amount).toFixed(0)}</div>
                {isAdmin&&!p.paid&&p.status!=="not_renewing"&&<div style={{display:"flex",gap:4,marginTop:4,justifyContent:"flex-end"}}>
                  <button onClick={async()=>{try{await db("payment_reminders","PATCH",{body:{paid:true},filters:["id=eq."+p.id]});showToast("Marked as paid");await load()}catch(e){showToast("Failed to update. Try again.","err")}}} style={{fontSize:11,fontWeight:700,color:"var(--gl)",background:"var(--gxl)",border:"none",borderRadius:8,padding:"3px 10px",cursor:"pointer"}}>Paid</button>
                  <button onClick={async()=>{try{await db("payment_reminders","PATCH",{body:{status:"not_renewing"},filters:["id=eq."+p.id]});await load()}catch(e){showToast("Failed to update. Try again.","err")}}} style={{fontSize:11,fontWeight:700,color:"#888",background:"#f3f3f3",border:"none",borderRadius:8,padding:"3px 10px",cursor:"pointer"}}>Not renewing</button>
                </div>}
                {p.status==="not_renewing"&&<div style={{display:"flex",gap:4,marginTop:4,justifyContent:"flex-end",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#888",fontWeight:600}}>Not renewing</span>
                  <button onClick={async()=>{try{await db("payment_reminders","DELETE",{filters:["id=eq."+p.id]});await load()}catch(e){showToast("Failed to remove. Try again.","err")}}} style={{fontSize:10,fontWeight:600,color:"#dc2626",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Remove</button>
                </div>}
                {p.paid&&<span style={{fontSize:11,color:"var(--gl)",fontWeight:700}}>✓ Paid</span>}
              </div>
            </div>
          </div>
        })}
        {isAdmin&&<button onClick={()=>setShowAddPay(true)} style={{width:"100%",padding:14,borderRadius:14,border:"2px dashed var(--bd)",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--mt)",fontFamily:"var(--sn)",marginTop:8}}>+ Add payment reminder</button>}
      </div>}

      {tab==="explore"&&<div>
        {/* Sub-tabs */}
        <div style={{display:"flex",gap:0,marginBottom:12,borderBottom:"1px solid var(--bd)"}}>
          {["clubs","camps","discover"].map(st=><button key={st} onClick={()=>setExploreTab(st)} style={{padding:"8px 14px",fontSize:12,fontWeight:600,color:exploreTab===st?"var(--g)":"var(--mt)",border:"none",background:"none",cursor:"pointer",fontFamily:"var(--sn)",borderBottom:exploreTab===st?"2px solid var(--acc)":"2px solid transparent",textTransform:"capitalize"}}>{st==="clubs"?"My Clubs":st==="camps"?"Camps":"Discover"}</button>)}
        </div>

        {/* My Clubs sub-tab */}
        {exploreTab==="clubs"&&<div>
          {(()=>{
            const grouped={};
            clubs.forEach((c,i)=>{
              if(!grouped[c.club_id])grouped[c.club_id]={...c,members:[],idx:i,nickname:c.nickname||null};
              const kid=c.dependant_id?kids.find(k=>k.id===c.dependant_id):null;
              grouped[c.club_id].members.push(kid?kid.first_name:(profile?.first_name||"You"));
            });
            return Object.values(grouped).map((c,i)=>
              <div key={c.club_id} onClick={()=>setEditClub(c)} style={{background:"var(--card)",borderRadius:16,border:"1px solid var(--bd)",boxShadow:"var(--shadow)",padding:16,marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
                <div style={{width:40,height:40,borderRadius:10,background:c.colour||COLS[i%COLS.length],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:800,flexShrink:0}}>{c.club_name.split(" ").map(w=>w[0]).join("").substring(0,2)}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600}}>{c.club_name}</div>
                  <div style={{fontSize:12,color:"var(--mt)"}}>{(c.nickname?c.nickname+" — ":"")+c.members.join(", ")}{c.club_addr?" • "+c.club_addr:""}</div>
                </div>
              </div>
            );
          })()}
          {isAdmin&&<button onClick={()=>onRefresh("clubs")} style={{width:"100%",padding:14,borderRadius:14,border:"2px dashed var(--bd)",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--mt)",fontFamily:"var(--sn)",marginTop:8}}>+ Add a club</button>}
          <NearbyClubsSection userLoc={userLoc} familyLocs={familyLocs} clubs={clubs} setEditClub={setEditClub} isAdmin={isAdmin}/>
        </div>}

        {/* Camps sub-tab */}
        {exploreTab==="camps"&&<div>
          {allLocs.length>1&&<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:10,WebkitOverflowScrolling:"touch"}}>
            <button onClick={()=>setCampLoc("all")} className={"pill "+(campLoc==="all"?"pon":"poff")} style={{flexShrink:0}}>All locations</button>
            {allLocs.map(l=><button key={l.label} onClick={()=>setCampLoc(campLoc===l.label?"all":l.label)} className={"pill "+(campLoc===l.label?"pon":"poff")} style={{flexShrink:0}}>{l.label}</button>)}
          </div>}
          {allLocs.length<=1&&allLocs.length>0&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--mt)"}}>
              <span>📍</span> {allLocs[0]?.label?.replace(/^[^\w]*\s*/,'')||"Near you"}
            </div>
            <button onClick={()=>setShowLocations(true)} style={{fontSize:11,fontWeight:600,color:"var(--acc)",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--sn)",whiteSpace:"nowrap"}}>Manage</button>
          </div>}
          {allLocs.length===0&&<button onClick={()=>setShowLocations(true)} style={{width:"100%",padding:"10px 14px",marginBottom:12,borderRadius:12,border:"2px dashed var(--bd)",background:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--gl)",fontFamily:"var(--sn)",display:"flex",alignItems:"center",gap:8}}>📍 Add your locations to see nearby camps</button>}
          {kids.length>0&&(()=>{
            const now=new Date();
            const futureHols=(holidays||[]).filter(h=>new Date(h.end_date)>=now).slice(0,1);
            if(futureHols.length===0)return null;
            return <div style={{background:"var(--card)",borderRadius:16,border:"1px solid var(--bd)",padding:14,marginBottom:14,boxShadow:"var(--shadow)"}}>
              <div style={{fontSize:13,fontWeight:700,color:"var(--g)",marginBottom:8}}>Holiday coverage</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {futureHols.map(h=>{
                  const booked=(campBookings||[]).filter(b=>{
                    const camp=(camps||[]).find(ca=>ca.id===b.camp_id);
                    return camp&&new Date(camp.start_date)>=new Date(h.start_date)&&new Date(camp.start_date)<=new Date(h.end_date);
                  });
                  const covered=booked.length>0;
                  return <div key={h.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12}}>
                    <span style={{color:"var(--tx)",fontWeight:600}}>{h.name}</span>
                    <span style={{fontWeight:700,color:covered?"#16a34a":"var(--acc)",background:covered?"#f0fdf4":"var(--accl)",padding:"2px 10px",borderRadius:8}}>
                      {covered?booked.length+" booked":"Not covered"}
                    </span>
                  </div>;
                })}
              </div>
            </div>;
          })()}
          {(()=>{
            const now=new Date();
            const mergedHols=holidays.map(h=>{
              const override=userHolidays.find(uh=>uh.base_holiday_id===h.id);
              if(override){
                if(override.holiday_type==="hidden")return null;
                return {...override,is_user_override:true,holiday_type:override.holiday_type||h.holiday_type};
              }
              return {...h,is_user_override:false};
            }).filter(Boolean);
            userHolidays.filter(uh=>!uh.base_holiday_id&&uh.holiday_type!=="hidden").forEach(uh=>{
              mergedHols.push({...uh,is_user_override:true});
            });
            const futureHols=mergedHols.filter(h=>new Date(h.end_date+"T23:59:59")>=now).sort((a,b)=>new Date(a.start_date)-new Date(b.start_date)).slice(0,2);
            const kidName=filter!=="all"&&filter!=="self"?kids.find(k=>k.id===filter)?.first_name:null;
            const kidAge=filter!=="all"&&filter!=="self"?getAge(kids.find(k=>k.id===filter)?.date_of_birth):null;

            if(futureHols.length===0) return <p style={{color:"var(--mt)",padding:20,textAlign:"center"}}>No upcoming school holidays found</p>;

            return futureHols.map(hol=>{
              const hs=new Date(hol.start_date+"T00:00:00"),he=new Date(hol.end_date+"T23:59:59");
              const holCamps=filtCamps.filter(camp=>{
                const cs=new Date(camp.start_date+"T00:00:00");
                return cs>=hs&&cs<=he;
              }).sort((a,b)=>{
                const distTo=(c)=>{
                  if(!c.latitude)return 999;
                  const cLat=Number(c.latitude),cLng=Number(c.longitude);
                  let min=999;
                  allLocs.forEach(loc=>{min=Math.min(min,calcKm(loc.lat,loc.lng,cLat,cLng))});
                  return min;
                };
                return distTo(a)-distTo(b);
              });
              const holEmoji=hol.holiday_type==="easter"?"🐣":hol.holiday_type==="summer"?"☀️":hol.holiday_type==="christmas"?"🎄":"🍂";
              const weeks=Math.max(1,Math.ceil((he-hs)/(7*86400000)));

              return <div key={hol.id} style={{marginBottom:24}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:20}}>{holEmoji}</span>
                  <h3 style={{fontFamily:"var(--sr)",fontSize:17,fontWeight:700,color:"var(--g)",flex:1}}>{hol.name}</h3>
                  <button onClick={(e)=>{e.stopPropagation();setEditHol(hol)}} style={{background:"var(--gxl)",border:"none",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,color:"var(--gl)",cursor:"pointer",fontFamily:"var(--sn)"}}>✎ Edit dates</button>
                </div>
                <p style={{fontSize:12,color:"var(--mt)",marginBottom:12}}>
                  {new Date(hol.start_date).toLocaleDateString("en-IE",{day:"numeric",month:"short"})} – {new Date(hol.end_date).toLocaleDateString("en-IE",{day:"numeric",month:"short"})} ({weeks} week{weeks>1?"s":""}){hol.is_user_override?" • customised":""}
                  {kidName&&kidAge!=null?" · Showing camps for "+kidName+" (age "+kidAge+")":""}
                  {" · "+holCamps.length+" camp"+(holCamps.length!==1?"s":"")+" found"}
                </p>

                {holCamps.length===0?
                  <div style={{padding:20,borderRadius:14,border:"2px dashed var(--bd)",textAlign:"center",marginBottom:8}}>
                    <div style={{fontSize:28,marginBottom:6}}>🔍</div>
                    <p style={{fontSize:13,color:"var(--mt)"}}>No camps listed yet for this break</p>
                    <p style={{fontSize:12,color:"var(--mt)",marginTop:2}}>We'll alert you when camps appear</p>
                  </div>
                :holCamps.map(camp=><CampCard key={camp.id} camp={camp} userLoc={userLoc} allLocs={allLocs} user={user} kids={kids} filter={filter} campBookings={campBookings} CT={CT} fmtDate={fmtDate} onBookingChange={load} isAdmin={isAdmin}/>)}
              </div>
            });
          })()}
          <button onClick={()=>setShowAddHol(true)} style={{width:"100%",padding:14,borderRadius:14,border:"2px dashed var(--bd)",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--mt)",fontFamily:"var(--sn)",marginTop:8}}>+ Add a school holiday or closure day</button>
        </div>}

        {/* Discover sub-tab */}
        {exploreTab==="discover"&&<div>
          {userLoc&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,fontSize:12,color:"var(--mt)"}}><span>📍</span> Showing things to do near you</div>}
          {!userLoc&&<button onClick={()=>{navigator.geolocation?.getCurrentPosition(pos=>{const loc={lat:pos.coords.latitude,lng:pos.coords.longitude};setUserLoc(loc);db("profiles","PATCH",{filters:["id=eq."+user.id],body:{latitude:loc.lat,longitude:loc.lng}})},()=>{},{timeout:5000})}} style={{width:"100%",padding:"10px 14px",marginBottom:12,borderRadius:12,border:"2px dashed var(--bd)",background:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--gl)",fontFamily:"var(--sn)",display:"flex",alignItems:"center",gap:8}}>📍 Enable location to see things to do near you</button>}
          <ThingsToDoSection allLocs={allLocs} kids={kids} userLoc={userLoc} setUserLoc={setUserLoc} userId={user.id} onEventAdded={()=>load()}/>
        </div>}
      </div>}

      </div>

      {/* Manage Locations Modal */}
      {showLocations&&<div onClick={()=>setShowLocations(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(10,15,20,.4)",zIndex:70}}/>}
      {showLocations&&<div style={{position:"fixed",top:"5vh",left:12,right:12,zIndex:71,background:"#fff",borderRadius:20,boxShadow:"0 12px 40px rgba(0,0,0,.15)",padding:20,maxHeight:"85vh",overflowY:"auto",maxWidth:440,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontFamily:"var(--sr)",fontSize:18,fontWeight:700,color:"var(--g)"}}>Your locations</h3>
          <button onClick={()=>setShowLocations(false)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--mt)"}}>✕</button>
        </div>
        <p style={{fontSize:12,color:"var(--mt)",marginBottom:16}}>Camps, clubs, and activities are shown near all your active locations.</p>
        {familyLocs.map(fl=><div key={fl.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:"1px solid var(--bd)"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:"var(--tx)"}}>{fl.label}</div>
            {fl.address&&<div style={{fontSize:12,color:"var(--mt)"}}>{fl.address}</div>}
            <div style={{fontSize:11,color:"var(--mt)"}}>Within {fl.radius_km}km</div>
          </div>
          <button onClick={async()=>{try{await db("family_locations","DELETE",{filters:["id=eq."+fl.id]});setFamilyLocs(prev=>prev.filter(f=>f.id!==fl.id))}catch(e){showToast("Failed to remove location.","err")}}} style={{padding:"4px 10px",borderRadius:8,border:"1px solid #e5e5e5",background:"none",fontSize:11,color:"var(--mt)",cursor:"pointer",fontFamily:"var(--sn)"}}>Remove</button>
        </div>)}
        {userLoc&&!familyLocs.find(fl=>Math.abs(Number(fl.latitude)-userLoc.lat)<0.01&&Math.abs(Number(fl.longitude)-userLoc.lng)<0.01)&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:"1px solid var(--bd)"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:"var(--tx)"}}>📍 Current location</div>
            <div style={{fontSize:11,color:"var(--mt)"}}>Detected via GPS</div>
          </div>
          <button onClick={()=>setShowSaveLocModal(true)} style={{padding:"4px 10px",borderRadius:8,border:"1.5px solid var(--g)",background:"none",fontSize:11,color:"var(--g)",cursor:"pointer",fontWeight:600,fontFamily:"var(--sn)"}}>+ Save</button>
        </div>}
        <div style={{marginTop:16}}>
          <button onClick={()=>setShowAddLocModal(true)} style={{width:"100%",padding:12,borderRadius:12,border:"2px dashed var(--bd)",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--gl)",fontFamily:"var(--sn)"}}>+ Add a location</button>
        </div>
        <p style={{fontSize:11,color:"var(--mt)",marginTop:12,textAlign:"center"}}>Add home, work, grandparents — see camps and clubs near all of them</p>
      </div>}

      {/* Notification Panel */}
      {showNotifs&&<div onClick={()=>setShowNotifs(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(10,15,20,.3)",zIndex:60}}/>}
      {showNotifs&&<div style={{position:"fixed",top:52,right:12,left:12,zIndex:61,background:"#fff",borderRadius:16,border:"1px solid var(--bd)",boxShadow:"0 8px 30px rgba(0,0,0,.12)",padding:8,maxHeight:"60vh",overflowY:"auto",maxWidth:400,marginLeft:"auto"}}>
        <div style={{padding:"8px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color:"var(--g)"}}>Updates</span>
          {notifications.filter(n=>!n.read_at).length>0&&<button onClick={async(e)=>{e.stopPropagation();try{await Promise.all(notifications.filter(x=>!x.read_at).map(n=>db("inbound_messages","PATCH",{body:{read_at:new Date().toISOString()},filters:["id=eq."+n.id]})));load()}catch(err){showToast("Failed to mark as read.","err")}}} style={{fontSize:11,fontWeight:600,color:"var(--acc)",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--sn)",padding:"2px 6px"}}>Mark all read</button>}
        </div>
        {notifications.length===0?<div style={{padding:"16px 10px",textAlign:"center",color:"var(--mt)",fontSize:13}}>No updates yet. Forward a club email to see them here.</div>
        :notifications.slice(0,8).map(n=><div key={n.id} style={{padding:"10px",borderRadius:10,marginBottom:2,background:n.read_at?"#fff":"var(--gxl)",cursor:"pointer"}} onClick={async(e)=>{e.stopPropagation();if(!n.read_at)await db("inbound_messages","PATCH",{body:{read_at:new Date().toISOString()},filters:["id=eq."+n.id]});const actions={fee_due:"money",cancellation:"week",schedule_update:"week",reminder:"week",term_dates:"explore",general:"week"};const actTab=actions[n.parsed_action]||"week";if(actTab==="explore"){setTab("explore");setExploreTab("clubs");}else{setTab(actTab);}setShowNotifs(false);window.scrollTo(0,0);load()}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
            <span style={{fontSize:12}}>{n.parsed_action==="fee_due"?"💳":n.parsed_action==="cancellation"?"🚫":n.parsed_action==="schedule_update"?"📅":n.parsed_action==="reminder"?"⏰":"📬"}{!n.read_at&&<span style={{width:6,height:6,borderRadius:3,background:"var(--acc)",flexShrink:0}}/>}</span>
            <span style={{fontSize:12,fontWeight:700,color:"var(--g)"}}>{n.parsed_data?.summary||n.subject||"Club update"}</span>
          </div>
          <div style={{fontSize:10,color:"var(--mt)"}}>{new Date(n.created_at).toLocaleDateString("en-IE",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
        </div>)}
      </div>}

      {/* Profile Menu */}
      {showProfile&&<div onClick={()=>setShowProfile(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(10,15,20,.3)",zIndex:60}}/>}
      {showProfile&&<div style={{position:"fixed",top:56,right:12,zIndex:61,background:"#fff",borderRadius:16,border:"1px solid var(--bd)",boxShadow:"0 8px 30px rgba(0,0,0,.12)",padding:8,minWidth:200}}>
        <div style={{padding:"12px 14px",borderBottom:"1px solid var(--bd)"}}>
          <div style={{fontSize:14,fontWeight:700,color:"var(--g)"}}>{profile?.first_name||"Me"}</div>
          <div style={{fontSize:12,color:"var(--mt)"}}>{user?.email}</div>
        </div>
        <button onClick={()=>{setShowProfile(false);setShowSupport(true)}} style={{width:"100%",padding:"10px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--tx)",fontFamily:"var(--sn)",textAlign:"left",borderRadius:8,display:"flex",alignItems:"center",gap:8}}>💬 Contact Support</button>
        <button onClick={()=>setShowChangePw(true)} style={{width:"100%",padding:"10px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--tx)",fontFamily:"var(--sn)",textAlign:"left",borderRadius:8,display:"flex",alignItems:"center",gap:8}}>🔑 Change Password</button>
        {profile?.subscription_status==="active"&&<button onClick={()=>{setShowProfile(false);openPortal()}} style={{width:"100%",padding:"10px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--tx)",fontFamily:"var(--sn)",textAlign:"left",borderRadius:8,display:"flex",alignItems:"center",gap:8}}>💳 Manage Subscription</button>}
        {profile?.is_beta?<div style={{padding:"10px 14px",fontSize:12,fontWeight:700,color:"#16a34a",display:"flex",alignItems:"center",gap:8}}>🎁 Beta member — free forever</div>
        :profile?.subscription_status!=="active"&&<button onClick={()=>{setShowProfile(false);startCheckout("standard")}} style={{width:"100%",padding:"10px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--acc)",fontFamily:"var(--sn)",textAlign:"left",borderRadius:8,display:"flex",alignItems:"center",gap:8}}>⭐ Subscribe — €7.99/mo</button>}
        <button onClick={()=>{setShowProfile(false);setShowFamily(true)}} style={{width:"100%",padding:"10px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--tx)",fontFamily:"var(--sn)",textAlign:"left",borderRadius:8,display:"flex",alignItems:"center",gap:8}}>👨‍👩‍👧‍👦 Family Members</button>
        <a href="/privacy" style={{width:"100%",padding:"10px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--tx)",fontFamily:"var(--sn)",textAlign:"left",borderRadius:8,display:"flex",alignItems:"center",gap:8,textDecoration:"none"}}>🔒 Privacy & Data</a>
        <div style={{borderTop:"1px solid var(--bd)",marginTop:4,paddingTop:4}}>
          <button onClick={()=>setShowDeleteAcct(true)} style={{width:"100%",padding:"10px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"#dc2626",fontFamily:"var(--sn)",textAlign:"left",borderRadius:8,display:"flex",alignItems:"center",gap:8}}>🗑️ Delete Account</button>
          <button onClick={()=>{setShowProfile(false);onLogout()}} style={{width:"100%",padding:"10px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"#dc2626",fontFamily:"var(--sn)",textAlign:"left",borderRadius:8,display:"flex",alignItems:"center",gap:8}}>🚪 Log out</button>
        </div>
      </div>}

      {/* FAB + Bottom Sheet */}
      {showFab&&<div onClick={()=>setShowFab(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(10,15,20,.35)",zIndex:70,transition:"opacity .2s"}}/>}
      {showFab&&<div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:71,background:"#fff",borderRadius:"20px 20px 0 0",padding:"20px 20px calc(20px + env(safe-area-inset-bottom, 0px))",maxHeight:"75vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,.15)",animation:"slideUp .25s ease"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <h3 style={{fontFamily:"var(--sr)",fontSize:17,fontWeight:800,color:"var(--g)"}}>Add to schedule</h3>
          <button onClick={()=>setShowFab(false)} style={{background:"none",border:"none",fontSize:22,color:"var(--mt)",cursor:"pointer",padding:"4px"}}>×</button>
        </div>
        {/* Type cards */}
        {isAdmin&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          <div onClick={()=>{setShowFab(false);setShowAddEv(true)}} style={{padding:"14px 8px",borderRadius:14,border:"2px solid var(--bd)",background:"#fff",cursor:"pointer",textAlign:"center",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--g)";e.currentTarget.style.background="var(--gxl)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.background="#fff"}}>
            <span style={{fontSize:22,display:"block",marginBottom:4}}>📅</span>
            <span style={{fontSize:11,fontWeight:700,color:"var(--g)",display:"block"}}>Event</span>
            <span style={{fontSize:9,fontWeight:500,color:"var(--mt)",display:"block",marginTop:2}}>Session or match</span>
          </div>
          <div onClick={()=>{setShowFab(false);onRefresh("clubs")}} style={{padding:"14px 8px",borderRadius:14,border:"2px solid var(--bd)",background:"#fff",cursor:"pointer",textAlign:"center",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--g)";e.currentTarget.style.background="var(--gxl)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.background="#fff"}}>
            <span style={{fontSize:22,display:"block",marginBottom:4}}>🏠</span>
            <span style={{fontSize:11,fontWeight:700,color:"var(--g)",display:"block"}}>Club</span>
            <span style={{fontSize:9,fontWeight:500,color:"var(--mt)",display:"block",marginTop:2}}>Regular activity</span>
          </div>
          <div onClick={()=>{setShowFab(false);setShowAddEv(true)}} style={{padding:"14px 8px",borderRadius:14,border:"2px solid var(--bd)",background:"#fff",cursor:"pointer",textAlign:"center",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--g)";e.currentTarget.style.background="var(--gxl)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.background="#fff"}}>
            <span style={{fontSize:22,display:"block",marginBottom:4}}>🤝</span>
            <span style={{fontSize:11,fontWeight:700,color:"var(--g)",display:"block"}}>Playdate</span>
            <span style={{fontSize:9,fontWeight:500,color:"var(--mt)",display:"block",marginTop:2}}>One-off meetup</span>
          </div>
          <div onClick={()=>{setShowFab(false);setShowAddActivity(true)}} style={{padding:"14px 8px",borderRadius:14,border:"2px solid var(--bd)",background:"#fff",cursor:"pointer",textAlign:"center",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--g)";e.currentTarget.style.background="var(--gxl)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.background="#fff"}}>
            <span style={{fontSize:22,display:"block",marginBottom:4}}>🎉</span>
            <span style={{fontSize:11,fontWeight:700,color:"var(--g)",display:"block"}}>Fun stuff</span>
            <span style={{fontSize:9,fontWeight:500,color:"var(--mt)",display:"block",marginTop:2}}>From Discover</span>
          </div>
        </div>}
        {/* Secondary options */}
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          {[
            ...(isAdmin?[
              {icon:"📋",label:"Paste schedule",desc:"From email or WhatsApp",fn:()=>{setShowFab(false);setShowPaste(true)}},
              {icon:"👤",label:"Add family member",desc:"Kid or adult",fn:()=>{setShowFab(false);setShowAddKid(true)}},
              {icon:"💳",label:"Add fee reminder",desc:"Track a payment",fn:()=>{setShowFab(false);setShowAddPay(true)}},
            ]:[]),
            {icon:"📤",label:"Share my week",desc:"Send to partner or group",fn:()=>{setShowFab(false);shareWeek()}},
          ].map(a=><button key={a.label} onClick={a.fn} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,border:"none",background:"none",cursor:"pointer",fontFamily:"var(--sn)",textAlign:"left",width:"100%"}} onTouchStart={e=>e.currentTarget.style.background="var(--gxl)"} onTouchEnd={e=>e.currentTarget.style.background="none"}>
            <span style={{fontSize:16,flexShrink:0}}>{a.icon}</span>
            <div><div style={{fontSize:13,fontWeight:600,color:"var(--g)"}}>{a.label}</div><div style={{fontSize:10,color:"var(--mt)"}}>{a.desc}</div></div>
          </button>)}
        </div>
      </div>}
      <button onClick={()=>setShowFab(!showFab)} style={{position:"fixed",bottom:"calc(20px + env(safe-area-inset-bottom, 0px))",right:20,width:52,height:52,borderRadius:"50%",background:showFab?"var(--mt)":"var(--g)",color:"#fff",border:"none",fontSize:24,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(26,42,58,.25)",zIndex:72,transition:"transform .15s,background .15s",transform:showFab?"rotate(45deg)":"none"}}>+</button>

      {/* Modals */}
      {showAddEv&&<AddEventModal clubs={clubs} userId={user.id} kids={kids} profile={profile} onClose={()=>setShowAddEv(false)} onSaved={()=>{setShowAddEv(false);load()}}/>}
      {showAddPay&&<AddPaymentModal clubs={clubs} userId={user.id} kids={kids} profile={profile} onClose={()=>setShowAddPay(false)} onSaved={()=>{setShowAddPay(false);load()}}/>}

      {showSupport&&<SupportModal userId={user.id} userEmail={user.email} onClose={()=>setShowSupport(false)}/>}
      {showAddActivity&&<AddActivityModal userId={user.id} userLoc={userLoc} profile={profile} kids={kids} onClose={()=>setShowAddActivity(false)} onSaved={()=>{track("add_activity");setShowAddActivity(false);load()}}/>}
      <EventDetailModal event={tapEvent} open={!!tapEvent} onClose={()=>setTapEvent(null)}
        adults={[...new Set([profile?.first_name||"Me",...familyMembers.filter(m=>m.id!==user.id&&!kids.find(k=>k.first_name===m.first_name)).map(m=>m.first_name)].filter(Boolean))]}
        familyAll={[...new Set([profile?.first_name||"Me",...kids.map(k=>k.first_name),...familyMembers.filter(m=>m.id!==user.id).map(m=>m.first_name)].filter(Boolean))]}
        onDriverChange={async(ev,driver)=>{
          if(ev.source_type==="recurring"){
            await db("recurring_events","PATCH",{filters:["id=eq."+ev.source_id],body:{driver}});
            showToast(driver+" is driving");setTapEvent({...ev,driver});load();
          }
        }}
        onAttendeesChange={async(ev,attendees)=>{
          if(ev.source_type==="manual"&&ev.source_id){
            await db("manual_events","PATCH",{filters:["id=eq."+ev.source_id],body:{description:attendees.length>0?"Going: "+attendees.join(", "):""}});
          }
        }}
        onDelete={async(ev)=>{
          if(ev.source_type==="manual"){
            await db("manual_events","DELETE",{filters:["id=eq."+ev.source_id]});
            showToast("Removed from schedule");setTapEvent(null);load();
          }else if(ev.source_type==="recurring"){
            const dateStr=ev.date.toISOString().split("T")[0];
            const rec=recs.find(r=>r.id===ev.source_id);
            const excluded=[...(rec?.excluded_dates||[]),dateStr];
            await db("recurring_events","PATCH",{filters:["id=eq."+ev.source_id],body:{excluded_dates:excluded}});
            showToast("Skipped for this week");setTapEvent(null);load();
          }
        }}/>

      {/* Change Password Modal */}
      <OcvInput open={showChangePw} onClose={()=>setShowChangePw(false)} title="Change password" placeholder="New password (min 8 characters)" inputType="password" onSubmit={async(np)=>{
        if(np.length<8){showToast("Password must be at least 8 characters.","err");return}
        try{const r=await fetch(SB+"/auth/v1/user",{method:"PUT",headers:hd(),body:JSON.stringify({password:np})});if(r.ok)showToast("Password changed!");else showToast("Error changing password.","err")}catch(e){showToast("Something went wrong.","err")}
      }}/>

      {/* Delete Account Confirm */}
      <OcvConfirm open={showDeleteAcct} onClose={()=>setShowDeleteAcct(false)} title="Delete account?" message={"We'll email you confirmation and delete all your data within 30 days. You can also email hello@oneclubview.com."} confirmText="Delete my account" confirmColor="#dc2626" onConfirm={async()=>{
        const _t=getToken();
        const safeEmail=(user.email||"").replace(/[<>&"']/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;","'":"&#39;"}[c]));
        const safeId=(user.id||"").replace(/[<>&"']/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;","'":"&#39;"}[c]));
        try{
          await fetch(SB+"/functions/v1/send-invite",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+_t},body:JSON.stringify({type:"notification",to:"hello@oneclubview.com",subject:"Account deletion request: "+user.email,html:"<p>User "+safeEmail+" (id: "+safeId+") has requested account deletion.</p>"})});
          await fetch(SB+"/functions/v1/send-invite",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+_t},body:JSON.stringify({type:"notification",to:user.email,subject:"Account deletion request received",html:"<p>We've received your request to delete your OneClubView account. All your data will be removed within 30 days.</p>"})});
          showToast("Deletion request submitted. Check your email.");onLogout()
        }catch(e){showToast("Error. Please email hello@oneclubview.com","err")}
      }}/>

      {/* Save GPS Location Modal */}
      <OcvInput open={showSaveLocModal} onClose={()=>setShowSaveLocModal(false)} title="Name this location" placeholder="e.g. Home, Work, Grandparents" defaultValue="Home" onSubmit={async(label)=>{
        await db("family_locations","POST",{body:{user_id:user.id,label:"🏠 "+label,latitude:userLoc.lat,longitude:userLoc.lng,radius_km:15,auto_source:"gps",active:true}});
        setShowSaveLocModal(false);showToast("Location saved!");load();
      }}/>

      {/* Add Location Modal */}
      {showAddLocModal&&<OcvModal open={showAddLocModal} onClose={()=>setShowAddLocModal(false)} title="Add a location">
        <form onSubmit={async e=>{
          e.preventDefault();
          const label=e.target.locName.value.trim();
          const addr=e.target.locAddr.value.trim();
          if(!label||!addr)return;
          try{
            const r=await fetch("https://nominatim.openstreetmap.org/search?q="+encodeURIComponent(addr+", Ireland")+"&format=json&limit=1",{headers:{"User-Agent":"OneClubView/1.0"}});
            const d=await r.json();
            if(d&&d[0]){
              await db("family_locations","POST",{body:{user_id:user.id,label:label,latitude:Number(d[0].lat),longitude:Number(d[0].lon),address:d[0].display_name?.split(",").slice(0,3).join(","),radius_km:15,auto_source:"manual",active:true}});
              setShowAddLocModal(false);showToast("Location added!");load();
            }else{showToast("Could not find that location.","err")}
          }catch(e){showToast("Location search failed.","err")}
        }} style={{display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <label style={{fontSize:13,fontWeight:600,color:"var(--g)",marginBottom:4,display:"block"}}>Name</label>
            <input name="locName" placeholder="e.g. Work, Grandparents, Holiday home" autoFocus/>
          </div>
          <div>
            <label style={{fontSize:13,fontWeight:600,color:"var(--g)",marginBottom:4,display:"block"}}>Town or address</label>
            <input name="locAddr" placeholder="e.g. Stillorgan, Co. Dublin"/>
          </div>
          <button type="submit" className="btn bp">Add location</button>
        </form>
      </OcvModal>}

      {/* Family Members Modal */}
      {showFamily&&<div className="mbg fi" onClick={()=>setShowFamily(false)}>
        <div className="mbox" onClick={e=>e.stopPropagation()} style={{maxHeight:"80vh"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{fontFamily:"var(--sr)",fontSize:18,fontWeight:800,color:"var(--g)"}}>Family Members</h3>
            <button onClick={()=>setShowFamily(false)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--mt)"}}>×</button>
          </div>
          <div style={{marginBottom:16}}>
            <span className="lbl" style={{marginBottom:8}}>Kids</span>
            {kids.length===0&&<p style={{fontSize:13,color:"var(--mt)",padding:8}}>No kids added yet</p>}
            {kids.map(k=>{
              const age=getAge(k.date_of_birth);
              return <div key={k.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid var(--bd)"}}>
                <div style={{width:36,height:36,borderRadius:10,background:COLS[kids.indexOf(k)%COLS.length],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:700}}>{k.first_name?.[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--tx)"}}>{k.first_name}{age!=null&&<span style={{color:"var(--mt)",fontWeight:400,marginLeft:4}}>({age})</span>}</div>
                  {k.school_name&&<div style={{fontSize:11,color:"var(--mt)"}}>{k.school_name}{k.school_class?" · "+k.school_class:""}</div>}
                </div>
                {isAdmin&&<button onClick={()=>{setShowFamily(false);setShowAddKid(k)}} style={{padding:"6px 12px",borderRadius:8,border:"1px solid var(--bd)",background:"#fff",fontSize:12,fontWeight:600,color:"var(--tx)",cursor:"pointer",fontFamily:"var(--sn)"}}>Edit</button>}
              </div>;
            })}
            {isAdmin&&<button onClick={()=>{setShowFamily(false);setShowAddKid(true)}} style={{width:"100%",marginTop:8,padding:10,borderRadius:10,border:"2px dashed var(--bd)",background:"none",fontSize:13,fontWeight:600,color:"var(--mt)",cursor:"pointer",fontFamily:"var(--sn)"}}>+ Add kid</button>}
          </div>
          <div>
            <span className="lbl" style={{marginBottom:8}}>Adults</span>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid var(--bd)"}}>
              <div style={{width:36,height:36,borderRadius:10,background:"var(--g)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:700}}>{(profile?.first_name||"U")[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:"var(--tx)"}}>{profile?.first_name||"You"}</div>
                <div style={{fontSize:11,color:"var(--mt)"}}>{profile?.email} · Account owner</div>
              </div>
            </div>
            {familyMembers.filter(fm=>fm.id!==user.id).map(fm=>{const rl=fm.family_role||"admin";const roleBadge={admin:"👨‍👩‍👧 Parent",carer:"🧑‍🍳 Carer",viewer:"👁️ Viewer"};return <div key={fm.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid var(--bd)"}}>
              <div style={{width:36,height:36,borderRadius:10,background:rl==="admin"?"#8b5cf6":rl==="carer"?"#2d7cb5":"#888",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:700}}>{(fm.first_name||fm.email||"?")[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:"var(--tx)"}}>{fm.first_name||fm.email}</div>
                <div style={{fontSize:11,color:"var(--mt)"}}>{fm.email} · {roleBadge[rl]||"Admin"}</div>
              </div>
            </div>})}
            {isAdmin&&<button onClick={()=>{setShowFamily(false);setShowAddKid({_initType:"adult"})}} style={{width:"100%",marginTop:8,padding:10,borderRadius:10,border:"2px dashed var(--bd)",background:"none",fontSize:13,fontWeight:600,color:"var(--mt)",cursor:"pointer",fontFamily:"var(--sn)"}}>+ Add family member</button>}
          </div>
        </div>
      </div>}
      {showPaste&&<PasteScheduleModal userId={user.id} clubs={clubs} kids={kids} profile={profile} onClose={()=>setShowPaste(false)} onSaved={()=>{setShowPaste(false);load()}}/>}
      {showAddKid&&<AddKidModal userId={user.id} editKid={typeof showAddKid==="object"?showAddKid:null} profile={profile} onClose={()=>setShowAddKid(false)} onSaved={()=>{track("add_kid");setShowAddKid(false);load()}}/>}
      {editClub&&<EditClubModal club={editClub} kids={kids} profile={profile} userId={user.id} onClose={()=>setEditClub(null)} onSaved={()=>{setEditClub(null);load()}} onDelete={()=>{setEditClub(null);load()}}/>}
      {editHol&&<EditHolidayModal holiday={editHol} userId={user.id} onClose={()=>setEditHol(null)} onSaved={()=>{setEditHol(null);load()}}/>}
      {showAddHol&&<AddHolidayModal userId={user.id} onClose={()=>setShowAddHol(false)} onSaved={()=>{setShowAddHol(false);load()}}/>}
    </div>
  );
}
