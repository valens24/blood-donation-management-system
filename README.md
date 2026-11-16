# Blood Donation Management System

A full-stack academic demonstration project for registering donor records, recording blood requests, and maintaining sample blood-inventory values.

## Technology

- Frontend: HTML, CSS and JavaScript
- Backend: Node.js, Express and mysql2
- Database: MySQL (XAMPP)
- Development tools: Visual Studio Code, Git and GitHub

## Project structure

```text
blood-donation-management-system/
├── backend/
│   ├── db.js
│   └── server.js
├── database/
│   └── schema.sql
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Requirements

1. Install Node.js (LTS) and Visual Studio Code.
2. Install XAMPP and start **MySQL** from the XAMPP Control Panel.
3. Ensure the MySQL port in XAMPP is `3306`, or update `DB_PORT` in `.env`.
4. If another MySQL server is already using port `3306`, stop it or change one server's port. Do not run two MySQL servers on the same port.

## Database setup with XAMPP

1. Open XAMPP Control Panel and start MySQL.
2. Open `http://localhost/phpmyadmin`.
3. Select **Import**.
4. Choose `database/schema.sql` from this project.
5. Click **Import** / **Go** and wait for the success message.

The SQL script creates `blood_donation_db`, four tables, the eight blood groups, and initial zero-value inventory rows.

### Database credentials

The supplied `.env.example` assumes the common local XAMPP configuration:

- Host: `localhost`
- Port: `3306`
- User: `root`
- Password: empty

If your XAMPP MySQL root account has a password, enter it in `.env`.

## Run in Visual Studio Code

1. Extract the project ZIP.
2. Open the extracted `blood-donation-management-system` folder in VS Code.
3. Open the VS Code terminal: **Terminal → New Terminal**.
4. In the project root, install dependencies:

```bash
npm install
```

5. Copy `.env.example` to `.env`.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

On Linux / WSL:

```bash
cp .env.example .env
```

6. Check `.env` and adjust the database settings if needed.
7. Start the application:

```bash
npm run dev
```

8. Open `http://localhost:3000` in your browser.

The Express server serves the frontend and API from the same origin, so you do not need to run a separate frontend server.

## Main features

- Dashboard summary: donor count, request count, pending requests, and recorded inventory units.
- Donor registration, donor list, and donor deletion.
- Blood request submission and request-status updates.
- Inventory values for A+, A-, B+, B-, AB+, AB-, O+ and O-.
- API health check at `http://localhost:3000/api/health`.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check API and database |
| GET | `/api/stats` | Dashboard totals |
| GET | `/api/blood-groups` | List blood groups |
| GET | `/api/donors` | List donors |
| POST | `/api/donors` | Register donor |
| DELETE | `/api/donors/:id` | Delete donor |
| GET | `/api/requests` | List blood requests |
| POST | `/api/requests` | Submit a request |
| PATCH | `/api/requests/:id/status` | Update request status |
| GET | `/api/inventory` | View inventory |
| PATCH | `/api/inventory/:group` | Set inventory units |

## Push to GitHub

Create an empty repository on GitHub. Then, from the project root:

```bash
git init
git add .
git commit -m "Initial blood donation management system"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your own GitHub repository URL. The `.gitignore` excludes `.env` and `node_modules`, so do not commit database passwords.

## Troubleshooting

### `ECONNREFUSED` or database connection error

- Confirm MySQL is running in XAMPP.
- Check that the database import succeeded.
- Check host, port, username and password in `.env`.
- Confirm no other MySQL service is occupying the configured port.

### `ER_ACCESS_DENIED_ERROR`

The username or password in `.env` does not match your XAMPP MySQL account.

### Port 3000 is already in use

Change `PORT=3000` in `.env` to another free port, such as `3001`, then restart the server.

### Changes do not appear in the browser

Refresh the page. If you changed frontend JavaScript or CSS, use a hard refresh (`Ctrl + F5`).

## Important academic and safety limitation

This is a software-development demonstration, not a certified blood-bank, clinical, or medical system. It does not verify donor eligibility, blood typing, compatibility, screening, storage conditions, or clinical availability. Inventory figures are manually entered sample records and must not be used for medical or transfusion decisions. Do not enter real patient or donor information unless you have the necessary authorization, consent, and data-protection safeguards.
