# Separate Student & Admin Portals - Quick Start

Now you have two completely separate portals on different ports!

## Option 1: Run Both Together (RECOMMENDED) ✅

Double-click: **`run-both.bat`**

This automatically starts:
- 📚 **Student Portal** on http://localhost:3000
- 👤 **Admin Portal** on http://localhost:3001

Both will run in separate windows with auto-reload enabled.

---

## Option 2: Run Individually

### Student Portal Only
```
Double-click: run-student.bat
or
node --watch student-server.js
```
Access at: **http://localhost:3000/student-login**
- Username: `jsmith`
- Password: `password123`

### Admin Portal Only
```
Double-click: run-admin.bat
or
node --watch admin-server.js
```
Access at: **http://localhost:3001/administrator-login**
- Username: `admin`
- Password: `password123`

---

## Port Configuration

| Portal | Port | Login URL | User |
|--------|------|-----------|------|
| Student | 3000 | http://localhost:3000/student-login | jsmith |
| Admin | 3001 | http://localhost:3001/administrator-login | admin |

---

## Features

✅ **Separate Ports** - No more confusion!  
✅ **Auto-Reload** - Changes save automatically  
✅ **Shared Database** - All data in one MongoDB  
✅ **Independent Servers** - Each portal runs separately  

---

## Troubleshooting

**Still getting PowerShell execution error?**
Use Command Prompt instead:
```cmd
cd c:\Users\abdur\Desktop\slms\slms
node --watch student-server.js
node --watch admin-server.js
```

**Ports already in use?**
Edit the port numbers in:
- `student-server.js` (change `port = 3000`)
- `admin-server.js` (change `port = 3001`)

**MongoDB not connecting?**
Make sure MongoDB is running:
```cmd
net start MongoDB
```

---

**All data is saved to MongoDB automatically!** 🎉
