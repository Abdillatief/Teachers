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
              ${monthsList.map(m => `<option value="${m.key}">${m.label}</option>`).join('')}
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
        <p style="margin:0; font-weight:600; font-size:0.9rem; color:var(--text-primary);">جاري تحميل سجلات الدارس لشهر <span id="loadingMonthName">${currentMonthObj.label}</span>...</p>
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
              <span id="cardMonthLabel">${currentMonthObj.label}</span>
            </div>
          </div>

          <!-- Student & Teacher Meta -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.75rem; background: var(--bg-primary); padding: 0.85rem 1rem; border-radius: var(--border-radius-sm); margin-bottom: 1.25rem; font-size: 0.85rem; border: 1px solid var(--border-color);">
            <div>
              <span style="color: var(--text-muted); font-size: 0.75rem; display: block;">اسم الدارس:</span>
              <strong style="color: var(--text-primary); font-size: 1rem;" id="cardStudentName">${studentData.name || 'الدارس'}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 0.75rem; display: block;">المعلم المشرف:</span>
              <strong style="color: var(--primary-color); font-size: 0.92rem;" id="cardTeacherName">${studentData.teacherName || 'المعلم المشرف'}</strong>
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
        editTilawa.value = "ممتاز (95%)";
        editHifz.value = "ممتاز (100%)";
      } else if (avgRating >= 3.5) {
        editTilawa.value = "جيد جداً (85%)";
        editHifz.value = "جيد جداً (85%)";
      } else {
        editTilawa.value = "جيد (75%)";
        editHifz.value = "جيد (75%)";
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
    const text = `*بطاقة التقرير الشهري للدارس: ${studentData.name}*
*أكاديمية سبيل القرآنية* (${selectedMonthObj.label})
-----------------------------------------
*الدارس:* ${studentData.name}
*المعلم المشرف:* ${studentData.teacherName || 'معلم الأكاديمية'}
*الحصص المنجزة:* ${document.getElementById('cardSessionsCount').textContent}
*السور المنجزة:* ${editSurahs.value}

*مستويات التقييم الشهرية:*
*التلاوة والترتيل:* ${editTilawa.value}
*الحفظ والمراجعة:* ${editHifz.value}
*الالتزام والحضور:* ${editCommitment.value}

*توصية المعلم:*
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
    const text = `بطاقة التقرير الشهري للدارس: ${studentData.name} (${selectedMonthObj.label})
- المعلم: ${studentData.teacherName || 'معلم الأكاديمية'}
- إنجاز السور: ${editSurahs.value}
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
