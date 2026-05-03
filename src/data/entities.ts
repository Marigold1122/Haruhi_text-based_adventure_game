export type EntityDefinition = {
  id: string;
  displayName: string;
  aliases: string[];
  tags?: string[];
};

export const entityDefinitions: EntityDefinition[] = [
  {
    id: "haruhi",
    displayName: "凉宫春日",
    aliases: ["凉宫春日", "春日", "凉宫", "团长", "黄丝带女生", "黄色发带女生", "涼宮ハルヒ", "ハルヒ"],
    tags: ["sos", "class5"],
  },
  {
    id: "kyon",
    displayName: "阿虚",
    aliases: ["阿虚", "キョン", "Kyon"],
    tags: ["sos", "class5"],
  },
  {
    id: "nagato",
    displayName: "长门有希",
    aliases: ["长门有希", "长门", "有希", "ながと", "Nagato"],
    tags: ["sos", "literature_club"],
  },
  {
    id: "asahina",
    displayName: "朝比奈实玖瑠",
    aliases: ["朝比奈实玖瑠", "朝比奈", "实玖瑠", "朝比奈学姐", "学姐", "ミクル", "Mikuru"],
    tags: ["sos"],
  },
  {
    id: "koizumi",
    displayName: "古泉一树",
    aliases: ["古泉一树", "古泉", "古泉君", "コイズミ", "Koizumi"],
    tags: ["sos"],
  },
  {
    id: "asakura",
    displayName: "朝仓凉子",
    aliases: ["朝仓凉子", "朝仓", "班长", "Asakura"],
    tags: ["class5"],
  },
  {
    id: "taniguchi",
    displayName: "谷口",
    aliases: ["谷口", "Taniguchi"],
    tags: ["class5"],
  },
  {
    id: "kunikida",
    displayName: "国木田",
    aliases: ["国木田", "Kunikida"],
    tags: ["class5"],
  },
  {
    id: "tsuruya",
    displayName: "鹤屋学姐",
    aliases: ["鹤屋学姐", "鹤屋", "Tsuruya"],
    tags: ["sos_adjacent"],
  },
  {
    id: "sasaki",
    displayName: "佐佐木",
    aliases: ["佐佐木", "Sasaki"],
    tags: ["sasaki_faction"],
  },
];

export function findEntityDefinition(id: string): EntityDefinition | undefined {
  return entityDefinitions.find((entity) => entity.id === id);
}
