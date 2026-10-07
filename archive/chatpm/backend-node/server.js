import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import pg from 'pg';
import mysql from 'mysql2/promise';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import { Firestore } from '@google-cloud/firestore';
import { google } from 'googleapis';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Frontend path - works both locally (../frontend) and in Docker (./frontend)
const FRONTEND_PATH = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, 'frontend')
  : path.join(__dirname, '../frontend');

const app = express();
const PORT = process.env.PORT || 5000;

// Development mode - skip auth if Google credentials not configured
const DEV_MODE = !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET;
const devUser = {
  id: 'dev-user-123',
  email: 'developer@localhost',
  name: 'Developer',
  picture: null
};

// Database state
const dbState = {
  connected: false,
  connectionString: null,
  dbType: null,
  connection: null,
  schema: null,
  documentation: {}
};

// OpenAI client (optional)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Firestore for persistent storage
const firestore = new Firestore({
  projectId: 'striking-loop-447915-q3'
});
const waitlistCollection = firestore.collection('waitlist');
const feedbackCollection = firestore.collection('feedback');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like file:// or mobile apps)
    if (!origin) return callback(null, true);
    // Allow localhost origins
    if (origin.startsWith('http://localhost') || origin.startsWith('file://')) {
      return callback(null, true);
    }
    // Allow configured frontend URL
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    callback(null, true); // Allow all in dev mode
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
}));

// Serve frontend static files
app.use(express.static(FRONTEND_PATH));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth configuration (only if credentials are provided)
if (!DEV_MODE) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
    proxy: true // Trust proxy for Cloud Run (https behind load balancer)
  }, (accessToken, refreshToken, profile, done) => {
    // In a real app, you'd save/lookup user in database
    const user = {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      picture: profile.photos[0]?.value
    };
    return done(null, user);
  }));
}

// Trust proxy for Cloud Run (needed for secure cookies and OAuth callbacks)
app.set('trust proxy', true);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Auth middleware
const requireAuth = (req, res, next) => {
  // In dev mode, always authenticate
  if (DEV_MODE) {
    req.user = devUser;
    return next();
  }
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Auth routes
const getRedirectUrl = () => process.env.FRONTEND_URL || '/';

// /login route - redirects to Google OAuth
app.get('/login', (req, res) => {
  res.redirect('/auth/google');
});

app.get('/auth/google', (req, res, next) => {
  if (DEV_MODE) {
    // In dev mode, auto-login and redirect
    req.login(devUser, (err) => {
      if (err) return next(err);
      res.redirect(getRedirectUrl());
    });
  } else {
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  }
});

app.get('/auth/google/callback', (req, res, next) => {
  if (DEV_MODE) {
    res.redirect(getRedirectUrl());
  } else {
    passport.authenticate('google', { failureRedirect: '/login-failed' })(req, res, () => {
      res.redirect(getRedirectUrl());
    });
  }
});

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

app.get('/auth/user', (req, res) => {
  // In dev mode, always return dev user
  if (DEV_MODE) {
    return res.json({ user: devUser });
  }
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

// Database helper functions
function getDbType(connectionString) {
  if (connectionString.startsWith('sqlite:')) return 'sqlite';
  if (connectionString.startsWith('postgresql:') || connectionString.startsWith('postgres:')) return 'postgresql';
  if (connectionString.startsWith('mysql:')) return 'mysql';
  return null;
}

async function connectToDatabase(connectionString) {
  const dbType = getDbType(connectionString);

  if (dbType === 'sqlite') {
    const dbPath = connectionString.replace('sqlite:///', '').replace('sqlite:', '');
    const db = new Database(dbPath);
    return { type: 'sqlite', connection: db };
  }

  if (dbType === 'postgresql') {
    const pool = new pg.Pool({ connectionString });
    await pool.query('SELECT 1'); // Test connection
    return { type: 'postgresql', connection: pool };
  }

  if (dbType === 'mysql') {
    const connection = await mysql.createConnection(connectionString.replace('mysql://', ''));
    await connection.query('SELECT 1'); // Test connection
    return { type: 'mysql', connection };
  }

  throw new Error('Unsupported database type');
}

async function executeQuery(query, params = []) {
  const { type, connection } = { type: dbState.dbType, connection: dbState.connection };

  if (type === 'sqlite') {
    const stmt = connection.prepare(query);
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      return stmt.all(...params);
    }
    return stmt.run(...params);
  }

  if (type === 'postgresql') {
    const result = await connection.query(query, params);
    return result.rows;
  }

  if (type === 'mysql') {
    const [rows] = await connection.query(query, params);
    return rows;
  }
}

async function getSchema() {
  const schema = { tables: {} };
  const { type, connection } = { type: dbState.dbType, connection: dbState.connection };

  if (type === 'sqlite') {
    const tables = connection.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

    for (const table of tables) {
      const columns = connection.prepare(`PRAGMA table_info(${table.name})`).all();
      const foreignKeys = connection.prepare(`PRAGMA foreign_key_list(${table.name})`).all();
      const rowCount = connection.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      const sampleData = connection.prepare(`SELECT * FROM ${table.name} LIMIT 5`).all();

      schema.tables[table.name] = {
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          nullable: !col.notnull,
          primaryKey: col.pk === 1
        })),
        foreignKeys: foreignKeys.map(fk => ({
          column: fk.from,
          references: { table: fk.table, column: fk.to }
        })),
        rowCount: rowCount.count,
        sampleData
      };
    }
  }

  if (type === 'postgresql') {
    const tablesResult = await connection.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;

      const columnsResult = await connection.query(`
        SELECT column_name, data_type, is_nullable,
               (SELECT EXISTS (
                 SELECT 1 FROM information_schema.table_constraints tc
                 JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                 WHERE tc.table_name = c.table_name AND tc.constraint_type = 'PRIMARY KEY' AND kcu.column_name = c.column_name
               )) as is_primary
        FROM information_schema.columns c WHERE table_name = $1
      `, [tableName]);

      const fkResult = await connection.query(`
        SELECT kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'
      `, [tableName]);

      const countResult = await connection.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const sampleResult = await connection.query(`SELECT * FROM "${tableName}" LIMIT 5`);

      schema.tables[tableName] = {
        columns: columnsResult.rows.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          primaryKey: col.is_primary
        })),
        foreignKeys: fkResult.rows.map(fk => ({
          column: fk.column_name,
          references: { table: fk.foreign_table, column: fk.foreign_column }
        })),
        rowCount: parseInt(countResult.rows[0].count),
        sampleData: sampleResult.rows
      };
    }
  }

  if (type === 'mysql') {
    const [tables] = await connection.query('SHOW TABLES');
    const tableKey = Object.keys(tables[0])[0];

    for (const row of tables) {
      const tableName = row[tableKey];

      const [columns] = await connection.query(`DESCRIBE ${tableName}`);
      const [foreignKeys] = await connection.query(`
        SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [tableName]);

      const [[countRow]] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const [sampleData] = await connection.query(`SELECT * FROM ${tableName} LIMIT 5`);

      schema.tables[tableName] = {
        columns: columns.map(col => ({
          name: col.Field,
          type: col.Type,
          nullable: col.Null === 'YES',
          primaryKey: col.Key === 'PRI'
        })),
        foreignKeys: foreignKeys.map(fk => ({
          column: fk.COLUMN_NAME,
          references: { table: fk.REFERENCED_TABLE_NAME, column: fk.REFERENCED_COLUMN_NAME }
        })),
        rowCount: countRow.count,
        sampleData
      };
    }
  }

  return schema;
}

// Query validation
function validateQuery(question, query, schema) {
  const validation = { confidence: 100, issues: [], suggestions: [] };
  const questionLower = question.toLowerCase();
  const queryUpper = query.toUpperCase();

  // Check for count queries
  if ((questionLower.includes('how many') || questionLower.includes('count')) && !queryUpper.includes('COUNT')) {
    validation.confidence -= 30;
    validation.issues.push('Question asks for count but query does not use COUNT()');
    validation.suggestions.push('Consider using COUNT() function');
  }

  // Check for aggregation queries
  const aggKeywords = ['total', 'sum', 'average', 'avg', 'minimum', 'min', 'maximum', 'max'];
  const hasAggKeyword = aggKeywords.some(k => questionLower.includes(k));
  const hasAggFunction = ['SUM(', 'AVG(', 'MIN(', 'MAX('].some(f => queryUpper.includes(f));

  if (hasAggKeyword && !hasAggFunction && !queryUpper.includes('COUNT')) {
    validation.confidence -= 20;
    validation.issues.push('Question implies aggregation but query lacks aggregate functions');
  }

  // Check for grouping
  if (questionLower.includes('by') && questionLower.includes('each') && !queryUpper.includes('GROUP BY')) {
    validation.confidence -= 15;
    validation.issues.push('Question implies grouping but query lacks GROUP BY');
    validation.suggestions.push('Consider adding GROUP BY clause');
  }

  // Check for top N queries
  const topMatch = questionLower.match(/top\s+(\d+)/);
  if (topMatch && !queryUpper.includes('LIMIT')) {
    validation.confidence -= 20;
    validation.issues.push(`Question asks for top ${topMatch[1]} but query has no LIMIT`);
    validation.suggestions.push(`Add LIMIT ${topMatch[1]} to query`);
  }

  // Check for date/time filtering
  const dateKeywords = ['today', 'yesterday', 'last week', 'last month', 'this year', 'recent'];
  const hasDateKeyword = dateKeywords.some(k => questionLower.includes(k));
  if (hasDateKeyword && !queryUpper.includes('WHERE')) {
    validation.confidence -= 25;
    validation.issues.push('Question mentions time period but query has no WHERE clause for filtering');
  }

  return validation;
}

// Pattern-based query generation (fallback)
function generatePatternQuery(question, schema) {
  const questionLower = question.toLowerCase();
  const tables = Object.keys(schema.tables);

  // Find relevant table
  let targetTable = null;
  for (const table of tables) {
    if (questionLower.includes(table.toLowerCase()) ||
        questionLower.includes(table.replace(/_/g, ' ').toLowerCase())) {
      targetTable = table;
      break;
    }
  }

  if (!targetTable && tables.length > 0) {
    targetTable = tables[0];
  }

  if (!targetTable) return null;

  const tableInfo = schema.tables[targetTable];
  const numericCols = tableInfo.columns.filter(c =>
    ['int', 'integer', 'decimal', 'numeric', 'float', 'double', 'real', 'bigint', 'smallint']
      .some(t => c.type.toLowerCase().includes(t))
  );

  // Count query
  if (questionLower.includes('how many') || questionLower.includes('count')) {
    return `SELECT COUNT(*) as count FROM ${targetTable}`;
  }

  // Sum/total query
  if ((questionLower.includes('total') || questionLower.includes('sum')) && numericCols.length > 0) {
    return `SELECT SUM(${numericCols[0].name}) as total FROM ${targetTable}`;
  }

  // Average query
  if (questionLower.includes('average') || questionLower.includes('avg')) {
    if (numericCols.length > 0) {
      return `SELECT AVG(${numericCols[0].name}) as average FROM ${targetTable}`;
    }
  }

  // Default: select all with limit
  return `SELECT * FROM ${targetTable} LIMIT 10`;
}

// AI query generation
async function generateAIQuery(question, schema, documentation) {
  if (!openai) return null;

  const schemaDescription = Object.entries(schema.tables).map(([name, info]) => {
    const cols = info.columns.map(c => `${c.name} (${c.type}${c.primaryKey ? ', PK' : ''})`).join(', ');
    const doc = documentation[name]?.description || '';
    return `Table: ${name}${doc ? ` - ${doc}` : ''}\nColumns: ${cols}`;
  }).join('\n\n');

  const prompt = `You are a SQL expert. Generate a SQL query for the following question.

Database Schema:
${schemaDescription}

Question: ${question}

Return ONLY the SQL query, no explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    });

    let query = response.choices[0].message.content.trim();
    // Clean up markdown artifacts
    query = query.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim();
    return query;
  } catch (error) {
    console.error('OpenAI error:', error);
    return null;
  }
}

// API Routes

// Connection status
app.get('/api/status', (req, res) => {
  res.json({
    connected: dbState.connected,
    dbType: dbState.dbType,
    schemaLoaded: !!dbState.schema,
    hasDocumentation: Object.keys(dbState.documentation).length > 0
  });
});

// Connect to database
app.post('/api/connect', requireAuth, async (req, res) => {
  try {
    const { connectionString } = req.body;

    if (!connectionString) {
      return res.status(400).json({ error: 'Connection string is required' });
    }

    // Close existing connection
    if (dbState.connection) {
      if (dbState.dbType === 'sqlite') {
        dbState.connection.close();
      } else if (dbState.dbType === 'postgresql') {
        await dbState.connection.end();
      } else if (dbState.dbType === 'mysql') {
        await dbState.connection.end();
      }
    }

    const { type, connection } = await connectToDatabase(connectionString);

    dbState.connected = true;
    dbState.connectionString = connectionString;
    dbState.dbType = type;
    dbState.connection = connection;
    dbState.schema = null;

    res.json({ success: true, dbType: type });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Explore schema
app.get('/api/explore', requireAuth, async (req, res) => {
  try {
    if (!dbState.connected) {
      return res.status(400).json({ error: 'Not connected to database' });
    }

    const schema = await getSchema();
    dbState.schema = schema;

    res.json(schema);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute query
app.post('/api/query', requireAuth, async (req, res) => {
  try {
    if (!dbState.connected) {
      return res.status(400).json({ error: 'Not connected to database' });
    }

    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Safety check - only allow SELECT
    const queryUpper = query.trim().toUpperCase();
    if (!queryUpper.startsWith('SELECT')) {
      return res.status(400).json({ error: 'Only SELECT queries are allowed' });
    }

    const rows = await executeQuery(query);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    res.json({ columns, data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate query from natural language
app.post('/api/generate-query', requireAuth, async (req, res) => {
  try {
    if (!dbState.connected) {
      return res.status(400).json({ error: 'Not connected to database' });
    }

    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Auto-load schema if not loaded
    if (!dbState.schema) {
      dbState.schema = await getSchema();
    }

    let query = null;
    let method = 'pattern';

    // Try AI generation first
    if (openai) {
      query = await generateAIQuery(question, dbState.schema, dbState.documentation);
      if (query) method = 'ai';
    }

    // Fall back to pattern matching
    if (!query) {
      query = generatePatternQuery(question, dbState.schema);
    }

    if (!query) {
      return res.status(400).json({ error: 'Could not generate query from question' });
    }

    const validation = validateQuery(question, query, dbState.schema);

    res.json({ query, method, validation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get documentation
app.get('/api/documentation', requireAuth, (req, res) => {
  res.json(dbState.documentation);
});

// Save documentation
app.post('/api/documentation', requireAuth, (req, res) => {
  const { documentation } = req.body;
  dbState.documentation = documentation || {};
  res.json({ success: true });
});

// Waitlist signup - store emails in SQLite database
const waitlistDb = new Database('waitlist.db');
waitlistDb.exec(`
  CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.post('/api/waitlist', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Check if email already exists in Firestore
    const existingDoc = await waitlistCollection.doc(email).get();
    if (existingDoc.exists) {
      return res.json({ success: true, message: 'You\'re already on the list!' });
    }

    // Add email to Firestore waitlist
    await waitlistCollection.doc(email).set({
      email: email,
      createdAt: new Date().toISOString(),
      source: 'website'
    });

    console.log(`New waitlist signup: ${email}`);
    res.json({ success: true, message: 'Successfully added to waitlist!' });
  } catch (error) {
    console.error('Waitlist error:', error);
    res.status(500).json({ error: 'Failed to add to waitlist. Please try again.' });
  }
});

// Get all waitlist entries (for admin)
app.get('/api/waitlist', async (req, res) => {
  try {
    const snapshot = await waitlistCollection.orderBy('createdAt', 'desc').get();
    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, count: entries.length, entries });
  } catch (error) {
    console.error('Waitlist fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist' });
  }
});

// Feedback endpoint
app.post('/api/feedback', async (req, res) => {
  try {
    const { page, feedback, timestamp } = req.body;

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ error: 'Feedback is required' });
    }

    // Save feedback to Firestore
    const docRef = await feedbackCollection.add({
      page: page || 'unknown',
      feedback: feedback.trim(),
      timestamp: timestamp || new Date().toISOString(),
      createdAt: new Date(),
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    console.log(`New feedback from ${page}: ${feedback.substring(0, 50)}...`);
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// Review Analyzer endpoint
app.post('/api/analyze-reviews', async (req, res) => {
  // Prevent caching of API responses
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    const { reviews } = req.body;

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ error: 'Reviews array is required' });
    }

    // Use OpenAI to analyze reviews if available
    if (openai) {
      const prompt = `You are a product analyst. Analyze customer reviews and identify SPECIFIC FEATURES or ATTRIBUTES being discussed.

YOUR #1 RULE: Keywords must be PRODUCT FEATURES or SERVICE ATTRIBUTES - things you can point to in the product.

ALLOWED KEYWORDS (use these or similar):
- "signup process", "login flow", "onboarding", "account creation"
- "pricing", "subscription plans", "billing", "payment options", "refunds"
- "customer support", "support team", "response time", "help center"
- "mobile app", "desktop version", "browser extension"
- "search functionality", "filters", "navigation", "menu", "dashboard"
- "checkout process", "cart", "shipping", "delivery", "tracking"
- "notifications", "alerts", "email updates"
- "performance", "loading speed", "reliability", "uptime"
- "user interface", "design", "layout"
- "documentation", "tutorials", "guides"

FORBIDDEN KEYWORDS (NEVER use these as keywords):
- Emotions: "love", "hate", "like", "dislike"
- Quality words: "good", "bad", "great", "terrible", "excellent", "poor", "amazing", "awful"
- Generic: "experience", "service", "product", "app", "helpful", "easy", "nice"

Return JSON:
{
  "pros": [{"keyword": "feature name", "summary": "2-3 sentence description", "count": number, "sentences": ["exact review text 1", "exact review text 2"], "searchTerms": ["term1", "term2"]}],
  "cons": [{"keyword": "feature name", "summary": "2-3 sentence description", "count": number, "sentences": ["exact review text 1", "exact review text 2"], "searchTerms": ["term1", "term2"]}]
}

CRITICAL FOR "sentences" FIELD:
- Include the EXACT, COMPLETE review text from the input - copy it word for word
- Only include reviews that ACTUALLY mention this feature/attribute
- These must be real reviews from the input, not summaries or paraphrases
- "searchTerms" should list the actual words/phrases from reviews that relate to this keyword (e.g., for "customer support": ["support", "help desk", "customer service", "agent"])

Example good output:
- keyword: "customer support" NOT "helpful"
- keyword: "checkout process" NOT "easy"
- keyword: "mobile app" NOT "great"
- keyword: "pricing" NOT "expensive"
- keyword: "signup flow" NOT "simple"

Summary example: "The customer support team was praised for quick response times, typically under 2 hours. Users especially appreciated the knowledgeable agents who resolved issues on first contact."

Reviews to analyze:
${reviews.slice(0, 100).map((r, i) => `${i + 1}. ${r}`).join('\n')}`;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);
        return res.json(result);
      } catch (aiError) {
        console.error('OpenAI error:', aiError);
        // Fall back to basic analysis
      }
    }

    // Basic keyword extraction fallback (without AI)
    console.log('Using fallback analysis (no AI available or AI failed)');

    // Attribute-based templates for fallback analysis
    const attributePatterns = {
      // Positive patterns - map search terms to attribute keywords
      'customer support': {
        searchTerms: ['support', 'help desk', 'customer service', 'support team', 'agent'],
        summary: 'The customer support team received praise for being responsive and helpful. Users noted quick resolution times and knowledgeable staff who understood their issues.'
      },
      'signup process': {
        searchTerms: ['sign up', 'signup', 'register', 'registration', 'create account', 'onboard'],
        summary: 'The signup process was described as smooth and straightforward. Users appreciated the minimal steps required to get started with the product.'
      },
      'user interface': {
        searchTerms: ['interface', 'ui', 'design', 'layout', 'look', 'clean', 'intuitive'],
        summary: 'The user interface received positive feedback for its clean design and intuitive layout. Users found it easy to navigate and locate features.'
      },
      'pricing': {
        searchTerms: ['price', 'pricing', 'cost', 'value', 'affordable', 'cheap', 'worth'],
        summary: 'The pricing structure was seen as fair and competitive. Users felt they received good value for the features and quality provided.'
      },
      'mobile app': {
        searchTerms: ['mobile', 'app', 'phone', 'android', 'ios', 'iphone'],
        summary: 'The mobile app was praised for its functionality and ease of use. Users appreciated having full features available on their phones.'
      },
      'performance': {
        searchTerms: ['fast', 'speed', 'quick', 'performance', 'load', 'responsive'],
        summary: 'The performance was consistently praised with users noting fast load times and responsive interactions. The system handled tasks efficiently.'
      },
      'checkout process': {
        searchTerms: ['checkout', 'payment', 'purchase', 'buy', 'cart', 'order'],
        summary: 'The checkout process was smooth and hassle-free according to users. Payment options were flexible and the flow was straightforward.'
      },
      'shipping': {
        searchTerms: ['shipping', 'delivery', 'arrived', 'package', 'fast delivery'],
        summary: 'The shipping and delivery experience exceeded expectations. Products arrived on time and in good condition.'
      },
      'search functionality': {
        searchTerms: ['search', 'find', 'filter', 'sort', 'browse'],
        summary: 'The search functionality helped users quickly find what they needed. Filters and sorting options made browsing efficient.'
      },
      'documentation': {
        searchTerms: ['documentation', 'docs', 'guide', 'tutorial', 'instructions', 'manual'],
        summary: 'The documentation was comprehensive and easy to follow. Users found helpful guides that answered their questions.'
      }
    };

    const negativeAttributePatterns = {
      'customer support': {
        searchTerms: ['support', 'help', 'customer service', 'no response', 'waiting'],
        summary: 'The customer support experience was frustrating for many users. Long wait times and unhelpful responses were commonly cited issues.'
      },
      'pricing': {
        searchTerms: ['expensive', 'overpriced', 'cost', 'price', 'fee', 'charge'],
        summary: 'The pricing was considered too high by many users relative to competitors. Hidden fees and unexpected charges added to the frustration.'
      },
      'performance': {
        searchTerms: ['slow', 'lag', 'crash', 'freeze', 'loading', 'hang'],
        summary: 'Performance issues plagued the user experience with slow load times and crashes. Users reported lost work and productivity due to instability.'
      },
      'mobile app': {
        searchTerms: ['mobile', 'app', 'phone', 'crash', 'bug'],
        summary: 'The mobile app had significant issues including crashes and missing features. Users found it less reliable than the desktop version.'
      },
      'checkout process': {
        searchTerms: ['checkout', 'payment', 'cart', 'error', 'fail'],
        summary: 'The checkout process caused frustration with errors and lost cart items. Users had to retry multiple times to complete purchases.'
      },
      'user interface': {
        searchTerms: ['confusing', 'interface', 'ui', 'navigate', 'find', 'unclear'],
        summary: 'The user interface was described as confusing and hard to navigate. Users struggled to find features and complete basic tasks.'
      },
      'shipping': {
        searchTerms: ['shipping', 'delivery', 'late', 'delayed', 'lost', 'damaged'],
        summary: 'Shipping and delivery problems were a major pain point. Late arrivals, damaged packages, and lost orders were frequently mentioned.'
      },
      'signup process': {
        searchTerms: ['signup', 'register', 'account', 'verify', 'confirmation'],
        summary: 'The signup process was cumbersome with too many steps required. Users encountered errors and verification issues that delayed access.'
      },
      'notifications': {
        searchTerms: ['notification', 'email', 'spam', 'alert', 'too many'],
        summary: 'The notification system was overwhelming with too many emails and alerts. Users felt spammed and had trouble managing preferences.'
      },
      'billing': {
        searchTerms: ['billing', 'charge', 'invoice', 'cancel', 'refund', 'subscription'],
        summary: 'Billing issues caused significant problems including unexpected charges and difficulty canceling. Refund processes were described as painful.'
      }
    };

    const prosMap = {};
    const consMap = {};

    // Positive sentiment indicators
    const positiveIndicators = ['great', 'love', 'excellent', 'amazing', 'good', 'best', 'helpful', 'easy', 'fast', 'beautiful', 'perfect', 'awesome', 'fantastic', 'wonderful', 'nice', 'friendly', 'quick', 'simple', 'intuitive', 'reliable', 'recommend'];
    // Negative sentiment indicators
    const negativeIndicators = ['bad', 'terrible', 'awful', 'slow', 'crash', 'bug', 'broken', 'hate', 'worst', 'poor', 'difficult', 'confusing', 'expensive', 'annoying', 'frustrating', 'useless', 'disappointing', 'horrible', 'laggy', 'glitch', 'error', 'fail', 'problem', 'issue'];

    reviews.forEach(review => {
      const lowerReview = review.toLowerCase();
      const isPositive = positiveIndicators.some(word => lowerReview.includes(word));
      const isNegative = negativeIndicators.some(word => lowerReview.includes(word));

      // Check for attribute matches in positive context
      if (isPositive) {
        Object.entries(attributePatterns).forEach(([attribute, config]) => {
          if (config.searchTerms.some(term => lowerReview.includes(term))) {
            if (!prosMap[attribute]) prosMap[attribute] = { count: 0, sentences: [], summary: config.summary };
            prosMap[attribute].count++;
            if (prosMap[attribute].sentences.length < 5) prosMap[attribute].sentences.push(review);
          }
        });
      }

      // Check for attribute matches in negative context
      if (isNegative) {
        Object.entries(negativeAttributePatterns).forEach(([attribute, config]) => {
          if (config.searchTerms.some(term => lowerReview.includes(term))) {
            if (!consMap[attribute]) consMap[attribute] = { count: 0, sentences: [], summary: config.summary };
            consMap[attribute].count++;
            if (consMap[attribute].sentences.length < 5) consMap[attribute].sentences.push(review);
          }
        });
      }
    });

    const pros = Object.entries(prosMap)
      .map(([keyword, data]) => ({ keyword, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const cons = Object.entries(consMap)
      .map(([keyword, data]) => ({ keyword, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({ pros, cons });

  } catch (error) {
    console.error('Review analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze reviews' });
  }
});

// Competitive Comparison endpoint
app.post('/api/compare-reviews', async (req, res) => {
  // Prevent caching of API responses
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    const { company1, company2 } = req.body;

    if (!company1?.reviews?.length || !company2?.reviews?.length) {
      return res.status(400).json({ error: 'Reviews for both companies are required' });
    }

    // Use OpenAI to compare reviews
    if (openai) {
      const prompt = `You are a competitive analyst. Compare customer reviews from two companies and rate each on common attributes.

TASK: Identify the key PRODUCT ATTRIBUTES mentioned across both sets of reviews, then score each company on those attributes.

RULES FOR ATTRIBUTES:
- Use functional feature names: "customer support", "pricing", "mobile app", "checkout process", "user interface", "performance", "shipping", "onboarding", "notifications", "search functionality"
- NEVER use generic terms like "overall experience", "quality", "satisfaction"
- Each attribute should be something concrete you can point to in the product

SCORING:
- Score from 0-100 based on sentiment in the reviews
- Higher = more positive mentions relative to total mentions
- If an attribute isn't mentioned for a company, set score to null
- Base scores on actual review content, not assumptions

Company 1 (${company1.name}): ${company1.reviews.length} reviews
Company 2 (${company2.name}): ${company2.reviews.length} reviews

Return JSON:
{
  "attributes": [
    {
      "name": "attribute name (functional feature)",
      "description": "What this attribute covers",
      "company1Score": number or null,
      "company2Score": number or null,
      "company1Sentences": ["exact review excerpts mentioning this"],
      "company2Sentences": ["exact review excerpts mentioning this"]
    }
  ]
}

Include 6-10 attributes that are actually discussed in the reviews. Sort by total relevance (most discussed first).

Company 1 Reviews:
${company1.reviews.slice(0, 50).map((r, i) => `${i + 1}. ${r}`).join('\n')}

Company 2 Reviews:
${company2.reviews.slice(0, 50).map((r, i) => `${i + 1}. ${r}`).join('\n')}`;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);
        return res.json(result);
      } catch (aiError) {
        console.error('OpenAI error:', aiError);
      }
    }

    // Fallback: basic attribute comparison without AI
    console.log('Using fallback comparison (no AI)');

    const attributeKeywords = {
      'Customer Support': ['support', 'help', 'service', 'response', 'agent'],
      'User Interface': ['interface', 'ui', 'design', 'layout', 'look'],
      'Performance': ['fast', 'slow', 'speed', 'loading', 'crash'],
      'Pricing': ['price', 'cost', 'expensive', 'cheap', 'value'],
      'Mobile App': ['app', 'mobile', 'phone', 'android', 'ios'],
      'Checkout Process': ['checkout', 'payment', 'purchase', 'cart'],
      'Shipping': ['shipping', 'delivery', 'arrived', 'package'],
      'Onboarding': ['signup', 'register', 'onboard', 'started']
    };

    const positiveWords = ['great', 'good', 'love', 'excellent', 'amazing', 'best', 'easy', 'fast', 'helpful', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'slow', 'crash', 'worst', 'hate', 'difficult', 'poor', 'awful'];

    function analyzeAttribute(reviews, keywords) {
      let positive = 0, negative = 0, sentences = [];
      reviews.forEach(review => {
        const lower = review.toLowerCase();
        if (keywords.some(k => lower.includes(k))) {
          const isPositive = positiveWords.some(w => lower.includes(w));
          const isNegative = negativeWords.some(w => lower.includes(w));
          if (isPositive) positive++;
          if (isNegative) negative++;
          if (sentences.length < 3) sentences.push(review);
        }
      });
      const total = positive + negative;
      if (total === 0) return { score: null, sentences: [] };
      return { score: Math.round((positive / total) * 100), sentences };
    }

    const attributes = Object.entries(attributeKeywords).map(([name, keywords]) => {
      const c1 = analyzeAttribute(company1.reviews, keywords);
      const c2 = analyzeAttribute(company2.reviews, keywords);
      return {
        name,
        description: `How customers rated ${name.toLowerCase()}`,
        company1Score: c1.score,
        company2Score: c2.score,
        company1Sentences: c1.sentences,
        company2Sentences: c2.sentences
      };
    }).filter(a => a.company1Score !== null || a.company2Score !== null);

    res.json({ attributes });

  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ error: 'Failed to compare reviews' });
  }
});

// Serve review-analyzer page
app.get('/review-analyzer', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'review-analyzer.html'));
});

// Serve compare-reviews page
app.get('/compare-reviews', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'compare-reviews.html'));
});

// Serve requirement-reviewer page
app.get('/requirement-reviewer', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'requirement-reviewer.html'));
});

// Requirement Review endpoint - CFO and CEO personas
app.post('/api/review-requirements', async (req, res) => {
  // Prevent caching of API responses
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    const { content, reviewer, existingComments } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Document content is required' });
    }

    if (!reviewer || !['cfo', 'ceo'].includes(reviewer)) {
      return res.status(400).json({ error: 'Valid reviewer (cfo or ceo) is required' });
    }

    // Check if this is a re-review (has existing comments to validate)
    const isReReview = existingComments && existingComments.length > 0;
    const existingCommentsContext = isReReview ? `

EXISTING COMMENTS TO VALIDATE:
The following comments were made in a previous review. For each one, determine if the document now addresses this concern:
${existingComments.map((c, i) => `${i + 1}. Excerpt: "${c.excerpt}" | Comment: "${c.comment}"`).join('\n')}

For the "resolvedComments" array, list the index (1-based) of each comment that has been adequately addressed in the current document.
` : '';

    // Use OpenAI to analyze the requirements document
    if (openai) {
      const cfoPrompt = `You are a Chief Financial Officer (CFO) reviewing a requirements document for an E-COMMERCE COMPANY.

YOUR CFO MINDSET - You are metrics-driven and ROI-focused. You ONLY care about these specific areas:
1. OBJECTIVE: What is the clear objective? Is it measurable?
2. EXPECTED OUTCOME: What specific outcome is expected? Is it quantified?
3. MONETARY VALUE: Does the outcome have a significant monetary value attached? What is it?
4. COST: What is the total cost (development, maintenance, opportunity cost)?
5. 2-YEAR ROI RULE: If the outcome does not cover the cost within a 2-year period, it is NOT worth pursuing.

STRICT RULES - YOU MUST FOLLOW THESE:
- ONLY comment on issues related to the 5 areas above (objective, outcome, monetary value, cost, 2-year ROI)
- DO NOT make generic comments about anything else
- DO NOT comment on technical implementation, timeline, team structure, or anything outside financial metrics
- If the document already addresses one of your 5 areas adequately, DO NOT comment on it
- Your comments must be DIRECTLY tied to one of the 5 CFO priorities above

REVIEW INSTRUCTIONS:
1. Read the document and check if objective, outcome, monetary value, cost, and 2-year ROI are clearly defined
2. ONLY comment on areas that are missing or unclear from your 5 priorities
3. Provide only 2-3 high-impact comments maximum
4. Each comment MUST relate to: objective, outcome, monetary value, cost, or 2-year ROI - nothing else
${existingCommentsContext}
Return JSON format:
{
  "comments": [
    {
      "excerpt": "The exact text from the document you're commenting on (30-100 characters)",
      "comment": "Your CFO feedback/question - MUST relate to objective/outcome/monetary value/cost/2-year ROI",
      "position": approximate character position in document (number)
    }
  ]${isReReview ? `,
  "resolvedComments": [1, 3, 5]  // Array of 1-based indices of existing comments that are now resolved` : ''}
}

Requirements Document to Review:
${content}`;

      const ceoPrompt = `You are a Chief Executive Officer (CEO) reviewing a requirements document for an E-COMMERCE COMPANY.

YOUR COMPANY'S 3 STRATEGIC GOALS - These are the ONLY things you care about:
1. CUSTOMER SATISFACTION: Improve NPS from 65 to 70 - every initiative must demonstrably improve customer experience
2. PLATFORM FOR NEW BUSINESS: Build a platform that enables launching new lines of business quickly and efficiently
3. CORE COMPETENCE & IP: Build best-in-class internal capabilities and intellectual property that differentiate us

STRICT RULES - YOU MUST FOLLOW THESE:
- ONLY comment on issues related to the 3 strategic goals above
- DO NOT make generic comments about anything else
- DO NOT comment on budget, timeline, technical details, or anything outside the 3 strategic goals
- If the document already shows clear alignment with one of the 3 goals, DO NOT comment on it
- Your comments must be DIRECTLY tied to one of the 3 strategic goals above

REVIEW INSTRUCTIONS:
1. Read the document and check if it clearly addresses NPS/customer satisfaction, platform extensibility, and IP/core competence
2. ONLY comment on areas where strategic alignment to one of the 3 goals is missing or unclear
3. Provide only 2-3 high-impact comments maximum
4. Each comment MUST relate to: NPS improvement, platform for new business, or core competence/IP - nothing else
${existingCommentsContext}
Return JSON format:
{
  "comments": [
    {
      "excerpt": "The exact text from the document you're commenting on (30-100 characters)",
      "comment": "Your CEO feedback - MUST relate to NPS/customer satisfaction, platform extensibility, or IP/core competence",
      "position": approximate character position in document (number)
    }
  ]${isReReview ? `,
  "resolvedComments": [1, 3, 5]  // Array of 1-based indices of existing comments that are now resolved` : ''}
}

Requirements Document to Review:
${content}`;

      const prompt = reviewer === 'cfo' ? cfoPrompt : ceoPrompt;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-5.2',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);
        return res.json(result);
      } catch (aiError) {
        console.error('OpenAI error:', aiError);
        // Fall back to mock comments if AI fails
      }
    }

    // Fallback: Generate mock comments if no AI available
    console.log('Using fallback review (no AI available)');

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const mockComments = [];

    const cfoMockResponses = [
      "What's the budget allocation for this? We need specific cost estimates.",
      "ROI needs to be quantified. What metrics will measure success?",
      "Have we factored in ongoing maintenance costs?",
      "This requires additional resources. Is this in our hiring plan?",
      "Consider the licensing costs implications here.",
      "What's the payback period for this investment?",
      "We should get 3 vendor quotes before committing.",
      "This impacts our cash flow projections for Q3."
    ];

    const ceoMockResponses = [
      "How does this align with our strategic vision?",
      "What's the customer impact? Make it more explicit.",
      "Timeline seems aggressive. Ensure we have capacity.",
      "This could be a competitive differentiator. Emphasize it.",
      "Consider scalability for future growth.",
      "Who are the key stakeholders we need to align?",
      "What's the risk mitigation plan?",
      "How will this affect our market positioning?"
    ];

    const responses = reviewer === 'cfo' ? cfoMockResponses : ceoMockResponses;
    const numComments = Math.min(Math.floor(sentences.length / 2), 5);

    for (let i = 0; i < numComments; i++) {
      const sentenceIndex = Math.floor((i / numComments) * sentences.length);
      const sentence = sentences[sentenceIndex]?.trim();
      if (sentence && sentence.length > 20) {
        mockComments.push({
          excerpt: sentence.substring(0, 80),
          comment: responses[i % responses.length],
          position: content.indexOf(sentence)
        });
      }
    }

    res.json({ comments: mockComments });

  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: 'Failed to review requirements' });
  }
});

// ============================================
// SETUP / IMPORT ROUTES (No authentication required)
// ============================================

// Serve setup page
app.get('/setup', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'setup.html'));
});

// Import from Google Docs (public document)
app.post('/api/import/google-docs', async (req, res) => {
  try {
    const { docUrl } = req.body;

    if (!docUrl) {
      return res.status(400).json({ error: 'Google Doc URL is required' });
    }

    // Extract document ID from URL
    // Formats:
    // https://docs.google.com/document/d/DOCUMENT_ID/edit
    // https://docs.google.com/document/d/DOCUMENT_ID/pub
    const docIdMatch = docUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (!docIdMatch) {
      return res.status(400).json({ error: 'Invalid Google Docs URL. Please use a URL like: https://docs.google.com/document/d/YOUR_DOC_ID/edit' });
    }

    const documentId = docIdMatch[1];

    // Fetch HTML format to preserve bold/heading structure
    const htmlUrl = `https://docs.google.com/document/d/${documentId}/export?format=html`;
    const textUrl = `https://docs.google.com/document/d/${documentId}/export?format=txt`;

    // Fetch both HTML (for structure) and text (for display)
    const [htmlResponse, textResponse] = await Promise.all([
      fetch(htmlUrl),
      fetch(textUrl)
    ]);

    if (!htmlResponse.ok || !textResponse.ok) {
      const status = htmlResponse.status || textResponse.status;
      if (status === 404) {
        return res.status(404).json({ error: 'Document not found. Make sure the document exists.' });
      }
      if (status === 401 || status === 403) {
        return res.status(403).json({
          error: 'Document is not publicly shared. Please: 1) Open the doc, 2) Click Share, 3) Change "Restricted" to "Anyone with the link", 4) Set to Viewer, 5) Click Done'
        });
      }
      return res.status(status).json({ error: `Failed to fetch document (HTTP ${status}): ${htmlResponse.statusText || textResponse.statusText}` });
    }

    const htmlContent = await htmlResponse.text();
    const textContent = await textResponse.text();

    // Check if we got an auth page
    if (htmlContent.includes('accounts.google.com') || htmlContent.includes('ServiceLogin')) {
      return res.status(403).json({
        error: 'Document requires authentication. Please make it publicly accessible: Share > Anyone with the link > Viewer'
      });
    }

    // Check if content is empty
    if (!textContent || textContent.trim().length === 0) {
      return res.json({
        success: true,
        documentId,
        rawContent: '',
        parsed: { strategies: [] },
        warning: 'Document appears to be empty'
      });
    }

    // Parse the content using HTML for structure detection
    const parsed = parseStrategyDocument(htmlContent, textContent);

    res.json({
      success: true,
      documentId,
      rawContent: textContent,
      rawHtml: htmlContent,
      parsed,
      contentLength: textContent.length
    });

  } catch (error) {
    console.error('Google Docs import error:', error);
    res.status(500).json({ error: 'Failed to import from Google Docs: ' + error.message });
  }
});

// Parse strategy document content into structured data
// Uses HTML for structure detection (bold, headings) and text for content
function parseStrategyDocument(htmlContent, textContent) {
  const strategies = [];

  // Strategy keywords to look for
  const strategyKeywords = [
    'focus area',
    'strategic focus',
    'strategic priority',
    'strategic pillar',
    'dimension',
    'priority area',
    'key initiative',
    'strategic theme',
    'pillar'
  ];

  // Goal keywords
  const goalKeywords = [
    'goal',
    'objective',
    'target',
    'outcome',
    'key result',
    'deliverable'
  ];

  // Extract structured elements from HTML
  // Google Docs HTML uses <span> with font-weight for bold, and <h1>-<h6> for headings
  const structuredItems = [];

  // Find all bold text (Google Docs uses inline styles)
  const boldRegex = /<span[^>]*font-weight:\s*(bold|700|800|900)[^>]*>([^<]+)<\/span>/gi;
  let match;
  while ((match = boldRegex.exec(htmlContent)) !== null) {
    const text = match[2].trim();
    if (text.length > 2 && text.length < 200) {
      structuredItems.push({ type: 'bold', text, position: match.index });
    }
  }

  // Find headings
  const headingRegex = /<h([1-6])[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/h\1>/gi;
  while ((match = headingRegex.exec(htmlContent)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (text.length > 2) {
      structuredItems.push({ type: 'heading', level, text, position: match.index });
    }
  }

  // Also check for Google Docs title/subtitle styles
  const titleRegex = /<p[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/p>/gi;
  while ((match = titleRegex.exec(htmlContent)) !== null) {
    structuredItems.push({ type: 'heading', level: 1, text: match[1].trim(), position: match.index });
  }

  // Sort by position in document
  structuredItems.sort((a, b) => a.position - b.position);

  // Now identify strategies using heuristics:
  // 1. Look for items containing strategy keywords
  // 2. Find items at the same structural level (all bold, all h2, etc.)

  let detectedStrategyPattern = null;
  let strategyItems = [];

  // First pass: find items with strategy keywords
  for (const item of structuredItems) {
    const lowerText = item.text.toLowerCase();
    if (strategyKeywords.some(kw => lowerText.includes(kw))) {
      if (!detectedStrategyPattern) {
        detectedStrategyPattern = item.type === 'heading' ? `heading-${item.level}` : item.type;
      }
      strategyItems.push(item);
    }
  }

  // Second pass: if we found a pattern, get all items matching that pattern
  if (detectedStrategyPattern && strategyItems.length > 0) {
    // Find all items at the same level
    const allSameLevel = structuredItems.filter(item => {
      if (detectedStrategyPattern.startsWith('heading-')) {
        const level = parseInt(detectedStrategyPattern.split('-')[1]);
        return item.type === 'heading' && item.level === level;
      }
      return item.type === detectedStrategyPattern;
    });

    // If we found more items at the same level, use those as strategies
    if (allSameLevel.length >= strategyItems.length) {
      strategyItems = allSameLevel;
    }
  }

  // If no strategy keywords found, try to detect structure from bold/headings
  if (strategyItems.length === 0) {
    // Try headings first (prefer h2, then h1, then h3)
    for (const level of [2, 1, 3, 4]) {
      const headings = structuredItems.filter(i => i.type === 'heading' && i.level === level);
      if (headings.length >= 2) {
        strategyItems = headings;
        break;
      }
    }

    // If no headings, try bold items that look like titles (short, don't end with period)
    if (strategyItems.length === 0) {
      const boldTitles = structuredItems.filter(i =>
        i.type === 'bold' &&
        i.text.length < 80 &&
        !i.text.endsWith('.') &&
        !i.text.match(/^\d+\.?\s*$/) // Not just a number
      );
      if (boldTitles.length >= 2) {
        strategyItems = boldTitles;
      }
    }
  }

  // Parse text content for goals and descriptions
  const textLines = textContent.split('\n').map(l => l.trim()).filter(l => l);

  // Build strategies from identified items
  for (let i = 0; i < strategyItems.length; i++) {
    const item = strategyItems[i];
    const nextItem = strategyItems[i + 1];

    // Clean up title - remove "Focus Area:", "Strategic Focus:", numbering, etc.
    let title = item.text
      .replace(/^(focus\s*area|strategic\s*focus|strategic\s*priority|dimension|pillar)\s*[\d.:)]*\s*/i, '')
      .replace(/^\d+[.):\s]+/, '')
      .trim();

    // Find description and goals from text content
    // Look for text between this strategy and the next one
    const titleInText = textLines.findIndex(line =>
      line.toLowerCase().includes(title.toLowerCase().substring(0, 20)) ||
      line.toLowerCase().includes(item.text.toLowerCase().substring(0, 20))
    );

    let description = '';
    let goals = [];

    if (titleInText !== -1) {
      // Find where next strategy starts
      let endIndex = textLines.length;
      if (nextItem) {
        const nextTitle = nextItem.text.substring(0, 20).toLowerCase();
        for (let j = titleInText + 1; j < textLines.length; j++) {
          if (textLines[j].toLowerCase().includes(nextTitle)) {
            endIndex = j;
            break;
          }
        }
      }

      // Extract content between this strategy and the next
      const strategyContent = textLines.slice(titleInText + 1, endIndex);
      let currentGoal = null;

      for (const line of strategyContent) {
        const lowerLine = line.toLowerCase();

        // Check if this line is a goal
        const isGoalLine = goalKeywords.some(kw => lowerLine.includes(kw)) ||
                          (line.match(/^[-•*]\s+/) && line.length < 150) ||
                          (line.match(/^\d+[.)]\s+/) && line.length < 150);

        if (isGoalLine) {
          // Save previous goal
          if (currentGoal) {
            goals.push(currentGoal);
          }

          // Clean up goal title
          let goalTitle = line
            .replace(/^[-•*\d.)]+\s*/, '')
            .replace(/^(goal|objective|target|outcome)[:\s]*/i, '')
            .trim();

          currentGoal = {
            id: `goal-${strategies.length + 1}-${goals.length + 1}`,
            title: goalTitle,
            description: '',
            targetProgress: 50,
            initiatives: []
          };
        } else if (currentGoal) {
          // Add to current goal's description
          if (currentGoal.description) currentGoal.description += ' ';
          currentGoal.description += line;
        } else {
          // Add to strategy description
          if (description) description += ' ';
          description += line;
        }
      }

      // Don't forget last goal
      if (currentGoal) {
        goals.push(currentGoal);
      }
    }

    strategies.push({
      id: `str-${strategies.length + 1}`,
      title: title || item.text,
      description: description.substring(0, 500),
      upside: 'TBD',
      cost: 'TBD',
      goals: goals
    });
  }

  // If no strategies found, fall back to simple text parsing
  if (strategies.length === 0) {
    return parseStrategyDocumentFallback(textContent);
  }

  return {
    strategies,
    detectedPattern: detectedStrategyPattern,
    itemsFound: strategyItems.length
  };
}

// Fallback parser for when HTML parsing doesn't find structure
function parseStrategyDocumentFallback(textContent) {
  const lines = textContent.split('\n').map(l => l.trim()).filter(l => l);
  const strategies = [];
  let currentStrategy = null;

  for (const line of lines) {
    // Simple heuristic: short lines that don't end with period are likely titles
    const isTitle = line.length < 80 && !line.endsWith('.') && !line.match(/^[-•*]/);

    if (isTitle && (!currentStrategy || currentStrategy.description.length > 50)) {
      if (currentStrategy) {
        strategies.push(currentStrategy);
      }
      currentStrategy = {
        id: `str-${strategies.length + 1}`,
        title: line,
        description: '',
        upside: 'TBD',
        cost: 'TBD',
        goals: []
      };
    } else if (currentStrategy) {
      if (currentStrategy.description) currentStrategy.description += ' ';
      currentStrategy.description += line;
    }
  }

  if (currentStrategy) {
    strategies.push(currentStrategy);
  }

  // If still nothing, create a single strategy from the document
  if (strategies.length === 0 && textContent.trim()) {
    strategies.push({
      id: 'str-1',
      title: lines[0]?.substring(0, 80) || 'Imported Strategy',
      description: textContent.substring(0, 500),
      upside: 'TBD',
      cost: 'TBD',
      goals: []
    });
  }

  return { strategies, detectedPattern: 'fallback' };
}

// Import from Jira
app.post('/api/import/jira', async (req, res) => {
  try {
    const { jiraUrl, email, apiToken, projectKey, jqlQuery } = req.body;

    if (!jiraUrl || !email || !apiToken) {
      return res.status(400).json({ error: 'Jira URL, email, and API token are required' });
    }

    // Clean up the Jira URL
    let baseUrl = jiraUrl.trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;

    // Build JQL query
    let jql = jqlQuery || '';
    if (!jql && projectKey) {
      jql = `project = "${projectKey}" ORDER BY created DESC`;
    }
    if (!jql) {
      jql = 'ORDER BY created DESC';
    }

    // Jira Cloud API - Using new /search/jql endpoint (migrated from deprecated /search)
    // See: https://developer.atlassian.com/changelog/#CHANGE-2046
    const searchUrl = `${baseUrl}/rest/api/3/search/jql`;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        jql: jql,
        maxResults: 100,
        fields: ['summary', 'description', 'status', 'priority', 'issuetype', 'labels', 'customfield_10016', 'parent']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jira API error:', response.status, errorText);
      if (response.status === 401) {
        return res.status(401).json({ error: 'Authentication failed. Please check your email and API token.' });
      }
      if (response.status === 403) {
        return res.status(403).json({ error: 'Access forbidden. Please check your permissions for this Jira project.' });
      }
      return res.status(response.status).json({ error: `Jira API error: ${response.statusText}` });
    }

    const data = await response.json();

    // Transform Jira issues into requirements format
    const requirements = data.issues.map((issue, index) => {
      const fields = issue.fields;

      // Extract description text (Jira uses Atlassian Document Format)
      let description = '';
      if (fields.description) {
        if (typeof fields.description === 'string') {
          description = fields.description;
        } else if (fields.description.content) {
          // Parse ADF format
          description = extractTextFromADF(fields.description);
        }
      }

      return {
        id: `req-jira-${issue.key}`,
        jiraKey: issue.key,
        title: fields.summary || 'Untitled',
        description: description,
        status: fields.status?.name || 'Unknown',
        priority: fields.priority?.name || 'Medium',
        issueType: fields.issuetype?.name || 'Task',
        labels: fields.labels || [],
        storyPoints: fields.customfield_10016 || null,
        parentKey: fields.parent?.key || null,
        upside: 'TBD',
        downside: 'TBD',
        metrics: []
      };
    });

    res.json({
      success: true,
      total: data.total,
      retrieved: requirements.length,
      requirements
    });

  } catch (error) {
    console.error('Jira import error:', error);
    res.status(500).json({ error: 'Failed to import from Jira: ' + error.message });
  }
});

// Helper function to extract text from Atlassian Document Format
function extractTextFromADF(adf) {
  if (!adf || !adf.content) return '';

  let text = '';

  function traverse(nodes) {
    for (const node of nodes) {
      if (node.type === 'text') {
        text += node.text;
      } else if (node.type === 'hardBreak' || node.type === 'paragraph') {
        text += '\n';
      }
      if (node.content) {
        traverse(node.content);
      }
    }
  }

  traverse(adf.content);
  return text.trim();
}

// Save imported strategy data
app.post('/api/import/save-strategy', async (req, res) => {
  try {
    const { strategies } = req.body;

    if (!strategies || !Array.isArray(strategies)) {
      return res.status(400).json({ error: 'Strategies array is required' });
    }

    // For now, we just return success - the frontend will save to localStorage
    // In production, you'd save to a database here
    res.json({
      success: true,
      message: 'Strategy data ready to save',
      strategiesCount: strategies.length,
      goalsCount: strategies.reduce((sum, s) => sum + (s.goals?.length || 0), 0)
    });

  } catch (error) {
    console.error('Save strategy error:', error);
    res.status(500).json({ error: 'Failed to save strategy data' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve frontend for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mode: ${DEV_MODE ? '🔧 DEVELOPMENT (auth bypassed)' : '🔒 PRODUCTION'}`);
  console.log(`Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured'}`);
  console.log(`OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
  if (DEV_MODE) {
    console.log(`\n⚠️  Running in DEV MODE - authentication is bypassed!`);
    console.log(`   To enable Google OAuth, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env`);
  }
});
