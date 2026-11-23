import{s as D,P as N,f as A,R as L,t as O,a as q,b as _,c as Q,d as V,e as G,u as K,g as W,h as Y}from"./communityService-CqBICelC.js";import{getTeacherFollowersList as R,subscribeUserFollowing as J,subscribeAllFollowersMap as X,toggleFollowTeacher as B,getTeacherFollowingList as Z}from"./communityFollowService-DZcjLNv9.js";import{T as p,s as S}from"./rbacService-D2RrsA9d.js";import{l as f}from"./navbar-Bz3pjZSE.js";import"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";class rt{constructor(t="teacher",e={}){this.role=t,this.isAdmin=t==="admin",this.currentUser={...e,realName:e.realName||e.name||(this.isAdmin?"مدير الأكاديمية":"معلم معتمد"),communityDisplayName:e.communityDisplayName||null,communityTitle:e.communityTitle||"",communityPhotoURL:e.communityPhotoURL||e.communityAvatar||e.photoURL||null},this.allPosts=[],this.currentCategory="all",this.searchQuery="",this.sortBy="newest",this.expandedComments=new Set,this.commentsCache=new Map,this.commentsUnsubs=new Map,this.followingUserIds=new Set,this.followersCountsMap=new Map,this.followingUnsub=null,this.followersMapUnsub=null,this.postsUnsub=null,this.activeReactorsPostId=null,this.currentReactorFilter="all",this.teachersMap=new Map,this.pendingCommunityPhotoURL=void 0}getMyCommunityDisplayName(){return this.currentUser.communityDisplayName||this.currentUser.realName||this.currentUser.name||(this.isAdmin?"الإدارة العامة":"معلم معتمد")}escapeHtml(t){return t?String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}init(){this.bindEvents(),this.setupProfileUI(),this.setupURLParams(),this.setupFollowSubscriptions(),this.listenToPosts()}setupProfileUI(){this.updateProfileCardDOM();const t=document.getElementById("btnEditCommunityProfile");t&&t.addEventListener("click",()=>this.openEditProfileModal());const e=document.getElementById("btnViewMyFollowers");e&&e.addEventListener("click",()=>this.openFollowersModal(this.currentUser.uid,this.getMyCommunityDisplayName()));const s=document.getElementById("btnOpenFollowersListDirect");s&&s.addEventListener("click",()=>this.openFollowersModal(this.currentUser.uid,this.getMyCommunityDisplayName()));const o=document.getElementById("btnViewMyFollowing");o&&o.addEventListener("click",()=>this.openFollowingModal(this.currentUser.uid));const n=document.getElementById("btnFilterMyPosts");n&&n.addEventListener("click",()=>{var g;document.querySelectorAll(".community-category-tab").forEach(h=>h.classList.remove("active")),this.currentCategory=this.currentCategory==="my_posts"?"all":"my_posts";const d=document.querySelector('[data-category="my_posts"]');d&&this.currentCategory==="my_posts"?d.classList.add("active"):this.currentCategory==="all"&&((g=document.querySelector('[data-category="all"]'))==null||g.classList.add("active")),this.renderPostsList()});const a=document.getElementById("editCommunityProfileForm");a&&a.addEventListener("submit",c=>this.handleEditProfileSubmit(c));const r=document.getElementById("btnCloseEditProfileModal"),l=document.getElementById("btnCancelEditProfileModal");r&&r.addEventListener("click",()=>this.closeEditProfileModal()),l&&l.addEventListener("click",()=>this.closeEditProfileModal());const i=document.getElementById("btnCloseReactorsModal");i&&i.addEventListener("click",()=>this.closeReactorsModal());const u=document.getElementById("btnCloseFollowersModal");u&&u.addEventListener("click",()=>this.closeFollowersModal());const m=document.getElementById("btnCloseFollowingModal");m&&m.addEventListener("click",()=>this.closeFollowingModal()),["createPostModal","editCommunityProfileModal","reactorsModal","followersModal","followingModal"].forEach(c=>{const d=document.getElementById(c);d&&d.addEventListener("click",g=>{g.target===d&&(d.style.display="none")})}),this._hasEscListener||(this._hasEscListener=!0,document.addEventListener("keydown",c=>{c.key==="Escape"&&["createPostModal","editCommunityProfileModal","reactorsModal","followersModal","followingModal"].forEach(d=>{const g=document.getElementById(d);g&&g.style.display!=="none"&&(g.style.display="none")})}))}updateProfileCardDOM(){const t=document.getElementById("myCommunityName"),e=document.getElementById("myCommunityTitle"),s=document.getElementById("myCommunityAvatar"),o=document.getElementById("myCommunityRoleBadge"),n=document.getElementById("myCommunityRealNameBadge"),a=this.currentUser.realName||this.currentUser.name||(this.isAdmin?"مدير الأكاديمية":"معلم معتمد"),r=this.getMyCommunityDisplayName(),l=this.currentUser.communityTitle||(this.isAdmin?"الإدارة العامة للأكاديمية والملتقى":"كادر التحفيظ والتعليم القرآني");t&&(t.textContent=r),e&&(e.textContent=l),s&&(s.textContent=r.trim().charAt(0)||"م"),o&&(o.textContent=this.isAdmin?"👑 الإدارة العامة":"👨‍🏫 معلم معتمد",o.style.background=this.isAdmin?"rgba(234, 179, 8, 0.2)":"rgba(14, 165, 233, 0.15)",o.style.color=this.isAdmin?"#854d0e":"var(--primary-color)"),n&&(this.currentUser.communityDisplayName&&this.currentUser.communityDisplayName!==a?(n.style.display="inline-flex",n.innerHTML=`<i data-lucide="shield" style="width: 12px; height: 12px; margin-left: 3px;"></i> <span>الاسم الرسمي: ${this.escapeHtml(a)}</span>`,f(n)):n.style.display="none"),this.updateUserStatsCounters()}updateUserStatsCounters(){const t=this.followersCountsMap.get(this.currentUser.uid)||0,e=this.followingUserIds.size||0,s=this.allPosts.filter(r=>r.authorId===this.currentUser.uid).length,o=document.getElementById("myFollowersCountLabel"),n=document.getElementById("myFollowingCountLabel"),a=document.getElementById("myPostsCountLabel");o&&(o.textContent=t),n&&(n.textContent=e),a&&(a.textContent=s),this.updateFollowersNamesPreview()}async updateFollowersNamesPreview(){var e;const t=document.getElementById("myFollowersNamesList");if(!(!t||!((e=this.currentUser)!=null&&e.uid)))try{const s=await R(this.currentUser.uid);if(!s||s.length===0){t.innerHTML='<span style="color: var(--text-muted); font-size: 0.78rem;">لا يوجد متابعون لحسابك حتى الآن. شارك أفكاراً وتوجيهات مميزة في المجتمع لزيادة متابعيك!</span>';return}const o=s.slice(0,4).map(r=>`
        <span class="badge" style="background: rgba(14, 165, 233, 0.12); color: var(--primary-color); font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 99px; display: inline-flex; align-items: center; gap: 0.25rem;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
          ${r.followerName||"معلم معتمد"}
        </span>
      `).join(""),n=s.length-4,a=n>0?`<span style="color: var(--text-muted); font-size: 0.75rem; font-weight: 700;"> و ${n} آخرين</span>`:"";t.innerHTML=`${o}${a}`}catch(s){console.warn("Error updating followers names preview:",s)}}setupFollowSubscriptions(){var t;(t=this.currentUser)!=null&&t.uid&&(this.followingUnsub=J(this.currentUser.uid,e=>{this.followingUserIds=e,this.updateFollowButtonsUI(),this.updateUserStatsCounters()})),this.followersMapUnsub=X(e=>{this.followersCountsMap=e,this.updateFollowerCountBadgesUI(),this.updateUserStatsCounters()})}setupURLParams(){const t=new URLSearchParams(window.location.search),e=t.get("postId"),s=t.get("action");e&&(this.targetPostIdOnLoad=e,this.expandedComments.add(e)),s==="new"&&setTimeout(()=>{this.openCreatePostModal()},300)}bindEvents(){const t=document.getElementById("btnOpenNewPostModal");t&&t.addEventListener("click",()=>this.openCreatePostModal());const e=document.getElementById("btnClosePostModal"),s=document.getElementById("btnCancelPostModal"),o=document.getElementById("createPostModal");e&&e.addEventListener("click",()=>this.closeCreatePostModal()),s&&s.addEventListener("click",()=>this.closeCreatePostModal()),o&&o.addEventListener("click",i=>{i.target===o&&this.closeCreatePostModal()});const n=document.getElementById("createPostForm");n&&n.addEventListener("submit",i=>this.handleCreatePostSubmit(i));const a=document.querySelectorAll(".community-category-tab");a.forEach(i=>{i.addEventListener("click",()=>{a.forEach(u=>u.classList.remove("active")),i.classList.add("active"),this.currentCategory=i.dataset.category||"all",this.renderPostsList()})});const r=document.getElementById("communitySearchInput");if(r){let i=null;r.addEventListener("input",u=>{clearTimeout(i),i=setTimeout(()=>{this.searchQuery=(u.target.value||"").trim().toLowerCase(),this.renderPostsList()},250)})}const l=document.getElementById("communitySortSelect");l&&l.addEventListener("change",i=>{this.sortBy=i.target.value||"newest",this.renderPostsList()})}listenToPosts(){const t=document.getElementById("communityFeedContainer");t&&(t.innerHTML=`
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div class="spinner" style="margin: 0 auto 1rem auto; width: 32px; height: 32px; border-width: 3px;"></div>
          <p style="font-size: 0.9rem;">جاري تحميل محادثات ومنشورات المجتمع...</p>
        </div>
      `),this.postsUnsub=D(e=>{this.allPosts=e,this.updateStatsCounters(),this.updateUserStatsCounters(),this.renderPostsList(),this.targetPostIdOnLoad&&setTimeout(()=>{const s=document.getElementById(`postCard-${this.targetPostIdOnLoad}`);s&&(s.scrollIntoView({behavior:"smooth",block:"center"}),s.style.boxShadow="0 0 0 3px var(--primary-color)",setTimeout(()=>{s.style.boxShadow=""},3e3)),this.targetPostIdOnLoad=null},350)},e=>{t&&(t.innerHTML=`
          <div class="card" style="text-align: center; padding: 2rem; color: var(--danger);">
            <i data-lucide="alert-circle" style="width: 36px; height: 36px; margin-bottom: 0.5rem;"></i>
            <p>حدث خطأ أثناء تحميل المنشورات: ${e.message||"خطأ غير متوقع"}</p>
          </div>
        `,f(t))})}updateStatsCounters(){const t=document.getElementById("statTotalPosts"),e=document.getElementById("statTotalAnnouncements"),s=document.getElementById("statTotalIdeas"),o=document.getElementById("statTotalComments");if(!t&&!e)return;let n=0,a=0,r=0;this.allPosts.forEach(l=>{(l.category==="announcement"||l.isOfficial)&&n++,l.category==="idea"&&a++,r+=l.commentsCount||0}),t&&(t.textContent=this.allPosts.length),e&&(e.textContent=n),s&&(s.textContent=a),o&&(o.textContent=r)}renderPostsList(){const t=document.getElementById("communityFeedContainer");if(!t)return;let e=this.allPosts.filter(o=>{if(this.currentCategory==="pinned"){if(!o.isPinned)return!1}else if(this.currentCategory==="following"){if(!o.authorId||!this.followingUserIds.has(o.authorId))return!1}else if(this.currentCategory==="my_posts"){if(o.authorId!==this.currentUser.uid)return!1}else if(this.currentCategory!=="all"&&o.category!==this.currentCategory)return!1;if(this.searchQuery){const n=(o.title||"").toLowerCase().includes(this.searchQuery),a=(o.content||"").toLowerCase().includes(this.searchQuery),r=(o.authorName||"").toLowerCase().includes(this.searchQuery);if(!n&&!a&&!r)return!1}return!0});if(this.sortBy==="reactions"?e.sort((o,n)=>{const a=Object.values(o.reactions||{}).reduce((l,i)=>l+((i==null?void 0:i.length)||0),0);return Object.values(n.reactions||{}).reduce((l,i)=>l+((i==null?void 0:i.length)||0),0)-a}):this.sortBy==="comments"&&e.sort((o,n)=>(n.commentsCount||0)-(o.commentsCount||0)),e.length===0){t.innerHTML=`
        <div class="card" style="text-align: center; padding: 3rem 1.5rem; background: var(--bg-secondary);">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(14, 165, 233, 0.1); color: var(--primary-color); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
            <i data-lucide="messages-square" style="width: 28px; height: 28px;"></i>
          </div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.5rem 0;">
            ${this.currentCategory==="my_posts"?"لم تقم بنشر أي مشاركات بعد":"لا توجد منشورات مطابقة للبحث أو التصفية"}
          </h3>
          <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 420px; margin: 0 auto 1.25rem auto;">
            ${this.searchQuery?"جرب البحث بكلمات أخرى أو مسح الفلاتر الحالية.":"كن أول من يشارك فكرة، استفساراً، أو توجيهاً تعليمياً لإثراء مجتمع الأكاديمية!"}
          </p>
          <button class="btn btn-primary" onclick="window.communityCtrl.openCreatePostModal()">
            <i data-lucide="pen-tool"></i>
            <span>نشر مشاركة جديدة الآن</span>
          </button>
        </div>
      `,f(t);return}const s=e.map(o=>this.buildPostCardHtml(o)).join("");t.innerHTML=s,e.forEach(o=>{this.attachPostEventListeners(o)}),f(t)}buildPostCardHtml(t){var F;const e=t.authorId===this.currentUser.uid,s=this.isAdmin||e,o=!!t.isPinned,n=!!(t.isOfficial||t.authorRole==="admin"),a=N[t.category]||N.general,r=A(t.createdAt),l=e?this.getMyCommunityDisplayName():t.authorName||"عضو بالأكاديمية",i=(l||"م").trim().charAt(0),u=n?"rgba(234, 179, 8, 0.18)":"rgba(14, 165, 233, 0.12)",m=n?"#b45309":"var(--primary-color)",c=o?"#eab308":n?"var(--primary-color)":"var(--border-color)",d=t.authorId,g=this.followersCountsMap.get(d)||0,h=((F=this.currentUser)==null?void 0:F.uid)&&d&&d!==this.currentUser.uid,b=this.followingUserIds.has(d),P=t.authorPhotoURL||t.authorAvatar,z=P?`<img src="${P}" alt="${this.escapeHtml(l)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid ${m}40; flex-shrink: 0;" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div style="display: none; width: 44px; height: 44px; border-radius: 50%; background: ${u}; color: ${m}; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; border: 1.5px solid ${m}40; flex-shrink: 0;">${i}</div>`:`<div style="width: 44px; height: 44px; border-radius: 50%; background: ${u}; color: ${m}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; border: 1.5px solid ${m}40; flex-shrink: 0;">${i}</div>`,C=t.reactions||{},H=Object.keys(L).map(y=>{const w=L[y],v=Array.isArray(C[y])?C[y]:[];return`
        <button type="button" class="reaction-pill-btn ${v.includes(this.currentUser.uid)?"active":""}" data-action="react" data-post-id="${t.id}" data-reaction-type="${y}" title="${w.label}">
          <span class="emoji">${w.emoji}</span>
          <span class="count">${v.length>0?v.length:""}</span>
        </button>
      `}).join(""),j=Object.values(C).reduce((y,w)=>y+(Array.isArray(w)?w.length:0),0),k=t.reactors||{};let x=Object.values(k);Object.keys(C).forEach(y=>{(Array.isArray(C[y])?C[y]:[]).forEach(v=>{if(!k[v]){const E=v===this.currentUser.uid,M=v===t.authorId,$=E?this.getMyCommunityDisplayName():M?l:"معلم معتمد";x.push({uid:v,name:$,role:E?this.role:"teacher",reactionType:y})}})}),x=x.map(y=>y.uid===this.currentUser.uid?{...y,name:this.getMyCommunityDisplayName()}:y);let U="";if(x.length>0){const y=x.slice(0,3).map(E=>{var $;const M=(($=L[E.reactionType])==null?void 0:$.emoji)||"👍";return`<span style="font-weight: 700; color: var(--text-primary);">${this.escapeHtml(E.name)} ${M}</span>`}).join("، "),w=x.length-3,v=w>0?` و <strong style="color: var(--primary-color);">${w} آخرين</strong>`:"";U=`
        <div class="post-reactors-preview-row" style="margin-top: 0.65rem; padding: 0.45rem 0.85rem; background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.78rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.35rem;">
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <span style="color: var(--text-muted); font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
              <i data-lucide="smile" style="width: 13px; height: 13px; color: var(--primary-color);"></i>
              المتفاعلون:
            </span>
            <span>${y}${v}</span>
          </div>
          <button type="button" class="btn-link-subtle" data-action="view-reactors" data-post-id="${t.id}" style="background: none; border: none; font-size: 0.75rem; color: var(--primary-color); font-weight: 800; cursor: pointer; text-decoration: underline;">
            عرض أسماء المتفاعلين بالتفصيل (${x.length}) 👥
          </button>
        </div>
      `}const T=this.expandedComments.has(t.id),I=t.allowComments!==!1;return`
      <article id="postCard-${t.id}" class="card community-post-card ${o?"pinned-post":""}" style="border-right: 4px solid ${c}; padding: 1.35rem; margin-bottom: 1.25rem;">
        
        <!-- Post Header -->
        <div class="post-header-flex" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.75rem;">
          
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${z}
            <div>
              <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                <strong style="font-size: 0.98rem; color: var(--text-primary);">${this.escapeHtml(l)}</strong>
                <span class="badge" style="background: ${u}; color: ${m}; font-size: 0.7rem; font-weight: 800; padding: 0.15rem 0.45rem;">
                  ${n?"👑 الإدارة العامة":"👨‍🏫 معلم معتمد"}
                </span>
                ${o?'<span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #854d0e; font-size: 0.7rem; font-weight: 800; border: 1px solid rgba(234, 179, 8, 0.35);">📌 مثبت بأعلى المجتمع</span>':""}
                
                <!-- Follower count badge (clickable to view followers) -->
                <button type="button" class="author-followers-badge" data-action="view-teacher-followers" data-teacher-id="${d}" data-teacher-name="${this.escapeHtml(l)}" title="اضغط لعرض متابعي هذا المعلم" style="background: none; border: 1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 99px; cursor: pointer; font-size: 0.72rem; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 0.3rem;">
                  <i data-lucide="users" style="width: 12px; height: 12px; color: var(--primary-color);"></i>
                  <span><span data-follower-count-for="${d}">${g}</span> متابع • أسماء المتابعين</span>
                </button>

                <!-- Follow / Unfollow button -->
                ${h?`
                  <button type="button" 
                          class="btn-follow ${b?"following":""}" 
                          data-action="toggle-follow" 
                          data-author-id="${d}" 
                          data-author-name="${this.escapeHtml(l)}" 
                          title="${b?"إلغاء المتابعة":"متابعة المعلم"}">
                    <i data-lucide="${b?"user-check":"user-plus"}" style="width: 13px; height: 13px;"></i>
                    <span class="btn-text">${b?"مُتابَع ✓":"متابعة +"}</span>
                  </button>
                `:""}
              </div>
              <div style="font-size: 0.76rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.45rem; margin-top: 0.25rem;">
                <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
                  <i data-lucide="clock" style="width: 12px; height: 12px;"></i> ${r}
                </span>
                <span>•</span>
                <span style="color: var(--primary-color); font-weight: 700;">${a.label}</span>
              </div>
            </div>
          </div>

          <!-- Post Actions Menu -->
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            ${this.isAdmin?`
              <button class="btn btn-secondary btn-sm" data-action="toggle-pin" data-post-id="${t.id}" data-pinned="${o}" title="${o?"إلغاء التثبيت":"تثبيت المنشور بالأعلى"}" style="padding: 0.3rem 0.55rem; font-size: 0.75rem;">
                <i data-lucide="pin" style="width: 14px; height: 14px; ${o?"color: #eab308;":""}"></i>
                <span>${o?"مثبت":"تثبيت"}</span>
              </button>
              <button class="btn btn-secondary btn-sm" data-action="toggle-lock" data-post-id="${t.id}" data-locked="${!I}" title="${I?"قفل التعليقات":"فتح التعليقات"}" style="padding: 0.3rem 0.55rem; font-size: 0.75rem;">
                <i data-lucide="${I?"lock":"unlock"}" style="width: 14px; height: 14px;"></i>
                <span>${I?"قفل":"مغلق"}</span>
              </button>
            `:""}

            ${s?`
              <button class="btn btn-secondary btn-sm" data-action="delete-post" data-post-id="${t.id}" title="حذف المنشور" style="padding: 0.3rem 0.55rem; color: var(--danger); border-color: rgba(239,68,68,0.3);">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              </button>
            `:""}
          </div>

        </div>

        <!-- Post Content -->
        <div style="margin-bottom: 1rem;">
          ${t.title?`
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.55rem 0; line-height: 1.5;">
              ${this.escapeHtml(t.title)}
            </h3>
          `:""}
          <div style="font-size: 0.92rem; color: var(--text-primary); line-height: 1.75; white-space: pre-line; word-break: break-word;">
            ${this.formatPostText(t.content)}
          </div>
        </div>

        <!-- Reactions & Comments Toolbar -->
        <div class="community-toolbar-flex" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.75rem; flex-wrap: wrap; gap: 0.65rem;">
          
          <!-- Reaction Buttons & Clickable Reactors Badge (Know Who Reacted) -->
          <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
            ${H}
            <button type="button" class="likes-summary-badge clickable" data-action="view-reactors" data-post-id="${t.id}" title="اضغط لعرض أسماء من قام بالتفاعل">
              <i data-lucide="heart" style="width: 13px; height: 13px; fill: currentColor;"></i>
              <span>${j} تفاعل • أسماء المتفاعلون 👥</span>
            </button>
          </div>

          <!-- Toggle Comments Button -->
          <div>
            <button type="button" class="btn btn-secondary btn-sm" data-action="toggle-comments" data-post-id="${t.id}" style="font-size: 0.8rem; font-weight: 700; gap: 0.4rem; min-height: 38px;">
              <i data-lucide="message-square" style="width: 14px; height: 14px;"></i>
              <span>التعليقات (${t.commentsCount||0})</span>
              <i data-lucide="${T?"chevron-up":"chevron-down"}" style="width: 13px; height: 13px;"></i>
            </button>
          </div>

        </div>

        <!-- عرض أسماء المتفاعلين مباشرة على المنشور -->
        ${U}

        <!-- Comments Section Box (Shown if expanded) -->
        <div id="commentsSection-${t.id}" class="post-comments-container" style="display: ${T?"block":"none"}; margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-color);">
          
          <!-- Comments List -->
          <div id="commentsList-${t.id}" style="display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 1rem;">
            <div style="text-align: center; color: var(--text-muted); padding: 0.75rem; font-size: 0.82rem;">
              جاري تحميل التعليقات...
            </div>
          </div>

          <!-- Add Comment Form -->
          ${I?`
            <form id="commentForm-${t.id}" data-post-id="${t.id}" class="comment-form-responsive" style="display: flex; gap: 0.5rem; align-items: flex-end;">
              <textarea id="commentInput-${t.id}" class="form-control" placeholder="اكتب تعليقك أو استفسارك هنا..." rows="1" style="resize: none; min-height: 42px; font-size: 0.88rem; border-radius: 8px;" required></textarea>
              <button type="submit" class="btn btn-primary" style="padding: 0.55rem 0.95rem; font-size: 0.85rem; font-weight: 700; gap: 0.35rem; white-space: nowrap; min-height: 42px;">
                <i data-lucide="send" style="width: 14px; height: 14px;"></i>
                <span>إرسال</span>
              </button>
            </form>
          `:`
            <div style="background: rgba(148, 163, 184, 0.1); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.65rem 1rem; text-align: center; font-size: 0.82rem; color: var(--text-muted);">
              🔒 تم قفل التعليقات على هذا المنشور الإداري من قِبل الإدارة.
            </div>
          `}

        </div>

      </article>
    `}formatPostText(t){if(!t)return"";const e=document.createElement("div");e.textContent=t;let s=e.innerHTML;const o=/(https?:\/\/[^\s]+)/g;return s=s.replace(o,n=>`<a href="${n}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: underline;">${n}</a>`),s}attachPostEventListeners(t){const e=document.getElementById(`postCard-${t.id}`);if(!e)return;e.querySelectorAll('[data-action="react"]').forEach(c=>{c.addEventListener("click",async()=>{const d=c.dataset.reactionType;try{c.classList.toggle("active");const g=this.getMyCommunityDisplayName();await O(t.id,d,this.currentUser.uid,g,this.role)}catch(g){console.error("Error toggling reaction:",g),p.danger("حدث خطأ أثناء تسجيل التفاعل.")}})});const o=e.querySelector('[data-action="view-reactors"]');o&&o.addEventListener("click",()=>{this.openReactorsModal(t.id)});const n=e.querySelector('[data-action="view-teacher-followers"]');n&&n.addEventListener("click",()=>{const c=n.dataset.teacherId,d=n.dataset.teacherName;this.openFollowersModal(c,d)});const a=e.querySelector('[data-action="toggle-comments"]');a&&a.addEventListener("click",()=>{const c=document.getElementById(`commentsSection-${t.id}`);c&&(this.expandedComments.has(t.id)?(this.expandedComments.delete(t.id),c.style.display="none"):(this.expandedComments.add(t.id),c.style.display="block",this.subscribeCommentsForPost(t.id)))}),this.expandedComments.has(t.id)&&this.subscribeCommentsForPost(t.id);const r=e.querySelector(`#commentForm-${t.id}`);r&&r.addEventListener("submit",async c=>{c.preventDefault();const d=document.getElementById(`commentInput-${t.id}`);if(!d||!d.value.trim())return;const g=d.value.trim();d.value="";try{const h=this.getMyCommunityDisplayName();await q(t.id,{text:g,authorId:this.currentUser.uid,authorName:h,authorRole:this.role}),p.success("تم إرسال تعليقك بنجاح! 💬")}catch(h){console.error("Error adding comment:",h),p.danger(h.message||"فشل إرسال التعليق"),d.value=g}});const l=e.querySelector('[data-action="toggle-pin"]');l&&l.addEventListener("click",async()=>{const c=l.dataset.pinned==="true";try{await _(t.id,c),p.success(c?"تم إلغاء تثبيت المنشور.":"تم تثبيت المنشور في أعلى المجتمع! 📌")}catch(d){console.error("Error toggling pin:",d),p.danger("حدث خطأ أثناء تعديل حالة التثبيت.")}});const i=e.querySelector('[data-action="toggle-lock"]');i&&i.addEventListener("click",async()=>{const c=i.dataset.locked==="true";try{await Q(t.id,!c),p.success(c?"تم فتح التعليقات على المنشور.":"تم قفل التعليقات على المنشور. 🔒")}catch(d){console.error("Error toggling lock:",d),p.danger("حدث خطأ أثناء قفل/فتح التعليقات.")}});const u=e.querySelector('[data-action="delete-post"]');u&&u.addEventListener("click",()=>{S({title:"حذف المنشور؟",message:"هل أنت متأكد من حذف هذا المنشور وجميع التعليقات التابعة له نهائياً؟",confirmText:"نعم، احذف",confirmClass:"btn-danger",onConfirm:async()=>{try{await V(t.id,this.currentUser.uid,this.role),this.allPosts=this.allPosts.filter(c=>c.id!==t.id),e.remove(),this.updateStatsCounters(),this.updateUserStatsCounters(),p.success("تم حذف المنشور بنجاح. 🗑️")}catch(c){console.error("Error deleting post:",c),p.danger(c.message||"حدث خطأ أثناء حذف المنشور.")}}})});const m=e.querySelector('[data-action="toggle-follow"]');m&&m.addEventListener("click",async c=>{var h;c.stopPropagation();const d=m.dataset.authorId,g=m.dataset.authorName||"المعلم";if(!((h=this.currentUser)!=null&&h.uid)){p.warning("يرجى تسجيل الدخول أولاً لتتمكن من متابعة المعلمين.");return}if(d===this.currentUser.uid){p.warning("لا يمكنك متابعة نفسك.");return}m.disabled=!0;try{const b=this.getMyCommunityDisplayName();(await B(this.currentUser.uid,d,b,this.role,g,"teacher")).isFollowing?(this.followingUserIds.add(d),p.success(`أنت الآن تتابع ${g} بنجاح ✨`)):(this.followingUserIds.delete(d),p.info(`تم إلغاء متابعة ${g}.`)),this.updateFollowButtonsUI(),this.updateUserStatsCounters()}catch(b){console.error("Error toggling follow:",b),p.danger(b.message||"حدث خطأ أثناء تحديث حالة المتابعة.")}finally{m.disabled=!1}})}updateFollowButtonsUI(){document.querySelectorAll('[data-action="toggle-follow"]').forEach(e=>{const s=e.dataset.authorId;if(!s)return;this.followingUserIds.has(s)?(e.classList.add("following"),e.setAttribute("title","إلغاء المتابعة"),e.innerHTML='<i data-lucide="user-check" style="width: 13px; height: 13px;"></i><span class="btn-text">مُتابَع ✓</span>'):(e.classList.remove("following"),e.setAttribute("title","متابعة المعلم"),e.innerHTML='<i data-lucide="user-plus" style="width: 13px; height: 13px;"></i><span class="btn-text">متابعة +</span>'),f(e)})}updateFollowerCountBadgesUI(){document.querySelectorAll("[data-follower-count-for]").forEach(e=>{const s=e.getAttribute("data-follower-count-for");if(s){const o=this.followersCountsMap.get(s)||0;e.textContent=o}})}subscribeCommentsForPost(t){if(this.commentsUnsubs.has(t))return;const e=document.getElementById(`commentsList-${t}`),s=G(t,o=>{if(this.commentsCache.set(t,o),!e)return;if(o.length===0){e.innerHTML=`
          <div style="text-align: center; color: var(--text-muted); padding: 0.6rem; font-size: 0.8rem; background: var(--bg-primary); border-radius: 6px;">
            لا توجد تعليقات بعد، كن أول من يترك تعليقاً!
          </div>
        `;return}e.innerHTML=o.map(a=>{const r=a.authorRole==="admin",l=a.authorId===this.currentUser.uid,i=this.isAdmin||l,u=A(a.createdAt),m=l?this.getMyCommunityDisplayName():a.authorName||"عضو",c=(m||"م").trim().charAt(0);return`
          <div class="comment-item" style="display: flex; gap: 0.6rem; background: var(--bg-primary); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); position: relative;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: ${r?"rgba(234,179,8,0.2)":"rgba(14,165,233,0.15)"}; color: ${r?"#b45309":"var(--primary-color)"}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; flex-shrink: 0;">
              ${c}
            </div>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <strong style="font-size: 0.84rem; color: var(--text-primary);">${this.escapeHtml(m)}</strong>
                  <span class="badge" style="background: ${r?"rgba(234,179,8,0.18)":"rgba(14,165,233,0.1)"}; color: ${r?"#b45309":"var(--primary-color)"}; font-size: 0.65rem; padding: 0.1rem 0.35rem;">
                    ${r?"الإدارة":"معلم"}
                  </span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <span style="font-size: 0.7rem; color: var(--text-muted);">${u}</span>
                  ${i?`
                    <button type="button" class="btn-icon-subtle" data-action="delete-comment" data-post-id="${t}" data-comment-id="${a.id}" title="حذف التعليق" style="background: transparent; border: none; cursor: pointer; color: var(--danger); padding: 2px;">
                      <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
                    </button>
                  `:""}
                </div>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.5; word-break: break-word;">
                ${this.formatPostText(a.text)}
              </div>
            </div>
          </div>
        `}).join(""),e.querySelectorAll('[data-action="delete-comment"]').forEach(a=>{a.addEventListener("click",()=>{const r=a.dataset.commentId;S({title:"حذف التعليق؟",message:"هل أنت متأكد من رغبتك في حذف هذا التعليق؟",confirmText:"حذف",confirmClass:"btn-danger",onConfirm:async()=>{var l;try{await Y(t,r,this.currentUser.uid,this.role),(l=a.closest(".comment-item"))==null||l.remove(),p.success("تم حذف التعليق بنجاح.")}catch(i){console.error("Error deleting comment:",i),p.danger(i.message||"حدث خطأ أثناء حذف التعليق.")}}})})}),f(e)});this.commentsUnsubs.set(t,s)}openReactorsModal(t){this.activeReactorsPostId=t,this.currentReactorFilter="all";const e=document.getElementById("reactorsModal");e&&(e.style.display="flex",this.renderReactorsList())}closeReactorsModal(){const t=document.getElementById("reactorsModal");t&&(t.style.display="none"),this.activeReactorsPostId=null}renderReactorsList(){const t=this.allPosts.find(i=>i.id===this.activeReactorsPostId),e=document.getElementById("reactorsModalBody"),s=document.getElementById("reactorsTabsContainer");if(!e||!t)return;const o=t.reactors||{};let n=Object.values(o);const a=t.reactions||{};Object.keys(a).forEach(i=>{(a[i]||[]).forEach(m=>{var c;if(!o[m]){const d=m===this.currentUser.uid,g=m===t.authorId,h=d?this.getMyCommunityDisplayName():g?t.authorName||"المؤلف":"معلم معتمد",b=d?this.role:g?t.authorRole:"teacher";n.push({uid:m,name:h,role:b,reactionType:i,reactedAt:(c=t.updatedAt)!=null&&c.seconds?t.updatedAt.seconds*1e3:Date.now()})}})});const r={all:n.length,like:n.filter(i=>i.reactionType==="like").length,love:n.filter(i=>i.reactionType==="love").length,idea:n.filter(i=>i.reactionType==="idea").length,clap:n.filter(i=>i.reactionType==="clap").length};s&&(s.innerHTML=`
        <button type="button" class="reactors-tab-btn ${this.currentReactorFilter==="all"?"active":""}" data-type="all">
          <span>الكل</span>
          <span class="badge" style="background: rgba(0,0,0,0.06); font-size: 0.7rem; padding: 1px 5px; border-radius: 99px;">${r.all}</span>
        </button>
        <button type="button" class="reactors-tab-btn ${this.currentReactorFilter==="like"?"active":""}" data-type="like">
          <span>👍</span>
          <span class="badge" style="background: rgba(0,0,0,0.06); font-size: 0.7rem; padding: 1px 5px; border-radius: 99px;">${r.like}</span>
        </button>
        <button type="button" class="reactors-tab-btn ${this.currentReactorFilter==="love"?"active":""}" data-type="love">
          <span>❤️</span>
          <span class="badge" style="background: rgba(0,0,0,0.06); font-size: 0.7rem; padding: 1px 5px; border-radius: 99px;">${r.love}</span>
        </button>
        <button type="button" class="reactors-tab-btn ${this.currentReactorFilter==="idea"?"active":""}" data-type="idea">
          <span>💡</span>
          <span class="badge" style="background: rgba(0,0,0,0.06); font-size: 0.7rem; padding: 1px 5px; border-radius: 99px;">${r.idea}</span>
        </button>
        <button type="button" class="reactors-tab-btn ${this.currentReactorFilter==="clap"?"active":""}" data-type="clap">
          <span>👏</span>
          <span class="badge" style="background: rgba(0,0,0,0.06); font-size: 0.7rem; padding: 1px 5px; border-radius: 99px;">${r.clap}</span>
        </button>
      `,s.querySelectorAll(".reactors-tab-btn").forEach(i=>{i.addEventListener("click",()=>{this.currentReactorFilter=i.dataset.type,this.renderReactorsList()})}));let l=n;if(this.currentReactorFilter!=="all"&&(l=n.filter(i=>i.reactionType===this.currentReactorFilter)),l.length===0){e.innerHTML=`
        <div style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">
          <i data-lucide="heart-off" style="width: 36px; height: 36px; margin-bottom: 0.5rem; opacity: 0.4;"></i>
          <p style="font-size: 0.88rem; margin: 0;">لا يوجد متفاعلون في هذا التصنيف بعد.</p>
        </div>
      `,f(e);return}e.innerHTML=l.map(i=>{var h;const u=((h=L[i.reactionType])==null?void 0:h.emoji)||"👍",m=i.role==="admin",c=(i.name||"م").trim().charAt(0),d=i.uid===this.currentUser.uid,g=d?this.getMyCommunityDisplayName():i.name||"معلم";return`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; border-bottom: 1px solid var(--border-color); gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div style="position: relative;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: ${m?"rgba(234, 179, 8, 0.18)":"rgba(14, 165, 233, 0.12)"}; color: ${m?"#b45309":"var(--primary-color)"}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem;">
                ${c}
              </div>
              <span style="position: absolute; bottom: -3px; right: -3px; font-size: 0.9rem; line-height: 1;">${u}</span>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                <strong style="font-size: 0.88rem; color: var(--text-primary);">${this.escapeHtml(g)}</strong>
                ${d?'<span class="badge" style="background: rgba(16,185,129,0.15); color: #059669; font-size: 0.65rem;">أنت</span>':""}
              </div>
              <span class="badge" style="background: ${m?"rgba(234, 179, 8, 0.18)":"rgba(14, 165, 233, 0.1)"}; color: ${m?"#b45309":"var(--primary-color)"}; font-size: 0.65rem; padding: 0.1rem 0.35rem; margin-top: 0.2rem; display: inline-block;">
                ${m?"👑 الإدارة العامة":"👨‍🏫 معلم معتمد"}
              </span>
            </div>
          </div>
          <span style="font-size: 1.15rem;">${u}</span>
        </div>
      `}).join(""),f(e)}async openFollowersModal(t,e){const s=document.getElementById("followersModal"),o=document.getElementById("followersModalList"),n=document.getElementById("followersModalTitle");if(!(!s||!o)){if(n){const a=t===this.currentUser.uid;n.textContent=a?"قائمة المتابعين لحسابي (Followers)":`المتابعون للمعلم: ${e||""}`}o.innerHTML=`
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <div class="spinner" style="margin: 0 auto 0.5rem auto; width: 24px; height: 24px; border-width: 2px;"></div>
        <p style="font-size: 0.85rem;">جاري تحميل قائمة المتابعين...</p>
      </div>
    `,s.style.display="flex";try{const a=await R(t);if(a.length===0){o.innerHTML=`
          <div style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">
            <i data-lucide="users" style="width: 38px; height: 38px; margin-bottom: 0.5rem; opacity: 0.35;"></i>
            <p style="font-size: 0.9rem; font-weight: 700; margin: 0 0 0.25rem 0;">لا يوجد متابعون بعد</p>
            <p style="font-size: 0.78rem; margin: 0;">شارك أفكاراً وتجارب مميزة في المجتمع لزيادة متابعيك!</p>
          </div>
        `,f(o);return}o.innerHTML=a.map(r=>{const l=r.followerId===this.currentUser.uid,i=this.followingUserIds.has(r.followerId),u=l?this.getMyCommunityDisplayName():r.followerName||"معلم";return`
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--border-color); gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(14, 165, 233, 0.15); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem;">
                ${(u||"م").trim().charAt(0)}
              </div>
              <div>
                <strong style="font-size: 0.88rem; color: var(--text-primary);">${this.escapeHtml(u)}</strong>
                <div style="font-size: 0.7rem; color: var(--text-muted);">معلم معتمد بالمنظومة</div>
              </div>
            </div>

            ${l?'<span class="badge" style="background: rgba(16,185,129,0.15); color: #059669; font-size: 0.7rem;">حسابك</span>':`
              <button type="button" class="btn-follow ${i?"following":""}" data-action="modal-toggle-follow" data-target-id="${r.followerId}" data-target-name="${this.escapeHtml(r.followerName)}">
                <i data-lucide="${i?"user-check":"user-plus"}" style="width: 12px; height: 12px;"></i>
                <span>${i?"مُتابَع ✓":"رد المتابعة +"}</span>
              </button>
            `}
          </div>
        `}).join(""),o.querySelectorAll('[data-action="modal-toggle-follow"]').forEach(r=>{r.addEventListener("click",async()=>{const l=r.dataset.targetId,i=r.dataset.targetName;r.disabled=!0;try{const u=this.getMyCommunityDisplayName();(await B(this.currentUser.uid,l,u,this.role,i,"teacher")).isFollowing?(this.followingUserIds.add(l),r.classList.add("following"),r.innerHTML='<i data-lucide="user-check" style="width: 12px; height: 12px;"></i><span>مُتابَع ✓</span>',p.success(`تمت متابعة ${i} بنجاح ✨`)):(this.followingUserIds.delete(l),r.classList.remove("following"),r.innerHTML='<i data-lucide="user-plus" style="width: 12px; height: 12px;"></i><span>رد المتابعة +</span>',p.info(`تم إلغاء متابعة ${i}.`)),this.updateFollowButtonsUI(),this.updateUserStatsCounters(),f(r)}catch(u){p.danger("خطأ في تحديث المتابعة: "+u.message)}finally{r.disabled=!1}})}),f(o)}catch(a){o.innerHTML=`<p style="color: var(--danger); text-align: center; padding: 1rem;">فشل التحميل: ${a.message}</p>`}}}closeFollowersModal(){const t=document.getElementById("followersModal");t&&(t.style.display="none")}async openFollowingModal(t){const e=document.getElementById("followingModal"),s=document.getElementById("followingModalList");if(!(!e||!s)){s.innerHTML=`
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <div class="spinner" style="margin: 0 auto 0.5rem auto; width: 24px; height: 24px; border-width: 2px;"></div>
        <p style="font-size: 0.85rem;">جاري تحميل قائمة المتابَعين...</p>
      </div>
    `,e.style.display="flex";try{const o=await Z(t);if(o.length===0){s.innerHTML=`
          <div style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">
            <i data-lucide="user-x" style="width: 38px; height: 38px; margin-bottom: 0.5rem; opacity: 0.35;"></i>
            <p style="font-size: 0.9rem; font-weight: 700; margin: 0 0 0.25rem 0;">أنت لا تتابع أحداً حالياً</p>
            <p style="font-size: 0.78rem; margin: 0;">تابع زملاءك المعلمين لمشاهدة منشوراتهم وتجاربهم فور نشرها!</p>
          </div>
        `,f(s);return}s.innerHTML=o.map(n=>`
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--border-color); gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: #059669; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem;">
                ${(n.followingName||"م").trim().charAt(0)}
              </div>
              <div>
                <strong style="font-size: 0.88rem; color: var(--text-primary);">${n.followingName}</strong>
                <div style="font-size: 0.7rem; color: var(--text-muted);">معلم معتمد بالأكاديمية</div>
              </div>
            </div>

            <button type="button" class="btn-follow following" data-action="modal-unfollow" data-target-id="${n.followingId}" data-target-name="${n.followingName}">
              <i data-lucide="user-x" style="width: 12px; height: 12px;"></i>
              <span>إلغاء المتابعة</span>
            </button>
          </div>
        `).join(""),s.querySelectorAll('[data-action="modal-unfollow"]').forEach(n=>{n.addEventListener("click",async()=>{const a=n.dataset.targetId,r=n.dataset.targetName;n.disabled=!0;try{await B(this.currentUser.uid,a),this.followingUserIds.delete(a),n.closest("div").style.opacity="0.4",n.textContent="تم الإلغاء",p.info(`تم إلغاء متابعة ${r}.`),this.updateFollowButtonsUI(),this.updateUserStatsCounters()}catch(l){p.danger("خطأ: "+l.message)}})}),f(s)}catch(o){s.innerHTML=`<p style="color: var(--danger); text-align: center; padding: 1rem;">فشل التحميل: ${o.message}</p>`}}}closeFollowingModal(){const t=document.getElementById("followingModal");t&&(t.style.display="none")}openEditProfileModal(){const t=document.getElementById("editCommunityProfileModal"),e=document.getElementById("editCommunityNameInput"),s=document.getElementById("editCommunityTitleInput"),o=document.getElementById("modalRealAccountNameLabel"),n=document.getElementById("btnResetToOriginalName");if(!t)return;const a=this.currentUser.realName||this.currentUser.name||(this.isAdmin?"مدير الأكاديمية":"معلم معتمد");o&&(o.textContent=a),e&&(e.value=this.currentUser.communityDisplayName||"",e.placeholder=a),s&&(s.value=this.currentUser.communityTitle||""),n&&(n.onclick=()=>{e&&(e.value="",e.focus())}),t.style.display="flex",setTimeout(()=>e==null?void 0:e.focus(),150)}closeEditProfileModal(){const t=document.getElementById("editCommunityProfileModal");t&&(t.style.display="none")}async handleEditProfileSubmit(t){t.preventDefault();const e=document.getElementById("editCommunityNameInput"),s=document.getElementById("editCommunityTitleInput"),o=document.getElementById("btnSubmitEditProfile"),n=(e==null?void 0:e.value.trim())||"",a=(s==null?void 0:s.value.trim())||"";o&&(o.disabled=!0,o.innerHTML='<div class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></div> <span>جاري الحفظ...</span>');try{await K(this.currentUser.uid,{communityDisplayName:n||null,communityTitle:a}),this.currentUser.communityDisplayName=n||null,this.currentUser.communityTitle=a,this.updateProfileCardDOM(),this.closeEditProfileModal(),n?p.success("تم حفظ اسم الظهور في مجتمع الأكاديمية بنجاح! ✨ (اسمك الرسمي في المنظومة محفوظ كما هو)"):p.success("تمت العودة لاستخدام اسمك الرسمي في مجتمع المعلمين."),this.renderPostsList()}catch(r){console.error("Error updating community profile:",r),p.danger(r.message||"حدث خطأ أثناء حفظ التعديلات.")}finally{o&&(o.disabled=!1,o.innerHTML='<i data-lucide="check"></i> <span>حفظ اسم الظهور</span>',f(o))}}openCreatePostModal(){const t=document.getElementById("createPostModal");if(!t)return;t.style.display="flex";const e=document.getElementById("postContentInput");e&&setTimeout(()=>e.focus(),150)}closeCreatePostModal(){const t=document.getElementById("createPostModal");t&&(t.style.display="none");const e=document.getElementById("createPostForm");e&&e.reset();const s=document.getElementById("postTitleInput"),o=document.getElementById("postContentInput");s&&(s.value=""),o&&(o.value="")}async handleCreatePostSubmit(t){t.preventDefault();const e=document.getElementById("postTitleInput"),s=document.getElementById("postContentInput"),o=document.getElementById("postCategorySelect"),n=document.getElementById("postPinCheckbox"),a=document.getElementById("postAllowCommentsCheckbox"),r=document.getElementById("btnSubmitCreatePost"),l=e?e.value.trim():"",i=s?s.value.trim():"",u=o?o.value:"general",m=!!(n&&n.checked),c=a?a.checked:!0;if(!i){p.warning("يرجى كتابة محتوى المنشور.");return}r&&(r.disabled=!0,r.innerHTML=`
        <div class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></div>
        <span>جاري النشر...</span>
      `);try{const d=this.getMyCommunityDisplayName();await W({title:l,content:i,category:u,authorId:this.currentUser.uid,authorName:d,authorRole:this.role,authorPhotoURL:this.currentUser.photoURL||this.currentUser.photoUrl||this.currentUser.avatar||"",isPinned:this.isAdmin&&m,isOfficial:this.isAdmin&&(u==="announcement"||m),allowComments:c}),this.isAdmin?p.success("تم نشر التوجيه وإرسال إشعار فوري لجميع المعلمين بنجاح! 🚀"):p.success("تم نشر مشاركتك في ملتقى الأكاديمية بنجاح! 🚀"),e&&(e.value=""),s&&(s.value=""),this.closeCreatePostModal()}catch(d){console.error("Error creating community post:",d),p.danger(d.message||"حدث خطأ أثناء نشر المنشور.")}finally{r&&(r.disabled=!1,r.innerHTML=`
          <i data-lucide="send"></i>
          <span>نشر المشاركة</span>
        `,f(r))}}destroy(){this.postsUnsub&&this.postsUnsub(),this.followingUnsub&&this.followingUnsub(),this.followersMapUnsub&&this.followersMapUnsub(),this.commentsUnsubs.forEach(t=>{typeof t=="function"&&t()}),this.commentsUnsubs.clear()}}export{rt as C};
