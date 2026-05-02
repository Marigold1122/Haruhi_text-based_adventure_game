import fs from "node:fs";
import path from "node:path";

const presetPath = process.argv[2];
if (!presetPath) {
  console.error("Usage: node scripts/inspect-st-preset.mjs <preset.json> [--out snapshot.txt]");
  process.exit(1);
}

const outIndex = process.argv.indexOf("--out");
const outPath = outIndex >= 0 ? process.argv[outIndex + 1] : "";
const raw = fs.readFileSync(presetPath, "utf8");
const preset = JSON.parse(raw);
const prompts = Array.isArray(preset.prompts) ? preset.prompts : [];
const promptById = new Map(prompts.filter((p) => p.identifier).map((p) => [p.identifier, p]));
const orders = Array.isArray(preset.prompt_order) ? preset.prompt_order : [];
const selectedOrder =
  orders.find((order) => order.character_id === 100001) ??
  [...orders].sort((a, b) => countEnabled(b) - countEnabled(a))[0] ??
  null;
const enabledItems = selectedOrder
  ? selectedOrder.order.filter((item) => item.enabled)
  : prompts.filter((prompt) => prompt.identifier).map((prompt) => ({ identifier: prompt.identifier, enabled: true }));
const enabledPrompts = enabledItems.map((item) => promptById.get(item.identifier)).filter(Boolean);
const enabledText = enabledPrompts.map((prompt) => prompt.content ?? "").join("\n\n");
const expanded = expandEnabledMacros(enabledPrompts);
const regexScripts = Array.isArray(preset.extensions?.regex_scripts) ? preset.extensions.regex_scripts : [];

const stats = {
  prompts: prompts.length,
  prompt_order: orders.length,
  regex_scripts: regexScripts.length,
  selected_order: selectedOrder?.character_id ?? "(prompt order fallback)",
  enabled: enabledItems.length,
  setvar: count(/\{\{setvar::/g, enabledText),
  getvar: count(/\{\{getvar::/g, enabledText),
  trim: count(/\{\{trim\}\}/g, enabledText),
  comments: count(/\{\{\/\//g, enabledText),
  user: count(/\{\{user\}\}/g, enabledText),
  body_tags: count(/<\/?正文>/g, enabledText),
  macro_variables: Object.keys(expanded.variables).length,
  unresolved_macros: expanded.unresolved.length,
  event_json_after_macro: count(/event_json/gi, expanded.text),
};

for (const [key, value] of Object.entries(stats)) {
  console.log(`${key}: ${value}`);
}

console.log("\nenabled prompts:");
for (const prompt of enabledPrompts) {
  console.log(`- ${prompt.identifier} :: ${prompt.name ?? "(unnamed)"}`);
}

if (outPath) {
  const snapshot = enabledPrompts
    .map((prompt) => {
      const title = `${prompt.identifier} :: ${prompt.name ?? "(unnamed)"} :: ${prompt.role ?? "user"}`;
      return `# ${title}\n${prompt.marker ? "[marker]" : prompt.content ?? ""}`;
    })
    .join("\n\n---\n\n");
  fs.writeFileSync(path.resolve(outPath), snapshot, "utf8");
  console.log(`\nsnapshot: ${path.resolve(outPath)}`);
}

if (expanded.unresolved.length) {
  console.log(`\nunresolved: ${expanded.unresolved.join(", ")}`);
}

function countEnabled(order) {
  return Array.isArray(order?.order) ? order.order.filter((item) => item.enabled).length : 0;
}

function count(pattern, text) {
  return text.match(pattern)?.length ?? 0;
}

function expandEnabledMacros(enabledPrompts) {
  const variables = {};
  const unresolved = [];
  const expanded = enabledPrompts
    .map((prompt) => {
      let text = prompt.content ?? "";
      text = text.replace(/\{\{\/\/[\s\S]*?\}\}/g, "");
      text = text.replace(/\{\{setvar::([^:}]+)::([\s\S]*?)\}\}/g, (_match, key, value) => {
        variables[key.trim()] = value;
        return "";
      });
      text = text.replace(/\{\{getvar::([^}]+)\}\}/g, (_match, key) => {
        const name = key.trim();
        if (Object.prototype.hasOwnProperty.call(variables, name)) return variables[name] ?? "";
        unresolved.push(`getvar:${name}`);
        return "";
      });
      text = text
        .replace(/\{\{trim\}\}/g, "")
        .replace(/\{\{user\}\}/g, "User")
        .replace(/\{\{char\}\}/g, "Character")
        .replace(/\{\{input\}\}/g, "")
        .replace(/\{\{lastusermessage\}\}/g, "");
      text = text.replace(/\{\{([^}]+)\}\}/g, (_match, name) => {
        unresolved.push(name.trim());
        return "";
      });
      return text.trim();
    })
    .join("\n\n");

  return { text: expanded, variables, unresolved: [...new Set(unresolved)] };
}
