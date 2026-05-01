// Character Card V2 spec
// Reference: https://github.com/malfoyslastname/character-card-spec-v2
//
// V2 在 V1 基础上增加 system_prompt / post_history_instructions /
// character_book / extensions 等字段，并把所有数据放在 data 子对象里以便扩展。

export type CharacterBookEntry = {
  keys: string[];
  content: string;
  extensions?: Record<string, unknown>;
  enabled: boolean;
  insertion_order: number;
  case_sensitive?: boolean;
  name?: string;
  priority?: number;
  id?: number;
  comment?: string;
  selective?: boolean;
  secondary_keys?: string[];
  constant?: boolean;
  position?: "before_char" | "after_char";
};

export type CharacterBook = {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions?: Record<string, unknown>;
  entries: CharacterBookEntry[];
};

export type CharacterCardV2Data = {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;

  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  alternate_greetings: string[];
  tags: string[];
  creator: string;
  character_version: string;
  extensions: Record<string, unknown>;

  character_book?: CharacterBook;
};

export type CharacterCardV2 = {
  spec: "chara_card_v2";
  spec_version: "2.0";
  data: CharacterCardV2Data;
};
