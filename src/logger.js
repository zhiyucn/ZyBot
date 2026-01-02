/**
 * 日志管理模块
 * 提供统一的日志记录功能，支持不同日志级别和格式化输出
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logLevel = 'info'; // 默认日志级别：debug, info, warn, error
        this.logFile = null;
        this.logDir = path.join(process.cwd(), 'logs');
        
        // 确保日志目录存在
        this.ensureLogDir();
        
        // 日志级别对应的颜色
        this.colors = {
            debug: '\x1b[36m', // 青色
            info: '\x1b[32m',  // 绿色
            warn: '\x1b[33m',  // 黄色
            error: '\x1b[31m'  // 红色
        };
        
        this.resetColor = '\x1b[0m';
    }
    
    /**
     * 确保日志目录存在
     */
    ensureLogDir() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (error) {
            console.error('创建日志目录失败:', error.message);
        }
    }
    
    /**
     * 设置日志级别
     * @param {string} level - 日志级别：debug, info, warn, error
     */
    setLogLevel(level) {
        const validLevels = ['debug', 'info', 'warn', 'error'];
        if (validLevels.includes(level)) {
            this.logLevel = level;
        }
    }
    
    /**
     * 获取当前日期时间的格式化字符串
     * @returns {string} 格式化的日期时间字符串
     */
    getFormattedTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    }
    
    /**
     * 根据日志级别判断是否需要记录
     * @param {string} level - 要检查的日志级别
     * @returns {boolean} 是否需要记录该级别日志
     */
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }
    
    /**
     * 记录日志
     * @param {string} level - 日志级别
     * @param {string} message - 日志消息
     * @param {Object} [meta] - 附加元数据
     */
    log(level, message, meta = null) {
        if (!this.shouldLog(level)) {
            return;
        }
        
        const time = this.getFormattedTime();
        const color = this.colors[level] || this.colors.info;
        
        // 格式化日志消息
        let logMessage = `${color}[${time}] [${level.toUpperCase()}] ${message}${this.resetColor}`;
        
        // 如果有元数据，添加到日志中
        if (meta) {
            logMessage += ` ${JSON.stringify(meta)}`;
        }
        
        // 输出到控制台
        const consoleMethod = level === 'error' ? console.error : console.log;
        consoleMethod(logMessage);
        
        // 写入日志文件
        this.writeToFile(time, level, message, meta);
    }
    
    /**
     * 写入日志到文件
     * @param {string} time - 时间字符串
     * @param {string} level - 日志级别
     * @param {string} message - 日志消息
     * @param {Object} [meta] - 附加元数据
     */
    writeToFile(time, level, message, meta = null) {
        try {
            // 按日期创建日志文件
            const date = new Date().toISOString().split('T')[0];
            const logFilePath = path.join(this.logDir, `${date}.log`);
            
            // 格式化日志消息（无颜色）
            let logMessage = `[${time}] [${level.toUpperCase()}] ${message}`;
            
            if (meta) {
                logMessage += ` ${JSON.stringify(meta)}`;
            }
            logMessage += '\n';
            
            // 写入文件（追加模式）
            fs.appendFileSync(logFilePath, logMessage, 'utf8');
        } catch (error) {
            console.error('写入日志文件失败:', error.message);
        }
    }
    
    /**
     * 记录调试日志
     * @param {string} message - 日志消息
     * @param {Object} [meta] - 附加元数据
     */
    debug(message, meta = null) {
        this.log('debug', message, meta);
    }
    
    /**
     * 记录信息日志
     * @param {string} message - 日志消息
     * @param {Object} [meta] - 附加元数据
     */
    info(message, meta = null) {
        this.log('info', message, meta);
    }
    
    /**
     * 记录警告日志
     * @param {string} message - 日志消息
     * @param {Object} [meta] - 附加元数据
     */
    warn(message, meta = null) {
        this.log('warn', message, meta);
    }
    
    /**
     * 记录错误日志
     * @param {string} message - 日志消息
     * @param {Object} [meta] - 附加元数据
     */
    error(message, meta = null) {
        this.log('error', message, meta);
    }
}

// 创建并导出单例实例
module.exports = new Logger();
