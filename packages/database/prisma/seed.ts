import { PrismaClient } from '@prisma/client';

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
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
