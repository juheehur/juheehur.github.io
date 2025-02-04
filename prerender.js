const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

// Firebase 초기화
const firebaseConfig = {
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
};

admin.initializeApp(firebaseConfig);

const db = admin.firestore();

async function getStudentIds() {
  const snapshot = await db.collection('tutoringStudents').get();
  return snapshot.docs.map(doc => doc.id);
}

async function prerenderPage(url, outputPath) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle0' });
    const html = await page.content();
    fs.writeFileSync(outputPath, html);
  } catch (error) {
    console.error(`Error prerendering ${url}:`, error);
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    const studentIds = await getStudentIds();
    
    for (const studentId of studentIds) {
      const url = `http://localhost:3000/student-progress/${studentId}`;
      const outputPath = path.join(__dirname, 'build', 'student-progress', studentId, 'index.html');
      
      // 디렉토리가 없으면 생성
      fs.mkdirSync(path.join(__dirname, 'build', 'student-progress', studentId), { recursive: true });
      
      await prerenderPage(url, outputPath);
      console.log(`Prerendered: ${url}`);
    }
    
    console.log('Prerendering completed successfully!');
  } catch (error) {
    console.error('Error during prerendering:', error);
    process.exit(1);
  }
}

main(); 