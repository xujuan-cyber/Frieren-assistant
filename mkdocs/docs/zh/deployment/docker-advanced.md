# Docker高级配置

本指南介绍 Prompt Optimizer 的Docker高级部署配置，包括多服务架构、HTTPS安全配置和监控日志管理。

## 📦 Docker Compose 高级架构

### 多服务配置

包含缓存、反向代理和SSL的完整生产级配置：

```yaml
version: '3.8'

services:
  prompt-optimizer:
    image: linshen/prompt-optimizer:latest
    container_name: prompt-optimizer
    restart: unless-stopped
    environment:
      - VITE_OPENAI_API_KEY=${OPENAI_API_KEY}
      - VITE_GEMINI_API_KEY=${GEMINI_API_KEY}
      - ACCESS_PASSWORD=${ACCESS_PASSWORD}
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
    networks:
      - prompt-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: prompt-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - prompt-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: prompt-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - prompt-optimizer
    networks:
      - prompt-network
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

  # 可选：Watchtower自动更新
  watchtower:
    image: containrrr/watchtower
    container_name: prompt-watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=3600
      - WATCHTOWER_INCLUDE_STOPPED=true
    command: prompt-optimizer prompt-redis prompt-nginx

volumes:
  redis_data:
    driver: local

networks:
  prompt-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 高级环境配置

扩展的 `.env` 文件：

```env
# API Keys
OPENAI_API_KEY=sk-your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
DEEPSEEK_API_KEY=your-deepseek-key

# Access Control
ACCESS_USERNAME=admin
ACCESS_PASSWORD=your_very_secure_password
JWT_SECRET=your-random-jwt-secret-key-min-32-chars

# Redis Configuration
REDIS_PASSWORD=your_redis_password

# SSL Configuration
SSL_DOMAIN=yourdomain.com
SSL_EMAIL=admin@yourdomain.com

# MCP Advanced Configuration
MCP_DEFAULT_MODEL_PROVIDER=openai
MCP_LOG_LEVEL=info
MCP_RATE_LIMIT=100
MCP_TIMEOUT=30000

# Custom Models
VITE_CUSTOM_API_KEY_ollama=dummy_key
VITE_CUSTOM_API_BASE_URL_ollama=http://host.docker.internal:11434/v1
VITE_CUSTOM_API_MODEL_ollama=qwen2.5:7b

# Performance Settings
NODE_ENV=production
LOG_LEVEL=info
CACHE_TTL=3600
```

## 🔒 HTTPS和SSL配置

### Nginx反向代理配置

创建 `nginx.conf` 文件：

```nginx
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';
    
    access_log /var/log/nginx/access.log main;
    error_log  /var/log/nginx/error.log warn;
    
    # 性能优化
    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml+rss;
    
    # 上游服务器
    upstream prompt-optimizer {
        server prompt-optimizer:80;
        keepalive 32;
    }
    
    # HTTP服务器 - 重定向到HTTPS
    server {
        listen 80;
        server_name ${SSL_DOMAIN} www.${SSL_DOMAIN};
        
        # Let's Encrypt验证路径
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        # 所有其他请求重定向到HTTPS
        location / {
            return 301 https://$server_name$request_uri;
        }
    }
    
    # HTTPS服务器
    server {
        listen 443 ssl http2;
        server_name ${SSL_DOMAIN} www.${SSL_DOMAIN};
        
        # SSL证书配置
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # SSL安全配置
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # HSTS安全头
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
        
        # 主应用代理
        location / {
            proxy_pass http://prompt-optimizer;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # 超时配置
            proxy_connect_timeout       60s;
            proxy_send_timeout          60s;
            proxy_read_timeout          60s;
        }
        
        # MCP服务器路径
        location /mcp {
            proxy_pass http://prompt-optimizer/mcp;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket支持（如果MCP使用WebSocket）
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
        
        # 健康检查端点
        location /health {
            access_log off;
            proxy_pass http://prompt-optimizer/health;
            proxy_set_header Host $host;
        }
        
        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://prompt-optimizer;
            proxy_set_header Host $host;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### Let's Encrypt自动SSL证书

#### 使用Certbot获取证书

```bash
# 安装certbot
sudo apt update && sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 测试自动续期
sudo certbot renew --dry-run
```

#### Docker Compose集成Certbot

```yaml
  certbot:
    image: certbot/certbot
    container_name: prompt-certbot
    volumes:
      - ./ssl:/etc/letsencrypt
      - ./certbot-www:/var/www/certbot
    command: >-
      sh -c "
        certbot certonly --webroot 
        -w /var/www/certbot 
        -d ${SSL_DOMAIN} 
        -d www.${SSL_DOMAIN}
        --email ${SSL_EMAIL} 
        --agree-tos 
        --no-eff-email
      "
    depends_on:
      - nginx
    networks:
      - prompt-network
```

#### 自动续期脚本

```bash
#!/bin/bash
# ssl-renew.sh

cd /path/to/your/docker-compose
docker compose run --rm certbot certbot renew
docker compose exec nginx nginx -s reload

echo "SSL证书续期完成: $(date)"
```

设置定时任务：
```bash
# 每月1日凌晨2点执行续期
0 2 1 * * /path/to/ssl-renew.sh >> /var/log/ssl-renew.log 2>&1
```

## 🛡️ 安全配置

### 防火墙配置

#### UFW配置（Ubuntu/Debian）

```bash
# 重置防火墙规则
sudo ufw --force reset

# 默认策略：拒绝入站，允许出站
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许SSH（修改为您的SSH端口）
sudo ufw allow 22/tcp

# 允许HTTP和HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许自定义端口（如果不使用nginx）
# sudo ufw allow 8081/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status verbose
```

#### iptables高级规则

```bash
#!/bin/bash
# firewall-rules.sh

# 清空现有规则
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X

# 设置默认策略
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# 允许回环接口
iptables -A INPUT -i lo -j ACCEPT

# 允许已建立的连接
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# 允许SSH（修改为您的SSH端口）
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 允许HTTP和HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 限制连接频率（防止暴力攻击）
iptables -A INPUT -p tcp --dport 80 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT

# 阻止无效数据包
iptables -A INPUT -m state --state INVALID -j DROP

# 保存规则
iptables-save > /etc/iptables/rules.v4

echo "防火墙规则配置完成"
```

### Docker安全最佳实践

#### 非root用户运行

```dockerfile
# 在Dockerfile中创建非root用户
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

USER appuser
```

```bash
# 或在运行时指定用户
docker run --user 1001:1001 -d -p 8081:80 linshen/prompt-optimizer
```

#### 只读文件系统

```yaml
services:
  prompt-optimizer:
    image: linshen/prompt-optimizer:latest
    read_only: true
    tmpfs:
      - /tmp
      - /var/cache/nginx
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETUID
      - SETGID
```

## 📊 监控和日志管理

### 日志配置

#### 高级日志配置

```yaml
services:
  prompt-optimizer:
    image: linshen/prompt-optimizer:latest
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "10"
        labels: "service=prompt-optimizer"
    environment:
      - LOG_LEVEL=info
      - LOG_FORMAT=json
```

#### 集中化日志管理

使用ELK Stack进行日志聚合：

```yaml
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    container_name: prompt-elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - prompt-network

  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    container_name: prompt-logstash
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch
    networks:
      - prompt-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    container_name: prompt-kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    networks:
      - prompt-network
```

### 健康检查和监控

#### Prometheus监控配置

```yaml
  prometheus:
    image: prom/prometheus
    container_name: prompt-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    networks:
      - prompt-network

  grafana:
    image: grafana/grafana
    container_name: prompt-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - prompt-network
```

#### Prometheus配置文件

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prompt-optimizer'
    static_configs:
      - targets: ['prompt-optimizer:80']
    metrics_path: '/metrics'
    scrape_interval: 30s
    
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    metrics_path: '/nginx_status'
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### 备份和恢复策略

#### 自动化备份脚本

```bash
#!/bin/bash
# advanced-backup.sh

BACKUP_DIR="/backup/prompt-optimizer"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"

# 创建备份目录
mkdir -p $BACKUP_PATH

# 备份Docker配置
docker compose config > $BACKUP_PATH/docker-compose.yml
cp .env $BACKUP_PATH/.env
cp nginx.conf $BACKUP_PATH/nginx.conf

# 备份Redis数据
docker compose exec -T redis redis-cli BGSAVE
sleep 10
docker cp prompt-redis:/data/dump.rdb $BACKUP_PATH/redis-dump.rdb

# 备份SSL证书
cp -r ssl/ $BACKUP_PATH/

# 备份应用数据（如果有持久化卷）
docker compose exec -T prompt-optimizer tar czf - /app/data | cat > $BACKUP_PATH/app-data.tar.gz

# 创建备份元信息
cat > $BACKUP_PATH/backup-info.json << EOF
{
  "timestamp": "$DATE",
  "version": "$(docker compose exec -T prompt-optimizer cat /app/package.json | jq -r .version)",
  "services": $(docker compose ps --services | jq -R . | jq -s .),
  "backup_size": "$(du -sh $BACKUP_PATH | cut -f1)"
}
EOF

# 压缩备份
tar czf $BACKUP_DIR/prompt-optimizer-$DATE.tar.gz -C $BACKUP_DIR $DATE
rm -rf $BACKUP_PATH

# 清理旧备份（保留30天）
find $BACKUP_DIR -name "prompt-optimizer-*.tar.gz" -mtime +30 -delete

echo "备份完成: $BACKUP_DIR/prompt-optimizer-$DATE.tar.gz"
```

---

**相关链接**：
- [基础部署](docker-basic.md) - Docker单容器快速部署
- [故障排除](docker-troubleshooting.md) - 常见问题和性能优化