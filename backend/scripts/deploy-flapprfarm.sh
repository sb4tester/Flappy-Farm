#!/bin/bash

echo "🚀 เริ่มต้นติดตั้ง FlappyFarm Backend..."

# 1. ไปที่ตำแหน่งโปรเจกต์
cd /var/www/html || exit

echo "📦 แตกไฟล์ flappyfarm-backend.zip..."
unzip -o flappyfarm-backend.zip -d api

cd api || exit

# 2. ติดตั้ง npm dependencies
echo "📥 ติดตั้ง npm packages..."
npm install

# 3. ติดตั้ง PM2 ถ้ายังไม่มี
if ! command -v pm2 &> /dev/null
then
    echo "⚙️ ติดตั้ง pm2..."
    npm install -g pm2
fi

# 4. Start ด้วย PM2
echo "🚦 เริ่มรัน backend ด้วย pm2..."
pm2 start app.js --name flappyfarm
pm2 save
pm2 startup

# 5. ติดตั้ง Nginx ถ้ายังไม่ได้ติดตั้ง
if ! command -v nginx &> /dev/null
then
    echo "🌐 ติดตั้ง Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# 6. ติดตั้ง Certbot + Nginx plugin
echo "🔒 ติดตั้ง Certbot สำหรับ HTTPS..."
sudo apt install -y certbot python3-certbot-nginx

# 7. ตั้งค่า reverse proxy (HTTP) ชั่วคราว
echo "🛠️ ตั้งค่า Nginx Reverse Proxy (HTTP ชั่วคราว)..."
sudo tee /etc/nginx/sites-available/default > /dev/null <<EOF
server {
    listen 80;
    server_name api.flappyfarm.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 8. Reload Nginx ก่อนขอ SSL
sudo systemctl reload nginx

# 9. ขอ SSL Certificate (ต้องใช้โดเมนที่ชี้มาที่ IP นี้แล้ว)
echo "🔑 ขอใบรับรอง SSL (Let's Encrypt)..."
sudo certbot --nginx -d api.flappyfarm.com --non-interactive --agree-tos -m dongngansoft@gmail.com

# 10. ตั้ง cron สำหรับ renew SSL
echo "📅 ตั้ง cron สำหรับ renew SSL อัตโนมัติ..."
sudo crontab -l | { cat; echo "0 0 * * * certbot renew --quiet"; } | sudo crontab -

echo "✅ เสร็จสมบูรณ์! ระบบออนไลน์แล้วที่: https://api.flappyfarm.com"
