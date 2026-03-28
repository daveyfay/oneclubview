import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db, rpc, SB } from '../lib/supabase';
import { showToast, getAge, weekDates } from '../lib/utils';
import { COLS } from '../lib/constants';

export const HubDataContext = createContext(null);

export function HubDataProvider({ user, profile, children }) {
  const[kids,setKids]=useState([]);const[clubs,setClubs]=useState([]);const[recs,setRecs]=useState([]);
  const[mans,setMans]=useState([]);const[pays,setPays]=useState([]);const[camps,setCamps]=useState([]);const[campBookings,setCampBookings]=useState([]);const[holidays,setHolidays]=useState([]);const[userHolidays,setUserHolidays]=useState([]);
  const[schoolLocs,setSchoolLocs]=useState([]);
  const[familyLocs,setFamilyLocs]=useState([]);
  const[localEvents,setLocalEvents]=useState([]);const[actCats,setActCats]=useState([]);const[loading,setLoading]=useState(true);const[userLoc,setUserLoc]=useState(null);const[familyMembers,setFamilyMembers]=useState([]);const[notifications,setNotifications]=useState([]);

  const load = useCallback(async function load(){
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
  }, [user.id, profile?.family_id]);

  // Geolocation + initial load
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

  // Computed values
  const members=useMemo(()=>{
    const m=[{id:"all",name:"Everyone",emoji:"👨‍👩‍👧‍👦",type:"all"}];
    kids.forEach(k=>m.push({id:k.id,name:k.first_name,emoji:"👧",type:"kid",age:getAge(k.date_of_birth),dob:k.date_of_birth}));
    m.push({id:"self",name:profile?.first_name||"Me",emoji:"👤",type:"self"});
    familyMembers.filter(fm=>fm.id!==user.id).forEach(fm=>m.push({id:fm.id,name:fm.first_name||fm.email,emoji:"👤",type:"adult"}));
    return m;
  },[kids,profile,familyMembers]);

  const wd=useMemo(()=>weekDates(),[]);
  const clubMap=useMemo(()=>{const m=new Map();(clubs||[]).forEach(c=>m.set(c.club_id,c));return m},[clubs]);
  const clubTermMap=useMemo(()=>{const m=new Map();(clubs||[]).forEach(c=>{if(c.term_start&&c.term_end)m.set(c.club_id,{start:new Date(c.term_start+"T00:00:00"),end:new Date(c.term_end+"T23:59:59")})});return m},[clubs]);
  const kidMap=useMemo(()=>{const m=new Map();(kids||[]).forEach(k=>m.set(k.id,k));return m},[kids]);

  const isAdmin=(profile?.family_role||"admin")==="admin";

  // Helper: get member colour (kid index-based from COLS, or fallback)
  function getMemberCol(memberId,fallback){
    const kidIdx=kids.findIndex(k=>k.id===memberId);
    if(kidIdx>=0)return COLS[kidIdx%COLS.length];
    if(memberId==="self")return "var(--g)";
    return fallback||"#999";
  }

  const value = useMemo(() => ({
    // Raw data
    kids, clubs, recs, mans, pays, camps, campBookings,
    holidays, userHolidays, schoolLocs, familyLocs,
    familyMembers, notifications, localEvents, actCats,
    loading, userLoc, isAdmin,
    // Computed
    members, wd, clubMap, clubTermMap, kidMap,
    // Actions
    load, getMemberCol,
    // Setters needed by modals
    setFamilyLocs, setCampBookings,
    // User info
    user, profile,
  }), [
    kids, clubs, recs, mans, pays, camps, campBookings,
    holidays, userHolidays, schoolLocs, familyLocs,
    familyMembers, notifications, localEvents, actCats,
    loading, userLoc, isAdmin,
    members, wd, clubMap, clubTermMap, kidMap,
    load, user, profile,
  ]);

  return (
    <HubDataContext.Provider value={value}>
      {children}
    </HubDataContext.Provider>
  );
}
