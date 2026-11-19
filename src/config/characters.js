/**
 * 미리 여행 체험에 함께 나올 캐릭터 6종(아저씨 3 + 아줌마 3).
 *
 * ★ `image` 는 **인트로에 나온 그 사람의 사진**이다. 인트로에서 본 얼굴이
 *   선택 화면에서 그대로 이어져야 하고, 생성되는 영상도 실사라 그림체가 맞는다.
 *   영상에 넘기는 레퍼런스 시트는 따로 있다
 *   (public/images/reference_sheets/{장소id}/{캐릭터}.png).
 *
 * `id` 는 영상 생성 요청(requestVideo 의 characterId)에 그대로 실려 나간다.
 * 어느 레퍼런스 그림인지 바로 알 수 있게 **파일명과 같은 이름**으로 두었다.
 * 한번 정하면 바꾸지 않는다.
 *
 * `photoId` 는 인트로 사진 파일 이름이고, `voice` 는 그 사람이 말할 때 쓰는 목소리다
 * (둘 다 src/config/intro.js 가 원본이다).
 *
 * 사진은 전신 세로 비율(대략 3:5)이다. 정사각형 틀에 넣으면 사람이 아주 작게
 * 보이므로 세로 틀에 담는다(ExperienceSelect 참고).
 */
import { introCharacter, introPhoto } from "@/config/intro";

export const CHARACTERS = [
  {
    id: "MALE_1",
    name: "박만수 회장",
    tagline: "오지 탐험 대장",
    photoId: "male_01",
    image: introPhoto("male_01"),
    voice: introCharacter("male_01")?.voice,
  },
  {
    id: "MALE_2",
    name: "정상길 총무",
    tagline: "핫플 인증러",
    photoId: "male_02",
    image: introPhoto("male_02"),
    voice: introCharacter("male_02")?.voice,
  },
  {
    id: "MALE_3",
    name: "한기철 회원",
    tagline: "멍때리기 느림보",
    photoId: "male_03",
    image: introPhoto("male_03"),
    voice: introCharacter("male_03")?.voice,
  },
  {
    id: "FEMALE_1",
    name: "김말순 계주",
    tagline: "골목 맛집 사냥꾼",
    photoId: "female_01",
    image: introPhoto("female_01"),
    voice: introCharacter("female_01")?.voice,
  },
  {
    id: "FEMALE_2",
    name: "문지혜 여사",
    tagline: "감성 수다쟁이",
    photoId: "female_02",
    image: introPhoto("female_02"),
    voice: introCharacter("female_02")?.voice,
  },
  {
    id: "FEMALE_3",
    name: "백설희 회원",
    tagline: "낭만 새침데기",
    photoId: "female_03",
    image: introPhoto("female_03"),
    voice: introCharacter("female_03")?.voice,
  },
];

export function getCharacter(characterId) {
  return CHARACTERS.find((character) => character.id === characterId) ?? null;
}
