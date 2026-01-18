/**
 * WebUI和WebSocket服务器
 * 负责HTTP静态文件服务和WebSocket实时通信
 */
const http = require('http');
const ws = require('ws');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class WebServer {
    constructor() {
        this.httpServer = null;
        this.wss = null;
        this.clients = new Set();
        this.bot = null;
    }

    /**
     * 启动Web服务器
     * @param {Object} bot - 机器人实例
     */
    start(bot) {
        return 0;
        this.bot = bot;
        
        // MIME类型映射
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.ico': 'image/x-icon',
            '.svg': 'image/svg+xml'
        };
        
        // 创建提供静态文件访问的HTTP服务器
        this.httpServer = http.createServer((req, res) => {
            const filePath = path.join(__dirname, '../static', req.url === '/' ? 'index.html' : req.url);
            
            // 获取文件扩展名
            const extname = path.extname(filePath);
            // 根据扩展名设置MIME类型，默认为text/plain
            const contentType = mimeTypes[extname] || 'text/plain';
            
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('404 Not Found');
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(data);
                }
            });
        });

        // 启动HTTP服务器，监听所有网络接口
        this.httpServer.listen(3000, '0.0.0.0', () => {
            logger.info('WebUI服务器已启动，访问地址: http://0.0.0.0:3000');
        });

        // 创建WebSocket服务器
        this.wss = new ws.WebSocketServer({ server: this.httpServer });

        // 处理WebSocket连接
        this.wss.on('connection', (client) => {
            logger.info('新的WebUI客户端连接');
            this.clients.add(client);
            
            // 发送初始状态
            client.send(JSON.stringify(this.bot.getStatus()));
            
            // 处理客户端断开连接
            client.on('close', () => {
                logger.info('WebUI客户端已断开连接');
                this.clients.delete(client);
            });
        });
    }

    /**
     * 向所有连接的客户端广播状态更新
     */
    broadcastStatus() {
        if (!this.bot) return;
        
        const status = this.bot.getStatus();
        const message = JSON.stringify(status);
        
        this.clients.forEach(client => {
            if (client.readyState === ws.WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    /**
     * 关闭Web服务器
     */
    close() {
        // 关闭WebSocket服务器
        if (this.wss) {
            this.wss.close();
        }
        
        // 关闭HTTP服务器
        if (this.httpServer) {
            this.httpServer.close();
        }
        
        // 清除客户端集合
        this.clients.clear();
        
        logger.info('Web服务器已关闭');
    }

    /**
     * 获取当前连接的客户端数量
     * @returns {number} 客户端数量
     */
    getClientCount() {
        return this.clients.size;
    }
}

module.exports = WebServer;