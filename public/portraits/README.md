# 8 个角色原型立绘 · AI 绘图 prompt 与命名规则

ArchetypeReveal 会按下面文件名加载立绘。**图片不存在时会自动显示首字 + 主色占位，所以不会报错——你随时把生成好的图片放进来即可。**

## 文件命名（必须严格一致）

```
public/portraits/
├── haruhi.png      凉宫春日型
├── kyon.png        阿虚型
├── nagato.png      长门有希型
├── asahina.png     朝比奈实玖瑠型
├── koizumi.png     古泉一树型
├── tsuruya.png     鹤屋型
├── asakura.png     朝仓凉子型
└── sasaki.png      佐佐木型
```

推荐尺寸：竖向 3:4 或 2:3（例如 720×960、800×1200）。文件格式 png 或 jpg 都行（仅 png 会被自动加载——若用 jpg，把 `characterArchetypes.ts` 里的 `portraitUrl` 改成 `.jpg`）。

## 通用画风约束（每个 prompt 都拼上）

参考画师"小久 official"的 Bang Dream! 同人画风（你给的两张图）：

```
art style: colored pencil sketch + watercolor wash, soft pastel tones,
light beige cream background, visible pencil strokes and crosshatching,
loose airy hair strands with multi-color highlight, soft glossy skin,
delicate eyelashes, soft blush, gentle smile or expression,
half-body bust shot, slight 3/4 angle,
official anime fanart aesthetic in the style of "小久 official",
small signature in the bottom-right corner with character name
```

负面 prompt（避免）：
```
3D, photo, realistic, harsh lines, dark background, oversaturated,
chibi, deformed, NSFW, watermark
```

## 8 套独立 prompt

### 1) haruhi.png — 凉宫春日型

```
A high school girl in colored pencil watercolor sketch style,
short straight dark brown hair (almost black, NOT chestnut, NOT blonde),
two side ponytails tied with bright YELLOW ribbon bows on either side
(absolutely yellow, NOT red — this is her signature),
amber/light brown eyes with sharp confident gaze,
slight mischievous smirk, eyebrows slightly furrowed,
high energy bossy posture, chin slightly raised,
wearing Japanese sailor school uniform (white long-sleeve top with NAVY BLUE sailor collar
edged with thin red trim, dark wine-red ribbon tie at chest, NAVY BLUE pleated skirt),
half-body bust shot, slight 3/4 angle,
[GENERIC STYLE BLOCK ABOVE],
signature: "Suzumiya Haruhi"
```

### 2) kyon.png — 阿虚型

```
A high school boy in colored pencil watercolor sketch style,
short messy dark brown hair, no special hairstyle, slightly tired droopy eyes,
neutral or slightly annoyed expression with one eyebrow raised,
"sigh, here we go again" vibe, hands in pockets or one hand scratching head,
wearing Japanese western-style school uniform (white long-sleeve shirt,
NAVY BLUE/dark blue blazer, RED diagonal-stripe necktie loosely worn,
dark brown trousers — no Japanese gakuran high-collar),
half-body shot,
[GENERIC STYLE BLOCK ABOVE],
signature: "Kyon"
```

### 3) nagato.png — 长门有希型

```
A petite delicate high school girl in colored pencil watercolor sketch style,
short straight purple hair with uneven bangs (light lavender / soft purple,
this is her signature anime color, NOT black),
deep dark obsidian eyes — emotionless, glassy, no smile,
pale porcelain skin, expressionless face with subtle quiet aura,
optionally wearing thin glasses (or holding glasses gently),
small framed body, holding a hardcover book or just looking quietly,
wearing the same Japanese sailor uniform (white top, NAVY BLUE sailor collar,
wine-red ribbon, NAVY BLUE pleated skirt),
half-body shot, slight side angle,
[GENERIC STYLE BLOCK ABOVE],
signature: "Nagato Yuki"
```

### 4) asahina.png — 朝比奈实玖瑠型

```
A petite cute high school girl in colored pencil watercolor sketch style,
chestnut/light brown wavy medium-length hair flowing over shoulders,
warm honey-brown puppy-like big eyes with long thick eyelashes,
soft pink blush on cheeks, slightly nervous innocent smile or trembling lips
(she might look like she's about to tear up),
small dainty frame, hands clasped near chest in a shy gesture,
wearing the same Japanese sailor uniform (white top, NAVY BLUE sailor collar,
wine-red ribbon, NAVY BLUE pleated skirt),
half-body shot, slight 3/4 forward angle,
[GENERIC STYLE BLOCK ABOVE],
signature: "Asahina Mikuru"
```

### 5) koizumi.png — 古泉一树型

```
A tall elegant high school boy in colored pencil watercolor sketch style,
neat dark chestnut brown hair (slight wave, side-parted, well-groomed),
brown eyes, perfectly standardized polite smile (the corners of mouth uniformly
upturned — almost too perfect, slightly inhuman charm),
relaxed posture with one hand holding a chess piece or a card,
wearing Japanese western-style school uniform (white long-sleeve shirt,
NAVY BLUE/dark blue blazer, RED diagonal-stripe necktie tied perfectly,
dark brown trousers),
tall slim model-like build,
half-body shot, slight 3/4 angle,
[GENERIC STYLE BLOCK ABOVE],
signature: "Koizumi Itsuki"
```

### 6) tsuruya.png — 鹤屋型

```
A tall energetic high school girl in colored pencil watercolor sketch style,
long dark green hair flowing past her waist (this is her signature color,
NOT black, NOT brown — DEEP GREEN like emerald),
bright cheerful big smile showing one prominent fang/tiger tooth (虎牙),
sparkling eyes with mischievous joyful gaze,
arms raised in laughing pose or one hand near her face,
wearing the same Japanese sailor uniform (white top, NAVY BLUE sailor collar,
wine-red ribbon, NAVY BLUE pleated skirt),
half-body shot, dynamic energetic pose,
[GENERIC STYLE BLOCK ABOVE],
signature: "Tsuruya"
```

### 7) asakura.png — 朝仓凉子型

```
A neat elegant high school girl class president in colored pencil watercolor
sketch style, long flowing waist-length BLUE hair (deep azure blue,
this is her signature color, NOT black, NOT purple — straight clean blue),
dark blue eyes with gentle warm gaze, "yellow tulip-like" gentle smile
(perfect kind expression, but with subtle hidden coldness in the depth of pupils),
neat composed posture,
wearing the same Japanese sailor uniform (white long-sleeve top, NAVY BLUE
sailor collar, wine-red ribbon, NAVY BLUE pleated skirt),
half-body shot, slight forward angle,
[GENERIC STYLE BLOCK ABOVE],
signature: "Asakura Ryoko"
```

### 8) sasaki.png — 佐佐木型

```
A intelligent calm high school girl in colored pencil watercolor sketch style,
short brown hair with distinctive M-shaped bangs (two pointed peaks framing
the forehead — this is her signature hairstyle),
sparkling deep BLACK eyes (clear and crystalline),
calm self-mocking polite smile (slight smirk, one corner of mouth raised),
relaxed confident posture, possibly holding a coffee cup,
wearing a private school uniform (different from the Kitakō sailor style):
black long-sleeve blazer with school emblem on left chest,
yellow shirt underneath, red plaid checkered skirt, white knee-high socks,
black leather shoes — this is a private school, not Kitakō,
half-body shot, slight side angle with sophisticated air,
[GENERIC STYLE BLOCK ABOVE],
signature: "Sasaki"
```

## 使用建议

1. 把 `[GENERIC STYLE BLOCK ABOVE]` 替换成上面的"通用画风约束"全文
2. 推荐工具：Midjourney（v7 + `--style raw --ar 3:4`）、NovelAI v3、Stable Diffusion + Pencil/Watercolor LoRA
3. **关键约束**（每张都要在 prompt 里强调）：
   - 春日：**黄色发带**（不是红色）
   - 长门：**淡紫色头发**（动画版形象）
   - 朝仓：**蓝色长发**（不是黑色）
   - 鹤屋：**深绿色长发 + 虎牙**
   - 佐佐木：**M 状刘海 + 私立校制服**（黄衬衫 + 红格子裙，与北高水手服明显不同）
   - 北高校服女水手服：**蓝色水手领 + 蓝色百褶裙 + 酒红色蝴蝶结**
   - 北高校服男西装：**藏青色西装外套 + 红色斜纹领带 + 深棕色长裤**

生成完毕后把 png 文件放到 `public/portraits/` 即可。无需重启 dev server，浏览器刷新就能看到。
