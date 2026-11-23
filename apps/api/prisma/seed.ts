// apps/api/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // ── 1. Clean existing data (careful in production!) ────────────
  console.log('🧹 Cleaning existing data...');
  await prisma.userPrediction.deleteMany();
  await prisma.rivalry.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.matchweek.deleteMany();
  await prisma.leagueMember.deleteMany();
  await prisma.league.deleteMany();
  await prisma.user.deleteMany();

  // ── 2. Create Users ────────────────────────────────────────────
  console.log('👤 Creating users...');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        firebaseUid: 'firebase_uid_goziem',
        email: 'goziem@example.com',
        username: 'goziem',
        displayName: 'Goziem Offer',
        avatarUrl: 'https://i.pravatar.cc/150?u=goziem',
      },
    }),
    prisma.user.create({
      data: {
        firebaseUid: 'firebase_uid_alex',
        email: 'alex@example.com',
        username: 'alex_football',
        displayName: 'Alex Smith',
        avatarUrl: 'https://i.pravatar.cc/150?u=alex',
      },
    }),
    prisma.user.create({
      data: {
        firebaseUid: 'firebase_uid_sarah',
        email: 'sarah@example.com',
        username: 'sarah_predicts',
        displayName: 'Sarah Jones',
        avatarUrl: 'https://i.pravatar.cc/150?u=sarah',
      },
    }),
  ]);

  const [goziem, alex, sarah] = users;

  // ── 3. Create Matchweek & Fixtures ─────────────────────────────
  console.log('⚽ Creating matchweek and fixtures...');
  const matchweek = await prisma.matchweek.create({
    data: {
      season: '2024/25',
      weekNumber: 1,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      status: 'UPCOMING',
    },
  });

  const matches = await Promise.all([
    prisma.match.create({
      data: {
        matchweekId: matchweek.id,
        externalId: 1001,
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        kickoff: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'UPCOMING',
      },
    }),
    prisma.match.create({
      data: {
        matchweekId: matchweek.id,
        externalId: 1002,
        homeTeam: 'Liverpool',
        awayTeam: 'Man City',
        kickoff: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        status: 'UPCOMING',
      },
    }),
    prisma.match.create({
      data: {
        matchweekId: matchweek.id,
        externalId: 1003,
        homeTeam: 'Man United',
        awayTeam: 'Tottenham',
        kickoff: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        status: 'UPCOMING',
      },
    }),
  ]);

  // ── 4. Create Predictions ──────────────────────────────────────
  console.log('🔮 Creating predictions...');
  
  // Auto-generated match predictions
  const matchPredictions = await Promise.all(
    matches.map((match) =>
      prisma.prediction.create({
        data: {
          matchweekId: matchweek.id,
          matchId: match.id,
          category: 'MATCHWEEK',
          question: `Who wins ${match.homeTeam} vs ${match.awayTeam}?`,
          options: [match.homeTeam, 'Draw', match.awayTeam],
          resolutionType: 'AUTO_FIXTURE_RESULT',
          resolutionConfig: {
            resultToOption: {
              HOME: match.homeTeam,
              DRAW: 'Draw',
              AWAY: match.awayTeam,
            },
          },
          deadline: new Date(match.kickoff.getTime() - 60 * 60 * 1000), // 1h before kickoff
        },
      })
    )
  );

  // Custom season-long prediction
  const seasonPrediction = await prisma.prediction.create({
    data: {
      matchweekId: matchweek.id,
      category: 'TEAMS',
      question: 'Who wins the Premier League this season?',
      options: ['Arsenal', 'Liverpool', 'Man City', 'Other'],
      resolutionType: 'MANUAL',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  // ── 5. Create Leagues ──────────────────────────────────────────
  console.log('🏆 Creating leagues...');
  const league = await prisma.league.create({
    data: {
      ownerId: goziem.id,
      name: 'The Lads',
      inviteCode: 'ABC123',
      type: 'PRIVATE',
      members: {
        create: [
          { userId: goziem.id },
          { userId: alex.id },
          { userId: sarah.id },
        ],
      },
    },
  });

  // ── 6. Create Rivalries (Prediction-first) ─────────────────────
  console.log('🤼 Creating rivalries...');
  // We need a 2-option prediction for a rivalry. Let's create a custom one.
  const rivalryPrediction = await prisma.prediction.create({
    data: {
      matchweekId: matchweek.id,
      category: 'GOALSCORERS',
      question: 'Will Haaland score this weekend?',
      options: ['Yes', 'No'],
      resolutionType: 'MANUAL',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  const rivalry = await prisma.rivalry.create({
    data: {
      creatorId: goziem.id,
      opponentId: alex.id,
      predictionId: rivalryPrediction.id,
      status: 'PENDING',
    },
  });

  // ── 7. Simulate User Picks (for the league & rivalries) ────────
  console.log('📝 Simulating user picks...');
  
  // Goziem picks Arsenal to win
  await prisma.userPrediction.create({
    data: {
      userId: goziem.id,
      predictionId: matchPredictions[0].id, // Arsenal vs Chelsea
      selectedOption: 'Arsenal',
    },
  });

  // Alex picks Man City to win
  await prisma.userPrediction.create({
    data: {
      userId: alex.id,
      predictionId: matchPredictions[1].id, // Liverpool vs Man City
      selectedOption: 'Man City',
    },
  });

  // Sarah picks Liverpool to win
  await prisma.userPrediction.create({
    data: {
      userId: sarah.id,
      predictionId: matchPredictions[1].id, // Liverpool vs Man City
      selectedOption: 'Liverpool',
    },
  });

  // Goziem accepts the rivalry and picks "Yes"
  await prisma.userPrediction.create({
    data: {
      userId: goziem.id,
      predictionId: rivalryPrediction.id,
      selectedOption: 'Yes',
    },
  });

  // ── 8. Create a Past, Resolved Matchweek (For Leaderboards/History) ──
  console.log('🕰️ Creating past matchweek data...');
  const pastMatchweek = await prisma.matchweek.create({
    data: {
      season: '2024/25',
      weekNumber: 0, // Use 0 to place it before week 1
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'FINISHED',
    },
  });

  const pastMatch = await prisma.match.create({
    data: {
      matchweekId: pastMatchweek.id,
      externalId: 999,
      homeTeam: 'Everton',
      awayTeam: 'Fulham',
      kickoff: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'FINISHED',
      homeScore: 2,
      awayScore: 1,
      result: 'HOME',
    },
  });

  const pastPrediction = await prisma.prediction.create({
    data: {
      matchweekId: pastMatchweek.id,
      matchId: pastMatch.id,
      category: 'MATCHWEEK',
      question: 'Who wins Everton vs Fulham?',
      options: ['Everton', 'Draw', 'Fulham'],
      resolutionType: 'AUTO_FIXTURE_RESULT',
      status: 'RESOLVED',
      correctOption: 'Everton',
      pointsValue: 10,
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  // Goziem got it right (10 pts)
  await prisma.userPrediction.create({
    data: {
      userId: goziem.id,
      predictionId: pastPrediction.id,
      selectedOption: 'Everton',
      isCorrect: true,
      pointsAwarded: 10,
    },
  });

  // Alex got it wrong (0 pts)
  await prisma.userPrediction.create({
    data: {
      userId: alex.id,
      predictionId: pastPrediction.id,
      selectedOption: 'Fulham',
      isCorrect: false,
      pointsAwarded: 0,
    },
  });

  // Sarah got it right (10 pts)
  await prisma.userPrediction.create({
    data: {
      userId: sarah.id,
      predictionId: pastPrediction.id,
      selectedOption: 'Everton',
      isCorrect: true,
      pointsAwarded: 10,
    },
  });

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });