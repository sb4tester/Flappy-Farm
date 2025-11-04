#!/bin/bash

echo "🔧 เริ่มติดตั้ง Nginx และ Let's Encrypt SSL สำหรับ https://api.flappyfarm.com"

# 1. ติดตั้ง nginx หากยังไม่มี
if ! command -v nginx &> /dev/null
then
  echo "📦 ติดตั้ง nginx..."
  sudo apt update
  sudo apt install -y nginx
fi

# 2. ติดตั้ง Certbot (Let's Encrypt)
echo "📦 ติดตั้ง Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# 3. ตั้งค่า nginx เบื้องต้นให้ reverse proxy ไป localhost:5000
echo "🛠️ เขียนไฟล์ /etc/nginx/sites-available/default"
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

# 4. Reload Nginx ก่อนขอ cert
echo "🔁 Reload Nginx..."
sudo systemctl reload nginx

# 5. ขอ SSL certificate
echo "🔐 ขอ SSL certificate จาก Let's Encrypt..."
sudo certbot --nginx -d api.flappyfarm.com --non-interactive --agree-tos -m dongngansoft@gmail.com

# 6. ตั้ง cron job สำหรับ renew cert อัตโนมัติ
echo "📅 ตั้ง cron สำหรับ renew SSL ทุกวัน"
sudo crontab -l | { cat; echo "0 3 * * * certbot renew --quiet"; } | sudo crontab -

echo "✅ เสร็จสมบูรณ์! ทดลองเปิด https://api.flappyfarm.com"
