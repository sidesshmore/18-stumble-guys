-- ============================================================
-- seed.sql — Demo data for judges
-- Run in Supabase SQL Editor (runs as superuser, bypasses RLS)
-- ============================================================

-- ─── Organizations ───────────────────────────────────────────

INSERT INTO organizations (id, name, slug, config, service_types) VALUES
(
  'aaaaaaaa-0000-0000-0000-000000000001',
  'NMTSA — Music Therapy Services',
  'nmtsa',
  '{"custom_fields": []}',
  ARRAY['Individual Music Therapy', 'Group Music Therapy', 'Assessment Session', 'Family Session', 'Crisis Session', 'Discharge Planning']
),
(
  'bbbbbbbb-0000-0000-0000-000000000002',
  'ICM Food & Clothing Bank',
  'icm-food-bank',
  '{
    "custom_fields": [
      {"key": "household_size", "label": "Household Size", "type": "number"},
      {"key": "dietary_restrictions", "label": "Dietary Restrictions", "type": "text"},
      {"key": "clothing_sizes", "label": "Clothing Sizes Needed", "type": "text"}
    ]
  }',
  ARRAY['Food Pantry Visit', 'Clothing Distribution', 'Emergency Food Box', 'Holiday Meal', 'Referral to Partner Agency', 'Follow-up Check-in']
),
(
  'cccccccc-0000-0000-0000-000000000003',
  'Chandler CARE Center',
  'chandler-care',
  '{
    "custom_fields": [
      {"key": "crisis_type", "label": "Crisis Type", "type": "text"},
      {"key": "housing_status", "label": "Housing Status", "type": "text"},
      {"key": "insurance_status", "label": "Insurance Status", "type": "text"}
    ]
  }',
  ARRAY['Crisis Intake', 'Safety Planning', 'Case Management', 'Housing Referral', 'Mental Health Referral', 'Follow-up Visit', 'Discharge']
);

-- ─── Clients — NMTSA ─────────────────────────────────────────

INSERT INTO clients (id, org_id, first_name, last_name, date_of_birth, phone, email, demographics, language_preference, is_active) VALUES

-- Maria — 20+ service entries for handoff summary demo
(
  '11111111-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Maria', 'Gonzalez', '1998-04-12', '(602) 555-0101', 'maria.g@email.com',
  '{"instrument_played": "Piano", "therapy_goal": "Reduce anxiety, improve emotional regulation", "sessions_per_week": 2, "gender": "Female"}',
  'es', true
),
(
  '11111111-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'James', 'Okafor', '2005-09-03', '(602) 555-0102', null,
  '{"instrument_played": "Drums", "therapy_goal": "ADHD focus and self-expression", "sessions_per_week": 1, "gender": "Male"}',
  'en', true
),
(
  '11111111-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Sophie', 'Chen', '1985-11-22', '(602) 555-0103', 'sophie.chen@email.com',
  '{"instrument_played": "Guitar", "therapy_goal": "Grief processing after loss of spouse", "sessions_per_week": 1, "gender": "Female"}',
  'en', true
),
(
  '11111111-0000-0000-0000-000000000004',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Derrick', 'Williams', '1972-06-18', '(602) 555-0104', null,
  '{"instrument_played": "Voice", "therapy_goal": "Stroke rehabilitation — speech and motor", "sessions_per_week": 3, "gender": "Male"}',
  'en', true
),
(
  '11111111-0000-0000-0000-000000000005',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Amara', 'Patel', '2010-02-28', '(602) 555-0105', null,
  '{"instrument_played": "Xylophone", "therapy_goal": "Autism spectrum — communication and sensory", "sessions_per_week": 2, "gender": "Female"}',
  'en', true
);

-- ─── Clients — ICM Food Bank ──────────────────────────────────

INSERT INTO clients (id, org_id, first_name, last_name, date_of_birth, phone, email, demographics, language_preference, is_active) VALUES
(
  '22222222-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'Rosa', 'Hernandez', '1979-07-30', '(480) 555-0201', null,
  '{"household_size": 5, "dietary_restrictions": "Diabetes — low sugar", "clothing_sizes": "Adult M, Kids 8, Kids 10", "gender": "Female"}',
  'es', true
),
(
  '22222222-0000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'Marcus', 'Johnson', '1965-03-14', '(480) 555-0202', null,
  '{"household_size": 1, "dietary_restrictions": "None", "clothing_sizes": "Adult XL", "gender": "Male"}',
  'en', true
),
(
  '22222222-0000-0000-0000-000000000003',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'Fatima', 'Al-Hassan', '1990-12-05', '(480) 555-0203', 'fatima.h@email.com',
  '{"household_size": 3, "dietary_restrictions": "Halal only", "clothing_sizes": "Adult S, Kids 4", "gender": "Female"}',
  'en', true
),
(
  '22222222-0000-0000-0000-000000000004',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'Tom', 'Begay', '1958-08-19', '(480) 555-0204', null,
  '{"household_size": 2, "dietary_restrictions": "None", "clothing_sizes": "Adult L", "gender": "Male"}',
  'en', true
),
(
  '22222222-0000-0000-0000-000000000005',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'Linh', 'Nguyen', '2001-05-11', '(480) 555-0205', 'linh.n@email.com',
  '{"household_size": 4, "dietary_restrictions": "Vegetarian", "clothing_sizes": "Adult XS, Kids 6", "gender": "Female"}',
  'en', true
);

-- ─── Clients — Chandler CARE ─────────────────────────────────

INSERT INTO clients (id, org_id, first_name, last_name, date_of_birth, phone, email, demographics, language_preference, is_active) VALUES
(
  '33333333-0000-0000-0000-000000000001',
  'cccccccc-0000-0000-0000-000000000003',
  'Kevin', 'Marsh', '1991-01-07', '(602) 555-0301', null,
  '{"crisis_type": "Domestic violence — left home", "housing_status": "Temporarily with family", "insurance_status": "Uninsured", "gender": "Male"}',
  'en', true
),
(
  '33333333-0000-0000-0000-000000000002',
  'cccccccc-0000-0000-0000-000000000003',
  'Diana', 'Torres', '1987-10-23', '(602) 555-0302', 'diana.t@email.com',
  '{"crisis_type": "Mental health — suicidal ideation", "housing_status": "Housed", "insurance_status": "AHCCCS", "gender": "Female"}',
  'es', true
),
(
  '33333333-0000-0000-0000-000000000003',
  'cccccccc-0000-0000-0000-000000000003',
  'Andre', 'Davis', '2003-06-16', '(602) 555-0303', null,
  '{"crisis_type": "Substance use — opioids", "housing_status": "Unstable", "insurance_status": "Uninsured", "gender": "Male"}',
  'en', true
),
(
  '33333333-0000-0000-0000-000000000004',
  'cccccccc-0000-0000-0000-000000000003',
  'Priya', 'Sharma', '1995-03-29', '(602) 555-0304', 'priya.s@email.com',
  '{"crisis_type": "Food insecurity — family at risk", "housing_status": "Housed", "insurance_status": "Medicaid", "gender": "Female"}',
  'en', true
),
(
  '33333333-0000-0000-0000-000000000005',
  'cccccccc-0000-0000-0000-000000000003',
  'Walter', 'Kim', '1948-11-04', '(602) 555-0305', null,
  '{"crisis_type": "Elder — isolation and depression", "housing_status": "Lives alone", "insurance_status": "Medicare", "gender": "Male"}',
  'en', true
);

-- ─── Service Entries — Maria Gonzalez (NMTSA) — 20+ entries for handoff demo ───

INSERT INTO service_entries (client_id, org_id, service_type, date, notes) VALUES

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Assessment Session', '2025-09-10',
 'Initial assessment completed. Maria referred by her school counselor due to severe test anxiety and panic attacks before exams. She reports difficulty sleeping, racing thoughts, and avoidance behaviors. Showed strong interest in piano. Will begin individual sessions weekly, moving to twice weekly if she engages well. Consent forms signed. Goals set: reduce anxiety symptoms, build emotional regulation skills through music.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2025-09-17',
 'First session. Maria was quiet and guarded. We explored her relationship with music — she used to play piano as a child before her parents divorced. Used improvisation to let her express mood without words. She chose minor keys consistently. Ended session with a breathing exercise set to slow piano. She smiled for the first time at the end. Plan: continue piano improvisation, introduce journaling alongside music.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2025-09-24',
 'Maria arrived visibly stressed — midterms approaching. She mentioned she has been skipping meals and sleeping only 4 hours a night. We worked on a grounding technique using a repeated piano phrase. She was able to bring her breathing rate down visibly during the exercise. She asked if she could record herself playing to listen to before exams. Will provide a recording device next session. Need to follow up with school counselor about the sleep and eating concerns.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2025-10-01',
 'Provided small recorder. Maria brought in a piece she wrote herself — a short 8-bar melody. This is a significant breakthrough; she has never composed before. The piece was melancholic but structured. We discussed what emotions she was expressing. She mentioned feeling lonely since moving to a new school. Introduced the concept of using music as a diary. She was receptive. Follow up: check if she has eaten regularly this week.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2025-10-08',
 'Maria reported she listened to her recording before her math exam and it helped. First exam she did not have a panic attack. Huge milestone. She played her composition again and extended it. Mood noticeably lighter. She mentioned her mother is going through a hard time financially and Maria has been taking on extra household responsibilities. This may be contributing to her stress. Should we consider a family session? Will discuss with supervisor.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2025-10-15',
 'Supervisor approved family session. Maria''s mother joined for the last 15 minutes. Mother was tearful — said she did not know music therapy could help this much. Maria played her composition for her mother. Very emotional moment. Discussed scheduling a dedicated family session next month. Maria mentioned a friend at school has been asking about therapy. Encouraged her to share the school counselor contact.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2025-10-22',
 'Maria came in anxious — college application deadlines approaching. We worked on a new piece using call-and-response technique to externalize the internal dialogue she describes as "the voice that says I am not good enough." Named the negative voice in the music and then composed a counter-melody. She found this powerful. Mood: 4/10 at start, 7/10 at end. Sleeping 6 hours now, improvement from 4.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2025-10-29',
 'Halloween session — used rhythmic drumming to release tension. Maria was more playful today. Laughed for the first time in session. She mentioned she submitted one college application. Progress on self-efficacy. Still skipping lunch sometimes due to schedule. Will check in about nutrition next session. Recommended she connect with the school nurse about the eating patterns.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Family Session', '2025-11-05',
 'Family session with Maria and her mother. Introduced mother to the grounding technique. Both practiced together. Mother shared she is working two jobs and feels guilty about not being present. Maria said she does not blame her mother — this was an important moment of communication. Both agreed to a weekly 10-minute music check-in at home using the recorder. Plan: continue individual sessions, schedule family session monthly.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2025-11-12',
 'Maria reported the home music check-ins with her mother have been happening. This is the first consistent positive routine they have established. She is sleeping 7 hours. Eating more regularly. Panic attacks reduced from weekly to once in the past month. Composed a new piece she titled "Getting There." Mood: 7/10 consistently. Review goals at next session — she may be ready to move to weekly instead of twice weekly.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2025-11-19',
 'Goal review session. Maria has met 2 of 3 original goals: panic attack frequency reduced, emotional expression through music established. Final goal (sleep 7+ hours consistently) partially met. She wants to continue twice weekly until after college decisions come in. Agreed. She mentioned she may want to pursue music therapy as a career. Provided information about ASU music therapy program.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2025-12-03',
 'Maria received her first college acceptance — Arizona State University. She came in beaming. We celebrated by improvising a joyful piece together. She cried at the end — said it was the first time she cried from happiness in years. Mood: 9/10. Discussed what continued support will look like when she transitions to college in the fall. Will begin discharge planning in February.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2025-12-17',
 'Pre-holiday session. Maria gifted a handwritten thank-you card. She has referred two friends to the school counselor. Discussed coping strategies for the holidays — family dynamics are still stressful around the holidays due to the divorce. Created a "holiday playlist" of grounding pieces she can use at home. Will check in via app in January if she needs support during break.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-01-07',
 'Post-holiday check-in. Maria reports the holiday was hard — father was absent, some family tension. But she used her music tools consistently and did not experience a panic attack. Called this her "first anxiety-free holiday in 4 years." Sleep: 7-8 hours. Eating normally. Mood baseline has shifted to 6-7/10. Ready to begin thinking about discharge and transition plan.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-01-21',
 'Transition planning session. Maria will move to ASU in August. We mapped out what resources she will need: ASU counseling center, music practice rooms, potentially community music therapy. She expressed anxiety about the transition but is able to name and manage it using her techniques. Composed a piece she calls her "anchor song" to carry with her. Will do monthly sessions from March through June.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-02-04',
 'Session focused on identity — who is Maria beyond her anxiety? She listed: pianist, daughter, future music therapist, resilient. We created a musical portrait — each trait had a motif. She plans to record the full piece before she leaves for college. Mood: 8/10. Follow up: ensure ASU counseling center referral letter is sent before June.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-02-18',
 'Maria mentioned she has been helping a younger student at school who struggles with anxiety — informally coaching her on breathing techniques. She is already giving back. This speaks to her growth. Discussed boundaries around peer support. She is managing well. One concern: she mentioned she has been feeling some sadness anticipating leaving therapy and familiar surroundings. Normal anticipatory grief — will address directly in next session.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-03-04',
 'Addressed anticipatory grief about transition. Maria wrote a song about "endings that are also beginnings." This is sophisticated emotional processing — a significant indicator of her growth since September. Mood stable. Panic attacks: zero in 2026 so far. Sleep: consistent 7-8 hours. Eating: normal. She is ready for discharge in June. Will begin formal discharge summary next month.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-03-18',
 'Second to last session before moving to monthly. Maria brought her mother again. Both listened to recordings from September and compared to today. Mother wept — said she has her daughter back. Maria played her anchor song for the first time in front of another person. Incredibly moving session. Discharge planning finalized: final session June 4, referral letter to ASU counseling sent. Need to follow up next week to confirm ASU received the referral.'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-03-25',
 'Monthly session. Maria thriving. Applied for ASU music therapy program as her major. She credits this therapy as the reason. Zero panic attacks in 2026. Sleep and eating normalized. Final session scheduled for June 4. She asked if she could come back and volunteer with youth clients after she graduates. Said yes. Confirm ASU counseling referral was received — she mentioned she had not heard back from them yet. Must follow up.'),

-- ─── Service Entries — Other NMTSA Clients ───────────────────

('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Assessment Session', '2026-01-15',
 'James, age 20, referred by neurologist after TBI from car accident 8 months ago. Reports difficulty concentrating, impulse control issues, emotional lability. Parents present for intake. Drumming identified as preferred modality — has played recreationally since age 12. Goals: improve attention span, emotional regulation, cognitive rehabilitation through rhythmic engagement.'),

('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-02-05',
 'Second session with James. Used rhythmic entrainment — matching his erratic drumming rhythm then gradually steadying it. He was able to maintain a consistent beat for 4 minutes, up from 90 seconds in session 1. Parents report he has been calmer at home after sessions. Still struggling with impulsive anger — threw a controller at his game console last week. Need to address anger triggers next session.'),

('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-02-12',
 'Sophie processing grief — husband passed 6 months ago. She chose to work with guitar today, her husband''s instrument. Very emotional. She played a song he used to play. Cried through most of session. This is healthy grief expression. She mentioned she has been connecting to housing services as she may need to downsize now that she is on a single income. Will check in about her housing situation next session. Referred her to Chandler CARE Center for housing resources.'),

-- ─── Service Entries — ICM Food Bank ─────────────────────────

('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Food Pantry Visit', '2026-02-10',
 'Rosa visited with her three children. Family of 5. She is diabetic and needs low-sugar options — we set aside a special diabetic-friendly box. She mentioned the family has been struggling since her husband lost his job in January. Children looked thin. Asked if she had applied for SNAP benefits — she has not due to language barrier with the application. Volunteer offered to help translate next visit. Need to follow up on SNAP application assistance.'),

('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Food Pantry Visit', '2026-03-03',
 'Rosa returned with oldest daughter. Mentioned husband found part-time work but still not enough. Helped her complete the SNAP application today — submitted online. She was relieved and tearful. Diabetic food box prepared again. She mentioned her daughter has been skipping school to help with younger siblings. This is a concern — referred to school district social worker. Will check back in 2 weeks on SNAP status.'),

('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Emergency Food Box', '2026-03-10',
 'Marcus came in on an emergency basis — has not eaten in 2 days. He is an elderly veteran living alone. Set him up with emergency box immediately. He mentioned he has been having trouble with his VA benefits — payment was delayed. Gave him contact for local VA benefits navigator. He seemed disoriented — asked if he has any family nearby. He said his son lives in Tucson but they are estranged. Will check on him next week — concerned about isolation.'),

('22222222-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Food Pantry Visit', '2026-03-15',
 'Fatima visited. Needs halal food only. We have been expanding our halal options. She brought two neighbors who are also in need — registered them as new clients. She is a community connector. Her English has improved significantly — she mentioned she completed ESL classes. Working part-time at a grocery store now. Doing better but still needs food support for household of 3.'),

('22222222-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Food Pantry Visit', '2026-03-20',
 'Tom visited. Native elder, lives with wife. Both have mobility issues. He mentioned they sometimes cannot get to the food bank due to transportation — asked about delivery options. We do not currently offer delivery but referred him to St. Mary''s Food Bank delivery program. Will follow up to confirm he connected with them. He also asked about the clothing bank — wife needs winter clothes. Directed him to the clothing distribution on Fridays.'),

-- ─── Service Entries — Chandler CARE Center ──────────────────

('33333333-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000003',
 'Crisis Intake', '2026-02-20',
 'Diana presented in crisis — expressed passive suicidal ideation ("I would be okay not waking up"). No active plan or intent. Safety assessment completed — she is safe with a safety plan in place. She lives alone but has a sister she trusts. Sister contacted and will stay with Diana tonight. Scheduled follow-up for 48 hours. She agreed to call the crisis line if thoughts escalate. Must follow up Thursday without fail — this is high priority.'),

('33333333-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000003',
 'Safety Planning', '2026-02-22',
 'Diana follow-up as scheduled. Doing better — sister stayed two nights. No suicidal ideation since intake. Safety plan reviewed and strengthened: identified 3 warning signs, 3 coping strategies, 3 people to call. Referred to therapist for weekly outpatient therapy — appointment scheduled for March 5. She also mentioned she has been struggling financially — rent is behind. Referred to emergency rental assistance through Maricopa County. Need to check on rental assistance status next visit.'),

('33333333-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003',
 'Crisis Intake', '2026-03-01',
 'Kevin came in after leaving a domestic violence situation last night. He left with only the clothes he had on. Stayed at a friend''s house. Immediate needs: clothing, food, housing. Connected him with emergency shelter at Sojourner Center — bed confirmed for tonight. Gave him bus pass and toiletries kit. He is scared but safe. Legal aid appointment set for March 8 regarding restraining order. Will follow up Monday to confirm shelter placement and legal aid appointment.'),

('33333333-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000003',
 'Case Management', '2026-03-12',
 'Priya and her two children visited. She is working but income is not enough after rent increase. Children have not had consistent meals — she mentioned they sometimes go to bed hungry. She was embarrassed to admit this. Immediately called ICM Food Bank and confirmed they can take her — appointment set for this Friday. Also referred to WIC for the children. She said she did not know these resources existed. Will follow up to confirm she connected with ICM and WIC next week.'),

('33333333-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000003',
 'Case Management', '2026-03-18',
 'Walter, age 77, referred by neighbor who was concerned. He has been increasingly isolated since his wife passed 8 months ago. He admits he has not left his house in 10 days. Not eating properly — subsisting on crackers and soup. He teared up when talking about his wife. Referred to Senior Companion Program and Meals on Wheels — both confirmed. Set up weekly check-in calls. Concerned about depression — referred to geriatric mental health clinic. Appointment pending. Must follow up on clinic appointment next week.');

-- ─── Follow-ups (pre-seeded for demo) ────────────────────────

INSERT INTO follow_ups (client_id, org_id, service_entry_id, description, due_date, urgency, category, status) VALUES

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', null,
 'Confirm ASU counseling center received referral letter — Maria has not heard back',
 '2026-04-01', 'high', 'Transition Planning', 'pending'),

('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', null,
 'Check in on Sophie''s housing situation — may need to downsize, referred to Chandler CARE',
 '2026-03-28', 'medium', 'Housing', 'pending'),

('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', null,
 'Follow up on SNAP application status for Rosa Hernandez — submitted 3 weeks ago',
 '2026-03-27', 'high', 'Benefits', 'pending'),

('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', null,
 'Contact school district social worker re: Rosa''s daughter skipping school',
 '2026-03-28', 'high', 'Child Welfare', 'pending'),

('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', null,
 'Check on Marcus — concerned about isolation and disorientation. Call him this week.',
 '2026-03-26', 'critical', 'Elder Care', 'pending'),

('22222222-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000002', null,
 'Confirm Tom connected with St. Mary''s Food Bank delivery program',
 '2026-04-02', 'medium', 'Food Access', 'pending'),

('33333333-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000003', null,
 'Check on Diana''s emergency rental assistance application — rent is behind',
 '2026-03-28', 'high', 'Housing', 'pending'),

('33333333-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', null,
 'Confirm Kevin''s shelter placement at Sojourner Center and legal aid appointment March 8',
 '2026-03-27', 'critical', 'Safety / Housing', 'pending'),

('33333333-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000003', null,
 'Confirm Priya connected with ICM Food Bank and WIC — children going to bed hungry',
 '2026-03-27', 'critical', 'Food Security / Child Welfare', 'pending'),

('33333333-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000003', null,
 'Follow up on Walter''s geriatric mental health clinic appointment — concerned about depression',
 '2026-03-28', 'high', 'Mental Health / Elder Care', 'pending');

-- ─── Appointments ─────────────────────────────────────────────

INSERT INTO appointments (client_id, org_id, scheduled_at, service_type, status) VALUES
('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() + interval '2 days', 'Individual Music Therapy', 'scheduled'),
('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', NOW() + interval '3 days', 'Individual Music Therapy', 'scheduled'),
('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', NOW() + interval '1 day', 'Food Pantry Visit', 'scheduled'),
('33333333-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000003', NOW() + interval '5 days', 'Safety Planning', 'scheduled'),
('33333333-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', NOW() + interval '4 days', 'Case Management', 'scheduled');

-- ─── AI Structured Notes (risk levels for Risk Assessment chart) ───────────

UPDATE service_entries SET ai_structured_notes = '{  "summary": "Client showing significant anxiety reduction. Panic attacks reduced from weekly to zero. Sleep normalized to 7-8 hours. Emotional regulation skills well established through piano improvisation.",  "action_items": ["Send referral letter to ASU counseling center", "Schedule final discharge session for June"],  "follow_ups": [{"description": "Confirm ASU counseling referral received", "urgency": "high", "due_date": "2026-04-01"}],  "risk_level": "low",  "mood_flags": ["hopeful", "transitioning", "growth-oriented"] }'::jsonb
WHERE client_id = '11111111-0000-0000-0000-000000000001' AND date = '2026-03-25';

UPDATE service_entries SET ai_structured_notes = '{  "summary": "Client processing grief after spouse loss. Chose to work with husband instrument. Healthy emotional expression observed. Housing situation requires monitoring as client may need to downsize.",  "action_items": ["Check housing situation next session", "Coordinate with Chandler CARE Center for housing resources"],  "follow_ups": [{"description": "Housing follow-up", "urgency": "medium", "due_date": "2026-03-28"}],  "risk_level": "medium",  "mood_flags": ["grief", "vulnerable", "engaged"] }'::jsonb
WHERE client_id = '11111111-0000-0000-0000-000000000003' AND date = '2026-02-12';

UPDATE service_entries SET ai_structured_notes = '{  "summary": "Client with TBI showing measurable improvement. Sustained a consistent drumming beat for 4 minutes up from 90 seconds. Parents report calmer behavior at home. Impulsive anger still a concern requiring targeted intervention.",  "action_items": ["Address anger triggers next session", "Coordinate with parents on home strategies"],  "follow_ups": [{"description": "Parent check-in on anger incidents", "urgency": "medium", "due_date": "2026-02-19"}],  "risk_level": "medium",  "mood_flags": ["impulsive", "improving", "engaged"] }'::jsonb
WHERE client_id = '11111111-0000-0000-0000-000000000002' AND date = '2026-02-05';

UPDATE service_entries SET ai_structured_notes = '{  "summary": "Client presented in acute crisis with passive suicidal ideation. No active plan. Safety assessment completed. Sister contacted and staying with client. Safety plan established with three warning signs and coping strategies.",  "action_items": ["48-hour follow-up mandatory", "Verify sister staying with client tonight", "Crisis line number confirmed"],  "follow_ups": [{"description": "48-hour safety check", "urgency": "critical", "due_date": "2026-02-22"}],  "risk_level": "high",  "mood_flags": ["crisis", "suicidal-ideation", "safety-plan-active"] }'::jsonb
WHERE client_id = '33333333-0000-0000-0000-000000000002' AND date = '2026-02-20';

UPDATE service_entries SET ai_structured_notes = '{  "summary": "Client fled domestic violence, arrived with no belongings. Emergency shelter secured for tonight at Sojourner Center. Legal aid appointment set. Client is safe but frightened and needs continued support.",  "action_items": ["Confirm shelter placement", "Confirm legal aid appointment for March 8", "Follow up Monday"],  "follow_ups": [{"description": "Shelter and legal aid confirmation", "urgency": "critical", "due_date": "2026-03-04"}],  "risk_level": "high",  "mood_flags": ["acute-crisis", "safety-concern", "housing-unstable"] }'::jsonb
WHERE client_id = '33333333-0000-0000-0000-000000000001' AND date = '2026-03-01';

UPDATE service_entries SET ai_structured_notes = '{  "summary": "Elderly veteran presenting with food insecurity and social isolation. Has not eaten in 2 days. Emergency food box provided. VA benefits navigator referral made. Cognitive disorientation noted — may require further assessment.",  "action_items": ["Follow up within one week", "Contact VA benefits navigator", "Assess cognitive status on next visit"],  "follow_ups": [{"description": "Welfare check on Marcus", "urgency": "critical", "due_date": "2026-03-17"}],  "risk_level": "high",  "mood_flags": ["isolated", "food-insecure", "cognitive-concern"] }'::jsonb
WHERE client_id = '22222222-0000-0000-0000-000000000002' AND date = '2026-03-10';

UPDATE service_entries SET ai_structured_notes = '{  "summary": "Family of 5 receiving regular food support. SNAP application submitted with volunteer assistance. Diabetic dietary needs accommodated. Daughter school attendance concern flagged to school social worker.",  "action_items": ["Check SNAP status in 2 weeks", "Follow up with school social worker", "Prepare diabetic box for next visit"],  "follow_ups": [{"description": "SNAP application status and school follow-up", "urgency": "high", "due_date": "2026-03-17"}],  "risk_level": "medium",  "mood_flags": ["relieved", "financially-stressed", "child-welfare-concern"] }'::jsonb
WHERE client_id = '22222222-0000-0000-0000-000000000001' AND date = '2026-03-03';

UPDATE service_entries SET ai_structured_notes = '{  "summary": "Client and two children facing food insecurity due to wage shortfall after rent increase. Referral to ICM Food Bank and WIC completed. Client unaware of available resources — community education opportunity identified.",  "action_items": ["Confirm ICM Food Bank visit this Friday", "Confirm WIC enrollment", "Follow up next week"],  "follow_ups": [{"description": "Confirm ICM and WIC connections", "urgency": "critical", "due_date": "2026-03-19"}],  "risk_level": "high",  "mood_flags": ["embarrassed", "food-insecure", "children-affected"] }'::jsonb
WHERE client_id = '33333333-0000-0000-0000-000000000004' AND date = '2026-03-12';

UPDATE service_entries SET ai_structured_notes = '{  "summary": "Elderly client with severe social isolation following bereavement. Not leaving home, subsisting on inadequate nutrition. Referrals to Senior Companion Program and Meals on Wheels confirmed. Mental health referral made.",  "action_items": ["Confirm Meals on Wheels start date", "Weekly check-in calls scheduled", "Follow up on mental health clinic appointment"],  "follow_ups": [{"description": "Geriatric mental health clinic appointment", "urgency": "high", "due_date": "2026-03-28"}],  "risk_level": "high",  "mood_flags": ["grief", "isolated", "nutritional-risk", "depression-indicators"] }'::jsonb
WHERE client_id = '33333333-0000-0000-0000-000000000005' AND date = '2026-03-18';

UPDATE service_entries SET ai_structured_notes = '{  "summary": "Diana making strong progress post-crisis. No suicidal ideation since intake. Safety plan reinforced. Outpatient therapy appointment confirmed for March 5. Financial stress remains with rent arrears.",  "action_items": ["Confirm rental assistance application", "Check therapy appointment attendance"],  "follow_ups": [{"description": "Rental assistance and therapy follow-up", "urgency": "high", "due_date": "2026-03-10"}],  "risk_level": "medium",  "mood_flags": ["improving", "financially-stressed", "safety-plan-active"] }'::jsonb
WHERE client_id = '33333333-0000-0000-0000-000000000002' AND date = '2026-02-22';

-- ─── More NMTSA clients (language diversity for Language chart) ───────────

INSERT INTO clients (id, org_id, first_name, last_name, date_of_birth, phone, email, demographics, language_preference, is_active) VALUES
('11111111-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Nguyen', 'Thi', '1975-08-14', '(602) 555-0106', null,
 '{"instrument_played": "Voice", "therapy_goal": "Trauma processing — refugee resettlement", "sessions_per_week": 1}',
 'vi', true),
('11111111-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Omar', 'Khalid', '1990-03-22', '(602) 555-0107', null,
 '{"instrument_played": "Percussion", "therapy_goal": "PTSD — combat veteran", "sessions_per_week": 2}',
 'ar', true),
('11111111-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Elena', 'Vasquez', '2008-11-05', '(602) 555-0108', null,
 '{"instrument_played": "Piano", "therapy_goal": "Childhood trauma and communication", "sessions_per_week": 1}',
 'es', true),
('11111111-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Wei', 'Zhang', '1965-06-30', '(602) 555-0109', null,
 '{"instrument_played": "Erhu", "therapy_goal": "Stroke rehabilitation — motor and speech", "sessions_per_week": 2}',
 'zh', true);

-- ─── Additional NMTSA service entries for new clients ────────────────────

INSERT INTO service_entries (client_id, org_id, service_type, date, notes, ai_structured_notes) VALUES

('11111111-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Assessment Session', '2026-01-20',
 'Nguyen Thi arrived through refugee resettlement program. Speaks limited English; interpreter present. Significant trauma history. Strong connection to traditional Vietnamese folk songs — uses humming as self-soothing. Goals: trauma processing, reduce hypervigilance, rebuild sense of safety through familiar music.',
 '{"summary": "Refugee client with trauma history. Strong connection to traditional music identified as therapeutic pathway. Interpreter required for sessions.", "action_items": ["Arrange bilingual materials", "Connect with resettlement case worker"], "follow_ups": [{"description": "Coordinate with resettlement case worker", "urgency": "medium", "due_date": "2026-02-03"}], "risk_level": "medium", "mood_flags": ["trauma", "hypervigilant", "culturally-connected"]}'::jsonb),

('11111111-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-02-10',
 'Second session with Nguyen Thi. Used a recording of traditional Vietnamese quan ho folk songs. Client visibly relaxed for the first time — uncrossed her arms, began to hum along. Breakthrough moment. She shared that her grandmother sang these songs. Connected music to a safe memory. Will continue building on this cultural bridge. Mood: 3/10 start, 6/10 end.',
 '{"summary": "Significant breakthrough using culturally familiar Vietnamese folk music. Client demonstrated visible relaxation and emotional engagement.", "action_items": ["Source more Vietnamese folk recordings", "Document cultural music preferences"], "follow_ups": [], "risk_level": "low", "mood_flags": ["breakthrough", "culturally-responsive", "relaxed"]}'::jsonb),

('11111111-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Assessment Session', '2025-11-10',
 'Omar Khalid, 34, veteran with combat PTSD. Referred by VA. Has not slept more than 3 hours consecutively in 6 months. Hyperstartle response present. History of drumming in his home country — played tabla recreationally. Proposed rhythmic percussion as primary modality. Omar was initially skeptical but agreed to try. Goals: reduce hyperarousal, improve sleep, process traumatic memories safely.',
 '{"summary": "Combat veteran with PTSD presenting with severe sleep disruption and hyperarousal. Tabla drumming background identified as therapeutic entry point.", "action_items": ["Coordinate with VA therapist", "Develop sleep hygiene protocol alongside music therapy"], "follow_ups": [{"description": "VA therapist coordination", "urgency": "high", "due_date": "2025-11-24"}], "risk_level": "high", "mood_flags": ["PTSD", "hyperarousal", "hyperstartle", "sleep-disrupted"]}'::jsonb),

('11111111-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2025-12-08',
 'Omar session 4. Using rhythmic grounding — slow, steady drum patterns to regulate nervous system. He can now maintain eye contact for full conversations, which was not possible in session 1. Slept 5 hours two nights this week. Significant improvement. He said drumming feels like \"something from before\" — reconnecting to pre-trauma identity.',
 '{"summary": "Measurable improvement in eye contact and sleep quality. Rhythmic drumming reconnecting client to pre-trauma identity.", "action_items": ["Continue progressive rhythm complexity", "Check in on sleep journal weekly"], "follow_ups": [], "risk_level": "medium", "mood_flags": ["improving", "reconnecting", "regulated"]}'::jsonb),

('11111111-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-01-12',
 'Omar is sleeping 6 hours consistently. Hyperstartle response significantly reduced. He composed his first original percussion piece — named it \"Coming Home.\" This represents major therapeutic progress: narrative reconstruction through music. VA therapist confirmed improvement in PTSD symptom scores. Continuing twice weekly.',
 '{"summary": "Consistent 6-hour sleep achieved. Original composition created as narrative reconstruction. VA confirms PTSD symptom score improvement.", "action_items": ["Record composition for therapeutic archive", "Schedule VA progress review"], "follow_ups": [], "risk_level": "low", "mood_flags": ["progressing", "creative", "hopeful"]}'::jsonb),

('11111111-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-02-25',
 'Elena, 17, referred by school psychologist for childhood trauma. She is selectively mute in most school settings. Chose piano. Played with significant force initially — expressive outlet for pent-up emotion. Did not speak during session but communicated entirely through the instrument. This is clinically appropriate. Parent present; parent noted this is most expressive they have seen Elena in months.',
 '{"summary": "Selectively mute adolescent using piano as primary communication channel. High expressiveness observed. Parent reports significant improvement.", "action_items": ["Coordinate with school psychologist", "Maintain non-verbal safe space"], "follow_ups": [{"description": "School psychologist update", "urgency": "medium", "due_date": "2026-03-11"}], "risk_level": "medium", "mood_flags": ["selective-mutism", "expressive", "trauma-processing"]}'::jsonb),

('11111111-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-01-28',
 'Wei Zhang, 60, post-stroke. Right-side weakness affecting both fine motor and speech. Using erhu (traditional Chinese 2-string instrument) — he brought his own. The bilateral arm movement required for erhu playing is an excellent motor rehabilitation tool. He played haltingly but with great determination. Wife present and supportive. Speech therapist coordinating. Goals: motor rehabilitation, cognitive engagement, reduce post-stroke depression.',
 '{"summary": "Post-stroke client using traditional erhu for bilateral motor rehabilitation. Determination and family support are strong protective factors.", "action_items": ["Coordinate with speech therapist", "Document motor progress weekly"], "follow_ups": [], "risk_level": "low", "mood_flags": ["determined", "family-supported", "rehabilitation-focused"]}'::jsonb),

('11111111-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000001',
 'Individual Music Therapy', '2026-02-25',
 'Wei third session. Right hand grip noticeably stronger — can now hold the bow with less tremor. Played a full verse of a familiar folk song. Wife wept with joy. He attempted to sing a few words — first vocalization since the stroke. Speech therapist attending next session to observe. Mood elevated. Sleep improving.',
 '{"summary": "Measurable motor improvement — reduced tremor, increased grip strength. First post-stroke vocalization achieved. Strong progress across physical and emotional domains.", "action_items": ["Speech therapist joint session scheduled", "Document vocalization milestone"], "follow_ups": [], "risk_level": "low", "mood_flags": ["breakthrough", "family-joy", "motor-progress"]}'::jsonb),

-- ─── More ICM Food Bank entries (historical months for trend chart) ──────

('22222222-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Food Pantry Visit', '2025-10-14',
 'Fatima first visit. Halal requirements explained. Limited halal stock at the time — provided what we had and noted for future. Household of 3. Will expand halal section based on community need identified.',
 '{"summary": "First visit from client requiring halal food. Inventory gap identified — expansion needed.", "action_items": ["Expand halal inventory", "Contact local halal supplier"], "follow_ups": [], "risk_level": "low", "mood_flags": ["grateful", "newly-arrived"]}'::jsonb),

('22222222-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Food Pantry Visit', '2025-11-06',
 'Tom and wife first visit. Both have mobility difficulties. Introduced to the pantry layout with accessibility in mind. Set up a standing pickup arrangement so they do not have to wait in line. Wife needs size medium winter clothing.',
 '{"summary": "Elderly couple with mobility limitations accessing pantry. Accessibility accommodation made. Clothing needs noted.", "action_items": ["Arrange clothing pickup", "Set up accessible standing appointment"], "follow_ups": [], "risk_level": "low", "mood_flags": ["grateful", "mobility-limited"]}'::jsonb),

('22222222-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Food Pantry Visit', '2025-11-20',
 'Linh Nguyen first visit. Young mother with two small children and a school-age child. Vegetarian diet. Working part-time but income insufficient. ESL classes mentioned — she is committed to improving her situation. Connected her to ESL resources at Chandler library.',
 '{"summary": "Young immigrant mother with vegetarian dietary needs. Motivated and engaged. Connected to ESL resources.", "action_items": ["Follow up on ESL class enrollment", "Maintain vegetarian-appropriate box"], "follow_ups": [], "risk_level": "low", "mood_flags": ["motivated", "food-insecure", "resourceful"]}'::jsonb),

('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Food Pantry Visit', '2025-12-18',
 'Marcus pre-holiday visit. Doing better than last time — VA benefits payment received. Brought a neighbor who also needed food assistance. We registered the neighbor as a new client. Marcus was in good spirits — holiday plans with son mentioned for the first time.',
 '{"summary": "Client stabilized after VA benefits resolved. Referred neighbor for food assistance. Positive social connection indicators.", "action_items": ["Register referred neighbor", "Check in after holidays"], "follow_ups": [], "risk_level": "low", "mood_flags": ["stable", "social-connection", "hopeful"]}'::jsonb),

('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Food Pantry Visit', '2026-01-15',
 'Rosa returned post-holiday. SNAP application still pending — system backlog. Husband working more hours now. Children look healthier than October visit. Diabetic box prepared. Discussed meal planning with limited budget. Provided recipe cards with low-cost diabetic-friendly meals in Spanish.',
 '{"summary": "Client showing resilience. SNAP still pending but household improving. Child welfare indicators positive compared to prior visit.", "action_items": ["Check SNAP status", "Provide Spanish-language diabetic meal resources"], "follow_ups": [{"description": "SNAP application follow-up", "urgency": "medium", "due_date": "2026-01-29"}], "risk_level": "low", "mood_flags": ["resilient", "improving", "financially-recovering"]}'::jsonb),

('22222222-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Food Pantry Visit', '2026-02-05',
 'Linh Nguyen second visit. Has completed ESL level 1. Starting a new part-time job next week at a local restaurant. She brought homemade spring rolls as a thank-you. Children look well-nourished. We anticipate she may not need food bank assistance much longer — good outcome.',
 '{"summary": "Client progressing toward self-sufficiency. ESL completed, employment secured. Positive outcome trajectory.", "action_items": ["Update employment status", "Reassess food need level at next visit"], "follow_ups": [], "risk_level": "low", "mood_flags": ["thriving", "self-sufficient-pathway", "grateful"]}'::jsonb),

-- ─── More Chandler CARE entries (historical for trend) ───────────────────

('33333333-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003',
 'Crisis Intake', '2025-10-08',
 'Andre Davis, 22, presenting with opioid use disorder — heroin, using daily. Had an overdose last month, survived with Narcan from a friend. He is scared and wants to stop but has failed 3 prior attempts. Living situation unstable — couch surfing. Immediate referral to AHCCCS enrollment for Medication-Assisted Treatment (MAT). Suboxone program at Southwest Behavioral Health confirmed space. Will transport him tomorrow.',
 '{"summary": "Young client with active opioid use disorder post-overdose seeking treatment. MAT referral confirmed. Housing instability noted.", "action_items": ["Transport to MAT appointment tomorrow", "AHCCCS enrollment", "Safe housing referral"], "follow_ups": [{"description": "MAT program enrollment confirmation", "urgency": "critical", "due_date": "2025-10-10"}], "risk_level": "high", "mood_flags": ["substance-use", "post-overdose", "motivated-for-change", "housing-unstable"]}'::jsonb),

('33333333-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003',
 'Case Management', '2025-11-15',
 'Andre follow-up. Enrolled in Suboxone program — 5 weeks clean. Still couch surfing but has a lead on transitional housing at Paz de Cristo. Employment application submitted at Target. He looks different — alert, more present. This is working. Will continue weekly case management.',
 '{"summary": "Five weeks clean on MAT. Employment application submitted. Transitional housing in progress. Remarkable early recovery.", "action_items": ["Follow up on Paz de Cristo housing", "Support employment process", "Weekly check-ins"], "follow_ups": [], "risk_level": "medium", "mood_flags": ["early-recovery", "hopeful", "housing-in-progress"]}'::jsonb),

('33333333-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003',
 'Case Management', '2025-12-20',
 'Andre — 11 weeks clean. Moved into transitional housing at Paz de Cristo. Started part-time at Target. He has not missed a single Suboxone appointment. Family contact re-established — spoke to his mother for the first time in 18 months. This is one of the best outcomes we have seen this quarter.',
 '{"summary": "Eleven weeks clean. Stable housing secured. Part-time employment started. Family reconnection achieved. Exceptional recovery trajectory.", "action_items": ["Continue monthly case management", "Transition to outpatient-only at 6 months"], "follow_ups": [], "risk_level": "low", "mood_flags": ["stable-recovery", "housed", "employed", "family-reconnected"]}'::jsonb),

('33333333-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000003',
 'Crisis Intake', '2025-09-25',
 'Walter Kim first contact. Neighbor called on his behalf after not seeing him for a week. Walter opened the door after persistent knocking — gaunt, confused about what day it was. Wife passed 8 months ago. He stopped eating regularly, stopped going out. No family nearby. Immediate welfare check successful. Set up Meals on Wheels, Senior Companion Program.',
 '{"summary": "Elderly widower in crisis — social isolation and self-neglect following bereavement. Meals on Wheels and Senior Companion confirmed.", "action_items": ["Meals on Wheels start Monday", "Senior Companion first visit Wednesday", "Geriatric psychiatry referral"], "follow_ups": [{"description": "Geriatric mental health referral", "urgency": "high", "due_date": "2025-10-09"}], "risk_level": "high", "mood_flags": ["grief", "self-neglect", "isolated", "confused"]}'::jsonb),

('33333333-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000003',
 'Case Management', '2025-12-10',
 'Walter doing noticeably better. Has been receiving Meals on Wheels for 10 weeks. Senior Companion visits twice weekly — he looks forward to these. Started attending a grief support group at his church — neighbor drove him. He cooked a meal for himself last week for the first time since his wife passed. Geriatric psychiatry appointment completed: mild depression, no medication indicated, social engagement recommended.',
 '{"summary": "Significant improvement in isolation and self-care. Meals on Wheels, Senior Companion, grief group, and church community all contributing. Geriatric psychiatry confirms mild depression with social prescription.", "action_items": ["Continue monthly check-ins", "Encourage continued church group attendance"], "follow_ups": [], "risk_level": "low", "mood_flags": ["improving", "socially-connected", "self-care-restored"]}'::jsonb);

-- ─── ICM Food Bank — more language-diverse clients ───────────────────────

INSERT INTO clients (id, org_id, first_name, last_name, date_of_birth, phone, email, demographics, language_preference, is_active) VALUES
('22222222-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Amina', 'Hassan', '1985-04-17', '(480) 555-0206', null,
 '{"household_size": 4, "dietary_restrictions": "Halal only", "clothing_sizes": "Adult S, Kids 5, Kids 7"}',
 'so', true),
('22222222-0000-0000-0000-000000000007', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Carlos', 'Ramirez', '1978-09-03', '(480) 555-0207', null,
 '{"household_size": 6, "dietary_restrictions": "None", "clothing_sizes": "Adult L, Kids various"}',
 'es', true),
('22222222-0000-0000-0000-000000000008', 'bbbbbbbb-0000-0000-0000-000000000002',
 'Phuong', 'Tran', '1972-12-28', '(480) 555-0208', null,
 '{"household_size": 3, "dietary_restrictions": "No pork", "clothing_sizes": "Adult XS"}',
 'vi', true);

-- ─── Completed follow-ups (for stacked bar chart to show both bars) ───────

INSERT INTO follow_ups (client_id, org_id, service_entry_id, description, due_date, urgency, category, status) VALUES

('11111111-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001', null,
 'VA therapist coordination for Omar — PTSD co-treatment plan', '2025-11-24', 'high', 'Mental Health', 'done'),

('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', null,
 'Address anger triggers with James — follow up with parents on home incidents', '2026-02-19', 'medium', 'Behavioral', 'done'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', null,
 'School counselor referral for sleep and eating concerns — Maria', '2025-10-15', 'medium', 'Health', 'done'),

('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', null,
 'Family session coordination with Maria mother', '2025-11-05', 'low', 'Family', 'done'),

('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', null,
 'VA benefits navigator referral for Marcus', '2026-03-17', 'high', 'Benefits', 'done'),

('22222222-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000002', null,
 'ESL class enrollment follow-up for Linh', '2025-12-04', 'low', 'Education', 'done'),

('33333333-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003', null,
 'MAT program enrollment — transport Andre to Suboxone clinic', '2025-10-10', 'critical', 'Substance Use', 'done'),

('33333333-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003', null,
 'Transitional housing at Paz de Cristo for Andre', '2025-12-01', 'high', 'Housing', 'done'),

('33333333-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000003', null,
 'Geriatric mental health referral for Walter', '2025-10-09', 'high', 'Mental Health', 'done'),

('33333333-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000003', null,
 'Outpatient therapy appointment March 5 for Diana — confirm attendance', '2026-03-06', 'high', 'Mental Health', 'done'),

('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', null,
 'SNAP application assistance for Rosa — submitted successfully', '2026-03-03', 'medium', 'Benefits', 'done'),

('11111111-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', null,
 'Coordinate with resettlement case worker for Nguyen Thi', '2026-02-03', 'medium', 'Case Coordination', 'done');
