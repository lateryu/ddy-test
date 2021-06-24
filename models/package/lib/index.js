"use strict";

const pkgDir = require("pkg-dir").sync;
const path = require("path");
const npminstall = require("npminstall");
const fes = require("fs-extra");
const pathExists = require("path-exists").sync;
const formatPath = require("@ddy-test/format-path"); // 兼容(macOS/windows)路径

const {
  getDefaultRegistry,
  getNpmLatestVersion,
} = require("@ddy-test/get-npm-info");
const { isObject } = require("@ddy-test/utils");

class Package {
  constructor(ops) {
    if (!ops) {
      throw new Error("package类的ops参数不能为空");
    }
    if (!isObject(ops)) {
      throw new Error("package类的ops参数必须是一个Object类型");
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
    this.cacheFilePathPrefix = this.packageName.replace("/", "_");
  }

  //
  async prepare() {
    if (this.storeDir && !pathExists(this.storeDir)) {
      fes.mkdirpSync(this.storeDir); //  fes.mkdirpSync创建所有目录
    }
    // 将latest转成最终版本号
    if (this.packageVersion === "latest") {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  /**
   *
   * _@ddy-test_init@1.2.2@@ddy-test/
   * @ddy-test/init 1.2.2
   *
   * @returns {string}
   */
  get cacheFilePath() {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    );
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

  // 生成指定版本的路径
  gerSpecificCacheFilePath(packageVersion) {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`
    );
  }

  // 安装package
  async install() {
    await this.prepare();
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [
        {
          name: this.packageName,
          version: this.packageVersion,
        },
      ],
    });
  }

  // 更新package
  async update() {
    await this.prepare();
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    // 查询最新的版本号对应的路径是否存存在
    const latestFilePath = this.gerSpecificCacheFilePath(latestPackageVersion);
    console.log(latestPackageVersion, "22222");
    console.log(pathExists(latestFilePath), "11111");
    console.log(latestFilePath, "latestFilePath");
    // 若果不存在, 则直接安装最新版本
    if (!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [
          {
            name: this.packageName,
            version: latestPackageVersion,
          },
        ],
      });
      // 更新最新版本号
      this.packageVersion = latestPackageVersion;
    } else {
      this.packageVersion = latestPackageVersion;
    }
  }

  // 获取入口文件的路径
  getRootFilePath() {
    function _getRootFilePath(targetPath) {
      // 1. 获取package.json所在路径  - pkg-dir
      const dir = pkgDir(targetPath);
      if (dir) {
        // 2. 读取package.json - require()
        const pkgFile = require(path.resolve(dir, "package.json"));
        // 3. 需找main/lib,
        if (pkgFile && pkgFile.main) {
          // 4. 路径兼容(macOS/windows)
          //  获取入口文件
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }
    // 缓存是否存在
    if (this.storeDir) {
      return _getRootFilePath(this.cacheFilePath);
    } else {
      return _getRootFilePath(this.targetPath);
    }
  }
}

module.exports = Package;
