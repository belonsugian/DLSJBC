# DLSJBC Grade Management System — MySQL + PHP Setup (XAMPP)

Your app previously stored everything (users, students, grades) in the browser's
`localStorage`, which only lives on one browser and is lost if cleared. This
version stores everything in a real MySQL database, with PHP handling all
reads/writes. The HTML and CSS are unchanged — only `dlsjbc.js` was updated
to call the PHP API instead of `localStorage`.

## 1. Copy the folder into XAMPP

Copy this whole `dlsjbc` folder into your XAMPP `htdocs` directory, e.g.:

- Windows: `C:\xampp\htdocs\dlsjbc`
- macOS: `/Applications/XAMPP/htdocs/dlsjbc`
- Linux: `/opt/lampp/htdocs/dlsjbc`

Folder structure:
```
dlsjbc/
├── dlsjbc.html
├── dlsjbc.css
├── dlsjbc.js
├── config.php
├── schema.sql
└── api/
    ├── auth.php
    ├── students.php
    └── users.php
```

## 2. Start Apache and MySQL

Open the **XAMPP Control Panel** and click **Start** next to both **Apache**
and **MySQL**.

## 3. Create the database

1. Go to **http://localhost/phpmyadmin**
2. Click **Import** (top menu)
3. Choose the file **schema.sql** from this folder
4. Click **Go**

This creates the `dlsjbc_db` database with two tables (`students`, `users`)
plus a `password_resets` table, and seeds it with the same sample students
your app used to ship with, plus a default admin account:
- **Username:** `admin`
- **Password:** `123`

## 4. Check the database credentials

`config.php` assumes the standard XAMPP MySQL login (`root`, no password). If
you changed your MySQL root password, update these two lines in `config.php`:

```php
$DB_USER = 'root';
$DB_PASS = '';
```

## 5. Open the app

Go to **http://localhost/dlsjbc/dlsjbc.html**

Everything (login, sign up, adding students, editing grades, admin approvals,
password reset) now reads and writes to MySQL instead of the browser.

## How the pieces fit together

- **`schema.sql`** — creates the database and tables, and seeds sample data.
- **`config.php`** — the single place holding your DB connection details.
- **`api/auth.php`** — login, student/teacher sign-up, forgot-password flow.
- **`api/students.php`** — list / add / delete students, update a single grade.
- **`api/users.php`** — admin panel: list/add/approve/delete accounts, change
  passwords, create admin/teacher accounts.
- **`dlsjbc.js`** — same functions and element IDs as before; instead of
  reading/writing `localStorage`, it calls the endpoints above using `fetch`.

## Notes / things worth knowing

- Passwords are stored **hashed** (PHP's `password_hash`), not in plain text
  like the old `localStorage` version — this is safer even for a school
  project.
- The "Forgot Password" flow is still a **demo**: instead of emailing the
  6-digit code, it's shown directly in an alert box (same behavior as the
  original app). To actually send emails you'd need to add PHP's `mail()` or
  a mail library like PHPMailer — happy to add that if you want it.
- Deleting a student also deletes their linked login account, matching the
  original app's behavior.
- If something doesn't load, open your browser's DevTools → Console/Network
  tab; PHP errors will show up as JSON error messages from the API.
