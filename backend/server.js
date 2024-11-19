const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// 数据文件路径
const TASKS_FILE = path.join(__dirname, 'data/tasks.json');
const ADMIN_PASSWORD = 'admin123';

// 确保数据文件存在
async function ensureDataFile() {
    try {
        await fs.access(TASKS_FILE);
    } catch {
        await fs.mkdir(path.dirname(TASKS_FILE), { recursive: true });
        await fs.writeFile(TASKS_FILE, '[]');
    }
}

// 验证管理员token
function verifyAdmin(req, res, next) {
    const token = req.headers['admin-token'];
    if (token === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: '未授权的访问' });
    }
}

// API路由
app.get('/api/tasks', async (req, res) => {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: '读取任务失败' });
    }
});

app.post('/api/tasks', verifyAdmin, async (req, res) => {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf8');
        const tasks = JSON.parse(data);
        
        // 确保日期格式正确
        const taskDate = new Date(req.body.date);
        if (isNaN(taskDate.getTime())) {
            return res.status(400).json({ error: '无效的日期格式' });
        }

        const newTask = {
            id: Date.now().toString(),
            title: req.body.title,
            date: req.body.date, // 保持原始日期字符串格式 'YYYY-MM-DD'
            description: req.body.description || ''
        };
        
        tasks.push(newTask);
        await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
        res.json(newTask);
    } catch (error) {
        console.error('添加任务失败:', error);
        res.status(500).json({ error: '添加任务失败' });
    }
});

app.delete('/api/tasks/:id', verifyAdmin, async (req, res) => {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf8');
        let tasks = JSON.parse(data);
        tasks = tasks.filter(task => task.id !== req.params.id);
        await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
        res.json({ message: '删除成功' });
    } catch (error) {
        res.status(500).json({ error: '删除任务失败' });
    }
});

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ token: ADMIN_PASSWORD });
    } else {
        res.status(401).json({ error: '密码错误' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await ensureDataFile();
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 