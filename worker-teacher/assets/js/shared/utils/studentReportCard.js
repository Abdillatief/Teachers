import { db } from '../../config/firebase.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Toast } from './toast.js';
import { quranSurahs } from './quranData.js';

/**
 * Returns array of last 12 months in Arabic with format YYYY-MM and label
 */
export function getRecentMonthsList() {
  const months = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const list = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mIdx = d.getMonth();
    const year = d.getFullYear();
    const monthFormatted = String(mIdx + 1).padStart(2, '0');
    const key = `${year}-${monthFormatted}`;
    const label = `${months[mIdx]} ${year}`;
    list.push({ key, label, year, month: mIdx });
  }
  return list;
}

/**
 * Creates and displays the Parent Monthly Progress Report Modal
 * @param {string} studentId 
 * @param {Object} studentData 
 */
export async function openStudentReportModal(studentId, studentData) {
  let modalOverlay = document.getElementById('studentReportModalOverlay');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'studentReportModalOverlay';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
      display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(0,0,0,0.6); z-index: 10005; align-items: center; justify-content: center; padding: 1rem;
      backdrop-filter: blur(4px);
    `;
    document.body.appendChild(modalOverlay);
  }

  const monthsList = getRecentMonthsList();
  const currentMonthObj = monthsList[0];

  modalOverlay.innerHTML = `
    <div class="modal-card" style="max-width: 740px; width: 100%; border-radius: 18px; padding: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); box-shadow: 0 12px 35px rgba(0,0,0,0.18); max-height: 92vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.85rem;">
        <h3 style="font-weight: 800; color: var(--primary-color); margin: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1.2rem;">
          <span style="background: linear-gradient(135deg, rgba(13, 148, 136, 0.2) 0%, rgba(13, 148, 136, 0.05) 100%); padding: 0.4rem; border-radius: 10px; display: inline-flex; align-items: center;">
            <i data-lucide="award" style="width:22px;height:22px; color:var(--primary-color);"></i>
          </span>
          بطاقة التقرير الشهري المعتمدة للوالدين
        </h3>
        <span id="btnCloseReportModal" style="cursor: pointer; padding: 0.35rem; display: flex; align-items: center; justify-content: center; background: var(--bg-primary); border-radius: 50%;">
          <i data-lucide="x" style="color: var(--text-muted); width:20px;height:20px;"></i>
        </span>
      </div>

      <!-- Controls Block -->
      <div style="background: var(--bg-primary); border: 1px dashed var(--border-color); border-radius: 14px; padding: 1.1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
          <h4 style="font-size: 0.88rem; font-weight: 800; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="sliders" style="width:16px;height:16px; color:var(--primary-color);"></i> إعدادات التقرير وتخصيص الشهر:
          </h4>
          <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-card); padding: 0.3rem 0.6rem; border-radius: 10px; border: 1px solid var(--primary-color);">
            <label style="font-size: 0.8rem; font-weight: 800; color: var(--primary-color); white-space: nowrap;">🗓️ اختيار شهر التقرير:</label>
            <select id="reportMonthSelect" class="form-control" style="font-size: 0.85rem; font-weight: 800; padding: 0.25rem 0.5rem; background: transparent; color: var(--primary-color); border: none; cursor: pointer;">
              ${monthsList.map(m => `<option value="${m.key}">${m.label}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem;">
          <div class="form-group" style="margin: 0;">
            <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem; display:block;">مستوى الترتيل والتلاوة</label>
            <select id="editTilawaScore" class="form-control" style="font-size:0.82rem; padding: 0.35rem;">
              <option value="ممتاز (95%) ⭐⭐⭐⭐⭐" selected>ممتاز (95%) ⭐⭐⭐⭐⭐</option>
              <option value="جيد جداً (85%) ⭐⭐⭐⭐">جيد جداً (85%) ⭐⭐⭐⭐</option>
              <option value="جيد (75%) ⭐⭐⭐">جيد (75%) ⭐⭐⭐</option>
              <option value="يحتاج مراجعة (60%) ⭐⭐">يحتاج مراجعة (60%) ⭐⭐</option>
            </select>
          </div>

          <div class="form-group" style="margin: 0;">
            <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem; display:block;">مستوى الحفظ والمراجعة</label>
            <select id="editHifzScore" class="form-control" style="font-size:0.82rem; padding: 0.35rem;">
              <option value="ممتاز (100%) ⭐⭐⭐⭐⭐" selected>ممتاز (100%) ⭐⭐⭐⭐⭐</option>
              <option value="جيد جداً (85%) ⭐⭐⭐⭐">جيد جداً (85%) ⭐⭐⭐⭐</option>
              <option value="جيد (75%) ⭐⭐⭐">جيد (75%) ⭐⭐⭐</option>
              <option value="يحتاج تركيز (60%) ⭐⭐">يحتاج تركيز (60%) ⭐⭐</option>
            </select>
          </div>

          <div class="form-group" style="margin: 0;">
            <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem; display:block;">مستوى الالتزام والحضور</label>
            <select id="editCommitmentScore" class="form-control" style="font-size:0.82rem; padding: 0.35rem;">
              <option value="التزام تام (100%) 🟢" selected>التزام تام (100%) 🟢</option>
              <option value="التزام جيد (85%) 🟡">التزام جيد (85%) 🟡</option>
              <option value="غياب متكرر (70%) 🔴">غياب متكرر (70%) 🔴</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-top: 0.75rem; margin-bottom: 0.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
            <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);">إنجاز السور والآيات القرآنية (مستخرج تلقائياً من سجل المعلم):</label>
            <span style="font-size:0.7rem; color:var(--primary-color); font-weight:600;">تحديث تلقائي ✨</span>
          </div>
          <input type="text" id="editSurahsInput" class="form-control" style="font-size:0.85rem; font-weight:700;" placeholder="مثال: سورة الملك (الآيات حتى 30) ، سورة القلم (من الآية 1 إلى 15)" value="جاري الاستخراج الفوري من السجلات...">
        </div>

        <div class="form-group" style="margin-top: 0.5rem; margin-bottom: 0;">
          <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem; display:block;">توصية وملاحظة المعلم المشرف للوالدين:</label>
          <input type="text" id="editTeacherNote" class="form-control" style="font-size:0.82rem;" value="ما شاء الله، الدارس متميز ومواظب على الحفظ والتلاوة، نوصي باستمرار المراجعة المنزلية.">
        </div>
      </div>

      <div style="text-align: center; padding: 2rem; color: var(--text-muted);" id="reportCardLoading">
        <i data-lucide="loader" class="spin" style="width:32px;height:32px; margin-bottom: 0.75rem; color: var(--primary-color);"></i>
        <p style="margin:0; font-weight:700; font-size:0.95rem; color:var(--text-primary);">جاري تحليل واستخراج سجلات الدارس لشهر <span id="loadingMonthName">${currentMonthObj.label}</span>...</p>
      </div>

      <div id="reportCardContent" style="display: none;">
        <!-- PRINTABLE / PREVIEW CARD FRAME -->
        <div id="studentReportCardPreview" style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border: 2px solid var(--primary-color); border-radius: 16px; padding: 1.5rem; color: #1e293b; font-family: inherit; position: relative; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06);">
          <!-- Decorative Top Accent -->
          <div style="position: absolute; top:0; right:0; left:0; height: 6px; background: linear-gradient(90deg, var(--primary-color), #0f766e, var(--secondary-color));"></div>

          <!-- Card Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 48px; height: 48px; background: rgba(13, 148, 136, 0.1); color: var(--primary-color); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.3rem;">
                📖
              </div>
              <div>
                <h2 style="font-weight: 900; color: #0f172a; margin: 0; font-size: 1.25rem; line-height: 1.2;">أكاديمية سبيل لعلوم القرآن</h2>
                <span style="font-size: 0.78rem; color: #64748b; font-weight: 600;">Sabeel Quranic Academy • تقرير الأداء الشهري للدارس</span>
              </div>
            </div>
            <div style="text-align: left; background: var(--primary-light); color: var(--primary-color); padding: 0.4rem 0.95rem; border-radius: 20px; font-weight: 800; font-size: 0.85rem; border: 1px solid var(--primary-color);">
              🗓️ <span id="cardMonthLabel">${currentMonthObj.label}</span>
            </div>
          </div>

          <!-- Student & Teacher Meta -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.75rem; background: #f1f5f9; padding: 0.85rem 1rem; border-radius: 12px; margin-bottom: 1.25rem; font-size: 0.85rem;">
            <div>
              <span style="color: #64748b; font-size: 0.75rem; display: block; font-weight: 600;">اسم الدارس الكريم:</span>
              <strong style="color: #0f172a; font-size: 1.05rem;" id="cardStudentName">${studentData.name || 'الدارس'}</strong>
            </div>
            <div>
              <span style="color: #64748b; font-size: 0.75rem; display: block; font-weight: 600;">المعلم المشرف:</span>
              <strong style="color: var(--primary-color); font-size: 0.95rem;" id="cardTeacherName">${studentData.teacherName || 'المعلم المشرف'}</strong>
            </div>
            <div>
              <span style="color: #64748b; font-size: 0.75rem; display: block; font-weight: 600;">الحصص المنجزة بالشهـر:</span>
              <strong style="color: #059669; font-size: 0.95rem;" id="cardSessionsCount">0 حصة</strong>
            </div>
          </div>

          <!-- Surahs Memorized Box -->
          <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 0.9rem 1.1rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.85rem;">
            <div style="width: 44px; height: 44px; background: #2563eb; color: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 900; flex-shrink: 0;">
              ✨
            </div>
            <div style="flex:1;">
              <span style="font-size: 0.78rem; color: #1e40af; font-weight: 800; display: block; margin-bottom:0.15rem;">إنجاز السور والآيات القرآنية المسجلة هذا الشهر:</span>
              <strong style="font-size: 1rem; color: #1e3a8a; line-height: 1.4;" id="cardSurahsDisplay">جاري التحميل...</strong>
            </div>
          </div>

          <!-- Rating Criteria Grid -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.85rem; margin-bottom: 1.25rem;">
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 0.85rem; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
              <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">🎤</div>
              <span style="font-size: 0.75rem; color: #64748b; font-weight: 700; display: block;">مستوى الترتيل</span>
              <strong style="font-size: 0.85rem; color: #0d9488; margin-top: 0.25rem; display: block;" id="cardTilawaVal">ممتاز (95%) ⭐⭐⭐⭐⭐</strong>
            </div>

            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 0.85rem; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
              <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">🧠</div>
              <span style="font-size: 0.75rem; color: #64748b; font-weight: 700; display: block;">مستوى الحفظ</span>
              <strong style="font-size: 0.85rem; color: #2563eb; margin-top: 0.25rem; display: block;" id="cardHifzVal">ممتاز (100%) ⭐⭐⭐⭐⭐</strong>
            </div>

            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 0.85rem; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
              <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">⏱️</div>
              <span style="font-size: 0.75rem; color: #64748b; font-weight: 700; display: block;">مستوى الالتزام</span>
              <strong style="font-size: 0.85rem; color: #16a34a; margin-top: 0.25rem; display: block;" id="cardCommitmentVal">التزام تام (100%) 🟢</strong>
            </div>
          </div>

          <!-- Teacher Recommendation Box -->
          <div style="background: #f8fafc; border-right: 4px solid var(--primary-color); padding: 0.85rem 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <span style="font-size: 0.75rem; font-weight: 800; color: var(--primary-color); display: block; margin-bottom: 0.25rem;">💬 ملاحظة وتوصية المعلم المشرف:</span>
            <p style="margin: 0; font-size: 0.85rem; color: #334155; line-height: 1.5; font-weight: 600;" id="cardTeacherNoteDisplay">
              ما شاء الله، الدارس متميز ومواظب على الحفظ والتلاوة، نوصي باستمرار المراجعة المنزلية.
            </p>
          </div>

          <!-- Footer Seal -->
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 0.75rem;">
            <span>أكاديمية سبيل - تم الإصدار بنجاح</span>
            <span style="font-weight: 700; color: #64748b;">ختم واعتماد الأكاديمية 📜</span>
          </div>
        </div>

        <!-- Sharing & Actions Toolbar -->
        <div style="display: flex; gap: 0.5rem; margin-top: 1.25rem; flex-wrap: wrap;">
          <button type="button" id="btnShareWhatsApp" class="btn" style="flex: 1.2; background: #25D366; color: white; font-weight: 800; gap: 0.4rem; justify-content: center;">
            <i data-lucide="message-square" style="width:18px;height:18px;"></i> مشاركة عبر الواتساب
          </button>
          
          <button type="button" id="btnPrintReportCard" class="btn btn-primary" style="flex: 1; font-weight: 700; gap: 0.4rem; justify-content: center;">
            <i data-lucide="printer" style="width:18px;height:18px;"></i> طباعة التقرير
          </button>

          <button type="button" id="btnCopyReportText" class="btn btn-secondary" style="flex: 1; font-weight: 700; gap: 0.4rem; justify-content: center;">
            <i data-lucide="copy" style="width:18px;height:18px;"></i> نسخ الملخص
          </button>
        </div>
      </div>
    </div>
  `;

  modalOverlay.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons();

  // Close handler
  document.getElementById('btnCloseReportModal')?.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
  });

  const monthSelect = document.getElementById('reportMonthSelect');
  const editTilawa = document.getElementById('editTilawaScore');
  const editHifz = document.getElementById('editHifzScore');
  const editCommitment = document.getElementById('editCommitmentScore');
  const editSurahs = document.getElementById('editSurahsInput');
  const editNote = document.getElementById('editTeacherNote');

  // Function to load and filter sessions by selected month
  const loadMonthData = async (selectedMonthKey) => {
    document.getElementById('reportCardLoading').style.display = 'block';
    document.getElementById('reportCardContent').style.display = 'none';

    const selectedMonthObj = monthsList.find(m => m.key === selectedMonthKey) || monthsList[0];
    document.getElementById('loadingMonthName').textContent = selectedMonthObj.label;
    document.getElementById('cardMonthLabel').textContent = selectedMonthObj.label;

    try {
      const q = query(
        collection(db, "sessions"),
        where("studentId", "==", studentId)
      );
      const snap = await getDocs(q);

      let completedSessions = 0;
      let totalRatings = 0;
      let ratingCount = 0;
      // Map of surahName -> { maxVerse: number, notesVerseText: string[] }
      const surahMap = new Map();

      snap.forEach(d => {
        const sess = d.data();
        let sessDateStr = sess.date || '';
        
        // Handle Firestore timestamp or JS date string
        if (sess.createdAt && sess.createdAt.toDate) {
          const dObj = sess.createdAt.toDate();
          const y = dObj.getFullYear();
          const m = String(dObj.getMonth() + 1).padStart(2, '0');
          sessDateStr = `${y}-${m}`;
        } else if (sess.date) {
          sessDateStr = sess.date.substring(0, 7); // YYYY-MM
        }

        // Match target YYYY-MM
        if (sessDateStr.startsWith(selectedMonthKey)) {
          if (sess.status === 'completed') {
            completedSessions++;
          }
          if (sess.rating) {
            totalRatings += parseFloat(sess.rating) || 5;
            ratingCount++;
          }

          // Extract explicit Surah name and Verse recorded in session
          const explicitSurah = (sess.surahName || sess.surah || sess.actualSurahName || '').replace(/^سورة\s+/, '').trim();
          const explicitVerse = parseInt(sess.actualVerse || sess.lastMemorizedVerse || sess.verse || sess.endVerse) || 0;

          if (explicitSurah) {
            if (!surahMap.has(explicitSurah)) {
              surahMap.set(explicitSurah, { maxVerse: explicitVerse, notesVerseText: [] });
            } else {
              const current = surahMap.get(explicitSurah);
              if (explicitVerse > current.maxVerse) {
                current.maxVerse = explicitVerse;
              }
            }
          }

          // Search in notes / homework / details for Quran surahs and verse ranges
          const combinedNotes = `${sess.notes || ''} ${sess.homework || ''} ${sess.details || ''}`.trim();
          if (combinedNotes.length > 0) {
            quranSurahs.forEach(surah => {
              const sName = surah.name;
              const isMentioned = combinedNotes.includes(`سورة ${sName}`) || 
                                  combinedNotes.includes(`سوره ${sName}`) || 
                                  (sName.length >= 4 && combinedNotes.includes(sName));
              if (isMentioned) {
                if (!surahMap.has(sName)) {
                  surahMap.set(sName, { maxVerse: 0, notesVerseText: [] });
                }
                // Extract verse ranges from text e.g. "من 1 إلى 20" or "الآية 15"
                const vMatch = combinedNotes.match(/(?:الآيات|الآية|آية|من الآية|من آية|حفظ|إلى الآية)\s*(\d+[\s\-\u2013إلى\s]*\d+|\d+)/i);
                if (vMatch && vMatch[0]) {
                  const existingTexts = surahMap.get(sName).notesVerseText;
                  if (!existingTexts.includes(vMatch[0].trim())) {
                    existingTexts.push(vMatch[0].trim());
                  }
                }
              }
            });
          }
        }
      });

      // Fallback: if surahMap is empty and student has lastMemorizedSurahName
      if (surahMap.size === 0 && studentData.lastMemorizedSurahName) {
        const sName = studentData.lastMemorizedSurahName.replace(/^سورة\s+/, '').trim();
        const vNum = parseInt(studentData.lastMemorizedVerse) || 0;
        surahMap.set(sName, { maxVerse: vNum, notesVerseText: [] });
      }

      // Build formatted list of surahs with recorded ayahs
      const formattedSurahList = [];
      surahMap.forEach((data, sName) => {
        if (data.maxVerse > 0) {
          formattedSurahList.push(`سورة ${sName} (الآيات حتى ${data.maxVerse})`);
        } else if (data.notesVerseText.length > 0) {
          formattedSurahList.push(`سورة ${sName} (${data.notesVerseText[0]})`);
        } else {
          formattedSurahList.push(`سورة ${sName}`);
        }
      });

      let surahsText = "";
      if (formattedSurahList.length > 0) {
        surahsText = formattedSurahList.join(' ، ');
      } else {
        if (completedSessions > 0) {
          surahsText = `تم إنجاز ${completedSessions} حصة حلقة قرآنية خلال الشهر`;
        } else {
          surahsText = "لم تُسجل حصص قرآنية جديدة لهذا الشهر";
        }
      }

      const avgRating = ratingCount > 0 ? (totalRatings / ratingCount) : 5.0;

      // Update state display
      document.getElementById('cardSessionsCount').textContent = `${completedSessions} حصة`;

      editSurahs.value = surahsText;
      document.getElementById('cardSurahsDisplay').textContent = surahsText;

      if (avgRating >= 4.5) {
        editTilawa.value = "ممتاز (95%) ⭐⭐⭐⭐⭐";
        editHifz.value = "ممتاز (100%) ⭐⭐⭐⭐⭐";
      } else if (avgRating >= 3.5) {
        editTilawa.value = "جيد جداً (85%) ⭐⭐⭐⭐";
        editHifz.value = "جيد جداً (85%) ⭐⭐⭐⭐";
      } else {
        editTilawa.value = "جيد (75%) ⭐⭐⭐";
        editHifz.value = "جيد (75%) ⭐⭐⭐";
      }

      document.getElementById('cardTilawaVal').textContent = editTilawa.value;
      document.getElementById('cardHifzVal').textContent = editHifz.value;
      document.getElementById('cardCommitmentVal').textContent = editCommitment.value;
      document.getElementById('cardTeacherNoteDisplay').textContent = editNote.value;

      document.getElementById('reportCardLoading').style.display = 'none';
      document.getElementById('reportCardContent').style.display = 'block';

    } catch (err) {
      console.error("Error generating report card for month:", err);
      Toast.error("حدث خطأ أثناء تحميل بيانات الشهر المحدد");
      document.getElementById('reportCardLoading').style.display = 'none';
    }
  };

  // Sync input controls with preview card live
  const updatePreviewLive = () => {
    document.getElementById('cardTilawaVal').textContent = editTilawa.value;
    document.getElementById('cardHifzVal').textContent = editHifz.value;
    document.getElementById('cardCommitmentVal').textContent = editCommitment.value;
    document.getElementById('cardSurahsDisplay').textContent = editSurahs.value;
    document.getElementById('cardTeacherNoteDisplay').textContent = editNote.value;
  };

  editTilawa.addEventListener('change', updatePreviewLive);
  editHifz.addEventListener('change', updatePreviewLive);
  editCommitment.addEventListener('change', updatePreviewLive);
  editSurahs.addEventListener('input', updatePreviewLive);
  editNote.addEventListener('input', updatePreviewLive);

  monthSelect.addEventListener('change', (e) => {
    loadMonthData(e.target.value);
  });

  // Share via WhatsApp
  document.getElementById('btnShareWhatsApp')?.addEventListener('click', () => {
    const selectedMonthObj = monthsList.find(m => m.key === monthSelect.value) || monthsList[0];
    const phone = studentData.phone ? studentData.phone.replace(/[^0-9]/g, '') : '';
    const text = `📜 *بطاقة التقرير الشهري للدارس: ${studentData.name}*
🏛️ *أكاديمية سبيل القرآنية* (${selectedMonthObj.label})
-----------------------------------------
👤 *الدارس:* ${studentData.name}
👨‍🏫 *المعلم المشرف:* ${studentData.teacherName || 'معلم الأكاديمية'}
📖 *الحصص المنجزة:* ${document.getElementById('cardSessionsCount').textContent}
✨ *السور المحفوظة/المراجعة:* ${editSurahs.value}

📊 *مستويات التقييم الشهرية:*
🎤 *التلاوة والترتيل:* ${editTilawa.value}
🧠 *الحفظ والمراجعة:* ${editHifz.value}
⏱️ *الالتزام والحضور:* ${editCommitment.value}

💬 *توصية المعلم:*
"${editNote.value}"
-----------------------------------------
نسأل الله أن يبارك في عمره وأن يجعله من أهل القرآن.`;

    const encoded = encodeURIComponent(text);
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  });

  // Copy Summary
  document.getElementById('btnCopyReportText')?.addEventListener('click', () => {
    const selectedMonthObj = monthsList.find(m => m.key === monthSelect.value) || monthsList[0];
    const text = `📜 بطاقة التقرير الشهري للدارس: ${studentData.name} (${selectedMonthObj.label})
- المعلم: ${studentData.teacherName || 'معلم الأكاديمية'}
- السور الإنجاز: ${editSurahs.value}
- مستوى الترتيل: ${editTilawa.value}
- مستوى الحفظ: ${editHifz.value}
- مستوى الالتزام: ${editCommitment.value}
- ملاحظة المعلم: ${editNote.value}`;

    navigator.clipboard.writeText(text).then(() => {
      Toast.success("تم نسخ ملخص التقرير بنجاح!");
    });
  });

  // Print Report
  document.getElementById('btnPrintReportCard')?.addEventListener('click', () => {
    const cardHtml = document.getElementById('studentReportCardPreview').outerHTML;
    const printWin = window.open('', '_blank', 'width=800,height=600');
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <title>تقرير شهري - ${studentData.name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 2rem; background: #fff; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${cardHtml}
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  });

  // Initial load for current month
  await loadMonthData(currentMonthObj.key);
}
