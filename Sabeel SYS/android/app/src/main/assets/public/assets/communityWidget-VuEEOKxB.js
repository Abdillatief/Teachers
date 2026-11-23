import{i as z,P as g,f as j,R as y}from"./communityService-DVPAqFL5.js";import{l as h}from"./navbar-Wj1PJKN1.js";function B(f,v={}){const t=document.getElementById(f);if(!t)return()=>{};const o=v.role||"teacher",r=o==="admin"?"../admin/community.html":"../teacher/community.html";return z(e=>{if(!e){t.innerHTML=`
        <div class="card" style="border-right: 4px solid var(--primary-color); padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="background: rgba(14, 165, 233, 0.12); color: var(--primary-color); width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="messages-square" style="width: 18px; height: 18px;"></i>
              </div>
              <h3 style="margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-primary);">
                مجتمع الأكاديمية والملتقى
              </h3>
            </div>
            <a href="${r}" class="btn btn-secondary btn-sm" style="font-size: 0.78rem;">
              <span>فتح المجتمع</span>
              <i data-lucide="arrow-left" style="width: 13px; height: 13px;"></i>
            </a>
          </div>

          <div style="text-align: center; padding: 1.5rem 1rem; background: var(--bg-primary); border-radius: 8px; border: 1px dashed var(--border-color);">
            <i data-lucide="message-square-plus" style="width: 32px; height: 32px; color: var(--text-muted); margin-bottom: 0.5rem;"></i>
            <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem; color: var(--text-secondary);">
              لا توجد منشورات حتى الآن في مجتمع الأكاديمية. كن أول من يشارك فكرة أو إعلاناً!
            </p>
            <a href="${r}?action=new" class="btn btn-primary btn-sm" style="font-weight: 700;">
              <i data-lucide="pen-tool" style="width: 14px; height: 14px;"></i>
              <span>نشر أول مشاركة الآن</span>
            </a>
          </div>
        </div>
      `,h(t);return}const b=g[e.category]||g.general,x=j(e.createdAt),d=!!e.isPinned,i=!!(e.isOfficial||e.authorRole==="admin"),l=e.reactions||{},a=[];Object.keys(y).forEach(s=>{const c=Array.isArray(l[s])?l[s].length:0;c>0&&a.push(`${y[s].emoji} ${c}`)});const p=e.commentsCount||0,u=(e.content||"").length>200?(e.content||"").substring(0,197)+"...":e.content||"",w=(e.authorName||"م").trim().charAt(0),m=i?"rgba(234, 179, 8, 0.15)":"rgba(14, 165, 233, 0.12)",n=i?"#b45309":"var(--primary-color)",$=d?"#eab308":i?"var(--primary-color)":"var(--border-color)";t.innerHTML=`
      <div class="card" style="border-right: 4px solid ${$}; padding: 1.25rem; transition: transform var(--transition-fast);">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div style="background: rgba(14, 165, 233, 0.12); color: var(--primary-color); width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="messages-square" style="width: 18px; height: 18px;"></i>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <h3 style="margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-primary);">
                  آخر ما نُشر في مجتمع الأكاديمية
                </h3>
                ${d?'<span class="badge" style="background: rgba(234, 179, 8, 0.18); color: #854d0e; font-size: 0.7rem; font-weight: 800; border: 1px solid rgba(234, 179, 8, 0.3);">📌 إعلان مثبت</span>':""}
              </div>
              <span style="font-size: 0.72rem; color: var(--text-muted);">ملتقى الإدارة والمعلمين لطرح الأفكار والتواصل</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <a href="${r}?action=new" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.3rem 0.65rem;" title="كتابة منشور جديد">
              <i data-lucide="plus" style="width: 13px; height: 13px;"></i>
              <span>${o==="admin"?"نشر إعلان":"مشاركة فكرة"}</span>
            </a>
            <a href="${r}" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.3rem 0.65rem;">
              <span>تصفح المجتمع</span>
              <i data-lucide="arrow-left" style="width: 13px; height: 13px;"></i>
            </a>
          </div>
        </div>

        <!-- Post Content Preview Box -->
        <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem;">
          
          <!-- Post Meta -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: ${m}; color: ${n}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem; border: 1px solid ${n}40;">
                ${w}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <strong style="font-size: 0.88rem; color: var(--text-primary);">${e.authorName||"عضو بالأكاديمية"}</strong>
                  <span class="badge" style="background: ${m}; color: ${n}; font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.4rem;">
                    ${i?"👑 الإدارة العامة":"👨‍🏫 معلم معتمد"}
                  </span>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.4rem; margin-top: 0.1rem;">
                  <span><i data-lucide="clock" style="width: 11px; height: 11px; vertical-align: middle;"></i> ${x}</span>
                  <span>•</span>
                  <span style="color: var(--primary-color); font-weight: 600;">${b.label}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Title & Body Snippet -->
          ${e.title?`<h4 style="margin: 0 0 0.35rem 0; font-size: 0.95rem; font-weight: 800; color: var(--text-primary); line-height: 1.4;">${e.title}</h4>`:""}
          <p style="margin: 0 0 0.75rem 0; font-size: 0.84rem; color: var(--text-secondary); line-height: 1.6; white-space: pre-line;">
            ${u}
          </p>

          <!-- Interaction Footer -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.65rem; margin-top: 0.65rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.78rem; color: var(--text-muted);">
              <span title="إجمالي التفاعلات">
                ${a.length>0?a.join(" "):"👍 0"}
              </span>
              <span>•</span>
              <span title="عدد التعليقات">
                💬 ${p} ${p===1?"تعليق":"تعليقات"}
              </span>
            </div>

            <a href="${r}?postId=${e.id}" class="btn btn-primary btn-sm" style="font-size: 0.78rem; font-weight: 700; padding: 0.35rem 0.85rem; gap: 0.35rem;">
              <span>فتح المنشور والمناقشة</span>
              <i data-lucide="arrow-left" style="width: 13px; height: 13px;"></i>
            </a>
          </div>

        </div>

      </div>
    `,h(t)})}export{B as i};
