import React, { useState, useEffect } from 'react';
import { db, rpc } from '../lib/supabase';
import { showToast } from '../lib/utils';

export default function AdminDashboard({user,onBack}){
  const[stats,setStats]=useState(null);const[tickets,setTickets]=useState([]);const[loading,setLoading]=useState(true);
  const[users,setUsers]=useState([]);const[drilldown,setDrilldown]=useState(null);
  const[allSubs,setAllSubs]=useState([]);const[allKids,setAllKids]=useState([]);

  useEffect(()=>{
    async function loadAdmin(){
      // Verify admin role server-side (don't trust client profile)
      const profileCheck=await db("profiles","GET",{filters:["id=eq."+user.id],select:"family_role"});
      if(!profileCheck?.[0]||profileCheck[0].family_role!=="admin"){
        showToast("Access denied","err");
        onBack();
        return;
      }
      try{
        const s=await rpc("admin_dashboard_stats");
        setStats(s);
        // Relies on RLS policies — admin can read all support tickets
        const t=await db("support_tickets","GET",{order:"created_at.desc"});
        setTickets(t||[]);
        // Relies on RLS policies — admin can read all profiles
        const u=await db("profiles","GET",{order:"created_at.desc"});
        setUsers(u||[]);
        // Relies on RLS policies — admin can read all subscriptions
        const subs=await db("hub_subscriptions","GET",{select:"id,user_id,club_id,dependant_id,clubs(name)"});
        setAllSubs(subs||[]);
        // Relies on RLS policies — admin can read all dependants
        const kids=await db("dependants","GET",{});
        setAllKids(kids||[]);
      }catch(e){
        console.error("Admin dashboard load failed:",e);
        showToast("Failed to load dashboard data.","err");
      }
      setLoading(false);
    }
    loadAdmin();
  },[]);

  if(loading)return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}><p>Loading dashboard...</p></div>;

  // Drilldown views
  if(drilldown){
    let title="";let content=null;

    if(drilldown==="users"){
      title="All Users ("+users.length+")";
      content=users.map(u=>{
        const kidCount=allKids.filter(k=>k.parent_user_id===u.id).length;
        const clubCount=new Set(allSubs.filter(s=>s.user_id===u.id).map(s=>s.club_id)).size;
        return <div key={u.id} style={{background:"var(--color-card)",borderRadius:14,border:"1px solid var(--color-border)",padding:14,marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:700}}>{u.first_name||"—"} {u.last_name||""}</div>
              <div style={{fontSize:12,color:"var(--color-muted)"}}>{u.email}</div>
            </div>
            <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,
              background:u.subscription_status==="active"?"var(--color-sage)":u.subscription_status==="churned"?"#fef2f2":"var(--goldl)",
              color:u.subscription_status==="active"?"var(--color-primary-light)":u.subscription_status==="churned"?"var(--color-danger)":"#8a6d00"
            }}>{u.subscription_status||"trial"}</span>
          </div>
          <div style={{display:"flex",gap:12,marginTop:8,fontSize:12,color:"var(--color-muted)"}}>
            <span>Joined {new Date(u.created_at).toLocaleDateString("en-IE",{day:"numeric",month:"short",year:"numeric"})}</span>
            <span>{kidCount} kid{kidCount!==1?"s":""}</span>
            <span>{clubCount} club{clubCount!==1?"s":""}</span>
            {u.last_active_at&&<span>Active {new Date(u.last_active_at).toLocaleDateString("en-IE",{day:"numeric",month:"short"})}</span>}
          </div>
        </div>;
      });
    }

    if(drilldown==="families"){
      title="Families";
      const fams={};
      users.forEach(u=>{
        const fid=u.family_id||u.id;
        if(!fams[fid])fams[fid]={adults:[],kids:[],clubs:new Set()};
        fams[fid].adults.push(u);
      });
      allKids.forEach(k=>{
        const parent=users.find(u=>u.id===k.parent_user_id);
        const fid=parent?.family_id||k.parent_user_id;
        if(fams[fid])fams[fid].kids.push(k);
      });
      allSubs.forEach(s=>{
        const parent=users.find(u=>u.id===s.user_id);
        const fid=parent?.family_id||s.user_id;
        if(fams[fid])fams[fid].clubs.add(s.clubs?.name||s.club_id);
      });
      content=Object.entries(fams).map(([fid,fam])=>
        <div key={fid} style={{background:"var(--color-card)",borderRadius:14,border:"1px solid var(--color-border)",padding:14,marginBottom:8}}>
          <div style={{fontSize:14,fontWeight:700}}>{fam.adults.map(a=>a.first_name||"?").join(" & ")}</div>
          <div style={{fontSize:12,color:"var(--color-muted)",marginTop:4}}>
            {fam.kids.length>0?"Kids: "+fam.kids.map(k=>k.first_name).join(", "):"No kids added"}
          </div>
          <div style={{fontSize:12,color:"var(--color-muted)",marginTop:2}}>
            {fam.clubs.size>0?"Clubs: "+[...fam.clubs].join(", "):"No clubs"}
          </div>
          <div style={{fontSize:11,color:"var(--color-muted)",marginTop:4}}>
            Status: {fam.adults[0]?.subscription_status||"trial"} · Joined {new Date(fam.adults[0]?.created_at).toLocaleDateString("en-IE",{day:"numeric",month:"short"})}
          </div>
        </div>
      );
    }

    if(drilldown==="tickets"||drilldown?.startsWith("tickets_")){
      title="Support Tickets ("+tickets.length+")";
      const catEmoji={bug:"🐛",schedule:"📅",camps:"🏕️",clubs:"🏠",billing:"💳",account:"👤",feature:"💡",general:"💬"};
      const statusColor={open:{bg:"var(--color-danger-bg, #fef2f2)",c:"var(--color-danger)"},in_progress:{bg:"var(--goldl)",c:"#8a6d00"},resolved:{bg:"var(--color-sage)",c:"var(--color-primary-light)"},closed:{bg:"var(--color-primary-bg)",c:"var(--color-muted)"}};
      const activeFilter=drilldown.replace("tickets_","").replace("tickets","all");
      content=<div>
        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
          {["all","open","in_progress","resolved"].map(s=><button key={s} onClick={()=>setDrilldown(s==="all"?"tickets":"tickets_"+s)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid var(--color-border)",background:activeFilter===s?"var(--color-primary)":"var(--color-card)",color:activeFilter===s?"#fff":"var(--color-text)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)"}}>{s==="all"?"All":s==="in_progress"?"In Progress":s.charAt(0).toUpperCase()+s.slice(1)} ({s==="all"?tickets.length:tickets.filter(t=>t.status===s).length})</button>)}
        </div>
        {tickets.filter(t=>activeFilter==="all"||t.status===activeFilter).map(t=>{
          const sc=statusColor[t.status]||statusColor.open;
          return <div key={t.id} style={{background:"var(--color-card)",borderRadius:14,border:"1px solid var(--color-border)",padding:16,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:800,color:"var(--color-primary)",fontFamily:"var(--font-mono)"}}>OCV-{String(t.ticket_number||0).padStart(3,"0")}</span>
                  <span style={{fontSize:12}}>{catEmoji[t.category]||"💬"}</span>
                  <span style={{fontSize:11,color:"var(--color-muted)"}}>{t.category||"general"}</span>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--color-text)"}}>{t.subject}</div>
                <div style={{fontSize:12,color:"var(--color-muted)",marginTop:2}}>{t.user_email} · {new Date(t.created_at).toLocaleDateString("en-IE",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
              </div>
              <select value={t.status} onChange={async(e)=>{try{await db("support_tickets","PATCH",{body:{status:e.target.value,updated_at:new Date().toISOString()},filters:["id=eq."+t.id]});const updated=await db("support_tickets","GET",{order:"created_at.desc"});setTickets(updated||[])}catch(err){showToast("Failed to update ticket.","err")}}} style={{padding:"4px 8px",borderRadius:8,border:"1px solid var(--color-border)",fontSize:11,fontWeight:700,background:sc.bg,color:sc.c,fontFamily:"var(--font-sans)"}}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div style={{fontSize:13,color:"var(--color-text)",marginTop:10,lineHeight:1.5,background:"var(--color-warm)",padding:12,borderRadius:10}}>{t.message}</div>
            <div style={{marginTop:10}}>
              <div style={{display:"flex",gap:6,marginTop:6}}>
                <input id={"reply-"+t.id} placeholder="Type a reply..." style={{flex:1,padding:"8px 12px",borderRadius:10,border:"1px solid var(--color-border)",fontSize:12,fontFamily:"var(--font-sans)"}}/>
                <button onClick={async()=>{const input=document.getElementById("reply-"+t.id);const msg=input?.value?.trim();if(!msg)return;try{await db("support_replies","POST",{body:{ticket_id:t.id,user_id:user.id,is_staff:true,message:msg}});input.value="";await db("support_tickets","PATCH",{body:{status:"in_progress",updated_at:new Date().toISOString()},filters:["id=eq."+t.id]});const updated=await db("support_tickets","GET",{order:"created_at.desc"});setTickets(updated||[]);showToast("Reply sent!")}catch(err){showToast("Failed to send reply.","err")}}} style={{padding:"8px 16px",borderRadius:10,border:"none",background:"var(--color-primary)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)"}}>Reply</button>
              </div>
            </div>
          </div>;
        })}
        {tickets.length===0&&<div style={{textAlign:"center",padding:24,color:"var(--color-muted)"}}>No support tickets yet</div>}
      </div>;
    }

    if(drilldown==="revenue"){
      title="Revenue Breakdown";
      const active=users.filter(u=>u.subscription_status==="active");
      const trial=users.filter(u=>u.subscription_status==="trial"||!u.subscription_status);
      const churned=users.filter(u=>u.subscription_status==="churned");
      content=<div>
        <div style={{background:"var(--color-sage)",borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontSize:28,fontWeight:800,color:"var(--color-primary)",fontFamily:"var(--font-serif)"}}>€{(active.length*7.99).toFixed(2)}</div>
          <div style={{fontSize:13,color:"var(--color-primary-light)",fontWeight:600}}>Monthly Recurring Revenue</div>
          <div style={{fontSize:12,color:"var(--color-muted)",marginTop:4}}>{active.length} active subscriber{active.length!==1?"s":""} × €7.99</div>
        </div>
        <h4 style={{fontSize:14,fontWeight:700,color:"var(--color-primary)",margin:"16px 0 8px"}}>Active Subscribers ({active.length})</h4>
        {active.map(u=><div key={u.id} style={{background:"var(--color-card)",borderRadius:10,border:"1px solid var(--color-border)",padding:10,marginBottom:4,fontSize:13,display:"flex",justifyContent:"space-between"}}>
          <span>{u.first_name} ({u.email})</span><span style={{fontWeight:700,color:"var(--color-primary-light)"}}>€7.99/mo</span>
        </div>)}
        <h4 style={{fontSize:14,fontWeight:700,color:"#f0a500",margin:"16px 0 8px"}}>On Trial ({trial.length})</h4>
        {trial.map(u=><div key={u.id} style={{background:"var(--color-card)",borderRadius:10,border:"1px solid var(--color-border)",padding:10,marginBottom:4,fontSize:13}}>
          {u.first_name} ({u.email}) · Started {new Date(u.created_at).toLocaleDateString("en-IE",{day:"numeric",month:"short"})}
        </div>)}
        <h4 style={{fontSize:14,fontWeight:700,color:"var(--color-danger)",margin:"16px 0 8px"}}>Churned ({churned.length})</h4>
        {churned.length===0?<p style={{fontSize:13,color:"var(--color-muted)"}}>None yet</p>
        :churned.map(u=><div key={u.id} style={{background:"var(--color-danger-bg, #fef2f2)",borderRadius:10,border:"1px solid var(--color-danger-border, #fecaca)",padding:10,marginBottom:4,fontSize:13}}>
          {u.first_name} ({u.email}) · Churned {u.churned_at?new Date(u.churned_at).toLocaleDateString("en-IE",{day:"numeric",month:"short"}):"—"}
        </div>)}
      </div>;
    }

    if(drilldown==="clubs"){
      title="All Clubs Tracked";
      const clubMap={};
      allSubs.forEach(s=>{
        const name=s.clubs?.name||"Unknown";
        if(!clubMap[s.club_id])clubMap[s.club_id]={name,families:new Set()};
        clubMap[s.club_id].families.add(s.user_id);
      });
      const sorted=Object.values(clubMap).sort((a,b)=>b.families.size-a.families.size);
      content=sorted.map((cl,i)=><div key={i} style={{background:"var(--color-card)",borderRadius:10,border:"1px solid var(--color-border)",padding:12,marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:600}}>{cl.name}</span>
        <span style={{fontSize:12,fontWeight:700,color:"var(--color-primary-light)",background:"var(--color-sage)",padding:"3px 10px",borderRadius:8}}>{cl.families.size} {cl.families.size===1?"family":"families"}</span>
      </div>);
    }

    return <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      <div style={{background:"var(--color-primary)",padding:"20px 16px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setDrilldown(null)} style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}}>←</button>
        <h1 style={{fontFamily:"var(--font-serif)",fontSize:18,fontWeight:700,color:"#fff"}}>{title}</h1>
      </div>
      <div style={{maxWidth:600,margin:"0 auto",padding:16}}>{content}</div>
    </div>;
  }

  // Main dashboard
  const S=({label,value,color,sub,tap})=><div onClick={tap?()=>setDrilldown(tap):undefined} style={{background:"var(--color-card)",borderRadius:14,padding:16,border:"1px solid var(--color-border)",cursor:tap?"pointer":"default",position:"relative"}}>
    <div style={{fontSize:24,fontWeight:800,color:color||"var(--color-primary)",fontFamily:"var(--font-serif)"}}>{value}</div>
    <div style={{fontSize:12,fontWeight:600,color:"var(--color-muted)",marginTop:2}}>{label}</div>
    {sub&&<div style={{fontSize:11,color:"var(--color-muted)",marginTop:2}}>{sub}</div>}
    {tap&&<span style={{position:"absolute",top:8,right:12,fontSize:11,color:"var(--color-muted)"}}>→</span>}
  </div>;

  return <div style={{minHeight:"100vh",background:"var(--bg)"}}>
    <div style={{background:"var(--color-primary)",padding:"20px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <h1 style={{fontFamily:"var(--font-serif)",fontSize:20,fontWeight:700,color:"#fff"}}>Admin Dashboard</h1>
      <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",fontSize:12,fontWeight:700,padding:"8px 14px",borderRadius:8,cursor:"pointer",fontFamily:"var(--font-sans)"}}>Logout</button>
    </div>
    <div style={{maxWidth:600,margin:"0 auto",padding:16}}>

      <h2 style={{fontFamily:"var(--font-serif)",fontSize:18,fontWeight:700,color:"var(--color-primary)",marginBottom:12}}>Key Metrics</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
        <S label="Total Families" value={stats?.total_families||0} color="var(--color-primary)" tap="families"/>
        <S label="Total Users" value={stats?.total_users||0} tap="users"/>
        <S label="Active (7d)" value={stats?.active_users_7d||0} color="#2d7cb5" tap="users"/>
        <S label="Active (30d)" value={stats?.active_users_30d||0} tap="users"/>
      </div>

      <h2 style={{fontFamily:"var(--font-serif)",fontSize:18,fontWeight:700,color:"var(--color-primary)",marginBottom:12}}>Revenue</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:24}}>
        <S label="MRR" value={"€"+(stats?.mrr||0)} color="#2d7cb5" tap="revenue"/>
        <S label="Subscribers" value={stats?.active_subscribers||0} color="var(--color-primary-light)" tap="revenue"/>
        <S label="Trial" value={stats?.trial_users||0} color="#f0a500" tap="revenue"/>
      </div>

      <h2 style={{fontFamily:"var(--font-serif)",fontSize:18,fontWeight:700,color:"var(--color-primary)",marginBottom:12}}>Churn</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
        <S label="Churned" value={stats?.churned_users||0} color="var(--color-danger)" tap="revenue"/>
        <S label="Avg days to churn" value={stats?.avg_days_to_churn||"—"}/>
      </div>

      <h2 style={{fontFamily:"var(--font-serif)",fontSize:18,fontWeight:700,color:"var(--color-primary)",marginBottom:12}}>Growth</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
        <S label="Signups (7d)" value={stats?.signups_last_7d||0} color="var(--color-primary-light)" tap="users"/>
        <S label="Signups (30d)" value={stats?.signups_last_30d||0} tap="users"/>
      </div>

      <h2 style={{fontFamily:"var(--font-serif)",fontSize:18,fontWeight:700,color:"var(--color-primary)",marginBottom:12}}>Product</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:24}}>
        <S label="Avg family size" value={stats?.avg_family_size||"—"}/>
        <S label="Avg clubs/family" value={stats?.avg_clubs_per_family||"—"}/>
        <S label="Total kids" value={stats?.total_kids||0}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
        <S label="Clubs tracked" value={stats?.total_clubs_tracked||0} tap="clubs"/>
        <S label="Camps listed" value={stats?.total_camps_listed||0}/>
      </div>

      <h2 style={{fontFamily:"var(--font-serif)",fontSize:18,fontWeight:700,color:"var(--color-primary)",marginBottom:12}}>Support ({stats?.open_tickets||0} open)</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10,marginBottom:24}}>
        <S label="Open tickets" value={stats?.open_tickets||0} color={stats?.open_tickets>0?"var(--color-danger)":"var(--color-primary-light)"} tap="tickets"/>
      </div>

    </div>
  </div>;
}
