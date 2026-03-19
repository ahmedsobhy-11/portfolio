const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const publicDir = path.join(rootDir, "public");
const srcDir = path.join(rootDir, "src");

function removeDir(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function copyDir(source, target) {
  ensureDir(path.dirname(target));
  fs.cpSync(source, target, { recursive: true });
}

function copyFile(source, target) {
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function buildIndex() {
  const sourcePath = path.join(publicDir, "index.html");
  const targetPath = path.join(distDir, "index.html");

  let html = fs.readFileSync(sourcePath, "utf8");

  html = html
    .replace(/\.\.\/src\//g, "./src/")
    .replace(/\.\.\/node_modules\/three\/build\/three\.min\.js/g, "./vendor/three.min.js")
    .replace(/\.\.\/node_modules\/gsap\/dist\/gsap\.min\.js/g, "./vendor/gsap.min.js")
    .replace(/\.\.\/node_modules\/gsap\/dist\/ScrollTrigger\.min\.js/g, "./vendor/ScrollTrigger.min.js");

  fs.writeFileSync(targetPath, html, "utf8");
}

function copyVendor() {
  copyFile(
    path.join(rootDir, "node_modules", "three", "build", "three.min.js"),
    path.join(distDir, "vendor", "three.min.js"),
  );
  copyFile(
    path.join(rootDir, "node_modules", "gsap", "dist", "gsap.min.js"),
    path.join(distDir, "vendor", "gsap.min.js"),
  );
  copyFile(
    path.join(rootDir, "node_modules", "gsap", "dist", "ScrollTrigger.min.js"),
    path.join(distDir, "vendor", "ScrollTrigger.min.js"),
  );
}

function main() {
  removeDir(distDir);
  ensureDir(distDir);
  copyDir(srcDir, path.join(distDir, "src"));
  copyVendor();
  buildIndex();
}

main();
