/**
 * Thuật toán SuperMemo-2 (SM-2) cho Flashcard Spaced Repetition
 * @param quality Mức độ nhớ (0-5)
 *  0: Hoàn toàn quên
 *  1: Sai, nhưng nhớ ra khi xem đáp án
 *  2: Sai, nhưng cảm giác quen thuộc
 *  3: Đúng, nhưng rất khó khăn (Khó)
 *  4: Đúng, có chút ngập ngừng (Tốt)
 *  5: Đúng, dễ dàng (Dễ)
 * @param repetitions Số lần trả lời đúng liên tiếp
 * @param previousInterval Khoảng thời gian (ngày) trước đó
 * @param previousEaseFactor Hệ số dễ dàng (EF) trước đó, mặc định 2.5
 */
export function calculateSM2(
  quality: number,
  repetitions: number,
  previousInterval: number,
  previousEaseFactor: number = 2.5
) {
  let newRepetitions = repetitions;
  let newInterval = previousInterval;
  let newEaseFactor = previousEaseFactor;

  if (quality >= 3) {
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(previousInterval * previousEaseFactor);
    }
    newRepetitions += 1;
  } else {
    // Trả lời sai (Chất lượng < 3)
    newRepetitions = 0;
    newInterval = 1; // Học lại vào ngày mai (hoặc có thể học lại ngay hôm nay nếu muốn)
  }

  // Cập nhật Ease Factor
  newEaseFactor = previousEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  return { newInterval, newRepetitions, newEaseFactor };
}
