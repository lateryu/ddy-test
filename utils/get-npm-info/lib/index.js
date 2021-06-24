"use strict";

const axios = require("axios");
const urlJoin = require("url-join");
const semver = require("semver");

function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null;
  }
  const registryUlr = registry || getDefaultRegistry(true);
  const npmInfoUrl = urlJoin(registryUlr, npmName);
  return axios
    .get(npmInfoUrl)
    .then((response) => {
      if (response.status === 200) {
        return response.data;
      }
      return null;
    })
    .catch((err) => {
      return Promise.reject(err);
    });
}

async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  if (data) {
    return Object.keys(data.versions);
  }
}

// 获取满足条件的版本号 排序
function getSemverVersion(baseVersion, versions) {
  versions
    .filter((item) => semver.satisfies(item, `^${baseVersion}`))
    .sort((a, b) => semver.gt(b, a));
  return versions;
}

// 获取最新的版本
async function getNpmSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  const newVersion = getSemverVersion(baseVersion, versions);
  if (newVersion && newVersion.length) {
    return newVersion[0];
  }
}

function getDefaultRegistry(isOriginal = false) {
  return isOriginal
    ? "https://registry.npmjs.org/"
    : "https://registry.npm.taobao.org/";
}

async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmVersions(npmName, registry);
  if (versions) {
    // versions.sort((a, b) => semver.gt(b, a))[0];
    return versions[versions.length - 1];
  } else {
    return null;
  }
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion,
};
