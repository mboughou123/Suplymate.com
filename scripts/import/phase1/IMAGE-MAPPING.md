# Phase-1 supplier media mapping

Local files live under `public/images/suppliers/phase1/<category>/`.
CSV `images` / `imageUrl` use site-root paths (`/images/suppliers/phase1/...`).
Remote photo URLs are used only when a supplier has no enhanced JPG.

- Suppliers in CSV: **59**
- Enhanced JPGs committed: **113**
- Suppliers with >=1 local image: **56**
- Suppliers with no local image: **3**

## Category folder map

| CSV / site category | Folder |
|---|---|
| Tubes & Pipes | `tube-pipes` |
| Steel & Metals | `steel-metals` |
| Cables & Electrical | `cables-electrical` |
| Construction | `construction` |
| Industrial Parts | `industrial-parts` |
| Packaging | `packaging` |

CSV `Tube & Pipes` is normalized to site category `Tubes & Pipes`.

## Known gaps (empty local galleries)

- Ajmal Steel Tubes & Pipes Industries LLC (AJ Steel)
- Magicrete Building Solutions Private Limited
- Tong Ming Enterprise (Zhejiang) Co., Ltd.

AJ Steel mill photos and Tong Ming mill photos were never enhanced (logo-only / skipped).
Magicrete has no enhanced mill stills in this pack.
Construction tata-steel-night.jpg is mapped to Tata Steel (Steel & Metals); Construction Tata duplicate was dropped.
Jingye uses Pingshan (Hebei) stills only; British Steel / Scunthorpe backups were not imported.

## Per-supplier files

| Supplier | Site category | Slug | Local images |
|---|---|---|---|
| Al Gharbia Pipe Company LLC | Tubes & Pipes | `al-gharbia-pipe-company-llc` | `/images/suppliers/phase1/tube-pipes/al-gharbia-pipe-factory-1.jpg`<br>`/images/suppliers/phase1/tube-pipes/al-gharbia-pipe-factory-2.jpg`<br>`/images/suppliers/phase1/tube-pipes/al-gharbia-pipe-factory-3.jpg`<br>`/images/suppliers/phase1/tube-pipes/al-gharbia-prod-1.jpg`<br>`/images/suppliers/phase1/tube-pipes/al-gharbia-prod-2.jpg`<br>`/images/suppliers/phase1/tube-pipes/al-gharbia-prod-3.jpg`<br>`/images/suppliers/phase1/tube-pipes/al-gharbia-prod-5.jpg`<br>`/images/suppliers/phase1/tube-pipes/al-gharbia-production-banner.jpg` |
| Ajmal Steel Tubes & Pipes Industries LLC (AJ Steel) | Tubes & Pipes | `ajmal-steel-tubes-pipes-industries-llc-aj-steel` | (none) |
| Jindal SAW Limited | Tubes & Pipes | `jindal-saw-limited` | `/images/suppliers/phase1/tube-pipes/jindal-saw-hsaw.jpg`<br>`/images/suppliers/phase1/tube-pipes/jindal-saw-lsaw.jpg`<br>`/images/suppliers/phase1/tube-pipes/jindal-saw-pipe.jpg` |
| Welspun Corp Limited | Tubes & Pipes | `welspun-corp-limited` | `/images/suppliers/phase1/tube-pipes/welspun-corp-factory-1.jpg`<br>`/images/suppliers/phase1/tube-pipes/welspun-corp-factory-2.jpg` |
| Arabian Pipes Company | Tubes & Pipes | `arabian-pipes-company` | `/images/suppliers/phase1/tube-pipes/arabian-pipes-factory.jpg`<br>`/images/suppliers/phase1/tube-pipes/arabian-pipes-product.jpg` |
| APL Apollo Tubes Limited | Tubes & Pipes | `apl-apollo-tubes-limited` | `/images/suppliers/phase1/tube-pipes/apl-apollo-raipur-1.jpg`<br>`/images/suppliers/phase1/tube-pipes/apl-apollo-raipur-2.jpg`<br>`/images/suppliers/phase1/tube-pipes/apl-apollo-raipur-3.jpg`<br>`/images/suppliers/phase1/tube-pipes/apl-apollo-raipur-4.jpg` |
| Man Industries (India) Limited | Tubes & Pipes | `man-industries-india-limited` | `/images/suppliers/phase1/tube-pipes/man-industries-hsaw.jpg`<br>`/images/suppliers/phase1/tube-pipes/man-industries-lsaw.jpg` |
| Hebei Huayang Steel Pipe Co., Ltd. | Tubes & Pipes | `hebei-huayang-steel-pipe-co-ltd` | `/images/suppliers/phase1/tube-pipes/hebei-huayang-factory.jpg` |
| Al Jazeera Steel Products Co. SAOG | Tubes & Pipes | `al-jazeera-steel-products-co-saog` | `/images/suppliers/phase1/tube-pipes/al-jazeera-steel-factory.jpg`<br>`/images/suppliers/phase1/tube-pipes/al-jazeera-steel-quality.jpg` |
| Ratnamani Metals & Tubes Limited | Tubes & Pipes | `ratnamani-metals-tubes-limited` | `/images/suppliers/phase1/tube-pipes/ratnamani-factory.jpg`<br>`/images/suppliers/phase1/tube-pipes/ratnamani-product-carbonsteel.jpg` |
| EMSTEEL Building Materials PJSC (EMSTEEL) | Steel & Metals | `emsteel-building-materials-pjsc-emsteel` | `/images/suppliers/phase1/steel-metals/emsteel-company.jpg`<br>`/images/suppliers/phase1/steel-metals/emsteel-product.jpg` |
| Ferrite Structural Steels Private Limited | Steel & Metals | `ferrite-structural-steels-private-limited` | `/images/suppliers/phase1/steel-metals/ferrite-structural-banner.jpg`<br>`/images/suppliers/phase1/steel-metals/ferrite-structural-home.jpg` |
| Qatar Steel Company (Q.P.S.C.) | Steel & Metals | `qatar-steel-company-q-p-s-c` | `/images/suppliers/phase1/steel-metals/qatar-steel-billets.jpg`<br>`/images/suppliers/phase1/steel-metals/qatar-steel-rebars.jpg` |
| JSW Steel Limited | Steel & Metals | `jsw-steel-limited` | `/images/suppliers/phase1/steel-metals/jsw-steel-vijayanagar-1.jpg`<br>`/images/suppliers/phase1/steel-metals/jsw-steel-vijayanagar-2.jpg` |
| Saudi Iron and Steel Company (Hadeed) | Steel & Metals | `saudi-iron-and-steel-company-hadeed` | `/images/suppliers/phase1/steel-metals/hadeed-module-e-htc.jpg`<br>`/images/suppliers/phase1/steel-metals/hadeed-module-e.jpg` |
| Tata Steel Limited | Steel & Metals | `tata-steel-limited` | `/images/suppliers/phase1/steel-metals/tata-steel-factory-1.jpg`<br>`/images/suppliers/phase1/steel-metals/tata-steel-factory-2.jpg`<br>`/images/suppliers/phase1/steel-metals/tata-steel-night.jpg` |
| Jingye Steel (Jingye Group) | Steel & Metals | `jingye-steel-jingye-group` | `/images/suppliers/phase1/steel-metals/jingye-pingshan-aerial.jpg`<br>`/images/suppliers/phase1/steel-metals/jingye-pingshan-rolling.jpg` |
| Rashtriya Ispat Nigam Limited (RINL / Vizag Steel) | Steel & Metals | `rashtriya-ispat-nigam-limited-rinl-vizag-steel` | `/images/suppliers/phase1/steel-metals/rinl-vizag-plant.jpg` |
| Jindal Steel Limited (formerly Jindal Steel & Power Limited) | Steel & Metals | `jindal-steel-limited-formerly-jindal-steel-power-limited` | `/images/suppliers/phase1/steel-metals/jindal-steel-beam.jpg`<br>`/images/suppliers/phase1/steel-metals/jindal-steel-tmt.jpg` |
| Ezz Steel | Steel & Metals | `ezz-steel` | `/images/suppliers/phase1/steel-metals/ezz-steel-suez.jpg` |
| Foliflex Cables (India) Private Limited | Cables & Electrical | `foliflex-cables-india-private-limited` | `/images/suppliers/phase1/cables-electrical/foliflex-1.jpg`<br>`/images/suppliers/phase1/cables-electrical/foliflex-2.jpg` |
| KEI Industries Limited | Cables & Electrical | `kei-industries-limited` | `/images/suppliers/phase1/cables-electrical/kei-1.jpg`<br>`/images/suppliers/phase1/cables-electrical/kei-2.jpg` |
| Polycab India Limited | Cables & Electrical | `polycab-india-limited` | `/images/suppliers/phase1/cables-electrical/polycab-1.jpg`<br>`/images/suppliers/phase1/cables-electrical/polycab-2.jpg` |
| R R Kabel Limited | Cables & Electrical | `r-r-kabel-limited` | `/images/suppliers/phase1/cables-electrical/rr-kabel-1.jpg`<br>`/images/suppliers/phase1/cables-electrical/rr-kabel-2.jpg` |
| Jiangsu Yuhui Cable Co., Ltd. | Cables & Electrical | `jiangsu-yuhui-cable-co-ltd` | `/images/suppliers/phase1/cables-electrical/jiangsu-yuhui-1.jpg`<br>`/images/suppliers/phase1/cables-electrical/jiangsu-yuhui-2.jpg` |
| Shanghai Shenghua Cable (Group) Co., Ltd. | Cables & Electrical | `shanghai-shenghua-cable-group-co-ltd` | `/images/suppliers/phase1/cables-electrical/shenghua-2.jpg` |
| XWA Power & Cable Co., Ltd. | Cables & Electrical | `xwa-power-cable-co-ltd` | `/images/suppliers/phase1/cables-electrical/xwa-1.jpg`<br>`/images/suppliers/phase1/cables-electrical/xwa-2.jpg` |
| Henan Huadong Cable Co., Ltd. | Cables & Electrical | `henan-huadong-cable-co-ltd` | `/images/suppliers/phase1/cables-electrical/huadong-1.jpg`<br>`/images/suppliers/phase1/cables-electrical/huadong-2.jpg` |
| Shandong New Luxing Cable Co., Ltd. | Cables & Electrical | `shandong-new-luxing-cable-co-ltd` | `/images/suppliers/phase1/cables-electrical/luxing-1.jpg`<br>`/images/suppliers/phase1/cables-electrical/luxing-2.jpg` |
| People's Cable Group Co., Ltd. | Cables & Electrical | `people-s-cable-group-co-ltd` | `/images/suppliers/phase1/cables-electrical/peoples-cable-1.jpg`<br>`/images/suppliers/phase1/cables-electrical/peoples-cable-2.jpg` |
| UltraTech Cement Limited | Construction | `ultratech-cement-limited` | `/images/suppliers/phase1/construction/ultratech-cement-jafrabad-1.jpg`<br>`/images/suppliers/phase1/construction/ultratech-cement-jafrabad-2.jpg` |
| CEMEX, S.A.B. de C.V. | Construction | `cemex-s-a-b-de-c-v` | `/images/suppliers/phase1/construction/cemex-rugby-works.jpg` |
| Anhui Conch Cement Company Limited | Construction | `anhui-conch-cement-company-limited` | `/images/suppliers/phase1/construction/anhui-conch-qixia.jpg` |
| Heidelberg Materials AG | Construction | `heidelberg-materials-ag` | `/images/suppliers/phase1/construction/heidelberg-ennigerloh.jpg`<br>`/images/suppliers/phase1/construction/heidelberg-hannover.jpg` |
| Commercial Metals Company | Construction | `commercial-metals-company` | `/images/suppliers/phase1/construction/cmc-fab.jpg`<br>`/images/suppliers/phase1/construction/cmc-rebar.jpg` |
| Vulcan Materials Company | Construction | `vulcan-materials-company` | `/images/suppliers/phase1/construction/vulcan-medina.jpg`<br>`/images/suppliers/phase1/construction/vulcan-miami-quarry.jpg` |
| Zamil Steel Pre-Engineered Buildings Co. Ltd. | Construction | `zamil-steel-pre-engineered-buildings-co-ltd` | `/images/suppliers/phase1/construction/zamil-steel-factory-aerial.jpg`<br>`/images/suppliers/phase1/construction/zamil-steel-manufacturing.jpg` |
| Magicrete Building Solutions Private Limited | Construction | `magicrete-building-solutions-private-limited` | (none) |
| Hangxiao Steel Structure (Shandong) Co., Ltd. | Construction | `hangxiao-steel-structure-shandong-co-ltd` | `/images/suppliers/phase1/construction/hangxiao-steel-1.jpg`<br>`/images/suppliers/phase1/construction/hangxiao-steel-2.jpg` |
| Chaoda Valves Group Co., Ltd. | Industrial Parts | `chaoda-valves-group-co-ltd` | `/images/suppliers/phase1/industrial-parts/chaoda-1.jpg`<br>`/images/suppliers/phase1/industrial-parts/chaoda-2.jpg`<br>`/images/suppliers/phase1/industrial-parts/chaoda-3.jpg`<br>`/images/suppliers/phase1/industrial-parts/chaoda-4.jpg` |
| Neway Valve (Suzhou) Co., Ltd. | Industrial Parts | `neway-valve-suzhou-co-ltd` | `/images/suppliers/phase1/industrial-parts/neway-1.jpg` |
| Leo Group Pump (Zhejiang) Co., Ltd. | Industrial Parts | `leo-group-pump-zhejiang-co-ltd` | `/images/suppliers/phase1/industrial-parts/leo-pump-1.jpg`<br>`/images/suppliers/phase1/industrial-parts/leo-pump-2.jpg` |
| Nanfang Pump Industry Co., Ltd. | Industrial Parts | `nanfang-pump-industry-co-ltd` | `/images/suppliers/phase1/industrial-parts/nanfang-1.jpg` |
| Zhejiang Zhiju Pipeline Industry Co., Ltd. | Industrial Parts | `zhejiang-zhiju-pipeline-industry-co-ltd` | `/images/suppliers/phase1/industrial-parts/zhiju-1.jpg`<br>`/images/suppliers/phase1/industrial-parts/zhiju-2.jpg` |
| Wafangdian Bearing Group Corp., Ltd. | Industrial Parts | `wafangdian-bearing-group-corp-ltd` | `/images/suppliers/phase1/industrial-parts/zwz-1.jpg`<br>`/images/suppliers/phase1/industrial-parts/zwz-2.jpg` |
| Luoyang Huigong Bearing Technology Co., Ltd. | Industrial Parts | `luoyang-huigong-bearing-technology-co-ltd` | `/images/suppliers/phase1/industrial-parts/huigong-2.jpg` |
| Tong Ming Enterprise (Zhejiang) Co., Ltd. | Industrial Parts | `tong-ming-enterprise-zhejiang-co-ltd` | (none) |
| Sundram Fasteners Limited | Industrial Parts | `sundram-fasteners-limited` | `/images/suppliers/phase1/industrial-parts/sundram-1.jpg`<br>`/images/suppliers/phase1/industrial-parts/sundram-2.jpg` |
| Kirloskar Brothers Limited | Industrial Parts | `kirloskar-brothers-limited` | `/images/suppliers/phase1/industrial-parts/kirloskar-1.jpg`<br>`/images/suppliers/phase1/industrial-parts/kirloskar-2.jpg` |
| Shandong Corruone New Material Co., Ltd. | Packaging | `shandong-corruone-new-material-co-ltd` | `/images/suppliers/phase1/packaging/corruone-1.jpg`<br>`/images/suppliers/phase1/packaging/corruone-2.jpg` |
| Dongguan Yalan Packing Materials Co., Ltd. | Packaging | `dongguan-yalan-packing-materials-co-ltd` | `/images/suppliers/phase1/packaging/yalan-1.jpg`<br>`/images/suppliers/phase1/packaging/yalan-2.jpg` |
| Jiangsu Jieyuan Container Co., Ltd. | Packaging | `jiangsu-jieyuan-container-co-ltd` | `/images/suppliers/phase1/packaging/jieyuan-1.jpg`<br>`/images/suppliers/phase1/packaging/jieyuan-2.jpg` |
| Hangzhou Hansin New Packing Material Co., Ltd. | Packaging | `hangzhou-hansin-new-packing-material-co-ltd` | `/images/suppliers/phase1/packaging/hansin-2.jpg` |
| Dongguan Caicheng Printing Factory | Packaging | `dongguan-caicheng-printing-factory` | `/images/suppliers/phase1/packaging/caicheng-1.jpg`<br>`/images/suppliers/phase1/packaging/caicheng-2.jpg` |
| Wuxi Sifang Youxin Co., Ltd. | Packaging | `wuxi-sifang-youxin-co-ltd` | `/images/suppliers/phase1/packaging/sifang-2.jpg` |
| Meghdoot Packaging (Uttaranchal) | Packaging | `meghdoot-packaging-uttaranchal` | `/images/suppliers/phase1/packaging/meghdoot-1.jpg`<br>`/images/suppliers/phase1/packaging/meghdoot-2.jpg` |
| Shangyue (Shanghai) Printing Co., Ltd. | Packaging | `shangyue-shanghai-printing-co-ltd` | `/images/suppliers/phase1/packaging/shangyue-1.jpg`<br>`/images/suppliers/phase1/packaging/shangyue-2.jpg` |
| UFlex Limited | Packaging | `uflex-limited` | `/images/suppliers/phase1/packaging/uflex-1.jpg`<br>`/images/suppliers/phase1/packaging/uflex-2.jpg` |
| Shandong Dingsheng Container Co., Ltd. | Packaging | `shandong-dingsheng-container-co-ltd` | `/images/suppliers/phase1/packaging/dingsheng-1.jpg`<br>`/images/suppliers/phase1/packaging/dingsheng-2.jpg` |
