import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SeedData } from './types';
import { refreshPlayers } from '../src/lib/playerRefresh';
import {
  ensureStreamUser,
  initializeStreamChannelTypes,
} from '../src/lib/getStream';
import { LeagueService } from '../src/services/leagueService';

const prisma = new PrismaClient();
const leagueService = new LeagueService();

async function loadSeedData(): Promise<SeedData> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const seedPath = path.join(__dirname, 'seed-users.json');
  const seedContent = fs.readFileSync(seedPath, 'utf-8');
  return JSON.parse(seedContent);
}

async function main() {
  try {
    console.log('Starting database seeding...');

    // Initialize Stream channel types
    console.log('Initializing Stream channel types...');
    await initializeStreamChannelTypes();

    // Load seed data
    console.log('Loading seed data...');
    const seedData = await loadSeedData();

    // Create users
    console.log('Creating users...');
    const users = await Promise.all(
      seedData.users.map(async (userData) => {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            name: userData.name,
            password: hashedPassword,
            userType: userData.userType || 'USER',
          },
        });

        // Sync user with GetStream
        await ensureStreamUser(user.id, {
          name: user.name,
        });

        return user;
      })
    );

    // Create league
    console.log('Creating league...');
    const commissioner = users.find((u, i) => seedData.users[i].isCommissioner);
    if (!commissioner) {
      throw new Error('No commissioner found in seed data');
    }

    const league = await leagueService.createLeague(commissioner.id, {
      name: seedData.league.name,
      description: seedData.league.description,
      isPrivate: seedData.league.isPrivate ?? false,
      inviteCode: seedData.league.inviteCode,
      maxTeams: seedData.league.maxTeams ?? 8,
    });

    // Add league memberships for non-commissioner users
    console.log('Adding league memberships...');
    await Promise.all(
      users
        .filter((user) => user.id !== commissioner.id)
        .map((user) =>
          prisma.leagueMembership.create({
            data: {
              user: { connect: { id: user.id } },
              league: { connect: { id: league.id } },
              role: 'MEMBER',
            },
          })
        )
    );

    // Create teams and add players
    console.log('Creating teams and adding players...');
    await Promise.all(
      users.map(async (user, i) => {
        const userData = seedData.users[i];
        const team = await prisma.team.create({
          data: {
            name: userData.team.name,
            color: userData.team.color,
            leagueId: league.id,
            userId: user.id,
          },
        });

        // Add players to team
        await Promise.all(
          userData.team.players.map(async (pgaTourId) => {
            const player = await prisma.player.findFirst({
              where: { pgaTourId },
            });
            if (player) {
              await prisma.teamPlayer.create({
                data: {
                  teamId: team.id,
                  playerId: player.id,
                  active: true,
                },
              });
            } else {
              console.warn(`Player with PGA Tour ID ${pgaTourId} not found`);
            }
          })
        );
      })
    );

    console.log('Seed data created successfully:');
    console.log('Users created:', users.length);
    console.log('League created:', { id: league.id, name: league.name });
    console.log('Teams created:', users.length);
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
