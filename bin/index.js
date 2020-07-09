#! /usr/bin/env node

const program = require('commander');  // commander负责读取命令
const inquirer = require('inquirer');   // inquirer负责问询
const fse = require('fs-extra');   // fs-extra负责文件的复制
const download = require('download-git-repo');   // download-git-repo负责下载对应模板项目的git仓库
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const memFs = require('mem-fs');
const editor = require('mem-fs-editor');   // mem-fs-editor负责模板的复制以及嵌入模板字符串，它需要依赖mem-fs
const { exec } = require('child_process');   // child_process负责执行命令行

const store = memFs.create();
const memFsEditor = editor.create(store);

program
  .version('0.1.0')
  .option('-i, init [name]', '初始化mying项目')
  .parse(process.argv);

inquirer.prompt([{
  type: 'input',
  name: 'projectName',
  message: '请输入项目名：',
  validate(input) {
    if (!input) {
      return '项目名不能为空';
    }
    if (fse.existsSync(input)) {
      return '当前目录已存在同名项目，请更换项目名';
    }
    return true;
  }
}]).then((answer) => {
  const { projectName } = answer;
  const projectPath = path.join(process.cwd(), projectName);
  const downloadPath = path.join(projectPath, '__download__');
  console.log(`${chalk.green('✔ ')}${chalk.grey(`项目名称：${projectName}`)}`)
  const downloadSpinner = ora('正在下载模板，请稍等...');
  downloadSpinner.start();
  // 下载git repo
  download('direct:https://github.com/Mying666/cli-test.git', downloadPath, { clone: true }, (err) => {
    if (err) {
      downloadSpinner.color = 'red';
      downloadSpinner.fail(err.message);
      return;
    }

    downloadSpinner.color = 'green';
    downloadSpinner.succeed('下载成功');

    // 复制文件
    const copyFiles = getDirFileName(downloadPath);

    copyFiles.forEach((file) => {
      memFsEditor.copyTpl(
        path.join(downloadPath, file),
        path.join(projectPath, file),
        {
          projectName
        }
      );
      // fse.copySync(path.join(downloadPath, file), path.join(projectPath, file));
      console.log(`${chalk.green('✔ ')}${chalk.grey(`创建: ${projectName}/${file}`)}`);
    });

    memFsEditor.commit(() => {
      fse.remove(downloadPath);
      process.chdir(projectPath);

      const openSpinner = ora(`进入${chalk.green.bold(projectName)}目录, 打开 ${chalk.green.bold('index.html')}`);
      openSpinner.start();
      
      exec(`cd ${projectName}&start index.html`, (error) => {
        if (error) {
          openSpinner.color = 'red';
          openSpinner.fail(chalk.red('打开文件失败！'));
          console.log(error);
        } else {
          openSpinner.color = 'green';
          openSpinner.succeed('打开文件成功');
        }
      })
    })
  })
})



function getDirFileName(dir) {
  try {
    const files = fse.readdirSync(dir);
    const filesToCopy = [];
    files.forEach((file) => {
      if (file.indexOf(['package.json']) > -1) return;
      filesToCopy.push(file);
    });
    return filesToCopy;
  } catch (e) {
    return [];
  }
}
