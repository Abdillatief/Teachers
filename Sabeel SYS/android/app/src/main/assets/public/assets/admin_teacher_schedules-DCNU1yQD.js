import{a as O,d as H}from"./rbacService-D2RrsA9d.js";import{getDoc as V,doc as _,query as P,collection as z,where as W,onSnapshot as k}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{p as U}from"./authService-CtWWGArP.js";import{r as J,a as K}from"./navbar-Bz3pjZSE.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-BK9d5021.js";U("admin");const w=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"],Q={الأحد:"Sunday",الاثنين:"Monday",الثلاثاء:"Tuesday",الأربعاء:"Wednesday",الخميس:"Thursday",الجمعة:"Friday",السبت:"Saturday"};let E=[],D=[],A=[],T="ALL",q="ALL",M=8;const X=new URLSearchParams(window.location.search),R=X.get("teacherId");R&&(T=R);O.onAuthStateChanged(async a=>{var n;if(a)try{const s=await V(_(H,"users",a.uid)),t=s.exists()?s.data().name:"الإدارة المركزية";J("teacher-schedules","admin"),K("جداول المعلمين والشواغر",{name:t,roleName:"مدير النظام"});const o=localStorage.getItem("academy_name")||"سبيل",g=localStorage.getItem("academy_desc")||"أكاديمية تعليم القرآن الكريم والقراءات",d=document.getElementById("printAcademyName"),v=document.getElementById("printAcademyDesc");d&&(d.textContent=o),v&&(v.textContent=g);const S=document.getElementById("printDateGenerated");S&&(S.textContent=`تاريخ التقرير: ${new Date().toLocaleDateString("ar-EG",{dateStyle:"long"})}`),(n=document.getElementById("btnPrintSchedule"))==null||n.addEventListener("click",()=>{window.print()}),Y(),ee()}catch(s){console.error("Error setting up teacher-schedules page:",s)}});function Y(){const a=document.getElementById("teacherSelect"),n=document.getElementById("dayFilterSelect"),s=document.getElementById("workWindowSelect");a==null||a.addEventListener("change",t=>{T=t.target.value,L()}),n==null||n.addEventListener("change",t=>{q=t.target.value,N()}),s==null||s.addEventListener("change",t=>{M=parseFloat(t.target.value)||8,L()})}function C(a){return a?String(a).trim().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه"):""}function j(a){if(!a)return 0;const n=String(a).trim();let s=n.includes("م")||n.includes("مساء")||n.toLowerCase().includes("pm"),t=n.includes("ص")||n.includes("صباح")||n.toLowerCase().includes("am");const g=n.replace(/[^0-9:]/g,"").split(":");if(g.length<2)return 0;let d=parseInt(g[0],10)||0,v=parseInt(g[1],10)||0;return s&&d<12&&(d+=12),t&&d===12&&(d=0),d*60+v}function Z(a){let n=Math.floor(a/60),s=a%60,t="ص";n>=12&&(t="م",n>12&&(n-=12)),n===0&&(n=12);const o=s<10?`0${s}`:s;return`${n}:${o} ${t}`}function ee(){const a=P(z(H,"users"),W("role","==","teacher"));k(a,t=>{E=[],t.forEach(o=>{E.push({id:o.id,...o.data()})}),te(),L()},t=>console.warn("Error teachers snapshot:",t));const n=z(H,"students");k(n,t=>{D=[],t.forEach(o=>{D.push({id:o.id,...o.data()})}),L()},t=>console.warn("Error students snapshot:",t));const s=z(H,"groups");k(s,t=>{A=[],t.forEach(o=>{A.push({id:o.id,...o.data()})}),L()},t=>console.warn("Error groups snapshot:",t))}function te(){const a=document.getElementById("teacherSelect");if(!a)return;const n=T;a.innerHTML='<option value="ALL">جميع المعلمين (نظرة مقارنة شاملة والشواغر)</option>',E.sort((s,t)=>(s.name||"").localeCompare(t.name||"")),E.forEach(s=>{const t=document.createElement("option");t.value=s.id,t.textContent=`${s.name||"معلم بدون اسم"} (${s.subject||"القرآن والتجويد"})`,a.appendChild(t)}),n&&(n==="ALL"||E.some(s=>s.id===n))&&(a.value=n)}function L(){const a=document.getElementById("teacherGridView"),n=document.getElementById("allTeachersComparisonView"),s=document.getElementById("printTargetTitle");if(T==="ALL")a&&(a.style.display="none"),n&&(n.style.display="block"),s&&(s.textContent="مقارنة جداول وشواغر جميع المعلمين"),se();else{a&&(a.style.display="block"),n&&(n.style.display="none");const t=E.find(o=>o.id===T);s&&(s.textContent=`جدول المعلم: ${t?t.name:"غير محدد"}`),ne(T)}N(),window.lucide&&window.lucide.createIcons()}function ne(a){E.find(e=>e.id===a);const n=D.filter(e=>e.teacherId===a&&e.status!=="archived"&&e.status!=="Suspended"&&e.status!=="pending_approval"&&e.subscriptionType!=="group"&&!e.groupId),s=A.filter(e=>e.teacherId===a&&e.status!=="archived"),t={};w.forEach(e=>{t[e]=[]}),s.forEach(e=>{const u=e.day?[e.day]:e.days||[],p=e.time||"05:00 م",m=parseInt(e.duration,10)||60,i=j(p);u.forEach(l=>{w.forEach(f=>{C(l)===C(f)&&t[f].push({id:`grp_${e.id}`,name:e.name||"مجموعة جماعية",time:p,startMinutes:i,endMinutes:i+m,duration:m,type:"حصة جماعية",isGroup:!0,studentsCount:e.studentCount||(e.studentIds?e.studentIds.length:0)})})})}),n.forEach(e=>{const u=e.schedule&&e.schedule.days?e.schedule.days:e.sessionDays||[],p=e.schedule&&e.schedule.uniformTime?e.schedule.uniformTime:e.sessionTime||e.time||"05:00 م",m=parseInt(e.sessionDuration,10)||30;u.forEach(i=>{w.forEach(l=>{if(C(i)===C(l)){let f=p;e.schedule&&e.schedule.differentTimes&&e.schedule.times&&e.schedule.times[l]&&(f=e.schedule.times[l]);const x=j(f);t[l].push({id:e.id,name:e.name||"طالب",time:f,startMinutes:x,endMinutes:x+m,duration:m,type:e.type||"حصة فردية",isGroup:!1,phone:e.phone||""})}})})});let o=0,g=0,d=0;w.forEach(e=>{const u=Q[e],p=document.getElementById(`list-${u}`),m=document.getElementById(`count-${u}`),i=t[e];i.sort((y,h)=>y.startMinutes-h.startMinutes),g+=i.length;let l=0;i.forEach(y=>{l+=y.duration}),o+=l;const f=M*60,x=Math.max(0,f-l);if(d+=x,m&&(m.textContent=`${i.length} حصة (${(l/60).toFixed(1)} س)`),!!p)if(i.length===0)p.innerHTML=`
            <div style="color: var(--text-muted); text-align: center; padding: 1.5rem 0.5rem; font-size: 0.8rem; border: 1px dashed var(--border-color); border-radius: var(--border-radius-sm);">
              <i data-lucide="coffee" style="width: 20px; height: 20px; margin-bottom: 0.35rem; color: var(--text-muted);"></i>
              <div>يوم شاغر بالكامل</div>
              <span class="badge badge-success" style="margin-top: 0.35rem; font-size: 0.72rem;">${M} ساعات متاحة</span>
            </div>
          `;else{let y="";for(let h=0;h<i.length;h++){const r=i[h];if(h===0&&r.startMinutes>840){const b=r.startMinutes-840;b>=30&&(y+=`
                  <div class="free-slot-item">
                    <span><i data-lucide="clock" style="width: 13px; height: 13px; vertical-align: middle;"></i> شاغر مبكر: 02:00 م - ${r.time}</span>
                    <span class="badge badge-success" style="padding: 0.1rem 0.35rem; font-size: 0.7rem;">+${(b/60).toFixed(1)} س</span>
                  </div>
                `)}if(y+=`
              <div class="class-item" style="${r.isGroup?"border-right: 3px solid #d97706; background-color: rgba(217, 119, 6, 0.03);":""}">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 0.4rem;">
                  <span style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem;">${r.name}</span>
                  <span class="badge ${r.isGroup?"badge-warning":"badge-primary"}" style="font-size: 0.68rem; padding: 0.1rem 0.4rem;">
                    ${r.type}
                  </span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem;">
                  <div style="display: flex; align-items: center; gap: 0.3rem; color: var(--text-secondary); font-size: 0.78rem;">
                    <i data-lucide="clock" style="width: 12px; height: 12px; color: ${r.isGroup?"#d97706":"var(--primary-color)"};"></i>
                    <span style="font-weight: 600;">${r.time}</span>
                  </div>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">${r.duration} دقيقة</span>
                </div>
              </div>
            `,h<i.length-1){const b=i[h+1],B=b.startMinutes-r.endMinutes;if(B>=20){const F=Z(r.endMinutes),I=b.time;y+=`
                  <div class="free-slot-item">
                    <span><i data-lucide="check-circle-2" style="width: 13px; height: 13px; vertical-align: middle;"></i> وقت فارغ: ${F} - ${I}</span>
                    <span class="badge badge-success" style="padding: 0.1rem 0.35rem; font-size: 0.7rem;">+${(B/60).toFixed(1)} س</span>
                  </div>
                `}}}y+=`
            <div style="margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted);">
              <span>مشغول: <strong>${(l/60).toFixed(1)} س</strong></span>
              <span>شاغر: <strong style="color: var(--success);">${(x/60).toFixed(1)} س</strong></span>
            </div>
          `,p.innerHTML=y}});const v=7*M*60,S=(o/60).toFixed(1),G=(d/60).toFixed(1),c=Math.min(100,Math.round(o/v*100));document.getElementById("metricScheduledHours").textContent=`${S} ساعة`,document.getElementById("metricSessionsCount").textContent=`${g} حصة مجدولة أسبوعياً`,document.getElementById("metricFreeHours").textContent=`${G} ساعة`,document.getElementById("metricFreeSlotsCount").textContent=`متاح للتسكين بناءً على نافذة ${M} س/يوم`,document.getElementById("metricOccupancyRate").textContent=`${c}%`;const $=document.getElementById("metricOccupancyBar");$&&($.style.width=`${c}%`,$.style.backgroundColor=c>80?"var(--danger)":c>50?"var(--primary-color)":"var(--success)"),document.getElementById("metricStudentsCount").textContent=`${n.length} طالب`,document.getElementById("metricGroupsCount").textContent=`${s.length} مجموعات جماعية`}function se(){const a=document.getElementById("allTeachersTableBody");if(!a)return;if(E.length===0){a.innerHTML='<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">لا يوجد معلمون مسجلون حالياً</td></tr>';return}let n=0,s=0,t=0;const o=E.map(c=>{const $=D.filter(r=>r.teacherId===c.id&&r.status!=="archived"&&r.status!=="Suspended"&&r.status!=="pending_approval"&&r.subscriptionType!=="group"&&!r.groupId),e=A.filter(r=>r.teacherId===c.id&&r.status!=="archived"),u={الأحد:0,الاثنين:0,الثلاثاء:0,الأربعاء:0,الخميس:0,الجمعة:0,السبت:0};let p=0,m=0;$.forEach(r=>{const b=r.schedule&&r.schedule.days?r.schedule.days:r.sessionDays||[],B=parseInt(r.sessionDuration,10)||30;b.forEach(F=>{w.forEach(I=>{C(F)===C(I)&&(u[I]++,p+=B,m++)})})}),e.forEach(r=>{const b=r.day?[r.day]:r.days||[],B=parseInt(r.duration,10)||60;b.forEach(F=>{w.forEach(I=>{C(F)===C(I)&&(u[I]++,p+=B,m++)})})});const i=p/60,l=7*M,f=Math.max(0,l-i),x=Math.min(100,Math.round(i/l*100));n+=i,s+=m,t+=f;let y="الأحد",h=-1;return w.forEach(r=>{u[r]>h&&(h=u[r],y=r)}),`
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <div class="navbar-avatar" style="width: 32px; height: 32px; font-size: 0.8rem;">
                  ${(c.name||"م").charAt(0)}
                </div>
                <div>
                  <div style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem;">${c.name||"معلم"}</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">${c.subject||"القرآن الكريم والتجويد"}</div>
                </div>
              </div>
            </td>
            <td><strong>${$.length}</strong> طالب</td>
            <td><strong>${e.length}</strong> مجموعات</td>
            <td><span class="badge badge-primary">${m} حصة</span></td>
            <td><strong>${i.toFixed(1)}</strong> ساعة/أسبوع</td>
            <td><span class="badge badge-success">${f.toFixed(1)} ساعة شاغرة</span></td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div class="occupancy-bar-bg" style="width: 70px;">
                  <div class="occupancy-bar-fill" style="width: ${x}%; background-color: ${x>75?"var(--danger)":x>40?"var(--primary-color)":"var(--success)"};"></div>
                </div>
                <span style="font-size: 0.78rem; font-weight: 700;">${x}%</span>
              </div>
            </td>
            <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${y} (${h} حصص)</span></td>
            <td>
              <button class="btn btn-secondary btn-sm btn-view-teacher-schedule" data-teacher-id="${c.id}" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">
                <i data-lucide="calendar" style="width: 13px; height: 13px;"></i> عرض الجدول
              </button>
            </td>
          </tr>
        `}).join("");a.innerHTML=o,a.querySelectorAll(".btn-view-teacher-schedule").forEach(c=>{c.addEventListener("click",$=>{const e=$.currentTarget.getAttribute("data-teacher-id");if(e){T=e;const u=document.getElementById("teacherSelect");u&&(u.value=e),L()}})});const g=E.length*7*M,d=g>0?Math.min(100,Math.round(n/g*100)):0;document.getElementById("metricScheduledHours").textContent=`${n.toFixed(1)} ساعة`,document.getElementById("metricSessionsCount").textContent=`${s} حصة مجدولة لجميع المعلمين`,document.getElementById("metricFreeHours").textContent=`${t.toFixed(1)} ساعة`,document.getElementById("metricFreeSlotsCount").textContent="طاقة استيعابية شاغرة لجميع الكادر",document.getElementById("metricOccupancyRate").textContent=`${d}%`;const v=document.getElementById("metricOccupancyBar");v&&(v.style.width=`${d}%`,v.style.backgroundColor=d>80?"var(--danger)":d>50?"var(--primary-color)":"var(--success)");const S=D.filter(c=>c.status!=="archived"&&c.status!=="Suspended").length,G=A.filter(c=>c.status!=="archived").length;document.getElementById("metricStudentsCount").textContent=`${S} طالب`,document.getElementById("metricGroupsCount").textContent=`${G} مجموعات جماعية`}function N(){const a=q;document.querySelectorAll(".day-column").forEach(s=>{a==="ALL"||s.id.replace("col-","")===a?s.style.display="flex":s.style.display="none"})}
