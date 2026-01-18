/**
 * 权限管理系统
 * 每次权限检查时实时读取配置文件
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const toml = require('toml');

class PermissionManager {
    constructor() {
        this.configPath = path.join(process.cwd(), 'config/permissions.toml');
        this.permissions = this.loadConfigSync();
    }

    /**
     * 同步加载权限配置
     */
    loadConfigSync() {
        try {
            if (!fs.existsSync(this.configPath)) {
                logger.warn('权限配置文件不存在，使用默认配置');
                return {groups: {}, commands: {}, plugins: {}};
            }

            const config = fs.readFileSync(this.configPath, 'utf8');
            return toml.parse(config);
        } catch (error) {
            logger.error('加载权限配置失败:', { error: error.message });
            return {groups: {}, commands: {}, plugins: {}};
        }
    }

    /**
     * 异步从文件加载权限配置
     */
    async loadConfig() {
        try {
            if (!fs.existsSync(this.configPath)) {
                logger.warn('权限配置文件不存在，使用默认配置');
                this.permissions = {groups: {}, commands: {}, plugins: {}};
                return this.permissions;
            }

            const config = fs.readFileSync(this.configPath, 'utf8');
            this.permissions = toml.parse(config);
            return this.permissions;
        } catch (error) {
            logger.error('加载权限配置失败:', { error: error.message });
            this.permissions = {groups: {}, commands: {}, plugins: {}};
            return this.permissions;
        }
    }

    /**
     * 注册命令权限
     */
    registerCommandPermission(commandName, permissionGroup) {
        if (!this.permissions.commands) {
            this.permissions.commands = {};
        }
        this.permissions.commands[commandName] = permissionGroup;
    }

    /**
     * 获取所有权限组
     */
    getGroups() {
        return new Map(Object.entries(this.permissions.groups || {}));
    }

    /**
     * 获取自定义权限
     */
    getCustomPermissions() {
        return new Map(Object.entries(this.permissions.plugins || {}));
    }

    /**
     * 注册自定义权限
     */
    registerCustomPermission(pluginName, permissionName, permissionGroup) {
        if (!this.permissions.plugins) {
            this.permissions.plugins = {};
        }
        if (!this.permissions.plugins[pluginName]) {
            this.permissions.plugins[pluginName] = {};
        }
        this.permissions.plugins[pluginName][permissionName] = permissionGroup;
    }

    /**
     * 检查用户是否有执行命令的权限
     */
    async checkCommandPermission(username, command) {
        const requiredGroup = this.permissions.commands?.[command];
        
        if (!requiredGroup) {
            logger.debug(`命令 ${command} 没有权限限制，默认允许`);
            return true;
        }

        return this._checkGroupPermission(username, requiredGroup, this.permissions.groups);
    }

    /**
     * 检查用户是否有自定义权限
     */
    async checkCustomPermission(username, pluginName, permission) {
        const requiredGroup = this.permissions.plugins?.[pluginName]?.[permission];
        
        if (!requiredGroup) {
            logger.debug(`权限 ${pluginName}.${permission} 没有限制，默认允许`);
            return true;
        }

        return this._checkGroupPermission(username, requiredGroup, this.permissions.groups);
    }

    /**
     * 检查用户是否在权限组中
     */
    async _checkGroupPermission(username, groupName, groups) {
        // 获取所有组，反向查找用户所在的组
        for (const [currentGroupName, currentGroup] of Object.entries(groups)) {
            // 检查用户是否在当前组或当前组包含*通配符
            if (currentGroup.users?.includes(username) || currentGroup.users?.includes('*')) {
                // 如果当前组就是目标组，直接返回true
                if (currentGroupName === groupName) {
                    return true;
                }
                
                // 否则检查当前组是否直接或间接继承了目标组
                if (await this._checkGroupInheritance(currentGroupName, groupName, groups)) {
                    return true;
                }
            }
        }
        
        // 检查是否有任何组包含*通配符并继承了目标组
        for (const [currentGroupName, currentGroup] of Object.entries(groups)) {
            if (currentGroup.users?.includes('*')) {
                if (await this._checkGroupInheritance(currentGroupName, groupName, groups)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * 检查组是否直接或间接继承了目标组
     */
    async _checkGroupInheritance(groupName, targetGroup, groups) {
        const group = groups?.[groupName];
        if (!group) {
            return false;
        }
        
        // 检查直接继承
        if (group.inherits?.includes(targetGroup)) {
            return true;
        }
        
        // 检查间接继承
        if (group.inherits) {
            for (const parentGroup of group.inherits) {
                if (await this._checkGroupInheritance(parentGroup, targetGroup, groups)) {
                    return true;
                }
            }
        }
        
        return false;
    }
}

module.exports = PermissionManager;