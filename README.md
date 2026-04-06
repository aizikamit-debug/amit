# תיעודרך — מערכת ניהול קליניקה

## מה כלול
- כרטיסי מטופלים מלאים
- תיעוד פגישות + תמלול קולי
- עיבוד AI לטקסט גולמי (Claude)
- שאלונים: PHQ-9, GAD-7, PCL-5, EPDS
- דשבורד הכנסות
- חיוב + חיבור לחשבונית ירוקה (מורנינג)

---

## הפעלה מקומית (פיתוח)

### Backend
```bash
cd backend
npm install
cp ../.env.example .env   # ערוך את הקובץ
npm run dev               # רץ על :3001
```

### Frontend
```bash
cd frontend
npm install
npm start                 # רץ על :3000
```

---

## פריסה ל-Railway (Backend + DB)

1. **צור פרויקט ב-Railway:** railway.app → New Project
2. **הוסף PostgreSQL:** Add Service → Database → PostgreSQL
3. **הוסף את הקוד:** Add Service → GitHub Repo → בחר backend/
4. **הגדר משתני סביבה:**
   - `DATABASE_URL` — מועתק אוטומטית מה-DB
   - `ANTHROPIC_API_KEY` — מ-console.anthropic.com
   - `FRONTEND_URL` — כתובת Netlify שלך
   - `NODE_ENV=production`

---

## פריסה ל-Netlify (Frontend)

1. `cd frontend && npm run build`
2. גרור את תיקיית `build/` ל-Netlify
3. הגדר משתנה סביבה: `REACT_APP_API_URL=https://your-app.railway.app/api`

---

## חשבונית ירוקה (מורנינג) — API

1. כנס לחשבון מורנינג שלך
2. חשבון שלי → כלי פיתוח → מפתחות API
3. צור מפתח חדש → העתק ID + Secret
4. הזן בהגדרות המערכת (Settings)

---

## תמלול קולי

עובד ישירות דרך הדפדפן (Web Speech API).
**חובה: Chrome / Edge** — Firefox לא תומך.
שפה: עברית (he-IL) — מוגדר אוטומטית.

---

## AI תיעוד

לחץ "שמור + עבד עם AI" בכל תיעוד.
המערכת שולחת את הטקסט הגולמי ל-Claude ומחזירה תיעוד קליני קריא ומסודר.
דורש `ANTHROPIC_API_KEY` תקין.

---

## שלבים הבאים (v2)
- [ ] סנכרון Google Calendar אוטומטי
- [ ] שליחת שאלונים למטופלים בלינק
- [ ] חיוב אוטומטי בסוף חודש (cron)
- [ ] ייצוא דוחות PDF
- [ ] טופס קבלה למטופל חדש
