require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const rateLimit = require('express-rate-limit');

const app = express();
const prisma = new PrismaClient();

const SECRET_KEY = process.env.SECRET_KEY;
const PORT = process.env.PORT || 3000;

if (!SECRET_KEY) {
  console.error("nie udało się znależć SECRET_KEY w pliku .env");
  process.exit(1);
}

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minut
  max: 100,
  message: { error: "Za dużo prób logowania! Spróbuj za 15 minut." }
});

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuta
  max: 1000,
  message: { error: "Za dużo zapytań" }
});

app.use(globalLimiter);

app.use(cors());
app.use(express.json({ limit: '50mb' })); // dla zdjęć


const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: "Brak tokena! Zaloguj się." });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    
    const userExists = await prisma.user.findUnique({ where: { id: decoded.userId } });
    
    if (!userExists) {
      return res.status(401).json({ error: "Sesja nieważna (użytkownik nie istnieje)." });
    }

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token nieprawidłowy lub wygasł" });
  }
};


app.post('/register', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role: 'USER' }
    });
    res.json({ message: "Konto utworzone! Zaloguj się." });
  } catch (error) {
    res.status(400).json({ error: "Ten email jest już zajęty." });
  }
});

app.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: "Błędny email lub hasło" });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(400).json({ error: "Błędny email lub hasło" });

  const token = jwt.sign({ userId: user.id, role: user.role }, SECRET_KEY, { expiresIn: '65m' });
  
  res.json({ token, role: user.role, email: user.email });
});


app.get('/tasks', authenticate, async (req, res) => {
  const tasks = await prisma.task.findMany({ 
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' } 
  });
  res.json(tasks);
});

app.post('/tasks', authenticate, async (req, res) => {
  const { title, priority, deadline } = req.body;
  
  const newTask = await prisma.task.create({
    data: { 
      title, 
      userId: req.userId,
      priority: priority || 'LOW',
      deadline: deadline ? new Date(deadline) : null
    }
  });
  res.json(newTask);
});

app.patch('/tasks/:id', authenticate, async (req, res) => {
  const updated = await prisma.task.update({
    where: { id: parseInt(req.params.id) },
    data: { isCompleted: req.body.isCompleted }
  });
  res.json(updated);
});


app.delete('/tasks/:id', authenticate, async (req, res) => {
  await prisma.task.delete({ 
    where: { id: parseInt(req.params.id) } 
  });
  res.json({ message: "Zadanie usunięte" });
});

// NAWYKI
app.get('/habits', authenticate, async (req, res) => {
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

  const habits = await prisma.habit.findMany({
    where: { userId: req.userId },
    include: { logs: { where: { date: { gte: todayStart, lte: todayEnd } } } }
  });

  const habitsWithStatus = habits.map(h => ({ ...h, completedToday: h.logs.length > 0 }));
  res.json(habitsWithStatus);
});


app.post('/habits', authenticate, async (req, res) => {
  const { name } = req.body;
  
  const newHabit = await prisma.habit.create({
    data: { 
      name: name, 
      userId: req.userId 
    }
  });

  res.json({ ...newHabit, completedToday: false });
});


app.post('/habits/:id/toggle', authenticate, async (req, res) => {
  const habitId = parseInt(req.params.id);
  const userId = req.userId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    include: { logs: { orderBy: { date: 'desc' }, take: 1 } } // Pobierz ostatni wpis
  });

  if (!habit) return res.status(404).json({ error: "Nie znaleziono nawyku" });

  const lastLog = habit.logs[0];
  const isDoneToday = lastLog && new Date(lastLog.date).getTime() === today.getTime();

  if (isDoneToday) {
    await prisma.habitLog.delete({ where: { id: lastLog.id } });
    
    const newStreak = Math.max(0, habit.streak - 1);
    const updated = await prisma.habit.update({
      where: { id: habitId },
      data: { streak: newStreak }
    });
    
    return res.json({ ...updated, completedToday: false });

  } else {
    
    const wasDoneYesterday = lastLog && new Date(lastLog.date).getTime() === yesterday.getTime();

    let newStreak = 1;

    if (wasDoneYesterday) {
      newStreak = habit.streak + 1;
    } else if (habit.streak > 0 && !lastLog) {
      newStreak = 1;
    }

    await prisma.habitLog.create({
      data: {
        date: today,
        habitId: habitId
      }
    });

    const updated = await prisma.habit.update({
      where: { id: habitId },
      data: { streak: newStreak }
    });

    return res.json({ ...updated, completedToday: true });
  }
});

app.delete('/habits/:id', authenticate, async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    await prisma.habitLog.deleteMany({
      where: { habitId: id }
    });

    await prisma.habit.delete({
      where: { id: id }
    });

    res.json({ message: "Nawyk usunięty poprawnie" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Błąd usuwania nawyku" });
  }
});

// JOURNAL
app.get('/journal', authenticate, async (req, res) => {
  const entries = await prisma.journalEntry.findMany({ 
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' } 
  });
  res.json(entries);
});

app.post('/journal', authenticate, async (req, res) => {
  const { content, mood } = req.body;
  const newEntry = await prisma.journalEntry.create({
    data: { content, mood, userId: req.userId }
  });
  res.json(newEntry);
});

app.delete('/journal/:id', authenticate, async (req, res) => {
  await prisma.journalEntry.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ message: "Deleted" });
});

// VISION BOARD
app.get('/vision/:year', authenticate, async (req, res) => {
  const year = parseInt(req.params.year);
  const goals = await prisma.goal.findMany({ where: { year, userId: req.userId } });
  const images = await prisma.visionItem.findMany({ where: { year, userId: req.userId } });
  res.json({ goals, images });
});

app.post('/goals', authenticate, async (req, res) => {
  const newGoal = await prisma.goal.create({
    data: { title: req.body.title, year: req.body.year, userId: req.userId }
  });
  res.json(newGoal);
});

app.patch('/goals/:id', authenticate, async (req, res) => {
  const updated = await prisma.goal.update({
    where: { id: parseInt(req.params.id) },
    data: { isCompleted: req.body.isCompleted }
  });
  res.json(updated);
});

app.post('/vision', authenticate, async (req, res) => {
  const newItem = await prisma.visionItem.create({
    data: { imageUrl: req.body.imageUrl, year: req.body.year, userId: req.userId }
  });
  res.json(newItem);
});

app.delete('/vision/:id', authenticate, async (req, res) => {
  await prisma.visionItem.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ message: "Deleted" });
});

// ADMIN
const requireAdmin = (req, res, next) => {
  if (req.userRole !== 'ADMIN') {
    return res.status(403).json({ error: "Brak dostępu! Tylko dla Admina." });
  }
  next();
};

app.get('/admin/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [userCount, taskCount, habitCount, journalCount, mapCount] = await Promise.all([
      prisma.user.count(),
      prisma.task.count(),
      prisma.habit.count(),
      prisma.journalEntry.count(),
      prisma.mapCountry.count()
    ]);

    res.json({
      users: userCount,
      tasks: taskCount,
      habits: habitCount,
      journal: journalCount,
      map: mapCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Błąd pobierania statystyk" });
  }
});

app.get('/admin/users', authenticate, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      createdAt: true
    },
    orderBy: { id: 'asc' }
  });
  res.json(users);
});

app.delete('/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);

  if (id === req.userId) {
    return res.status(400).json({ error: "Nie możesz usunąć swojego konta Admina!" });
  }

  try {
    await prisma.task.deleteMany({ where: { userId: id } });
    await prisma.habitLog.deleteMany({ where: { habit: { userId: id } } });
    await prisma.habit.deleteMany({ where: { userId: id } });
    await prisma.journalEntry.deleteMany({ where: { userId: id } });
    await prisma.goal.deleteMany({ where: { userId: id } });
    await prisma.visionItem.deleteMany({ where: { userId: id } });

    await prisma.user.delete({ where: { id } });
    
    res.json({ message: "Użytkownik usunięty" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Błąd podczas usuwania użytkownika" });
  }
});


// KONTO

app.patch('/change-password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: "Stare hasło jest nieprawidłowe!" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashedNewPassword }
    });

    res.json({ message: "Hasło zostało zmienione pomyślnie!" });
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera." });
  }
});

app.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ 
    where: { id: req.userId },
    select: { email: true } 
  });
  res.json(user);
});


// MAPA
app.get('/map', authenticate, async (req, res) => {
  const countries = await prisma.mapCountry.findMany({
    where: { userId: req.userId }
  });
  res.json(countries);
});

app.post('/map', authenticate, async (req, res) => {
  const { countryCode, status } = req.body;

  const existing = await prisma.mapCountry.findFirst({
    where: { userId: req.userId, countryCode }
  });

  if (existing) {
    const updated = await prisma.mapCountry.update({
      where: { id: existing.id },
      data: { status }
    });
    res.json(updated);
  } else {
    const newCountry = await prisma.mapCountry.create({
      data: { countryCode, status, userId: req.userId }
    });
    res.json(newCountry);
  }
});

app.delete('/map/:code', authenticate, async (req, res) => {
  const entry = await prisma.mapCountry.findFirst({
    where: { userId: req.userId, countryCode: req.params.code }
  });
  
  if (entry) {
    await prisma.mapCountry.delete({ where: { id: entry.id } });
  }
  res.json({ message: "Usunięto" });
});



app.listen(PORT, () => console.log('running on port ${PORT}'));
