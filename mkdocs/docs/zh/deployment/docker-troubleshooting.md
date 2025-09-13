# Docker故障排除

本指南提供 Prompt Optimizer Docker部署的常见问题解决方案、调试技巧和性能优化建议。

## 🔧 常见启动问题

### 容器启动失败

#### 检查容器状态

```bash
# 查看所有容器状态
docker ps -a

# 查看容器详细信息
docker inspect prompt-optimizer

# 查看容器启动日志
docker logs prompt-optimizer

# 实时查看日志
docker logs -f --tail 100 prompt-optimizer
```

#### 常见启动错误

**错误1：端口被占用**
```
Error starting userland proxy: listen tcp4 0.0.0.0:8081: bind: address already in use
```

解决方案：
```bash
# 查找占用端口的进程
netstat -tulpn | grep :8081
# 或使用 lsof
lsof -i :8081

# 停止占用进程或更换端口
docker run -d -p 3000:80 linshen/prompt-optimizer
```

**错误2：镜像拉取失败**
```
Error response from daemon: pull access denied for linshen/prompt-optimizer
```

解决方案：
```bash
# 使用国内镜像源
docker pull registry.cn-guangzhou.aliyuncs.com/prompt-optimizer/prompt-optimizer:latest

# 或配置Docker镜像加速器
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
EOF
sudo systemctl restart docker
```

**错误3：权限问题**
```
Got permission denied while trying to connect to the Docker daemon socket
```

解决方案：
```bash
# 将用户添加到docker组
sudo usermod -aG docker $USER
newgrp docker

# 或使用sudo运行
sudo docker run -d -p 8081:80 linshen/prompt-optimizer
```

### 网络连接问题

#### 容器网络诊断

```bash
# 测试容器内部网络
docker exec -it prompt-optimizer curl http://localhost:80

# 测试容器间通信（Docker Compose）
docker exec -it prompt-optimizer ping redis

# 测试外部网络连接
docker exec -it prompt-optimizer curl https://api.openai.com

# 检查DNS解析
docker exec -it prompt-optimizer nslookup google.com
```

#### 网络配置问题

**问题：无法访问外部API**
```bash
# 检查防火墙设置
sudo ufw status
sudo iptables -L

# 检查Docker网络配置
docker network ls
docker network inspect bridge
```

**问题：容器间无法通信**
```bash
# 检查自定义网络
docker network create prompt-network
docker run --network prompt-network -d linshen/prompt-optimizer

# 检查网络连通性
docker exec -it container1 ping container2
```

### 应用访问问题

#### HTTP访问异常

**问题：404 Not Found**
```bash
# 检查Nginx配置（如果使用）
docker exec -it prompt-nginx nginx -t

# 检查应用路由配置
docker exec -it prompt-optimizer cat /app/dist/index.html
```

**问题：502 Bad Gateway**
```bash
# 检查上游服务状态
docker exec -it prompt-nginx curl http://prompt-optimizer:80

# 检查Nginx配置文件
docker exec -it prompt-nginx cat /etc/nginx/nginx.conf
```

**问题：SSL证书错误**
```bash
# 检查证书有效性
openssl x509 -in ./ssl/cert.pem -text -noout

# 测试SSL连接
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

## 🐛 调试技巧

### 启用调试模式

#### 应用级调试

```bash
# 启用详细日志
docker run -d -p 8081:80 \
  -e NODE_ENV=development \
  -e DEBUG=true \
  -e LOG_LEVEL=debug \
  -e VITE_DEBUG=true \
  linshen/prompt-optimizer

# 查看调试日志
docker logs -f prompt-optimizer | grep -E "(ERROR|WARN|DEBUG)"
```

#### Docker Compose调试

```yaml
services:
  prompt-optimizer:
    image: linshen/prompt-optimizer:latest
    environment:
      - NODE_ENV=development
      - DEBUG=*
      - LOG_LEVEL=debug
    command: ["sh", "-c", "npm start -- --verbose"]
    # 或者进入调试模式
    # command: ["tail", "-f", "/dev/null"]
```

### 容器内部检查

#### 进入容器调试

```bash
# 进入运行中的容器
docker exec -it prompt-optimizer sh

# 检查文件系统
ls -la /app
cat /app/package.json

# 检查进程状态
ps aux
top

# 检查网络状态
netstat -tulpn
ss -tulpn
```

#### 文件和配置检查

```bash
# 检查环境变量
docker exec prompt-optimizer env | sort

# 检查配置文件
docker exec prompt-optimizer cat /app/config/default.json

# 检查日志文件
docker exec prompt-optimizer tail -f /var/log/app.log
```

### 性能诊断

#### 资源使用监控

```bash
# 实时监控容器资源使用
docker stats prompt-optimizer

# 查看详细资源使用情况
docker exec prompt-optimizer cat /proc/meminfo
docker exec prompt-optimizer cat /proc/cpuinfo
docker exec prompt-optimizer df -h
```

#### 性能分析工具

```bash
# 安装性能分析工具
docker exec -it prompt-optimizer apk add --no-cache htop iotop

# 使用htop查看进程
docker exec -it prompt-optimizer htop

# 分析磁盘I/O
docker exec -it prompt-optimizer iostat -x 1
```

## 🚀 性能优化

### 资源限制和优化

#### 内存优化

```bash
# 设置内存限制
docker run -d -p 8081:80 \
  --memory="1g" \
  --memory-swap="2g" \
  --oom-kill-disable=false \
  linshen/prompt-optimizer

# Docker Compose中设置
```yaml
services:
  prompt-optimizer:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

#### CPU优化

```bash
# 限制CPU使用
docker run -d -p 8081:80 \
  --cpus="2.0" \
  --cpu-shares=1024 \
  --cpu-quota=100000 \
  --cpu-period=50000 \
  linshen/prompt-optimizer
```

#### 存储优化

```yaml
services:
  prompt-optimizer:
    volumes:
      # 使用tmpfs减少磁盘I/O
      - type: tmpfs
        target: /tmp
        tmpfs:
          size: 100m
      # 使用绑定挂载优化日志写入
      - ./logs:/app/logs:delegated
```

### 缓存配置优化

#### Redis缓存优化

```yaml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru --save 60 1000
    sysctls:
      - net.core.somaxconn=65535
    ulimits:
      memlock:
        soft: -1
        hard: -1
```

#### 应用级缓存

```bash
# 启用应用缓存
docker run -d -p 8081:80 \
  -e ENABLE_CACHE=true \
  -e CACHE_TTL=3600 \
  -e CACHE_MAX_SIZE=1000 \
  linshen/prompt-optimizer
```

### Nginx性能优化

#### 优化配置

```nginx
# nginx.conf性能优化部分
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # 开启gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript;
    
    # 开启缓存
    proxy_cache_path /tmp/nginx_cache levels=1:2 keys_zone=app_cache:10m max_size=1g 
                     inactive=60m use_temp_path=off;
    
    # 连接池优化
    upstream prompt-optimizer {
        server prompt-optimizer:80;
        keepalive 32;
    }
    
    server {
        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            proxy_cache app_cache;
            proxy_cache_valid 200 1d;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## 📋 故障排查清单

### 快速诊断脚本

```bash
#!/bin/bash
# docker-diagnose.sh

echo "=== Prompt Optimizer Docker 诊断报告 ==="
echo "时间: $(date)"
echo

# 系统信息
echo "1. 系统信息:"
uname -a
echo "Docker版本: $(docker --version)"
echo "Docker Compose版本: $(docker compose version)"
echo

# 容器状态
echo "2. 容器状态:"
docker ps -a --filter name=prompt-optimizer
echo

# 网络检查
echo "3. 网络检查:"
netstat -tulpn | grep -E ":(80|443|8081|6379)" || echo "未发现相关端口监听"
echo

# 资源使用
echo "4. 资源使用:"
docker stats --no-stream prompt-optimizer 2>/dev/null || echo "容器未运行"
echo

# 最近日志
echo "5. 最近错误日志:"
docker logs --tail 20 prompt-optimizer 2>/dev/null | grep -i error || echo "无错误日志"
echo

# 健康检查
echo "6. 健康检查:"
if curl -sf http://localhost:8081/health >/dev/null 2>&1; then
    echo "✅ 应用健康检查通过"
else
    echo "❌ 应用健康检查失败"
fi

echo "=== 诊断完成 ==="
```

### 常见问题自助修复

#### 自动修复脚本

```bash
#!/bin/bash
# docker-auto-fix.sh

echo "正在进行自动修复..."

# 1. 停止并清理容器
echo "停止容器..."
docker compose down

# 2. 清理无用资源
echo "清理Docker资源..."
docker system prune -f
docker volume prune -f

# 3. 更新镜像
echo "更新镜像..."
docker compose pull

# 4. 重新启动
echo "重新启动服务..."
docker compose up -d

# 5. 等待服务就绪
echo "等待服务启动..."
sleep 30

# 6. 健康检查
if curl -sf http://localhost:8081/health >/dev/null 2>&1; then
    echo "✅ 修复成功，服务正常运行"
else
    echo "❌ 修复失败，请检查日志"
    docker compose logs --tail 50
fi
```

### 性能监控脚本

```bash
#!/bin/bash
# performance-monitor.sh

CONTAINER_NAME="prompt-optimizer"
LOG_FILE="/var/log/prompt-optimizer-performance.log"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 获取容器统计信息
    STATS=$(docker stats --no-stream --format "table {{.CPUPerc}},{{.MemUsage}},{{.NetIO}},{{.BlockIO}}" $CONTAINER_NAME 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "[$TIMESTAMP] $STATS" >> $LOG_FILE
        
        # 检查CPU使用率是否超过80%
        CPU_USAGE=$(echo $STATS | cut -d',' -f1 | sed 's/%//')
        if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
            echo "[$TIMESTAMP] WARNING: High CPU usage: $CPU_USAGE%" >> $LOG_FILE
        fi
    else
        echo "[$TIMESTAMP] ERROR: Container not found or not running" >> $LOG_FILE
    fi
    
    sleep 60
done
```

## 🆘 应急响应流程

### 服务不可用紧急处理

```bash
#!/bin/bash
# emergency-response.sh

echo "🚨 执行应急响应程序..."

# 1. 立即检查服务状态
if ! curl -sf http://localhost:8081/health >/dev/null 2>&1; then
    echo "❌ 服务不可用，开始应急处理"
    
    # 2. 快速重启
    docker compose restart prompt-optimizer
    sleep 30
    
    # 3. 再次检查
    if curl -sf http://localhost:8081/health >/dev/null 2>&1; then
        echo "✅ 快速重启成功"
        exit 0
    fi
    
    # 4. 完整重建
    echo "尝试完整重建..."
    docker compose down
    docker compose up -d
    sleep 60
    
    # 5. 最终检查
    if curl -sf http://localhost:8081/health >/dev/null 2>&1; then
        echo "✅ 完整重建成功"
    else
        echo "❌ 应急处理失败，需要人工介入"
        # 发送告警通知
        # echo "Prompt Optimizer服务异常" | mail -s "紧急告警" admin@example.com
    fi
else
    echo "✅ 服务正常运行"
fi
```

### 日志分析和告警

```bash
#!/bin/bash
# log-analysis.sh

LOG_FILE="/var/log/prompt-optimizer.log"
ALERT_FILE="/tmp/alerts.txt"

# 分析错误日志
docker logs prompt-optimizer --since="1h" | grep -i error > $ALERT_FILE

if [ -s $ALERT_FILE ]; then
    echo "发现错误日志："
    cat $ALERT_FILE
    
    # 分析错误类型并给出建议
    if grep -q "ECONNREFUSED" $ALERT_FILE; then
        echo "建议：检查网络连接和上游服务状态"
    fi
    
    if grep -q "out of memory" $ALERT_FILE; then
        echo "建议：增加内存限制或优化内存使用"
    fi
    
    if grep -q "permission denied" $ALERT_FILE; then
        echo "建议：检查文件权限和用户配置"
    fi
fi
```

---

**相关链接**：
- [基础部署](docker-basic.md) - Docker单容器快速部署
- [高级配置](docker-advanced.md) - Docker Compose高级配置和安全设置