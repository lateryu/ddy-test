"use strict";

var Command = require("@ddy-test/command");
const log = require("@ddy-test/log");
const path = require("path");
const ejs = require("ejs");
const glob = require("glob");

const inquirer = require("inquirer");
const userHome = require("user-home");
const fse = require("fs-extra");
const semver = require("semver");
const getProjectTemplate = require("./getProjectTemplate");
const Package = require("@ddy-test/Package");
const { spinnerStart, sleep, execAsync } = require("@ddy-test/utils");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom"; // 自定义模板

const WHITE_COMMAND = ["npm", "cnpm"]; // 白名单,避免执行危险操作

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }

  async exec() {
    try {
      // 准备阶段
      const projectInfo = await this.prepare();
      if (projectInfo) {
        log.verbose("projectInfo", projectInfo);
        this.projectInfo = projectInfo;
        // 下载模板
        await this.downloadTemplate();
        // 安装模板
        await this.installTemplate();
      }
    } catch (e) {
      // debug环境
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(e);
      }
      log.error(e.message);
    }
  }

  // 安装模板
  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安转
        await this.installCustomTemplate();
      } else {
        throw new Error("项目模板类型无法识别");
      }
    } else {
      throw new Error("项目模板信息不存在");
    }
  }

  // 检查命令
  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  async execCommand(command, errMsg) {
    let ret;
    if (command) {
      const cmds = command.split(" ");
      const cmd = this.checkCommand(cmds[0]);
      if (!cmd) {
        throw new Error("命令不存在! 命令: " + command);
      }
      const args = cmds.slice(1);
      const ret = await execAsync(cmd, args, {
        stdio: "inherit",
        cmd: process.cwd(),
      });
      if (ret !== 0) {
        throw new Error(errMsg);
      }
      return ret;
    }
  }

  // 模板渲染
  async ejsRender(option) {
    const dir = process.cwd();
    const projectInfo = this.projectInfo;
    return new Promise((resolve, reject) => {
      glob(
        "**",
        {
          cwd: dir,
          ignore: option.ignore || "",
          nodir: true,
        },
        (err, files) => {
          if (err) {
            reject(err);
          }
          Promise.all(
            files.map((file) => {
              const filePath = path.join(dir, file);
              return new Promise((resolve1, reject1) => {
                ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
                  if (err) {
                    reject1(err);
                  } else {
                    fse.writeFileSync(filePath, result);
                    resolve1(result);
                  }
                });
              });
            })
          )
            .then(() => {
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        }
      );
    });
  }

  // 标准模板的安装
  async installNormalTemplate() {
    // 拷贝模板代码到当前目录
    let spinner = spinnerStart("正在安装模板...");
    await sleep();
    try {
      const templatePath = path.resolve(
        this.templateNpm.cacheFilePath,
        "template"
      );
      const targetPath = process.cwd();
      // 确保当前目录存在, 不存在则会创建
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      // 拷贝
      fse.copySync(templatePath, targetPath);
    } catch (e) {
      throw e;
    } finally {
      spinner.stop(true);
      log.success("模板安装成功");
    }

    // 启用模板渲染
    const ignore = ["node_modules/**", "public/**"];
    await this.ejsRender({ ignore });

    // 安装依赖
    const { installCommand, startCommand } = this.templateInfo;
    await this.execCommand(installCommand, "依赖安装失败");

    // 启动
    await this.execCommand(startCommand, "启动失败");
    // let installRet;
    // if(installCommand) {
    //   const installCmd = installCommand.split(' ');
    //   const cmd = this.checkCommand(installCmd[0]);
    //   const args = installCmd.slice(1);
    //   const installRet = await execAsync(cmd, args, {
    //     stdio: 'inherit',
    //     cmd: process.cwd(),
    //   });
    //   if(installRet !== 0 ) {
    //     throw new Error('依赖安装失败');
    //   }
    // }
    // if(startCommand) {
    //   const startCmd = startCommand.split(' ');
    //   const cmd = this.checkCommand(startCmd[0]);
    //   const args = startCmd.slice(1);
    //   await execAsync(cmd, args, {
    //     stdio: 'inherit',
    //     cmd: process.cwd(),
    //   });
    // }
  }

  // 自定义模板的安装
  async installCustomTemplate() {
    if (await this.templateNpm.exists()) {
      const rootFile = this.templateNpm.getRootFilePath();
      if (fs.existsSync(rootFile)) {
        log.notice("开始执行定义模板");
        const templatePath = path.resolve(
          this.templateNpm.cacheFilePath,
          "template"
        );
        const options = {
          templateInfo: this.templateInfo,
          projectInfo: this.projectInfo,
          sourcePath: templatePath,
          targetPath: process.cwd(),
        };
        // 拼接自定义模板的执行文件路劲
        const code = `require('${rootFile}')(${JSON.stringify(options)})`;
        log.verbose("code", code);
        await execAsync("node", ["-e", code], {
          stdio: "inherit",
          cwd: process.cwd(),
        });
        log.success("自定义模板安装成功");
      } else {
        throw new Error("自定义模板入口文件不存在");
      }
    }
  }

  // 下载模板
  async downloadTemplate() {
    // 1. 通过项目模板API获取项目模板信息
    // 1.1 通过edd.js 搭建一套后端系统
    // 1.2 通过npm 存储项目模板
    // 1.3 将模板信息存储在mongodb数据库
    // 1.4 通过egg.js获取mongodb数据库中的数据并且通过API返回
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(
      (item) => item.npmName === projectTemplate
    );
    this.templateInfo = templateInfo;
    const targetPath = path.resolve(userHome, ".ddy-test", "template");
    const storeDir = path.resolve(
      userHome,
      ".ddy-test",
      "template",
      "node_modules"
    );
    const { npmName, npmVersion } = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: npmVersion,
    });
    log.verbose("templateNpm", templateNpm);
    if (!(await templateNpm.exists())) {
      const spinner = spinnerStart("正在下载模板...");
      await sleep();
      try {
        await templateNpm.install();
      } catch (e) {
        throw e;
      } finally {
        // install异常停止loading
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("下载模板成功");
          // 拿到templateNpm, 安装使用
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = spinnerStart("正在更新模板...");
      await sleep();
      try {
        await templateNpm.update();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("更新模板成功");
          this.templateNpm = templateNpm;
        }
      }
    }
  }
  async prepare() {
    // 判断模板是否存在
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error("模板信息不存咋");
    }
    this.template = template;

    // 获取当前目录
    const localPath = process.cwd();
    // const localPath=  path.resolve('.'); 也可以获取当前目录
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        // 输入是否 --force
        // 询问是否继续
        ifContinue = (
          await inquirer.prompt({
            type: "confirm",
            name: "ifContinue",
            default: false,
            message: "当前目录不为空, 是否继续创建项目",
          })
        ).ifContinue;
        if (!ifContinue) {
          return;
        }
      }

      // 强制更新
      if (ifContinue || this.force) {
        // 二次确认是否清空目录
        const { confirmDelete } = await inquirer.prompt({
          type: "confirm",
          name: "confirmDelete",
          default: false,
          message: "是否清空当前目录?",
        });
        if (confirmDelete) {
          // emptyDirSync 清空当前目录的文件
          fse.emptyDirSync(localPath);
        }
      }
    }
    return await this.getProjectInfo();
  }

  async getProjectInfo() {
    // 1. 选择创建的时组件还是项目
    function isValidName(v) {
      return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
        v
      );
    }
    let projectInfo = {};
    let isProjectNameValid = false;
    if (isValidName(this.projectName)) {
      isProjectNameValid = true;
      projectInfo.projectName = this.projectName;
    }
    const { type } = await inquirer.prompt({
      type: "list",
      message: "请选择初始化类型",
      name: "type",
      default: "TYPE_PROJECT",
      choices: [
        {
          name: "项目",
          value: TYPE_PROJECT,
        },
        {
          name: "组件",
          value: TYPE_COMPONENT,
        },
      ],
    });
    const title = type === TYPE_PROJECT ? "项目" : "组件";

    log.verbose("type:", type);
    this.template = this.template.filter((template) =>
      template.tag.includes(type)
    );
    const projectNamePrompt = {
      type: "input",
      name: "projectName",
      message: `请输入${title}名称`,
      default: "",
      validate: function (v) {
        // 用户输入不通过时的提示文案
        const done = this.async();
        setTimeout(function () {
          if (!isValidName(v)) {
            done("请输入合法的名称");
            return;
          }
          done(null, true);
        }, 0);
        return;
      },
      filter: (v) => {
        return v;
      },
    };
    const projectPrompt = [];
    if (!isProjectNameValid) {
      projectPrompt.push(projectNamePrompt);
    }
    projectPrompt.push(
      {
        type: "input",
        name: "projectVersion",
        message: `请输入${title}版本号`,
        default: "1.0.0",
        validate: function (v) {
          const done = this.async();
          setTimeout(function () {
            if (!!!semver.valid(v)) {
              done("请输入合法的版本号");
              return;
            }
            done(null, true);
          }, 0);
        },
        filter: (v) => {
          if (!!semver.valid(v)) {
            return semver.valid(v);
          } else {
            return v;
          }
        },
      },
      {
        type: "list",
        name: "projectTemplate",
        message: `请选择${title}模板`,
        choices: this.getTemplateChoice(),
      }
    );
    // 2. 获取项目基本信息
    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {
      const descriptionPrompt = {
        type: "input",
        name: "componentDescription",
        message: "请输入描述信息",
        validate: function (v) {
          const done = this.async();
          setTimeout(function () {
            if (!v) {
              done("请输入描述信息");
              return;
            }
            done(null, true);
          }, 0);
        },
      };
      projectPrompt.push(descriptionPrompt);
      // 获取组件基本信息
      const component = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...component,
      };
    }
    // 生成className, 转换成驼峰形式
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName;
      projectInfo.className = require("kebab-case")(
        projectInfo.projectName
      ).replace(/^-/, "");
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription;
    }
    return projectInfo;
  }

  getTemplateChoice() {
    return this.template.map((item) => ({
      value: item.npmName,
      name: item.name,
    }));
  }

  // 判断当前是否为空 process.cwd()/path.resolve()
  isDirEmpty(localPath) {
    // __dirname 指的时当前所执行的所在目录
    // 获取当前目录的文件
    let fileList = fs.readdirSync(localPath);

    // 缓存目录下可以创建项目
    fileList = fileList.filter(
      (file) => !file.startsWith(".") && ["node_modules"].indexOf(file) < 0
    );
    return !fileList || fileList.length <= 0;
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
