const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Database Sementara di Memori Server (Akan ter-reset jika server mati)
// Untuk produksi nyata, bagian ini bisa diganti dengan MongoDB/MySQL
let accounts = [];
let tasks = {}; // Format: { teacher_username: [ tasks ] }
let checkedTasks = {}; // Format: { student_username: [ task_ids ] }

// --- ENDPOINT AUTHENTICATION ---
app.post('/api/register', (req, res) => {
    const { fullName, username, email, password, role } = req.body;
    const exist = accounts.find(acc => acc.username === username || acc.email === email);
    if (exist) {
        return res.status(400).json({ message: "Username atau email sudah digunakan!" });
    }
    accounts.push({ fullName, username, email, password, role });
    res.json({ message: "Register berhasil!" });
});

app.post('/api/login', (req, res) => {
    const { loginUser, loginPass } = req.body;
    const foundUser = accounts.find(acc => 
        (acc.username === loginUser || acc.email === loginUser) && acc.password === loginPass
    );
    if (!foundUser) {
        return res.status(400).json({ message: "Akun tidak ditemukan atau password salah!" });
    }
    res.json({ user: foundUser });
});

// --- ENDPOINT TUGAS (TASKS) ---
app.get('/api/tasks', (req, res) => {
    res.json({ tasks, checkedTasks });
});

app.post('/api/tasks', (req, res) => {
    const { subject, taskText, deadline, teacherUsername } = req.body;
    if (!tasks[teacherUsername]) tasks[teacherUsername] = [];

    const generateRandomPassword = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
        let password = "";
        for (let i = 0; i < 6; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
        return password;
    };

    const newTask = {
        id: Date.now(),
        subject,
        task: taskText,
        deadline,
        teacher: teacherUsername,
        currentPassword: generateRandomPassword()
    };

    tasks[teacherUsername].push(newTask);
    res.json({ message: "Tugas berhasil ditambahkan!", tasks, checkedTasks });
});

app.put('/api/tasks/edit', (req, res) => {
    const { id, subject, taskText, deadline, teacherUsername } = req.body;
    if (tasks[teacherUsername]) {
        tasks[teacherUsername] = tasks[teacherUsername].map(t => 
            t.id === id ? { ...t, subject, task: taskText, deadline } : t
        );
    }
    res.json({ message: "Tugas berhasil diubah!", tasks, checkedTasks });
});

app.delete('/api/tasks/:teacherUsername/:id', (req, res) => {
    const { teacherUsername, id } = req.params;
    const taskId = parseInt(id);
    if (tasks[teacherUsername]) {
        tasks[teacherUsername] = tasks[teacherUsername].filter(t => t.id !== taskId);
    }
    // Hapus juga status ceklis murid jika ada
    Object.keys(checkedTasks).forEach(student => {
        checkedTasks[student] = checkedTasks[student].filter(tid => tid !== taskId);
    });
    res.json({ message: "Tugas berhasil dihapus!", tasks, checkedTasks });
});

// --- ENDPOINT VERIFIKASI TOKEN ---
app.post('/api/tasks/verify', (req, res) => {
    const { taskId, teacherUsername, studentUsername, enteredPassword } = req.body;
    
    let targetTask = (tasks[teacherUsername] || []).find(t => t.id === taskId);
    if (!targetTask) return res.status(404).json({ message: "Data tugas tidak ditemukan!" });

    if (targetTask.currentPassword === enteredPassword.toUpperCase().trim()) {
        if (!checkedTasks[studentUsername]) checkedTasks[studentUsername] = [];
        if (!checkedTasks[studentUsername].includes(taskId)) checkedTasks[studentUsername].push(taskId);

        // Regenerate Token Baru agar tidak bisa dipakai murid lain
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let newPassword = "";
        for (let i = 0; i < 6; i++) newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        targetTask.currentPassword = newPassword;

        res.json({ message: "Token valid! Tugas selesai.", tasks, checkedTasks });
    } else {
        res.status(400).json({ message: "Token salah atau sudah kedaluwarsa!" });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
