# GitHub + Render 배포

이 프로젝트는 Render의 **Web Service 하나**에서 Express·Socket.IO 서버와 React 정적 파일을 함께 제공합니다. 따라서 운영 환경의 브라우저는 같은 출처로 Socket.IO에 연결하며, 프런트 주소를 별도로 빌드할 필요가 없습니다.

## 1. GitHub에 올리기

프로젝트 루트에서 다음을 실행합니다. `.env` 파일과 `node_modules`는 이미 `.gitignore`로 제외됩니다.

```bash
git init
git add .
git commit -m "Initial Mystery Manor deployment"
git branch -M main
git remote add origin https://github.com/계정명/저장소명.git
git push -u origin main
```

`.github/workflows/ci.yml`은 `main` 푸시와 Pull Request마다 빌드와 21개 서버 테스트를 실행합니다. Render의 자동 배포는 이 검사가 통과한 뒤 확인하는 방식으로 운영하는 것을 권장합니다.

## 2. Render Blueprint로 만들기

1. Render 대시보드에서 **New → Blueprint**를 선택하고 GitHub 저장소를 연결합니다.
2. 저장소 루트의 `render.yaml`을 선택합니다.
3. 서비스 이름을 원하는 고유 이름으로 바꿉니다. 기본값은 `mystery-manor`입니다.
4. 생성 후 배포 로그에서 `Build successful`과 `/api/health` 헬스 체크 통과를 확인합니다.
5. 서비스 주소 `https://<서비스이름>.onrender.com`를 열어 방 생성부터 테스트합니다.

Render는 `PORT`를 제공하고, 서버는 `0.0.0.0`과 해당 포트에 바인딩합니다. `RENDER_EXTERNAL_URL`도 자동으로 제공되므로 기본 `onrender.com` 주소에서는 `CLIENT_URL`을 비워도 CORS가 동작합니다.

## 3. 커스텀 도메인을 쓸 때

Render 서비스의 Environment에서 아래 값을 직접 설정하고 재배포합니다.

```text
CLIENT_URL=https://게임도메인.example
```

스킴(`https://`)을 포함하되 마지막 슬래시는 넣지 않습니다. 이 값은 Express와 Socket.IO가 허용할 브라우저 출처입니다.

## 4. 배포 확인

1. `https://<서비스이름>.onrender.com/api/health`가 `ok: true`를 반환하는지 확인합니다.
2. 일반 창·시크릿 창·모바일에서 같은 방 코드로 입장합니다.
3. 게임 시작, 주사위, 이동, 카드 공개, 새로고침 재접속을 확인합니다.
4. 서로 다른 네트워크의 브라우저에서도 Socket.IO 연결 표시가 온라인인지 확인합니다.

## 로컬 운영형 테스트

Windows PowerShell에서 프로젝트 폴더로 이동한 뒤 실행합니다.

```powershell
npm install
npm run build
$env:NODE_ENV = "production"
$env:PORT = "3001"
npm start
```

브라우저에서 `http://localhost:3001`을 엽니다. 운영형 모드에서는 Express가 React 화면과 Socket.IO를 함께 제공하므로 Vite 개발 서버를 별도로 켤 필요가 없습니다. 종료는 실행 중인 PowerShell에서 `Ctrl + C`를 누릅니다.

## 현재 운영상 제한

- 게임 방과 세션은 서버 메모리에만 있습니다. 서비스 재시작·재배포 시 진행 중인 모든 방이 사라집니다.
- 한 인스턴스에서만 운영해야 합니다. 여러 인스턴스로 확장하려면 Redis Socket.IO adapter와 영속 DB를 먼저 추가해야 합니다.
- 무료 인스턴스 정책은 변경될 수 있고, 비활성 후 재가동 시 첫 접속이 느릴 수 있습니다. 실제 운영 전에는 Render의 현재 요금·인스턴스 정책을 확인합니다.
