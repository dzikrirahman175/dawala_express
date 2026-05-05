console.log("🔥 SERVER TERBARU AKTIF 🔥");
const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5500;
const FILE = path.join(__dirname, 'data_kas.xlsx');
const FILE_WARGA = path.join(__dirname, 'data_warga.xlsx');
const FILE_PENGGUNA = path.join(__dirname, 'data_pengguna.xlsx');
const FILE_LOG = path.join(__dirname, 'data_log.xlsx');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const writeExcel = (filename, sheetName, data) => {
    try {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, filename);
    } catch (e) {
        console.error(`Gagal menulis ke ${filename}:`, e);
    }
};

const recordLog = (user, action, details) => {
    let logs = [];
    if (fs.existsSync(FILE_LOG)) {
        const wb = XLSX.readFile(FILE_LOG);
        logs = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    }
    logs.push({
        timestamp: new Date().toLocaleString('id-ID'),
        user: user || 'Unknown',
        action,
        details
    });
    writeExcel(FILE_LOG, 'Log', logs);
};

// ===== API: KAS =====
app.get('/data', (req, res) => {
    if (!fs.existsSync(FILE)) return res.json([]);
    const wb = XLSX.readFile(FILE);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { raw: false });
    res.json(data);
});

app.post('/tambah', (req, res) => {
    const { operator, ...newData } = req.body;
    let data = [];
    if (fs.existsSync(FILE)) {
        const wb = XLSX.readFile(FILE);
        const ws = wb.Sheets[wb.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(ws, { raw: false });
    }
    data.push(newData);
    writeExcel(FILE, 'Kas', data);
    recordLog(operator, 'Tambah Kas', `${newData.type}: ${newData.description}`);
    res.json({ status: 'ok' });
});

app.post('/edit', (req, res) => {
    const { operator, ...updatedData } = req.body;
    if (!fs.existsSync(FILE)) return res.status(404).json({ error: 'File tidak ditemukan' });
    const wb = XLSX.readFile(FILE);
    const ws = wb.Sheets[wb.SheetNames[0]];
    let data = XLSX.utils.sheet_to_json(ws, { raw: false });
    data = data.map(item => item.id === updatedData.id ? updatedData : item);
    writeExcel(FILE, 'Kas', data);
    recordLog(operator, 'Edit Kas', `ID: ${updatedData.id}`);
    res.json({ status: 'updated' });
});

app.post('/delete', (req, res) => {
    const { id, operator } = req.body;
    if (!fs.existsSync(FILE)) return res.status(404).json({ error: 'File tidak ditemukan' });
    const wb = XLSX.readFile(FILE);
    const ws = wb.Sheets[wb.SheetNames[0]];
    let data = XLSX.utils.sheet_to_json(ws, { raw: false });
    data = data.filter(item => item.id !== id);
    writeExcel(FILE, 'Kas', data);
    recordLog(operator, 'Hapus Kas', `ID: ${id}`);
    res.json({ status: 'deleted' });
});

// ===== API: WARGA =====
app.get('/warga', (req, res) => {
    if (!fs.existsSync(FILE_WARGA)) return res.json([]);
    const wb = XLSX.readFile(FILE_WARGA);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { raw: false });
    res.json(data);
});

app.post('/tambah-warga', (req, res) => {
    const { operator, ...newData } = req.body;
    let data = [];
    if (fs.existsSync(FILE_WARGA)) {
        const wb = XLSX.readFile(FILE_WARGA);
        const ws = wb.Sheets[wb.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(ws, { raw: false });
    }
    data.push(newData);
    writeExcel(FILE_WARGA, 'Warga', data);
    recordLog(operator, 'Tambah Warga', `${newData.nama} (${newData.nik})`);
    res.json({ status: 'ok' });
});

app.post('/hapus-warga', (req, res) => {
    const { nik, operator } = req.body;
    if (!fs.existsSync(FILE_WARGA)) return res.status(404).json({ error: 'File tidak ditemukan' });
    const wb = XLSX.readFile(FILE_WARGA);
    const ws = wb.Sheets[wb.SheetNames[0]];
    let data = XLSX.utils.sheet_to_json(ws, { raw: false });
    data = data.filter(w => w.nik !== nik);
    writeExcel(FILE_WARGA, 'Warga', data);
    recordLog(operator, 'Hapus Warga', `NIK: ${nik}`);
    res.json({ status: 'deleted' });
});

app.post('/edit-warga', (req, res) => {
    const { operator, oldNik, ...updatedData } = req.body;
    if (!fs.existsSync(FILE_WARGA)) return res.status(404).json({ error: 'File tidak ditemukan' });

    const wb = XLSX.readFile(FILE_WARGA);
    const ws = wb.Sheets[wb.SheetNames[0]];
    let data = XLSX.utils.sheet_to_json(ws, { raw: false });
    
    // Cari berdasarkan NIK lama untuk mendukung perubahan ke NIK baru
    const wargaIndex = data.findIndex(w => String(w.nik).trim() === String(oldNik).trim());
    
    if (wargaIndex !== -1) {
        data[wargaIndex] = updatedData; 
        writeExcel(FILE_WARGA, 'Warga', data);
        recordLog(operator, 'Edit Warga', `NIK: ${updatedData.nik} (Sebelumnya: ${oldNik})`);
        res.json({ status: 'updated' });
    } else {
        res.status(404).json({ error: 'Warga tidak ditemukan' });
    }
});

// ===== API: PENGGUNA =====
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!fs.existsSync(FILE_PENGGUNA)) return res.status(404).json({ error: 'Database tidak ditemukan' });
    const wb = XLSX.readFile(FILE_PENGGUNA);
    const users = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ status: 'ok', user: { username: user.username, role: user.role, rt: user.rt } });
    } else {
        res.status(401).json({ error: 'Username atau password salah' });
    }
});

app.get('/pengguna', (req, res) => {
    if (!fs.existsSync(FILE_PENGGUNA)) return res.json([]);
    const wb = XLSX.readFile(FILE_PENGGUNA);
    res.json(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
});

app.post('/tambah-pengguna', (req, res) => {
    let data = [];
    if (fs.existsSync(FILE_PENGGUNA)) {
        const wb = XLSX.readFile(FILE_PENGGUNA);
        data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    }
    data.push(req.body);
    writeExcel(FILE_PENGGUNA, 'Pengguna', data);
    res.json({ status: 'ok' });
});

app.post('/hapus-pengguna', (req, res) => {
    if (!fs.existsSync(FILE_PENGGUNA)) return res.status(404).json({ error: 'File tidak ditemukan' });
    const wb = XLSX.readFile(FILE_PENGGUNA);
    let data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    data = data.filter(u => u.username !== req.body.username);
    writeExcel(FILE_PENGGUNA, 'Pengguna', data);
    res.json({ status: 'deleted' });
});

// ===== API: DOWNLOAD =====
app.get('/download-warga', (req, res) => {
    const rtFilter = req.query.rt ? String(req.query.rt).trim().toUpperCase() : "";
    
    if (!fs.existsSync(FILE_WARGA)) {
        return res.status(404).json({ error: 'File data belum tersedia di server.' });
    }

    // Jika filter kosong atau "RW", kirim semua data
    if (!rtFilter || rtFilter === 'RW') {
        return res.download(FILE_WARGA, 'Data_Warga_Lengkap.xlsx');
    }

    // Menggunakan FILE_WARGA (bukan filePath)
    const wb = XLSX.readFile(FILE_WARGA);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { raw: false });
    
    const filteredData = data.filter(w => String(w.rt || '').trim().toUpperCase() === rtFilter);

    const newWb = XLSX.utils.book_new();
    const newWs = XLSX.utils.json_to_sheet(filteredData);
    XLSX.utils.book_append_sheet(newWb, newWs, 'Data Warga');

    const buffer = XLSX.write(newWb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', `attachment; filename="Data_Warga_${rtFilter.replace(/\s+/g, '_')}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

app.post('/update-password', (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    if (!fs.existsSync(FILE_PENGGUNA)) return res.status(404).json({ error: 'Database tidak ditemukan' });

    const wb = XLSX.readFile(FILE_PENGGUNA);
    let users = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    
    const userIndex = users.findIndex(u => u.username === username && u.password === currentPassword);
    
    if (userIndex !== -1) {
        users[userIndex].password = newPassword;
        writeExcel(FILE_PENGGUNA, 'Pengguna', users);
        
        recordLog(username, 'Update Sandi', 'Berhasil mengubah kata sandi');
        res.json({ status: 'ok' });
    } else {
        recordLog(username, 'Gagal Update Sandi', 'Upaya ubah sandi dengan kredensial salah');
        res.status(401).json({ error: 'Sandi saat ini salah' });
    }
});

// ===== API: LOGS =====
app.get('/logs', (req, res) => {
    if (!fs.existsSync(FILE_LOG)) return res.json([]);
    const wb = XLSX.readFile(FILE_LOG);
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    res.json(data.reverse());
});

app.listen(PORT, () => {
    console.log(`🚀 DAWALA Server berjalan di http://localhost:${PORT}/`);
});