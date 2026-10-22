#!/usr/bin/env python3
"""
tools/catalog_scrape.py — refresh js/catalog-data.js from public 221616.com
search results (Japanese makes, ¥1M–¥10M), translated into English.

Standard library only. Polite: one request every ~1.5 s, a browser-like
User-Agent, and only the first PAGES result pages (30 listings each).
Run:  python3 tools/catalog_scrape.py            (defaults: 3 pages)
      python3 tools/catalog_scrape.py --pages 2 --out js/catalog-data.js

The GitHub Actions workflow in .github/workflows/catalog.yml runs this every
six hours and commits the result, which is how the catalogue stays close to
live on a static host (a browser cannot read 221616.com directly: CORS).

Private portfolio use. Listings, prices and photos belong to the selling
dealer; the page credits the source and photos are hot-linked, not copied.
"""
import argparse, datetime, html, json, re, sys, time, unicodedata, urllib.request

BASE = "https://221616.com"
SEARCH = BASE + "/search/toyota_lexus_honda_nissan_mazda_subaru_daihatsu_suzuki_mitsubishi/sellingPriceMin-1000000/sellingPriceMax-10000000/"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
DELAY = 1.5

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ja,en;q=0.8"})
    with urllib.request.urlopen(req, timeout=40) as r:
        body = r.read().decode("utf-8", "ignore")
    time.sleep(DELAY)
    return body

def ldjson(s):
    out = []
    for m in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', s, re.S):
        try:
            j = json.loads(m.group(1))
            out.extend(j if isinstance(j, list) else [j])
        except Exception:
            pass
    return out

def textlines(s):
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", s, flags=re.S)
    t = re.sub(r"<[^>]+>", "\n", t)
    t = html.unescape(t)
    return [x.strip() for x in t.split("\n") if x.strip()]

N = lambda s: unicodedata.normalize("NFKC", s or "").replace("Ⅲ", "III").replace("Ⅱ", "II")

# ---------------------------------------------------------------- vocab
BRAND = {"トヨタ": "Toyota", "レクサス": "Lexus", "ホンダ": "Honda", "日産": "Nissan", "マツダ": "Mazda", "スバル": "Subaru",
         "ダイハツ": "Daihatsu", "スズキ": "Suzuki", "三菱": "Mitsubishi"}

# URL slug → English model name (fallback: title-cased slug)
MODEL = {
 "alphard": "Alphard", "alphardhybrid": "Alphard Hybrid", "vellfire": "Vellfire", "vellfirehybrid": "Vellfire Hybrid", "voxy": "Voxy", "noah": "Noah",
 "noahhybrid": "Noah Hybrid", "voxyhybrid": "Voxy Hybrid", "harrier": "Harrier", "harrierhybrid": "Harrier Hybrid", "rav4": "RAV4", "rav4phv": "RAV4 PHV",
 "landcruiser": "Land Cruiser", "landcruiserprado": "Land Cruiser Prado", "landcruiser250": "Land Cruiser 250", "landcruiser300": "Land Cruiser 300", "crown": "Crown",
 "crownsport": "Crown Sport", "crowncrossover": "Crown Crossover", "crownhybrid": "Crown Hybrid", "prius": "Prius", "priusphv": "Prius PHV", "aqua": "Aqua",
 "yaris": "Yaris", "gryaris": "GR Yaris", "yariscross": "Yaris Cross", "corolla": "Corolla", "corollacross": "Corolla Cross", "corollatouring": "Corolla Touring",
 "corollasport": "Corolla Sport", "sienta": "Sienta", "hiacevan": "HiAce Van", "hiacewagon": "HiAce Wagon", "hilux": "Hilux", "chr": "C-HR", "camry": "Camry",
 "86": "GR86", "gr86": "GR86", "supra": "GR Supra", "roomy": "Roomy", "raize": "Raize", "passo": "Passo", "esquire": "Esquire", "estima": "Estima",
 "wish": "Wish", "porte": "Porte", "copen": "Copen", "bz4x": "bZ4X", "mirai": "Mirai", "centurysedan": "Century", "granace": "Granace",
 "nx": "NX", "rx": "RX", "ux": "UX", "lx": "LX", "is": "IS", "es": "ES", "ls": "LS", "lbx": "LBX", "lm": "LM", "rc": "RC", "gx": "GX", "rz": "RZ", "ct": "CT", "lc": "LC",
 "vezel": "Vezel", "fit": "Fit", "freed": "Freed", "freedplus": "Freed+", "stepwgn": "Step WGN", "stepwgnspada": "Step WGN Spada", "nbox": "N-BOX", "nboxcustom": "N-BOX Custom",
 "nwgn": "N-WGN", "none": "N-ONE", "nvan": "N-VAN", "civic": "Civic", "civictyper": "Civic Type R", "accord": "Accord", "zrv": "ZR-V", "crv": "CR-V", "odyssey": "Odyssey",
 "shuttle": "Shuttle", "insight": "Insight", "wrv": "WR-V", "s660": "S660",
 "serena": "Serena", "xtrail": "X-Trail", "note": "Note", "noteaura": "Note Aura", "elgrand": "Elgrand", "kicks": "Kicks", "fairladyz": "Fairlady Z", "skyline": "Skyline",
 "gtr": "GT-R", "leaf": "Leaf", "roox": "Roox", "dayz": "Dayz", "sakura": "Sakura", "caravan": "Caravan", "juke": "Juke", "march": "March", "ariya": "Ariya", "nv200vanette": "NV200",
 "cx5": "CX-5", "cx8": "CX-8", "cx60": "CX-60", "cx80": "CX-80", "cx30": "CX-30", "cx3": "CX-3", "mazda3fastback": "Mazda3 Fastback", "mazda3sedan": "Mazda3 Sedan",
 "mazda2": "Mazda2", "mazda6wagon": "Mazda6 Wagon", "mazda6sedan": "Mazda6 Sedan", "roadster": "Roadster (MX-5)", "roadsterrf": "Roadster RF", "mx30": "MX-30", "flair": "Flair",
 "forester": "Forester", "levorg": "Levorg", "outback": "Outback", "impreza": "Impreza", "imprezasport": "Impreza Sport", "xv": "XV", "crosstrek": "Crosstrek", "brz": "BRZ",
 "wrxs4": "WRX S4", "wrxsti": "WRX STI", "legacyoutback": "Legacy Outback", "legacyb4": "Legacy B4", "solterra": "Solterra", "rex": "Rex",
 "tanto": "Tanto", "tantocustom": "Tanto Custom", "rocky": "Rocky", "move": "Move", "movecanbus": "Move Canbus", "taft": "Taft", "mira": "Mira", "miraeis": "Mira e:S",
 "cast": "Cast", "thor": "Thor", "wake": "Wake", "atrai": "Atrai", "hijettruck": "Hijet Truck",
 "jimny": "Jimny", "jimnysierra": "Jimny Sierra", "swift": "Swift", "swiftsport": "Swift Sport", "hustler": "Hustler", "spacia": "Spacia", "spaciacustom": "Spacia Custom", "spaciagear": "Spacia Gear", "spaciabase": "Spacia Base",
 "solio": "Solio", "xbee": "Xbee", "wagonr": "Wagon R", "wagonrsmile": "Wagon R Smile", "alto": "Alto", "every": "Every", "everywagon": "Every Wagon", "lapin": "Lapin",
 "ignis": "Ignis", "landy": "Landy", "fronx": "Fronx",
 "delicad5": "Delica D:5", "delicamini": "Delica Mini", "outlander": "Outlander", "outlanderphev": "Outlander PHEV", "eclipsecross": "Eclipse Cross", "pajero": "Pajero",
 "triton": "Triton", "ekcross": "eK Cross", "ekwagon": "eK Wagon", "ekspace": "eK Space", "rvr": "RVR", "minicab": "Minicab",
}
# grade / name terms (longest first at runtime)
TERMS = [("ハイブリッド", "Hybrid"), ("ハイブリット", "Hybrid"), ("エグゼクティブ", "Executive"), ("ラウンジ", "Lounge"), ("プレミアム", "Premium"), ("パッケージ", "Package"),
 ("エディション", "Edition"), ("スペシャル", "Special"), ("セレクション", "Selection"), ("リミテッド", "Limited"), ("アドバンス", "Advance"), ("アドバンスド", "Advanced"),
 ("ナイトシェード", "Nightshade"), ("レザー", "Leather"), ("スポーツ", "Sport"), ("ツーリング", "Touring"), ("クロス", "Cross"), ("クロスオーバー", "Crossover"), ("アーバン", "Urban"),
 ("ハイウェイスター", "Highway Star"), ("オーテック", "Autech"), ("ニスモ", "NISMO"), ("モデリスタ", "Modellista"), ("カスタム", "Custom"), ("ターボ", "Turbo"), ("スパーダ", "Spada"),
 ("エアー", "Air"), ("プラス", "+"), ("バージョン", "Version"), ("ファイナル", "Final"), ("ブラック", "Black"), ("ホワイト", "White"), ("ブロンズ", "Bronze"), ("シルバー", "Silver"),
 ("セーフティ", "Safety"), ("センシング", "Sensing"), ("エレガンス", "Elegance"), ("プログレス", "Progress"), ("メタル", "Metal"), ("アンド", "&"), ("リアシート", "Rear-seat"),
 ("エアロ", "Aero"), ("ツアラー", "Tourer"), ("ハイパフォーマンス", "High Performance"), ("ベースグレード", ""), ("ガソリン", ""), ("ディーゼル", "Diesel"), ("オリジナル", "Original"),
 ("ワイルド", "Wild"), ("アクティブ", "Active"), ("スタイル", "Style"), ("ギア", "Gear"), ("フィールド", "Field"), ("エクスプローラー", "Explorer"), ("シエラ", "Sierra"),
 ("プロアクティブ", "Proactive"), ("エクスクルーシブ", "Exclusive"), ("モード", "Mode"), ("クール", "Cool"), ("ファン", "Fun"), ("ビジネス", "Business"), ("ベーシック", "Basic"),
 ("トランスポーター", "Transporter"), ("ラグジュアリー", "Luxury"), ("ロイヤル", "Royal"), ("サルーン", "Saloon"), ("アスリート", "Athlete"), ("マジェスタ", "Majesta"),
 ("ビスポークビルド", "Bespoke Build"), ("ヘリテージ", "Heritage"), ("ブラックトーン", "Black Tone"), ("ホワイトトーン", "White Tone"), ("スマート", "Smart"), ("ダブルバイビー", "W×B"),
 ("ジャスパー", "Jasper"), ("シャモニー", "Chamonix"), ("ライダー", "Rider"), ("プロパイロット", "ProPILOT"), ("ハンズ", "Hands"), ("サンルーフ", "Sunroof"), ("ホンダセンシング", "Honda SENSING"),
 ("パッケ", "Package"), ("ＰＫＧ", "Package"), ("PKG", "Package"), ("ＥＤ", "Edition"), ("4マチック", "4MATIC"), ("Ｓパッケージ", "S Package"), ("Lパッケージ", "L Package"),
 ("Cパッケージ", "C Package"), ("Gパッケージ", "G Package"), ("Zパッケージ", "Z Package"), ("4WD", "4WD"), ("e-POWER", "e-POWER"), ("eパワー", "e-POWER"), ("e-パワー", "e-POWER"),
 ("ナビ", "Navigation"), ("ワンオーナー", "One owner"), ("寒冷地", "Cold-climate spec"), ("パノラマルーフ", "Panoramic roof"), ("レーダークルーズ", "Radar cruise"),
 ("アドベンチャー", "Adventure"), ("オフロード", "Off-road"), ("ツートーンインテリア", "Two-tone interior"), ("ツートーン", "Two-tone"), ("インテリア", "Interior"), ("クロム", "Chrome"),
 ("ジャーニー", "Journey"), ("アピアランス", "Appearance"), ("ドライブ", "Drive"), ("リテイル", "Retail"), ("エクストラ", "Extra"), ("エアロツアラー", "Aero Tourer"), ("ワゴン", "Wagon"),
 ("プレステージ", "Prestige"), ("ノワール", "Noir"), ("ブラン", "Blanc"), ("グランド", "Grand"), ("ロング", "Long"), ("スーパーロング", "Super Long"), ("マスター", "Master"), ("ハイルーフ", "High roof"),
 ("モデューロ", "Modulo"), ("メイクアップ", "Makeup"), ("クロスター", "Crosstar"), ("コーディネート", "Coordinate"), ("ブレイク", "Break"), ("アクセント", "Accent"), ("マイ", "My"), ("ストライプス", "Stripes"), ("カンブス", "Canbus"), ("セオリー", "Theory"), ("ブースター", "Booster"), ("ジュニア", "Junior"), ("セダン", "Sedan"), ("クーペ", "Coupe"), ("リバティ", "Liberty"), ("ソリオ", "Solio"), ("ロードスター", "Roadster")]
COLOR = [("プレシャス", "Precious"), ("ブラック", "Black"), ("ホワイト", "White"), ("パール", "Pearl"), ("マイカ", "Mica"), ("メタリック", "Metallic"), ("クリスタル", "Crystal"), ("シャイン", "Shine"),
 ("グレー", "Grey"), ("シルバー", "Silver"), ("イエロー", "Yellow"), ("レッド", "Red"), ("ブルー", "Blue"), ("グリーン", "Green"), ("ブラウン", "Brown"), ("ベージュ", "Beige"), ("オレンジ", "Orange"),
 ("ゴールド", "Gold"), ("ピンク", "Pink"), ("パープル", "Purple"), ("ブロンズ", "Bronze"), ("プラチナ", "Platinum"), ("アティチュード", "Attitude"), ("アルピン", "Alpine"), ("ウォーム", "Warm"),
 ("ガンM", "Gun Metallic"), ("グラナイト", "Granite"), ("グラニト", "Granite"), ("クリアコート", "Clearcoat"), ("グラファイト", "Graphite"), ("ガラスフレーク", "Glass Flake"), ("サファイア", "Sapphire"),
 ("サンライズ", "Sunrise"), ("ジェット", "Jet"), ("スティング", "Sting"), ("ステルス", "Stealth"), ("スーパー", "Super"), ("スパークリング", "Sparkling"), ("ソニック", "Sonic"), ("クォーツ", "Quartz"),
 ("デジタル", "Digital"), ("ダイヤモンド", "Diamond"), ("マシーン", "Machine"), ("マシン", "Machine"), ("ソウル", "Soul"), ("エモーション", "Emotion"), ("スノーフレーク", "Snowflake"),
 ("ダーク", "Dark"), ("ライト", "Light"), ("ディープ", "Deep"), ("ミッドナイト", "Midnight"), ("アイス", "Ice"), ("セラミック", "Ceramic"), ("プラム", "Plum"), ("ワイン", "Wine"), ("モカ", "Mocha"),
 ("アーバン", "Urban"), ("カーキ", "Khaki"), ("オリーブ", "Olive"), ("ネイビー", "Navy"), ("ボルドー", "Bordeaux"), ("シャンパン", "Champagne"), ("チタニウム", "Titanium"), ("スチール", "Steel"),
 ("ポリメタル", "Polymetal"), ("マグネタイト", "Magnetite"), ("ラスター", "Lustre"), ("モデリスタ", "Modellista"), ("ツートン", "two-tone"), ("ルーフ", "roof"), ("ブリリアント", "Brilliant"),
 ("プレミアム", "Premium"), ("エメラルド", "Emerald"), ("セピア", "Sepia"), ("アッシュ", "Ash"), ("サンド", "Sand"), ("スレート", "Slate"), ("ジルコニア", "Zirconia"), ("フォレスト", "Forest"),
 ("マット", "Matt"), ("ノーブル", "Noble"), ("ロイヤル", "Royal"), ("ソリッド", "Solid"), ("レザー", "Leather"), ("オパール", "Opal"), ("ムーン", "Moon"), ("スノー", "Snow"), ("ストーン", "Stone"),
 ("トーン", "Tone"), ("ラディアント", "Radiant"), ("ファイア", "Fire"), ("フレア", "Flare"), ("レーシング", "Racing"), ("ダスク", "Dusk"), ("プレート", "Plate"), ("パノラマ", "Panorama"),
 ("フローズンバニラ", "Frozen Vanilla"), ("ナチュラルアイボリー", "Natural Ivory"), ("アイボリー", "Ivory"), ("アメジスト", "Amethyst"), ("シャイニング", "Shining"), ("ライトニング", "Lightning"), ("ピュア", "Pure"), ("サン", "Sun"),
 ("オーシャン", "Ocean"), ("ロジウム", "Rhodium"), ("シルキー", "Silky"), ("メタル", "Metal"), ("ミスト", "Mist"), ("クール", "Cool"), ("白", "White"), ("黒", "Black"), ("赤", "Red"), ("青", "Blue"),
 ("銀", "Silver"), ("灰", "Grey"), ("茶", "Brown"), ("紺", "Navy"), ("緑", "Green"), ("黄", "Yellow"), ("紫", "Purple"), ("金", "Gold"), ("桃", "Pink"), ("ライム", "Lime"), ("マルーン", "Maroon"),
 ("プリズム", "Prism"), ("ピュアホワイト", "Pure White"), ("レイク", "Lake"), ("ハーバー", "Harbour"), ("スカイ", "Sky"), ("アクア", "Aqua"), ("ターコイズ", "Turquoise"), ("テラ", "Terra"),
 ("コッパー", "Copper"), ("ノーヴァ", "Nova"), ("イリジウム", "Iridium"), ("トワイライト", "Twilight"), ("トワイ", "Twi"), ("ジルコン", "Zircon"), ("シリカ", "Silica"), ("カスケード", "Cascade"), ("ブライト", "Bright"), ("ナチュラル", "Natural"), ("ファイン", "Fine"), ("スムース", "Smooth"), ("デニム", "Denim"), ("ガンメタ", "Gunmetal"), ("ガン", "Gun"), ("アクティブ", "Active"), ("バーニング", "Burning"), ("ウッディ", "Woody"), ("オフ", "Off"), ("ブルーイッシュ", "Bluish"), ("グレーイッシュ", "Greyish"), ("イッシュ", "-ish"), ("ラベンダー", "Lavender"), ("ミント", "Mint"), ("ローズ", "Rose"), ("シャドー", "Shadow"), ("ナイト", "Night"), ("エボニー", "Ebony"), ("スターライト", "Starlight")]
HL = [("ワンオーナー", "One owner"), ("ワンオ-ナ-", "One owner"), ("1オーナー", "One owner"), ("登録済未使用車", "Registered, unused"), ("届出済未使用車", "Registered, unused"),
 ("純正12.3インチナビ", 'Factory 12.3" navigation'), ("純正12.3型ナビ", 'Factory 12.3" navigation'), ("純正10.5インチナビ", 'Factory 10.5" navigation'), ("純正9インチナビ", 'Factory 9" navigation'),
 ("9インチナビ", '9" navigation'), ("10インチナビ", '10" navigation'), ("純正DAナビ", "Factory display audio"), ("ディスプレイオーディオ", "Display audio"), ("純Dオーディオ", "Factory display audio"),
 ("純正ナビ", "Factory navigation"), ("社外ナビ", "Aftermarket navigation"), ("メモリーナビ", "Navigation"), ("SDナビ", "Navigation"), ("ナビ", "Navigation"),
 ("寒冷地", "Cold-climate spec"), ("パノラミックスライディングル-", "Panoramic sliding roof"), ("パノラマ・ガラスサンルーフ", "Panoramic glass roof"), ("パノラマガラスサンルーフ", "Panoramic glass roof"),
 ("パノラマルーフ", "Panoramic roof"), ("パノラマ", "Panoramic roof"), ("ムーンルーフ", "Moonroof"), ("Wサンルーフ", "Twin sunroof"), ("ツインムーンルーフ", "Twin moonroof"), ("サンルーフ", "Sunroof"),
 ("モデリスタ", "Modellista aero"), ("TRD", "TRD"), ("全方位カメラ", "360° camera"), ("全周囲カメラ", "360° camera"), ("アラウンドビュー", "360° camera"), ("パノラミックビュー", "360° camera"),
 ("360°カメラ", "360° camera"), ("バックカメラ", "Reversing camera"), ("Bカメラ", "Reversing camera"), ("後席モニター", "Rear-seat monitor"), ("後席M", "Rear-seat monitor"), ("フリップダウン", "Rear-seat monitor"),
 ("禁煙車", "Non-smoker"), ("禁煙", "Non-smoker"), ("赤色レザーシート", "Red leather seats"), ("革シート", "Leather seats"), ("黒本革", "Black leather"), ("本革", "Leather"), ("ハーフレザー", "Half leather"),
 ("リフトキット", "Lift kit"), ("リフトアップ", "Lift kit"), ("前後ソナー", "Front & rear sonar"), ("フルセグTV", "Digital TV"), ("フルセグ", "Digital TV"), ("衝突軽減", "Collision mitigation"),
 ("衝突被害軽減", "Collision mitigation"), ("クルコン", "Cruise control"), ("レーダークルーズ", "Radar cruise"), ("デジタルミラー", "Digital mirror"), ("デジタルインナーミラー", "Digital mirror"),
 ("電動リア", "Power tailgate"), ("パワーバックドア", "Power tailgate"), ("両側Pスラ", "Twin power sliding doors"), ("両側パワースライド", "Twin power sliding doors"), ("両側電動", "Twin power sliding doors"),
 ("片側電動", "Power sliding door"), ("スポーツクロノPKG", "Sport Chrono package"), ("マクレビ", "Mark Levinson audio"), ("ACC", "Adaptive cruise"), ("BSM", "Blind-spot monitor"), ("HUD", "Head-up display"),
 ("ヘッドアップディスプレイ", "Head-up display"), ("PBD", "Power tailgate"), ("Apple CarPlay", "CarPlay"), ("Applecarplay", "CarPlay"), ("CarPlay", "CarPlay"), ("JBL", "JBL audio"), ("ETC2.0", "ETC 2.0"),
 ("ETC", "ETC"), ("LEDヘッドライト", "LED headlights"), ("LEDライト", "LED lights"), ("LED", "LED lights"), ("4WD", "4WD"), ("プロパイロット", "ProPILOT"), ("セーフティセンス", "Safety Sense"),
 ("ホンダセンシング", "Honda SENSING"), ("アイサイト", "EyeSight"), ("シートヒーター", "Heated seats"), ("パワーシート", "Power seats"), ("スマートキー", "Smart key"), ("ドラレコ", "Dash cam"),
 ("ドライブレコーダー", "Dash cam"), ("オットマン", "Ottoman seats"), ("3列シート", "Three rows"), ("7人乗り", "7 seats"), ("8人乗り", "8 seats"), ("ディーゼル", "Diesel"), ("ターボ", "Turbo"),
 ("MT", "Manual"), ("6MT", "6-speed manual"), ("5MT", "5-speed manual"), ("車検整備付", "Inspection included"), ("低走行", "Low mileage"), ("ワンセグ", "TV"), ("アルミ", "Alloy wheels"),
 ("AW", "Alloy wheels"), ("スペアキー", "Spare key"), ("記録簿", "Service records"), ("新車保証", "Maker warranty")]
EQ = {"スマートキー": "Smart key", "ターボ/スーパーチャージャー": "Turbo / supercharger", "クルーズコントロール": "Cruise control", "スペアキー": "Spare key", "シートヒーター": "Heated seats",
 "プッシュスタート": "Push-button start", "パワーシート": "Power seats", "シートエアコン": "Ventilated seats", "ナビ": "Navigation", "TV": "TV", "バックカメラ": "Reversing camera",
 "全周囲カメラ": "360° camera", "後席モニター": "Rear-seat monitor", "USB入力端子": "USB input", "Bluetooth接続": "Bluetooth", "ETC": "ETC toll unit", "ドライブレコーダー": "Dash cam",
 "スライドドア": "Sliding doors", "サンルーフ": "Sunroof", "イージークローザー": "Soft-close doors", "ハーフレザーシート": "Half-leather seats", "電動リアゲート": "Power tailgate",
 "ベンチシート": "Bench seat", "フルフラット": "Fully flat seats", "オットマン": "Ottoman seats", "パワースライドドア": "Power sliding doors", "アルミホイール": "Alloy wheels",
 "エアロパーツ": "Aero parts", "ルーフレール": "Roof rails", "衝突被害軽減システム": "Collision-mitigation braking", "AFS": "Adaptive front lighting", "レーンアシスト": "Lane assist",
 "運転席・助手席エアバッグ": "Front airbags", "サイドエアバッグ": "Side airbags", "ABS": "ABS", "横滑り防止装置": "Stability control", "HID(キセノンライト)": "HID headlights",
 "LEDヘッドライト": "LED headlights", "オートハイビーム": "Auto high beam"}
CAT = [("Comfort", ["スマートキー", "ターボ/スーパーチャージャー", "クルーズコントロール", "スペアキー", "シートヒーター", "プッシュスタート", "パワーシート", "シートエアコン"]),
 ("Navigation & audio", ["ナビ", "TV", "バックカメラ", "全周囲カメラ", "後席モニター", "USB入力端子", "Bluetooth接続"]),
 ("Interior", ["ETC", "ドライブレコーダー", "スライドドア", "サンルーフ", "イージークローザー", "ハーフレザーシート", "電動リアゲート", "ベンチシート", "フルフラット", "オットマン", "パワースライドドア"]),
 ("Exterior", ["アルミホイール", "エアロパーツ", "ルーフレール"]),
 ("Safety", ["衝突被害軽減システム", "AFS", "レーンアシスト", "運転席・助手席エアバッグ", "サイドエアバッグ", "ABS", "横滑り防止装置", "HID(キセノンライト)", "LEDヘッドライト", "オートハイビーム"])]
PREF = {"道央・札幌": "Hokkaido", "道南": "Hokkaido", "道北": "Hokkaido", "道東": "Hokkaido", "北海道": "Hokkaido", "青森県": "Aomori", "岩手県": "Iwate", "宮城県": "Miyagi", "秋田県": "Akita",
 "山形県": "Yamagata", "福島県": "Fukushima", "茨城県": "Ibaraki", "栃木県": "Tochigi", "群馬県": "Gunma", "埼玉県": "Saitama", "千葉県": "Chiba", "東京都": "Tokyo", "神奈川県": "Kanagawa",
 "新潟県": "Niigata", "富山県": "Toyama", "石川県": "Ishikawa", "福井県": "Fukui", "山梨県": "Yamanashi", "長野県": "Nagano", "岐阜県": "Gifu", "静岡県": "Shizuoka", "愛知県": "Aichi",
 "三重県": "Mie", "滋賀県": "Shiga", "京都府": "Kyoto", "大阪府": "Osaka", "兵庫県": "Hyogo", "奈良県": "Nara", "和歌山県": "Wakayama", "鳥取県": "Tottori", "島根県": "Shimane",
 "岡山県": "Okayama", "広島県": "Hiroshima", "山口県": "Yamaguchi", "徳島県": "Tokushima", "香川県": "Kagawa", "愛媛県": "Ehime", "高知県": "Kochi", "福岡県": "Fukuoka", "佐賀県": "Saga",
 "長崎県": "Nagasaki", "熊本県": "Kumamoto", "大分県": "Oita", "宮崎県": "Miyazaki", "鹿児島県": "Kagoshima", "沖縄県": "Okinawa"}
TRANS = {"FAT": "Automatic", "CAT": "Automatic", "IAT": "Automatic", "CVT": "CVT", "AT": "Automatic", "6F": "6-speed manual", "5F": "5-speed manual", "4F": "4-speed manual",
         "6MT": "6-speed manual", "5MT": "5-speed manual", "MT": "Manual", "AGS": "Automated manual", "DCT": "Dual-clutch automatic"}
FUEL = {"ガソリン": "Petrol", "ハイブリッド": "Hybrid", "軽油": "Diesel", "電気": "Electric", "LPG": "LPG", "水素": "Hydrogen"}
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MINIVAN = {"alphard", "alphardhybrid", "vellfire", "vellfirehybrid", "voxy", "voxyhybrid", "noah", "noahhybrid", "esquire", "estima", "sienta", "hiacewagon", "hiacevan", "granace", "lm",
           "stepwgn", "stepwgnspada", "freed", "freedplus", "odyssey", "serena", "elgrand", "caravan", "delicad5", "landy", "nv200vanette"}
SPORTS = {"86", "gr86", "supra", "gryaris", "fairladyz", "gtr", "skyline", "roadster", "roadsterrf", "brz", "wrxsti", "wrxs4", "civictyper", "copen", "s660", "rc", "lc", "swiftsport"}
SEDAN = {"crown", "crownhybrid", "camry", "corolla", "prius", "priusphv", "mirai", "is", "es", "ls", "accord", "civic", "insight", "mazda3sedan", "mazda6sedan", "legacyb4", "centurysedan"}
SMALL = {"aqua", "yaris", "fit", "note", "noteaura", "march", "swift", "mazda2", "passo", "roomy", "thor", "raize", "rocky", "ignis", "solio", "xbee", "leaf", "sakura", "dayz", "roox", "nbox",
         "nboxcustom", "nwgn", "none", "tanto", "tantocustom", "move", "movecanbus", "mira", "miraeis", "cast", "wake", "taft", "hustler", "spacia", "spaciacustom", "spaciagear", "spaciabase", "wagonr", "wagonrsmile",
         "alto", "lapin", "every", "everywagon", "jimny", "ekcross", "ekwagon", "ekspace", "delicamini", "atrai", "flair", "rex", "nvan", "minicab", "hijettruck", "porte", "ct", "ux", "lbx"}

def tr(s, table):
    s = N(s)
    for a, b in sorted(table, key=lambda t: -len(t[0])):
        s = s.replace(a, " " + b + " ")
    return re.sub(r"\s+", " ", s).strip()

def tcolor(s):
    s = tr(s, COLOR)
    s = re.sub(r"\bP\b", "Pearl", s)
    s = re.sub(r"\bM\b", "Metallic", s)
    s = re.sub(r"\s*/\s*", " / ", s)
    return re.sub(r"\s+", " ", s).strip()

def thighlights(s, color):
    s = N(s or "")
    if color:
        s = s.replace(N(color), "")
    s = s.replace("/", " ")
    toks = []
    for a, b in HL:
        if a in s:
            s = s.replace(a, " \x00%d\x00 " % len(toks)); toks.append(b)
    out = []
    for m in re.finditer(r"\x00(\d+)\x00", s):
        t = toks[int(m.group(1))]
        if t not in out:
            out.append(t)
    return out[:6]

def km(s):
    s = N(s); m = re.match(r"([\d.]+)(万|千)?km", s)
    if not m:
        return None
    v = float(m.group(1)); return int(round(v * (10000 if m.group(2) == "万" else 1000 if m.group(2) == "千" else 1)))

def year(s):
    m = re.match(r"(\d{4})", N(s or "")); return int(m.group(1)) if m else None

def insp(s):
    s = N(s or ""); m = re.match(r"(\d{4})\(.*?\)年(\d{1,2})月", s)
    return f"{MON[int(m.group(2)) - 1]} {m.group(1)}" if m else "Expired / not included"

def slug_name(slug):
    if slug in MODEL:
        return MODEL[slug]
    s = re.sub(r"hybrid$", " Hybrid", slug)
    return s[:1].upper() + s[1:]

def size_key(slug):
    if slug in MINIVAN: return "minivan"
    if slug in SPORTS: return "sports"
    if slug in SEDAN: return "sedan"
    if slug in SMALL: return "small"
    return "suv"

# ---------------------------------------------------------------- scrape
def parse_detail(url, s, thumb):
    L = textlines(s)
    prod = next((x for x in ldjson(s) if x.get("@type") == "Product"), {})
    crumbs = next((x for x in ldjson(s) if x.get("@type") == "BreadcrumbList"), {}).get("itemListElement", [])
    jp_model = None
    for c in crumbs:
        nm = c.get("name", "")
        if nm.endswith("の中古車") and c.get("position") == 4:
            jp_model = nm[: -len("の中古車")]
    parts = url.rstrip("/").split("/")
    make_slug, model_slug = parts[-3], parts[-2]
    cid = parts[-1].replace("detail_", "")

    def one(label):
        for i, x in enumerate(L):
            if x == label and i + 1 < len(L):
                return L[i + 1]
        return None

    def man(label):
        for i, x in enumerate(L):
            if x.startswith(label):
                seg = L[i:i + 8]
                nums = [y for y in seg if re.fullmatch(r"\d+|\.\d+", y)]
                if nums:
                    v = "".join(nums[:2]) if len(nums) > 1 and nums[1].startswith(".") else nums[0]
                    return round(float(v) * 10000)
        return None

    def rating(label):
        for i, x in enumerate(L):
            if x == label:
                for y in L[i + 1:i + 6]:
                    if re.fullmatch(r"\d(\.\d)?", y):
                        return float(y)
        return None

    title2 = None
    for i, x in enumerate(L):
        if x.startswith("お問い合わせID"):
            title2 = L[i - 1]; break
    store = None
    for i, x in enumerate(L):
        if x.startswith("来店予約店舗") and i + 1 < len(L):
            store = L[i + 1]; break
    imgs = sorted(set(re.findall(r"https://221616\.com/media/car-i/img/thumb/0640x0480/[0-9]+/[0-9A-Z]+/" + cid + r"[A-Z]{2}\d{3}(?:_[A-Z0-9_]+)?\.JPG", s)))
    order = {"LF": 0, "RR": 1, "IN": 2, "SP": 3}
    imgs.sort(key=lambda u: (order.get(re.search(cid + r"([A-Z]{2})", u).group(1), 9), u))
    if not imgs and thumb:
        imgs = [thumb]
    size = []
    for i, x in enumerate(L):
        if x == "サイズ":
            size = L[i + 1:i + 7]; break
    def sz(k):
        for i, x in enumerate(size):
            if x.startswith(k) and i + 1 < len(size):
                return size[i + 1]
    equip = {m.group(1): m.group(2) == "あり" for m in re.finditer(r'aria-label="([^"]+):(あり|なし)"', s)}
    eq = {cat: [EQ[k] for k in keys if equip.get(k)] for cat, keys in CAT}

    name = N(prod.get("name") or "")
    grade = name
    if jp_model and name.startswith(N(jp_model)):
        grade = name[len(N(jp_model)):].strip()
    grade = tr(grade, TERMS)
    color = tcolor(prod.get("color") or "")
    pref = None
    m = re.search(r"\(([^)]+)\)", store or "")
    if m:
        pref = PREF.get(m.group(1), None)
    seats = one("定員")
    disp = one("排気量")
    return dict(
        id=cid, make=BRAND.get(N(prod.get("brand", {}).get("name")), slug_name(make_slug)), model=slug_name(model_slug), modelSlug=model_slug,
        grade=grade, year=year(one("年式")), km=km(one("走行距離") or ""),
        priceTotal=man("支払総額") or prod.get("offers", {}).get("price"), priceVehicle=man("車両価格"), priceFees=man("諸費用"),
        color=color, modelCode=prod.get("productId"), drive=one("駆動方式"), transmission=TRANS.get(one("ミッション"), one("ミッション")),
        fuel=FUEL.get(one("使用燃料"), one("使用燃料")), displacement=disp, weight=one("車両重量"), turning=one("最小回転半径"),
        dims=(f"{sz('全長')} × {sz('全幅')} × {sz('全高')}" if sz("全長") else None),
        seats=int(re.match(r"\d+", N(seats)).group(0)) if seats and re.match(r"\d+", N(seats)) else None,
        handle="Right-hand drive" if one("ハンドル") == "右" else "Left-hand drive", inspection=insp(one("車検")),
        repair="No accident / repair history" if one("修復歴") == "なし" else "Repair history declared",
        extRating=rating("外装評価点"), intRating=rating("内装評価点"), records=one("定期点検整備記録簿") == "あり", rental=one("レンタカー歴") == "あり",
        storeBrand="LIBERALA" if (store or "").startswith("LIBERALA") else "Gulliver", storePref=pref,
        highlights=thighlights(title2, prod.get("color")), equipment=eq, images=imgs[:10], thumb=thumb, sourceUrl=url, sizeKey=size_key(model_slug))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=3)
    ap.add_argument("--out", default="js/catalog-data.js")
    ap.add_argument("--search", default=SEARCH)
    ap.add_argument("--per-make", type=int, default=0,
                    help="instead of paging the combined search, take the first N listings of each make in the search slug "
                         "(e.g. 12 → ~108 listings across nine makes), so every make is represented")
    a = ap.parse_args()
    cars, seen = [], set()

    def list_pages():
        """yield (list_url, max_items) for every list page to walk"""
        if a.per_make:
            m = re.search(r"/search/([a-z_]+)/(.*)$", a.search)
            makes, tail = (m.group(1).split("_"), m.group(2)) if m else ([], "")
            for mk in makes:
                yield BASE + "/search/" + mk + "/" + tail, a.per_make
        else:
            for p in range(1, a.pages + 1):
                yield (a.search if p == 1 else a.search + f"pageNo-{p}/"), 10 ** 6

    for url, cap in list_pages():
        try:
            lst = fetch(url)
        except Exception as e:
            print("list page failed:", url, e, file=sys.stderr); continue
        items = next((x for x in ldjson(lst) if x.get("@type") == "ItemList"), {}).get("itemListElement", [])
        taken = 0
        for it in items:
            if taken >= cap:
                break
            if it["identifier"] in seen:
                continue
            seen.add(it["identifier"])
            taken += 1
            thumb = (it.get("image") or [{}])[0].get("url")
            try:
                d = fetch(it["url"])
                car = parse_detail(it["url"], d, thumb)
                if car["priceTotal"] and car["year"]:
                    cars.append(car)
                    print(car["id"], car["make"], car["model"], "|", car["grade"], "|", car["priceTotal"], file=sys.stderr)
            except Exception as e:
                print("detail failed:", it["url"], e, file=sys.stderr)
    if len(cars) < 10:
        print("too few listings parsed; keeping the previous file", file=sys.stderr); sys.exit(1)
    data = {"generatedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "sourceUrl": a.search,
            "sourceName": "221616.com (Gulliver)", "cars": cars}
    js = ("/* =========================================================================\n"
          "   js/catalog-data.js — CATALOGUE data, generated by tools/catalog_scrape.py\n"
          f"   {data['generatedAt']} · {len(cars)} listings · Japanese makes, ¥1M–¥10M\n"
          "   Mirrored from public search results on 221616.com for a private\n"
          "   portfolio demonstration; photos are hot-linked. Do not edit by hand.\n"
          "   ========================================================================= */\n"
          "window.SAE_CATALOG = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"wrote {a.out}: {len(cars)} listings", file=sys.stderr)

if __name__ == "__main__":
    main()
