-- Tiuderech Database Schema
-- פסיכולוג עמית איזיק

-- מטופלים
CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(20),
  id_number VARCHAR(20),
  address TEXT,
  referral_source VARCHAR(100),
  treatment_type VARCHAR(50) CHECK (treatment_type IN ('individual', 'couples', 'child', 'adolescent')),
  presenting_problem TEXT,
  diagnosis TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'waitlist', 'ended')),
  session_fee INTEGER DEFAULT 450,
  calendar_name VARCHAR(255),
  green_invoice_client_id VARCHAR(100),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- פגישות
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_time TIME,
  duration_minutes INTEGER DEFAULT 50,
  session_type VARCHAR(50) DEFAULT 'individual',
  status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  fee INTEGER DEFAULT 450,
  payment_status VARCHAR(30) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'waived')),
  google_event_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- תיעוד קליני
CREATE TABLE IF NOT EXISTS clinical_notes (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  note_date DATE DEFAULT CURRENT_DATE,
  note_type VARCHAR(50) DEFAULT 'session' CHECK (note_type IN ('session', 'intake', 'summary', 'correspondence', 'other')),
  raw_text TEXT,
  processed_text TEXT,
  is_transcribed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- שאלונים
CREATE TABLE IF NOT EXISTS questionnaire_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name_he VARCHAR(100) NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  scoring_rules JSONB,
  interpretation JSONB
);

-- תשובות שאלונים
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  questionnaire_type_id INTEGER REFERENCES questionnaire_types(id),
  completed_at TIMESTAMP DEFAULT NOW(),
  answers JSONB NOT NULL,
  total_score INTEGER,
  subscale_scores JSONB,
  interpretation TEXT,
  sent_at TIMESTAMP,
  completed_by VARCHAR(20) DEFAULT 'patient' CHECK (completed_by IN ('patient', 'therapist'))
);

-- חיובים ותשלומים
CREATE TABLE IF NOT EXISTS billing_records (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  total_amount INTEGER DEFAULT 0,
  paid_amount INTEGER DEFAULT 0,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'partial', 'cancelled')),
  green_invoice_doc_id VARCHAR(100),
  payment_link TEXT,
  sent_at TIMESTAMP,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- הגדרות מערכת
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- אינדקסים
CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_id ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_patient_id ON billing_records(patient_id);

-- הוספת שאלונים בסיסיים
INSERT INTO questionnaire_types (code, name_he, description, questions, scoring_rules, interpretation) VALUES
('PHQ9', 'שאלון דיכאון PHQ-9', 'שאלון להערכת חומרת דיכאון - Patient Health Questionnaire', 
'[
  {"id":1,"text":"חוסר עניין או הנאה בעשיית דברים","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":2,"text":"תחושת דכדוך, עצבות, או ייאוש","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":3,"text":"קשיי שינה, שינה מרובה מדי, או שינה מועטה מדי","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":4,"text":"תחושת עייפות או חסר אנרגיה","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":5,"text":"חוסר תיאבון או אכילת יתר","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":6,"text":"תחושה שאתה כישלון, או שאכזבת את עצמך או את משפחתך","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":7,"text":"קושי להתרכז בדברים כגון קריאה או צפייה בטלוויזיה","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":8,"text":"תנועה או דיבור איטיים מהרגיל, או להיפך, חוסר מנוחה ותנועה רבה יותר מהרגיל","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":9,"text":"מחשבות שעדיף לך למות, או של פגיעה עצמית","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]}
]',
'{"max_score":27,"subscales":null}',
'{"ranges":[{"min":0,"max":4,"label":"מינימלי","color":"green"},{"min":5,"max":9,"label":"קל","color":"yellow"},{"min":10,"max":14,"label":"בינוני","color":"orange"},{"min":15,"max":19,"label":"בינוני-חמור","color":"red"},{"min":20,"max":27,"label":"חמור","color":"darkred"}]}'
),
('GAD7', 'שאלון חרדה GAD-7', 'שאלון להערכת הפרעת חרדה כללית',
'[
  {"id":1,"text":"תחושת עצבנות, חרדה, או חוסר שקט","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":2,"text":"חוסר יכולת לעצור את הדאגה או לשלוט בה","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":3,"text":"דאגה יתרה לגבי דברים שונים","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":4,"text":"קשיי הרגעה","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":5,"text":"חוסר שקט, קושי לשבת בשקט","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":6,"text":"נטייה להתרגז או להתרגז בקלות","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]},
  {"id":7,"text":"תחושת פחד, כאילו עלול לקרות משהו נורא","options":["כלל לא","מספר ימים","יותר ממחצית הימים","כמעט כל יום"]}
]',
'{"max_score":21,"subscales":null}',
'{"ranges":[{"min":0,"max":4,"label":"מינימלי","color":"green"},{"min":5,"max":9,"label":"קל","color":"yellow"},{"min":10,"max":14,"label":"בינוני","color":"orange"},{"min":15,"max":21,"label":"חמור","color":"red"}]}'
),
('PCL5', 'שאלון טראומה PCL-5', 'שאלון להערכת הפרעת דחק פוסט-טראומטית',
'[
  {"id":1,"text":"זיכרונות חוזרים, מציקים ובלתי רצוניים של החוויה הטראומטית","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":2,"text":"חלומות מציקים שקשורים לחוויה הטראומטית","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":3,"text":"תחושה פתאומית או התנהגות כאילו החוויה הטראומטית חוזרת","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":4,"text":"תחושת מצוקה פנימית חזקה כאשר אתה נחשף למשהו המזכיר את החוויה הטראומטית","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":5,"text":"תגובות גופניות חזקות כאשר אתה נחשף למשהו המזכיר את החוויה הטראומטית","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":6,"text":"הימנעות מזיכרונות, מחשבות, או רגשות הקשורים לחוויה הטראומטית","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":7,"text":"הימנעות מגורמים חיצוניים המזכירים את החוויה הטראומטית","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":8,"text":"קושי לזכור פרטים חשובים של החוויה הטראומטית","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":9,"text":"אמונות שליליות חזקות לגבי עצמך, אחרים, או העולם","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":10,"text":"האשמה עצמית או האשמת אחרים בחוויה הטראומטית ובתוצאותיה","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":11,"text":"תחושות שליליות חזקות כגון פחד, בעתה, כעס, אשמה, או בושה","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":12,"text":"ירידה בעניין בפעילויות בהן נהגת להשתתף","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":13,"text":"תחושת ניתוק או ריחוק מאחרים","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":14,"text":"קושי לחוות רגשות חיוביים","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":15,"text":"התנהגות פזיזה או עצמאית מסוכנת","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":16,"text":"מתח יתר, עוררות יתר, תשומת לב מוגזמת לסכנות","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":17,"text":"תגובת בהלה מוגזמת","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":18,"text":"קשיי ריכוז","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":19,"text":"הפרעות שינה","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]},
  {"id":20,"text":"התנהגות עצבנית, פרצי כעס, תוקפנות","options":["כלל לא","מעט","במידה בינונית","במידה רבה","במידה רבה מאוד"]}
]',
'{"max_score":80,"subscales":{"B":{"items":[1,2,3,4,5],"label":"חדירה"},"C":{"items":[6,7],"label":"הימנעות"},"D":{"items":[8,9,10,11,12,13,14],"label":"שינויים קוגניטיביים"},"E":{"items":[15,16,17,18,19,20],"label":"עוררות"}}}',
'{"ranges":[{"min":0,"max":32,"label":"מתחת לסף קליני","color":"green"},{"min":33,"max":80,"label":"PTSD סביר","color":"red"}]}'
),
('EPDS', 'שאלון דיכאון אחרי לידה EPDS', 'Edinburgh Postnatal Depression Scale',
'[
  {"id":1,"text":"הצלחתי לצחוק ולראות את הצד המשעשע של דברים","options":["באותה מידה שתמיד יכולתי","לא בדיוק כמו תמיד","בהחלט פחות מבעבר","כלל לא"],"reverse":true},
  {"id":2,"text":"ציפיתי לדברים בהנאה","options":["כמו תמיד","פחות מבעבר","בהחלט פחות מבעבר","כמעט כלל לא"],"reverse":true},
  {"id":3,"text":"האשמתי את עצמי שלא לצורך כאשר דברים השתבשו","options":["כן, רוב הזמן","כן, לפעמים","לא לעיתים קרובות","לא, אף פעם לא"]},
  {"id":4,"text":"חשתי חרדה או דאגה ללא סיבה טובה","options":["לא, כלל לא","כמעט שלא","כן, לפעמים","כן, לעיתים קרובות מאוד"]},
  {"id":5,"text":"חשתי פחד או בעתה ללא סיבה טובה","options":["כן, לעיתים קרובות","כן, לפעמים","לא, לא לעיתים קרובות","לא, כלל לא"]},
  {"id":6,"text":"דברים נערמו עלי יותר מדי","options":["כן, רוב הזמן לא הצלחתי להתמודד כלל","כן, לפעמים לא התמודדתי טוב כמו תמיד","לא, רוב הזמן התמודדתי טוב","לא, התמודדתי טוב כמו תמיד"]},
  {"id":7,"text":"הייתי כל כך אומללה שהיה לי קשה לישון","options":["כן, רוב הזמן","כן, לפעמים","לא לעיתים קרובות","לא, כלל לא"]},
  {"id":8,"text":"הרגשתי עצובה או אומללה","options":["כן, רוב הזמן","כן, לעיתים קרובות","לא לעיתים קרובות","לא, כלל לא"]},
  {"id":9,"text":"הייתי כל כך אומללה שבכיתי","options":["כן, רוב הזמן","כן, לעיתים קרובות","לפעמים בלבד","לא, אף פעם לא"]},
  {"id":10,"text":"עלתה בי המחשבה לפגוע בעצמי","options":["כן, לעיתים קרובות","לפעמים","כמעט שלא","אף פעם לא"]}
]',
'{"max_score":30,"subscales":null}',
'{"ranges":[{"min":0,"max":9,"label":"סביר שאין דיכאון","color":"green"},{"min":10,"max":12,"label":"תיתכן דיכאון קל","color":"yellow"},{"min":13,"max":30,"label":"ייתכן דיכאון לאחר לידה","color":"red"}]}'
)
ON CONFLICT (code) DO NOTHING;

-- הגדרות ברירת מחדל
INSERT INTO settings (key, value) VALUES
('default_session_fee', '450'),
('therapist_name', 'עמית איזיק'),
('clinic_name', 'מרפאת עמית איזיק'),
('auto_billing_day', '1'),
('auto_billing_enabled', 'false'),
('green_invoice_api_id', ''),
('green_invoice_api_secret', ''),
('google_calendar_id', '')
ON CONFLICT (key) DO NOTHING;
