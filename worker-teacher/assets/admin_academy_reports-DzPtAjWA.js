import{a,d}from"./rbacService-D2RrsA9d.js";import{p as i}from"./authService-CtWWGArP.js";import{r as s,a as m}from"./navbar-BWutcREu.js";import{onSnapshot as c,collection as p}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";import"./activityLogger-BK9d5021.js";i("admin");a.onAuthStateChanged(e=>{e&&(s("academy-reports","admin"),m("التقارير الأكاديمية",{name:"الإدارة العامة",roleName:"مدير الأكاديمية"}),l())});function l(){const e=document.getElementById("reportsTableBody");e&&c(p(d,"sessions"),r=>{if(r.empty){e.innerHTML='<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا توجد حصص مسجلة في سجلات الأكاديمية حالياً.</td></tr>';return}const o=[];r.forEach(t=>{o.push(t.data())}),o.sort((t,n)=>n.date.localeCompare(t.date)),e.innerHTML=o.map(t=>`
          <tr>
            <td><strong>${t.date}</strong></td>
            <td>${t.teacherName}</td>
            <td><strong>${t.studentName}</strong></td>
            <td>${t.duration} دقيقة</td>
            <td>
              <span style="padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; 
                background-color: ${t.status==="completed"?"var(--success-light); color: var(--success);":"var(--warning-light); color: var(--warning);"}">
                ${t.status==="completed"?"تمت بنجاح":t.status==="student_absent"?"غياب الطالب":"مؤجلة / ملغاة"}
              </span>
            </td>
          </tr>
        `).join(""),window.lucide&&window.lucide.createIcons()},r=>console.warn("Academy reports listener warning:",r))}document.getElementById("printReportBtn").addEventListener("click",()=>{window.print()});
