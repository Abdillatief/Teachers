import { quranSurahs, buildReviewSuggestionText } from './quranData.js';

/**
 * خانة «الماضي» في ويدجيت تسجيل الحصة — اختيار السورة وآخر آية مثل خانة الحفظ،
 * مع اقتراح تلقائي لا يمسح تعديل المعلم.
 */
export function createReviewPicker(onChange = () => {}) {
  const surahSelect = document.getElementById('reviewSurahId');
  const verseInput = document.getElementById('reviewVerse');

  const emptyPicker = {
    getText: () => '',
    applySuggestion: () => {},
    resetManual: () => {}
  };

  if (!surahSelect || !verseInput) return emptyPicker;

  if (!surahSelect.options.length) {
    surahSelect.innerHTML = quranSurahs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  }
  if (!surahSelect.value) surahSelect.value = '1';

  const isManual = () => surahSelect.dataset.manual === 'true' || verseInput.dataset.manual === 'true';

  const markManual = () => {
    surahSelect.dataset.manual = 'true';
    verseInput.dataset.manual = 'true';
    onChange();
  };

  const syncVerseLimit = () => {
    const surah = quranSurahs.find(s => s.id === (parseInt(surahSelect.value, 10) || 0));
    if (!surah) return;
    verseInput.max = surah.verses;
    verseInput.placeholder = `1 إلى ${surah.verses}`;
    if ((parseInt(verseInput.value, 10) || 0) > surah.verses) verseInput.value = surah.verses;
  };

  surahSelect.addEventListener('change', () => {
    markManual();
    syncVerseLimit();
  });
  verseInput.addEventListener('input', markManual);

  syncVerseLimit();

  return {
    getText: () => buildReviewSuggestionText({ surahId: surahSelect.value, endVerse: verseInput.value }),
    applySuggestion(prediction) {
      if (!prediction || isManual()) return;
      if (prediction.surahId) surahSelect.value = String(prediction.surahId);
      verseInput.value = prediction.endVerse ? String(prediction.endVerse) : '';
      syncVerseLimit();
    },
    resetManual() {
      surahSelect.dataset.manual = 'false';
      verseInput.dataset.manual = 'false';
    }
  };
}
