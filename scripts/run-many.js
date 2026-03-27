#!/usr/bin/env node

const { spawn } = require('node:child_process');

function getRunnerSpec(platform = process.platform) {
  if (platform === 'win32') {
    return {
      command: 'pnpm',
      shell: true,
    };
  }

  return {
    command: 'pnpm',
    shell: false,
  };
}

function parseArgs(argv) {
  let parallel = false;
  const scripts = [];

  for (const arg of argv) {
    if (arg === '--parallel' || arg === '-p') {
      parallel = true;
      continue;
    }
    if (arg === '--silent' || arg === '-s') {
      continue;
    }
    scripts.push(arg);
  }

  if (scripts.length === 0) {
    throw new Error('No scripts provided');
  }

  return { parallel, scripts };
}

function runPackageScript(script, options = {}) {
  return new Promise((resolve, reject) => {
    const { command, shell } = getRunnerSpec();
    const child = spawn(command, ['run', script], {
      stdio: 'inherit',
      shell,
      env: process.env,
      ...options,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      if (signal) {
        reject(new Error(`Script "${script}" terminated by signal ${signal}`));
        return;
      }
      reject(new Error(`Script "${script}" exited with code ${code}`));
    });
  });
}

async function runSequential(scripts, runner = runPackageScript) {
  for (const script of scripts) {
    await runner(script);
  }
}

async function runParallel(scripts, runner = runPackageScript) {
  await Promise.all(scripts.map((script) => runner(script)));
}

async function main(argv = process.argv.slice(2)) {
  const { parallel, scripts } = parseArgs(argv);
  if (parallel) {
    await runParallel(scripts);
    return;
  }
  await runSequential(scripts);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  getRunnerSpec,
  main,
  parseArgs,
  runPackageScript,
  runParallel,
  runSequential,
};
