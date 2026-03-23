// Seed venture_team assignments based on team member roles and venture sectors
// Team Members:
// 1: Jimmy Frangi - Founder, Finance & Capital (Internal) → all major ventures
// 2: Anton Maghami - VP, Operations & Systems (Internal) → all ventures (operations)
// 3: Jon Eichner - COO, Operations (Internal) → key ventures
// 4: Maher Abou Chakra - Accounting, Finance (Internal) → ventures with financial activity
// 5: Angie Samadi - HR, People Ops (Internal) → key ventures needing HR
// 6: Carl Frangi - Member, Investor Relations (Advisor) → investor-facing ventures
// 7: Leonidas Kyrris - Legal maritime (Advisor) → yacht/maritime ventures
// 8: Igor - Deck Design (External) → ventures needing pitch decks
// 9: Sohail - Financial Modeling (External) → ventures needing financial models
// 10: Ruwaida - Yacht Design (External) → yacht ventures
// 11: Shwan Lee - Founder & CEO, Strategy (Internal) → all ventures
// 12: Najib - Advisor, Legal & Compliance (Advisor) → ventures needing legal

// Ventures:
// 1: Nammos - Barcelona (Real Estate)
// 2: Nammos - Lagonissi (Real Estate)
// 3: Muscat Bay (Real Estate)
// 4: Chekka Land - Resort (Real Estate)
// 5: Shady Hotel (Real Estate)
// 6: Nammos - Watson Island (Real Estate)
// 7: Zarka City (Real Estate)
// 8: Berbara - Lebanon (F&B)
// 9: Nammos - Ibiza (F&B)
// 10: Nammos Lebanon (F&B)
// 11: Mar-a-Lago Yacht Club (Yacht)
// 12: Bagatelle (Yacht)
// 13: JV Yacht - Nammos (Yacht)
// 14: Berlin (Entertainment)
// 15: KTL-Dubai Casino License (Entertainment)
// 16: Casino - Malaysia (Entertainment)
// 17: Kazzafi Daughter (Others)
// 18: Shady Project (Others)
// 19: P430 (Others)
// 20: Venezuela Mining Rights (Oil & Gas)

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const assignments = [
  // Jimmy Frangi (1) - Founder, Finance → key ventures
  { ventureId: 1, memberId: 1, responsibility: "Capital deployment & LP comms" },
  { ventureId: 2, memberId: 1, responsibility: "Capital deployment" },
  { ventureId: 3, memberId: 1, responsibility: "Investment oversight" },
  { ventureId: 6, memberId: 1, responsibility: "Capital deployment & LP comms" },
  { ventureId: 7, memberId: 1, responsibility: "Treasury management" },
  { ventureId: 11, memberId: 1, responsibility: "Capital deployment" },
  { ventureId: 13, memberId: 1, responsibility: "Deal structuring" },
  { ventureId: 15, memberId: 1, responsibility: "Capital allocation" },
  { ventureId: 20, memberId: 1, responsibility: "Investment oversight" },

  // Anton Maghami (2) - VP Operations → operations across portfolio
  { ventureId: 1, memberId: 2, responsibility: "Operations & automation" },
  { ventureId: 2, memberId: 2, responsibility: "Operations & reporting" },
  { ventureId: 3, memberId: 2, responsibility: "Systems & governance" },
  { ventureId: 6, memberId: 2, responsibility: "Operations & systems" },
  { ventureId: 7, memberId: 2, responsibility: "Operations" },
  { ventureId: 8, memberId: 2, responsibility: "Operations oversight" },
  { ventureId: 9, memberId: 2, responsibility: "Operations" },
  { ventureId: 11, memberId: 2, responsibility: "Operations & reporting" },
  { ventureId: 13, memberId: 2, responsibility: "Operations" },
  { ventureId: 14, memberId: 2, responsibility: "Operations" },
  { ventureId: 15, memberId: 2, responsibility: "Operations & compliance" },

  // Jon Eichner (3) - COO → key operational ventures
  { ventureId: 1, memberId: 3, responsibility: "Operational leadership" },
  { ventureId: 6, memberId: 3, responsibility: "Operational leadership" },
  { ventureId: 7, memberId: 3, responsibility: "Project management" },
  { ventureId: 11, memberId: 3, responsibility: "Operational leadership" },
  { ventureId: 15, memberId: 3, responsibility: "Operational oversight" },

  // Maher Abou Chakra (4) - Accounting → ventures with financial activity
  { ventureId: 1, memberId: 4, responsibility: "Bookkeeping & compliance" },
  { ventureId: 2, memberId: 4, responsibility: "Entity bookkeeping" },
  { ventureId: 3, memberId: 4, responsibility: "Financial compliance" },
  { ventureId: 6, memberId: 4, responsibility: "Bookkeeping & closing packages" },
  { ventureId: 7, memberId: 4, responsibility: "Bookkeeping" },
  { ventureId: 11, memberId: 4, responsibility: "Financial compliance" },
  { ventureId: 13, memberId: 4, responsibility: "Entity bookkeeping" },
  { ventureId: 20, memberId: 4, responsibility: "Financial compliance" },

  // Angie Samadi (5) - HR → ventures needing people ops
  { ventureId: 1, memberId: 5, responsibility: "Hiring & onboarding" },
  { ventureId: 6, memberId: 5, responsibility: "Hiring pipelines" },
  { ventureId: 7, memberId: 5, responsibility: "Contracts & onboarding" },
  { ventureId: 11, memberId: 5, responsibility: "People ops" },

  // Carl Frangi (6) - Investor Relations → investor-facing ventures
  { ventureId: 1, memberId: 6, responsibility: "Investor relations" },
  { ventureId: 3, memberId: 6, responsibility: "Family office coordination" },
  { ventureId: 6, memberId: 6, responsibility: "Investor relations" },
  { ventureId: 7, memberId: 6, responsibility: "Investor relations" },
  { ventureId: 15, memberId: 6, responsibility: "Investor coordination" },
  { ventureId: 20, memberId: 6, responsibility: "Investor relations" },

  // Leonidas Kyrris (7) - Legal maritime → yacht/maritime ventures
  { ventureId: 11, memberId: 7, responsibility: "Maritime legal counsel" },
  { ventureId: 12, memberId: 7, responsibility: "Maritime legal" },
  { ventureId: 13, memberId: 7, responsibility: "Maritime legal & JV structure" },

  // Igor (8) - Deck Design → ventures needing pitch decks
  { ventureId: 1, memberId: 8, responsibility: "Pitch deck design" },
  { ventureId: 6, memberId: 8, responsibility: "Pitch deck design" },
  { ventureId: 7, memberId: 8, responsibility: "Investor deck design" },
  { ventureId: 15, memberId: 8, responsibility: "Pitch deck design" },

  // Sohail (9) - Financial Modeling → ventures needing models
  { ventureId: 1, memberId: 9, responsibility: "Financial modeling" },
  { ventureId: 3, memberId: 9, responsibility: "Financial modeling" },
  { ventureId: 6, memberId: 9, responsibility: "Financial modeling" },
  { ventureId: 7, memberId: 9, responsibility: "Financial projections" },
  { ventureId: 15, memberId: 9, responsibility: "Financial modeling" },
  { ventureId: 20, memberId: 9, responsibility: "Financial modeling" },

  // Ruwaida (10) - Yacht Design → yacht ventures
  { ventureId: 11, memberId: 10, responsibility: "Yacht interior design" },
  { ventureId: 12, memberId: 10, responsibility: "Design concepts" },
  { ventureId: 13, memberId: 10, responsibility: "Yacht design & specs" },

  // Shwan Lee (11) - CEO, Strategy → all major ventures
  { ventureId: 1, memberId: 11, responsibility: "Strategic direction" },
  { ventureId: 2, memberId: 11, responsibility: "Strategic oversight" },
  { ventureId: 3, memberId: 11, responsibility: "Strategic direction" },
  { ventureId: 6, memberId: 11, responsibility: "Strategic direction" },
  { ventureId: 7, memberId: 11, responsibility: "Strategic vision" },
  { ventureId: 11, memberId: 11, responsibility: "Strategic direction" },
  { ventureId: 13, memberId: 11, responsibility: "Strategic direction" },
  { ventureId: 14, memberId: 11, responsibility: "Strategic oversight" },
  { ventureId: 15, memberId: 11, responsibility: "Strategic direction" },
  { ventureId: 16, memberId: 11, responsibility: "Strategic oversight" },
  { ventureId: 20, memberId: 11, responsibility: "Strategic direction" },

  // Najib (12) - Legal & Compliance → ventures needing legal
  { ventureId: 1, memberId: 12, responsibility: "Legal & compliance" },
  { ventureId: 6, memberId: 12, responsibility: "Legal review" },
  { ventureId: 7, memberId: 12, responsibility: "Legal & compliance" },
  { ventureId: 15, memberId: 12, responsibility: "Regulatory compliance" },
  { ventureId: 16, memberId: 12, responsibility: "Regulatory compliance" },
  { ventureId: 20, memberId: 12, responsibility: "Legal & compliance" },
];

async function seed() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Clear existing
  await conn.execute('DELETE FROM venture_team');
  
  // Insert assignments
  for (const a of assignments) {
    await conn.execute(
      'INSERT INTO venture_team (ventureId, memberId, responsibility) VALUES (?, ?, ?)',
      [a.ventureId, a.memberId, a.responsibility]
    );
  }
  
  console.log(`Seeded ${assignments.length} venture-team assignments`);
  
  // Verify
  const [rows] = await conn.execute(
    `SELECT vt.ventureId, v.name as venture, COUNT(*) as members 
     FROM venture_team vt 
     LEFT JOIN ventures v ON vt.ventureId = v.id 
     GROUP BY vt.ventureId, v.name 
     ORDER BY members DESC`
  );
  console.log('\nMembers per venture:');
  for (const r of rows) {
    console.log(`  ${r.venture}: ${r.members} members`);
  }
  
  const [memberRows] = await conn.execute(
    `SELECT vt.memberId, tm.name, COUNT(*) as ventures 
     FROM venture_team vt 
     LEFT JOIN team_members tm ON vt.memberId = tm.id 
     GROUP BY vt.memberId, tm.name 
     ORDER BY ventures DESC`
  );
  console.log('\nVentures per member:');
  for (const r of memberRows) {
    console.log(`  ${r.name}: ${r.ventures} ventures`);
  }
  
  await conn.end();
}

seed().catch(console.error);
