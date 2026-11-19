import { CHAT_QUESTIONS } from "@/config/chat-questions";
import { splitDisplaySentences } from "@/lib/sentences";

/**
 * 추천 이유 문장을 질문에 배분해 대화 대본을 만든다.
 *
 * 추천 이유는 3문장(객관 / 분위기 / 활동)으로 생성하지만 검증이 2~5문장을 허용하므로,
 * 문장 수에 따라 유연하게 매핑한다.
 *
 *   2문장 → Q1(객관), Q3(활동)
 *   3문장 → Q1, Q2, Q3
 *   4문장 이상 → Q1~Q3 를 쓰고, 남는 문장은 마지막 답변에 말풍선으로 더 붙인다
 *
 * 1문장은 검증에서 막히지만(2문장 미만 0점) 화면이 죽지 않도록 Q1 하나로 처리한다.
 *
 * @returns {Array<{id: string, text: string, sentences: string[]}>}
 */
export function buildTurns(reason) {
  const sentences = splitDisplaySentences(reason);
  if (!sentences.length) return [];

  const [q1, q2, q3] = CHAT_QUESTIONS;

  if (sentences.length === 1) return [{ ...q1, sentences: [sentences[0]] }];
  if (sentences.length === 2) {
    return [
      { ...q1, sentences: [sentences[0]] },
      { ...q3, sentences: [sentences[1]] },
    ];
  }
  return [
    { ...q1, sentences: [sentences[0]] },
    { ...q2, sentences: [sentences[1]] },
    { ...q3, sentences: sentences.slice(2) },
  ];
}
