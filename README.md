# LottoLab v0.1 (개발용 스캐폴드)

## 준비
Node.js 22+, pnpm 또는 npm, Docker 필요.

```bash
cp .env.example .env
# .env의 APP_PASSWORD, CRON_SECRET, DATABASE_URL 값을 변경
npm install
docker compose up -d
npx prisma db push
npm run db:seed
npm run dev
```

## API
- `GET /api/draws`: 최신 30회 조회
- `GET /api/statistics?window=100`: 검증된 회차의 빈도/미출현 통계
- `POST /api/draws/sync`: {"start":1,"end":50} + x-app-password (50회씩)
- `POST /api/recommendations`: {"drawNo":1234,"mode":"hybrid","gameCount":5} + x-app-password
- `GET /api/recommendations`: x-app-password
- `POST /api/results/verify`: {"drawNo":1233} + x-app-password

## 데이터 수집 주의
동행복권 2026 개편 후 엔드포인트는 비공식이며 스키마가 바뀌었습니다. 현재 `src/lib/collector.ts`는 **기존 JSON 형식만 파싱**하며, 새 URL의 응답이 달라지면 명시적 오류로 중단합니다. 실제 응답 확인 후 파서를 수정해야 합니다. 미검증 데이터는 추천/검증에 사용하지 않습니다. 공식 발표와 교차검증하고 `verified=true`로 승인하는 운영 절차가 추가로 필요합니다.

## 배포 전 필수 보완
- 현재 `x-app-password`를 클라이언트에서 보내는 MVP 방식 대신 서버 세션 쿠키 인증과 미들웨어 접근 제어 도입
- 동기화/검증 API를 서버 전용 Cron 인증으로 분리
- 실제 API 응답 매핑 검증 및 공식 데이터 교차 검증 UI 구현
- 회차별 실제 당첨금 매핑, 에러 모니터링, rate limit, 백업
- 외부 DB는 Neon/Supabase 등 관리형 PostgreSQL 사용
- 개인정보 및 비밀 키는 서버 환경변수에만 보관

이 프로젝트는 개발 시작용 코드이며 검증된 완성 배포본이 아닙니다. 추천 전략은 당첨 확률을 높이지 않습니다.
