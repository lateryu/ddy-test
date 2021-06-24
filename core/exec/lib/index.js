"use strict";

const cp = require("child_process");
const path = require("path");
const Package = require("@ddy-test/package");
const log = require("@ddy-test/log");
const { exec: custonExec } = require("@ddy-test/utils");

// 可以是服务端根据用户登录信息获取
const SETTINGS = {
  init: "@ddy-test/init",
};
const CACHE_DIR = "dependencies";

async function exec() {
  /**?
   * 通过targetPath 生成 modulePath
   * 根据 modulePath生成 Package(npm 模块)
   * 根据Package提供的方法getRootFile获取入口文件生成相关依赖
   *
   * 根据 Package.update或Package.install安装相关依赖
   * @type {string}
   */
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  let storeDir = "";
  let pkg;
  log.verbose("targetPath", targetPath);
  log.verbose("homePath", homePath);
  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = "latest";

  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR); // 生成缓存目录
    storeDir = path.resolve(targetPath, "node_modules");
    log.verbose("targetPath", targetPath);
    log.verbose("storeDir", storeDir);
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
      storeDir,
    });
    if (await pkg.exists()) {
      // 更新package
      pkg.update();
    } else {
      // 安装package
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }
  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    try {
      // require(rootFile).call(null, Array.from(arguments));
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];
      const o = Object.create(null);
      // 筛选cmd对象
      Object.keys(cmd).forEach((key) => {
        if (
          cmd.hasOwnProperty(key) &&
          !key.startsWith("_") &&
          key !== "parent"
        ) {
          o[key] = cmd[key];
        }
      });
      args[args.length - 1] = o;
      const code = `require('${rootFile}').call(null,${JSON.stringify(args)} )`;

      // window cp.spawn('cmd', ['/c', 'node', '-e', code]); // /c表示静默执行
      const child = custonExec("node", ["-e", code], {
        // e表示执行代码
        cwd: process.cwd(),
        /**
         *  stdio默认pipe, inherit表示把子进程stdin stdout, stderr与父进程绑定,inherit不需要通过on再监听
         *  子进程的输出,  但是通过on,监听执行失败error, 和exit监听成功后的退出事件
         */
        stdio: "inherit",
      });
      child.on("error", (e) => {
        process.exit(1); // 1表示失败, 成功则是0
      });
      child.on("exit", (e) => {
        process.exit(e);
      });
    } catch (e) {
      log.error(e.message);
    }
  }
}

module.exports = exec;
