const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

// Firebase 초기화 - 환경 변수 확인
let firebaseConfig;

if (process.env.FIREBASE_PRIVATE_KEY) {
  // Vercel 환경 - 환경 변수 사용
  firebaseConfig = {
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  };
} else {
  // 로컬 환경 - 서비스 계정 파일 사용
  try {
    const serviceAccount = require('./firebase-service-account.json');
    firebaseConfig = {
      credential: admin.credential.cert(serviceAccount)
    };
  } catch (error) {
    console.error('Firebase credentials not found. Please set up environment variables or provide service account file.');
    process.exit(1);
  }
}

// Firebase 초기화
admin.initializeApp(firebaseConfig);
const db = admin.firestore();

async function getStudentData() {
  const snapshot = await db.collection('tutoringStudents').get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

function generateStaticHtml(student, assets) {
  const title = `${student.name}님의 학습 현황`;
  const description = `${student.name}님의 ${student.subjects} 수업 진도와 숙제를 확인하실 수 있습니다.`;
  
  // React 앱의 초기 상태
  const initialState = {
    student: {
      id: student.id,
      name: student.name,
      subjects: student.subjects
    }
  };
  
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#000000" />
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:site_name" content="${title}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  
  <!-- WeChat -->
  <meta property="wechat:title" content="${title}">
  <meta property="wechat:description" content="${description}">
  
  <!-- Naver / KakaoTalk -->
  <meta name="naver-site-verification" content="${title}">
  <meta property="kakao:title" content="${title}">
  <meta property="kakao:description" content="${description}">
  
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/logo192.png" />
  ${assets.css.map(css => `<link href="${css}" rel="stylesheet">`).join('\n')}
</head>
<body>
  <div id="root">
    <div class="student-progress-page">
      <div class="progress-container">
        <div class="loading-state">
          <h1>${title}</h1>
          <p>${description}</p>
        </div>
      </div>
    </div>
  </div>
  <script>
    window.__INITIAL_STATE__ = ${JSON.stringify(initialState)};
  </script>
  ${assets.js.map(js => `<script src="${js}"></script>`).join('\n')}
</body>
</html>`;
}

function getAssetManifest() {
  const manifestPath = path.join(__dirname, 'build', 'asset-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  return {
    js: [
      manifest.files['main.js'],
      manifest.files['runtime-main.js'],
      ...(manifest.entrypoints.filter(file => file.endsWith('.js')))
    ],
    css: [
      manifest.files['main.css'],
      ...(manifest.entrypoints.filter(file => file.endsWith('.css')))
    ]
  };
}

async function main() {
  try {
    const students = await getStudentData();
    const assets = getAssetManifest();
    
    // build 디렉토리의 모든 파일을 복사
    const buildFiles = fs.readdirSync(path.join(__dirname, 'build'));
    
    for (const student of students) {
      const studentDir = path.join(__dirname, 'build', 'student-progress', student.id);
      
      // 디렉토리가 없으면 생성
      fs.mkdirSync(studentDir, { recursive: true });
      
      // static 디렉토리 복사
      if (fs.existsSync(path.join(__dirname, 'build', 'static'))) {
        fs.cpSync(
          path.join(__dirname, 'build', 'static'),
          path.join(studentDir, 'static'),
          { recursive: true }
        );
      }
      
      // 정적 HTML 생성
      const html = generateStaticHtml(student, assets);
      fs.writeFileSync(path.join(studentDir, 'index.html'), html);
      console.log(`Generated static HTML for student: ${student.name} (${student.id})`);
    }
    
    console.log('Static HTML generation completed successfully!');
  } catch (error) {
    console.error('Error during static HTML generation:', error);
    process.exit(1);
  } finally {
    // Firebase 연결 종료
    await admin.app().delete();
  }
}

main(); 