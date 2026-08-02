import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db, rpc, SB } from '../lib/supabase';
import { showToast, getAge, weekDates } from '../lib/utils';
import { COLS } from '../lib/constants';
import { cacheGet, cacheSet } from '../lib/cache';

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
    const cachedCamps = cacheGet('camps');
    const cachedActCats = cacheGet('actCats');
    const[k,c,r,m,p,ca,hols,userHols,cBooks,lEvts,aCats]=await Promise.all([
      db("dependants","GET",{filters:[pidFilter],order:"created_at.asc"}),
      db("hub_subscriptions","GET",{select:"id,club_id,dependant_id,colour,nickname,clubs(id,name,address,location,phone,rating,term_start,term_end)",filters:[uidFilter]}),
      db("recurring_events","GET",{filters:[uidFilter]}),
      db("manual_events","GET",{filters:[uidFilter]}),
      db("payment_reminders","GET",{filters:[uidFilter],order:"due_date.asc"}),
      cachedCamps || db("camps","GET",{select:"id,title,camp_type,start_date,end_date,daily_start_time,daily_end_time,age_min,age_max,cost_eur,cost_notes,location_name,latitude,longitude,booking_url,source",filters:["status=eq.active"],order:"start_date.asc"}),
      db("school_holidays","GET",{order:"start_date.asc"}),
      db("user_school_holidays","GET",{filters:[uidFilter],order:"start_date.asc"}),
      db("camp_bookings","GET",{filters:[uidFilter]}),
      db("local_events","GET",{select:"*,category",order:"event_date.asc"}),
      cachedActCats || db("activity_categories","GET",{order:"name.asc"})
    ]);
    if (!cachedCamps && ca) cacheSet('camps', ca, 300000); // 5 min
    if (!cachedActCats && aCats) cacheSet('actCats', aCats, 300000); // 5 min
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
        // NOTE: Do NOT save GPS to profile — it's unreliable (VPN, bad fix, WiFi triangulation).
        // Family locations (Home, Work) are the source of truth for distance calculations.
        // Live GPS is only used for the "Current" location pill in the Explore tab.
        // Check if this area has been scraped recently — if not, fire ONE scrape
        rpc("needs_scrape",{lat:loc.lat,lng:loc.lng}).then(needed=>{
          if(needed){
            fetch(SB+"/functions/v1/scrape-local",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({latitude:loc.lat,longitude:loc.lng,user_id:user.id})}).then(r=>r.json()).then(d=>{if(d.status==="success")load()}).catch(e=>console.error("Scrape failed:",e));
          }
        }).catch(e=>console.error("needs_scrape check failed:",e));
      },()=>{
        // Geolocation denied — use Home family location as fallback (more reliable than profile GPS)
        db("family_locations","GET",{filters:["user_id=eq."+user.id,"active=eq.true"],order:"label.asc",limit:1}).then(locs=>{
          if(locs&&locs[0]&&locs[0].latitude){
            const loc={lat:Number(locs[0].latitude),lng:Number(locs[0].longitude)};
            setUserLoc(loc);
          }
        }).catch(e=>console.error("Family location fallback failed:",e));
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

  const today=new Date().toISOString().split("T")[0];
  const wd=useMemo(()=>weekDates(),[today]);
  const clubMap=useMemo(()=>{const m=new Map();(clubs||[]).forEach(c=>m.set(c.club_id,c));return m},[clubs]);
  const clubTermMap=useMemo(()=>{const m=new Map();(clubs||[]).forEach(c=>{if(c.term_start&&c.term_end)m.set(c.club_id,{start:new Date(c.term_start+"T00:00:00"),end:new Date(c.term_end+"T23:59:59")})});return m},[clubs]);
  const kidMap=useMemo(()=>{const m=new Map();(kids||[]).forEach(k=>m.set(k.id,k));return m},[kids]);

  const isAdmin=profile?.family_role==="admin";

  // Helper: get member colour (kid index-based from COLS, or fallback)
  const getMemberCol=useCallback((memberId,fallback)=>{
    const kidIdx=kids.findIndex(k=>k.id===memberId);
    if(kidIdx>=0)return COLS[kidIdx%COLS.length];
    if(memberId==="self")return "var(--color-primary)";
    return fallback||"#999";
  },[kids]);

  // Computed weekly events — single source of truth used by Overview, Schedule, Money tabs
  const weekEvts = useMemo(() => {
    const evts = [];
    (recs || []).forEach(re => {
      if (!re.active) return;
      wd.forEach(d => {
        if (d.getDay() === re.day_of_week) {
          const term = clubTermMap.get(re.club_id);
          if (term && (d < term.start || d > term.end)) return;
          const dStr = d.toISOString().split("T")[0];
          const isSkipped = (re.excluded_dates || []).includes(dStr);
          const cl = clubMap.get(re.club_id);
          const kid = re.dependant_id ? kidMap.get(re.dependant_id) : null;
          evts.push({ id: re.id + d.toISOString(), source_id: re.id, source_type: "recurring", title: re.title, date: d, time: re.start_time?.slice(0, 5) || "",
            endTime: re.start_time && re.duration_minutes ? ((() => { const t = parseInt(re.start_time.slice(0, 2)) * 60 + parseInt(re.start_time.slice(3, 5)) + re.duration_minutes; return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0") })()) : "",
            club: cl?.nickname || cl?.club_name || "", colour: cl?.colour || "#999", member: kid?.first_name || (profile?.first_name || "You"), memberId: re.dependant_id || "self", driver: re.driver || null, skipped: isSkipped, location: re.location || cl?.club_addr || null });
        }
      });
    });
    (mans || []).forEach(me => {
      const d = new Date(me.event_date);
      const end = new Date(wd[6]); end.setDate(end.getDate() + 1);
      if (d >= wd[0] && d < end) {
        const cl = clubMap.get(me.club_id);
        const kid = me.dependant_id ? kidMap.get(me.dependant_id) : null;
        const mTime = d.toTimeString().slice(0, 5);
        const mEnd = me.duration_minutes && mTime ? ((() => { const t = parseInt(mTime.slice(0, 2)) * 60 + parseInt(mTime.slice(3, 5)) + (me.duration_minutes || 60); return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0") })()) : "";
        const mAtt = me.description && me.description.startsWith("Going: ") ? me.description.replace("Going: ", "").split(", ").filter(Boolean) : [];
        evts.push({ id: me.id, source_id: me.id, source_type: "manual", title: me.title, date: d, time: mTime, endTime: mEnd, club: cl?.nickname || cl?.club_name || "", colour: me.colour || cl?.colour || "#999", member: kid?.first_name || (profile?.first_name || "You"), memberId: me.dependant_id || "self", attendees: mAtt, location: me.location || null });
      }
    });
    (pays || []).filter(p => !p.paid && p.status !== "not_renewing" && p.due_date).forEach(p => {
      const d = new Date(p.due_date + "T00:00:00");
      const end = new Date(wd[6]); end.setDate(end.getDate() + 1);
      if (d >= wd[0] && d < end) {
        const cl = clubMap.get(p.club_id);
        const kid = p.dependant_id ? kidMap.get(p.dependant_id) : null;
        evts.push({ id: "pay-" + p.id, source_id: p.id, source_type: "payment", title: "\u{1F4B3} " + p.description + " \u2014 \u20AC" + parseFloat(p.amount).toFixed(2), date: d, time: "", endTime: "", club: cl?.nickname || cl?.club_name || "Payment due", colour: "#c4960c", member: kid?.first_name || (profile?.first_name || "You"), memberId: p.dependant_id || "self", isPayment: true, payAmount: parseFloat(p.amount), payDescription: p.description, payDueDate: p.due_date, payClub: cl?.nickname || cl?.club_name || "" });
      }
    });
    return evts.sort((a, b) => a.date - b.date || (a.time || "").localeCompare(b.time || ""));
  }, [recs, mans, pays, wd, clubMap, clubTermMap, kidMap, profile]);

  // Centralized alerts — consumed by OverviewTab via AlertCallout
  const alerts = useMemo(() => {
    const al = [];
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Fee alerts (admin only)
    if (isAdmin) {
      (pays || []).filter(p => !p.paid && p.status !== "not_renewing" && p.due_date).forEach(p => {
        const due = new Date(p.due_date);
        const days = Math.ceil((due - now) / 86400000);
        if (days < 0) al.push({ id: "fee-overdue-" + p.id, type: "fee", severity: "urgent", text: p.description + " is \u20AC" + parseFloat(p.amount).toFixed(0) + " overdue (" + Math.abs(days) + " days)", action: { label: "View fees", tab: "money" }, tab: "money", dismissible: true, adminOnly: true });
        else if (days <= 3) al.push({ id: "fee-soon-" + p.id, type: "fee", severity: "warn", text: p.description + " \u2014 \u20AC" + parseFloat(p.amount).toFixed(0) + " due in " + days + " day" + (days !== 1 ? "s" : ""), action: { label: "View fees", tab: "money" }, tab: "money", dismissible: true, adminOnly: true });
        else if (days <= 7) al.push({ id: "fee-week-" + p.id, type: "fee", severity: "info", text: p.description + " \u2014 \u20AC" + parseFloat(p.amount).toFixed(0) + " due in " + days + " days", action: { label: "View fees", tab: "money" }, tab: "money", dismissible: true, adminOnly: true });
      });
    }

    // Clash today (urgent): two events overlap in time for different members
    const activeWeekEvts = weekEvts.filter(e => !e.skipped);
    const todayEvts = activeWeekEvts.filter(e => {
      const d = e.date;
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate() && e.time;
    });
    for (let i = 0; i < todayEvts.length; i++) {
      for (let j = i + 1; j < todayEvts.length; j++) {
        const a = todayEvts[i], b = todayEvts[j];
        if (a.memberId === b.memberId) continue;
        if ((a.time < (b.endTime || "23:59")) && (b.time < (a.endTime || "23:59"))) {
          al.push({ id: "clash-" + a.id + "-" + b.id, type: "clash", severity: "urgent", text: "Clash today: " + a.member + " (" + a.title + " " + a.time + ") overlaps " + b.member + " (" + b.title + " " + b.time + ")", action: { label: "View schedule", tab: "week" }, tab: "week", dismissible: false, adminOnly: false });
        }
      }
    }

    // No driver (info): today's recurring event has no driver
    todayEvts.filter(e => !e.driver && e.source_type === "recurring").forEach(e => {
      al.push({ id: "nodriver-" + e.id, type: "no_driver", severity: "info", text: "No driver set for " + e.member + "'s " + e.title + " at " + e.time, action: { label: "View schedule", tab: "week" }, tab: "week", dismissible: true, adminOnly: false });
    });

    // No end time (info): events this week missing endTime
    const noEnd = weekEvts.filter(e => e.time && !e.endTime);
    if (noEnd.length > 0) {
      al.push({ id: "noend-" + todayStr, type: "no_end_time", severity: "info", text: noEnd.length + " event" + (noEnd.length > 1 ? "s" : "") + " this week with no end time \u2014 makes pickup planning harder", action: { label: "View schedule", tab: "week" }, tab: "week", dismissible: true, adminOnly: false });
    }

    // Holiday uncovered (warn): school holiday within 21 days, kid has no camp booked but suitable camps exist
    if (camps && camps.length > 0 && kids.length > 0) {
      const nextHol = (holidays || []).find(h => {
        const holEnd = new Date(h.end_date + "T23:59:59");
        const holStart = new Date(h.start_date + "T00:00:00");
        return holEnd >= now && (holStart - now) / 86400000 <= 21;
      });
      if (nextHol) {
        const holStart = new Date(nextHol.start_date + "T00:00:00"), holEnd = new Date(nextHol.end_date + "T23:59:59");
        kids.forEach(kid => {
          const age = getAge(kid.date_of_birth);
          const suitableCamps = (camps || []).filter(ca => {
            if (ca.age_min && age < ca.age_min) return false;
            if (ca.age_max && age > ca.age_max) return false;
            const cs = new Date(ca.start_date + "T00:00:00");
            if (cs < holStart || cs > holEnd) return false;
            return true;
          });
          const booked = (campBookings || []).filter(b => {
            if (b.dependant_id !== kid.id) return false;
            const camp = (camps || []).find(c => c.id === b.camp_id);
            if (!camp) return false;
            const cs = new Date(camp.start_date + "T00:00:00");
            return cs >= holStart && cs <= holEnd;
          });
          if (suitableCamps.length > 0 && booked.length === 0) {
            al.push({ id: "holcover-" + kid.id + "-" + nextHol.id, type: "holiday_uncovered", severity: "warn", text: kid.first_name + " has no camp booked for " + nextHol.name + ". " + suitableCamps.length + " camp" + (suitableCamps.length > 1 ? "s" : "") + " suit" + (suitableCamps.length === 1 ? "s" : "") + " their age.", action: { label: "View camps", tab: "explore", subaction: "camps" }, tab: "explore", dismissible: true, adminOnly: false });
          }
        });
      }
    }

    // Weekend gap (info): Saturday or Sunday with no events
    wd.forEach(d => {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) {
        const dayEvts = activeWeekEvts.filter(e => e.date.getFullYear() === d.getFullYear() && e.date.getMonth() === d.getMonth() && e.date.getDate() === d.getDate());
        if (dayEvts.length === 0) {
          const dayName = dow === 6 ? "Saturday" : "Sunday";
          al.push({ id: "wkndgap-" + d.toISOString().split("T")[0], type: "weekend_gap", severity: "info", text: dayName + " has no events \u2014 free day or something to plan?", action: { label: "View schedule", tab: "week" }, tab: "week", dismissible: true, adminOnly: false });
        }
      }
    });

    // Camp recommendation (admin only, info)
    if (isAdmin && campBookings) {
      (campBookings || []).filter(b => b.status === "recommended").forEach(b => {
        const camp = (camps || []).find(c => c.id === b.camp_id);
        if (camp) al.push({ id: "camprec-" + b.id, type: "camp_recommendation", severity: "info", text: "A carer recommended " + camp.title + " \u2014 tap to review", action: { label: "View camps", tab: "explore", subaction: "camps" }, tab: "explore", dismissible: true, adminOnly: true });
      });
    }

    // Sort by severity: urgent first, then warn, then info
    const sevOrder = { urgent: 0, warn: 1, info: 2 };
    al.sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));
    return al;
  }, [isAdmin, pays, weekEvts, kids, camps, campBookings, holidays, wd, kidMap]);

  const value = useMemo(() => ({
    // Raw data
    kids, clubs, recs, mans, pays, camps, campBookings,
    holidays, userHolidays, schoolLocs, familyLocs,
    familyMembers, notifications, localEvents, actCats,
    loading, userLoc, isAdmin,
    // Computed
    members, wd, clubMap, clubTermMap, kidMap, weekEvts, alerts,
    // Actions
    load, getMemberCol,
    // Setters needed by modals/tabs
    setFamilyLocs, setCampBookings, setUserLoc,
    // User info
    user, profile,
  }), [
    kids, clubs, recs, mans, pays, camps, campBookings,
    holidays, userHolidays, schoolLocs, familyLocs,
    familyMembers, notifications, localEvents, actCats,
    loading, userLoc, isAdmin,
    members, wd, clubMap, clubTermMap, kidMap, weekEvts, alerts,
    load, getMemberCol, user, profile,
  ]);

  return (
    <HubDataContext.Provider value={value}>
      {children}
    </HubDataContext.Provider>
  );
}
