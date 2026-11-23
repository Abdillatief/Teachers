import{d as A}from"./rbacService-D2RrsA9d.js";import{getDoc as S,doc as R,serverTimestamp as B,setDoc as j}from"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";const M=`data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 90" width="280" height="90">
  <g fill="none" stroke="#0f2b5c" stroke-linecap="round" stroke-linejoin="round">
    <!-- الحرف الكبير M بتصميم توقيعي انسيابي بارز مع انطلاقة كاليغرافية -->
    <path d="M 28 66 C 30 46, 40 22, 48 12 C 52 7, 58 10, 56 22 L 50 68" stroke-width="3.2" />
    <path d="M 50 20 C 60 38, 72 54, 78 58 C 84 48, 94 26, 100 15 C 104 9, 110 13, 108 24 L 100 64" stroke-width="2.9" />
    
    <!-- تكملة الاسم ohamed موصولة مباشرة من أسفل الـ M بحركات توقيعية رشيقة -->
    <!-- حرف o -->
    <path d="M 100 64 C 105 54, 116 52, 119 60 C 121 68, 111 72, 105 66 C 109 58, 119 56, 125 62" stroke-width="2.1" />
    <!-- حرف h بقائم طويل وحلقة -->
    <path d="M 129 66 C 131 50, 135 36, 138 38 C 140 40, 138 54, 137 66 C 139 60, 145 55, 150 58 C 153 62, 152 66, 151 68" stroke-width="2.1" />
    <!-- حرف a -->
    <path d="M 159 62 C 155 60, 154 66, 157 68 C 161 69, 164 65, 165 59 L 166 68" stroke-width="1.9" />
    <!-- حرف m الموصول السريع -->
    <path d="M 171 58 C 173 55, 177 54, 179 60 L 179 68 C 181 56, 187 54, 189 60 L 189 68 C 191 56, 197 54, 199 60 L 199 68" stroke-width="2.0" />
    <!-- حرف e -->
    <path d="M 205 64 C 209 62, 213 60, 210 57 C 207 55, 204 60, 206 67 C 209 69, 213 68, 216 64" stroke-width="1.9" />
    <!-- حرف d والامتداد النهائي للتوقيع -->
    <path d="M 224 62 C 220 60, 218 66, 222 68 C 226 69, 229 64, 231 58 L 233 36 L 231 68 C 235 66, 243 64, 249 62" stroke-width="2.2" />
    
    <!-- خط السحبة التوقيعية الممتدة السفلية أسفل الاسم مع نقطة الانتهاء المعتمدة -->
    <path d="M 30 76 C 80 86, 165 84, 260 54 C 272 50, 256 66, 216 72 C 156 80, 85 82, 38 74" stroke-width="2.2" />
    <circle cx="264" cy="52" r="2.5" fill="#0f2b5c" stroke="none" />
  </g>
</svg>
`)}`,N=`data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 90" width="280" height="90">
  <g fill="none" stroke="#0f2b5c" stroke-linecap="round" stroke-linejoin="round">
    <!-- الحرف الكبير A بتصميم توقيع فني انسيابي عريض وبارز -->
    <path d="M 30 68 C 36 46, 52 18, 64 10 C 70 6, 76 9, 75 18 C 73 32, 58 66, 56 72" stroke-width="3.2" />
    <path d="M 64 11 C 74 24, 88 52, 96 66 C 99 71, 105 70, 110 64" stroke-width="2.9" />
    <path d="M 42 44 C 56 41, 74 39, 88 43" stroke-width="2.3" />
    
    <!-- تكملة الاسم bdullatief تحته متناسقة بخط توقيعي انسيابي متصل -->
    <!-- حرف b -->
    <path d="M 104 65 C 105 48, 108 38, 112 40 C 114 42, 112 55, 110 66 C 112 60, 117 56, 122 58 C 125 61, 124 67, 120 68 C 117 68, 114 65, 118 64" stroke-width="2.1" />
    <!-- حرف d -->
    <path d="M 130 63 C 127 61, 125 66, 128 68 C 132 69, 134 65, 136 60 L 137 42 L 136 68" stroke-width="2.1" />
    <!-- حرف u -->
    <path d="M 141 59 C 142 66, 145 68, 148 67 C 151 65, 152 60, 153 58 L 154 68" stroke-width="1.9" />
    <!-- حرف l الأول -->
    <path d="M 158 67 C 160 52, 163 40, 166 41 C 167 43, 166 56, 165 67" stroke-width="2.1" />
    <!-- حرف l الثاني -->
    <path d="M 169 67 C 171 52, 174 40, 177 41 C 178 43, 177 56, 176 67" stroke-width="2.1" />
    <!-- حرف a -->
    <path d="M 184 63 C 180 61, 180 66, 182 68 C 185 69, 188 66, 189 60 L 190 68" stroke-width="1.9" />
    <!-- حرف t -->
    <path d="M 196 48 L 195 68 C 196 70, 199 69, 202 66" stroke-width="2.0" />
    <path d="M 191 55 L 200 54" stroke-width="1.8" />
    <!-- حرف i -->
    <path d="M 206 58 L 205 67" stroke-width="1.9" />
    <circle cx="205" cy="52" r="1.3" fill="#0f2b5c" stroke="none" />
    <!-- حرف e -->
    <path d="M 211 64 C 215 62, 218 60, 216 58 C 213 56, 211 60, 212 66 C 215 68, 218 67, 221 64" stroke-width="1.9" />
    <!-- حرف f -->
    <path d="M 228 42 C 225 44, 223 51, 225 64 C 226 73, 224 82, 221 85" stroke-width="2.1" />
    <path d="M 221 57 L 232 55" stroke-width="1.9" />
    
    <!-- خط السحبة التوقيعية الممتدة السفلية مع نقطة الختام المعتمدة -->
    <path d="M 32 76 C 80 86, 160 84, 258 56 C 270 52, 256 68, 214 74 C 154 81, 84 82, 40 74" stroke-width="2.2" />
    <circle cx="262" cy="54" r="2.5" fill="#0f2b5c" stroke="none" />
  </g>
</svg>
`)}`,D=`data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <!-- تأثير الحبر الختمي الرسمي المائل قليلاً -->
  <g transform="rotate(-4 100 100)">
    <!-- الإطار الخارجي المزدوج للختم الرسمي -->
    <circle cx="100" cy="100" r="92" fill="none" stroke="#1e3a8a" stroke-width="3" stroke-dasharray="8 2" opacity="0.95" />
    <circle cx="100" cy="100" r="86" fill="none" stroke="#1e3a8a" stroke-width="1.8" opacity="0.95" />
    <circle cx="100" cy="100" r="62" fill="none" stroke="#1e3a8a" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.9" />
    
    <!-- مسار النص الدائري العلوي -->
    <path id="upperArc" d="M 24 100 A 76 76 0 1 1 176 100" fill="none" />
    <text font-family="'Cairo', 'Amiri', 'Segoe UI', Tahoma, sans-serif" font-size="11.5" font-weight="900" fill="#1e3a8a" letter-spacing="1">
      <textPath href="#upperArc" startOffset="50%" text-anchor="middle">
        ★ أكاديمية سَبِيل لعلوم القرآن الكريم ★
      </textPath>
    </text>

    <!-- مسار النص الدائري السفلي -->
    <path id="lowerArc" d="M 176 100 A 76 76 0 0 1 24 100" fill="none" />
    <text font-family="'Cairo', 'Amiri', 'Segoe UI', Tahoma, sans-serif" font-size="10.5" font-weight="800" fill="#1e3a8a" letter-spacing="1">
      <textPath href="#lowerArc" startOffset="50%" text-anchor="middle">
        • الإدارة العامة والشؤون المالية •
      </textPath>
    </text>

    <!-- مركز الختم: كلمة معتمد رسمياً والنجمة والزخرفة -->
    <g fill="#1e3a8a" text-anchor="middle" font-family="'Cairo', 'Amiri', 'Segoe UI', Tahoma, sans-serif">
      <text x="100" y="86" font-size="9" font-weight="800" letter-spacing="1.5">SABEEL ACADEMY</text>
      <line x1="55" y1="92" x2="145" y2="92" stroke="#1e3a8a" stroke-width="1" />
      <text x="100" y="108" font-size="14" font-weight="900" letter-spacing="1">مُعْتَمَد</text>
      <text x="100" y="122" font-size="8.5" font-weight="800" letter-spacing="0.5">OFFICIALLY CERTIFIED</text>
      <line x1="55" y1="127" x2="145" y2="127" stroke="#1e3a8a" stroke-width="1" />
      <text x="100" y="138" font-size="8" font-weight="700">★ سَنَد قَبْض رَسْمِي ★</text>
    </g>
  </g>
</svg>
`)}`,P=`data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80">
  <g fill="none">
    <!-- الأيقونة الهندسية الفاخرة للقرآن والمنارة -->
    <g transform="translate(10, 10)">
      <rect x="0" y="0" width="60" height="60" rx="14" fill="#0f766e" />
      <path d="M 16 44 C 24 40, 30 40, 30 20 C 30 40, 36 40, 44 44 L 44 24 C 36 20, 30 20, 30 16 C 30 20, 24 20, 16 24 Z" fill="#ffffff" />
      <circle cx="30" cy="14" r="3" fill="#facc15" />
    </g>
    <!-- اسم الأكاديمية بخط عربي مؤسسي رصين -->
    <text x="82" y="38" font-family="'Cairo', 'Amiri', 'Segoe UI', Tahoma, sans-serif" font-size="22" font-weight="900" fill="#0f766e">أكاديمية سَبِيل</text>
    <text x="82" y="58" font-family="'Cairo', 'Amiri', 'Segoe UI', Tahoma, sans-serif" font-size="12" font-weight="700" fill="#64748b">لعلوم القرآن الكريم والقراءات</text>
  </g>
</svg>
`)}`,f={academyName:"أكاديمية سَبِيل لعلوم القرآن الكريم",academySubtitle:"منظومة التعليم القرآني والتحفيظ الشامل",academyContact:{phone:"01094475649",whatsapp:"01094475649",email:"info@sabeel-academy.com",address:"جمهورية مصر العربية"},logoURL:P,stampURL:D,termsNote:"يعتبر هذا السند وثيقة قبض إلكترونية معتمدة صادرة من الإدارة المالية للأكاديمية وتبرئ ذمة المسدد بالمبلغ الموضح أعلاه.",recipients:[{id:"rec_mohamed_adel",name:"محمد عادل",title:"المسؤول المالي والحسابات",signatureURL:M},{id:"rec_abdullatief_fathy",name:"عبداللطيف فتحي",title:"مدير عام الأكاديمية",signatureURL:N}]};function G(e){const i=Math.floor(parseFloat(e)||0);if(i===0)return"فقط صفر جنيه مصري لا غير";const t=["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة","عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر","ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"],d=["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"],a=["","مائة","مئتان","ثلاثمائة","أربعمائة","خمسمائة","ستمائة","سبعمائة","ثمانمائة","تسعمائة"];function o(u){let m="";const x=Math.floor(u/100),g=u%100;if(x>0&&(m+=a[x]),g>0)if(m!==""&&(m+=" و"),g<20)m+=t[g];else{const n=g%10,c=Math.floor(g/10);n>0?m+=t[n]+" و"+d[c]:m+=d[c]}return m}let s="";const r=Math.floor(i/1e3),l=i%1e3;return r>0&&(r===1?s+="ألف":r===2?s+="ألفان":r>=3&&r<=10?s+=o(r)+" آلاف":s+=o(r)+" ألفاً"),l>0&&(s!==""&&(s+=" و"),s+=o(l)),`فقط ${s} جنيهاً مصرياً لا غير`}let y=null;async function F(e=!1){if(y&&!e)return y;try{const i=await S(R(A,"settings","receipt"));if(i.exists()){const t=i.data();y={...f,...t,academyContact:{...f.academyContact,...t.academyContact||{}},recipients:t.recipients&&Array.isArray(t.recipients)&&t.recipients.length>0?t.recipients:f.recipients}}else{const t=await S(R(A,"settings","academy")),d=t.exists()?t.data():{};y={...f,academyName:d.academyName||f.academyName,logoURL:d.logoURL||f.logoURL}}}catch(i){console.warn("تعذر تحميل إعدادات سند القبض من الخادم، سيتم استخدام الإعدادات الافتراضية:",i),y={...f}}return y}async function Y(e){try{const i={...e,updatedAt:B()};return await j(R(A,"settings","receipt"),i,{merge:!0}),y={...f,...e},!0}catch(i){throw console.error("خطأ أثناء حفظ إعدادات سند القبض:",i),i}}function z(e,i=null){var s;const d=(i||y||f).recipients||f.recipients;if(!e)return((s=d[0])==null?void 0:s.signatureURL)||M;const a=e.trim().toLowerCase(),o=d.find(r=>{const l=(r.name||"").trim().toLowerCase();return l===a||a.includes(l)||l.includes(a)});return o&&o.signatureURL?o.signatureURL:a.includes("عبداللطيف")||a.includes("عبد اللطيف")||a.includes("فتحي")?N:M}function E(e,i=null){var s;const d=(i||y||f).recipients||f.recipients;if(!e)return((s=d[0])==null?void 0:s.title)||"المسؤول المالي";const a=e.trim().toLowerCase(),o=d.find(r=>{const l=(r.name||"").trim().toLowerCase();return l===a||a.includes(l)||l.includes(a)});return(o==null?void 0:o.title)||"المسؤول المستلم"}function _(e,i){var T,U,$,I;const t=i||f,d=e.receiptNo||(e.id?e.id.substring(0,8).toUpperCase():"00001"),a=e.issueDate||(e.createdAt?new Date(e.createdAt.seconds?e.createdAt.seconds*1e3:e.createdAt).toLocaleDateString("ar-EG",{year:"numeric",month:"long",day:"numeric"}):new Date().toLocaleDateString("ar-EG",{year:"numeric",month:"long",day:"numeric"})),o=e.issueTime||(e.createdAt?new Date(e.createdAt.seconds?e.createdAt.seconds*1e3:e.createdAt).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"}):new Date().toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})),s=e.studentName||"طالب الأكاديمية",r=e.parentName||e.guardianName||((T=e.student)==null?void 0:T.parentName)||"غير مسجل",l=e.teacherName||"الإدارة التعليمية",u=e.packageName||e.pkgName||"اشتراك تعليمي شهري",m=e.totalLessons!==void 0?e.totalLessons:((U=e.pkg)==null?void 0:U.totalLessons)||"-",x=e.remainingLessons!==void 0?e.remainingLessons:(($=e.pkg)==null?void 0:$.remainingLessons)!==void 0?e.pkg.remainingLessons:"-",g=parseFloat(e.subscriptionPrice||e.totalAmount||e.price||e.amount||0),n=parseFloat(e.amount||e.paidAmount||0),c=e.method||e.paymentMethod||"نقدي (كاش)",k=e.month||"الشهر الحالي",L=e.notes&&e.notes.trim()?e.notes.trim():"سداد الرسوم والمستحقات الدراسية المقررة.",p=e.receivedBy||e.adminName||((I=t.recipients[0])==null?void 0:I.name)||"محمد عادل",v=E(p,t),h=z(p,t),C=t.stampURL||D,w=t.logoURL||P,b=G(n);return`
    <div class="official-receipt-sheet" style="font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; background: #ffffff; color: #0f172a; padding: 2.2rem; border-radius: 4px; box-sizing: border-box; max-width: 800px; margin: 0 auto; line-height: 1.5; position: relative;">
      
      <!-- إطار خارجي رفيع مزدوج بطابع المستندات الرسمية -->
      <div style="border: 2px solid #0f766e; padding: 1.25rem; border-radius: 4px; position: relative; background: #ffffff;">

        <!-- خلفية مائية خفيفة للعلامة المعتمدة (Watermark) -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-20deg); opacity: 0.035; pointer-events: none; width: 340px; height: 340px; z-index: 0;">
          <img src="${C}" alt="Watermark" style="width: 100%; height: 100%; object-fit: contain;">
        </div>

        <!-- ترويسة السند الرسمية (Official Header) -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 1.2rem; margin-bottom: 1.2rem; gap: 1rem; position: relative; z-index: 1;">
          
          <!-- الشعار والاسم -->
          <div style="display: flex; align-items: center; gap: 1rem;">
            <img src="${w}" alt="شعار الأكاديمية" style="max-height: 65px; max-width: 180px; object-fit: contain;">
            <div>
              <div style="font-size: 1.25rem; font-weight: 900; color: #0f766e; margin-bottom: 0.15rem;">${t.academyName}</div>
              <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">${t.academySubtitle}</div>
            </div>
          </div>

          <!-- بيانات السند ورقم القيد -->
          <div style="text-align: left; border-right: 1px solid #e2e8f0; padding-right: 1.25rem; margin-right: 0.5rem;">
            <div style="display: inline-block; background: #0f766e; color: #ffffff; font-size: 0.95rem; font-weight: 800; padding: 0.35rem 1rem; border-radius: 4px; letter-spacing: 0.5px;">
              سَنَد قَبْض مَالِي
            </div>
            <div style="font-size: 0.85rem; font-weight: 800; color: #0f172a; margin-top: 0.5rem; font-family: monospace;">
              رقم السند: <span style="color: #0f766e;">#REC-${d}</span>
            </div>
            <div style="font-size: 0.78rem; color: #64748b; margin-top: 0.2rem;">
              تاريخ الإصدار: <span style="font-weight: 700; color: #334155;">${a}</span>
            </div>
          </div>
        </div>

        <!-- شريط المبلغ المحصل البارز والتفقيط الكتابي -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.9rem 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; position: relative; z-index: 1;">
          <div>
            <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase;">المبلغ المستلم كتابةً:</div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #0f766e; margin-top: 0.15rem;">
              ${b}
            </div>
          </div>
          <div style="text-align: left; background: #ffffff; border: 1.5px solid #0f766e; border-radius: 4px; padding: 0.4rem 1rem;">
            <div style="font-size: 0.72rem; color: #64748b; font-weight: 700;">المبلغ المدفوع رقماً</div>
            <div style="font-size: 1.35rem; font-weight: 900; color: #0f766e;">
              ${n.toLocaleString("ar-EG")} <span style="font-size: 0.85rem; font-weight: 700;">ج.م</span>
            </div>
          </div>
        </div>

        <!-- جدول بيانات الطالب والاشتراك المالي -->
        <div style="margin-bottom: 1.25rem; position: relative; z-index: 1;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.86rem; border: 1px solid #e2e8f0;">
            <tbody>
              <!-- الصف 1: اسم الطالب وولي الأمر -->
              <tr style="background: #f8fafc;">
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #475569; width: 22%; border: 1px solid #e2e8f0;">اسم الطالب:</td>
                <td style="padding: 0.65rem 0.85rem; font-weight: 800; color: #0f172a; width: 28%; border: 1px solid #e2e8f0;">${s}</td>
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #475569; width: 22%; border: 1px solid #e2e8f0;">اسم ولي الأمر:</td>
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #0f172a; width: 28%; border: 1px solid #e2e8f0;">${r}</td>
              </tr>

              <!-- الصف 2: تفاصيل الباقة وعدد الحصص -->
              <tr>
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #475569; border: 1px solid #e2e8f0;">تفاصيل الباقة:</td>
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #0f766e; border: 1px solid #e2e8f0;">${u}</td>
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #475569; border: 1px solid #e2e8f0;">عدد الحصص:</td>
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #0f172a; border: 1px solid #e2e8f0;">${m} حصة (المتبقي: ${x} حصة)</td>
              </tr>

              <!-- الصف 3: قيمة الاشتراك وطريقة الدفع -->
              <tr style="background: #f8fafc;">
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #475569; border: 1px solid #e2e8f0;">قيمة الاشتراك الإجمالية:</td>
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #0f172a; border: 1px solid #e2e8f0;">${g.toLocaleString("ar-EG")} ج.م</td>
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #475569; border: 1px solid #e2e8f0;">طريقة ومزود الدفع:</td>
                <td style="padding: 0.65rem 0.85rem; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">${c}</td>
              </tr>

              <!-- الصف 4: المعلم المشرف والشهر المحاسبي -->
              <tr>
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #475569; border: 1px solid #e2e8f0;">المعلم المشرف:</td>
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #0f172a; border: 1px solid #e2e8f0;">${l}</td>
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #475569; border: 1px solid #e2e8f0;">عن فترة شهر:</td>
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #0f766e; border: 1px solid #e2e8f0;">${k}</td>
              </tr>

              <!-- الصف 5: الملاحظات -->
              <tr style="background: #f8fafc;">
                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #475569; border: 1px solid #e2e8f0;">ملاحظات العملية:</td>
                <td colspan="3" style="padding: 0.65rem 0.85rem; color: #334155; font-size: 0.84rem; border: 1px solid #e2e8f0;">${L}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- تذييل التوقيعات والاعتماد الرسمي (Official Signatures & Stamp Block) -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 1.25rem; margin-top: 1.25rem; position: relative; z-index: 1; flex-wrap: wrap; gap: 1.5rem;">
          
          <!-- المستلم والمعلومات الإدارية -->
          <div style="min-width: 220px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #64748b; margin-bottom: 0.25rem;">تم الاستلام والاعتماد بواسطة:</div>
            <div style="font-size: 0.88rem; font-weight: 700; color: #0f172a; font-family: 'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif, cursive; letter-spacing: 0.2px; transition: all 0.2s;" id="receiptPrintRecipientName">${p}</div>
            <div style="font-size: 0.76rem; color: #0f766e; font-weight: 700; margin-top: 0.15rem; transition: all 0.2s;" id="receiptPrintRecipientTitle">${v}</div>
            <div style="font-size: 0.70rem; color: #94a3b8; margin-top: 0.35rem;">
              حرر بتاريخ: ${a} (${o})
            </div>
          </div>

          <!-- توقيع المستلم والختم المعتمد بجانب بعضهما -->
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 1.25rem;">
            
            <!-- التوقيع المفرغ PNG / SVG -->
            <div style="text-align: center; border-bottom: 1px solid #94a3b8; padding-bottom: 0.35rem; width: 175px;">
              <div style="font-size: 0.72rem; font-weight: 700; color: #64748b; margin-bottom: 0.25rem;">توقيع المستلم المعتمد</div>
              <div style="height: 55px; display: flex; align-items: center; justify-content: center; position: relative;" id="receiptSignatureContainer">
                <img id="receiptPrintSignatureImg" src="${h}" alt="توقيع ${p}" style="max-height: 52px; max-width: 165px; object-fit: contain; transition: all 0.25s ease-in-out;">
              </div>
            </div>

            <!-- ختم الأكاديمية الرسمي المفرغ PNG -->
            <div style="text-align: center;">
              <img src="${C}" alt="ختم الأكاديمية المعتمد" style="width: 100px; height: 100px; object-fit: contain; transform: rotate(-2deg); filter: drop-shadow(0 2px 4px rgba(15, 118, 110, 0.12));">
              <div style="font-size: 0.65rem; color: #64748b; font-weight: 700; margin-top: 0.15rem;">الختم الرسمي للأكاديمية</div>
            </div>

          </div>
        </div>

        <!-- ملاحظة شروط السند وبيانات التواصل -->
        <div style="border-top: 1px dashed #cbd5e1; margin-top: 1.25rem; padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #64748b; flex-wrap: wrap; gap: 0.5rem; position: relative; z-index: 1;">
          <div>${t.termsNote}</div>
          <div style="font-weight: 700; color: #0f766e; text-align: left; direction: ltr;">
            <span>هاتف: ${t.academyContact.phone||"01094475649"}</span>
            <span style="margin: 0 0.35rem;">|</span>
            <span>واتساب: ${t.academyContact.whatsapp||"01094475649"}</span>
          </div>
        </div>

      </div>
    </div>
  `}async function q(e,i={}){var l;const t=i.settings||await F(),d=i.recipientName||e.receivedBy||e.adminName||t.recipients&&((l=t.recipients[0])==null?void 0:l.name)||"محمد عادل",a=_(e,t);let o=document.getElementById("globalReceiptModal");o||(o=document.createElement("div"),o.id="globalReceiptModal",o.className="modal-overlay",o.style.cssText=`
      display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(15, 23, 42, 0.8); z-index: var(--z-modal); align-items: center; justify-content: center;
      padding: 1rem; backdrop-filter: blur(5px);
    `,o.innerHTML=`
      <div class="modal-card" style="max-width: 860px; width: 100%; padding: 0; overflow: hidden; background: #ffffff; border-radius: 10px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35); border: 1px solid rgba(255,255,255,0.1);">
        
        <!-- شريط التحكم العلوي المتقدم -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1.4rem; background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); color: #ffffff; flex-wrap: wrap; gap: 0.75rem;">
          
          <div style="font-size: 1.05rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem;">
            <span>سند قبض مالي رسمي معتمد</span>
          </div>

          <!-- أدوات التحكم واختيار المستلم المعتمد -->
          <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            
            <!-- قائمة اختيار المستلم المعتمد للتحويل التلقائي للتوقيع الخاص به -->
            <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(255,255,255,0.16); padding: 0.3rem 0.65rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3);">
              <label for="globalReceiptRecipientSelect" style="font-size: 0.78rem; font-weight: 800; color: #ffffff; white-space: nowrap; cursor: pointer;">
                توقيع المستلم المعتمد:
              </label>
              <select id="globalReceiptRecipientSelect" style="background: #ffffff; color: #0f172a; border: 1px solid #ffffff; font-weight: 800; font-size: 0.84rem; padding: 0.3rem 0.6rem; border-radius: 4px; outline: none; cursor: pointer; min-width: 140px; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
                <!-- تُعبأ خيارات المستلمين ديناميكياً -->
              </select>
            </div>

            <!-- زر الطباعة وتصدير PDF -->
            <button type="button" id="btnGlobalPrintReceipt" class="btn" style="background: #ffffff; color: #0f766e; border: none; font-weight: 800; padding: 0.45rem 1.1rem; font-size: 0.85rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              طباعة السند (Print / PDF)
            </button>

            <!-- زر الإغلاق -->
            <button type="button" id="btnGlobalCloseReceipt" title="إغلاق السند" style="background: rgba(255,255,255,0.12); border: none; color: #ffffff; font-size: 1.4rem; line-height: 1; cursor: pointer; padding: 0.3rem 0.55rem; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
              &times;
            </button>

          </div>
        </div>

        <!-- منطقة عرض السند الرسمي -->
        <div id="globalReceiptContentArea" style="max-height: 80vh; overflow-y: auto; padding: 1.25rem; background: #f1f5f9;"></div>
      </div>
    `,document.body.appendChild(o),document.getElementById("btnGlobalCloseReceipt").addEventListener("click",()=>{o.style.display="none"}),document.getElementById("btnGlobalPrintReceipt").addEventListener("click",()=>{O(document.getElementById("globalReceiptContentArea").innerHTML)}));const s=document.getElementById("globalReceiptContentArea");s.innerHTML=a;const r=document.getElementById("globalReceiptRecipientSelect");if(r){const u=t.recipients&&t.recipients.length>0?t.recipients:f.recipients;r.innerHTML=u.map(n=>`
      <option value="${n.name}">${n.name}${n.title?` - ${n.title}`:""}</option>
    `).join("");const m=(d||"").trim().toLowerCase(),x=Array.from(r.options).find(n=>{const c=n.value.trim().toLowerCase();return c===m||m.includes(c)||c.includes(m)});x?r.value=x.value:r.options.length>0&&(r.selectedIndex=0);const g=n=>{const c=u.find(C=>{const w=(C.name||"").trim().toLowerCase(),b=n.trim().toLowerCase();return w===b||b.includes(w)||w.includes(b)})||{name:n,title:E(n,t),signatureURL:z(n,t)},k=c.signatureURL||z(c.name,t),L=c.title||E(c.name,t),p=document.getElementById("receiptPrintRecipientName"),v=document.getElementById("receiptPrintRecipientTitle"),h=document.getElementById("receiptPrintSignatureImg");p&&(p.textContent=c.name,p.style.fontFamily="'Aref Ruqaa', 'Amiri', 'Traditional Arabic', serif, cursive",p.style.fontSize="0.88rem",p.style.fontWeight="700",p.style.color="#0f766e",setTimeout(()=>{p.style.color="#0f172a"},300)),v&&(v.textContent=L),h&&(h.style.opacity="0",h.style.transform="scale(0.92)",setTimeout(()=>{h.src=k,h.alt=`توقيع ${c.name}`,h.style.opacity="1",h.style.transform="scale(1)"},150))};r.onchange=n=>{g(n.target.value)},g(r.value)}o.style.display="flex"}function O(e){let i=document.getElementById("receiptPrintIframe");i||(i=document.createElement("iframe"),i.id="receiptPrintIframe",i.style.position="fixed",i.style.right="0",i.style.bottom="0",i.style.width="0",i.style.height="0",i.style.border="none",document.body.appendChild(i));const t=i.contentWindow.document;t.open(),t.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>سند قبض مالي رسمي</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
          background: #ffffff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        * {
          box-sizing: border-box;
        }
        .official-receipt-sheet {
          max-width: 100% !important;
          padding: 0 !important;
        }
      </style>
    </head>
    <body>
      ${e}
    </body>
    </html>
  `),t.close(),setTimeout(()=>{i.contentWindow.focus(),i.contentWindow.print()},350)}export{f as D,D as a,M as b,F as g,q as o,Y as s};
