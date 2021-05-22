'use strict';

var Command = require('@ddy-test/command');
const log = require('@ddy-test/log');


const inquirer = require('inquirer');
const fse = require('fs-extra');
const semver = require('semver');


const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
class InitCommand extends Command {
   init() {
      this.projectName = this._argv[0] || '';
      this.force = !!this._cmd.force;
      log.verbose('projectName', this.projectName);
      log.verbose('force', this.force);
   }
    async exec() {
      try {
         const ret = await this.prepare();
         if(ret) {

         }
      } catch (e) {
         log.error(e.message)
      }
   }
    async prepare() {
      const localPath = process.cwd();
      if (!this.isDirEmpty(localPath)) {
        let ifContinue = false;
        if (!this.force) {
         // 询问是否继续
         ifContinue = (await inquirer.prompt({
            type: 'confirm',
            name: 'ifContinue',
            default: false,
            message: '当前目录不为空, 是否继续创建项目'
         })).ifContinue;
         if (!ifContinue) {
            return;
         }
       }
       if (ifContinue || this.force) {
          // 清空目录
          const { confirmDelete } = await inquirer.prompt({
            type: 'confirm',
            name: 'confirmDelete',
            default: false,
            message: '是否清空当前目录?'
          });
          if (confirmDelete) {
            fse.emptyDirSync(localPath);
          }
       }
    }
    return await this.getProjectInfo();
   }
   
   async getProjectInfo() {
      // 1. 选择创建的时组件还是项目
      const projectInfo = {};
      const { type } = await inquirer.prompt({
         type: 'list',
         message: '请选择初始化类型',
         name: 'type',
         default: 'TYPE_PROJECT',
         choices: [{
            name: '项目',
            value: TYPE_PROJECT,
         }, {
            name: '组件',
            value: TYPE_COMPONENT,
         }]
      });
      // 2. 获取项目基本信息
      if (type === TYPE_PROJECT) {
         const o = await inquirer.prompt([{
            type: 'input',
            name: 'projectName',
            message: '请输入项目名称',
            default: '',
            validate: function (v) {
               var done = this.async();
               setTimeout(function() {
                  if(!/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)) {
                     done('请输入合法的名称');
                     return;
                  }
                  done(null, true);
               }, 0)

               return ;
            },
            filter: (v) => {
               return v;
            },
         }, {
            type: 'input',
            name: 'projectVersion',
            message: '请输入项目版本号',
            default: '1.0.0',
            validate: (v) => {
               var done = this.async();
               setTimeout(function() {
                  if(!!semver.valid(v)) {
                     done('请输入合法的版本号');
                     return;
                  }
                  done(null, true);
               }, 0)
            },
            filter: (v) => {
               if(!!semver.valid(v)) {
                  return semver.valid(v);
               } else {
                  return v;
               }
            },
         }]);
         console.log(o,  11111111);

      } else if(type === TYPE_COMPONENT) {

      }
      return projectInfo;
   }

   // 判断当前是否为空 process.cwd()/path.resolve()
   isDirEmpty(localPath) {
      // __dirname 指的时当前所执行的所在目录
      // 获取当前目录的文件
      let fileList = fs.readdirSync(localPath);

      fileList = fileList.filter(file => (
         !file.startsWith('.') && ['node_modules'].indexOf(file) < 0
      ))
      return !fileList || fileList.length <= 0;
   }
}
   

function init(argv) {
   return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;

