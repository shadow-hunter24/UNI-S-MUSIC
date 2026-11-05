import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const genres = [
  { name: 'Afrobeats', slug: 'afrobeats' },
  { name: 'Hip Hop', slug: 'hip-hop' },
  { name: 'Gospel', slug: 'gospel' },
  { name: 'R&B', slug: 'rnb' },
  { name: 'Reggae', slug: 'reggae' },
  { name: 'Electronic', slug: 'electronic' },
  { name: 'Rock', slug: 'rock' },
  { name: 'Country', slug: 'country' },
  { name: 'Jazz', slug: 'jazz' },
  { name: 'Pop', slug: 'pop' },
];

async function main() {
  console.log('Seeding genres...');
  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: {},
      create: genre,
    });
  }
  console.log(`Seeded ${genres.length} genres.`);

  // Dev-only admin user — never for production
  console.log('Seeding admin user...');
  const passwordHash = await argon2.hash('Admin1234!', { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { email: 'admin@unismusic.dev' },
    update: {},
    create: {
      email: 'admin@unismusic.dev',
      username: 'admin',
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });
  console.log('Seeded admin user.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
