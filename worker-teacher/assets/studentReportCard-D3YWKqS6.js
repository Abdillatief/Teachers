import{T as A,d as O}from"./rbacService-D2RrsA9d.js";import{query as P,collection as F,where as W,getDocs as q}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";import{q as Y}from"./quranData-BxaWbcIK.js";function D(){const I=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],t=[],o=new Date;for(let a=0;a<12;a++){const b=new Date(o.getFullYear(),o.getMonth()-a,1),c=b.getMonth(),n=b.getFullYear(),i=String(c+1).padStart(2,"0"),p=`${n}-${i}`,g=`${I[c]} ${n}`;t.push({key:p,label:g,year:n,month:c})}return t}async function Q(I,t){var M,V,L,N;let o=document.getElementById("studentReportModalOverlay");o||(o=document.createElement("div"),o.id="studentReportModalOverlay",o.className="modal-overlay",o.style.cssText=`
      display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(0,0,0,0.6); z-index: var(--z-modal); align-items: center; justify-content: center; padding: 1rem;
      backdrop-filter: blur(4px);
    `,document.body.appendChild(o));const a=D(),b=a[0];o.innerHTML=`
    <div class="modal-card" style="max-width: 740px; width: 100%; border-radius: var(--border-radius-lg); padding: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-xl); max-height: 92vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.85rem;">
        <h3 style="font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1.15rem;">
          <i data-lucide="award" style="width:20px;height:20px; color:var(--primary-color);"></i>
          بطاقة التقرير الشهري المعتمدة للدارس
        </h3>
        <span id="btnCloseReportModal" style="cursor: pointer; padding: 0.35rem; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); border-radius: var(--border-radius-sm);">
          <i data-lucide="x" style="color: var(--text-muted); width:18px;height:18px;"></i>
        </span>
      </div>

      <!-- Controls Block -->
      <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
          <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="sliders" style="width:15px;height:15px; color:var(--primary-color);"></i> إعدادات التقرير وتخصيص الشهر
          </h4>
          <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-card); padding: 0.3rem 0.6rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); white-space: nowrap;">شهر التقرير:</label>
            <select id="reportMonthSelect" class="form-control" style="font-size: 0.82rem; font-weight: 600; padding: 0.2rem 0.4rem; background: transparent; color: var(--primary-color); border: none; cursor: pointer;">
              ${a.map(r=>`<option value="${r.key}">${r.label}</option>`).join("")}
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem;">
          <div class="form-group" style="margin: 0;">
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.25rem; display:block;">مستوى الترتيل والتلاوة</label>
            <select id="editTilawaScore" class="form-control" style="font-size:0.82rem; padding: 0.35rem;">
              <option value="ممتاز (95%)" selected>ممتاز (95%)</option>
              <option value="جيد جداً (85%)">جيد جداً (85%)</option>
              <option value="جيد (75%)">جيد (75%)</option>
              <option value="يحتاج مراجعة (60%)">يحتاج مراجعة (60%)</option>
            </select>
          </div>

          <div class="form-group" style="margin: 0;">
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.25rem; display:block;">مستوى الحفظ والمراجعة</label>
            <select id="editHifzScore" class="form-control" style="font-size:0.82rem; padding: 0.35rem;">
              <option value="ممتاز (100%)" selected>ممتاز (100%)</option>
              <option value="جيد جداً (85%)">جيد جداً (85%)</option>
              <option value="جيد (75%)">جيد (75%)</option>
              <option value="يحتاج تركيز (60%)">يحتاج تركيز (60%)</option>
            </select>
          </div>

          <div class="form-group" style="margin: 0;">
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.25rem; display:block;">مستوى الالتزام والحضور</label>
            <select id="editCommitmentScore" class="form-control" style="font-size:0.82rem; padding: 0.35rem;">
              <option value="التزام تام (100%)" selected>التزام تام (100%)</option>
              <option value="التزام جيد (85%)">التزام جيد (85%)</option>
              <option value="غياب متكرر (70%)">غياب متكرر (70%)</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-top: 0.75rem; margin-bottom: 0.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary);">إنجاز السور والآيات القرآنية (تلقائي من السجلات):</label>
            <span style="font-size:0.7rem; color:var(--primary-color); font-weight:600;">تحديث فوري</span>
          </div>
          <input type="text" id="editSurahsInput" class="form-control" style="font-size:0.85rem; font-weight:600;" placeholder="مثال: سورة الملك (الآيات حتى 30)" value="جاري التحميل من السجلات...">
        </div>

        <div class="form-group" style="margin-top: 0.5rem; margin-bottom: 0;">
          <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.25rem; display:block;">توصية وملاحظة المعلم المشرف:</label>
          <input type="text" id="editTeacherNote" class="form-control" style="font-size:0.82rem;" value="الدارس متميز ومواظب على الحفظ والتلاوة، نوصي باستمرار المراجعة المنزلية.">
        </div>
      </div>

      <div style="text-align: center; padding: 2rem; color: var(--text-muted);" id="reportCardLoading">
        <i data-lucide="loader" class="spin" style="width:28px;height:28px; margin-bottom: 0.75rem; color: var(--primary-color);"></i>
        <p style="margin:0; font-weight:600; font-size:0.9rem; color:var(--text-primary);">جاري تحميل سجلات الدارس لشهر <span id="loadingMonthName">${b.label}</span>...</p>
      </div>

      <div id="reportCardContent" style="display: none;">
        <!-- PRINTABLE / PREVIEW CARD FRAME -->
        <div id="studentReportCardPreview" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 1.5rem; color: var(--text-primary); font-family: inherit; position: relative; overflow: hidden; box-shadow: var(--shadow-sm);">
          <div style="position: absolute; top:0; right:0; left:0; height: 4px; background: var(--primary-color);"></div>

          <!-- Card Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.25rem;">
            <div>
              <h2 style="font-weight: 700; color: var(--text-primary); margin: 0; font-size: 1.15rem; line-height: 1.3;">أكاديمية سبيل لعلوم القرآن</h2>
              <span style="font-size: 0.78rem; color: var(--text-muted);">تقرير الأداء الشهري للدارس</span>
            </div>
            <div class="badge badge-primary" style="padding: 0.4rem 0.85rem; font-size: 0.82rem;">
              <span id="cardMonthLabel">${b.label}</span>
            </div>
          </div>

          <!-- Student & Teacher Meta -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.75rem; background: var(--bg-primary); padding: 0.85rem 1rem; border-radius: var(--border-radius-sm); margin-bottom: 1.25rem; font-size: 0.85rem; border: 1px solid var(--border-color);">
            <div>
              <span style="color: var(--text-muted); font-size: 0.75rem; display: block;">اسم الدارس:</span>
              <strong style="color: var(--text-primary); font-size: 1rem;" id="cardStudentName">${t.name||"الدارس"}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 0.75rem; display: block;">المعلم المشرف:</span>
              <strong style="color: var(--primary-color); font-size: 0.92rem;" id="cardTeacherName">${t.teacherName||"المعلم المشرف"}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 0.75rem; display: block;">الحصص المنجزة:</span>
              <strong style="color: var(--success); font-size: 0.92rem;" id="cardSessionsCount">0 حصة</strong>
            </div>
          </div>

          <!-- Surahs Memorized Box -->
          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 0.85rem 1rem; margin-bottom: 1.25rem;">
            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600; display: block; margin-bottom:0.25rem;">إنجاز السور والآيات القرآنية المسجلة:</span>
            <strong style="font-size: 0.95rem; color: var(--primary-color); line-height: 1.4;" id="cardSurahsDisplay">جاري التحميل...</strong>
          </div>

          <!-- Rating Criteria Grid -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem;">
            <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 0.75rem; text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; display: block;">مستوى الترتيل</span>
              <strong style="font-size: 0.85rem; color: var(--text-primary); margin-top: 0.25rem; display: block;" id="cardTilawaVal">ممتاز (95%)</strong>
            </div>

            <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 0.75rem; text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; display: block;">مستوى الحفظ</span>
              <strong style="font-size: 0.85rem; color: var(--text-primary); margin-top: 0.25rem; display: block;" id="cardHifzVal">ممتاز (100%)</strong>
            </div>

            <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: 0.75rem; text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; display: block;">مستوى الالتزام</span>
              <strong style="font-size: 0.85rem; color: var(--text-primary); margin-top: 0.25rem; display: block;" id="cardCommitmentVal">التزام تام (100%)</strong>
            </div>
          </div>

          <!-- Teacher Recommendation Box -->
          <div style="background: var(--bg-primary); border-right: 3px solid var(--primary-color); padding: 0.85rem 1rem; border-radius: var(--border-radius-sm); margin-bottom: 1rem; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); border-left: 1px solid var(--border-color);">
            <span style="font-size: 0.75rem; font-weight: 600; color: var(--primary-color); display: block; margin-bottom: 0.25rem;">ملاحظة وتوصية المعلم المشرف:</span>
            <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;" id="cardTeacherNoteDisplay">
              الدارس متميز ومواظب على الحفظ والتلاوة، نوصي باستمرار المراجعة المنزلية.
            </p>
          </div>

          <!-- Footer Seal -->
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted); border-top: 1px dashed var(--border-color); padding-top: 0.75rem;">
            <span>أكاديمية سبيل</span>
            <span style="font-weight: 600; color: var(--text-secondary);">معتمد رسمي</span>
          </div>
        </div>

        <!-- Sharing & Actions Toolbar -->
        <div style="display: flex; gap: 0.5rem; margin-top: 1.25rem; flex-wrap: wrap;">
          <button type="button" id="btnShareWhatsApp" class="btn btn-primary" style="flex: 1.2; justify-content: center;">
            <i data-lucide="share-2"></i> مشاركة عبر واتساب
          </button>
          
          <button type="button" id="btnPrintReportCard" class="btn btn-secondary" style="flex: 1; justify-content: center;">
            <i data-lucide="printer"></i> طباعة التقرير
          </button>

          <button type="button" id="btnCopyReportText" class="btn btn-secondary" style="flex: 1; justify-content: center;">
            <i data-lucide="copy"></i> نسخ الملخص
          </button>
        </div>
      </div>
    </div>
  `,o.style.display="flex",window.lucide&&window.lucide.createIcons(),(M=document.getElementById("btnCloseReportModal"))==null||M.addEventListener("click",()=>{o.style.display="none"});const c=document.getElementById("reportMonthSelect"),n=document.getElementById("editTilawaScore"),i=document.getElementById("editHifzScore"),p=document.getElementById("editCommitmentScore"),g=document.getElementById("editSurahsInput"),h=document.getElementById("editTeacherNote"),T=async r=>{document.getElementById("reportCardLoading").style.display="block",document.getElementById("reportCardContent").style.display="none";const d=a.find(s=>s.key===r)||a[0];document.getElementById("loadingMonthName").textContent=d.label,document.getElementById("cardMonthLabel").textContent=d.label;try{const s=P(F(O,"sessions"),W("studentId","==",I)),C=await q(s);let f=0,R=0,S=0;const l=new Map;if(C.forEach(m=>{const e=m.data();let B=e.date||"";if(e.createdAt&&e.createdAt.toDate){const y=e.createdAt.toDate(),E=y.getFullYear(),u=String(y.getMonth()+1).padStart(2,"0");B=`${E}-${u}`}else e.date&&(B=e.date.substring(0,7));if(B.startsWith(r)){e.status==="completed"&&f++,e.rating&&(R+=parseFloat(e.rating)||5,S++);const y=(e.surahName||e.surah||e.actualSurahName||"").replace(/^سورة\s+/,"").trim(),E=parseInt(e.actualVerse||e.lastMemorizedVerse||e.verse||e.endVerse)||0;if(y)if(!l.has(y))l.set(y,{maxVerse:E,notesVerseText:[]});else{const k=l.get(y);E>k.maxVerse&&(k.maxVerse=E)}const u=`${e.notes||""} ${e.homework||""} ${e.details||""}`.trim();u.length>0&&Y.forEach(k=>{const v=k.name;if(u.includes(`سورة ${v}`)||u.includes(`سوره ${v}`)||v.length>=4&&u.includes(v)){l.has(v)||l.set(v,{maxVerse:0,notesVerseText:[]});const $=u.match(/(?:الآيات|الآية|آية|من الآية|من آية|حفظ|إلى الآية)\s*(\d+[\s\-\u2013إلى\s]*\d+|\d+)/i);if($&&$[0]){const H=l.get(v).notesVerseText;H.includes($[0].trim())||H.push($[0].trim())}}})}}),l.size===0&&t.lastMemorizedSurahName){const m=t.lastMemorizedSurahName.replace(/^سورة\s+/,"").trim(),e=parseInt(t.lastMemorizedVerse)||0;l.set(m,{maxVerse:e,notesVerseText:[]})}const w=[];l.forEach((m,e)=>{m.maxVerse>0?w.push(`سورة ${e} (الآيات حتى ${m.maxVerse})`):m.notesVerseText.length>0?w.push(`سورة ${e} (${m.notesVerseText[0]})`):w.push(`سورة ${e}`)});let z="";w.length>0?z=w.join(" ، "):f>0?z=`تم إنجاز ${f} حصة حلقة قرآنية خلال الشهر`:z="لم تُسجل حصص قرآنية جديدة لهذا الشهر";const j=S>0?R/S:5;document.getElementById("cardSessionsCount").textContent=`${f} حصة`,g.value=z,document.getElementById("cardSurahsDisplay").textContent=z,j>=4.5?(n.value="ممتاز (95%)",i.value="ممتاز (100%)"):j>=3.5?(n.value="جيد جداً (85%)",i.value="جيد جداً (85%)"):(n.value="جيد (75%)",i.value="جيد (75%)"),document.getElementById("cardTilawaVal").textContent=n.value,document.getElementById("cardHifzVal").textContent=i.value,document.getElementById("cardCommitmentVal").textContent=p.value,document.getElementById("cardTeacherNoteDisplay").textContent=h.value,document.getElementById("reportCardLoading").style.display="none",document.getElementById("reportCardContent").style.display="block"}catch(s){console.error("Error generating report card for month:",s),A.error("حدث خطأ أثناء تحميل بيانات الشهر المحدد"),document.getElementById("reportCardLoading").style.display="none"}},x=()=>{document.getElementById("cardTilawaVal").textContent=n.value,document.getElementById("cardHifzVal").textContent=i.value,document.getElementById("cardCommitmentVal").textContent=p.value,document.getElementById("cardSurahsDisplay").textContent=g.value,document.getElementById("cardTeacherNoteDisplay").textContent=h.value};n.addEventListener("change",x),i.addEventListener("change",x),p.addEventListener("change",x),g.addEventListener("input",x),h.addEventListener("input",x),c.addEventListener("change",r=>{T(r.target.value)}),(V=document.getElementById("btnShareWhatsApp"))==null||V.addEventListener("click",()=>{const r=a.find(f=>f.key===c.value)||a[0],d=t.phone?t.phone.replace(/[^0-9]/g,""):"",s=`*بطاقة التقرير الشهري للدارس: ${t.name}*
*أكاديمية سبيل القرآنية* (${r.label})
-----------------------------------------
*الدارس:* ${t.name}
*المعلم المشرف:* ${t.teacherName||"معلم الأكاديمية"}
*الحصص المنجزة:* ${document.getElementById("cardSessionsCount").textContent}
*السور المنجزة:* ${g.value}

*مستويات التقييم الشهرية:*
*التلاوة والترتيل:* ${n.value}
*الحفظ والمراجعة:* ${i.value}
*الالتزام والحضور:* ${p.value}

*توصية المعلم:*
"${h.value}"
-----------------------------------------
نسأل الله أن يبارك في عمره وأن يجعله من أهل القرآن.`,C=encodeURIComponent(s);d?window.open(`https://wa.me/${d}?text=${C}`,"_blank"):window.open(`https://wa.me/?text=${C}`,"_blank")}),(L=document.getElementById("btnCopyReportText"))==null||L.addEventListener("click",()=>{const r=a.find(s=>s.key===c.value)||a[0],d=`بطاقة التقرير الشهري للدارس: ${t.name} (${r.label})
- المعلم: ${t.teacherName||"معلم الأكاديمية"}
- إنجاز السور: ${g.value}
- مستوى الترتيل: ${n.value}
- مستوى الحفظ: ${i.value}
- مستوى الالتزام: ${p.value}
- ملاحظة المعلم: ${h.value}`;navigator.clipboard.writeText(d).then(()=>{A.success("تم نسخ ملخص التقرير بنجاح!")})}),(N=document.getElementById("btnPrintReportCard"))==null||N.addEventListener("click",()=>{const r=document.getElementById("studentReportCardPreview").outerHTML,d=window.open("","_blank","width=800,height=600");d.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <title>تقرير شهري - ${t.name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 2rem; background: #fff; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${r}
        <script>
          window.onload = function() { window.print(); window.close(); }
        <\/script>
      </body>
      </html>
    `),d.document.close()}),await T(b.key)}export{Q as o};
