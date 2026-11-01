# Session 3.5 - SQL by hand

**What you do today:** write SQL yourself, in `psql`, without the ORM. In Session 3 you only *read* the SQL SQLAlchemy produced. Today you write it: filters, joins, aggregation, subqueries, CTEs, window functions, dates, percentiles and safe writes. These are the skills interviews test and the ones you need when debugging production data at 2 a.m.

You work on a small, fixed **practice dataset** (NoteMind-shaped: users, notes, tags, summaries) in its own `practice` schema, so it never touches your app's tables, and every exercise has a known expected answer.

**Time:** about 6-8 hours. Do it right after Session 3 (it only needs the Postgres container). Good for 1-hour days: 4-5 exercises per sitting.

**HLD notes to read alongside:**

- `B-Data\B1-Data-Models-DB-Choice.md`: relational modelling.
- `B-Data\B2-Indexes.md`: revisit after section 9 (which queries would need which index?).

## How to use this article

1. Load the dataset (section 1).
2. For each exercise: **write your query first**, run it, compare with the expected result, and only then open the **Answer** dropdown.
3. If your result differs, don't just copy the answer. Find out *why* yours was different; that's where the learning is.
4. Keep your queries in a file `sql/my_answers.sql`, numbered. Re-do the ones you got wrong a week later.

> Expected results were computed by running equivalent queries on the same data. Timestamps are shown in UTC (the seed sets `TIME ZONE 'UTC'`). Column headers and spacing in `psql` look slightly different; compare the values.

## Topics

| # | Topic | Exercises |
|---|---|---|
| 1 | Setup, `psql` basics, the dataset | - |
| 2 | How a query is evaluated; filtering; NULL | 1-5 |
| 3 | Joins: inner, left, anti-join, many-to-many, the ON vs WHERE trap | 6-12 |
| 4 | Aggregation: GROUP BY, HAVING, COUNT variants, FILTER, fan-out | 13-19 |
| 5 | Subqueries and CTEs | 20-24 |
| 6 | Window functions | 25-30 |
| 7 | Dates, CASE, percentiles | 31-33 |
| 8 | Writing data safely | 34-36 |
| 9 | Interview classics + from SQL back to SQLAlchemy | - |

---

## 1. Setup and the dataset

### Theory

<details>
<summary><b>1) <code>psql</code> commands you'll use all day</b></summary>

Lines starting with `\` are `psql` commands, not SQL:

| Command | Does |
|---|---|
| `\dt` | list tables (in the current `search_path`) |
| `\d notes` | show a table's columns, indexes, constraints |
| `\x auto` | switch to vertical output when rows are too wide |
| `\timing on` | print how long each query took |
| `\e` | open the last query in an editor (handy for long queries) |
| `\i file.sql` | run a file |
| `\q` | quit |

A SQL statement only runs when it ends with `;`. If `psql` shows `notemind-#` instead of `notemind=#`, it's waiting for the rest of a statement: finish it with `;` or cancel with Ctrl+C.

</details>

<details>
<summary><b>2) Schemas and <code>search_path</code></b></summary>

A **schema** is a namespace inside a database. Your app's tables live in `public`. The practice tables live in `practice`, so `practice.notes` and `public.notes` never collide. `SET search_path TO practice;` means "when I write `notes`, look in `practice` first". It only lasts for your current `psql` session, so run it each time you connect.

</details>

<details>
<summary><b>3) The data, in one picture</b></summary>

```
users      : asha(1), ravi(2), meera(3), john(4), zoe(5)          zoe has no notes
notes      : 12 notes. asha 4, ravi 3, meera 4, john 1.           3 pinned, 2 with empty body
tags       : work, home, ideas, food, travel, urgent              "urgent" is on no note
note_tags  : 13 pairs.                                            notes 7 and 11 have no tag
summaries  : 10 rows: 7 succeeded, 2 failed, 1 running            3 have no duration (NULL)
```

Small enough to check answers by eye, but with every trap in it: a user with nothing, a tag with nothing, NULLs, duplicate titles, ties.

</details>

### Build it

Create `sql/practice_seed.sql` in the `notemind` folder:

```sql
-- file: sql/practice_seed.sql
-- A fixed practice dataset in its own schema. Safe to re-run: it starts from scratch.
SET TIME ZONE 'UTC';
DROP SCHEMA IF EXISTS practice CASCADE;
CREATE SCHEMA practice;
SET search_path TO practice;

CREATE TABLE users (
  id         int PRIMARY KEY,
  email      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL
);

CREATE TABLE tags (
  id   int PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE notes (
  id         int PRIMARY KEY,
  owner_id   int NOT NULL REFERENCES users(id),
  title      text NOT NULL,
  body       text NOT NULL DEFAULT '',
  pinned     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE note_tags (
  note_id int REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  int REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE summaries (
  id          int PRIMARY KEY,
  note_id     int NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  owner_id    int NOT NULL REFERENCES users(id),
  status      text NOT NULL,          -- succeeded | failed | running
  duration_ms int,                    -- NULL when not finished successfully
  created_at  timestamptz NOT NULL
);

INSERT INTO users VALUES
  (1, 'asha@example.com',  '2026-10-01 10:00+00'),
  (2, 'ravi@example.com',  '2026-10-03 10:00+00'),
  (3, 'meera@example.com', '2026-10-05 10:00+00'),
  (4, 'john@example.com',  '2026-10-10 10:00+00'),
  (5, 'zoe@example.com',   '2026-10-20 10:00+00');

INSERT INTO tags VALUES (1,'work'), (2,'home'), (3,'ideas'), (4,'food'), (5,'travel'), (6,'urgent');

INSERT INTO notes VALUES
  (1,  1, 'Q4 plan',       'Targets, hiring and budget for Q4. Review on Friday.', true,  '2026-11-01 09:00+00', '2026-11-03 10:00+00'),
  (2,  1, 'Groceries',     'milk, eggs',                                           false, '2026-11-01 18:00+00', '2026-11-01 18:00+00'),
  (3,  1, 'App ideas',     'Habit tracker; recipe scaler; offline notes sync.',    false, '2026-11-02 08:30+00', '2026-11-05 12:00+00'),
  (4,  1, 'Goa trip',      'Flights booked. Hotel near Baga beach.',               false, '2026-11-04 20:00+00', '2026-11-04 20:00+00'),
  (5,  2, 'Standup notes', 'Blocked on API keys. Demo moved to Thursday.',         false, '2026-11-01 10:00+00', '2026-11-01 10:00+00'),
  (6,  2, 'Recipes',       'Dal tadka, paneer tikka, lemon rice.',                 true,  '2026-11-02 19:00+00', '2026-11-06 09:00+00'),
  (7,  2, 'Book list',     '',                                                     false, '2026-11-03 21:00+00', '2026-11-03 21:00+00'),
  (8,  3, 'Sprint retro',  'Went well: deploys. Improve: flaky tests.',            false, '2026-11-02 15:00+00', '2026-11-02 15:00+00'),
  (9,  3, 'Paint colours', 'Living room: sage green. Bedroom: warm white.',        false, '2026-11-05 11:00+00', '2026-11-05 11:00+00'),
  (10, 3, 'Startup idea',  'AI that turns HAR files into typed SDKs.',             true,  '2026-11-05 22:00+00', '2026-11-07 08:00+00'),
  (11, 3, 'Untitled',      '',                                                     false, '2026-11-06 07:00+00', '2026-11-06 07:00+00'),
  (12, 4, 'Groceries',     'bread',                                                false, '2026-11-03 17:00+00', '2026-11-03 17:00+00');

INSERT INTO note_tags VALUES
  (1,1), (2,2), (2,4), (3,3), (3,1), (4,5), (5,1), (6,4), (6,2), (8,1), (9,2), (10,3), (12,4);

INSERT INTO summaries VALUES
  (1,  1,  1, 'succeeded', 1200, '2026-11-03 10:05+00'),
  (2,  1,  1, 'succeeded',  900, '2026-11-04 09:00+00'),
  (3,  3,  1, 'failed',     NULL, '2026-11-05 12:10+00'),
  (4,  5,  2, 'succeeded', 1500, '2026-11-01 10:30+00'),
  (5,  6,  2, 'succeeded', 2100, '2026-11-06 09:10+00'),
  (6,  6,  2, 'failed',     NULL, '2026-11-06 09:15+00'),
  (7,  8,  3, 'succeeded',  800, '2026-11-02 15:30+00'),
  (8,  10, 3, 'succeeded', 3000, '2026-11-07 08:10+00'),
  (9,  10, 3, 'running',    NULL, '2026-11-07 08:20+00'),
  (10, 12, 4, 'succeeded', 1000, '2026-11-03 17:30+00');
```

Load it, then open `psql` (PowerShell has no `<` redirection, so pipe the file in):

```powershell
Get-Content sql\practice_seed.sql | docker compose exec -T db psql -U notemind
docker compose exec db psql -U notemind
```

```sql
SET search_path TO practice;
SET TIME ZONE 'UTC';
\dt
SELECT count(*) FROM notes;   -- 12
```

Broke something during practice? Re-run the `Get-Content` line: the seed starts with `DROP SCHEMA ... CASCADE`.

---

## 2. How a query is evaluated; filtering; NULL

### Theory

<details>
<summary><b>1) The order you write ≠ the order it runs</b></summary>

You write `SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ... ORDER BY ... LIMIT`. Logically, the database evaluates it in this order:

```
1. FROM / JOIN    which rows exist (tables combined)
2. WHERE          keep rows that pass the condition
3. GROUP BY       collapse rows into groups
4. HAVING         keep groups that pass the condition
5. SELECT         compute output columns (and aliases)
6. DISTINCT       remove duplicate output rows
7. ORDER BY       sort
8. LIMIT/OFFSET   cut
```

This explains several "why doesn't this work?" moments:

- You **can't** use a `SELECT` alias in `WHERE` (step 2 runs before step 5 created it).
- You **can** use it in `ORDER BY` (step 7 runs after).
- `WHERE` can't filter on `count(*)` (no groups exist yet); that's what `HAVING` is for.

(The planner may physically do things in another order for speed; the *result* is as if it followed this order.)

</details>

<details>
<summary><b>2) No <code>ORDER BY</code> = no order</b></summary>

Without `ORDER BY`, rows come back in whatever order is convenient for the database. It often *looks* stable on small tables, then changes after an update or with more data. If order matters (it does for every list endpoint and every pagination), say it, and add a **tie-breaker** (usually `id`) so equal values always sort the same way. Otherwise rows can repeat or vanish between pages.

</details>

<details>
<summary><b>3) NULL means "unknown", and it's contagious</b></summary>

SQL has three truth values: true, false and **unknown** (NULL). Any comparison with NULL is unknown:

```sql
SELECT NULL = NULL;     -- NULL (not true!)
SELECT NULL <> 5;       -- NULL
SELECT 5 + NULL;        -- NULL
```

`WHERE` keeps only rows where the condition is **true**, so `WHERE duration_ms = NULL` returns **nothing**, ever. Use `IS NULL` / `IS NOT NULL`. `coalesce(duration_ms, 0)` replaces NULL with a default.

</details>

<details>
<summary><b>4) Pattern matching: <code>LIKE</code> and <code>ILIKE</code></b></summary>

`%` = any number of characters, `_` = exactly one. `LIKE` is case-sensitive; `ILIKE` (Postgres) isn't. `'%idea%'` can't use a normal B-tree index (it doesn't know where to start), so on big tables it scans; full-text search or trigram indexes solve that (`H-Geo-Search-Counting\H2-Search.md`).

</details>

### Exercises

**Ex 1.** Asha's notes (owner_id 1): `title` and `updated_at`, most recently updated first.

<details>
<summary>Answer</summary>

```sql
SELECT title, updated_at
FROM notes
WHERE owner_id = 1
ORDER BY updated_at DESC;
```

```
   title   |       updated_at
-----------+------------------------
 App ideas | 2026-11-05 12:00:00+00
 Goa trip  | 2026-11-04 20:00:00+00
 Q4 plan   | 2026-11-03 10:00:00+00
 Groceries | 2026-11-01 18:00:00+00
```

</details>

**Ex 2.** How many notes have an empty body?

<details>
<summary>Answer</summary>

```sql
SELECT count(*) FROM notes WHERE body = '';
```

`2` (notes 7 and 11). An empty string `''` is a value, not NULL. Our `body` column is `NOT NULL DEFAULT ''`, so "empty" is always `''`.

</details>

**Ex 3.** Summaries that have no duration. First try `WHERE duration_ms = NULL` and see what happens. Then fix it.

<details>
<summary>Answer</summary>

```sql
SELECT id, note_id, status FROM summaries WHERE duration_ms = NULL;    -- 0 rows: comparison is unknown
SELECT id, note_id, status FROM summaries WHERE duration_ms IS NULL ORDER BY id;
```

```
 id | note_id | status
----+---------+---------
  3 |       3 | failed
  6 |       6 | failed
  9 |      10 | running
```

</details>

**Ex 4.** Notes whose title contains "idea", in any letter case, sorted by title.

<details>
<summary>Answer</summary>

```sql
SELECT title FROM notes WHERE title ILIKE '%idea%' ORDER BY title;
```

```
    title
--------------
 App ideas
 Startup idea
```

</details>

**Ex 5.** Page 2 of all notes, 5 per page, newest `created_at` first. Make the order fully deterministic.

<details>
<summary>Answer</summary>

```sql
SELECT id, title, created_at
FROM notes
ORDER BY created_at DESC, id DESC   -- id breaks ties, so pages never overlap
LIMIT 5 OFFSET 5;
```

```
 id |    title     |       created_at
----+--------------+------------------------
 12 | Groceries    | 2026-11-03 17:00:00+00
  6 | Recipes      | 2026-11-02 19:00:00+00
  8 | Sprint retro | 2026-11-02 15:00:00+00
  3 | App ideas    | 2026-11-02 08:30:00+00
  2 | Groceries    | 2026-11-01 18:00:00+00
```

Bonus: write the **keyset** version of "the page after note 12": `WHERE (created_at, id) < ('2026-11-03 17:00+00', 12) ORDER BY created_at DESC, id DESC LIMIT 5`. Row comparison `(a, b) < (x, y)` compares like a dictionary: first `a`, then `b` on ties.

</details>

---

## 3. Joins

### Theory

<details>
<summary><b>1) What a join actually does</b></summary>

A join combines rows from two tables where the `ON` condition is true. Think of it as: for every row on the left, find every matching row on the right, and output one combined row **per match**.

```sql
SELECT n.title, u.email
FROM notes n                      -- n and u are aliases: short names for the tables
JOIN users u ON u.id = n.owner_id;
```

One note has one owner, so you get one row per note. But when one left row matches **several** right rows, it appears several times. Remember this; it causes the "fan-out" bug in section 4.

</details>

<details>
<summary><b>2) INNER vs LEFT JOIN</b></summary>

| Join | Keeps | NoteMind example |
|---|---|---|
| `JOIN` (= `INNER JOIN`) | only rows with a match on both sides | notes with their owner |
| `LEFT JOIN` | **every** left row; right columns are NULL when there's no match | every user, even zoe with no notes |
| `RIGHT JOIN` | the mirror of LEFT (rarely used; swap the tables instead) | |
| `FULL JOIN` | every row from both sides | comparing two lists |

"Users and their note counts" needs `LEFT JOIN`, or zoe silently disappears from your report.

</details>

<details>
<summary><b>3) The anti-join: "rows that have NO match"</b></summary>

"Notes without tags", "users who never did X". Two common ways:

```sql
-- A) LEFT JOIN, then keep rows where the right side is missing
SELECT n.id FROM notes n
LEFT JOIN note_tags nt ON nt.note_id = n.id
WHERE nt.note_id IS NULL;

-- B) NOT EXISTS: reads like the question, and stops at the first match
SELECT n.id FROM notes n
WHERE NOT EXISTS (SELECT 1 FROM note_tags nt WHERE nt.note_id = n.id);
```

Both are correct, and Postgres usually runs them the same way. **Avoid `NOT IN (subquery)`** for this: see section 5, dropdown 3.

</details>

<details>
<summary><b>4) Many-to-many: two joins through the link table</b></summary>

Notes ↔ tags go through `note_tags`:

```sql
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t       ON t.id = nt.tag_id
```

A note with 2 tags now appears on **2 rows**. That's correct if you want "note-tag pairs", and a bug if you then count notes (section 4).

</details>

<details>
<summary><b>5) The trap: a WHERE on the right table turns a LEFT JOIN into an INNER JOIN</b></summary>

"Every user, with their pinned notes if any":

```sql
-- WRONG: john and zoe disappear
SELECT u.email, n.title
FROM users u LEFT JOIN notes n ON n.owner_id = u.id
WHERE n.pinned = true;
```

For john, the LEFT JOIN produced rows with his (non-pinned) note; for zoe, a row with `n.*` all NULL. Then `WHERE n.pinned = true` removes them: false for john, unknown (NULL) for zoe. Conditions about the **right** table that should only limit *what matches* belong in `ON`:

```sql
-- RIGHT: the filter limits the match, not the result
SELECT u.email, n.title
FROM users u LEFT JOIN notes n ON n.owner_id = u.id AND n.pinned = true;
```

Exercise 12 makes you see both.

</details>

### Exercises

**Ex 6.** Every note's title with its owner's email, sorted by email then title. Show only the first 5 rows.

<details>
<summary>Answer</summary>

```sql
SELECT n.title, u.email
FROM notes n
JOIN users u ON u.id = n.owner_id
ORDER BY u.email, n.title
LIMIT 5;
```

```
   title   |      email
-----------+------------------
 App ideas | asha@example.com
 Goa trip  | asha@example.com
 Groceries | asha@example.com
 Q4 plan   | asha@example.com
 Groceries | john@example.com
```

</details>

**Ex 7.** Every user with their number of notes, **including users with none**, most notes first (ties by email).

<details>
<summary>Answer</summary>

```sql
SELECT u.email, count(n.id) AS notes
FROM users u
LEFT JOIN notes n ON n.owner_id = u.id
GROUP BY u.email
ORDER BY notes DESC, u.email;
```

```
       email       | notes
-------------------+-------
 asha@example.com  |     4
 meera@example.com |     4
 ravi@example.com  |     3
 john@example.com  |     1
 zoe@example.com   |     0
```

Why `count(n.id)` and not `count(*)`? For zoe, the LEFT JOIN creates **one** row with `n.id = NULL`. `count(*)` counts rows → 1 (wrong). `count(n.id)` counts non-NULL values → 0 (right).

</details>

**Ex 8.** Notes that have no tag at all (id, title).

<details>
<summary>Answer</summary>

```sql
SELECT n.id, n.title
FROM notes n
WHERE NOT EXISTS (SELECT 1 FROM note_tags nt WHERE nt.note_id = n.id)
ORDER BY n.id;
```

```
 id |   title
----+-----------
  7 | Book list
 11 | Untitled
```

Also write the `LEFT JOIN ... WHERE nt.note_id IS NULL` version and check it gives the same rows.

</details>

**Ex 9.** Tags that are used by no note.

<details>
<summary>Answer</summary>

```sql
SELECT t.name
FROM tags t
WHERE NOT EXISTS (SELECT 1 FROM note_tags nt WHERE nt.tag_id = t.id);
```

`urgent`.

</details>

**Ex 10.** Notes tagged `food`, with the owner's email, ordered by note id.

<details>
<summary>Answer</summary>

```sql
SELECT n.title, u.email
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t       ON t.id = nt.tag_id
JOIN users u      ON u.id = n.owner_id
WHERE t.name = 'food'
ORDER BY n.id;
```

```
   title   |      email
-----------+------------------
 Groceries | asha@example.com
 Recipes   | ravi@example.com
 Groceries | john@example.com
```

</details>

**Ex 11.** Notes that have **both** `work` and `ideas`. (Hint: one note can't be on a row where `t.name = 'work' AND t.name = 'ideas'`: each row holds one tag.)

<details>
<summary>Answer</summary>

```sql
SELECT n.id, n.title
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t       ON t.id = nt.tag_id
WHERE t.name IN ('work', 'ideas')
GROUP BY n.id, n.title
HAVING count(DISTINCT t.name) = 2;
```

```
 id |   title
----+-----------
  3 | App ideas
```

The pattern: keep rows matching *any* of the wanted values, group per note, and keep groups that matched *all* of them. This is called **relational division**, a favorite interview question.

</details>

**Ex 12.** Every user with their **pinned** notes, keeping users who have none. Write the wrong version (filter in `WHERE`) and the right one (filter in `ON`). Compare.

<details>
<summary>Answer</summary>

```sql
-- wrong: 3 rows, john and zoe are gone
SELECT u.email, n.title
FROM users u LEFT JOIN notes n ON n.owner_id = u.id
WHERE n.pinned = true
ORDER BY u.email;

-- right: 5 rows
SELECT u.email, n.title
FROM users u LEFT JOIN notes n ON n.owner_id = u.id AND n.pinned = true
ORDER BY u.email;
```

```
       email       |    title
-------------------+--------------
 asha@example.com  | Q4 plan
 john@example.com  |
 meera@example.com | Startup idea
 ravi@example.com  | Recipes
 zoe@example.com   |
```

(Empty cells are NULLs.) Section 3, dropdown 5 explains why.

</details>

---

## 4. Aggregation

### Theory

<details>
<summary><b>1) GROUP BY collapses rows; every output column must be grouped or aggregated</b></summary>

```sql
SELECT owner_id, count(*) FROM notes GROUP BY owner_id;
```

After `GROUP BY owner_id`, each group is "all notes of one owner". A column in `SELECT` must either be in `GROUP BY` (one value per group) or inside an aggregate (`count`, `sum`, `avg`, `min`, `max`, `string_agg`...). `SELECT owner_id, title ... GROUP BY owner_id` is an error: which of the 4 titles should it show?

(Postgres allows other columns of a table when you group by its **primary key**, since they're then guaranteed to be single-valued.)

</details>

<details>
<summary><b>2) WHERE vs HAVING</b></summary>

- `WHERE` filters **rows**, before grouping: "only succeeded summaries".
- `HAVING` filters **groups**, after aggregation: "only users with more than 3 notes".

Put everything you can in `WHERE`: fewer rows to group is faster.

</details>

<details>
<summary><b>3) Three different counts</b></summary>

| Expression | Counts |
|---|---|
| `count(*)` | rows |
| `count(col)` | rows where `col` is NOT NULL |
| `count(DISTINCT col)` | different non-NULL values of `col` |

Picking the wrong one is the most common aggregation bug. Exercise 18 shows all three on one table.

</details>

<details>
<summary><b>4) <code>FILTER</code>: several conditional counts in one pass</b></summary>

```sql
SELECT count(*)                                  AS total,
       count(*) FILTER (WHERE status = 'failed') AS failed
FROM summaries;
```

`FILTER (WHERE ...)` limits one aggregate to some rows. It's Postgres's clean form of `sum(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`, which works in every database.

</details>

<details>
<summary><b>5) Integer division: 100 * 2 / 3 = 66</b></summary>

Dividing two integers gives an integer in Postgres: `2 / 3` is `0`, `100 * 2 / 3` is `66`. For percentages, make one side a decimal: `100.0 * succeeded / total`, then `round(..., 1)`.

</details>

<details>
<summary><b>6) Fan-out: when a join silently multiplies your counts</b></summary>

Join users to notes **and** to summaries in one query: each of Asha's 4 notes gets paired with each of her 3 summaries = **12 rows**. Count anything on those rows and you get 12, not 4 or 3. No error, just wrong numbers in a dashboard.

Fixes: aggregate each child table **separately** (subqueries or CTEs, then join the small results), or `count(DISTINCT ...)` when it's just counting. Exercise 19 makes you hit it.

</details>

### Exercises

**Ex 13.** Number of notes per tag, including unused tags, most used first (ties by name).

<details>
<summary>Answer</summary>

```sql
SELECT t.name, count(nt.note_id) AS notes
FROM tags t
LEFT JOIN note_tags nt ON nt.tag_id = t.id
GROUP BY t.name
ORDER BY notes DESC, t.name;
```

```
  name  | notes
--------+-------
 work   |     4
 food   |     3
 home   |     3
 ideas  |     2
 travel |     1
 urgent |     0
```

</details>

**Ex 14.** Per user (all 5): total notes and pinned notes, in one query, using `FILTER`. Sort by email.

<details>
<summary>Answer</summary>

```sql
SELECT u.email,
       count(n.id)                         AS notes,
       count(n.id) FILTER (WHERE n.pinned) AS pinned
FROM users u
LEFT JOIN notes n ON n.owner_id = u.id
GROUP BY u.email
ORDER BY u.email;
```

```
       email       | notes | pinned
-------------------+-------+--------
 asha@example.com  |     4 |      1
 john@example.com  |     1 |      0
 meera@example.com |     4 |      1
 ravi@example.com  |     3 |      1
 zoe@example.com   |     0 |      0
```

`WHERE n.pinned` works because `pinned` is already a boolean.

</details>

**Ex 15.** Owners with **more than 3** notes (owner_id, count).

<details>
<summary>Answer</summary>

```sql
SELECT owner_id, count(*) AS notes
FROM notes
GROUP BY owner_id
HAVING count(*) > 3
ORDER BY owner_id;
```

```
 owner_id | notes
----------+-------
        1 |     4
        3 |     4
```

</details>

**Ex 16.** Titles used more than once (across all users).

<details>
<summary>Answer</summary>

```sql
SELECT title, count(*) FROM notes GROUP BY title HAVING count(*) > 1;
```

`Groceries | 2`. This "find duplicates" query is an interview classic. Variation: duplicates **per user** (`GROUP BY owner_id, title`) returns nothing here, since Asha's and John's Groceries belong to different people.

</details>

**Ex 17.** Summary success rate per user who has summaries: total, succeeded, and percentage with one decimal.

<details>
<summary>Answer</summary>

```sql
SELECT u.email,
       count(*)                                        AS total,
       count(*) FILTER (WHERE s.status = 'succeeded')  AS ok,
       round(100.0 * count(*) FILTER (WHERE s.status = 'succeeded') / count(*), 1) AS ok_pct
FROM summaries s
JOIN users u ON u.id = s.owner_id
GROUP BY u.email
ORDER BY u.email;
```

```
       email       | total | ok | ok_pct
-------------------+-------+----+--------
 asha@example.com  |     3 |  2 |   66.7
 john@example.com  |     1 |  1 |  100.0
 meera@example.com |     3 |  2 |   66.7
 ravi@example.com  |     3 |  2 |   66.7
```

Try it with `100 *` instead of `100.0 *`: you get `66` (dropdown 5).

</details>

**Ex 18.** On `summaries`, compute in one query: number of rows, number of rows with a duration, and number of different notes summarized.

<details>
<summary>Answer</summary>

```sql
SELECT count(*), count(duration_ms), count(DISTINCT note_id) FROM summaries;
```

`10 | 7 | 7`. Three different questions, three different answers from one table.

</details>

**Ex 19.** Per user: number of notes **and** number of summaries. First write it the naive way (users LEFT JOIN notes LEFT JOIN summaries, count both), look at Asha's numbers, then fix it.

<details>
<summary>Answer</summary>

```sql
-- naive: fan-out. asha shows 12 and 12
SELECT u.email, count(n.id) AS notes, count(s.id) AS summaries
FROM users u
LEFT JOIN notes n     ON n.owner_id = u.id
LEFT JOIN summaries s ON s.owner_id = u.id
GROUP BY u.email
ORDER BY u.email;

-- fixed: aggregate each child table separately, then join
WITH n AS (SELECT owner_id, count(*) AS notes     FROM notes     GROUP BY owner_id),
     s AS (SELECT owner_id, count(*) AS summaries FROM summaries GROUP BY owner_id)
SELECT u.email, coalesce(n.notes, 0) AS notes, coalesce(s.summaries, 0) AS summaries
FROM users u
LEFT JOIN n ON n.owner_id = u.id
LEFT JOIN s ON s.owner_id = u.id
ORDER BY u.email;
```

Naive result: asha 12/12, john 1/1, meera 12/12, ravi 9/9, zoe 0/0. Fixed:

```
       email       | notes | summaries
-------------------+-------+-----------
 asha@example.com  |     4 |         3
 john@example.com  |     1 |         1
 meera@example.com |     4 |         3
 ravi@example.com  |     3 |         3
 zoe@example.com   |     0 |         0
```

`count(DISTINCT n.id), count(DISTINCT s.id)` on the naive query also gives the right counts, but it still builds the multiplied rows (slow on big data) and doesn't work for `sum` or `avg`.

</details>

---

## 5. Subqueries and CTEs

### Theory

<details>
<summary><b>1) Three kinds of subquery</b></summary>

| Kind | Returns | Example |
|---|---|---|
| **Scalar** | one value | `WHERE length(body) > (SELECT avg(length(body)) FROM notes)` |
| **Set** (`IN`) | a list of values | `WHERE owner_id IN (SELECT id FROM users WHERE ...)` |
| **Correlated** (`EXISTS`) | true/false per outer row; refers to the outer query | `WHERE EXISTS (SELECT 1 FROM summaries s WHERE s.note_id = n.id)` |

A correlated subquery is conceptually re-run for each outer row. Postgres usually turns it into an efficient join anyway.

</details>

<details>
<summary><b>2) CTEs: <code>WITH</code> to name a step</b></summary>

```sql
WITH per_user AS (
  SELECT u.id, count(n.id) AS notes
  FROM users u LEFT JOIN notes n ON n.owner_id = u.id
  GROUP BY u.id
)
SELECT avg(notes) FROM per_user;
```

A CTE is a named subquery: it makes multi-step queries readable top to bottom, like variables in code. In modern Postgres (12+) a simple CTE is inlined into the main query, so it's usually no slower than writing the subquery inline.

</details>

<details>
<summary><b>3) The <code>NOT IN</code> + NULL trap</b></summary>

```sql
SELECT email FROM users
WHERE id NOT IN (SELECT owner_id FROM notes UNION ALL SELECT NULL);   -- returns NOTHING
```

`x NOT IN (1, 2, NULL)` means `x <> 1 AND x <> 2 AND x <> NULL`. The last part is unknown, so the whole condition is never true. One NULL in the subquery and your result silently becomes empty. `NOT EXISTS` doesn't have this problem. Rule: **use `NOT EXISTS` for "has no matching row".**

</details>

### Exercises

**Ex 20.** Notes whose body is longer than the average body length. Show id, title, length, longest first. What *is* the average?

<details>
<summary>Answer</summary>

```sql
SELECT avg(length(body)) FROM notes;   -- 30.0000000000000000

SELECT id, title, length(body) AS len
FROM notes
WHERE length(body) > (SELECT avg(length(body)) FROM notes)
ORDER BY len DESC;
```

```
 id |     title     | len
----+---------------+-----
  1 | Q4 plan       |  52
  3 | App ideas     |  49
  9 | Paint colours |  45
  5 | Standup notes |  44
  8 | Sprint retro  |  41
 10 | Startup idea  |  40
  4 | Goa trip      |  38
  6 | Recipes       |  36
```

</details>

**Ex 21.** Users who **never** got a successful summary.

<details>
<summary>Answer</summary>

```sql
SELECT u.email
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM summaries s WHERE s.owner_id = u.id AND s.status = 'succeeded'
);
```

`zoe@example.com`. She has no summaries at all, and "never succeeded" includes "never tried". If the question meant "tried but never succeeded", add `AND EXISTS (SELECT 1 FROM summaries s WHERE s.owner_id = u.id)`. Clarify which one before writing it; interviewers like that question.

</details>

**Ex 22.** Using a CTE: the average and the maximum number of notes per user, counting users with zero notes.

<details>
<summary>Answer</summary>

```sql
WITH per_user AS (
  SELECT u.id, count(n.id) AS notes
  FROM users u LEFT JOIN notes n ON n.owner_id = u.id
  GROUP BY u.id
)
SELECT avg(notes), max(notes) FROM per_user;
```

`2.4000000000000000 | 4`, so (4 + 3 + 4 + 1 + 0) / 5. With an INNER JOIN zoe would vanish and the average would be 3.0: same data, a different answer to a different question.

</details>

**Ex 23.** Notes that were never summarized.

<details>
<summary>Answer</summary>

```sql
SELECT n.id, n.title
FROM notes n
WHERE NOT EXISTS (SELECT 1 FROM summaries s WHERE s.note_id = n.id)
ORDER BY n.id;
```

```
 id |     title
----+---------------
  2 | Groceries
  4 | Goa trip
  7 | Book list
  9 | Paint colours
 11 | Untitled
```

</details>

**Ex 24.** Reproduce the `NOT IN` trap: write "users who own no note" with `NOT IN`, then add `UNION ALL SELECT NULL` to the subquery, and watch zoe disappear. Then write the `NOT EXISTS` version.

<details>
<summary>Answer</summary>

```sql
SELECT email FROM users WHERE id NOT IN (SELECT owner_id FROM notes);                       -- zoe
SELECT email FROM users WHERE id NOT IN (SELECT owner_id FROM notes UNION ALL SELECT NULL); -- nothing!
SELECT email FROM users u WHERE NOT EXISTS (SELECT 1 FROM notes n WHERE n.owner_id = u.id); -- zoe
```

`owner_id` is `NOT NULL` here, so the first one happens to work. On a nullable column (a `parent_id`, a `deleted_by`...) it would silently return nothing.

</details>

---

## 6. Window functions

### Theory

<details>
<summary><b>1) GROUP BY collapses rows; a window function keeps them</b></summary>

`count(*) ... GROUP BY owner_id` gives **one row per owner**. A window function computes over a group of rows but **keeps every row**, adding the result as a column:

```sql
SELECT title, owner_id,
       count(*) OVER (PARTITION BY owner_id) AS owner_total
FROM notes;
-- every note is still there, and each row also shows how many notes its owner has
```

`OVER (...)` is what makes it a window function. Inside:

- `PARTITION BY` splits rows into groups (like GROUP BY, without collapsing),
- `ORDER BY` orders rows inside each partition (needed for ranking, running totals, previous/next row).

</details>

<details>
<summary><b>2) ROW_NUMBER, RANK, DENSE_RANK: three ways to number rows</b></summary>

For note counts 4, 4, 3, 1, 0:

| Function | Result | Ties |
|---|---|---|
| `row_number()` | 1, 2, 3, 4, 5 | always unique (ties broken arbitrarily, unless you add a tie-breaker) |
| `rank()` | 1, 1, 3, 4, 5 | ties share a rank, then a **gap** |
| `dense_rank()` | 1, 1, 2, 3, 4 | ties share a rank, **no gap** |

</details>

<details>
<summary><b>3) "Top N per group": the most useful window pattern</b></summary>

"Each user's latest note", "top 3 products per category", "last login per user":

```sql
SELECT * FROM (
  SELECT n.*, row_number() OVER (PARTITION BY owner_id ORDER BY created_at DESC) AS rn
  FROM notes n
) ranked
WHERE rn = 1;       -- rn <= 3 for top 3
```

You can't put `WHERE rn = 1` in the same `SELECT` (the window is computed at step 5 of the evaluation order, after `WHERE`), hence the subquery or CTE around it. Postgres also has `DISTINCT ON (owner_id) ... ORDER BY owner_id, created_at DESC` as a shortcut for top-1.

</details>

<details>
<summary><b>4) Running totals and the window "frame"</b></summary>

`sum(x) OVER (ORDER BY day)` adds up all rows from the first one up to the current row: a running total. That "from where to where" is the **frame**. The default with `ORDER BY` is "from the start up to the current row (including ties)". Explicit frames give moving windows:

```sql
avg(x) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)   -- 7-day moving average
```

</details>

<details>
<summary><b>5) LAG and LEAD: look at the previous / next row</b></summary>

`lag(created_at) OVER (ORDER BY created_at)` is the previous row's value (NULL for the first). Use it for "time since the previous event", "change from last month", and to detect gaps or streaks.

</details>

<details>
<summary><b>6) <code>OVER ()</code>: a total over everything</b></summary>

An empty `OVER ()` is one window of all rows: `100.0 * count / sum(count) OVER ()` gives each row's share of the grand total, without a second query.

</details>

### Exercises

**Ex 25.** Each user's **latest** note (by `created_at`): email, title, created_at.

<details>
<summary>Answer</summary>

```sql
SELECT email, title, created_at
FROM (
  SELECT u.email, n.title, n.created_at,
         row_number() OVER (PARTITION BY n.owner_id ORDER BY n.created_at DESC) AS rn
  FROM notes n
  JOIN users u ON u.id = n.owner_id
) ranked
WHERE rn = 1
ORDER BY email;
```

```
       email       |   title   |       created_at
-------------------+-----------+------------------------
 asha@example.com  | Goa trip  | 2026-11-04 20:00:00+00
 john@example.com  | Groceries | 2026-11-03 17:00:00+00
 meera@example.com | Untitled  | 2026-11-06 07:00:00+00
 ravi@example.com  | Book list | 2026-11-03 21:00:00+00
```

Bonus: the `DISTINCT ON` version: `SELECT DISTINCT ON (n.owner_id) u.email, n.title, n.created_at FROM notes n JOIN users u ON u.id = n.owner_id ORDER BY n.owner_id, n.created_at DESC;`

</details>

**Ex 26.** Rank users by note count (all 5) with `rank()`, `dense_rank()` and `row_number()` side by side.

<details>
<summary>Answer</summary>

```sql
WITH counts AS (
  SELECT u.email, count(n.id) AS notes
  FROM users u LEFT JOIN notes n ON n.owner_id = u.id
  GROUP BY u.email
)
SELECT email, notes,
       rank()       OVER (ORDER BY notes DESC)        AS rnk,
       dense_rank() OVER (ORDER BY notes DESC)        AS dense,
       row_number() OVER (ORDER BY notes DESC, email) AS rn
FROM counts
ORDER BY notes DESC, email;
```

```
       email       | notes | rnk | dense | rn
-------------------+-------+-----+-------+----
 asha@example.com  |     4 |   1 |     1 |  1
 meera@example.com |     4 |   1 |     1 |  2
 ravi@example.com  |     3 |   3 |     2 |  3
 john@example.com  |     1 |   4 |     3 |  4
 zoe@example.com   |     0 |   5 |     4 |  5
```

</details>

**Ex 27.** Notes created per day, with a running total.

<details>
<summary>Answer</summary>

```sql
WITH per_day AS (
  SELECT created_at::date AS day, count(*) AS notes
  FROM notes
  GROUP BY day
)
SELECT day, notes, sum(notes) OVER (ORDER BY day) AS running_total
FROM per_day
ORDER BY day;
```

```
    day     | notes | running_total
------------+-------+---------------
 2026-11-01 |     3 |             3
 2026-11-02 |     3 |             6
 2026-11-03 |     2 |             8
 2026-11-04 |     1 |             9
 2026-11-05 |     2 |            11
 2026-11-06 |     1 |            12
```

`created_at::date` is a cast, converting a timestamp to its date **in the session's time zone**. That's why the setup said `SET TIME ZONE 'UTC'`: in IST some evening notes would land on the next day.

</details>

**Ex 28.** For Asha's notes, in creation order: title, created_at, and hours since her previous note (one decimal).

<details>
<summary>Answer</summary>

```sql
SELECT title, created_at,
       round(extract(epoch FROM created_at - lag(created_at) OVER (ORDER BY created_at)) / 3600, 1)
         AS hours_since_prev
FROM notes
WHERE owner_id = 1
ORDER BY created_at;
```

```
   title   |       created_at       | hours_since_prev
-----------+------------------------+------------------
 Q4 plan   | 2026-11-01 09:00:00+00 |
 Groceries | 2026-11-01 18:00:00+00 |              9.0
 App ideas | 2026-11-02 08:30:00+00 |             14.5
 Goa trip  | 2026-11-04 20:00:00+00 |             59.5
```

Subtracting two timestamps gives an `interval`; `extract(epoch FROM interval)` turns it into seconds.

</details>

**Ex 29.** Each user's share of all notes, as a percentage with one decimal.

<details>
<summary>Answer</summary>

```sql
SELECT u.email, count(*) AS notes,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
FROM notes n
JOIN users u ON u.id = n.owner_id
GROUP BY u.email
ORDER BY notes DESC, u.email;
```

```
       email       | notes | pct
-------------------+-------+------
 asha@example.com  |     4 | 33.3
 meera@example.com |     4 | 33.3
 ravi@example.com  |     3 | 25.0
 john@example.com  |     1 |  8.3
```

`sum(count(*)) OVER ()` looks odd but is allowed: the window runs after `GROUP BY`, over the grouped rows, so it's "sum of the per-user counts" = 12.

</details>

**Ex 30.** The **second-longest** distinct summary duration. Do it two ways.

<details>
<summary>Answer</summary>

```sql
-- A) skip the first
SELECT DISTINCT duration_ms FROM summaries
WHERE duration_ms IS NOT NULL
ORDER BY duration_ms DESC
LIMIT 1 OFFSET 1;

-- B) dense_rank: also works for "Nth" and "Nth per group"
SELECT duration_ms FROM (
  SELECT duration_ms, dense_rank() OVER (ORDER BY duration_ms DESC) AS r
  FROM summaries WHERE duration_ms IS NOT NULL
) x
WHERE r = 2
LIMIT 1;
```

`2100`. Version B is the one to show in interviews: change `ORDER BY` to `PARTITION BY owner_id ORDER BY ...` and it becomes "second longest per user".

</details>

---

## 7. Dates, CASE and percentiles

### Theory

<details>
<summary><b>1) Dates you'll actually need</b></summary>

```sql
now()                                  -- current timestamp (with time zone)
created_at::date                       -- just the date (in the session time zone)
date_trunc('week', created_at)         -- round down to the start of the week/day/month
created_at > now() - interval '24 hours'
created_at >= '2026-11-01' AND created_at < '2026-11-08'   -- half-open range: no 23:59:59.999 games
```

Prefer half-open ranges (`>= start AND < end`). And keep the column bare: `WHERE created_at::date = '2026-11-03'` can't use an index on `created_at`, while the range version can.

</details>

<details>
<summary><b>2) CASE: if/else inside a query</b></summary>

```sql
CASE
  WHEN duration_ms IS NULL THEN 'unknown'
  WHEN duration_ms < 1000  THEN 'fast'
  ELSE 'slow'
END
```

Conditions are checked top to bottom, and the first true one wins. Without `ELSE`, unmatched rows get NULL. Useful for buckets, labels, and conditional aggregation in databases without `FILTER`.

</details>

<details>
<summary><b>3) Percentiles: <code>percentile_cont</code> vs <code>percentile_disc</code></b></summary>

```sql
SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) FROM summaries;
```

- `percentile_cont` **interpolates** between the two nearest values (a smooth number that may not exist in the data).
- `percentile_disc` returns an **actual** value from the data.

This is how you compute p50/p95 latency (Session 8) straight from a table. NULLs are ignored.

</details>

### Exercises

**Ex 31.** Summaries per day: total and failed.

<details>
<summary>Answer</summary>

```sql
SELECT created_at::date AS day,
       count(*) AS total,
       count(*) FILTER (WHERE status = 'failed') AS failed
FROM summaries
GROUP BY day
ORDER BY day;
```

```
    day     | total | failed
------------+-------+--------
 2026-11-01 |     1 |      0
 2026-11-02 |     1 |      0
 2026-11-03 |     2 |      0
 2026-11-04 |     1 |      0
 2026-11-05 |     1 |      1
 2026-11-06 |     2 |      1
 2026-11-07 |     2 |      0
```

Days with zero summaries are **missing**, not zero. For a chart you'd generate every day with `generate_series('2026-11-01'::date, '2026-11-07', '1 day')` and LEFT JOIN the counts onto it (practice task 2).

</details>

**Ex 32.** Bucket summary durations: `unknown` (NULL), `fast` (< 1000 ms), `ok` (1000-2000 ms) and `slow` (> 2000 ms). Count per bucket.

<details>
<summary>Answer</summary>

```sql
SELECT CASE
         WHEN duration_ms IS NULL  THEN 'unknown'
         WHEN duration_ms < 1000   THEN 'fast'
         WHEN duration_ms <= 2000  THEN 'ok'
         ELSE 'slow'
       END AS bucket,
       count(*)
FROM summaries
GROUP BY bucket
ORDER BY bucket;
```

```
 bucket  | count
---------+-------
 fast    |     2
 ok      |     3
 slow    |     2
 unknown |     3
```

Put the `IS NULL` case first: `NULL < 1000` is unknown, so NULLs would otherwise fall through to `ELSE 'slow'`.

</details>

**Ex 33.** p50 and p95 of summary duration, with `percentile_cont`; then p95 with `percentile_disc`.

<details>
<summary>Answer</summary>

```sql
SELECT percentile_cont(0.5)  WITHIN GROUP (ORDER BY duration_ms) AS p50,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95,
       percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_disc
FROM summaries;
```

`1200 | 2730 | 3000`. Sorted durations: 800, 900, 1000, 1200, 1500, 2100, 3000. The p95 position is 0.95 × (7 − 1) = 5.7, so 70% of the way from the 6th value (2100) to the 7th (3000): 2100 + 0.7 × 900 = 2730. `percentile_disc` picks the real value 3000. With only 7 samples, p95 is basically "the max". Percentiles need volume to mean anything.

</details>

---

## 8. Writing data safely

### Theory

<details>
<summary><b>1) The habit that saves careers: SELECT first, in a transaction</b></summary>

Before any `UPDATE` or `DELETE` on real data:

1. Write it as a `SELECT` with the **same** `WHERE`, and check the rows and the count.
2. `BEGIN;` then run the `UPDATE`/`DELETE`.
3. Check the reported row count (`UPDATE 4`) and look at the result.
4. `COMMIT;` if right, `ROLLBACK;` if not.

An `UPDATE` without `WHERE` changes **every row**. Inside `BEGIN`, that's a `ROLLBACK` away from fine; outside, it's a restore-from-backup day.

</details>

<details>
<summary><b>2) <code>RETURNING</code>: see what you changed</b></summary>

```sql
UPDATE summaries SET status = 'failed' WHERE ... RETURNING id, status;
```

Postgres returns the affected rows, so you see exactly what changed (and the app gets generated values without a second query). SQLAlchemy used it for the idempotency key in Session 5.

</details>

<details>
<summary><b>3) UPDATE using another table: <code>UPDATE ... FROM</code></b></summary>

```sql
UPDATE notes n
SET pinned = true
FROM note_tags nt JOIN tags t ON t.id = nt.tag_id
WHERE nt.note_id = n.id AND t.name = 'work';
```

`FROM` brings in other tables to decide which rows to update, like a join. (`DELETE ... USING` is the delete version.)

</details>

### Exercises

**Ex 34.** The reaper from Session 6, by hand: in a transaction, mark summaries that are still `running` and were created before `2026-11-08` as `failed`, show what changed with `RETURNING`, then **roll back**.

<details>
<summary>Answer</summary>

```sql
BEGIN;
UPDATE summaries
SET status = 'failed'
WHERE status = 'running' AND created_at < '2026-11-08'
RETURNING id, note_id, status;
ROLLBACK;
```

Returns one row: `9 | 10 | failed`, and `psql` prints `UPDATE 1`. After `ROLLBACK`, `SELECT status FROM summaries WHERE id = 9;` is `running` again.

</details>

**Ex 35.** In a transaction: pin every note tagged `work` with `UPDATE ... FROM`, check the count, roll back.

<details>
<summary>Answer</summary>

```sql
BEGIN;
UPDATE notes n
SET pinned = true
FROM note_tags nt
JOIN tags t ON t.id = nt.tag_id
WHERE nt.note_id = n.id AND t.name = 'work'
RETURNING n.id, n.title;
ROLLBACK;
```

`UPDATE 4`: notes 1, 3, 5 and 8 (note 1 was already pinned, and it's still counted as updated).

</details>

**Ex 36.** De-duplicate: keep only the **latest** summary per note and delete the older ones. Find them with `row_number()`, delete in a transaction, roll back.

<details>
<summary>Answer</summary>

```sql
-- step 1: look first
SELECT id, note_id, created_at FROM (
  SELECT id, note_id, created_at,
         row_number() OVER (PARTITION BY note_id ORDER BY created_at DESC) AS rn
  FROM summaries
) x
WHERE rn > 1;

-- step 2: delete exactly those
BEGIN;
DELETE FROM summaries
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY note_id ORDER BY created_at DESC) AS rn
    FROM summaries
  ) x
  WHERE rn > 1
)
RETURNING id, note_id;
ROLLBACK;
```

Step 1 shows ids 1, 5 and 8 (older summaries of notes 1, 6 and 10); step 2 prints `DELETE 3`. "Delete duplicates, keep the newest" is a classic interview question, and this is the clean answer.

</details>

---

## 9. Interview classics, and back to SQLAlchemy

### Theory

<details>
<summary><b>1) The classic questions and which exercise answers them</b></summary>

| Question | Pattern | Exercise |
|---|---|---|
| Second (Nth) highest value | `dense_rank()` or `OFFSET` | 30 |
| Top N per group / latest per user | `row_number() OVER (PARTITION BY ...)` | 25 |
| Find duplicates | `GROUP BY ... HAVING count(*) > 1` | 16 |
| Delete duplicates, keep one | `row_number()` + `DELETE ... WHERE id IN` | 36 |
| Users who never did X | `NOT EXISTS` (not `NOT IN`) | 21, 23, 24 |
| Items having ALL of a set | `GROUP BY ... HAVING count(DISTINCT ...) = N` | 11 |
| Running total / moving average | `sum() OVER (ORDER BY ...)` | 27 |
| Share of total | `x / sum(x) OVER ()` | 29 |
| Time between events | `lag()` | 28 |
| Counts include zeros | `LEFT JOIN` + `count(col)` | 7, 13 |
| Counts look too big | fan-out; aggregate separately | 19 |
| Conditional counts | `FILTER` / `sum(CASE ...)` | 14, 17 |
| p95 latency | `percentile_cont` | 33 |

In an interview: say the question back, ask about NULLs, ties and "include zeros?", write the query step by step (FROM → WHERE → GROUP → SELECT), then check it on a tiny example in your head.

</details>

<details>
<summary><b>2) The same patterns in SQLAlchemy 2.0</b></summary>

Once you can write the SQL, the ORM version is a translation:

```python
from sqlalchemy import func, select, exists

# Ex 7: LEFT JOIN + count(col)
select(User.email, func.count(Note.id)).outerjoin(Note, Note.owner_id == User.id).group_by(User.email)

# Ex 14: FILTER
func.count(Note.id).filter(Note.pinned)

# Ex 23: NOT EXISTS
select(Note).where(~exists().where(Summary.note_id == Note.id))

# Ex 25: row_number() OVER (PARTITION BY ...)
rn = func.row_number().over(partition_by=Note.owner_id, order_by=Note.created_at.desc()).label("rn")
ranked = select(Note.id, Note.title, rn).subquery()
select(ranked).where(ranked.c.rn == 1)

# Ex 33: percentile
select(func.percentile_cont(0.95).within_group(Summary.duration_ms))
```

When the ORM version gets hard to read, a plain `text()` query with bound parameters is perfectly fine. Clarity beats cleverness.

</details>

---

## Practice tasks

1. Run Ex 7, 13 and 25 against your **real** NoteMind tables (`SET search_path TO public;`, and use the real column names: UUID ids, `owner_id` from Session 4). Does your data give the answers you expect?
2. Make Ex 31 chart-ready: list **every** day from 2026-11-01 to 2026-11-08, with 0 for days without summaries (`generate_series` + `LEFT JOIN`).
3. "Streaks": find users who created notes on 2 or more **consecutive** days. (Hint: distinct days per user, then `day - row_number() * interval '1 day'` is constant within a streak.)
4. Write the top-2 tags per user by how many of their notes use them (ties broken by tag name).
5. Run `EXPLAIN ANALYZE` on Ex 8 written with `NOT EXISTS` and with `LEFT JOIN ... IS NULL`. Are the plans the same? (On 12 rows the numbers mean little; look at the plan shape.)
6. Do 10 easy and 5 medium SQL questions on a practice site (LeetCode's SQL 50 list, or DataLemur), Postgres dialect. Log which patterns from section 9 each one used.

## Interview questions

<details>
<summary><b>1) WHERE vs HAVING?</b></summary>

`WHERE` filters individual rows before grouping and can't use aggregates; `HAVING` filters groups after aggregation and can. Push every condition you can into `WHERE`, so fewer rows get grouped.

</details>

<details>
<summary><b>2) INNER vs LEFT JOIN, and a common LEFT JOIN mistake?</b></summary>

An inner join keeps only matching pairs; a left join keeps every left row and fills right columns with NULL when nothing matches. The classic mistake is filtering the right table in `WHERE`, which removes the NULL rows and quietly turns it into an inner join. Conditions that should only limit what matches go in `ON`. Also count a right-side column (`count(n.id)`), not `count(*)`, so unmatched rows count as 0.

</details>

<details>
<summary><b>3) How do you get the top N rows per group?</b></summary>

Number rows within each group with `row_number() OVER (PARTITION BY group ORDER BY metric DESC)` in a subquery or CTE, then filter `rn <= N` outside it (window results can't be filtered in the same `WHERE`). Use `rank()`/`dense_rank()` if ties should share a position. In Postgres, `DISTINCT ON` is a shortcut for top-1. `LATERAL` joins with `LIMIT` are another option when an index supports it.

</details>

<details>
<summary><b>4) Why can <code>NOT IN</code> return no rows, and what do you use instead?</b></summary>

If the subquery returns any NULL, `x NOT IN (...)` becomes `... AND x <> NULL`, which is unknown, so no row passes. Use `NOT EXISTS` with a correlated subquery (or a `LEFT JOIN ... WHERE right.key IS NULL`), which handles NULLs correctly and is usually planned as an efficient anti-join.

</details>

<details>
<summary><b>5) Your dashboard shows counts that are too high after adding a join. What happened?</b></summary>

Fan-out: joining two one-to-many relations from the same parent multiplies rows (4 notes × 3 summaries = 12 rows per user), so aggregates over-count. Aggregate each child table separately (in subqueries or CTEs) and join the aggregated results, or use `count(DISTINCT ...)` for pure counts, which is still wasteful and wrong for sums and averages.

</details>

<details>
<summary><b>6) Window functions vs GROUP BY?</b></summary>

`GROUP BY` collapses rows into one per group. Window functions compute over a set of related rows but keep every row, adding the result as a column. That enables rankings, running totals, moving averages, previous/next row comparisons and shares of a total without self-joins. `PARTITION BY` defines the groups, `ORDER BY` the order within them, and the frame which rows count for each row.

</details>

## Done when

- [ ] The practice schema loads and I know the `psql` commands from section 1.
- [ ] I solved all 36 exercises **before** opening the answers, and re-did the ones I got wrong.
- [ ] I can explain the logical evaluation order and use it to explain why an alias can't be used in `WHERE`.
- [ ] I hit, and can explain, the three silent traps: LEFT JOIN + WHERE (Ex 12), `NOT IN` + NULL (Ex 24), fan-out (Ex 19).
- [ ] I can write top-N-per-group, find/delete duplicates and a running total from memory.
- [ ] I did practice task 1 on my real NoteMind tables.
- [ ] I answered interview questions 2, 3 and 5 aloud without notes.

## Reading

- PostgreSQL tutorial (queries, joins, aggregates): https://www.postgresql.org/docs/current/tutorial-sql.html
- Window functions tutorial: https://www.postgresql.org/docs/current/tutorial-window.html
- Aggregate functions (incl. `FILTER`, `percentile_cont`): https://www.postgresql.org/docs/current/functions-aggregate.html
- Date/time functions: https://www.postgresql.org/docs/current/functions-datetime.html
- `WITH` queries (CTEs): https://www.postgresql.org/docs/current/queries-with.html
- psql reference: https://www.postgresql.org/docs/current/app-psql.html
- SQLAlchemy select and window functions: https://docs.sqlalchemy.org/en/20/tutorial/data_select.html
- Practice: LeetCode "SQL 50" study plan, DataLemur SQL questions
