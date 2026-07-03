const { detectJob } = require('./dist/jobs/jobDetector.js');
const text = `የስራው መጠሪያ: Senior Graphic Designer
የስራው አይነት: በተመደቡበት የሚሰራ - ቋሚ
የስራው ቦታ: አዲስ አበባ, ኢትዮጵያ
ደሞዝ/ክፍያ: ወርሃዊ
የማመልከቻ ማብቂያ ቀን: July 14th, 2026
የስራው ዝርዝር:
Beton Group is looking for a creative and experienced Senior Brand & Graphic Designer to join our growing team.`;
console.log(detectJob(text));
