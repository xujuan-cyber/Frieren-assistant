#!/usr/bin/env node

/**
 * Cross-platform desktop build script
 * Replaces build-desktop.bat with a Node.js solution
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('===========================================');
console.log('Prompt Optimizer Desktop Build Script');
console.log('===========================================');

function runCommand(command, cwd = process.cwd()) {
  console.log(`Running: ${command}`);
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { ...process.env }
    });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    process.exit(1);
  }
}

function copyDirectory(src, dest) {
  console.log(`Copying ${src} to ${dest}`);
  
  // Remove destination if it exists
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  
  // Create destination directory
  fs.mkdirSync(dest, { recursive: true });
  
  // Copy files recursively
  fs.cpSync(src, dest, { recursive: true });
  console.log('Copy completed successfully');
}

try {
  // Step 1: Build web application
  console.log('\nStep 1: Building web application...');
  const webDir = path.resolve(__dirname, '../web');
  runCommand('pnpm run build', webDir);
  
  // Step 2: Copy web files to desktop
  console.log('\nStep 2: Copying web files...');
  const webDistSrc = path.join(webDir, 'dist');
  const webDistDest = path.join(__dirname, 'web-dist');
  
  if (!fs.existsSync(webDistSrc)) {
    throw new Error(`Web dist directory not found: ${webDistSrc}`);
  }
  
  copyDirectory(webDistSrc, webDistDest);
  
  // Step 3: Package desktop application
  console.log('\nStep 3: Packaging desktop application...');
  runCommand('pnpm run package', __dirname);
  
  console.log('\n===========================================');
  console.log('Build completed successfully!');
  console.log('===========================================');
  
  // Show output location
  const distDir = path.join(__dirname, 'dist');
  if (fs.existsSync(distDir)) {
    console.log(`Output location: ${distDir}`);
    const files = fs.readdirSync(distDir);
    files.forEach(file => {
      const filePath = path.join(distDir, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        console.log(`Directory: ${file}/`);
      } else {
        console.log(`File: ${file} (${stats.size} bytes)`);
      }
    });
  }
  
} catch (error) {
  console.error('\n===========================================');
  console.error('Build failed!');
  console.error('===========================================');
  console.error(error.message);
  process.exit(1);
}
