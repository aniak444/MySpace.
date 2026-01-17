const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Sadzenie danych...');

  await prisma.habitLog.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.task.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.visionItem.deleteMany();
  await prisma.mapCountry.deleteMany();
  await prisma.user.deleteMany();
  

  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

  await prisma.user.create({
    data: {
      email: 'admin@myspace.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });


  await prisma.user.create({
    data: {
      email: 'user@myspace.com',
      password: hashedPassword,
      role: 'USER',
      habits: {
        create: [
          { name: 'Picie wody', streak: 5 },
          { name: 'Joga / Stretching', streak: 2 }
        ]
      },
      tasks: {
        create: [
          { title: 'Zrobić projekt na uczelnię', isCompleted: false },
          { title: 'Kupić prezent dla mamy', isCompleted: true }
        ]
      },
      goals: {
        create: [
          { title: 'Zdać egzamin na prawko', year: 2025 }
        ]
      }
    },
  });

  console.log('Baza zresetowana.');
  console.log('Admin: admin@myspace.com (hasło: sekretnehaslo)');
  console.log('User:  user@myspace.com  (hasło: sekretnehaslo)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });