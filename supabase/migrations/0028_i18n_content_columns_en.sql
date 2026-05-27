-- =====================================================================
-- DAP — 0028: columnas _en para contenido bilingüe (ES/EN)
-- =====================================================================
-- Aditivo y seguro: AGREGA columnas text nulas (no modifica ni borra
-- datos existentes; ADD COLUMN nullable es instantáneo en Postgres).
-- El español vive en las columnas base; el inglés en las columnas _en.
-- Si _en es null, la app cae al español (traducción progresiva), vía
-- el helper lib/i18n/localized.ts.
--
-- Pares espejo por divergencia histórica de schema (ver 0009):
--   ranks  ↔ dimensions   (display público lee dimensions)
--   blocks ↔ phases        (display público/landing lee phases; admin lee blocks)
-- Por eso ambas tablas de cada par reciben columnas _en.
--
-- Las traducciones de los UPDATE se generaron desde el contenido EN VIVO
-- (no del repo, que estaba desactualizado). Idempotente vía where order_index.
-- =====================================================================

-- ---------- 1. Columnas _en ----------
alter table public.dimensions
  add column if not exists name_en text,
  add column if not exists description_en text;

alter table public.ranks
  add column if not exists name_en text,
  add column if not exists description_en text;

alter table public.phases
  add column if not exists title_en text,
  add column if not exists subtitle_en text,
  add column if not exists description_en text,
  add column if not exists brand_name_en text,
  add column if not exists promise_en text;

alter table public.blocks
  add column if not exists title_en text,
  add column if not exists subtitle_en text,
  add column if not exists description_en text,
  add column if not exists brand_name_en text,
  add column if not exists promise_en text;

alter table public.modules
  add column if not exists title_en text,
  add column if not exists subtitle_en text,
  add column if not exists description_en text,
  add column if not exists objective_en text,
  add column if not exists main_revelation_en text,
  add column if not exists impartation_phrase_en text;

alter table public.module_sections
  add column if not exists title_en text,
  add column if not exists body_md_en text;

-- ---------- 2. Seed traducciones (EN) ----------
update public.dimensions d set name_en = v.n, description_en = v.de
from (values
 (1,'Disciple','Awarded upon completing Block 1 — Spiritual Foundations'),
 (2,'Son','Awarded upon completing Block 2 — Identity and Character'),
 (3,'Leader','Awarded upon completing Block 3 — Leadership and Discipleship'),
 (4,'Minister','Awarded upon completing Block 4 — Ministry and Pastoral Care'),
 (5,'Administrator','Awarded upon completing Block 5 — Administration and Governance'),
 (6,'Steward','Awarded upon completing Block 6 — Kingdom Finances and Economy'),
 (7,'Reformer','Awarded upon completing Block 7 — Business and Expansion'),
 (8,'Architect','Awarded upon completing Block 8 — Technology, AI and Communication'),
 (9,'Sent One','Awarded upon completing Block 9 — Apostolic Government and Reform')
) as v(ord,n,de) where d.order_index = v.ord;

update public.ranks r set name_en = v.n, description_en = v.de
from (values
 (1,'Disciple','Awarded upon completing Block 1 — Spiritual Foundations'),
 (2,'Son','Awarded upon completing Block 2 — Identity and Character'),
 (3,'Leader','Awarded upon completing Block 3 — Leadership and Discipleship'),
 (4,'Pastor','Awarded upon completing Block 4 — Ministry and Pastoral Care'),
 (5,'Administrator','Awarded upon completing Block 5 — Administration and Governance'),
 (6,'Steward','Awarded upon completing Block 6 — Kingdom Finances and Economy'),
 (7,'Reformer','Awarded upon completing Block 7 — Business and Expansion'),
 (8,'Architect','Awarded upon completing Block 8 — Technology, AI and Communication'),
 (9,'Sent One','Awarded upon completing Block 9 — Apostolic Government and Reform')
) as v(ord,n,de) where r.order_index = v.ord;

update public.phases p set title_en=v.t, subtitle_en=v.s, brand_name_en=v.b, promise_en=v.pr
from (values
 (1,'Spiritual Foundations','Build the foundations of your calling on rock, not on sand.','Roots','You''ll come out knowing who God is, who you are, and what you were sent to do.'),
 (2,'Identity and Character','The process of character precedes the exercise of ministry.','Forge','You''ll understand that your identity as a son is the foundation of all authority.'),
 (3,'Leadership and Discipleship','Raise leaders who raise leaders. Light is lit to ignite.','Torch','You''ll come out forming others with the same faithfulness with which you were formed.'),
 (4,'Ministry and Pastoral Care','The pastoral heart before pastoral strategies.','Staff','You''ll shepherd with authority and tenderness, aligned to the apostolic model.'),
 (5,'Administration and Governance','Where there is order, there is blessing. Apostolic government has structure.','Order','You''ll run your ministry or church with the structure that sustains growth.'),
 (6,'Kingdom Finances and Economy','The Kingdom''s economy is not scarcity. It is sowing, stewardship, and multiplication.','Harvest','You''ll break structures of poverty and operate Kingdom finances with wisdom.'),
 (7,'Business and Expansion','The Kingdom''s call is also expressed in businesses, brands, and territories.','Impact','You''ll understand how your ministry can impact the marketplace and culture.'),
 (8,'Technology, AI and Communication','The 21st century demands pastors who master the tools that master culture.','Influence','You''ll use technology, AI, and media to extend your message without losing your soul.'),
 (9,'Apostolic Government and Reform','The apostle is not formed to hold positions, but to reform nations.','Dominion','You''ll be sent out with authority over territories, not just over congregations.')
) as v(ord,t,s,b,pr) where p.order_index = v.ord;

update public.blocks bl set title_en=v.t, subtitle_en=v.s, brand_name_en=v.bn, promise_en=v.pr
from (values
 (1,'Spiritual Foundations','Spiritual Foundations','Roots','Put down deep roots in the Kingdom before building anything.'),
 (2,'Identity and Character','Identity and Character','Forge','The character that sustains your calling is forged here.'),
 (3,'Leadership and Discipleship','Leadership and Discipleship','Torch','Learn to ignite, form, and multiply leaders who transform.'),
 (4,'Ministry and Pastoral Care','Ministry and Pastoral Care','Staff','The pastoral heart in action: caring for, healing, and guiding the flock.'),
 (5,'Administration and Governance','Administration and Governance','Order','Structure, systems, and governance for a ministry that endures.'),
 (6,'Kingdom Finances and Economy','Kingdom Finances and Economy','Harvest','Stewardship and abundance: wisely manage the Kingdom''s resources.'),
 (7,'Business and Expansion','Business and Expansion','Impact','Kingdom businesses that fund and impact your generation.'),
 (8,'Technology, AI and Communication','Technology, AI and Communication','Influence','Amplify your voice and your message with the tools of the future.'),
 (9,'Apostolic Government and Reform','Apostolic Government and Reform','Dominion','Govern, reform, and transform territories for the Kingdom.')
) as v(ord,t,s,bn,pr) where bl.order_index = v.ord;

update public.modules m set title_en = v.t
from (values
 (1,'Kingdom of God'),(2,'Identity in Christ'),(3,'Holy Spirit'),(4,'Prayer and Intercession'),
 (5,'Spiritual Authority'),(6,'Kingdom Culture'),(7,'Discipleship'),(8,'Intimacy with God'),
 (9,'The Spirit of Sonship'),(10,'Ministerial Identity'),(11,'Emotional Healing'),(12,'Character and Integrity'),
 (13,'Kingdom Mindset'),(14,'Formative Processes'),(15,'Family Life'),(16,'Personal Legacy'),
 (17,'Biblical Leadership'),(18,'How to Raise Leaders'),(19,'How to Disciple'),(20,'Multiplying Leaders'),
 (21,'Team Culture'),(22,'Vision and Direction'),(23,'Delegation and Development'),(24,'Culture of Honor'),
 (25,'Holistic Pastoral Care'),(26,'Preaching and Homiletics'),(27,'Pastoral Counseling'),(28,'Covering and Mentoring'),
 (29,'The Prophetic and Spiritual Sensitivity'),(30,'Handling Pastoral Crises'),(31,'Deliverance and Healing'),(32,'Houses of Peace and Discipleship in Homes'),
 (33,'Ministry Administration'),(34,'Systems and Processes'),(35,'Strategic Planning'),(36,'Budgeting and Financial Management'),
 (37,'Legal Matters and Foundations'),(38,'Managing Teams and Volunteers'),(39,'Organizational Culture'),(40,'Ministry KPIs'),
 (41,'Biblical Economics'),(42,'Stewardship'),(43,'Personal Finances'),(44,'Financial Freedom'),
 (45,'Ministry Finances'),(46,'Biblical Prosperity'),(47,'Multiple Income Streams'),(48,'Kingdom Mindset vs. Poverty Mindset'),
 (49,'Kingdom Business'),(50,'Apostolic Entrepreneurship'),(51,'Personal Brand and Branding'),(52,'Marketing and Sales'),
 (53,'Business Models'),(54,'Business Leadership'),(55,'Scalability and Expansion'),(56,'Cultural Influence'),
 (57,'AI Applied to Ministry'),(58,'Pastoral Automation'),(59,'Audiovisual Production and Streaming'),(60,'High-Impact Digital Communication'),
 (61,'Storytelling and Apostolic Narrative'),(62,'Brand and Digital Presence'),(63,'Ministry CRM and Data Management'),(64,'Digital Evangelism'),
 (65,'Apostolic Government'),(66,'Apostolic Culture'),(67,'Reform and Cultural Transformation'),(68,'Church Planting'),
 (69,'Global Missions'),(70,'Succession and Generational Legacy'),(71,'Kingdom Strategies'),(72,'Final Commissioning')
) as v(wk,t) where m.course_week = v.wk;

update public.module_sections s set title_en = v.t
from (values
 ('intro','Introduction'),
 ('teaching','Teaching'),
 ('activation','Activation'),
 ('evaluation','Assessment'),
 ('impartation','Impartation Statement')
) as v(k,t) where s.kind = v.k;
