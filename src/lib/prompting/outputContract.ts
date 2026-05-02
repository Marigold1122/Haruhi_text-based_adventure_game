export const MINIMAL_EVENT_JSON_CONTRACT = [
  "本应用只读取一个 <event_json>...</event_json> 块。",
  "块内必须是合法 JSON。",
  "字段至少包括 eventTitle、narration、stateChanges、pace、timeAdvance、requiresChoice、choices。",
  "块外不要输出其他文字。",
  "narration 字段承载完整正文；若 preset 要求 <正文> 或 </正文>，请只保留正文语义，不要破坏 JSON 结构。",
].join("\n");

