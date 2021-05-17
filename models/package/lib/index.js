'use strict';

const { isObject } = require('@ddy-test/utils')
const pkgDir = require('pkg-dir').sync;
const path = require('path');
const npminstall = require('npminstall');
const fes = require('fs-extra');
const pathExists = require('path-exists').sync;
const formatPath = require('@ddy-test/format-path');
const { getDefaultRegistry, getNpmLatestVersion } = require('@ddy-test/get-npm-info');

class Package {
    constructor(ops) {
        if (!ops) {
            throw new Error('package类的ops参数不能为空');
        }
        if (!isObject(ops)) {
            throw new Error('package类的ops参数必须是一个Object类型');
        }
        // package 路径
        this.targetPath = ops.targetPath;

        // package 缓存路径
        this.storeDir = ops.storeDir;

        // package 的name
        this.packageName = ops.packageName;

        // package 的 version
        this.packageVersion = ops.packageVersion;

        // package缓存目录前缀
        this.cacheFilePathPrefix = this.packageName.replace('/','_');
    }

    async prepare() {
        if (this.storeDir && !pathExists(this.storeDir)) {
            fes.mkdirpSync(this.storeDir);
        }
        if (this.packageVersion === 'latest') {
            this.packageVersion = await getNpmLatestVersion(this.packageName);
        }
    }

    get cacheFilePath () {
        return path.resolve(this.storeDir,
            `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`);
    }

    // 判断当前package是否存在
    async exists() {
        if (this.storeDir) {
           await this.prepare();
           return pathExists(this.cacheFilePath);
        } else {
            return pathExists(this.targetPath);
        }
    }

    gerSpecificCacheFilePath (packageVersion) {
        return path.resolve(this.storeDir,
            `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`);
    }

    // 安装package
    async install() {
        await this.prepare();
        return npminstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getDefaultRegistry(),
            pkgs: [{
                    name: this.packageName,
                    version: this.packageVersion,
                }
            ]
        });
    }



    // 更新package
     async update() {
        await this.prepare();
        const latestPackageVersion = await getNpmLatestVersion(this.packageName);
        const latestFilePath =  this.gerSpecificCacheFilePath(newPackageVersion);
        if (!pathExists(latestFilePath)) {
           await npminstall({
                root: this.targetPath,
                storeDir: this.storeDir,
                registry: getDefaultRegistry(),
                pkgs: [{
                        name: this.packageName,
                        version: latestPackageVersion,
                    }
                ]
            });
            this.packageVersion = latestPackageVersion;
        } else {
            return latestFilePath;
        }
    }

    // 获取入口文件的路径
    getRootFilePath() {
        function _getRootFilePath(targetPath) {
            // 1. 获取package.json所在目录  - pkg-dir
            const dir = pkgDir(targetPath);
            // 2. 读取package.json - require()
            if(dir) {
                const pkgFile = require(path.resolve(dir, 'package.json'))
                // 3. 需找main/lib
                if (pkgFile && pkgFile.main ) {
                    // 4. 路径兼容(macOS/windows)
                    return formatPath(path.resolve(dir, pkgFile.main));
                }
            }
            return null;
        }
        if (this.storeDir) {
           return  _getRootFilePath(this.cacheFilePath);
        } else {
            return _getRootFilePath(this.targetPath);
        }
    }

}

module.exports = Package;

