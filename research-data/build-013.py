"""Build the public 013 index and verified category observations.

Usage: python3 research-data/build-013.py /path/to/013.zip
The source ZIP and editable observation CSV remain local research material.
"""

import csv
import json
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "research-data"
ZIP = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    Path.home() / "Downloads" / "AIGC_交付Codex_013_市场类目优先_20_101_569全量评估.zip"
)


def write_js(name, variable, data):
    (ROOT / name).write_text(
        f"window.{variable}=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )


with zipfile.ZipFile(ZIP) as bundle:
    source = json.loads(bundle.read("codex_013_category_first.json"))
    archive = RESEARCH / "batch-013"
    archive.mkdir(exist_ok=True)
    for filename in bundle.namelist():
        (archive / filename).write_bytes(bundle.read(filename))

catalog_text = (ROOT / "catalog-data.js").read_text(encoding="utf-8")
catalog = json.loads(catalog_text.removeprefix("window.CATALOG=").rstrip(";\n"))
by_id = {row["id"]: row for row in catalog if row["status"] == "候选"}
products = source["products"]
categories = source["categories"]
markets = source["markets"]
assert (len(by_id), len(products), len(categories), len(markets)) == (569, 569, 101, 20)
assert len({row["product_id"] for row in products}) == 569
assert len({row["中类ID"] for row in categories}) == 101
category_ids = {row["中类ID"] for row in categories}
for row in products:
    current = by_id[row["product_id"]]
    assert row["中类ID"] in category_ids
    assert (row["具体项目"], row["细分类目"], row["一级市场"]) == (
        current["name"], current["scene"], current["market"].split("｜", 1)[1]
    ), row["product_id"]

public = {
    "version": "013",
    "date": source["date"],
    "markets": markets,
    "categories": categories,
    "products": [
        {"id": row["product_id"], "categoryId": row["中类ID"]}
        for row in products
    ],
    "sources": source["sources"],
}
write_js("category-013-data.js", "CATEGORY_013", public)

ledger = RESEARCH / "类目证据记录.csv"
headers = [
    "类目ID", "指标", "评分0到5", "核验状态", "原始观测", "数值", "单位", "平台或渠道",
    "商品或卖家", "统计起日", "统计止日", "核验日期", "来源URL", "证据限制", "去重组", "负责人", "评分规则ID", "复核人", "公开展示",
]
if ledger.exists():
    with ledger.open(encoding="utf-8-sig", newline="") as handle:
        old=list(csv.DictReader(handle))
    if not old:
        ledger.unlink()  # Keep the initial empty template in sync with the schema.
if not ledger.exists():
    with ledger.open("w", encoding="utf-8-sig", newline="") as handle:
        csv.writer(handle).writerow(headers)

test_ledger = RESEARCH / "四天测试记录.csv"
if not test_ledger.exists():
    with test_ledger.open("w", encoding="utf-8-sig", newline="") as handle:
        csv.writer(handle).writerow([
            "商品ID", "类目ID", "测试日期", "渠道", "样片或发布记录", "展示量", "主页访问",
            "私信数", "有效Q数", "接受报价I数", "定金笔数", "完整付款笔数", "实收元",
            "模型成本元", "人工分钟", "沟通分钟", "返工分钟", "获客费用元", "退款元",
            "去重订单组", "原始记录位置", "客户信息已脱敏", "记录人", "复核人",
        ])

seller_ledger = RESEARCH / "卖家商品观测.csv"
if not seller_ledger.exists():
    with seller_ledger.open("w", encoding="utf-8-sig", newline="") as handle:
        csv.writer(handle).writerow([
            "类目ID", "商品ID", "平台", "卖家去重ID", "商品页URL", "目标付款人", "交付规格",
            "标价", "标价单位", "平台显示近30天销量", "平台显示近90天销量", "累计销量",
            "上架日期", "观察日期", "原页截图位置", "来源等级", "销量口径限制",
            "是否同一订单组", "核查人", "复核人",
        ])

records = []
with ledger.open(encoding="utf-8-sig", newline="") as handle:
    for row in csv.DictReader(handle):
        if not row["类目ID"] or row.get("公开展示")!="是":
            continue
        assert row["类目ID"] in category_ids, row["类目ID"]
        records.append(row)
write_js("category-observations.js", "CATEGORY_OBSERVATIONS", records)
print(f"013: {len(markets)} markets, {len(categories)} categories, {len(products)} products, {len(records)} observations")
