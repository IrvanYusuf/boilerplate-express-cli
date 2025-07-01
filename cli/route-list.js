import "module-alias/register.js";
import chalk from "chalk";
import app from "@/app";

import pkg from "express/package.json" assert { type: "json" };

const expressVersion = pkg.version;

if (expressVersion.startsWith("5")) {
  console.error("❌ This CLI does not support Express 5.x yet.");
  process.exit(1);
}

function listRoutes(app) {
  const routes = [];

  function extractPathFromRegex(regex) {
    if (!regex || !regex.source) return "";
    let path = regex.source
      .replace("\\/?", "") // hapus optional trailing slash
      .replace("(?=\\/|$)", "") // hapus lookahead
      .replace(/\\\//g, "/") // ubah \/ ke /
      .replace(/^(\^)/, "") // hapus ^ di awal
      .replace(/\$$/, ""); // hapus $ di akhir
    return path;
  }
  function getHandlerName(handle) {
    return handle.name || "<anonymous>";
  }

  function traverse(stack, prefix = "") {
    stack.forEach((layer) => {
      if (layer.route) {
        const path = prefix + layer.route.path;
        const methods = Object.keys(layer.route.methods).map((m) =>
          m.toUpperCase()
        );
        const handles = layer.route.stack.map((h) => getHandlerName(h.handle));
        routes.push({ path, methods, handles });
      } else if (layer.name === "router" && layer.handle?.stack) {
        const pathPart = extractPathFromRegex(layer.regexp);
        traverse(layer.handle.stack, prefix + pathPart);
      }
    });
  }

  traverse(app._router.stack);

  // ⛳️ Grouping berdasarkan prefix utama (misalnya '/api/v1/users')
  const grouped = {};
  routes.forEach((route) => {
    const base = route.path.split("/").slice(0, 4).join("/") || "/";
    if (!grouped[base]) grouped[base] = [];
    route.methods.forEach((method, i) => {
      grouped[base].push({
        method,
        path: route.path,
        handler: route.handles[i] || "<anonymous>",
      });
    });
  });

  // 🖨️ Print result
  console.log("\n📋 Available Routes:");
  console.log("=".repeat(80));
  Object.keys(grouped).forEach((prefix) => {
    console.log(
      `\n${chalk.blue("Group 📁")}${":".padEnd(2)} ${chalk.blue(prefix)}`
    );
    grouped[prefix].forEach((r) => {
      console.log(
        chalk.yellow(r.method.padEnd(10)),
        chalk.green(r.path.padEnd(20)),
        chalk.cyan(r.handler)
      );
    });
  });
  console.log(`\n📊 Total: ${routes.length} routes`);
}

listRoutes(app);

process.exit(1);
