const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

const LOCAL_ORIGINS = ['http://localhost:5173', 'http://localhost:3000'];

export const getAllowedOrigins = () => [
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.ALLOWED_ORIGINS),
  ...LOCAL_ORIGINS,
];

export const isOriginAllowed = (origin) => {
  if (!origin) return true;

  const allowed = getAllowedOrigins();
  if (allowed.includes(origin)) return true;

  // Vercel production + preview deployments
  if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return true;

  return false;
};

export const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, false);
    }
  },
};
