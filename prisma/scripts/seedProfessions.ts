// קובץ: scripts/seedProfessions.ts
// סקריפט להוספה חד-פעמית של כל המקצועות הקיימים ל-ProfessionTypes

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INITIAL_PROFESSIONS = [
  { name: 'תיאטרון', fieldName: 'Theather' },
  { name: 'שחמט', fieldName: 'Chess' },
  { name: 'לחימה', fieldName: 'Fighting' },
  { name: 'סטיילינג', fieldName: 'Styling' },
  { name: 'קיימות', fieldName: 'Sustainability' },
  { name: 'מדיה חדשה', fieldName: 'NewMedia' },
  { name: 'היי-טק', fieldName: 'HiTech' },
  { name: 'יוגה', fieldName: 'Yoga' },
  { name: 'כתיבה', fieldName: 'Writing' },
  { name: 'פיננסים', fieldName: 'Finances' },
  { name: 'ספורט', fieldName: 'Sporst' },
  { name: 'קסמים', fieldName: 'Magic' },
  { name: 'מאלפ/ת כלבים', fieldName: 'Doghandling' },
  { name: 'רפואה', fieldName: 'Medicine' },
  { name: 'מדע', fieldName: 'Sciene' },
  { name: 'מחול', fieldName: 'Dance' },
  { name: 'תקשורת', fieldName: 'Communication' },
  { name: 'לימודים', fieldName: 'Studying' },
  { name: 'פסיכומטרי', fieldName: 'Psychometric' },
  { name: 'מחשבות', fieldName: 'Thoughts' },
  { name: 'ג׳אגלינג', fieldName: 'Juggling' },
  { name: 'חינוך מיני', fieldName: 'SexEducation' },
  { name: 'טיפול', fieldName: 'Treatment' },
  { name: 'מוזיקה', fieldName: 'Music' },
  { name: 'ליווי', fieldName: 'Escort' },
  { name: 'קולנוע', fieldName: 'Cinema' },
  { name: 'עבודות עץ', fieldName: 'Woodwork' },
  { name: 'יזמות', fieldName: 'Entrepreneurship' },
  { name: 'אנגלית', fieldName: 'English' },
  { name: 'אימון אישי', fieldName: 'Coaching' },
  { name: 'מותאם אישית', fieldName: 'Custom' },
  { name: 'טיסה', fieldName: 'Flight' },
  { name: 'אימון הוליסטי', fieldName: 'HollisticCoaching' },
  { name: 'יהדות', fieldName: 'Judaism' },
  { name: 'מנהיגות', fieldName: 'LeaderShip' },
  { name: 'מתמטיקה', fieldName: 'Mathematics' },
  { name: 'טלמרקטינג', fieldName: 'Telemarketing' },
];

async function seedProfessions() {
  console.log('🌱 מתחיל אכלוס טבלת ProfessionTypes...\n');
  
  let successCount = 0;
  let skipCount = 0;
  
  for (const prof of INITIAL_PROFESSIONS) {
    try {
      await prisma.professionTypes.create({
        data: {
          ProfessionName: prof.name,
          FieldName: prof.fieldName
        }
      });
      console.log(`✅ נוסף: ${prof.name} (${prof.fieldName})`);
      successCount++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⏭️  קיים: ${prof.name}`);
        skipCount++;
      } else {
        console.error(`❌ שגיאה: ${prof.name}`, error.message);
      }
    }
  }
  
  console.log(`\n📊 סיכום:`);
  console.log(`   נוספו: ${successCount}`);
  console.log(`   דולגו: ${skipCount}`);
  console.log(`   סה"כ: ${INITIAL_PROFESSIONS.length}`);
}

seedProfessions()
  .then(() => {
    console.log('\n✅ הסתיים בהצלחה!');
    prisma.$disconnect();
  })
  .catch((error) => {
    console.error('\n❌ שגיאה:', error);
    prisma.$disconnect();
    process.exit(1);
  });