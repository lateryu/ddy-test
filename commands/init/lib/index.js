"use strict";

var Command = require("@ddy-test/command");
const log = require("@ddy-test/log");
const path = require("path");

const inquirer = require("inquirer");
const userHome = require("user-home");
const fse = require("fs-extra");
const semver = require("semver");
const getProjectTemplate = require("./getProjectTemplate");
const Package = require("@ddy-test/Package");
const { spinnerStart, sleep } = require("@ddy-test/utils");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

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
      }
      this.projectInfo = projectInfo;
      // 下载模板
      await this.downloadTemplate();
    } catch (e) {
      log.error(e.message);
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
    if (!(await templateNpm.exists())) {
      const spinner = spinnerStart("正在下载模板...");
      await sleep();
      await templateNpm.install();
      spinner.stop(true);
      log.success("下载模板成功");
    } else {
      const spinner = spinnerStart("正在更新模板...");
      await sleep();
      await templateNpm.update();
      spinner.stop(true);
      log.success("更新模板成功");
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
    let projectInfo = {};
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
    // 2. 获取项目基本信息
    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "请输入项目名称",
          default: "",
          validate: function (v) {
            // 用户输入不通过时的提示文案
            const done = this.async();
            setTimeout(function () {
              if (
                !/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
                  v
                )
              ) {
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
        },
        {
          type: "input",
          name: "projectVersion",
          message: "请输入项目版本号",
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
          message: "请选择项目模板",
          choices: this.getTemplateChoice(),
        },
      ]);
      projectInfo = {
        type,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {
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
