# Bilibili 字幕错轨问题发现报告

## 文档信息

- **文档类型**: Bug 发现与排障记录
- **问题域**: Chrome 扩展 B 站字幕采集
- **最后更新**: 2026-04-08
- **状态**: 已复现，根因高置信定位（上游字幕轨返回不稳定）

## 1. 问题概述

在采集同一条 Bilibili 视频（`BV1CDhpzvEht`，标题为“OAuth 的安全升级：PKCE”）时，扩展存在“同视频多次采集结果不一致”的现象：

- 部分采集结果为正确的 OAuth/PKCE 相关字幕；
- 部分采集结果为完全无关的字幕内容（如美食探店、动物科普、行情等）。

该问题具有明显随机性，且在“相同 bvid/aid/cid”条件下仍可复现。

## 2. 对产品的影响

### 2.1 功能正确性影响

- 用户点击“存入 PineSnap”后，可能被写入错误内容，破坏“素材准确性”。
- 错误内容进入后续学习/检索链路，会放大错误结论风险。

### 2.2 用户体验影响

- 用户对“采集按钮的一致性预期”被破坏（同视频结果时好时坏）。
- 难以通过表面提示判断本次是否采集正确，增加人工校验成本。

### 2.3 运维与排障影响

- 该问题非稳定失败，属于概率型异常，若无诊断字段难以归因。
- 需要记录轨道级元数据（trackId / subtitleUrl）才能进行有效定位。

## 3. 复现与发现过程摘要

针对同一视频连续采集多次并核对数据库 `Resource.content` 后发现：

- `metadata.id / url / title` 均指向目标视频；
- `captureDiagnostics.cid` 保持一致（`31429168869`）；
- 但 `captureDiagnostics.selectedTrackId` 在不同采集间发生变化；
- 变化后的轨道对应字幕正文差异巨大，且包含明显无关主题内容。

进一步在扩展 Service Worker Network 中抓取 `x/player/v2` 响应，发现：

- 同一 `bvid/aid/cid` 下，`subtitle.subtitles` 的中文轨道集合存在不稳定；
- 某些请求返回的 `ai-zh` 轨道 `id` 与正常轨道不同；
- 个别请求里 `subtitle_url` 为空字符串；
- 采集链路会直接使用该轨道 `subtitle_url` 拉取正文并入库。

## 4. 关键证据

## 4.1 数据库证据（同一 externalId）

- `externalId = BV1CDhpzvEht` 下，出现多个不同 `selectedTrackId`；
- 正确样本与错误样本均存在，且文本首句可直接区分语义是否匹配。

## 4.2 Service Worker 抓包证据

- 请求：`GET https://api.bilibili.com/x/player/v2?cid=31429168869&bvid=BV1CDhpzvEht&aid=114954497690804`
- 现象：
  - 同参数下，`data.subtitle.subtitles[lan=ai-zh]` 的 `id` 可变化；
  - 部分响应 `subtitle_url` 为空；
  - 错误入库样本对应的 `selectedTrackId` 来自该次 `v2` 响应。

## 4.3 入库链路一致性证据

服务端 `POST /api/capture/jobs` 的行为为“鉴权 + schema 校验 + payload 原样落库”，不存在改写字幕正文逻辑。
因此若入库内容错误，错误已在客户端抓取阶段产生。

## 5. 根因分析

## 5.1 高置信结论

问题主要由 **Bilibili `x/player/v2` 字幕轨返回不稳定** 引发：

- `aid/bvid/cid` 正确并不等价于 `subtitles[]` 正确；
- 轨道元数据（至少 `id` 与 `subtitle_url`）在部分请求中出现漂移/异常；
- 扩展当前策略是“单次读取并信任首个中文轨道”，导致上游异常直接落库。

## 5.2 非根因项（已排除）

- 不是 PineSnap 服务端写库污染（服务端仅原样落库）；
- 不是 `cid` 解析错误（问题样本中 `cid` 一致且正确）；
- 不是“未登录导致无字幕”的单一问题（已在登录态复现错轨）。

## 6. 当前风险评估

- **风险等级**: 高（影响数据正确性）
- **触发概率**: 中到高（同视频多次点击可复现）
- **影响范围**: 所有依赖 `x/player/v2` 单次选轨的 B 站采集请求

## 7. 建议修复方向（摘要）

为避免主流程被大改，建议在扩展 extractor 中增加“轨道稳定性防护层”：

1. 轨道一致性确认（多次读取并判定稳定）；
2. 对空 `subtitle_url` 增加短退避重试；
3. 无法形成稳定轨道时保守失败（不写入潜在错误数据）；
4. 强化 `captureDiagnostics`，记录轨道采样与判定过程。

> 详细方案与实现任务见对应 OpenSpec 变更文档。

## 8. 后续跟踪项

- [ ] 落地轨道稳定性防护实现
- [ ] 完成发布前回归：同视频连续采集 N 次一致性验证
- [ ] 评估是否需要增加“语义校验”二次兜底（可选）

## 9. 参考抓包记录

```json
{
    "code": 0,
    "message": "OK",
    "ttl": 1,
    "data": {
        "aid": 114954497690804,
        "bvid": "BV1CDhpzvEht",
        "allow_bp": false,
        "no_share": false,
        "cid": 31429168869,
        "max_limit": 1500,
        "page_no": 1,
        "has_next": false,
        "ip_info": {
            "ip": "112.64.61.254",
            "zone_ip": " 10.158.138.34",
            "zone_id": 4308992,
            "country": "中国",
            "province": "上海",
            "city": ""
        },
        "login_mid": 32131945,
        "login_mid_hash": "f68f5fdd",
        "is_owner": false,
        "name": "SSStrolling",
        "permission": "10000,1001",
        "level_info": {
            "current_level": 6,
            "current_min": 28800,
            "current_exp": 42500,
            "next_exp": -1,
            "level_up": 1704344425
        },
        "vip": {
            "type": 1,
            "status": 0,
            "due_date": 1657468800000,
            "vip_pay_type": 0,
            "theme_type": 0,
            "label": {
                "path": "",
                "text": "",
                "label_theme": "",
                "text_color": "",
                "bg_style": 0,
                "bg_color": "",
                "border_color": "",
                "use_img_label": true,
                "img_label_uri_hans": "",
                "img_label_uri_hant": "",
                "img_label_uri_hans_static": "https://i0.hdslb.com/bfs/vip/d7b702ef65a976b20ed854cbd04cb9e27341bb79.png",
                "img_label_uri_hant_static": "https://i0.hdslb.com/bfs/activity-plat/static/20220614/e369244d0b14644f5e1a06431e22a4d5/KJunwh19T5.png",
                "label_id": 0,
                "label_goto": null
            },
            "avatar_subscript": 0,
            "nickname_color": "",
            "role": 0,
            "avatar_subscript_url": "",
            "tv_vip_status": 0,
            "tv_vip_pay_type": 0,
            "tv_due_date": 0,
            "avatar_icon": {
                "icon_resource": {}
            },
            "ott_info": {
                "vip_type": 0,
                "pay_type": 0,
                "pay_channel_id": "",
                "status": 0,
                "overdue_time": 0
            },
            "super_vip": {
                "is_super_vip": false
            }
        },
        "answer_status": 0,
        "block_time": 0,
        "role": "0",
        "last_play_time": 71000,
        "last_play_cid": 31429168869,
        "now_time": 1775665312,
        "online_count": 1,
        "need_login_subtitle": false,
        "subtitle": {
            "allow_submit": false,
            "lan": "",
            "lan_doc": "",
            "subtitles": [
                {
                    "id": 1811250805324449536,
                    "lan": "ai-zh",
                    "lan_doc": "中文",
                    "is_lock": false,
                    "subtitle_url": "//aisubtitle.hdslb.com/bfs/ai_subtitle/prod/11495449769080431429168869f86d3fb7cd2d2ead64bf8193320f9261?auth_key=1775665312-7acd4fc81b6b4b5a981ddad2058245c5-0-60f3c6cbad80de3c3c2c175532b889f1",
                    "type": 1,
                    "id_str": "1811250805324449536",
                    "ai_type": 0,
                    "ai_status": 2
                },
                {
                    "id": 1888179394586024960,
                    "lan": "ai-en",
                    "lan_doc": "English",
                    "is_lock": false,
                    "subtitle_url": "//aisubtitle.hdslb.com/bfs/ai_subtitle/prod/e894c537845b600bfb3d9cd5c9e11dfb?auth_key=1775665312-f9a6a0ec2637442d93c94c39802814fe-0-c1af37c3097b4c5ad1e5dd5960bfe1a3",
                    "type": 1,
                    "id_str": "1888179394586024960",
                    "ai_type": 1,
                    "ai_status": 2
                },
                {
                    "id": 1947329915443776000,
                    "lan": "ai-ja",
                    "lan_doc": "日本語",
                    "is_lock": false,
                    "subtitle_url": "//aisubtitle.hdslb.com/bfs/ai_subtitle/prod/0088ece9b2082cce16287123507e8bb5?auth_key=1775665312-d3ec970fc68b4b87a7ed3fb4f008c422-0-ab428a43875368cc79f79f34b2635769",
                    "type": 1,
                    "id_str": "1947329915443776000",
                    "ai_type": 1,
                    "ai_status": 2
                },
                {
                    "id": 1915388385699084032,
                    "lan": "ai-es",
                    "lan_doc": "Español",
                    "is_lock": false,
                    "subtitle_url": "//aisubtitle.hdslb.com/bfs/ai_subtitle/prod/70a259259693da37066351ffb0aca783?auth_key=1775665312-ed847fc288ec4557ac9c5a123ac5cfaf-0-516f3a90a6838dd06cd51ca65fe871fa",
                    "type": 1,
                    "id_str": "1915388385699084032",
                    "ai_type": 1,
                    "ai_status": 2
                },
                {
                    "id": 1915388235761421056,
                    "lan": "ai-ar",
                    "lan_doc": "العربية",
                    "is_lock": false,
                    "subtitle_url": "//aisubtitle.hdslb.com/bfs/ai_subtitle/prod/24fc9408b679eee7f28cb616cdc6aa7f?auth_key=1775665312-5cf4f443968d472cb351cc74c7eeeb1f-0-d5d71afb7695643c4fcda3e32057cb8d",
                    "type": 1,
                    "id_str": "1915388235761421056",
                    "ai_type": 1,
                    "ai_status": 2
                },
                {
                    "id": 1930563135971053312,
                    "lan": "ai-pt",
                    "lan_doc": "Português",
                    "is_lock": false,
                    "subtitle_url": "//aisubtitle.hdslb.com/bfs/ai_subtitle/prod/c1f368e421736405e538a15152542d62?auth_key=1775665312-42d26de3e84a4dd8b3532d1f6d68e2ac-0-f86349f6b94cc84aec0728b0d8dfb584",
                    "type": 1,
                    "id_str": "1930563135971053312",
                    "ai_type": 1,
                    "ai_status": 2
                }
            ],
            "subtitle_position": null,
            "font_size_type": 0
        },
        "view_points": [],
        "preview_toast": "为创作付费，购买观看完整视频|购买观看",
        "options": {
            "is_360": false,
            "without_vip": false
        },
        "guide_attention": [],
        "jump_card": [],
        "operation_card": [],
        "online_switch": {
            "enable_gray_dash_playback": "500",
            "new_broadcast": "1",
            "realtime_dm": "1",
            "subtitle_submit_switch": "1"
        },
        "fawkes": {
            "config_version": 36900,
            "ff_version": 21289
        },
        "show_switch": {
            "long_progress": false
        },
        "bgm_info": null,
        "toast_block": false,
        "is_upower_exclusive": false,
        "is_upower_play": false,
        "is_ugc_pay_preview": false,
        "elec_high_level": {
            "privilege_type": 0,
            "title": "",
            "sub_title": "",
            "show_button": false,
            "button_text": "",
            "jump_url": "",
            "intro": "",
            "new": false,
            "question_text": "",
            "qa_title": ""
        },
        "disable_show_up_info": false,
        "is_upower_exclusive_with_qa": false,
        "arc_aigc": null,
        "self_visible": null
    }
}
```

```json
{
    "code": 0,
    "message": "OK",
    "ttl": 1,
    "data": {
        "aid": 114954497690804,
        "bvid": "BV1CDhpzvEht",
        "allow_bp": false,
        "no_share": false,
        "cid": 31429168869,
        "max_limit": 1500,
        "page_no": 1,
        "has_next": false,
        "ip_info": {
            "ip": "112.64.61.254",
            "zone_ip": " 10.157.116.47",
            "zone_id": 4308992,
            "country": "中国",
            "province": "上海",
            "city": ""
        },
        "login_mid": 32131945,
        "login_mid_hash": "f68f5fdd",
        "is_owner": false,
        "name": "SSStrolling",
        "permission": "10000,1001",
        "level_info": {
            "current_level": 6,
            "current_min": 28800,
            "current_exp": 42500,
            "next_exp": -1,
            "level_up": 1704344425
        },
        "vip": {
            "type": 1,
            "status": 0,
            "due_date": 1657468800000,
            "vip_pay_type": 0,
            "theme_type": 0,
            "label": {
                "path": "",
                "text": "",
                "label_theme": "",
                "text_color": "",
                "bg_style": 0,
                "bg_color": "",
                "border_color": "",
                "use_img_label": true,
                "img_label_uri_hans": "",
                "img_label_uri_hant": "",
                "img_label_uri_hans_static": "https://i0.hdslb.com/bfs/vip/d7b702ef65a976b20ed854cbd04cb9e27341bb79.png",
                "img_label_uri_hant_static": "https://i0.hdslb.com/bfs/activity-plat/static/20220614/e369244d0b14644f5e1a06431e22a4d5/KJunwh19T5.png",
                "label_id": 0,
                "label_goto": null
            },
            "avatar_subscript": 0,
            "nickname_color": "",
            "role": 0,
            "avatar_subscript_url": "",
            "tv_vip_status": 0,
            "tv_vip_pay_type": 0,
            "tv_due_date": 0,
            "avatar_icon": {
                "icon_resource": {}
            },
            "ott_info": {
                "vip_type": 0,
                "pay_type": 0,
                "pay_channel_id": "",
                "status": 0,
                "overdue_time": 0
            },
            "super_vip": {
                "is_super_vip": false
            }
        },
        "answer_status": 0,
        "block_time": 0,
        "role": "0",
        "last_play_time": 71000,
        "last_play_cid": 31429168869,
        "now_time": 1775665314,
        "online_count": 1,
        "need_login_subtitle": false,
        "subtitle": {
            "allow_submit": false,
            "lan": "",
            "lan_doc": "",
            "subtitles": [
                {
                    "id": 1811250805324449536,
                    "lan": "ai-zh",
                    "lan_doc": "中文",
                    "is_lock": false,
                    "subtitle_url": "",
                    "type": 1,
                    "id_str": "1811250805324449536",
                    "ai_type": 0,
                    "ai_status": 2
                },
                {
                    "id": 1888179394586024960,
                    "lan": "ai-en",
                    "lan_doc": "English",
                    "is_lock": false,
                    "subtitle_url": "",
                    "type": 1,
                    "id_str": "1888179394586024960",
                    "ai_type": 1,
                    "ai_status": 2
                },
                {
                    "id": 1947329915443776000,
                    "lan": "ai-ja",
                    "lan_doc": "日本語",
                    "is_lock": false,
                    "subtitle_url": "",
                    "type": 1,
                    "id_str": "1947329915443776000",
                    "ai_type": 1,
                    "ai_status": 2
                },
                {
                    "id": 1915388385699084032,
                    "lan": "ai-es",
                    "lan_doc": "Español",
                    "is_lock": false,
                    "subtitle_url": "",
                    "type": 1,
                    "id_str": "1915388385699084032",
                    "ai_type": 1,
                    "ai_status": 2
                },
                {
                    "id": 1915388235761421056,
                    "lan": "ai-ar",
                    "lan_doc": "العربية",
                    "is_lock": false,
                    "subtitle_url": "",
                    "type": 1,
                    "id_str": "1915388235761421056",
                    "ai_type": 1,
                    "ai_status": 2
                },
                {
                    "id": 1930563135971053312,
                    "lan": "ai-pt",
                    "lan_doc": "Português",
                    "is_lock": false,
                    "subtitle_url": "",
                    "type": 1,
                    "id_str": "1930563135971053312",
                    "ai_type": 1,
                    "ai_status": 2
                }
            ],
            "subtitle_position": null,
            "font_size_type": 0
        },
        "view_points": [],
        "preview_toast": "为创作付费，购买观看完整视频|购买观看",
        "options": {
            "is_360": false,
            "without_vip": false
        },
        "guide_attention": [],
        "jump_card": [],
        "operation_card": [],
        "online_switch": {
            "enable_gray_dash_playback": "500",
            "new_broadcast": "1",
            "realtime_dm": "1",
            "subtitle_submit_switch": "1"
        },
        "fawkes": {
            "config_version": 36900,
            "ff_version": 21289
        },
        "show_switch": {
            "long_progress": false
        },
        "bgm_info": null,
        "toast_block": false,
        "is_upower_exclusive": false,
        "is_upower_play": false,
        "is_ugc_pay_preview": false,
        "elec_high_level": {
            "privilege_type": 0,
            "title": "",
            "sub_title": "",
            "show_button": false,
            "button_text": "",
            "jump_url": "",
            "intro": "",
            "new": false,
            "question_text": "",
            "qa_title": ""
        },
        "disable_show_up_info": false,
        "is_upower_exclusive_with_qa": false,
        "arc_aigc": null,
        "self_visible": null
    }
}
```

```json
{
    "code": 0,
    "message": "OK",
    "ttl": 1,
    "data": {
        "aid": 114954497690804,
        "bvid": "BV1CDhpzvEht",
        "allow_bp": false,
        "no_share": false,
        "cid": 31429168869,
        "max_limit": 1500,
        "page_no": 1,
        "has_next": false,
        "ip_info": {
            "ip": "112.64.61.254",
            "zone_ip": " 10.157.25.23",
            "zone_id": 4308992,
            "country": "中国",
            "province": "上海",
            "city": ""
        },
        "login_mid": 32131945,
        "login_mid_hash": "f68f5fdd",
        "is_owner": false,
        "name": "SSStrolling",
        "permission": "10000,1001",
        "level_info": {
            "current_level": 6,
            "current_min": 28800,
            "current_exp": 42500,
            "next_exp": -1,
            "level_up": 1704344425
        },
        "vip": {
            "type": 1,
            "status": 0,
            "due_date": 1657468800000,
            "vip_pay_type": 0,
            "theme_type": 0,
            "label": {
                "path": "",
                "text": "",
                "label_theme": "",
                "text_color": "",
                "bg_style": 0,
                "bg_color": "",
                "border_color": "",
                "use_img_label": true,
                "img_label_uri_hans": "",
                "img_label_uri_hant": "",
                "img_label_uri_hans_static": "https://i0.hdslb.com/bfs/vip/d7b702ef65a976b20ed854cbd04cb9e27341bb79.png",
                "img_label_uri_hant_static": "https://i0.hdslb.com/bfs/activity-plat/static/20220614/e369244d0b14644f5e1a06431e22a4d5/KJunwh19T5.png",
                "label_id": 0,
                "label_goto": null
            },
            "avatar_subscript": 0,
            "nickname_color": "",
            "role": 0,
            "avatar_subscript_url": "",
            "tv_vip_status": 0,
            "tv_vip_pay_type": 0,
            "tv_due_date": 0,
            "avatar_icon": {
                "icon_resource": {}
            },
            "ott_info": {
                "vip_type": 0,
                "pay_type": 0,
                "pay_channel_id": "",
                "status": 0,
                "overdue_time": 0
            },
            "super_vip": {
                "is_super_vip": false
            }
        },
        "answer_status": 0,
        "block_time": 0,
        "role": "0",
        "last_play_time": 71000,
        "last_play_cid": 31429168869,
        "now_time": 1775665632,
        "online_count": 1,
        "need_login_subtitle": false,
        "subtitle": {
            "allow_submit": false,
            "lan": "",
            "lan_doc": "",
            "subtitles": [
                {
                    "id": 1599598261331789312,
                    "lan": "ai-zh",
                    "lan_doc": "中文",
                    "is_lock": false,
                    "subtitle_url": "//aisubtitle.hdslb.com/bfs/ai_subtitle/prod/113301069502907262783640329b156ef528e63236dbcae68b5327bf2e?auth_key=1775665633-195f6879be904c5d8e9c6e794bd9d215-0-29cd08fdbf7519ffab09339e1244bf94",
                    "type": 1,
                    "id_str": "1599598261331789312",
                    "ai_type": 0,
                    "ai_status": 2
                }
            ],
            "subtitle_position": null,
            "font_size_type": 0
        },
        "view_points": [],
        "preview_toast": "为创作付费，购买观看完整视频|购买观看",
        "options": {
            "is_360": false,
            "without_vip": false
        },
        "guide_attention": [],
        "jump_card": [],
        "operation_card": [],
        "online_switch": {
            "enable_gray_dash_playback": "500",
            "new_broadcast": "1",
            "realtime_dm": "1",
            "subtitle_submit_switch": "1"
        },
        "fawkes": {
            "config_version": 36900,
            "ff_version": 21289
        },
        "show_switch": {
            "long_progress": false
        },
        "bgm_info": null,
        "toast_block": false,
        "is_upower_exclusive": false,
        "is_upower_play": false,
        "is_ugc_pay_preview": false,
        "elec_high_level": {
            "privilege_type": 0,
            "title": "",
            "sub_title": "",
            "show_button": false,
            "button_text": "",
            "jump_url": "",
            "intro": "",
            "new": false,
            "question_text": "",
            "qa_title": ""
        },
        "disable_show_up_info": false,
        "is_upower_exclusive_with_qa": false,
        "arc_aigc": null,
        "self_visible": null
    }
}
```