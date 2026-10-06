# 국가숲길 인터랙티브 지도 (HTML)

## 페이지
| 파일 | 내용 |
|---|---|
| `index.html` | **통합형 지도** – 숲길 위에 마우스를 올리면 해당 숲길의 개별형 지도 미리보기 팝업, 클릭 시 상세 지도로 이동 |
| `map.html?trail=songnisan` | **개별형 지도** – 노선 hover 시 설명창(사진 / 코스 이름 / 거리 / 안내센터 / 대표자원) + 노선 하이라이트, 클릭 시 고정 |

`trail` 값: `jirisan` `baekdu` `dmz` `daegwallyeong` `naepo` `uljin` `daejeon` `hallasan` `songnisan` (또는 1~9)
특정 구간 바로 열기: `map.html?trail=songnisan#sec-3`

## 기능
- 노선 hover → 설명창 + 하이라이트 (나머지 노선은 흐리게)
- 노선 클릭 → 설명창 고정, 사진 여러 장일 때 썸네일로 전환, 전화번호 링크
- 지도 안 범례에 마우스를 올려도 해당 노선 하이라이트 (내포문화숲길은 순례길 단위)
- 지도 아래 구간 목록 ↔ 지도 연동
- 확대/축소: 버튼, Ctrl(⌘)+스크롤, 더블클릭, 드래그 이동, 모바일 핀치
- 반응형: 데스크톱 / 태블릿 / 모바일(하단 시트 팝업)
- 서버 없이 파일을 직접 열어도 동작 (file://), iframe 삽입 가능

## 폴더
```
html/
  index.html, map.html
  assets/css/style.css
  assets/js/common.js      팝업 · 확대/이동 · 헤더
  assets/js/overview.js    통합형
  assets/js/trail.js       개별형
  assets/data/*.js         ← 자동 생성 (엑셀 + AI 파일)
  assets/img/              ← 자동 생성 (지도 / 사진)
```

## 데이터 수정 방법
엑셀(`국가숲길_개별 팝업 노선 정보.xlsx`)이나 사진/AI 파일을 바꾼 뒤 상위 폴더에서:
```
pip install pymupdf pillow openpyxl
python tools/build.py
```
`tools/build-report.txt` 에 확인이 필요한 항목(사진 없음 등)이 정리됩니다.
