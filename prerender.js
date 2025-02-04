const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function prerender() {
  console.log('Starting prerender process...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    // Firestore에서 모든 학생 ID 가져오기
    const students = await getAllStudents();
    console.log(`Found ${students.length} students to prerender`);
    
    for (const student of students) {
      console.log(`Prerendering page for student: ${student.name} (${student.id})`);
      
      // 각 학생별 정적 HTML 생성
      const url = `http://localhost:3000/student-progress/${student.id}`;
      const outputPath = path.join(__dirname, 'build', 'student-progress', student.id, 'index.html');
      
      // 페이지 방문 및 데이터 로딩 대기
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(2000); // 데이터 로딩을 위한 추가 대기

      // HTML에 메타데이터 주입
      const html = await page.evaluate((student) => {
        const title = `${student.name}님의 학습 현황`;
        const description = `${student.name}님의 ${student.subjects} 수업 진도와 숙제를 확인하실 수 있습니다.`;
        
        return `
          <!DOCTYPE html>
          <html lang="ko">
          <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <meta name="title" content="${title}">
            <meta name="description" content="${description}">
            <meta property="og:type" content="website">
            <meta property="og:title" content="${title}">
            <meta property="og:description" content="${description}">
            <meta property="og:site_name" content="${title}">
            ${document.head.innerHTML}
          </head>
          <body>
            ${document.body.innerHTML}
          </body>
          </html>
        `;
      }, student);
      
      // 디렉토리 생성 및 파일 저장
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, html);
      console.log(`Generated static HTML for ${student.name}`);
    }
  } catch (error) {
    console.error('Error during prerendering:', error);
  } finally {
    await browser.close();
    admin.app().delete();
    console.log('Prerender process completed');
  }
}

async function getAllStudents() {
  const snapshot = await admin.firestore()
    .collection('tutoringStudents')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

prerender(); 