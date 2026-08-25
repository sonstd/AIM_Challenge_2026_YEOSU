# 여수 여행지 추천 서비스 (AIM Challenge 2026 예선)

사용자의 여행 취향을 3단계로 입력받아, AI Agent가 여수 관광지 20곳 중 3~5곳을
추천 이유·매칭 태그·이미지와 함께 보여주는 Next.js 앱입니다. 백엔드 DB 없이
프로젝트 내부 정적 데이터만 사용합니다.

## 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인합니다.

## API 키 설정

Agent 호출은 **서버사이드에서만** 일어납니다. 키는 임시로 문자열 `"api_key"`가
들어가 있고, 환경변수가 있으면 그쪽이 우선합니다.

```bash
# .env.local
GEMINI_API_KEY=발급받은_키
GEMINI_MODEL=gemini-3.7-flash   # 선택. 생략하면 이 값이 기본
```

키가 없거나 네트워크가 막혀 Agent에 **닿지 못하면**, 서버는 evidence_text_1~3을
그대로 조립한 결정적 대체 응답을 돌려주고 응답 헤더에
`X-Recommend-Source: fallback`을 붙입니다. 정상 경로는 `agent`입니다.
(대체 경로는 문장을 새로 생성하지 않으므로 "evidence에 없는 내용 금지" 규칙을
구조적으로 위반할 수 없습니다. 불필요하면 `src/app/api/recommend/route.js`의
해당 블록을 지우면 500으로 떨어집니다.)

## 이미지

`public/images/places/{place_id}_01.png` ~ `_03.png` 경로를 기대합니다.
파일이 없으면 카드가 자동으로 "이미지 준비 중" 플레이스홀더로 대체됩니다.
프롬프트와 시드는 `src/data/places.json`의 `image_prompt` / `seeds`에 있습니다.

## 구조

| 경로 | 역할 |
| --- | --- |
| `src/data/places.json` | 여행지 20곳 원본 데이터 |
| `src/lib/places.js` | **데이터 접근 레이어.** `getAllPlaces()` / `getPlaceById(id)` |
| `src/lib/constants.js` | 선택지·감점표·배타 그룹 등 공유 상수 |
| `src/lib/scoring.js` | ① 스코어링 ② 후보 압축 |
| `src/lib/agent.js` | ③ Gemini 호출 (서버 전용) |
| `src/lib/validate.js` | ④ 검증 레이어 |
| `src/app/api/recommend/route.js` | 파이프라인 조립 + ⑤ 응답 조립 |
| `src/components/` | 3단계 위저드 UI |

**컴포넌트와 API 라우트는 `places.json`을 직접 import하지 않습니다.** 반드시
`src/lib/places.js`를 거칩니다. 나중에 DB를 붙일 때 이 파일 내부만 쿼리로 바꾸면
되도록 두 함수는 지금부터 `async` 시그니처입니다.

`src/data/places.json`은 원본 CSV에서 생성했습니다. 재생성은 결정적입니다.

```bash
node scripts/generate-places.mjs
# CSV가 다른 곳에 있으면: PLACES_CSV=/경로/여행지_20_여수.csv node scripts/generate-places.mjs
```

CSV에 없는 `image_prompt`와 `seeds`는 스크립트 안의 `ART` 맵에 장소별로
직접 작성해 두었습니다(`evidence_text_4`의 대표 볼거리를 기준으로 맞췄습니다).

## 추천 파이프라인

```
POST /api/recommend
  { "companion": "가족", "themes": ["자연·힐링","아이와함께"], "detail": "어린 자녀" }

① 스코어링   score = 선택 태그수×2 − avoid 감점 + (themes[0] 매칭 시 +0.5)
                     + (동반 유형 자동 태그 매칭 시 +1.5)
② 후보 압축   상위 8곳 (최소 5곳 보장), 배타 그룹은 점수 높은 쪽만
③ Agent      후보의 evidence_text_1~5 기반으로 3~5곳 선정, 이유는 정확히 3문장
④ 검증        화이트리스트 / 중복 / 개수(3~5) / 문장수(2~5) → 실패 시 최대 3회 재호출
⑤ 응답 조립   getPlaceById()로 place_name·image_prompt·images 결합
```

`avoid_tags`는 하드 필터가 아니라 소프트 감점입니다. 감점 폭은 동반 유형별로
다르고, `detail`이 `어린 자녀`이면 2배가 됩니다.

2단계에서 사용자가 고르는 테마는 6개(`자연·힐링` `액티비티` `사진·인생샷` `야경`
`문화·역사` `맛집·미식`)입니다. `아이와함께`·`로맨틱·커플`은 선택지에서 빼는 대신
1단계 동반 유형에서 자동으로 따라옵니다 — `가족`이면 `아이와함께`, `연인·부부`면
`로맨틱·커플`을 가진 장소에 **+1.5**를 주고 `matched_tags`에도 포함시킵니다.
이 자동 태그는 `×2` 가중치 대상이 아닌 고정 가산점이며, `places.json`의
`preference_tags` 값은 그대로 둡니다(`COMPANION_AUTO_TAGS` 참고).

재호출 시에는 직전 응답의 검증 실패 사유를 프롬프트에 되먹여 교정을 유도합니다.
3회 모두 실패하면 검증을 통과한 항목만으로 응답하고, 3곳에 못 미치면 500입니다.

## 응답 형식

```json
{
  "region_id": "YEOSU",
  "recommendations": [
    {
      "place_id": "YEOSU_001",
      "place_name": "오동도",
      "recommend_reason": "...",
      "matched_tags": ["자연·힐링", "아이와함께"],
      "image_prompt": "...",
      "images": ["/images/places/YEOSU_001_01.png", "..."]
    }
  ]
}
```

제출용 JSON이 필요하면 API를 직접 호출해 응답을 그대로 저장하면 됩니다.

```bash
curl -s -X POST http://localhost:3000/api/recommend -H "Content-Type: application/json" -d '{"companion":"가족","themes":["자연·힐링","액티비티"],"detail":"어린 자녀"}' -o recommendations.json
```

> `images`는 스펙 ⑤("place_name, image_prompt, images를 결합")를 따라 포함했습니다.
> 스펙의 예시 JSON에는 이 필드가 없으므로, 제출 검증기가 엄격하다면
> `src/app/api/recommend/route.js`의 응답 조립부에서 `images` 한 줄만 빼면 됩니다.
> (단, 결과 화면 이미지는 이 필드로 그립니다.)
